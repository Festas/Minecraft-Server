/**
 * Backup Service
 * 
 * Manages backup, restore, and migration operations for Minecraft server.
 * Supports scheduled backups, on-demand backups, restore with safety checks,
 * and migration export/import functionality.
 */

const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const crypto = require('crypto');
const AdmZip = require('adm-zip');
const database = require('./database');
const { eventLogger, EVENT_TYPES, EVENT_CATEGORIES, EVENT_SEVERITY } = require('./eventLogger');
const rconService = require('./rcon');
const dockerService = require('./docker');

// Backup types
const BACKUP_TYPES = {
    FULL: 'full',           // World + plugins + config
    WORLD: 'world',         // World data only
    PLUGINS: 'plugins',     // Plugins only
    CONFIG: 'config',       // Server config only
    MIGRATION: 'migration'  // Full export for migration
};

// Job statuses
const JOB_STATUS = {
    PENDING: 'pending',
    RUNNING: 'running',
    SUCCESS: 'success',
    FAILED: 'failed',
    CANCELLED: 'cancelled'
};

// Retention policies (in days)
const RETENTION_POLICIES = {
    DAILY: 7,
    WEEKLY: 30,
    MONTHLY: 90,
    PERMANENT: -1
};

class BackupService {
    constructor() {
        this.initialized = false;
        this.backupsDir = process.env.BACKUPS_DIR || path.join(process.cwd(), '../../backups');
        this.serverDir = process.env.SERVER_DIR || path.join(process.cwd(), '../../');
        this.worldDir = process.env.WORLD_DIR || path.join(this.serverDir, 'world');
        this.pluginsDir = process.env.PLUGINS_DIR || path.join(this.serverDir, 'plugins');
        this.configFiles = ['server.properties', 'bukkit.yml', 'spigot.yml', 'paper.yml'];
    }

    /**
     * Initialize backup service
     */
    async initialize() {
        if (this.initialized) {
            console.log('[Backup] Service already initialized');
            return;
        }

        try {
            console.log('[Backup] Initializing backup service...');
            
            // Ensure backups directory exists
            await fs.mkdir(this.backupsDir, { recursive: true });
            
            // Initialize database tables for backup tracking
            this.initializeDatabase();
            
            // Clean up old backups based on retention policy
            await this.cleanupOldBackups();
            
            this.initialized = true;
            console.log('[Backup] Service initialized successfully');
        } catch (error) {
            console.error('[Backup] Error initializing service:', error);
            throw error;
        }
    }

    /**
     * Initialize database tables for backup tracking
     */
    initializeDatabase() {
        const db = database.db;
        
        // Backup jobs table
        db.exec(`
            CREATE TABLE IF NOT EXISTS backup_jobs (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                type TEXT NOT NULL,
                status TEXT NOT NULL,
                created_at TEXT NOT NULL,
                started_at TEXT,
                completed_at TEXT,
                created_by TEXT NOT NULL,
                file_path TEXT,
                file_size INTEGER,
                retention_policy TEXT DEFAULT 'daily',
                metadata TEXT,
                error_message TEXT
            )
        `);

        db.exec(`
            CREATE INDEX IF NOT EXISTS idx_backup_jobs_created 
            ON backup_jobs(created_at DESC)
        `);

        db.exec(`
            CREATE INDEX IF NOT EXISTS idx_backup_jobs_status 
            ON backup_jobs(status)
        `);

        // Restore jobs table
        db.exec(`
            CREATE TABLE IF NOT EXISTS restore_jobs (
                id TEXT PRIMARY KEY,
                backup_id TEXT NOT NULL,
                status TEXT NOT NULL,
                created_at TEXT NOT NULL,
                started_at TEXT,
                completed_at TEXT,
                created_by TEXT NOT NULL,
                restore_type TEXT NOT NULL,
                pre_restore_backup_id TEXT,
                metadata TEXT,
                error_message TEXT,
                FOREIGN KEY (backup_id) REFERENCES backup_jobs(id)
            )
        `);

        db.exec(`
            CREATE INDEX IF NOT EXISTS idx_restore_jobs_created 
            ON restore_jobs(created_at DESC)
        `);

        // Migration jobs table
        db.exec(`
            CREATE TABLE IF NOT EXISTS migration_jobs (
                id TEXT PRIMARY KEY,
                type TEXT NOT NULL,
                status TEXT NOT NULL,
                created_at TEXT NOT NULL,
                completed_at TEXT,
                created_by TEXT NOT NULL,
                export_path TEXT,
                import_source TEXT,
                metadata TEXT,
                error_message TEXT
            )
        `);

        console.log('[Backup] Database tables initialized');
    }

    /**
     * Generate unique job ID
     */
    generateJobId(prefix = 'backup') {
        return `${prefix}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    }

    /**
     * Create a backup
     */
    async createBackup({ name, type = BACKUP_TYPES.FULL, username, retentionPolicy = 'daily' }) {
        const jobId = this.generateJobId('backup');
        const timestamp = new Date().toISOString();
        const db = database.db;

        try {
            // Create job record
            const stmt = db.prepare(`
                INSERT INTO backup_jobs 
                (id, name, type, status, created_at, created_by, retention_policy)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `);
            stmt.run(jobId, name, type, JOB_STATUS.PENDING, timestamp, username, retentionPolicy);

            // Log event
            await eventLogger.log({
                type: EVENT_TYPES.BACKUP_CREATED,
                category: EVENT_CATEGORIES.BACKUP,
                severity: EVENT_SEVERITY.INFO,
                message: `Backup job created: ${name}`,
                username,
                metadata: { jobId, type, retentionPolicy }
            });

            // Start backup asynchronously
            this.performBackup(jobId, type, username).catch(err => {
                console.error(`[Backup] Error performing backup ${jobId}:`, err);
            });

            return { jobId, status: JOB_STATUS.PENDING };
        } catch (error) {
            console.error('[Backup] Error creating backup job:', error);
            throw error;
        }
    }

    /**
     * Perform the actual backup operation
     */
    async performBackup(jobId, type, username) {
        const db = database.db;
        const startTime = Date.now();
        const timestamp = new Date().toISOString();

        try {
            // Update job status to running
            db.prepare('UPDATE backup_jobs SET status = ?, started_at = ? WHERE id = ?')
                .run(JOB_STATUS.RUNNING, timestamp, jobId);

            // Disable world saving in Minecraft (if server is running)
            let saveDisabled = false;
            try {
                await rconService.sendCommand('save-off');
                await rconService.sendCommand('save-all flush');
                saveDisabled = true;
                // Wait for save to complete
                await new Promise(resolve => setTimeout(resolve, 2000));
            } catch (error) {
                console.log('[Backup] Could not disable auto-save (server may be offline)');
            }

            // Create backup file
            const fileName = `backup-${type}-${Date.now()}.zip`;
            const filePath = path.join(this.backupsDir, fileName);
            const zip = new AdmZip();

            // Add files based on backup type
            if (type === BACKUP_TYPES.FULL || type === BACKUP_TYPES.WORLD || type === BACKUP_TYPES.MIGRATION) {
                if (fsSync.existsSync(this.worldDir)) {
                    zip.addLocalFolder(this.worldDir, 'world');
                }
            }

            if (type === BACKUP_TYPES.FULL || type === BACKUP_TYPES.PLUGINS || type === BACKUP_TYPES.MIGRATION) {
                if (fsSync.existsSync(this.pluginsDir)) {
                    zip.addLocalFolder(this.pluginsDir, 'plugins');
                }
            }

            if (type === BACKUP_TYPES.FULL || type === BACKUP_TYPES.CONFIG || type === BACKUP_TYPES.MIGRATION) {
                for (const configFile of this.configFiles) {
                    const configPath = path.join(this.serverDir, configFile);
                    if (fsSync.existsSync(configPath)) {
                        zip.addLocalFile(configPath);
                    }
                }
            }

            // Add metadata
            const metadata = {
                createdAt: timestamp,
                createdBy: username,
                type,
                serverVersion: process.env.MINECRAFT_VERSION || 'unknown',
                backupVersion: '1.0'
            };
            zip.addFile('backup-metadata.json', Buffer.from(JSON.stringify(metadata, null, 2)));

            // Write zip file
            zip.writeZip(filePath);

            // Get file size
            const stats = await fs.stat(filePath);
            const fileSize = stats.size;

            // Re-enable world saving
            if (saveDisabled) {
                try {
                    await rconService.sendCommand('save-on');
                } catch (error) {
                    console.log('[Backup] Could not re-enable auto-save');
                }
            }

            // Update job as successful
            const duration = Date.now() - startTime;
            db.prepare(`
                UPDATE backup_jobs 
                SET status = ?, completed_at = ?, file_path = ?, file_size = ?, 
                    metadata = ?
                WHERE id = ?
            `).run(
                JOB_STATUS.SUCCESS,
                new Date().toISOString(),
                filePath,
                fileSize,
                JSON.stringify({ duration, ...metadata }),
                jobId
            );

            // Log success
            await eventLogger.log({
                type: EVENT_TYPES.BACKUP_COMPLETED,
                category: EVENT_CATEGORIES.BACKUP,
                severity: EVENT_SEVERITY.INFO,
                message: `Backup completed successfully: ${fileName}`,
                username,
                metadata: { jobId, fileSize, duration }
            });

            console.log(`[Backup] Backup ${jobId} completed successfully`);
        } catch (error) {
            // Re-enable world saving on error
            try {
                await rconService.sendCommand('save-on');
            } catch (err) {
                // Ignore
            }

            // Update job as failed
            db.prepare('UPDATE backup_jobs SET status = ?, error_message = ?, completed_at = ? WHERE id = ?')
                .run(JOB_STATUS.FAILED, error.message, new Date().toISOString(), jobId);

            // Log failure
            await eventLogger.log({
                type: EVENT_TYPES.BACKUP_FAILED,
                category: EVENT_CATEGORIES.BACKUP,
                severity: EVENT_SEVERITY.ERROR,
                message: `Backup failed: ${error.message}`,
                username,
                metadata: { jobId, error: error.message }
            });

            console.error(`[Backup] Backup ${jobId} failed:`, error);
            throw error;
        }
    }

    /**
     * Get backup job by ID
     */
    getBackupJob(jobId) {
        const db = database.db;
        const stmt = db.prepare('SELECT * FROM backup_jobs WHERE id = ?');
        return stmt.get(jobId);
    }

    /**
     * Get all backup jobs
     */
    getAllBackupJobs(limit = 50, offset = 0) {
        const db = database.db;
        const stmt = db.prepare(`
            SELECT * FROM backup_jobs 
            ORDER BY created_at DESC 
            LIMIT ? OFFSET ?
        `);
        return stmt.all(limit, offset);
    }

    /**
     * Get backup jobs by status
     */
    getBackupJobsByStatus(status) {
        const db = database.db;
        const stmt = db.prepare('SELECT * FROM backup_jobs WHERE status = ? ORDER BY created_at DESC');
        return stmt.all(status);
    }

    /**
     * Preview backup contents
     */
    async previewBackup(jobId) {
        const job = this.getBackupJob(jobId);
        if (!job) {
            throw new Error('Backup job not found');
        }

        if (!job.file_path || !fsSync.existsSync(job.file_path)) {
            throw new Error('Backup file not found');
        }

        try {
            const zip = new AdmZip(job.file_path);
            const entries = zip.getEntries();
            
            const preview = {
                jobId,
                fileName: path.basename(job.file_path),
                fileSize: job.file_size,
                createdAt: job.created_at,
                type: job.type,
                contents: entries.map(entry => ({
                    name: entry.entryName,
                    size: entry.header.size,
                    isDirectory: entry.isDirectory,
                    compressedSize: entry.header.compressedSize
                }))
            };

            // Try to read metadata if it exists
            const metadataEntry = entries.find(e => e.entryName === 'backup-metadata.json');
            if (metadataEntry) {
                const metadataContent = zip.readAsText(metadataEntry);
                preview.metadata = JSON.parse(metadataContent);
            }

            return preview;
        } catch (error) {
            console.error('[Backup] Error previewing backup:', error);
            throw new Error('Failed to preview backup: ' + error.message);
        }
    }

    /**
     * Restore from backup with safety checks
     */
    async restoreBackup({ backupId, username, createPreBackup = true }) {
        const restoreId = this.generateJobId('restore');
        const timestamp = new Date().toISOString();
        const db = database.db;

        try {
            // Get backup job
            const backup = this.getBackupJob(backupId);
            if (!backup) {
                throw new Error('Backup not found');
            }

            if (!backup.file_path || !fsSync.existsSync(backup.file_path)) {
                throw new Error('Backup file not found');
            }

            // Create pre-restore backup if requested
            let preBackupId = null;
            if (createPreBackup) {
                const preBackup = await this.createBackup({
                    name: `Pre-restore backup before ${backupId}`,
                    type: BACKUP_TYPES.FULL,
                    username,
                    retentionPolicy: 'daily'
                });
                preBackupId = preBackup.jobId;
                
                // Wait for pre-backup to complete
                await this.waitForBackupCompletion(preBackupId, 300000); // 5 min timeout
            }

            // Create restore job record
            const stmt = db.prepare(`
                INSERT INTO restore_jobs 
                (id, backup_id, status, created_at, created_by, restore_type, pre_restore_backup_id)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `);
            stmt.run(restoreId, backupId, JOB_STATUS.PENDING, timestamp, username, backup.type, preBackupId);

            // Log event
            await eventLogger.log({
                type: EVENT_TYPES.BACKUP_RESTORED,
                category: EVENT_CATEGORIES.BACKUP,
                severity: EVENT_SEVERITY.WARNING,
                message: `Restore job created from backup: ${backupId}`,
                username,
                metadata: { restoreId, backupId, preBackupId }
            });

            // Perform restore asynchronously
            this.performRestore(restoreId, backup, username).catch(err => {
                console.error(`[Backup] Error performing restore ${restoreId}:`, err);
            });

            return { restoreId, status: JOB_STATUS.PENDING, preBackupId };
        } catch (error) {
            console.error('[Backup] Error creating restore job:', error);
            throw error;
        }
    }

    /**
     * Perform the actual restore operation
     */
    async performRestore(restoreId, backup, username) {
        const db = database.db;
        const startTime = Date.now();
        const timestamp = new Date().toISOString();

        try {
            // Update job status to running
            db.prepare('UPDATE restore_jobs SET status = ?, started_at = ? WHERE id = ?')
                .run(JOB_STATUS.RUNNING, timestamp, restoreId);

            // Stop server for restore (safer)
            let serverWasRunning = false;
            try {
                const isRunning = await dockerService.isServerRunning();
                if (isRunning) {
                    serverWasRunning = true;
                    await rconService.sendCommand('say §cServer is shutting down for restore operation...');
                    await new Promise(resolve => setTimeout(resolve, 3000));
                    await dockerService.stopServer();
                    // Wait for server to fully stop
                    await new Promise(resolve => setTimeout(resolve, 5000));
                }
            } catch (error) {
                console.log('[Backup] Could not check/stop server:', error.message);
            }

            // Extract backup
            const zip = new AdmZip(backup.file_path);
            
            // Create temporary restore directory
            const tempDir = path.join(this.backupsDir, `restore-temp-${restoreId}`);
            await fs.mkdir(tempDir, { recursive: true });

            // Extract to temp directory
            zip.extractAllTo(tempDir, true);

            // Restore files based on backup type
            const restoreWorld = backup.type === BACKUP_TYPES.FULL || 
                                backup.type === BACKUP_TYPES.WORLD ||
                                backup.type === BACKUP_TYPES.MIGRATION;
            const restorePlugins = backup.type === BACKUP_TYPES.FULL || 
                                  backup.type === BACKUP_TYPES.PLUGINS ||
                                  backup.type === BACKUP_TYPES.MIGRATION;
            const restoreConfig = backup.type === BACKUP_TYPES.FULL || 
                                 backup.type === BACKUP_TYPES.CONFIG ||
                                 backup.type === BACKUP_TYPES.MIGRATION;

            if (restoreWorld) {
                const worldSource = path.join(tempDir, 'world');
                if (fsSync.existsSync(worldSource)) {
                    // Backup current world before replacing
                    const worldBackup = this.worldDir + '.old';
                    if (fsSync.existsSync(this.worldDir)) {
                        if (fsSync.existsSync(worldBackup)) {
                            await fs.rm(worldBackup, { recursive: true, force: true });
                        }
                        await fs.rename(this.worldDir, worldBackup);
                    }
                    // Copy restored world
                    await this.copyDirectory(worldSource, this.worldDir);
                }
            }

            if (restorePlugins) {
                const pluginsSource = path.join(tempDir, 'plugins');
                if (fsSync.existsSync(pluginsSource)) {
                    // Backup current plugins before replacing
                    const pluginsBackup = this.pluginsDir + '.old';
                    if (fsSync.existsSync(this.pluginsDir)) {
                        if (fsSync.existsSync(pluginsBackup)) {
                            await fs.rm(pluginsBackup, { recursive: true, force: true });
                        }
                        await fs.rename(this.pluginsDir, pluginsBackup);
                    }
                    // Copy restored plugins
                    await this.copyDirectory(pluginsSource, this.pluginsDir);
                }
            }

            if (restoreConfig) {
                for (const configFile of this.configFiles) {
                    const configSource = path.join(tempDir, configFile);
                    const configDest = path.join(this.serverDir, configFile);
                    if (fsSync.existsSync(configSource)) {
                        // Backup current config
                        if (fsSync.existsSync(configDest)) {
                            await fs.copyFile(configDest, configDest + '.old');
                        }
                        await fs.copyFile(configSource, configDest);
                    }
                }
            }

            // Clean up temp directory
            await fs.rm(tempDir, { recursive: true, force: true });

            // Restart server if it was running
            if (serverWasRunning) {
                try {
                    await dockerService.startServer();
                } catch (error) {
                    console.error('[Backup] Failed to restart server after restore:', error);
                }
            }

            // Update job as successful
            const duration = Date.now() - startTime;
            db.prepare(`
                UPDATE restore_jobs 
                SET status = ?, completed_at = ?, metadata = ?
                WHERE id = ?
            `).run(
                JOB_STATUS.SUCCESS,
                new Date().toISOString(),
                JSON.stringify({ duration }),
                restoreId
            );

            // Log success
            await eventLogger.log({
                type: EVENT_TYPES.BACKUP_RESTORED,
                category: EVENT_CATEGORIES.BACKUP,
                severity: EVENT_SEVERITY.INFO,
                message: `Restore completed successfully from backup: ${backup.id}`,
                username,
                metadata: { restoreId, backupId: backup.id, duration }
            });

            console.log(`[Backup] Restore ${restoreId} completed successfully`);
        } catch (error) {
            // Update job as failed
            db.prepare('UPDATE restore_jobs SET status = ?, error_message = ?, completed_at = ? WHERE id = ?')
                .run(JOB_STATUS.FAILED, error.message, new Date().toISOString(), restoreId);

            // Log failure
            await eventLogger.log({
                type: EVENT_TYPES.BACKUP_FAILED,
                category: EVENT_CATEGORIES.BACKUP,
                severity: EVENT_SEVERITY.ERROR,
                message: `Restore failed: ${error.message}`,
                username,
                metadata: { restoreId, error: error.message }
            });

            console.error(`[Backup] Restore ${restoreId} failed:`, error);
            throw error;
        }
    }

    /**
     * Wait for backup completion
     */
    async waitForBackupCompletion(jobId, timeout = 300000) {
        const startTime = Date.now();
        while (Date.now() - startTime < timeout) {
            const job = this.getBackupJob(jobId);
            if (job.status === JOB_STATUS.SUCCESS) {
                return job;
            }
            if (job.status === JOB_STATUS.FAILED) {
                throw new Error('Backup failed: ' + job.error_message);
            }
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        throw new Error('Backup timed out');
    }

    /**
     * Copy directory recursively
     */
    async copyDirectory(src, dest) {
        await fs.mkdir(dest, { recursive: true });
        const entries = await fs.readdir(src, { withFileTypes: true });

        for (const entry of entries) {
            const srcPath = path.join(src, entry.name);
            const destPath = path.join(dest, entry.name);

            if (entry.isDirectory()) {
                await this.copyDirectory(srcPath, destPath);
            } else {
                await fs.copyFile(srcPath, destPath);
            }
        }
    }

    /**
     * Delete backup
     */
    async deleteBackup(jobId, username) {
        const db = database.db;
        const backup = this.getBackupJob(jobId);
        
        if (!backup) {
            throw new Error('Backup not found');
        }

        try {
            // Delete file if it exists
            if (backup.file_path && fsSync.existsSync(backup.file_path)) {
                await fs.unlink(backup.file_path);
            }

            // Delete from database
            db.prepare('DELETE FROM backup_jobs WHERE id = ?').run(jobId);

            // Log event
            await eventLogger.log({
                type: EVENT_TYPES.BACKUP_DELETED,
                category: EVENT_CATEGORIES.BACKUP,
                severity: EVENT_SEVERITY.INFO,
                message: `Backup deleted: ${backup.name}`,
                username,
                metadata: { jobId }
            });

            return { success: true };
        } catch (error) {
            console.error('[Backup] Error deleting backup:', error);
            throw error;
        }
    }

    /**
     * Export for migration
     */
    async exportForMigration({ name, username }) {
        const migrationId = this.generateJobId('migration-export');
        
        try {
            // Create full backup for migration
            const backup = await this.createBackup({
                name: name || `Migration Export ${new Date().toISOString()}`,
                type: BACKUP_TYPES.MIGRATION,
                username,
                retentionPolicy: 'permanent'
            });

            // Create migration job record
            const db = database.db;
            const timestamp = new Date().toISOString();
            db.prepare(`
                INSERT INTO migration_jobs 
                (id, type, status, created_at, created_by, export_path)
                VALUES (?, ?, ?, ?, ?, ?)
            `).run(migrationId, 'export', JOB_STATUS.SUCCESS, timestamp, username, backup.jobId);

            return { migrationId, backupId: backup.jobId };
        } catch (error) {
            console.error('[Backup] Error creating migration export:', error);
            throw error;
        }
    }

    /**
     * Import from migration
     */
    async importFromMigration({ backupId, username }) {
        // This is essentially the same as a restore
        return this.restoreBackup({ backupId, username, createPreBackup: true });
    }

    /**
     * Clean up old backups based on retention policy
     */
    async cleanupOldBackups() {
        try {
            const db = database.db;
            const now = Date.now();

            // Get all successful backups
            const backups = db.prepare(`
                SELECT * FROM backup_jobs 
                WHERE status = ? AND retention_policy != ?
                ORDER BY created_at ASC
            `).all(JOB_STATUS.SUCCESS, 'permanent');

            let deletedCount = 0;

            for (const backup of backups) {
                const retentionDays = RETENTION_POLICIES[backup.retention_policy.toUpperCase()] || RETENTION_POLICIES.DAILY;
                if (retentionDays === -1) continue; // Permanent

                const createdAt = new Date(backup.created_at).getTime();
                const age = (now - createdAt) / (1000 * 60 * 60 * 24); // days

                if (age > retentionDays) {
                    // Delete backup
                    if (backup.file_path && fsSync.existsSync(backup.file_path)) {
                        await fs.unlink(backup.file_path);
                    }
                    db.prepare('DELETE FROM backup_jobs WHERE id = ?').run(backup.id);
                    deletedCount++;
                }
            }

            if (deletedCount > 0) {
                console.log(`[Backup] Cleaned up ${deletedCount} old backups`);
            }
        } catch (error) {
            console.error('[Backup] Error cleaning up old backups:', error);
        }
    }

    /**
     * Get restore job
     */
    getRestoreJob(restoreId) {
        const db = database.db;
        const stmt = db.prepare('SELECT * FROM restore_jobs WHERE id = ?');
        return stmt.get(restoreId);
    }

    /**
     * Get all restore jobs
     */
    getAllRestoreJobs(limit = 50, offset = 0) {
        const db = database.db;
        const stmt = db.prepare(`
            SELECT * FROM restore_jobs 
            ORDER BY created_at DESC 
            LIMIT ? OFFSET ?
        `);
        return stmt.all(limit, offset);
    }

    /**
     * Get migration job
     */
    getMigrationJob(migrationId) {
        const db = database.db;
        const stmt = db.prepare('SELECT * FROM migration_jobs WHERE id = ?');
        return stmt.get(migrationId);
    }

    /**
     * Get all migration jobs
     */
    getAllMigrationJobs(limit = 50, offset = 0) {
        const db = database.db;
        const stmt = db.prepare(`
            SELECT * FROM migration_jobs 
            ORDER BY created_at DESC 
            LIMIT ? OFFSET ?
        `);
        return stmt.all(limit, offset);
    }
}

// Export singleton instance
const backupService = new BackupService();
module.exports = backupService;
module.exports.BACKUP_TYPES = BACKUP_TYPES;
module.exports.JOB_STATUS = JOB_STATUS;
module.exports.RETENTION_POLICIES = RETENTION_POLICIES;
