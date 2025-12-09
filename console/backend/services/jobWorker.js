const jobQueue = require('./jobQueue');
const pluginManager = require('./pluginManager');

/**
 * Job Worker Service
 * Processes plugin jobs from the queue
 */

let isRunning = false;
let currentJobId = null;
let workerInterval = null;

/**
 * Start the job worker
 */
function startWorker(intervalMs = 2000) {
    if (isRunning) {
        console.log('[JobWorker] Worker already running');
        return;
    }
    
    isRunning = true;
    console.log('[JobWorker] Starting job worker...');
    
    // Process jobs every 2 seconds
    workerInterval = setInterval(async () => {
        await processNextJob();
    }, intervalMs);
    
    // Also process immediately on start
    setImmediate(() => processNextJob());
}

/**
 * Stop the job worker
 */
function stopWorker() {
    if (!isRunning) {
        return;
    }
    
    isRunning = false;
    
    if (workerInterval) {
        clearInterval(workerInterval);
        workerInterval = null;
    }
    
    console.log('[JobWorker] Stopped job worker');
}

/**
 * Check if worker is currently processing a job
 */
function isProcessing() {
    return currentJobId !== null;
}

/**
 * Get current job ID being processed
 */
function getCurrentJobId() {
    return currentJobId;
}

/**
 * Process next job in queue
 */
async function processNextJob() {
    // Skip if already processing a job
    if (currentJobId !== null) {
        return;
    }
    
    try {
        const job = await jobQueue.getNextJob();
        
        if (!job) {
            // No jobs in queue
            return;
        }
        
        currentJobId = job.id;
        console.log(`[JobWorker] Processing job ${job.id}: ${job.action} ${job.pluginName || job.url || ''}`);
        
        // Update job to running
        await jobQueue.updateJob(job.id, { status: 'running' });
        await jobQueue.addJobLog(job.id, `Started ${job.action} operation`);
        
        try {
            // Execute the job based on action
            const result = await executeJob(job);
            
            // Job completed successfully
            await jobQueue.updateJob(job.id, {
                status: 'completed',
                result
            });
            await jobQueue.addJobLog(job.id, `Completed successfully: ${JSON.stringify(result)}`);
            
            console.log(`[JobWorker] Job ${job.id} completed successfully`);
        } catch (error) {
            // Job failed
            console.error(`[JobWorker] Job ${job.id} failed:`, error.message);
            
            await jobQueue.updateJob(job.id, {
                status: 'failed',
                error: error.message
            });
            await jobQueue.addJobLog(job.id, `Failed: ${error.message}`);
        }
        
        currentJobId = null;
    } catch (error) {
        console.error('[JobWorker] Error processing job:', error);
        currentJobId = null;
    }
}

/**
 * Execute a job based on its action
 */
async function executeJob(job) {
    const { action, pluginName, url, options } = job;
    
    switch (action) {
        case 'install':
            return await executeInstall(job);
        
        case 'uninstall':
            return await executeUninstall(job);
        
        case 'update':
            return await executeUpdate(job);
        
        case 'enable':
            return await executeToggle(job, true);
        
        case 'disable':
            return await executeToggle(job, false);
        
        default:
            throw new Error(`Unknown action: ${action}`);
    }
}

/**
 * Execute install job
 */
async function executeInstall(job) {
    const { url, options } = job;
    
    await jobQueue.addJobLog(job.id, `Installing plugin from: ${url}`);
    
    // Progress callback
    const onProgress = (progress) => {
        jobQueue.addJobLog(job.id, `Download progress: ${progress.percentage}%`);
    };
    
    // Install plugin
    const result = await pluginManager.installFromUrl(url, options.customName, onProgress);
    
    // Handle conflict - need to proceed with specific action
    if (result.status === 'conflict') {
        await jobQueue.addJobLog(job.id, `Plugin already exists: ${result.pluginName} (${result.currentVersion})`);
        await jobQueue.addJobLog(job.id, `New version: ${result.newVersion} (${result.comparison})`);
        
        // If auto-update is enabled and it's an upgrade, proceed automatically
        if (options.autoUpdate && result.comparison === 'upgrade') {
            await jobQueue.addJobLog(job.id, 'Auto-update enabled, proceeding with update...');
            const updateResult = await pluginManager.proceedWithInstall(url, result.pluginName, 'update', onProgress);
            return updateResult;
        }
        
        throw new Error(`Plugin conflict: ${result.pluginName} already exists (${result.currentVersion} -> ${result.newVersion}, ${result.comparison}). Use update action instead.`);
    }
    
    // Handle multiple options
    if (result.status === 'multiple-options') {
        await jobQueue.addJobLog(job.id, `Multiple JAR files found: ${result.options.length} options`);
        throw new Error('Multiple JAR files found. Please specify selectedOption in job options.');
    }
    
    return result;
}

/**
 * Execute uninstall job
 */
async function executeUninstall(job) {
    const { pluginName, options } = job;
    
    await jobQueue.addJobLog(job.id, `Uninstalling plugin: ${pluginName}`);
    
    if (options.deleteConfigs) {
        await jobQueue.addJobLog(job.id, 'Will also delete plugin configuration');
    }
    
    const result = await pluginManager.uninstallPlugin(pluginName, options.deleteConfigs || false);
    
    await jobQueue.addJobLog(job.id, 'Plugin uninstalled successfully');
    
    return result;
}

/**
 * Execute update job
 */
async function executeUpdate(job) {
    const { pluginName, url, options } = job;
    
    await jobQueue.addJobLog(job.id, `Updating plugin: ${pluginName}`);
    await jobQueue.addJobLog(job.id, `Update source: ${url}`);
    
    // Progress callback
    const onProgress = (progress) => {
        jobQueue.addJobLog(job.id, `Download progress: ${progress.percentage}%`);
    };
    
    const result = await pluginManager.proceedWithInstall(url, pluginName, 'update', onProgress);
    
    await jobQueue.addJobLog(job.id, `Updated to version: ${result.version}`);
    
    return result;
}

/**
 * Execute enable/disable toggle
 */
async function executeToggle(job, enabled) {
    const { pluginName } = job;
    
    await jobQueue.addJobLog(job.id, `${enabled ? 'Enabling' : 'Disabling'} plugin: ${pluginName}`);
    
    const result = await pluginManager.togglePlugin(pluginName, enabled);
    
    await jobQueue.addJobLog(job.id, `Plugin ${enabled ? 'enabled' : 'disabled'} successfully`);
    
    return result;
}

module.exports = {
    startWorker,
    stopWorker,
    isProcessing,
    getCurrentJobId,
    processNextJob
};
