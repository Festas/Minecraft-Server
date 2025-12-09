/**
 * Webhooks Frontend Module
 * 
 * Manages webhooks and integrations UI
 */

(function() {
    'use strict';

    // State
    let webhooks = [];
    let inboundWebhooks = [];
    let deliveryLogs = [];
    let currentTab = 'outbound';

    // Event types for outbound webhooks
    const EVENT_TYPES = [
        { id: 'server.start', label: 'Server Start' },
        { id: 'server.stop', label: 'Server Stop' },
        { id: 'server.restart', label: 'Server Restart' },
        { id: 'server.crash', label: 'Server Crash' },
        { id: 'player.join', label: 'Player Join' },
        { id: 'player.leave', label: 'Player Leave' },
        { id: 'player.chat', label: 'Player Chat' },
        { id: 'player.death', label: 'Player Death' },
        { id: 'player.kick', label: 'Player Kick' },
        { id: 'player.ban', label: 'Player Ban' },
        { id: 'automation.executed', label: 'Automation Executed' },
        { id: 'backup.completed', label: 'Backup Completed' },
        { id: 'backup.failed', label: 'Backup Failed' },
        { id: 'alert.critical', label: 'Critical Alert' },
        { id: 'alert.warning', label: 'Warning Alert' },
        { id: '*', label: 'All Events' }
    ];

    // Action types for inbound webhooks
    const ACTION_TYPES = [
        { id: 'server.start', label: 'Start Server' },
        { id: 'server.stop', label: 'Stop Server' },
        { id: 'server.restart', label: 'Restart Server' },
        { id: 'command.execute', label: 'Execute Command' },
        { id: 'broadcast', label: 'Broadcast Message' },
        { id: 'player.kick', label: 'Kick Player' },
        { id: 'player.ban', label: 'Ban Player' },
        { id: 'automation.trigger', label: 'Trigger Automation' }
    ];

    /**
     * Initialize the webhooks page
     */
    function init() {
        console.log('[Webhooks] Initializing...');

        // Set up tab switching
        setupTabs();

        // Set up event listeners
        setupEventListeners();

        // Populate event types and actions
        populateEventTypes();
        populateActionTypes();

        // Load initial data
        loadWebhooks();
        loadInboundWebhooks();
        loadDeliveryLogs();

        console.log('[Webhooks] Initialized');
    }

    /**
     * Set up tab switching
     */
    function setupTabs() {
        const tabs = document.querySelectorAll('.tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const tabId = tab.dataset.tab;
                switchTab(tabId);
            });
        });
    }

    /**
     * Switch to a different tab
     */
    function switchTab(tabId) {
        currentTab = tabId;

        // Update tab buttons
        document.querySelectorAll('.tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabId);
        });

        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.toggle('active', content.id === `tab-${tabId}`);
        });

        // Load data for the active tab
        if (tabId === 'outbound') {
            loadWebhooks();
        } else if (tabId === 'inbound') {
            loadInboundWebhooks();
        } else if (tabId === 'logs') {
            loadDeliveryLogs();
        }
    }

    /**
     * Set up event listeners
     */
    function setupEventListeners() {
        // Create webhook button
        document.getElementById('create-webhook-btn')?.addEventListener('click', () => {
            openWebhookModal();
        });

        // Create inbound webhook button
        document.getElementById('create-inbound-webhook-btn')?.addEventListener('click', () => {
            openInboundWebhookModal();
        });

        // Webhook form submit
        document.getElementById('webhook-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            saveWebhook();
        });

        // Inbound webhook form submit
        document.getElementById('inbound-webhook-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            saveInboundWebhook();
        });

        // Close modals
        document.querySelectorAll('.close-modal').forEach(btn => {
            btn.addEventListener('click', closeAllModals);
        });

        // Template selector
        document.getElementById('webhook-template')?.addEventListener('change', (e) => {
            applyTemplate(e.target.value);
        });

        // Log filter
        document.getElementById('log-filter-success')?.addEventListener('change', () => {
            loadDeliveryLogs();
        });
    }

    /**
     * Populate event type checkboxes
     */
    function populateEventTypes() {
        const container = document.getElementById('event-types-checkboxes');
        if (!container) return;

        container.innerHTML = '';
        EVENT_TYPES.forEach(eventType => {
            const div = document.createElement('div');
            div.className = 'checkbox-item';
            div.innerHTML = `
                <input type="checkbox" id="event-${eventType.id}" value="${eventType.id}">
                <label for="event-${eventType.id}">${eventType.label}</label>
            `;
            container.appendChild(div);
        });
    }

    /**
     * Populate action type checkboxes
     */
    function populateActionTypes() {
        const container = document.getElementById('inbound-actions-checkboxes');
        if (!container) return;

        container.innerHTML = '';
        ACTION_TYPES.forEach(actionType => {
            const div = document.createElement('div');
            div.className = 'checkbox-item';
            div.innerHTML = `
                <input type="checkbox" id="action-${actionType.id}" value="${actionType.id}">
                <label for="action-${actionType.id}">${actionType.label}</label>
            `;
            container.appendChild(div);
        });
    }

    /**
     * Load webhooks from API
     */
    async function loadWebhooks() {
        try {
            const response = await apiRequest('/api/webhooks');
            webhooks = response.webhooks || [];
            renderWebhooks();
            updateStats();
        } catch (error) {
            console.error('[Webhooks] Error loading webhooks:', error);
            showNotification('Failed to load webhooks', 'error');
        }
    }

    /**
     * Render webhooks list
     */
    function renderWebhooks() {
        const container = document.getElementById('webhooks-list');
        if (!container) return;

        if (webhooks.length === 0) {
            container.innerHTML = '<p class="text-muted">No webhooks configured. Create one to get started!</p>';
            return;
        }

        container.innerHTML = webhooks.map(webhook => `
            <div class="webhook-card" data-id="${webhook.id}">
                <div class="webhook-card-header">
                    <h3 class="webhook-card-title">${escapeHtml(webhook.name)}</h3>
                    <div class="webhook-card-actions">
                        <span class="badge ${webhook.enabled ? 'badge-enabled' : 'badge-disabled'}">
                            ${webhook.enabled ? 'Enabled' : 'Disabled'}
                        </span>
                        <button class="btn btn-sm btn-secondary" onclick="webhooksModule.testWebhook('${webhook.id}')">
                            Test
                        </button>
                        <button class="btn btn-sm btn-primary" onclick="webhooksModule.editWebhook('${webhook.id}')">
                            Edit
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="webhooksModule.deleteWebhook('${webhook.id}')">
                            Delete
                        </button>
                    </div>
                </div>
                <div class="webhook-card-body">
                    <div class="webhook-info-item">
                        <div class="webhook-info-label">URL</div>
                        <div class="webhook-info-value">${escapeHtml(webhook.url)}</div>
                    </div>
                    <div class="webhook-info-item">
                        <div class="webhook-info-label">Method</div>
                        <div class="webhook-info-value">${webhook.method}</div>
                    </div>
                    <div class="webhook-info-item">
                        <div class="webhook-info-label">Events</div>
                        <div class="webhook-info-value">
                            ${webhook.event_types.slice(0, 3).map(e => 
                                `<span class="event-type-tag">${e}</span>`
                            ).join('')}
                            ${webhook.event_types.length > 3 ? `<span class="event-type-tag">+${webhook.event_types.length - 3} more</span>` : ''}
                        </div>
                    </div>
                    <div class="webhook-info-item">
                        <div class="webhook-info-label">Deliveries</div>
                        <div class="webhook-info-value">${webhook.trigger_count || 0}</div>
                    </div>
                    <div class="webhook-info-item">
                        <div class="webhook-info-label">Failures</div>
                        <div class="webhook-info-value">${webhook.failure_count || 0}</div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    /**
     * Load inbound webhooks
     */
    async function loadInboundWebhooks() {
        try {
            const response = await apiRequest('/api/webhooks/inbound/all');
            inboundWebhooks = response.webhooks || [];
            renderInboundWebhooks();
        } catch (error) {
            console.error('[Webhooks] Error loading inbound webhooks:', error);
            showNotification('Failed to load inbound webhooks', 'error');
        }
    }

    /**
     * Render inbound webhooks
     */
    function renderInboundWebhooks() {
        const container = document.getElementById('inbound-webhooks-list');
        if (!container) return;

        if (inboundWebhooks.length === 0) {
            container.innerHTML = '<p class="text-muted">No inbound webhooks configured.</p>';
            return;
        }

        container.innerHTML = inboundWebhooks.map(webhook => {
            const webhookUrl = `${window.location.origin}/api/webhooks/receive/${webhook.id}`;
            return `
                <div class="webhook-card" data-id="${webhook.id}">
                    <div class="webhook-card-header">
                        <h3 class="webhook-card-title">${escapeHtml(webhook.name)}</h3>
                        <div class="webhook-card-actions">
                            <span class="badge ${webhook.enabled ? 'badge-enabled' : 'badge-disabled'}">
                                ${webhook.enabled ? 'Enabled' : 'Disabled'}
                            </span>
                            <button class="btn btn-sm btn-primary" onclick="webhooksModule.editInboundWebhook('${webhook.id}')">
                                Edit
                            </button>
                            <button class="btn btn-sm btn-danger" onclick="webhooksModule.deleteInboundWebhook('${webhook.id}')">
                                Delete
                            </button>
                        </div>
                    </div>
                    <div class="webhook-card-body">
                        <div class="webhook-info-item">
                            <div class="webhook-info-label">Webhook URL</div>
                            <div class="webhook-info-value">
                                <code>${webhookUrl}</code>
                                <button class="btn btn-sm" onclick="webhooksModule.copyToClipboard('${webhookUrl}')">
                                    Copy
                                </button>
                            </div>
                        </div>
                        <div class="webhook-info-item">
                            <div class="webhook-info-label">Actions</div>
                            <div class="webhook-info-value">
                                ${webhook.actions.map(a => 
                                    `<span class="event-type-tag">${a.type}</span>`
                                ).join('')}
                            </div>
                        </div>
                        <div class="webhook-info-item">
                            <div class="webhook-info-label">Use Count</div>
                            <div class="webhook-info-value">${webhook.use_count || 0}</div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    /**
     * Load delivery logs
     */
    async function loadDeliveryLogs() {
        try {
            const filter = document.getElementById('log-filter-success')?.value;
            const url = filter ? `/api/webhooks/logs/all?success=${filter}` : '/api/webhooks/logs/all';
            
            const response = await apiRequest(url);
            deliveryLogs = response.logs || [];
            renderDeliveryLogs();
        } catch (error) {
            console.error('[Webhooks] Error loading delivery logs:', error);
            showNotification('Failed to load delivery logs', 'error');
        }
    }

    /**
     * Render delivery logs
     */
    function renderDeliveryLogs() {
        const container = document.getElementById('delivery-logs-list');
        if (!container) return;

        if (deliveryLogs.length === 0) {
            container.innerHTML = '<p class="text-muted">No delivery logs found.</p>';
            return;
        }

        container.innerHTML = deliveryLogs.map(log => `
            <div class="log-entry ${log.success ? 'success' : 'error'}">
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                    <div>
                        <strong>${escapeHtml(log.webhook_name)}</strong>
                        <span class="badge ${log.success ? 'badge-success' : 'badge-error'}">
                            ${log.success ? 'Success' : 'Failed'}
                        </span>
                    </div>
                    <div class="text-muted">${formatDateTime(log.triggered_at)}</div>
                </div>
                <div style="font-size: 14px;">
                    <div><strong>Event:</strong> ${log.event_type}</div>
                    <div><strong>URL:</strong> ${escapeHtml(log.url)}</div>
                    ${log.response_status ? `<div><strong>Status:</strong> ${log.response_status}</div>` : ''}
                    ${log.response_time_ms ? `<div><strong>Response Time:</strong> ${log.response_time_ms}ms</div>` : ''}
                    ${log.error_message ? `<div><strong>Error:</strong> ${escapeHtml(log.error_message)}</div>` : ''}
                </div>
            </div>
        `).join('');
    }

    /**
     * Update stats
     */
    function updateStats() {
        const totalWebhooks = webhooks.length;
        const enabledWebhooks = webhooks.filter(w => w.enabled).length;
        const totalDeliveries = webhooks.reduce((sum, w) => sum + (w.trigger_count || 0), 0);
        const recentFailures = webhooks.reduce((sum, w) => sum + (w.failure_count || 0), 0);

        document.getElementById('stat-total-webhooks').textContent = totalWebhooks;
        document.getElementById('stat-enabled-webhooks').textContent = enabledWebhooks;
        document.getElementById('stat-total-deliveries').textContent = totalDeliveries;
        document.getElementById('stat-recent-failures').textContent = recentFailures;
    }

    /**
     * Open webhook modal
     */
    function openWebhookModal(webhook = null) {
        const modal = document.getElementById('webhook-modal');
        const form = document.getElementById('webhook-form');
        
        // Reset form
        form.reset();
        document.getElementById('webhook-id').value = '';
        
        // Clear event type selections
        document.querySelectorAll('#event-types-checkboxes input').forEach(cb => {
            cb.checked = false;
        });

        if (webhook) {
            // Edit mode
            document.getElementById('webhook-modal-title').textContent = 'Edit Webhook';
            document.getElementById('webhook-id').value = webhook.id;
            document.getElementById('webhook-name').value = webhook.name;
            document.getElementById('webhook-description').value = webhook.description || '';
            document.getElementById('webhook-url').value = webhook.url;
            document.getElementById('webhook-method').value = webhook.method;
            document.getElementById('webhook-enabled').checked = webhook.enabled;
            document.getElementById('webhook-verify-ssl').checked = webhook.verify_ssl;

            // Check event types
            webhook.event_types.forEach(eventType => {
                const checkbox = document.getElementById(`event-${eventType}`);
                if (checkbox) checkbox.checked = true;
            });
        } else {
            // Create mode
            document.getElementById('webhook-modal-title').textContent = 'Create Webhook';
            document.getElementById('webhook-enabled').checked = true;
            document.getElementById('webhook-verify-ssl').checked = true;
        }

        modal.classList.add('active');
    }

    /**
     * Apply template
     */
    function applyTemplate(templateId) {
        if (!templateId) return;

        // Templates can pre-fill certain fields
        // For now, just show a notification
        showNotification(`${templateId} template selected. Configure the webhook URL.`, 'info');
    }

    /**
     * Save webhook
     */
    async function saveWebhook() {
        const webhookId = document.getElementById('webhook-id').value;
        const name = document.getElementById('webhook-name').value.trim();
        const description = document.getElementById('webhook-description').value.trim();
        const url = document.getElementById('webhook-url').value.trim();
        const method = document.getElementById('webhook-method').value;
        const enabled = document.getElementById('webhook-enabled').checked;
        const verify_ssl = document.getElementById('webhook-verify-ssl').checked;

        // Get selected event types
        const event_types = Array.from(
            document.querySelectorAll('#event-types-checkboxes input:checked')
        ).map(cb => cb.value);

        if (event_types.length === 0) {
            showNotification('Please select at least one event type', 'error');
            return;
        }

        const webhookData = {
            name,
            description,
            url,
            method,
            event_types,
            enabled,
            verify_ssl
        };

        try {
            if (webhookId) {
                // Update existing webhook
                await apiRequest(`/api/webhooks/${webhookId}`, 'PUT', webhookData);
                showNotification('Webhook updated successfully', 'success');
            } else {
                // Create new webhook
                await apiRequest('/api/webhooks', 'POST', webhookData);
                showNotification('Webhook created successfully', 'success');
            }

            closeAllModals();
            loadWebhooks();
        } catch (error) {
            console.error('[Webhooks] Error saving webhook:', error);
            showNotification(error.message || 'Failed to save webhook', 'error');
        }
    }

    /**
     * Open inbound webhook modal
     */
    function openInboundWebhookModal(webhook = null) {
        const modal = document.getElementById('inbound-webhook-modal');
        const form = document.getElementById('inbound-webhook-form');
        
        // Reset form
        form.reset();
        document.getElementById('inbound-webhook-id').value = '';
        
        // Clear action selections
        document.querySelectorAll('#inbound-actions-checkboxes input').forEach(cb => {
            cb.checked = false;
        });

        if (webhook) {
            // Edit mode
            document.getElementById('inbound-webhook-modal-title').textContent = 'Edit Inbound Webhook';
            document.getElementById('inbound-webhook-id').value = webhook.id;
            document.getElementById('inbound-webhook-name').value = webhook.name;
            document.getElementById('inbound-webhook-description').value = webhook.description || '';
            document.getElementById('inbound-webhook-enabled').checked = webhook.enabled;
            document.getElementById('inbound-webhook-allowed-ips').value = 
                webhook.allowed_ips ? webhook.allowed_ips.join(', ') : '';

            // Check actions
            webhook.actions.forEach(action => {
                const checkbox = document.getElementById(`action-${action.type}`);
                if (checkbox) checkbox.checked = true;
            });
        } else {
            // Create mode
            document.getElementById('inbound-webhook-modal-title').textContent = 'Create Inbound Webhook';
            document.getElementById('inbound-webhook-enabled').checked = true;
        }

        modal.classList.add('active');
    }

    /**
     * Save inbound webhook
     */
    async function saveInboundWebhook() {
        const webhookId = document.getElementById('inbound-webhook-id').value;
        const name = document.getElementById('inbound-webhook-name').value.trim();
        const description = document.getElementById('inbound-webhook-description').value.trim();
        const enabled = document.getElementById('inbound-webhook-enabled').checked;
        const allowedIpsStr = document.getElementById('inbound-webhook-allowed-ips').value.trim();

        // Get selected actions
        const selectedActions = Array.from(
            document.querySelectorAll('#inbound-actions-checkboxes input:checked')
        ).map(cb => cb.value);

        if (selectedActions.length === 0) {
            showNotification('Please select at least one action', 'error');
            return;
        }

        // Parse allowed IPs
        const allowed_ips = allowedIpsStr 
            ? allowedIpsStr.split(',').map(ip => ip.trim()).filter(ip => ip)
            : null;

        // Build actions array
        const actions = selectedActions.map(actionType => ({
            type: actionType,
            data: {}
        }));

        const webhookData = {
            name,
            description,
            actions,
            allowed_ips,
            permissions_required: [], // Will be determined by backend based on actions
            enabled
        };

        try {
            if (webhookId) {
                // Update existing webhook
                await apiRequest(`/api/webhooks/inbound/${webhookId}`, 'PUT', webhookData);
                showNotification('Inbound webhook updated successfully', 'success');
            } else {
                // Create new webhook
                await apiRequest('/api/webhooks/inbound', 'POST', webhookData);
                showNotification('Inbound webhook created successfully', 'success');
            }

            closeAllModals();
            loadInboundWebhooks();
        } catch (error) {
            console.error('[Webhooks] Error saving inbound webhook:', error);
            showNotification(error.message || 'Failed to save inbound webhook', 'error');
        }
    }

    /**
     * Edit webhook
     */
    async function editWebhook(webhookId) {
        const webhook = webhooks.find(w => w.id === webhookId);
        if (webhook) {
            openWebhookModal(webhook);
        }
    }

    /**
     * Edit inbound webhook
     */
    async function editInboundWebhook(webhookId) {
        const webhook = inboundWebhooks.find(w => w.id === webhookId);
        if (webhook) {
            openInboundWebhookModal(webhook);
        }
    }

    /**
     * Delete webhook
     */
    async function deleteWebhook(webhookId) {
        if (!confirm('Are you sure you want to delete this webhook?')) {
            return;
        }

        try {
            await apiRequest(`/api/webhooks/${webhookId}`, 'DELETE');
            showNotification('Webhook deleted successfully', 'success');
            loadWebhooks();
        } catch (error) {
            console.error('[Webhooks] Error deleting webhook:', error);
            showNotification(error.message || 'Failed to delete webhook', 'error');
        }
    }

    /**
     * Delete inbound webhook
     */
    async function deleteInboundWebhook(webhookId) {
        if (!confirm('Are you sure you want to delete this inbound webhook?')) {
            return;
        }

        try {
            await apiRequest(`/api/webhooks/inbound/${webhookId}`, 'DELETE');
            showNotification('Inbound webhook deleted successfully', 'success');
            loadInboundWebhooks();
        } catch (error) {
            console.error('[Webhooks] Error deleting inbound webhook:', error);
            showNotification(error.message || 'Failed to delete inbound webhook', 'error');
        }
    }

    /**
     * Test webhook
     */
    async function testWebhook(webhookId) {
        try {
            showNotification('Sending test webhook...', 'info');
            const response = await apiRequest(`/api/webhooks/${webhookId}/test`, 'POST');
            
            if (response.success) {
                showNotification('Test webhook delivered successfully!', 'success');
            } else {
                showNotification('Test webhook failed', 'error');
            }
        } catch (error) {
            console.error('[Webhooks] Error testing webhook:', error);
            showNotification(error.message || 'Failed to test webhook', 'error');
        }
    }

    /**
     * Copy to clipboard
     */
    function copyToClipboard(text) {
        navigator.clipboard.writeText(text).then(() => {
            showNotification('Copied to clipboard', 'success');
        }).catch(err => {
            console.error('[Webhooks] Failed to copy:', err);
            showNotification('Failed to copy to clipboard', 'error');
        });
    }

    /**
     * Close all modals
     */
    function closeAllModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.remove('active');
        });
    }

    // Export public API
    window.webhooksModule = {
        editWebhook,
        editInboundWebhook,
        deleteWebhook,
        deleteInboundWebhook,
        testWebhook,
        copyToClipboard
    };

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
