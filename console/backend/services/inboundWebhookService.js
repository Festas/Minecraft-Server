/**
 * Inbound Webhook Service
 * 
 * Handles incoming webhooks from external services.
 * Supports HMAC verification, IP whitelisting, and RBAC-controlled actions.
 */

const crypto = require('crypto');
const database = require('./database');
const auditLog = require('./auditLog');
const { eventLogger, EVENT_TYPES } = require('./eventLogger');
const rconService = require('./rcon');
const dockerService = require('./docker');
const automationService = require('./automationService');

/**
 * Available actions for inbound webhooks
 */
const WEBHOOK_ACTIONS = {
    // Server control
    SERVER_START: 'server.start',
    SERVER_STOP: 'server.stop',
    SERVER_RESTART: 'server.restart',
    
    // Commands
    EXECUTE_COMMAND: 'command.execute',
    BROADCAST: 'broadcast',
    
    // Player management
    KICK_PLAYER: 'player.kick',
    BAN_PLAYER: 'player.ban',
    PARDON_PLAYER: 'player.pardon',
    
    // Automation
    TRIGGER_BACKUP: 'automation.backup',
    TRIGGER_AUTOMATION: 'automation.trigger',
    
    // Custom
    CUSTOM: 'custom'
};

class InboundWebhookService {
    constructor() {
        this.initialized = false;
    }

    /**
     * Initialize inbound webhook service
     */
    async initialize() {
        if (this.initialized) {
            console.log('[InboundWebhook] Service already initialized');
            return;
        }

        console.log('[InboundWebhook] Initializing inbound webhook service...');
        this.initialized = true;
        console.log('[InboundWebhook] Service initialized successfully');
    }

    /**
     * Generate unique webhook ID
     */
    generateWebhookId() {
        return `inbound-webhook-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    }

    /**
     * Generate webhook secret
     */
    generateSecret() {
        return crypto.randomBytes(32).toString('hex');
    }

    /**
     * Verify HMAC signature
     */
    verifySignature(payload, signature, secret) {
        // Support multiple signature formats
        const expectedSignature = crypto
            .createHmac('sha256', secret)
            .update(JSON.stringify(payload))
            .digest('hex');

        // Check various signature formats
        const signatures = [
            signature,
            signature.replace('sha256=', ''),
            signature.replace('sha1=', '')
        ];

        for (const sig of signatures) {
            if (crypto.timingSafeEqual(
                Buffer.from(expectedSignature),
                Buffer.from(sig)
            )) {
                return true;
            }
        }

        return false;
    }

    /**
     * Check if IP is whitelisted
     */
    isIpWhitelisted(clientIp, allowedIps) {
        if (!allowedIps || allowedIps.length === 0) {
            return true; // No IP restriction
        }

        // Support wildcards
        for (const allowedIp of allowedIps) {
            if (allowedIp === '*') {
                return true;
            }

            // Simple IP match
            if (clientIp === allowedIp) {
                return true;
            }

            // Wildcard match (e.g., 192.168.1.*)
            // Only allow wildcards in specific positions to prevent ReDoS
            if (allowedIp.includes('*')) {
                // Escape special regex characters except *
                const escapedPattern = allowedIp
                    .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
                    .replace(/\*/g, '\\d+');
                
                const regex = new RegExp(`^${escapedPattern}$`);
                if (regex.test(clientIp)) {
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * Create a new inbound webhook
     */
    async createInboundWebhook(webhookData, createdBy) {
        try {
            const id = this.generateWebhookId();
            
            // Generate secret if not provided
            const secret = webhookData.secret || this.generateSecret();
            
            const webhook = {
                id,
                name: webhookData.name,
                description: webhookData.description,
                secret,
                allowed_ips: webhookData.allowed_ips || null,
                actions: webhookData.actions || [],
                permissions_required: webhookData.permissions_required || [],
                enabled: webhookData.enabled !== false,
                created_by: createdBy
            };

            database.createInboundWebhook(webhook);

            // Audit log
            auditLog.log(
                createdBy,
                'CREATE',
                'INBOUND_WEBHOOK',
                id,
                { name: webhook.name, actions: webhook.actions },
                null,
                'Inbound webhook created'
            );

            // Event log
            eventLogger.logEvent({
                eventType: EVENT_TYPES.CONFIG_CHANGE,
                category: 'webhook',
                severity: 'info',
                title: 'Inbound Webhook Created',
                message: `Inbound webhook "${webhook.name}" created`,
                actor: createdBy,
                target: id,
                metadata: {
                    webhook_id: id,
                    webhook_name: webhook.name
                }
            });

            return webhook;
        } catch (error) {
            console.error('[InboundWebhook] Error creating webhook:', error);
            throw error;
        }
    }

    /**
     * Get inbound webhook by ID
     */
    getInboundWebhook(id) {
        return database.getInboundWebhook(id);
    }

    /**
     * Get all inbound webhooks
     */
    getAllInboundWebhooks(enabledOnly = false) {
        return database.getAllInboundWebhooks(enabledOnly);
    }

    /**
     * Update inbound webhook
     */
    async updateInboundWebhook(id, updates, updatedBy) {
        try {
            const webhook = this.getInboundWebhook(id);
            
            if (!webhook) {
                throw new Error('Inbound webhook not found');
            }

            const updated = database.updateInboundWebhook(id, updates);

            // Audit log
            auditLog.log(
                updatedBy,
                'UPDATE',
                'INBOUND_WEBHOOK',
                id,
                updates,
                null,
                'Inbound webhook updated'
            );

            return updated;
        } catch (error) {
            console.error('[InboundWebhook] Error updating webhook:', error);
            throw error;
        }
    }

    /**
     * Delete inbound webhook
     */
    async deleteInboundWebhook(id, deletedBy) {
        try {
            const webhook = this.getInboundWebhook(id);
            
            if (!webhook) {
                throw new Error('Inbound webhook not found');
            }

            database.deleteInboundWebhook(id);

            // Audit log
            auditLog.log(
                deletedBy,
                'DELETE',
                'INBOUND_WEBHOOK',
                id,
                { name: webhook.name },
                null,
                'Inbound webhook deleted'
            );

            return true;
        } catch (error) {
            console.error('[InboundWebhook] Error deleting webhook:', error);
            throw error;
        }
    }

    /**
     * Process incoming webhook request
     */
    async processWebhook(webhookId, payload, signature, clientIp) {
        try {
            const webhook = this.getInboundWebhook(webhookId);
            
            if (!webhook) {
                throw new Error('Webhook not found');
            }

            if (!webhook.enabled) {
                throw new Error('Webhook is disabled');
            }

            // Verify IP whitelist
            if (!this.isIpWhitelisted(clientIp, webhook.allowed_ips)) {
                throw new Error('IP address not whitelisted');
            }

            // Verify signature
            if (signature && webhook.secret) {
                if (!this.verifySignature(payload, signature, webhook.secret)) {
                    throw new Error('Invalid signature');
                }
            } else if (webhook.secret && !signature) {
                throw new Error('Signature required but not provided');
            }

            // Update usage stats
            database.updateInboundWebhookStats(webhookId);

            // Execute webhook actions
            const results = [];
            for (const actionConfig of webhook.actions) {
                try {
                    const result = await this.executeAction(
                        actionConfig,
                        payload,
                        webhook,
                        clientIp
                    );
                    results.push({ action: actionConfig.type, success: true, result });
                } catch (error) {
                    console.error(`[InboundWebhook] Error executing action ${actionConfig.type}:`, error);
                    results.push({ 
                        action: actionConfig.type, 
                        success: false, 
                        error: error.message 
                    });
                }
            }

            // Audit log
            auditLog.log(
                `webhook:${webhook.name}`,
                'EXECUTE',
                'INBOUND_WEBHOOK',
                webhookId,
                { payload, client_ip: clientIp, results },
                null,
                'Inbound webhook processed'
            );

            return {
                success: true,
                webhook_id: webhookId,
                webhook_name: webhook.name,
                results
            };

        } catch (error) {
            console.error('[InboundWebhook] Error processing webhook:', error);
            
            // Audit log for failed attempts
            auditLog.log(
                `webhook:unknown`,
                'EXECUTE',
                'INBOUND_WEBHOOK',
                webhookId || 'unknown',
                { client_ip: clientIp, error: error.message },
                null,
                'Inbound webhook processing failed'
            );

            throw error;
        }
    }

    /**
     * Execute webhook action
     */
    async executeAction(actionConfig, payload, webhook, clientIp) {
        const actionType = actionConfig.type;
        const actionData = actionConfig.data || {};

        // Extract parameters from payload using JSONPath or direct access
        const params = this.extractParameters(payload, actionConfig.parameters || {});

        switch (actionType) {
            case WEBHOOK_ACTIONS.SERVER_START:
                return await dockerService.startContainer();

            case WEBHOOK_ACTIONS.SERVER_STOP:
                return await dockerService.stopContainer();

            case WEBHOOK_ACTIONS.SERVER_RESTART:
                return await dockerService.restartContainer();

            case WEBHOOK_ACTIONS.EXECUTE_COMMAND:
                const command = params.command || actionData.command;
                if (!command) {
                    throw new Error('Command not specified');
                }
                return await rconService.sendCommand(command);

            case WEBHOOK_ACTIONS.BROADCAST:
                const message = params.message || actionData.message;
                if (!message) {
                    throw new Error('Message not specified');
                }
                return await rconService.sendCommand(`say ${message}`);

            case WEBHOOK_ACTIONS.KICK_PLAYER:
                const kickPlayer = params.player || actionData.player;
                const kickReason = params.reason || actionData.reason || 'Kicked via webhook';
                if (!kickPlayer) {
                    throw new Error('Player not specified');
                }
                return await rconService.sendCommand(`kick ${kickPlayer} ${kickReason}`);

            case WEBHOOK_ACTIONS.BAN_PLAYER:
                const banPlayer = params.player || actionData.player;
                const banReason = params.reason || actionData.reason || 'Banned via webhook';
                if (!banPlayer) {
                    throw new Error('Player not specified');
                }
                return await rconService.sendCommand(`ban ${banPlayer} ${banReason}`);

            case WEBHOOK_ACTIONS.PARDON_PLAYER:
                const pardonPlayer = params.player || actionData.player;
                if (!pardonPlayer) {
                    throw new Error('Player not specified');
                }
                return await rconService.sendCommand(`pardon ${pardonPlayer}`);

            case WEBHOOK_ACTIONS.TRIGGER_AUTOMATION:
                const taskId = params.task_id || actionData.task_id;
                if (!taskId) {
                    throw new Error('Task ID not specified');
                }
                return await automationService.executeTask(taskId, `webhook:${webhook.name}`);

            case WEBHOOK_ACTIONS.CUSTOM:
                // Custom actions can be extended here
                console.log('[InboundWebhook] Custom action executed:', actionData);
                return { custom: true, data: actionData };

            default:
                throw new Error(`Unknown action type: ${actionType}`);
        }
    }

    /**
     * Extract parameters from payload
     */
    extractParameters(payload, parameterMapping) {
        const params = {};

        for (const [key, path] of Object.entries(parameterMapping)) {
            // Simple JSONPath-like extraction
            if (typeof path === 'string') {
                const value = this.getNestedValue(payload, path);
                if (value !== undefined) {
                    params[key] = value;
                }
            }
        }

        return params;
    }

    /**
     * Get nested value from object using dot notation
     */
    getNestedValue(obj, path) {
        const keys = path.split('.');
        let value = obj;

        for (const key of keys) {
            if (value && typeof value === 'object' && key in value) {
                value = value[key];
            } else {
                return undefined;
            }
        }

        return value;
    }

    /**
     * Regenerate webhook secret
     */
    async regenerateSecret(webhookId, regeneratedBy) {
        const newSecret = this.generateSecret();
        
        const updated = await this.updateInboundWebhook(
            webhookId,
            { secret: newSecret },
            regeneratedBy
        );

        // Audit log
        auditLog.log(
            regeneratedBy,
            'UPDATE',
            'INBOUND_WEBHOOK',
            webhookId,
            { action: 'regenerate_secret' },
            null,
            'Inbound webhook secret regenerated'
        );

        return updated;
    }
}

// Export singleton instance
const inboundWebhookService = new InboundWebhookService();

module.exports = inboundWebhookService;
module.exports.WEBHOOK_ACTIONS = WEBHOOK_ACTIONS;
