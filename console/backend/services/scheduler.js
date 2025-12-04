const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

const SCHEDULE_FILE = path.join(__dirname, '../config/schedule.json');

class SchedulerService {
    constructor() {
        this.scheduledTasks = new Map();
        this.loadSchedule();
    }

    /**
     * Load schedule from file
     */
    async loadSchedule() {
        try {
            const data = await fs.readFile(SCHEDULE_FILE, 'utf8');
            const schedule = JSON.parse(data);
            
            // Re-initialize tasks
            this.initializeTasks(schedule);
        } catch (error) {
            // File doesn't exist, create default
            const defaultSchedule = {
                restarts: [],
                backups: [],
                messages: []
            };
            await this.saveSchedule(defaultSchedule);
        }
    }

    /**
     * Save schedule to file
     */
    async saveSchedule(schedule) {
        try {
            await fs.writeFile(SCHEDULE_FILE, JSON.stringify(schedule, null, 2));
        } catch (error) {
            console.error('Error saving schedule:', error);
        }
    }

    /**
     * Initialize scheduled tasks
     */
    initializeTasks(schedule) {
        // Clear existing tasks
        this.scheduledTasks.forEach(task => clearInterval(task));
        this.scheduledTasks.clear();

        // Set up restart tasks
        if (schedule.restarts) {
            schedule.restarts.forEach(restart => {
                if (restart.enabled) {
                    this.scheduleRestart(restart);
                }
            });
        }

        // Set up backup tasks
        if (schedule.backups) {
            schedule.backups.forEach(backup => {
                if (backup.enabled) {
                    this.scheduleBackup(backup);
                }
            });
        }

        // Set up message tasks
        if (schedule.messages) {
            schedule.messages.forEach(message => {
                if (message.enabled) {
                    this.scheduleMessage(message);
                }
            });
        }
    }

    /**
     * Schedule a server restart
     */
    scheduleRestart(config) {
        const checkInterval = setInterval(() => {
            const now = new Date();
            const hours = now.getHours();
            const minutes = now.getMinutes();
            
            if (hours === config.hour && minutes === config.minute) {
                console.log('Executing scheduled restart...');
                this.executeRestart(config);
            }
        }, 60000); // Check every minute

        this.scheduledTasks.set(`restart-${config.id}`, checkInterval);
    }

    /**
     * Execute restart
     */
    async executeRestart(config) {
        const rconService = require('./rcon');
        const dockerService = require('./docker');
        
        try {
            // Warn players
            if (config.warning) {
                await rconService.executeCommand(`say ${config.warning}`);
                await new Promise(resolve => setTimeout(resolve, 30000)); // Wait 30s
            }
            
            // Save and stop
            await rconService.saveAll();
            await rconService.stopServer();
            
            // Wait for graceful shutdown
            await new Promise(resolve => setTimeout(resolve, 10000));
            
            // Start server
            await dockerService.startServer();
        } catch (error) {
            console.error('Error executing scheduled restart:', error);
        }
    }

    /**
     * Schedule a backup
     */
    scheduleBackup(config) {
        const interval = config.intervalHours * 60 * 60 * 1000;
        
        const task = setInterval(async () => {
            console.log('Executing scheduled backup...');
            await this.executeBackup();
        }, interval);

        this.scheduledTasks.set(`backup-${config.id}`, task);
    }

    /**
     * Execute backup
     */
    async executeBackup() {
        const rconService = require('./rcon');
        
        try {
            // Disable auto-save
            await rconService.saveOff();
            await rconService.saveAll();
            
            // Run backup script
            const backupScript = path.join(__dirname, '../../../backup.sh');
            await execPromise(backupScript);
            
            // Re-enable auto-save
            await rconService.saveOn();
            
            console.log('Backup completed successfully');
        } catch (error) {
            console.error('Error executing backup:', error);
        }
    }

    /**
     * Schedule a message
     */
    scheduleMessage(config) {
        const interval = config.intervalMinutes * 60 * 1000;
        
        const task = setInterval(async () => {
            const rconService = require('./rcon');
            await rconService.executeCommand(`say ${config.message}`);
        }, interval);

        this.scheduledTasks.set(`message-${config.id}`, task);
    }

    /**
     * Add or update a scheduled task
     */
    async addTask(type, config) {
        const schedule = JSON.parse(await fs.readFile(SCHEDULE_FILE, 'utf8'));
        
        if (!schedule[type]) {
            schedule[type] = [];
        }
        
        // Add or update
        const index = schedule[type].findIndex(t => t.id === config.id);
        if (index >= 0) {
            schedule[type][index] = config;
        } else {
            schedule[type].push(config);
        }
        
        await this.saveSchedule(schedule);
        await this.loadSchedule();
    }

    /**
     * Remove a scheduled task
     */
    async removeTask(type, id) {
        const schedule = JSON.parse(await fs.readFile(SCHEDULE_FILE, 'utf8'));
        
        if (schedule[type]) {
            schedule[type] = schedule[type].filter(t => t.id !== id);
        }
        
        await this.saveSchedule(schedule);
        await this.loadSchedule();
    }
}

module.exports = new SchedulerService();
