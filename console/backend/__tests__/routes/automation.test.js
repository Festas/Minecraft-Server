/**
 * Automation Routes Tests
 * 
 * Tests for automation/scheduler API endpoints
 */

const request = require('supertest');
const express = require('express');

// Mock the services before requiring routes
jest.mock('../../services/automationService');
const automationService = require('../../services/automationService');

// Mock the requireAuth middleware
jest.mock('../../auth/auth', () => ({
    requireAuth: (req, res, next) => {
        req.session = { username: 'testuser', role: 'admin', authenticated: true };
        next();
    }
}));

// Mock the RBAC middleware
jest.mock('../../middleware/rbac', () => ({
    requirePermission: (permission) => (req, res, next) => next()
}));

// Mock rate limiter
jest.mock('express-rate-limit', () => {
    return jest.fn(() => (req, res, next) => next());
});

// Now require the routes after mocks are set up
const automationRouter = require('../../routes/automation');

// Create a test app
const app = express();
app.use(express.json());
app.use('/api/automation', automationRouter);

describe('Automation Routes', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('GET /api/automation/tasks', () => {
        it('should return list of tasks', async () => {
            const mockTasks = [
                {
                    id: 'task-1',
                    name: 'Daily Backup',
                    task_type: 'backup',
                    cron_expression: '0 0 * * *',
                    enabled: true,
                    created_by: 'admin',
                    run_count: 5
                }
            ];

            automationService.getAllTasks.mockReturnValue(mockTasks);

            const response = await request(app)
                .get('/api/automation/tasks');

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('tasks');
            expect(Array.isArray(response.body.tasks)).toBe(true);
        });
    });

    describe('POST /api/automation/tasks', () => {
        it('should validate required fields', async () => {
            const response = await request(app)
                .post('/api/automation/tasks')
                .send({ description: 'Test description' });

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('error');
        });

        it('should create task with valid data', async () => {
            const taskData = {
                name: 'Test Backup',
                task_type: 'backup',
                cron_expression: '0 */6 * * *'
            };

            const mockCreatedTask = {
                id: 'task-123',
                ...taskData,
                enabled: true,
                config: {},
                created_by: 'admin'
            };

            automationService.createTask.mockResolvedValue(mockCreatedTask);

            const response = await request(app)
                .post('/api/automation/tasks')
                .send(taskData);

            expect(response.status).toBe(201);
            expect(response.body).toHaveProperty('success', true);
            expect(automationService.createTask).toHaveBeenCalled();
        });
    });

    describe('PUT /api/automation/tasks/:id', () => {
        it('should update task', async () => {
            const mockUpdatedTask = {
                id: 'task-123',
                name: 'Updated Task',
                enabled: false
            };

            automationService.updateTask.mockResolvedValue(mockUpdatedTask);

            const response = await request(app)
                .put('/api/automation/tasks/task-123')
                .send({ name: 'Updated Task' });

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('success', true);
        });

        it('should return 400 if no valid fields to update', async () => {
            const response = await request(app)
                .put('/api/automation/tasks/task-123')
                .send({ invalid_field: 'value' });

            expect(response.status).toBe(400);
        });
    });

    describe('DELETE /api/automation/tasks/:id', () => {
        it('should delete task successfully', async () => {
            automationService.deleteTask.mockResolvedValue({ success: true });

            const response = await request(app)
                .delete('/api/automation/tasks/task-123');

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('success', true);
        });
    });

    describe('POST /api/automation/tasks/:id/execute', () => {
        it('should execute task manually', async () => {
            const mockResult = {
                status: 'success',
                duration_ms: 1234
            };

            automationService.executeTaskManually.mockResolvedValue(mockResult);

            const response = await request(app)
                .post('/api/automation/tasks/task-123/execute');

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('success', true);
        });
    });

    describe('GET /api/automation/history', () => {
        it('should return execution history', async () => {
            const mockHistory = [
                {
                    id: 1,
                    task_id: 'task-123',
                    task_name: 'Daily Backup',
                    status: 'success'
                }
            ];

            automationService.getHistory.mockReturnValue(mockHistory);

            const response = await request(app)
                .get('/api/automation/history');

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('history');
            expect(Array.isArray(response.body.history)).toBe(true);
        });

        it('should filter history by task_type', async () => {
            automationService.getHistory.mockReturnValue([]);

            const response = await request(app)
                .get('/api/automation/history?task_type=backup');

            expect(response.status).toBe(200);
            expect(automationService.getHistory).toHaveBeenCalledWith(
                expect.objectContaining({ task_type: 'backup' })
            );
        });
    });

    describe('GET /api/automation/validate-cron', () => {
        it('should validate cron expression', async () => {
            automationService.validateCronExpression.mockReturnValue(true);

            const response = await request(app)
                .get('/api/automation/validate-cron?expression=0%200%20*%20*%20*');

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('valid', true);
        });

        it('should require expression parameter', async () => {
            const response = await request(app)
                .get('/api/automation/validate-cron');

            expect(response.status).toBe(400);
        });
    });
});
