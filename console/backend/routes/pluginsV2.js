const express = require('express');
const router = express.Router();
const { requireAuthOrToken, skipCsrfForBearer } = require('../auth/bearerAuth');
const rateLimit = require('express-rate-limit');
const jobQueue = require('../services/jobQueue');
const jobWorker = require('../services/jobWorker');
const pluginManager = require('../services/pluginManager');

// Rate limiter for plugin operations
const pluginRateLimiter = rateLimit({
    windowMs: 60000, // 1 minute
    max: 30, // 30 requests per minute (increased for job polling)
    message: 'Too many plugin requests, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
});

// Apply middleware
router.use(skipCsrfForBearer); // Skip CSRF for Bearer token requests
router.use(requireAuthOrToken); // Require authentication (session or Bearer)
router.use(pluginRateLimiter); // Apply rate limiting

/**
 * POST /api/plugins/job
 * Submit a plugin job (install/uninstall/update/enable/disable)
 */
router.post('/job', async (req, res) => {
    try {
        const { action, name, url, options } = req.body;
        
        // Validate action
        const validActions = ['install', 'uninstall', 'update', 'enable', 'disable'];
        if (!action || !validActions.includes(action)) {
            return res.status(400).json({ 
                error: 'Invalid action',
                validActions
            });
        }
        
        // Validate required fields based on action
        if (action === 'install' && !url) {
            return res.status(400).json({ error: 'URL is required for install action' });
        }
        
        if (action === 'update' && (!name || !url)) {
            return res.status(400).json({ error: 'Plugin name and URL are required for update action' });
        }
        
        if (['uninstall', 'enable', 'disable'].includes(action) && !name) {
            return res.status(400).json({ error: 'Plugin name is required for this action' });
        }
        
        // Create job
        const job = await jobQueue.createJob({
            action,
            name,
            url,
            options: options || {}
        });
        
        console.log(`[PluginAPI] Created ${action} job: ${job.id}`);
        
        res.status(201).json({
            success: true,
            job: {
                id: job.id,
                action: job.action,
                pluginName: job.pluginName,
                status: job.status,
                createdAt: job.createdAt
            }
        });
    } catch (error) {
        console.error('[PluginAPI] Error creating job:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/plugins/jobs
 * List recent plugin jobs with status and output
 */
router.get('/jobs', async (req, res) => {
    try {
        const { status, limit } = req.query;
        
        const filter = {};
        if (status) {
            filter.status = status;
        }
        if (limit) {
            filter.limit = parseInt(limit, 10);
        }
        
        const jobs = await jobQueue.getJobs(filter);
        
        res.json({
            success: true,
            jobs: jobs.map(job => ({
                id: job.id,
                action: job.action,
                pluginName: job.pluginName,
                url: job.url,
                status: job.status,
                logs: job.logs,
                error: job.error,
                result: job.result,
                createdAt: job.createdAt,
                startedAt: job.startedAt,
                completedAt: job.completedAt
            })),
            currentJobId: jobWorker.getCurrentJobId()
        });
    } catch (error) {
        console.error('[PluginAPI] Error fetching jobs:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/plugins/jobs/:id
 * Get a specific job by ID
 */
router.get('/jobs/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const job = await jobQueue.getJob(id);
        
        if (!job) {
            return res.status(404).json({ error: 'Job not found' });
        }
        
        res.json({
            success: true,
            job: {
                id: job.id,
                action: job.action,
                pluginName: job.pluginName,
                url: job.url,
                status: job.status,
                logs: job.logs,
                error: job.error,
                result: job.result,
                createdAt: job.createdAt,
                startedAt: job.startedAt,
                completedAt: job.completedAt
            }
        });
    } catch (error) {
        console.error('[PluginAPI] Error fetching job:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * PUT /api/plugins/job/:id/cancel
 * Cancel a running or queued job
 */
router.put('/job/:id/cancel', async (req, res) => {
    try {
        const { id } = req.params;
        const job = await jobQueue.cancelJob(id);
        
        console.log(`[PluginAPI] Cancelled job: ${id}`);
        
        res.json({
            success: true,
            job: {
                id: job.id,
                action: job.action,
                pluginName: job.pluginName,
                status: job.status,
                error: job.error
            }
        });
    } catch (error) {
        console.error('[PluginAPI] Error cancelling job:', error);
        
        if (error.message.includes('not found')) {
            return res.status(404).json({ error: error.message });
        }
        
        if (error.message.includes('Cannot cancel')) {
            return res.status(400).json({ error: error.message });
        }
        
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/plugins/list
 * List all plugins and their states (enabled/disabled, version)
 */
router.get('/list', async (req, res) => {
    try {
        const plugins = await pluginManager.getAllPlugins();
        
        // Add backup status to each plugin
        const pluginsWithStatus = plugins.map(plugin => ({
            name: plugin.name,
            version: plugin.version,
            enabled: plugin.enabled,
            description: plugin.description,
            category: plugin.category,
            source: plugin.source,
            hasBackup: pluginManager.hasBackup(plugin.name),
            installedAt: plugin.installed_at,
            updatedAt: plugin.updated_at
        }));
        
        res.json({
            success: true,
            plugins: pluginsWithStatus
        });
    } catch (error) {
        console.error('[PluginAPI] Error fetching plugin list:', error);
        res.status(500).json({ 
            error: error.message,
            plugins: [] 
        });
    }
});

/**
 * GET /api/plugins/health
 * Health check for plugin manager
 */
router.get('/health', async (req, res) => {
    try {
        const health = await pluginManager.checkHealth();
        
        // Add job worker status
        health.checks.jobWorker = {
            status: jobWorker.isProcessing() ? 'processing' : 'idle',
            message: jobWorker.isProcessing() 
                ? `Processing job: ${jobWorker.getCurrentJobId()}` 
                : 'No active jobs'
        };
        
        if (health.healthy) {
            res.status(200).json({
                status: 'healthy',
                checks: health.checks
            });
        } else {
            res.status(503).json({
                status: 'unhealthy',
                checks: health.checks
            });
        }
    } catch (error) {
        console.error('[PluginAPI] Error checking health:', error);
        res.status(500).json({
            status: 'error',
            error: error.message
        });
    }
});

module.exports = router;
