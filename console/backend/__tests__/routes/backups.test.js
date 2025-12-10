/**
 * Backup Routes Tests
 * 
 * Tests for backup/restore/migration API endpoints
 */

const request = require('supertest');
const express = require('express');

// Mock the services before requiring routes
jest.mock('../../services/backupService');
const backupService = require('../../services/backupService');

// Mock the requireAuth middleware
jest.mock('../../auth/auth', () => ({
    requireAuth: (req, res, next) => {
        req.session = { username: 'testuser', role: 'admin', authenticated: true };
        next();
    }
}));

// Mock the RBAC middleware
jest.mock('../../middleware/rbac', () => ({
    requirePermission: (_permission) => (req, res, next) => next()
}));

// Mock rate limiter
jest.mock('express-rate-limit', () => {
    return jest.fn(() => (req, res, next) => next());
});

// Now require the routes after mocks are set up
const backupRouter = require('../../routes/backups');

// Create a test app
const app = express();
app.use(express.json());
app.use('/api/backups', backupRouter);

describe('Backup Routes', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('GET /api/backups/jobs', () => {
        it('should return list of backup jobs', async () => {
            const mockJobs = [
                {
                    id: 'backup-1',
                    name: 'Daily Backup',
                    type: 'full',
                    status: 'success',
                    created_at: '2024-01-01T00:00:00Z',
                    created_by: 'admin',
                    file_size: 1024000
                }
            ];

            backupService.getAllBackupJobs.mockReturnValue(mockJobs);

            const response = await request(app)
                .get('/api/backups/jobs');

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('jobs');
            expect(Array.isArray(response.body.jobs)).toBe(true);
            expect(response.body.jobs).toHaveLength(1);
        });

        it('should support pagination', async () => {
            backupService.getAllBackupJobs.mockReturnValue([]);

            const response = await request(app)
                .get('/api/backups/jobs?limit=10&offset=20');

            expect(response.status).toBe(200);
            expect(backupService.getAllBackupJobs).toHaveBeenCalledWith(10, 20);
        });
    });

    describe('GET /api/backups/jobs/:id', () => {
        it('should return specific backup job', async () => {
            const mockJob = {
                id: 'backup-1',
                name: 'Daily Backup',
                type: 'full',
                status: 'success'
            };

            backupService.getBackupJob.mockReturnValue(mockJob);

            const response = await request(app)
                .get('/api/backups/jobs/backup-1');

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('job');
            expect(response.body.job.id).toBe('backup-1');
        });

        it('should return 404 if backup not found', async () => {
            backupService.getBackupJob.mockReturnValue(null);

            const response = await request(app)
                .get('/api/backups/jobs/nonexistent');

            expect(response.status).toBe(404);
            expect(response.body).toHaveProperty('error');
        });
    });

    describe('POST /api/backups/create', () => {
        it('should validate required fields', async () => {
            const response = await request(app)
                .post('/api/backups/create')
                .send({});

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('errors');
        });

        it('should create backup with valid data', async () => {
            const backupData = {
                name: 'Test Backup',
                type: 'full',
                retentionPolicy: 'daily'
            };

            const mockResult = {
                jobId: 'backup-123',
                status: 'pending'
            };

            backupService.createBackup.mockResolvedValue(mockResult);

            const response = await request(app)
                .post('/api/backups/create')
                .send(backupData);

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('jobId');
            expect(backupService.createBackup).toHaveBeenCalledWith({
                name: backupData.name,
                type: backupData.type,
                username: 'testuser',
                retentionPolicy: backupData.retentionPolicy
            });
        });

        it('should use defaults for optional fields', async () => {
            const backupData = {
                name: 'Test Backup'
            };

            backupService.createBackup.mockResolvedValue({ jobId: 'backup-123' });

            const response = await request(app)
                .post('/api/backups/create')
                .send(backupData);

            expect(response.status).toBe(200);
            expect(backupService.createBackup).toHaveBeenCalledWith({
                name: backupData.name,
                type: 'full',
                username: 'testuser',
                retentionPolicy: 'daily'
            });
        });

        it('should validate backup type', async () => {
            const response = await request(app)
                .post('/api/backups/create')
                .send({
                    name: 'Test',
                    type: 'invalid'
                });

            expect(response.status).toBe(400);
        });
    });

    describe('GET /api/backups/preview/:id', () => {
        it('should return backup preview', async () => {
            const mockPreview = {
                jobId: 'backup-1',
                fileName: 'backup.zip',
                fileSize: 1024000,
                contents: [
                    { name: 'world/', isDirectory: true },
                    { name: 'plugins/', isDirectory: true }
                ]
            };

            backupService.previewBackup.mockResolvedValue(mockPreview);

            const response = await request(app)
                .get('/api/backups/preview/backup-1');

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('fileName');
            expect(response.body).toHaveProperty('contents');
        });

        it('should handle preview errors', async () => {
            backupService.previewBackup.mockRejectedValue(new Error('Backup file not found'));

            const response = await request(app)
                .get('/api/backups/preview/backup-1');

            expect(response.status).toBe(500);
            expect(response.body).toHaveProperty('error');
        });
    });

    describe('POST /api/backups/restore', () => {
        it('should validate required fields', async () => {
            const response = await request(app)
                .post('/api/backups/restore')
                .send({});

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('errors');
        });

        it('should restore backup with valid data', async () => {
            const restoreData = {
                backupId: 'backup-1',
                createPreBackup: true
            };

            const mockResult = {
                restoreId: 'restore-123',
                status: 'pending',
                preBackupId: 'backup-456'
            };

            backupService.restoreBackup.mockResolvedValue(mockResult);

            const response = await request(app)
                .post('/api/backups/restore')
                .send(restoreData);

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('restoreId');
            expect(backupService.restoreBackup).toHaveBeenCalledWith({
                backupId: restoreData.backupId,
                username: 'testuser',
                createPreBackup: true
            });
        });

        it('should default to creating pre-backup', async () => {
            backupService.restoreBackup.mockResolvedValue({ restoreId: 'restore-123' });

            const response = await request(app)
                .post('/api/backups/restore')
                .send({ backupId: 'backup-1' });

            expect(response.status).toBe(200);
            expect(backupService.restoreBackup).toHaveBeenCalledWith({
                backupId: 'backup-1',
                username: 'testuser',
                createPreBackup: true
            });
        });
    });

    describe('DELETE /api/backups/:id', () => {
        it('should delete backup successfully', async () => {
            backupService.deleteBackup.mockResolvedValue({ success: true });

            const response = await request(app)
                .delete('/api/backups/backup-1');

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('success', true);
            expect(backupService.deleteBackup).toHaveBeenCalledWith('backup-1', 'testuser');
        });

        it('should handle deletion errors', async () => {
            backupService.deleteBackup.mockRejectedValue(new Error('Backup not found'));

            const response = await request(app)
                .delete('/api/backups/backup-1');

            expect(response.status).toBe(500);
            expect(response.body).toHaveProperty('error');
        });
    });

    describe('GET /api/backups/download/:id', () => {
        it('should return 404 if backup not found', async () => {
            backupService.getBackupJob.mockReturnValue(null);

            const response = await request(app)
                .get('/api/backups/download/backup-1');

            expect(response.status).toBe(404);
            expect(response.body).toHaveProperty('error');
        });

        it('should return 404 if file path missing', async () => {
            backupService.getBackupJob.mockReturnValue({
                id: 'backup-1',
                file_path: null
            });

            const response = await request(app)
                .get('/api/backups/download/backup-1');

            expect(response.status).toBe(404);
            expect(response.body).toHaveProperty('error');
        });
    });

    describe('GET /api/backups/restore/jobs', () => {
        it('should return list of restore jobs', async () => {
            const mockJobs = [
                {
                    id: 'restore-1',
                    backup_id: 'backup-1',
                    status: 'success',
                    created_at: '2024-01-01T00:00:00Z'
                }
            ];

            backupService.getAllRestoreJobs.mockReturnValue(mockJobs);

            const response = await request(app)
                .get('/api/backups/restore/jobs');

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('jobs');
            expect(Array.isArray(response.body.jobs)).toBe(true);
        });
    });

    describe('GET /api/backups/restore/jobs/:id', () => {
        it('should return specific restore job', async () => {
            const mockJob = {
                id: 'restore-1',
                backup_id: 'backup-1',
                status: 'success'
            };

            backupService.getRestoreJob.mockReturnValue(mockJob);

            const response = await request(app)
                .get('/api/backups/restore/jobs/restore-1');

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('job');
        });

        it('should return 404 if restore job not found', async () => {
            backupService.getRestoreJob.mockReturnValue(null);

            const response = await request(app)
                .get('/api/backups/restore/jobs/nonexistent');

            expect(response.status).toBe(404);
        });
    });

    describe('POST /api/backups/migrate/export', () => {
        it('should create migration export', async () => {
            const mockResult = {
                migrationId: 'migration-123',
                backupId: 'backup-456'
            };

            backupService.exportForMigration.mockResolvedValue(mockResult);

            const response = await request(app)
                .post('/api/backups/migrate/export')
                .send({ name: 'Migration Export' });

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('migrationId');
            expect(response.body).toHaveProperty('backupId');
        });

        it('should work without name parameter', async () => {
            backupService.exportForMigration.mockResolvedValue({
                migrationId: 'migration-123',
                backupId: 'backup-456'
            });

            const response = await request(app)
                .post('/api/backups/migrate/export')
                .send({});

            expect(response.status).toBe(200);
        });
    });

    describe('POST /api/backups/migrate/import', () => {
        it('should validate required fields', async () => {
            const response = await request(app)
                .post('/api/backups/migrate/import')
                .send({});

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('errors');
        });

        it('should import migration with valid data', async () => {
            const mockResult = {
                restoreId: 'restore-123',
                status: 'pending'
            };

            backupService.importFromMigration.mockResolvedValue(mockResult);

            const response = await request(app)
                .post('/api/backups/migrate/import')
                .send({ backupId: 'backup-1' });

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('restoreId');
            expect(backupService.importFromMigration).toHaveBeenCalledWith({
                backupId: 'backup-1',
                username: 'testuser'
            });
        });
    });

    describe('GET /api/backups/migrate/jobs', () => {
        it('should return list of migration jobs', async () => {
            const mockJobs = [
                {
                    id: 'migration-1',
                    type: 'export',
                    status: 'success',
                    created_at: '2024-01-01T00:00:00Z'
                }
            ];

            backupService.getAllMigrationJobs.mockReturnValue(mockJobs);

            const response = await request(app)
                .get('/api/backups/migrate/jobs');

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('jobs');
            expect(Array.isArray(response.body.jobs)).toBe(true);
        });
    });

    describe('Error handling', () => {
        it('should handle service errors gracefully', async () => {
            backupService.getAllBackupJobs.mockImplementation(() => {
                throw new Error('Database error');
            });

            const response = await request(app)
                .get('/api/backups/jobs');

            expect(response.status).toBe(500);
            expect(response.body).toHaveProperty('error');
        });

        it('should handle async service errors', async () => {
            backupService.createBackup.mockRejectedValue(new Error('Disk full'));

            const response = await request(app)
                .post('/api/backups/create')
                .send({ name: 'Test Backup' });

            expect(response.status).toBe(500);
            expect(response.body.error).toContain('Disk full');
        });
    });
});
