/**
 * Automation Service
 * 
 * Manages scheduled automation tasks using node-cron for reliable scheduling.
 * Supports backups, restarts, broadcasts, and custom commands.
 * Integrates with database for persistence and audit logging.
 */

const cron = require('node-cron');
const crypto = require('crypto');
const database = require('./database');
const auditLog = require('./auditLog');
const rconService = require('./rcon');
const dockerService = require('./docker');
const { exec } = require('child_process');
const util = require('util');
const path = require('path');

const execPromise = util.promisify(exec);

// Task type constants
const TASK_TYPES = {
    BACKUP: 'backup',
    RESTART: 'restart',
    BROADCAST: 'broadcast',
    COMMAND: 'command'
};

// Execution types
const EXECUTION_TYPES = {
    SCHEDULED: 'scheduled',
    MANUAL: 'manual'
};

// Status constants
const STATUS = {
    SUCCESS: 'success',
    FAILED: 'failed',
    PARTIAL: 'partial'
};

class AutomationService {
    constructor() {
        this.cronJobs = new Map();
        this.initialized = false;
    }

    /**
     * Initialize automation service
     * Load all enabled tasks from database and schedule them
     */
    async initialize() {
        if (this.initialized) {
            console.log('[Automation] Service already initialized');
            return;
        }

        try {
            console.log('[Automation] Initializing automation service...');
            
            // Load all enabled tasks
            const tasks = database.getAllAutomationTasks(true);
            
            console.log(`[Automation] Found ${tasks.length} enabled tasks`);
            
            // Schedule each task
            for (const task of tasks) {
                try {
                    await this.scheduleTask(task);
                } catch (error) {
                    console.error(`[Automation] Error scheduling task ${task.id}:`, error);
                }
            }
            
            this.initialized = true;
            console.log('[Automation] Service initialized successfully');
        } catch (error) {
            console.error('[Automation] Error initializing service:', error);
            throw error;
        }
    }

    /**
     * Generate unique task ID
     */
    generateTaskId() {
        return `task-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    }

    /**
     * Validate cron expression
     */
    validateCronExpression(expression) {
        return cron.validate(expression);
    }

    /**
     * Create a new automation task
     */
    async createTask(taskData, createdBy) {
        // Validate cron expression
        if (!this.validateCronExpression(taskData.cron_expression)) {
            throw new Error('Invalid cron expression');
        }

        // Validate task type
        if (!Object.values(TASK_TYPES).includes(taskData.task_type)) {
            throw new Error(`Invalid task type: ${taskData.task_type}`);
        }

        const task = {
            id: this.generateTaskId(),
            name: taskData.name,
            description: taskData.description || '',
            task_type: taskData.task_type,
            cron_expression: taskData.cron_expression,
            config: taskData.config || {},
            enabled: taskData.enabled !== false,
            created_by: createdBy
        };

        // Save to database
        const createdTask = database.createAutomationTask(task);

        // Schedule if enabled
        if (createdTask.enabled) {
            await this.scheduleTask(createdTask);
        }

        // Audit log
        await auditLog.logAuditEvent(
            'automation.task.created',
            createdBy,
            { task_id: createdTask.id, task_name: createdTask.name, task_type: createdTask.task_type }
        );

        return createdTask;
    }

    /**
     * Update an existing task
     */
    async updateTask(taskId, updates, updatedBy) {
        const existingTask = database.getAutomationTask(taskId);
        if (!existingTask) {
            throw new Error('Task not found');
        }

        // Validate cron if being updated
        if (updates.cron_expression && !this.validateCronExpression(updates.cron_expression)) {
            throw new Error('Invalid cron expression');
        }

        // Unschedule existing task
        this.unscheduleTask(taskId);

        // Update in database
        const updatedTask = database.updateAutomationTask(taskId, updates);

        // Reschedule if enabled
        if (updatedTask.enabled) {
            await this.scheduleTask(updatedTask);
        }

        // Audit log
        await auditLog.logAuditEvent(
            'automation.task.updated',
            updatedBy,
            { task_id: taskId, updates: Object.keys(updates) }
        );

        return updatedTask;
    }

    /**
     * Delete a task
     */
    async deleteTask(taskId, deletedBy) {
        const task = database.getAutomationTask(taskId);
        if (!task) {
            throw new Error('Task not found');
        }

        // Unschedule
        this.unscheduleTask(taskId);

        // Delete from database
        database.deleteAutomationTask(taskId);

        // Audit log
        await auditLog.logAuditEvent(
            'automation.task.deleted',
            deletedBy,
            { task_id: taskId, task_name: task.name }
        );

        return { success: true };
    }

    /**
     * Get all tasks
     */
    getAllTasks() {
        return database.getAllAutomationTasks();
    }

    /**
     * Get task by ID
     */
    getTask(taskId) {
        return database.getAutomationTask(taskId);
    }

    /**
     * Schedule a task with node-cron
     */
    async scheduleTask(task) {
        try {
            // Create cron job
            const cronJob = cron.schedule(
                task.cron_expression,
                async () => {
                    await this.executeTask(task, EXECUTION_TYPES.SCHEDULED, 'system');
                },
                {
                    scheduled: true,
                    timezone: process.env.TZ || 'UTC'
                }
            );

            // Store the cron job
            this.cronJobs.set(task.id, cronJob);

            console.log(`[Automation] Scheduled task: ${task.name} (${task.cron_expression})`);
        } catch (error) {
            console.error(`[Automation] Error scheduling task ${task.id}:`, error);
            throw error;
        }
    }

    /**
     * Unschedule a task
     */
    unscheduleTask(taskId) {
        const cronJob = this.cronJobs.get(taskId);
        if (cronJob) {
            cronJob.stop();
            this.cronJobs.delete(taskId);
            console.log(`[Automation] Unscheduled task: ${taskId}`);
        }
    }

    /**
     * Manually execute a task
     */
    async executeTaskManually(taskId, executedBy) {
        const task = database.getAutomationTask(taskId);
        if (!task) {
            throw new Error('Task not found');
        }

        return await this.executeTask(task, EXECUTION_TYPES.MANUAL, executedBy);
    }

    /**
     * Execute a task
     */
    async executeTask(task, executionType, executedBy) {
        const startTime = Date.now();
        let status = STATUS.SUCCESS;
        let errorMessage = null;
        let resultDetails = {};

        console.log(`[Automation] Executing ${executionType} task: ${task.name} (${task.task_type})`);

        try {
            switch (task.task_type) {
                case TASK_TYPES.BACKUP:
                    resultDetails = await this.executeBackupTask(task);
                    break;
                case TASK_TYPES.RESTART:
                    resultDetails = await this.executeRestartTask(task);
                    break;
                case TASK_TYPES.BROADCAST:
                    resultDetails = await this.executeBroadcastTask(task);
                    break;
                case TASK_TYPES.COMMAND:
                    resultDetails = await this.executeCommandTask(task);
                    break;
                default:
                    throw new Error(`Unknown task type: ${task.task_type}`);
            }
        } catch (error) {
            status = STATUS.FAILED;
            errorMessage = error.message;
            console.error(`[Automation] Task execution failed:`, error);
        }

        const duration = Date.now() - startTime;

        // Record execution in history
        database.recordAutomationExecution({
            task_id: task.id,
            task_name: task.name,
            task_type: task.task_type,
            execution_type: executionType,
            executed_by: executedBy,
            status,
            duration_ms: duration,
            error_message: errorMessage,
            result_details: resultDetails
        });

        // Update task run statistics
        if (executionType === EXECUTION_TYPES.SCHEDULED) {
            database.updateTaskRunStats(task.id, new Date().toISOString());
        }

        // Audit log
        await auditLog.logAuditEvent(
            `automation.task.${executionType}`,
            executedBy,
            {
                task_id: task.id,
                task_name: task.name,
                task_type: task.task_type,
                status,
                duration_ms: duration
            }
        );

        return {
            status,
            duration_ms: duration,
            error_message: errorMessage,
            result_details: resultDetails
        };
    }

    /**
     * Execute backup task
     */
    async executeBackupTask(task) {
        try {
            // Disable auto-save
            await rconService.saveOff();
            await rconService.saveAll();

            // Run backup script
            const backupScript = path.join(__dirname, '../../../scripts/backup.sh');
            const { stdout, stderr } = await execPromise(backupScript);

            // Re-enable auto-save
            await rconService.saveOn();

            return {
                message: 'Backup completed successfully',
                output: stdout
            };
        } catch (error) {
            // Try to re-enable auto-save even if backup failed
            try {
                await rconService.saveOn();
            } catch (e) {
                console.error('[Automation] Failed to re-enable auto-save:', e);
            }
            throw error;
        }
    }

    /**
     * Execute restart task
     */
    async executeRestartTask(task) {
        const { warning_message, warning_delay } = task.config;

        try {
            // Warn players
            if (warning_message) {
                await rconService.executeCommand(`say ${warning_message}`);
                const delay = warning_delay || 30;
                await new Promise(resolve => setTimeout(resolve, delay * 1000));
            }

            // Save and stop
            await rconService.saveAll();
            await rconService.stopServer();

            // Wait for graceful shutdown
            await new Promise(resolve => setTimeout(resolve, 10000));

            // Start server
            await dockerService.startServer();

            return {
                message: 'Server restarted successfully'
            };
        } catch (error) {
            throw new Error(`Restart failed: ${error.message}`);
        }
    }

    /**
     * Execute broadcast task
     */
    async executeBroadcastTask(task) {
        const { message } = task.config;

        if (!message) {
            throw new Error('No message configured for broadcast');
        }

        try {
            await rconService.executeCommand(`say ${message}`);
            return {
                message: 'Broadcast sent successfully',
                broadcast_message: message
            };
        } catch (error) {
            throw new Error(`Broadcast failed: ${error.message}`);
        }
    }

    /**
     * Execute custom command task
     */
    async executeCommandTask(task) {
        const { command } = task.config;

        if (!command) {
            throw new Error('No command configured');
        }

        try {
            const response = await rconService.executeCommand(command);
            return {
                message: 'Command executed successfully',
                command,
                response
            };
        } catch (error) {
            throw new Error(`Command execution failed: ${error.message}`);
        }
    }

    /**
     * Get execution history
     */
    getHistory(options = {}) {
        return database.getAutomationHistory(options);
    }

    /**
     * Shutdown service
     */
    async shutdown() {
        console.log('[Automation] Shutting down automation service...');
        
        // Stop all cron jobs
        for (const [taskId, cronJob] of this.cronJobs.entries()) {
            cronJob.stop();
        }
        
        this.cronJobs.clear();
        this.initialized = false;
        
        console.log('[Automation] Service shut down successfully');
    }
}

module.exports = new AutomationService();
