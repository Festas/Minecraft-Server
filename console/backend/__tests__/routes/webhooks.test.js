/**
 * Webhook Routes Tests
 * 
 * Tests for webhook API endpoints
 */

const request = require('supertest');
const express = require('express');

// Mock the services before requiring routes
jest.mock('../../services/webhookService');
jest.mock('../../services/inboundWebhookService');
const webhookService = require('../../services/webhookService');
const inboundWebhookService = require('../../services/inboundWebhookService');

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
const webhookRoutes = require('../../routes/webhooks');

// Create a test app
const app = express();
app.use(express.json());
app.use('/api/webhooks', webhookRoutes);

describe('Webhook Routes', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('GET /api/webhooks', () => {
        it('should return list of webhooks', async () => {
            const mockWebhooks = [
                {
                    id: 'webhook-1',
                    name: 'Discord Webhook',
                    url: 'https://discord.com/api/webhooks/123',
                    method: 'POST',
                    event_types: ['player.join', 'player.leave'],
                    enabled: true,
                    secret: 'secret123',
                    created_by: 'admin'
                }
            ];

            webhookService.getAllWebhooks.mockReturnValue(mockWebhooks);

            const response = await request(app)
                .get('/api/webhooks');

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('webhooks');
            expect(Array.isArray(response.body.webhooks)).toBe(true);
            // Secret should be redacted
            expect(response.body.webhooks[0].secret).toBe('***REDACTED***');
        });
    });

    describe('POST /api/webhooks', () => {
        it('should validate required fields', async () => {
            const response = await request(app)
                .post('/api/webhooks')
                .send({ description: 'Test webhook' });

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('errors');
        });

        it('should create webhook with valid data', async () => {
            const webhookData = {
                name: 'Test Webhook',
                url: 'https://example.com/webhook',
                event_types: ['player.join'],
                method: 'POST'
            };

            const mockCreatedWebhook = {
                id: 'webhook-123',
                ...webhookData,
                enabled: true,
                secret: 'generated-secret',
                created_by: 'testuser'
            };

            webhookService.createWebhook.mockResolvedValue(mockCreatedWebhook);

            const response = await request(app)
                .post('/api/webhooks')
                .send(webhookData);

            expect(response.status).toBe(201);
            expect(response.body.success).toBe(true);
            expect(response.body.webhook).toHaveProperty('id');
            expect(response.body.webhook.secret).toBe('***REDACTED***');
        });

        it('should validate URL format', async () => {
            const response = await request(app)
                .post('/api/webhooks')
                .send({
                    name: 'Test',
                    url: 'not-a-valid-url',
                    event_types: ['player.join']
                });

            expect(response.status).toBe(400);
        });

        it('should validate event types are array', async () => {
            const response = await request(app)
                .post('/api/webhooks')
                .send({
                    name: 'Test',
                    url: 'https://example.com/webhook',
                    event_types: 'not-an-array'
                });

            expect(response.status).toBe(400);
        });
    });

    describe('PUT /api/webhooks/:id', () => {
        it('should update webhook', async () => {
            const webhookId = 'webhook-123';
            const updates = {
                name: 'Updated Webhook',
                enabled: false
            };

            const mockUpdatedWebhook = {
                id: webhookId,
                name: 'Updated Webhook',
                url: 'https://example.com/webhook',
                enabled: false,
                event_types: ['player.join']
            };

            webhookService.updateWebhook.mockResolvedValue(mockUpdatedWebhook);

            const response = await request(app)
                .put(`/api/webhooks/${webhookId}`)
                .send(updates);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.webhook.name).toBe('Updated Webhook');
        });

        it('should handle webhook not found', async () => {
            webhookService.updateWebhook.mockRejectedValue(new Error('Webhook not found'));

            const response = await request(app)
                .put('/api/webhooks/invalid-id')
                .send({ name: 'Test' });

            expect(response.status).toBe(400);
        });
    });

    describe('DELETE /api/webhooks/:id', () => {
        it('should delete webhook', async () => {
            const webhookId = 'webhook-123';
            webhookService.deleteWebhook.mockResolvedValue(true);

            const response = await request(app)
                .delete(`/api/webhooks/${webhookId}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
        });
    });

    describe('POST /api/webhooks/:id/test', () => {
        it('should test webhook', async () => {
            const webhookId = 'webhook-123';
            const mockResult = {
                success: true,
                status: 200,
                response_time_ms: 150
            };

            webhookService.testWebhook.mockResolvedValue(mockResult);

            const response = await request(app)
                .post(`/api/webhooks/${webhookId}/test`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.result).toHaveProperty('status');
        });

        it('should handle test failure', async () => {
            const webhookId = 'webhook-123';
            webhookService.testWebhook.mockRejectedValue(new Error('Webhook delivery failed'));

            const response = await request(app)
                .post(`/api/webhooks/${webhookId}/test`);

            expect(response.status).toBe(400);
        });
    });

    describe('POST /api/webhooks/:id/trigger', () => {
        it('should validate event_type is required', async () => {
            const response = await request(app)
                .post('/api/webhooks/webhook-123/trigger')
                .send({ data: {} });

            expect(response.status).toBe(400);
        });

        it('should trigger webhook with custom event', async () => {
            const webhookId = 'webhook-123';
            const eventData = {
                event_type: 'custom.event',
                data: { message: 'Test' }
            };

            const mockResult = {
                success: true,
                status: 200
            };

            webhookService.triggerWebhook.mockResolvedValue(mockResult);

            const response = await request(app)
                .post(`/api/webhooks/${webhookId}/trigger`)
                .send(eventData);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
        });
    });

    describe('GET /api/webhooks/:id/logs', () => {
        it('should return webhook logs', async () => {
            const webhookId = 'webhook-123';
            const mockLogs = [
                {
                    id: 1,
                    webhook_id: webhookId,
                    event_type: 'player.join',
                    success: true,
                    response_status: 200
                }
            ];

            webhookService.getWebhookLogs.mockReturnValue(mockLogs);

            const response = await request(app)
                .get(`/api/webhooks/${webhookId}/logs`);

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('logs');
            expect(Array.isArray(response.body.logs)).toBe(true);
        });

        it('should respect limit parameter', async () => {
            const webhookId = 'webhook-123';
            webhookService.getWebhookLogs.mockReturnValue([]);

            await request(app)
                .get(`/api/webhooks/${webhookId}/logs?limit=50`);

            expect(webhookService.getWebhookLogs).toHaveBeenCalledWith({
                webhook_id: webhookId,
                limit: 50
            });
        });
    });

    describe('Inbound Webhooks', () => {
        describe('GET /api/webhooks/inbound/all', () => {
            it('should return list of inbound webhooks', async () => {
                const mockWebhooks = [
                    {
                        id: 'inbound-1',
                        name: 'Bot Webhook',
                        actions: [{ type: 'server.restart' }],
                        enabled: true,
                        secret: 'secret123'
                    }
                ];

                inboundWebhookService.getAllInboundWebhooks.mockReturnValue(mockWebhooks);

                const response = await request(app)
                    .get('/api/webhooks/inbound/all');

                expect(response.status).toBe(200);
                expect(response.body).toHaveProperty('webhooks');
                expect(response.body.webhooks[0].secret).toBe('***REDACTED***');
            });
        });

        describe('POST /api/webhooks/inbound', () => {
            it('should create inbound webhook', async () => {
                const webhookData = {
                    name: 'Test Inbound',
                    actions: [{ type: 'server.start' }],
                    permissions_required: ['SERVER_START']
                };

                const mockCreatedWebhook = {
                    id: 'inbound-123',
                    ...webhookData,
                    enabled: true,
                    secret: 'generated-secret'
                };

                inboundWebhookService.createInboundWebhook.mockResolvedValue(mockCreatedWebhook);

                const response = await request(app)
                    .post('/api/webhooks/inbound')
                    .send(webhookData);

                expect(response.status).toBe(201);
                expect(response.body.success).toBe(true);
            });

            it('should validate required fields', async () => {
                const response = await request(app)
                    .post('/api/webhooks/inbound')
                    .send({ name: 'Test' });

                expect(response.status).toBe(400);
            });
        });

        describe('POST /api/webhooks/inbound/:id/regenerate-secret', () => {
            it('should regenerate secret', async () => {
                const webhookId = 'inbound-123';
                const mockWebhook = {
                    id: webhookId,
                    name: 'Test',
                    secret: 'new-secret'
                };

                inboundWebhookService.regenerateSecret.mockResolvedValue(mockWebhook);

                const response = await request(app)
                    .post(`/api/webhooks/inbound/${webhookId}/regenerate-secret`);

                expect(response.status).toBe(200);
                expect(response.body.success).toBe(true);
                expect(response.body.webhook.secret).toBe('***REDACTED***');
            });
        });

        describe('POST /api/webhooks/receive/:id', () => {
            it('should process webhook', async () => {
                const webhookId = 'inbound-123';
                const payload = { action: 'server.restart' };
                const mockResult = {
                    success: true,
                    webhook_id: webhookId,
                    results: []
                };

                inboundWebhookService.processWebhook.mockResolvedValue(mockResult);

                const response = await request(app)
                    .post(`/api/webhooks/receive/${webhookId}`)
                    .send(payload);

                expect(response.status).toBe(200);
                expect(response.body.success).toBe(true);
            });

            it('should handle invalid webhook', async () => {
                inboundWebhookService.processWebhook.mockRejectedValue(
                    new Error('Webhook not found')
                );

                const response = await request(app)
                    .post('/api/webhooks/receive/invalid-id')
                    .send({ action: 'test' });

                expect(response.status).toBe(400);
            });
        });
    });

    describe('GET /api/webhooks/templates/all', () => {
        it('should return integration templates', async () => {
            const mockTemplates = [
                { id: 'discord', name: 'Discord Webhook' },
                { id: 'slack', name: 'Slack Webhook' },
                { id: 'generic', name: 'Generic Webhook' }
            ];

            webhookService.getAllIntegrationTemplates.mockReturnValue(mockTemplates);

            const response = await request(app)
                .get('/api/webhooks/templates/all');

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('templates');
            expect(response.body.templates.length).toBeGreaterThan(0);
        });
    });
});
