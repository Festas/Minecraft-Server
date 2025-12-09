/**
 * Automation Routes Tests
 * 
 * Tests for automation/scheduler API endpoints with RBAC enforcement
 */

const request = require('supertest');
const path = require('path');

// Mock the services before requiring server
jest.mock('../../services/automationService');
jest.mock('../../services/database');
jest.mock('../../services/auditLog');

const automationService = require('../../services/automationService');
const database = require('../../services/database');

describe('Automation Routes', () => {
    let app;
    let agent;
    let csrfToken;

    beforeAll(async () => {
        // Import app after mocks are set up
        const server = require('../../server');
        app = server.app;
    });

    beforeEach(async () => {
        // Create a new agent for each test to maintain session
        agent = request.agent(app);

        // Get CSRF token
        const tokenResponse = await agent.get('/api/csrf-token');
        csrfToken = tokenResponse.body.csrfToken;

        // Clear all mocks
        jest.clearAllMocks();
    });

    describe('Authentication', () => {
        it('should require authentication for GET /api/automation/tasks', async () => {
            const response = await request(app)
                .get('/api/automation/tasks');

            expect(response.status).toBe(401);
        });

        it('should require authentication for POST /api/automation/tasks', async () => {
            const response = await request(app)
                .post('/api/automation/tasks')
                .set('X-CSRF-Token', csrfToken)
                .send({
                    name: 'Test Task',
                    task_type: 'backup',
                    cron_expression: '0 0 * * *'
                });

            expect(response.status).toBe(401);
        });
    });

    describe('GET /api/automation/tasks', () => {
        beforeEach(() => {
            // Mock authentication as admin
            agent.get = jest.fn((url) => {
                const req = request(app).get(url);
                req.set('Cookie', 'connect.sid=test-session');
                return req;
            });
        });

        it('should return list of tasks for authenticated user with view permission', async () => {
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

            const response = await agent
                .get('/api/automation/tasks');

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('tasks');
            expect(Array.isArray(response.body.tasks)).toBe(true);
        });
    });

    describe('POST /api/automation/tasks', () => {
        it('should validate required fields', async () => {
            const response = await agent
                .post('/api/automation/tasks')
                .set('X-CSRF-Token', csrfToken)
                .send({
                    // Missing required fields
                    description: 'Test description'
                });

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('error');
        });

        it('should create task with valid data', async () => {
            const taskData = {
                name: 'Test Backup',
                description: 'Test backup task',
                task_type: 'backup',
                cron_expression: '0 */6 * * *',
                config: {},
                enabled: true
            };

            const mockCreatedTask = {
                id: 'task-123',
                ...taskData,
                created_by: 'admin',
                created_at: new Date().toISOString(),
                run_count: 0
            };

            automationService.createTask.mockResolvedValue(mockCreatedTask);

            const response = await agent
                .post('/api/automation/tasks')
                .set('X-CSRF-Token', csrfToken)
                .send(taskData);

            expect(response.status).toBe(201);
            expect(response.body).toHaveProperty('success', true);
            expect(response.body).toHaveProperty('task');
            expect(automationService.createTask).toHaveBeenCalled();
        });

        it('should validate cron expression format', async () => {
            automationService.createTask.mockRejectedValue(
                new Error('Invalid cron expression')
            );

            const response = await agent
                .post('/api/automation/tasks')
                .set('X-CSRF-Token', csrfToken)
                .send({
                    name: 'Test Task',
                    task_type: 'backup',
                    cron_expression: 'invalid-cron'
                });

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('error');
        });
    });

    describe('PUT /api/automation/tasks/:id', () => {
        it('should update task with valid data', async () => {
            const updates = {
                name: 'Updated Task Name',
                enabled: false
            };

            const mockUpdatedTask = {
                id: 'task-123',
                name: 'Updated Task Name',
                task_type: 'backup',
                cron_expression: '0 0 * * *',
                enabled: false,
                created_by: 'admin'
            };

            automationService.updateTask.mockResolvedValue(mockUpdatedTask);

            const response = await agent
                .put('/api/automation/tasks/task-123')
                .set('X-CSRF-Token', csrfToken)
                .send(updates);

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('success', true);
            expect(response.body.task.name).toBe('Updated Task Name');
            expect(automationService.updateTask).toHaveBeenCalledWith(
                'task-123',
                updates,
                expect.any(String)
            );
        });

        it('should return 400 if no valid fields to update', async () => {
            const response = await agent
                .put('/api/automation/tasks/task-123')
                .set('X-CSRF-Token', csrfToken)
                .send({
                    invalid_field: 'value'
                });

            expect(response.status).toBe(400);
            expect(response.body.error).toMatch(/No valid fields to update/);
        });

        it('should handle task not found', async () => {
            automationService.updateTask.mockRejectedValue(
                new Error('Task not found')
            );

            const response = await agent
                .put('/api/automation/tasks/nonexistent')
                .set('X-CSRF-Token', csrfToken)
                .send({ name: 'New Name' });

            expect(response.status).toBe(400);
            expect(response.body.error).toMatch(/Task not found/);
        });
    });

    describe('DELETE /api/automation/tasks/:id', () => {
        it('should delete task successfully', async () => {
            automationService.deleteTask.mockResolvedValue({ success: true });

            const response = await agent
                .delete('/api/automation/tasks/task-123')
                .set('X-CSRF-Token', csrfToken);

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('success', true);
            expect(automationService.deleteTask).toHaveBeenCalledWith(
                'task-123',
                expect.any(String)
            );
        });

        it('should handle task not found on delete', async () => {
            automationService.deleteTask.mockRejectedValue(
                new Error('Task not found')
            );

            const response = await agent
                .delete('/api/automation/tasks/nonexistent')
                .set('X-CSRF-Token', csrfToken);

            expect(response.status).toBe(400);
        });
    });

    describe('POST /api/automation/tasks/:id/execute', () => {
        it('should execute task manually', async () => {
            const mockResult = {
                status: 'success',
                duration_ms: 1234,
                result_details: {
                    message: 'Backup completed successfully'
                }
            };

            automationService.executeTaskManually.mockResolvedValue(mockResult);

            const response = await agent
                .post('/api/automation/tasks/task-123/execute')
                .set('X-CSRF-Token', csrfToken);

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('success', true);
            expect(response.body.result.status).toBe('success');
            expect(automationService.executeTaskManually).toHaveBeenCalledWith(
                'task-123',
                expect.any(String)
            );
        });

        it('should handle execution errors', async () => {
            automationService.executeTaskManually.mockRejectedValue(
                new Error('Execution failed')
            );

            const response = await agent
                .post('/api/automation/tasks/task-123/execute')
                .set('X-CSRF-Token', csrfToken);

            expect(response.status).toBe(400);
            expect(response.body.error).toMatch(/Execution failed/);
        });
    });

    describe('GET /api/automation/history', () => {
        it('should return execution history', async () => {
            const mockHistory = [
                {
                    id: 1,
                    task_id: 'task-123',
                    task_name: 'Daily Backup',
                    task_type: 'backup',
                    execution_type: 'scheduled',
                    executed_by: 'system',
                    executed_at: new Date().toISOString(),
                    status: 'success',
                    duration_ms: 1234
                }
            ];

            automationService.getHistory.mockReturnValue(mockHistory);

            const response = await agent
                .get('/api/automation/history');

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('history');
            expect(Array.isArray(response.body.history)).toBe(true);
        });

        it('should filter history by task_type', async () => {
            automationService.getHistory.mockReturnValue([]);

            const response = await agent
                .get('/api/automation/history?task_type=backup');

            expect(response.status).toBe(200);
            expect(automationService.getHistory).toHaveBeenCalledWith(
                expect.objectContaining({ task_type: 'backup' })
            );
        });

        it('should filter history by status', async () => {
            automationService.getHistory.mockReturnValue([]);

            const response = await agent
                .get('/api/automation/history?status=failed');

            expect(response.status).toBe(200);
            expect(automationService.getHistory).toHaveBeenCalledWith(
                expect.objectContaining({ status: 'failed' })
            );
        });

        it('should limit history results', async () => {
            automationService.getHistory.mockReturnValue([]);

            const response = await agent
                .get('/api/automation/history?limit=10');

            expect(response.status).toBe(200);
            expect(automationService.getHistory).toHaveBeenCalledWith(
                expect.objectContaining({ limit: 10 })
            );
        });
    });

    describe('GET /api/automation/validate-cron', () => {
        it('should validate cron expression', async () => {
            automationService.validateCronExpression.mockReturnValue(true);

            const response = await agent
                .get('/api/automation/validate-cron?expression=0%200%20*%20*%20*');

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('valid', true);
        });

        it('should return invalid for bad cron expression', async () => {
            automationService.validateCronExpression.mockReturnValue(false);

            const response = await agent
                .get('/api/automation/validate-cron?expression=invalid');

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('valid', false);
        });

        it('should require expression parameter', async () => {
            const response = await agent
                .get('/api/automation/validate-cron');

            expect(response.status).toBe(400);
            expect(response.body.error).toMatch(/Missing expression parameter/);
        });
    });

    describe('Rate Limiting', () => {
        it('should enforce rate limits on automation endpoints', async () => {
            automationService.getAllTasks.mockReturnValue([]);

            // Make multiple requests quickly
            const requests = [];
            for (let i = 0; i < 35; i++) {
                requests.push(agent.get('/api/automation/tasks'));
            }

            const responses = await Promise.all(requests);
            
            // Some requests should be rate limited (429)
            const rateLimited = responses.filter(r => r.status === 429);
            expect(rateLimited.length).toBeGreaterThan(0);
        });
    });

    describe('Task Type Validation', () => {
        it('should accept valid task types', async () => {
            const validTypes = ['backup', 'restart', 'broadcast', 'command'];

            for (const type of validTypes) {
                automationService.createTask.mockResolvedValue({
                    id: 'task-test',
                    name: 'Test',
                    task_type: type,
                    cron_expression: '0 0 * * *',
                    enabled: true,
                    created_by: 'admin'
                });

                const response = await agent
                    .post('/api/automation/tasks')
                    .set('X-CSRF-Token', csrfToken)
                    .send({
                        name: `Test ${type}`,
                        task_type: type,
                        cron_expression: '0 0 * * *'
                    });

                expect(response.status).toBe(201);
            }
        });
    });

    describe('Config Validation', () => {
        it('should accept valid config for broadcast tasks', async () => {
            automationService.createTask.mockResolvedValue({
                id: 'task-test',
                name: 'Test Broadcast',
                task_type: 'broadcast',
                cron_expression: '0 * * * *',
                config: { message: 'Test message' },
                enabled: true,
                created_by: 'admin'
            });

            const response = await agent
                .post('/api/automation/tasks')
                .set('X-CSRF-Token', csrfToken)
                .send({
                    name: 'Test Broadcast',
                    task_type: 'broadcast',
                    cron_expression: '0 * * * *',
                    config: { message: 'Test message' }
                });

            expect(response.status).toBe(201);
        });

        it('should accept valid config for restart tasks', async () => {
            automationService.createTask.mockResolvedValue({
                id: 'task-test',
                name: 'Test Restart',
                task_type: 'restart',
                cron_expression: '0 3 * * *',
                config: { warning_message: 'Restarting', warning_delay: 30 },
                enabled: true,
                created_by: 'admin'
            });

            const response = await agent
                .post('/api/automation/tasks')
                .set('X-CSRF-Token', csrfToken)
                .send({
                    name: 'Test Restart',
                    task_type: 'restart',
                    cron_expression: '0 3 * * *',
                    config: { warning_message: 'Restarting', warning_delay: 30 }
                });

            expect(response.status).toBe(201);
        });

        it('should accept valid config for command tasks', async () => {
            automationService.createTask.mockResolvedValue({
                id: 'task-test',
                name: 'Test Command',
                task_type: 'command',
                cron_expression: '*/30 * * * *',
                config: { command: 'weather clear' },
                enabled: true,
                created_by: 'admin'
            });

            const response = await agent
                .post('/api/automation/tasks')
                .set('X-CSRF-Token', csrfToken)
                .send({
                    name: 'Test Command',
                    task_type: 'command',
                    cron_expression: '*/30 * * * *',
                    config: { command: 'weather clear' }
                });

            expect(response.status).toBe(201);
        });
    });
});
