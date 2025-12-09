/**
 * Webhook Service
 * 
 * Manages outbound webhooks for server events.
 * Supports event filtering, retry logic, and HMAC signatures.
 */

const crypto = require('crypto');
const axios = require('axios');
const https = require('https');
const database = require('./database');
const auditLog = require('./auditLog');
const { eventLogger, EVENT_TYPES } = require('./eventLogger');

/**
 * Webhook event types - maps to server events
 */
const WEBHOOK_EVENT_TYPES = {
    // Server events
    SERVER_START: 'server.start',
    SERVER_STOP: 'server.stop',
    SERVER_RESTART: 'server.restart',
    SERVER_CRASH: 'server.crash',
    
    // Player events
    PLAYER_JOIN: 'player.join',
    PLAYER_LEAVE: 'player.leave',
    PLAYER_CHAT: 'player.chat',
    PLAYER_DEATH: 'player.death',
    PLAYER_ACHIEVEMENT: 'player.achievement',
    
    // Admin events
    PLAYER_KICK: 'player.kick',
    PLAYER_BAN: 'player.ban',
    PLAYER_PARDON: 'player.pardon',
    PLAYER_OP: 'player.op',
    
    // Automation events
    AUTOMATION_EXECUTED: 'automation.executed',
    BACKUP_COMPLETED: 'backup.completed',
    BACKUP_FAILED: 'backup.failed',
    
    // Alert events
    ALERT_CRITICAL: 'alert.critical',
    ALERT_WARNING: 'alert.warning',
    
    // Custom events
    CUSTOM: 'custom'
};

/**
 * Integration templates for popular services
 */
const INTEGRATION_TEMPLATES = {
    discord: {
        name: 'Discord Webhook',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        payloadTransform: (event) => ({
            username: 'Minecraft Server',
            avatar_url: 'https://www.minecraft.net/etc.clientlibs/minecraft/clientlibs/main/resources/img/minecraft-creeper-icon.jpg',
            embeds: [{
                title: event.title || event.event_type,
                description: event.message || event.description,
                color: getDiscordColorForSeverity(event.severity),
                timestamp: event.timestamp || new Date().toISOString(),
                fields: event.fields || []
            }]
        })
    },
    slack: {
        name: 'Slack Webhook',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        payloadTransform: (event) => ({
            text: event.title || event.event_type,
            blocks: [
                {
                    type: 'section',
                    text: {
                        type: 'mrkdwn',
                        text: event.message || event.description
                    }
                }
            ],
            attachments: event.attachments || []
        })
    },
    generic: {
        name: 'Generic Webhook',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        payloadTransform: (event) => event
    }
};

/**
 * Get Discord embed color based on severity
 */
function getDiscordColorForSeverity(severity) {
    const colors = {
        critical: 0xFF0000, // Red
        error: 0xFF6B6B,    // Light red
        warning: 0xFFA500,  // Orange
        info: 0x3498DB,     // Blue
        debug: 0x95A5A6     // Gray
    };
    return colors[severity] || colors.info;
}

class WebhookService {
    constructor() {
        this.initialized = false;
    }

    /**
     * Initialize webhook service
     */
    async initialize() {
        if (this.initialized) {
            console.log('[Webhook] Service already initialized');
            return;
        }

        console.log('[Webhook] Initializing webhook service...');
        this.initialized = true;
        console.log('[Webhook] Service initialized successfully');
    }

    /**
     * Generate unique webhook ID
     */
    generateWebhookId() {
        return `webhook-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    }

    /**
     * Generate webhook secret
     */
    generateSecret() {
        return crypto.randomBytes(32).toString('hex');
    }

    /**
     * Create HMAC signature for webhook payload
     */
    createSignature(payload, secret) {
        const hmac = crypto.createHmac('sha256', secret);
        hmac.update(JSON.stringify(payload));
        return hmac.digest('hex');
    }

    /**
     * Create a new webhook
     */
    async createWebhook(webhookData, createdBy) {
        try {
            const id = this.generateWebhookId();
            
            // Generate secret if not provided
            const secret = webhookData.secret || this.generateSecret();
            
            const webhook = {
                id,
                name: webhookData.name,
                description: webhookData.description,
                url: webhookData.url,
                method: webhookData.method || 'POST',
                headers: webhookData.headers || {},
                event_types: webhookData.event_types || [],
                enabled: webhookData.enabled !== false,
                secret,
                verify_ssl: webhookData.verify_ssl !== false,
                timeout_ms: webhookData.timeout_ms || 30000,
                retry_count: webhookData.retry_count || 3,
                created_by: createdBy
            };

            database.createWebhook(webhook);

            // Audit log
            auditLog.log(
                createdBy,
                'CREATE',
                'WEBHOOK',
                id,
                { name: webhook.name, event_types: webhook.event_types },
                null,
                'Webhook created'
            );

            // Event log
            eventLogger.logEvent({
                eventType: EVENT_TYPES.CONFIG_CHANGE,
                category: 'webhook',
                severity: 'info',
                title: 'Webhook Created',
                message: `Webhook "${webhook.name}" created`,
                actor: createdBy,
                target: id,
                metadata: {
                    webhook_id: id,
                    webhook_name: webhook.name
                }
            });

            return webhook;
        } catch (error) {
            console.error('[Webhook] Error creating webhook:', error);
            throw error;
        }
    }

    /**
     * Get webhook by ID
     */
    getWebhook(id) {
        return database.getWebhook(id);
    }

    /**
     * Get all webhooks
     */
    getAllWebhooks(enabledOnly = false) {
        return database.getAllWebhooks(enabledOnly);
    }

    /**
     * Update webhook
     */
    async updateWebhook(id, updates, updatedBy) {
        try {
            const webhook = this.getWebhook(id);
            
            if (!webhook) {
                throw new Error('Webhook not found');
            }

            const updated = database.updateWebhook(id, updates);

            // Audit log
            auditLog.log(
                updatedBy,
                'UPDATE',
                'WEBHOOK',
                id,
                updates,
                null,
                'Webhook updated'
            );

            return updated;
        } catch (error) {
            console.error('[Webhook] Error updating webhook:', error);
            throw error;
        }
    }

    /**
     * Delete webhook
     */
    async deleteWebhook(id, deletedBy) {
        try {
            const webhook = this.getWebhook(id);
            
            if (!webhook) {
                throw new Error('Webhook not found');
            }

            database.deleteWebhook(id);

            // Audit log
            auditLog.log(
                deletedBy,
                'DELETE',
                'WEBHOOK',
                id,
                { name: webhook.name },
                null,
                'Webhook deleted'
            );

            return true;
        } catch (error) {
            console.error('[Webhook] Error deleting webhook:', error);
            throw error;
        }
    }

    /**
     * Trigger webhook with event data
     */
    async triggerWebhook(webhookId, eventData, manual = false) {
        const webhook = this.getWebhook(webhookId);
        
        if (!webhook) {
            throw new Error('Webhook not found');
        }

        if (!webhook.enabled) {
            throw new Error('Webhook is disabled');
        }

        return await this.executeWebhook(webhook, eventData, manual);
    }

    /**
     * Execute webhook delivery with retry logic
     */
    async executeWebhook(webhook, eventData, manual = false, attemptNumber = 1) {
        const startTime = Date.now();
        
        try {
            // Prepare payload
            const payload = {
                event_type: eventData.event_type,
                timestamp: eventData.timestamp || new Date().toISOString(),
                data: eventData.data || eventData,
                server: {
                    name: process.env.SERVER_NAME || 'Minecraft Server'
                }
            };

            // Prepare headers
            const headers = {
                ...webhook.headers,
                'User-Agent': 'Minecraft-Console-Webhook/1.0',
                'X-Webhook-Event': eventData.event_type
            };

            // Add HMAC signature if secret is configured
            if (webhook.secret) {
                const signature = this.createSignature(payload, webhook.secret);
                headers['X-Webhook-Signature'] = signature;
                headers['X-Webhook-Signature-256'] = `sha256=${signature}`;
            }

            // Configure axios
            const axiosConfig = {
                method: webhook.method,
                url: webhook.url,
                headers,
                data: payload,
                timeout: webhook.timeout_ms,
                validateStatus: (status) => status >= 200 && status < 300
            };

            // Disable SSL verification if configured
            if (!webhook.verify_ssl) {
                axiosConfig.httpsAgent = new https.Agent({
                    rejectUnauthorized: false
                });
            }

            // Execute request
            const response = await axios(axiosConfig);
            const responseTime = Date.now() - startTime;

            // Log successful delivery
            database.createWebhookLog({
                webhook_id: webhook.id,
                webhook_name: webhook.name,
                event_type: eventData.event_type,
                event_data: eventData,
                url: webhook.url,
                request_payload: payload,
                request_headers: headers,
                response_status: response.status,
                response_body: typeof response.data === 'string' 
                    ? response.data.substring(0, 1000) 
                    : JSON.stringify(response.data).substring(0, 1000),
                response_time_ms: responseTime,
                attempt_number: attemptNumber,
                success: true
            });

            // Update webhook stats
            database.updateWebhookStats(webhook.id, true);

            return {
                success: true,
                status: response.status,
                response_time_ms: responseTime
            };

        } catch (error) {
            const responseTime = Date.now() - startTime;
            const errorMessage = error.response 
                ? `HTTP ${error.response.status}: ${error.response.statusText}`
                : error.message;

            // Log failed delivery
            database.createWebhookLog({
                webhook_id: webhook.id,
                webhook_name: webhook.name,
                event_type: eventData.event_type,
                event_data: eventData,
                url: webhook.url,
                request_payload: eventData,
                request_headers: webhook.headers,
                response_status: error.response ? error.response.status : null,
                response_body: error.response && error.response.data 
                    ? JSON.stringify(error.response.data).substring(0, 1000)
                    : null,
                response_time_ms: responseTime,
                attempt_number: attemptNumber,
                success: false,
                error_message: errorMessage
            });

            // Retry logic
            if (attemptNumber < webhook.retry_count) {
                const delay = Math.min(1000 * Math.pow(2, attemptNumber - 1), 30000); // Exponential backoff
                
                // Only log in development or first retry attempt
                if (process.env.NODE_ENV === 'development' || attemptNumber === 1) {
                    console.log(`[Webhook] Retrying webhook ${webhook.id} in ${delay}ms (attempt ${attemptNumber + 1}/${webhook.retry_count})`);
                }
                
                await new Promise(resolve => setTimeout(resolve, delay));
                return await this.executeWebhook(webhook, eventData, manual, attemptNumber + 1);
            }

            // Update webhook stats (failure)
            database.updateWebhookStats(webhook.id, false);

            throw new Error(`Webhook delivery failed: ${errorMessage}`);
        }
    }

    /**
     * Emit event to all matching webhooks
     */
    async emitEvent(eventType, eventData) {
        try {
            const webhooks = database.getAllWebhooks(true); // Only enabled webhooks
            
            const matchingWebhooks = webhooks.filter(webhook => 
                webhook.event_types.includes(eventType) || 
                webhook.event_types.includes('*')
            );

            if (matchingWebhooks.length === 0) {
                return;
            }

            console.log(`[Webhook] Emitting ${eventType} to ${matchingWebhooks.length} webhook(s)`);

            // Execute webhooks in parallel
            const results = await Promise.allSettled(
                matchingWebhooks.map(webhook => 
                    this.executeWebhook(webhook, { event_type: eventType, ...eventData })
                )
            );

            const successful = results.filter(r => r.status === 'fulfilled').length;
            const failed = results.filter(r => r.status === 'rejected').length;

            console.log(`[Webhook] Event ${eventType} delivered: ${successful} succeeded, ${failed} failed`);

        } catch (error) {
            console.error('[Webhook] Error emitting event:', error);
        }
    }

    /**
     * Get webhook delivery logs
     */
    getWebhookLogs(options = {}) {
        return database.getWebhookLogs(options);
    }

    /**
     * Get integration template
     */
    getIntegrationTemplate(type) {
        return INTEGRATION_TEMPLATES[type] || INTEGRATION_TEMPLATES.generic;
    }

    /**
     * Get all integration templates
     */
    getAllIntegrationTemplates() {
        return Object.keys(INTEGRATION_TEMPLATES).map(key => ({
            id: key,
            ...INTEGRATION_TEMPLATES[key]
        }));
    }

    /**
     * Test webhook with sample event
     */
    async testWebhook(webhookId) {
        const testEvent = {
            event_type: 'webhook.test',
            timestamp: new Date().toISOString(),
            data: {
                message: 'This is a test webhook delivery from Minecraft Console',
                test: true
            }
        };

        return await this.triggerWebhook(webhookId, testEvent, true);
    }
}

// Export singleton instance
const webhookService = new WebhookService();

module.exports = webhookService;
module.exports.WEBHOOK_EVENT_TYPES = WEBHOOK_EVENT_TYPES;
module.exports.INTEGRATION_TEMPLATES = INTEGRATION_TEMPLATES;
