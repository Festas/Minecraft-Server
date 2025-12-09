const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const crypto = require('crypto');

const JOBS_FILE = path.join(__dirname, '../data/plugin-jobs.json');

/**
 * Job Queue Service
 * Manages plugin job queue with persistence to plugin-jobs.json
 */

/**
 * Initialize jobs file if it doesn't exist
 */
async function initializeJobsFile() {
    try {
        await fs.access(JOBS_FILE);
    } catch (error) {
        // File doesn't exist, create it
        const dataDir = path.dirname(JOBS_FILE);
        await fs.mkdir(dataDir, { recursive: true });
        await fs.writeFile(JOBS_FILE, JSON.stringify({ jobs: [] }, null, 2), 'utf8');
        console.log('[JobQueue] Created plugin-jobs.json');
    }
}

/**
 * Load all jobs from file
 */
async function loadJobs() {
    try {
        await initializeJobsFile();
        const content = await fs.readFile(JOBS_FILE, 'utf8');
        const data = JSON.parse(content);
        return Array.isArray(data.jobs) ? data.jobs : [];
    } catch (error) {
        console.error('[JobQueue] Error loading jobs:', error.message);
        return [];
    }
}

/**
 * Save jobs to file
 */
async function saveJobs(jobs) {
    try {
        const tempFile = `${JOBS_FILE}.tmp`;
        await fs.writeFile(tempFile, JSON.stringify({ jobs }, null, 2), 'utf8');
        
        // Verify temp file is valid JSON
        const verifyContent = await fs.readFile(tempFile, 'utf8');
        JSON.parse(verifyContent);
        
        // Atomic rename
        await fs.rename(tempFile, JOBS_FILE);
    } catch (error) {
        console.error('[JobQueue] Error saving jobs:', error.message);
        throw new Error(`Failed to save jobs: ${error.message}`);
    }
}

/**
 * Generate unique job ID
 */
function generateJobId() {
    return `job-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
}

/**
 * Create a new job
 * @param {Object} jobData - Job data containing action, name, url, etc.
 * @returns {Object} Created job
 */
async function createJob(jobData) {
    const jobs = await loadJobs();
    
    const job = {
        id: generateJobId(),
        action: jobData.action, // install, uninstall, update, enable, disable
        pluginName: jobData.name,
        url: jobData.url || null,
        options: jobData.options || {},
        status: 'queued', // queued, running, completed, failed, cancelled
        logs: [],
        error: null,
        result: null,
        createdAt: new Date().toISOString(),
        startedAt: null,
        completedAt: null
    };
    
    jobs.push(job);
    await saveJobs(jobs);
    
    console.log(`[JobQueue] Created job ${job.id}: ${job.action} ${job.pluginName || job.url || ''}`);
    return job;
}

/**
 * Get job by ID
 */
async function getJob(jobId) {
    const jobs = await loadJobs();
    return jobs.find(j => j.id === jobId);
}

/**
 * Get all jobs (optionally filtered by status)
 */
async function getJobs(filter = {}) {
    let jobs = await loadJobs();
    
    if (filter.status) {
        jobs = jobs.filter(j => j.status === filter.status);
    }
    
    if (filter.limit) {
        jobs = jobs.slice(-filter.limit);
    }
    
    // Return in reverse chronological order (newest first)
    return jobs.reverse();
}

/**
 * Update job status and details
 */
async function updateJob(jobId, updates) {
    const jobs = await loadJobs();
    const jobIndex = jobs.findIndex(j => j.id === jobId);
    
    if (jobIndex === -1) {
        throw new Error(`Job not found: ${jobId}`);
    }
    
    // Merge updates
    jobs[jobIndex] = {
        ...jobs[jobIndex],
        ...updates
    };
    
    // Update timestamps
    if (updates.status === 'running' && !jobs[jobIndex].startedAt) {
        jobs[jobIndex].startedAt = new Date().toISOString();
    }
    
    if (['completed', 'failed', 'cancelled'].includes(updates.status)) {
        jobs[jobIndex].completedAt = new Date().toISOString();
    }
    
    await saveJobs(jobs);
    
    console.log(`[JobQueue] Updated job ${jobId}: ${updates.status || 'status unchanged'}`);
    return jobs[jobIndex];
}

/**
 * Add log entry to job
 */
async function addJobLog(jobId, logEntry) {
    const jobs = await loadJobs();
    const jobIndex = jobs.findIndex(j => j.id === jobId);
    
    if (jobIndex === -1) {
        throw new Error(`Job not found: ${jobId}`);
    }
    
    const logWithTimestamp = {
        timestamp: new Date().toISOString(),
        message: logEntry
    };
    
    jobs[jobIndex].logs = jobs[jobIndex].logs || [];
    jobs[jobIndex].logs.push(logWithTimestamp);
    
    await saveJobs(jobs);
    
    return jobs[jobIndex];
}

/**
 * Cancel a job
 */
async function cancelJob(jobId) {
    const job = await getJob(jobId);
    
    if (!job) {
        throw new Error(`Job not found: ${jobId}`);
    }
    
    if (job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled') {
        throw new Error(`Cannot cancel job in ${job.status} state`);
    }
    
    await updateJob(jobId, {
        status: 'cancelled',
        error: 'Job cancelled by user'
    });
    
    await addJobLog(jobId, 'Job cancelled by user request');
    
    console.log(`[JobQueue] Cancelled job ${jobId}`);
    return await getJob(jobId);
}

/**
 * Get next job in queue (for worker)
 */
async function getNextJob() {
    const jobs = await loadJobs();
    return jobs.find(j => j.status === 'queued');
}

/**
 * Clean up old jobs (keep last 100)
 */
async function cleanupOldJobs() {
    const jobs = await loadJobs();
    
    // Keep only last 100 jobs
    if (jobs.length > 100) {
        const keptJobs = jobs.slice(-100);
        await saveJobs(keptJobs);
        console.log(`[JobQueue] Cleaned up ${jobs.length - 100} old jobs`);
    }
}

module.exports = {
    initializeJobsFile,
    createJob,
    getJob,
    getJobs,
    updateJob,
    addJobLog,
    cancelJob,
    getNextJob,
    cleanupOldJobs
};
