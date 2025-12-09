/**
 * Automation Routes
 * 
 * API endpoints for managing scheduled automation tasks.
 * Includes RBAC enforcement and rate limiting.
 */

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../auth/auth');
const { requirePermission } = require('../middleware/rbac');
const { PERMISSIONS } = require('../config/rbac');
const rateLimit = require('express-rate-limit');
const automationService = require('../services/automationService');

// Rate limiter for automation operations
const automationRateLimiter = rateLimit({
    windowMs: 60000, // 1 minute
    max: 30, // 30 requests per minute
    message: 'Too many automation requests, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
});

// All automation routes require authentication and rate limiting
router.use(requireAuth);
router.use(automationRateLimiter);

/**
 * GET /api/automation/tasks
 * Get all automation tasks
 */
router.get('/tasks', requirePermission(PERMISSIONS.AUTOMATION_VIEW), async (req, res) => {
    try {
        const tasks = automationService.getAllTasks();
        res.json({ tasks });
    } catch (error) {
        console.error('Error getting automation tasks:', error);
        res.status(500).json({ error: 'Failed to retrieve automation tasks' });
    }
});

/**
 * GET /api/automation/tasks/:id
 * Get specific automation task
 */
router.get('/tasks/:id', requirePermission(PERMISSIONS.AUTOMATION_VIEW), async (req, res) => {
    try {
        const task = automationService.getTask(req.params.id);
        
        if (!task) {
            return res.status(404).json({ error: 'Task not found' });
        }
        
        res.json({ task });
    } catch (error) {
        console.error('Error getting automation task:', error);
        res.status(500).json({ error: 'Failed to retrieve automation task' });
    }
});

/**
 * POST /api/automation/tasks
 * Create new automation task
 */
router.post('/tasks', requirePermission(PERMISSIONS.AUTOMATION_CREATE), async (req, res) => {
    try {
        const { name, description, task_type, cron_expression, config, enabled } = req.body;
        
        // Validation
        if (!name || !task_type || !cron_expression) {
            return res.status(400).json({ 
                error: 'Missing required fields: name, task_type, cron_expression' 
            });
        }
        
        const taskData = {
            name,
            description,
            task_type,
            cron_expression,
            config: config || {},
            enabled: enabled !== false
        };
        
        const task = await automationService.createTask(taskData, req.session.username);
        
        res.status(201).json({ 
            success: true,
            task 
        });
    } catch (error) {
        console.error('Error creating automation task:', error);
        res.status(400).json({ error: error.message });
    }
});

/**
 * PUT /api/automation/tasks/:id
 * Update automation task
 */
router.put('/tasks/:id', requirePermission(PERMISSIONS.AUTOMATION_EDIT), async (req, res) => {
    try {
        const updates = {};
        
        // Only include fields that are provided
        const allowedFields = ['name', 'description', 'task_type', 'cron_expression', 'config', 'enabled'];
        for (const field of allowedFields) {
            if (req.body[field] !== undefined) {
                updates[field] = req.body[field];
            }
        }
        
        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ error: 'No valid fields to update' });
        }
        
        const task = await automationService.updateTask(
            req.params.id, 
            updates, 
            req.session.username
        );
        
        res.json({ 
            success: true,
            task 
        });
    } catch (error) {
        console.error('Error updating automation task:', error);
        res.status(400).json({ error: error.message });
    }
});

/**
 * DELETE /api/automation/tasks/:id
 * Delete automation task
 */
router.delete('/tasks/:id', requirePermission(PERMISSIONS.AUTOMATION_DELETE), async (req, res) => {
    try {
        await automationService.deleteTask(req.params.id, req.session.username);
        
        res.json({ 
            success: true,
            message: 'Task deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting automation task:', error);
        res.status(400).json({ error: error.message });
    }
});

/**
 * POST /api/automation/tasks/:id/execute
 * Manually execute a task
 */
router.post('/tasks/:id/execute', requirePermission(PERMISSIONS.AUTOMATION_EXECUTE), async (req, res) => {
    try {
        const result = await automationService.executeTaskManually(
            req.params.id, 
            req.session.username
        );
        
        res.json({ 
            success: true,
            result
        });
    } catch (error) {
        console.error('Error executing automation task:', error);
        res.status(400).json({ error: error.message });
    }
});

/**
 * GET /api/automation/history
 * Get automation execution history
 */
router.get('/history', requirePermission(PERMISSIONS.AUTOMATION_HISTORY), async (req, res) => {
    try {
        const options = {};
        
        // Parse query parameters
        if (req.query.task_id) {
            options.task_id = req.query.task_id;
        }
        
        if (req.query.task_type) {
            options.task_type = req.query.task_type;
        }
        
        if (req.query.execution_type) {
            options.execution_type = req.query.execution_type;
        }
        
        if (req.query.status) {
            options.status = req.query.status;
        }
        
        if (req.query.limit) {
            options.limit = parseInt(req.query.limit, 10);
        }
        
        const history = automationService.getHistory(options);
        
        res.json({ history });
    } catch (error) {
        console.error('Error getting automation history:', error);
        res.status(500).json({ error: 'Failed to retrieve automation history' });
    }
});

/**
 * GET /api/automation/validate-cron
 * Validate a cron expression
 */
router.get('/validate-cron', requirePermission(PERMISSIONS.AUTOMATION_VIEW), async (req, res) => {
    try {
        const { expression } = req.query;
        
        if (!expression) {
            return res.status(400).json({ error: 'Missing expression parameter' });
        }
        
        const isValid = automationService.validateCronExpression(expression);
        
        res.json({ 
            valid: isValid,
            expression
        });
    } catch (error) {
        console.error('Error validating cron expression:', error);
        res.status(500).json({ error: 'Failed to validate cron expression' });
    }
});

module.exports = router;
