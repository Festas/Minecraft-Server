/**
 * Discord Notifications Frontend Module
 * Simplified Discord-only webhook management
 */

(function() {
    'use strict';

    // State
    let discordConfig = {
        webhookUrl: '',
        events: []
    };
    let notificationHistory = [];

    // Simplified event types for Discord
    const DISCORD_EVENTS = [
        { id: 'server.start', icon: '🟢', label: 'Server Start' },
        { id: 'server.stop', icon: '🔴', label: 'Server Stop' },
        { id: 'player.join', icon: '👋', label: 'Player Join' },
        { id: 'player.leave', icon: '👋', label: 'Player Leave' },
        { id: 'backup.completed', icon: '💾', label: 'Backup Complete' },
        { id: 'backup.failed', icon: '⚠️', label: 'Backup Failed' },
        { id: 'alert.low_tps', icon: '📉', label: 'Low TPS Warning' }
    ];

    /**
     * Initialize the Discord notifications page
     */
    function init() {
        console.log('[Discord] Initializing...');

        // Set up event listeners
        setupEventListeners();

        // Load configuration
        loadDiscordConfig();

        // Load notification history
        loadNotificationHistory();

        console.log('[Discord] Initialized');
    }

    /**
     * Set up event listeners
     */
    function setupEventListeners() {
        // Test webhook button
        const testBtn = document.getElementById('test-webhook-btn');
        if (testBtn) {
            testBtn.addEventListener('click', testDiscordWebhook);
        }

        // Save configuration button
        const saveBtn = document.getElementById('save-config-btn');
        if (saveBtn) {
            saveBtn.addEventListener('click', saveDiscordConfig);
        }

        // Event toggle checkboxes - add visual feedback
        const eventToggles = document.querySelectorAll('.event-toggle');
        eventToggles.forEach(toggle => {
            const checkbox = toggle.querySelector('input[type="checkbox"]');
            if (checkbox) {
                checkbox.addEventListener('change', () => {
                    if (checkbox.checked) {
                        toggle.classList.add('checked');
                    } else {
                        toggle.classList.remove('checked');
                    }
                });
                // Initialize state
                if (checkbox.checked) {
                    toggle.classList.add('checked');
                }
            }
        });
    }

    /**
     * Load Discord configuration from backend
     */
    async function loadDiscordConfig() {
        try {
            const response = await fetch('/api/webhooks', {
                credentials: 'same-origin'
            });

            if (!response.ok) {
                console.log('[Discord] No existing configuration found');
                updateStatus(false);
                return;
            }

            const data = await response.json();
            const webhooks = data.webhooks || [];

            // Find Discord webhook (first enabled webhook or any webhook)
            const discordWebhook = webhooks.find(w => w.enabled) || webhooks[0];

            if (discordWebhook) {
                // Populate UI with existing config
                document.getElementById('discord-webhook-url').value = discordWebhook.url || '';
                
                // Check appropriate event checkboxes
                const eventTypes = discordWebhook.event_types || [];
                eventTypes.forEach(eventType => {
                    const eventId = eventType.replace('.', '-');
                    const checkbox = document.getElementById(`event-${eventId}`);
                    if (checkbox) {
                        checkbox.checked = true;
                        checkbox.closest('.event-toggle')?.classList.add('checked');
                    }
                });

                discordConfig = {
                    id: discordWebhook.id,
                    webhookUrl: discordWebhook.url,
                    events: eventTypes
                };

                updateStatus(true);
            } else {
                updateStatus(false);
            }
        } catch (error) {
            console.error('[Discord] Error loading configuration:', error);
            updateStatus(false);
        }
    }

    /**
     * Update status indicator
     */
    function updateStatus(connected) {
        const indicator = document.getElementById('status-indicator');
        const statusText = document.getElementById('status-text');

        if (indicator && statusText) {
            if (connected) {
                indicator.className = 'status-indicator connected';
                statusText.textContent = 'Connected';
            } else {
                indicator.className = 'status-indicator disconnected';
                statusText.textContent = 'Not configured';
            }
        }
    }

    /**
     * Test Discord webhook
     */
    async function testDiscordWebhook() {
        const webhookUrl = document.getElementById('discord-webhook-url').value.trim();
        
        if (!webhookUrl) {
            showToast('Please enter a webhook URL first', 'error');
            return;
        }

        if (!webhookUrl.startsWith('https://discord.com/api/webhooks/') && 
            !webhookUrl.startsWith('https://discordapp.com/api/webhooks/')) {
            showToast('Please enter a valid Discord webhook URL', 'error');
            return;
        }

        const testBtn = document.getElementById('test-webhook-btn');
        const originalText = testBtn.textContent;
        testBtn.disabled = true;
        testBtn.textContent = 'Testing...';

        try {
            // Send test message directly to Discord
            const response = await fetch(webhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    embeds: [{
                        title: '🧪 Test Notification',
                        description: 'This is a test message from Festas Builds Minecraft Console.',
                        color: 0x5865F2, // Discord blue
                        timestamp: new Date().toISOString(),
                        footer: {
                            text: 'Discord Notifications Test'
                        }
                    }]
                })
            });

            if (response.ok || response.status === 204) {
                showToast('Test message sent successfully! Check your Discord channel.', 'success');
                updateStatus(true);
            } else {
                const errorText = await response.text();
                console.error('[Discord] Test failed:', errorText);
                showToast('Test failed. Please check the webhook URL.', 'error');
            }
        } catch (error) {
            console.error('[Discord] Error testing webhook:', error);
            showToast('Failed to send test message. Please check your connection.', 'error');
        } finally {
            testBtn.disabled = false;
            testBtn.textContent = originalText;
        }
    }

    /**
     * Save Discord configuration
     */
    async function saveDiscordConfig() {
        const webhookUrl = document.getElementById('discord-webhook-url').value.trim();
        
        if (!webhookUrl) {
            showToast('Please enter a webhook URL', 'error');
            return;
        }

        if (!webhookUrl.startsWith('https://discord.com/api/webhooks/') && 
            !webhookUrl.startsWith('https://discordapp.com/api/webhooks/')) {
            showToast('Please enter a valid Discord webhook URL', 'error');
            return;
        }

        // Get selected events
        const selectedEvents = [];
        document.querySelectorAll('.event-toggle input[type="checkbox"]:checked').forEach(checkbox => {
            selectedEvents.push(checkbox.value);
        });

        if (selectedEvents.length === 0) {
            showToast('Please select at least one event type', 'error');
            return;
        }

        const saveBtn = document.getElementById('save-config-btn');
        const originalText = saveBtn.textContent;
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving...';

        try {
            const webhookData = {
                name: 'Discord Notifications',
                description: 'Discord webhook for server notifications',
                url: webhookUrl,
                method: 'POST',
                event_types: selectedEvents,
                enabled: true,
                verify_ssl: true
            };

            let response;
            if (discordConfig.id) {
                // Update existing webhook
                response = await fetch(`/api/webhooks/${discordConfig.id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-csrf-token': window.csrfToken || ''
                    },
                    credentials: 'same-origin',
                    body: JSON.stringify(webhookData)
                });
            } else {
                // Create new webhook
                response = await fetch('/api/webhooks', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-csrf-token': window.csrfToken || ''
                    },
                    credentials: 'same-origin',
                    body: JSON.stringify(webhookData)
                });
            }

            if (response.ok) {
                const data = await response.json();
                discordConfig.id = data.webhook?.id || discordConfig.id;
                discordConfig.webhookUrl = webhookUrl;
                discordConfig.events = selectedEvents;
                
                showToast('Configuration saved successfully!', 'success');
                updateStatus(true);
            } else {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to save configuration');
            }
        } catch (error) {
            console.error('[Discord] Error saving configuration:', error);
            showToast(error.message || 'Failed to save configuration', 'error');
        } finally {
            saveBtn.disabled = false;
            saveBtn.textContent = originalText;
        }
    }

    /**
     * Load notification history
     */
    async function loadNotificationHistory() {
        const container = document.getElementById('notification-list');
        if (!container) return;

        try {
            const response = await fetch('/api/webhooks/logs/all?limit=10', {
                credentials: 'same-origin'
            });

            if (!response.ok) {
                throw new Error('Failed to load notification history');
            }

            const data = await response.json();
            notificationHistory = data.logs || [];

            renderNotificationHistory();
        } catch (error) {
            console.error('[Discord] Error loading notification history:', error);
            container.innerHTML = '<div class="empty-notifications">Unable to load notification history</div>';
        }
    }

    /**
     * Render notification history
     */
    function renderNotificationHistory() {
        const container = document.getElementById('notification-list');
        if (!container) return;

        if (notificationHistory.length === 0) {
            container.innerHTML = '<div class="empty-notifications">No notifications sent yet</div>';
            return;
        }

        container.innerHTML = notificationHistory.map(notification => {
            const success = notification.success;
            const icon = success ? '✓' : '✗';
            const eventLabel = getEventLabel(notification.event_type);
            const relativeTime = formatRelativeTime(new Date(notification.triggered_at));
            
            return `
                <div class="notification-item ${success ? 'success' : 'error'}">
                    <span class="notification-status">${icon}</span>
                    <span class="notification-message">${escapeHtml(eventLabel)}</span>
                    <span class="notification-time">${relativeTime}</span>
                </div>
            `;
        }).join('');
    }

    /**
     * Get event label from event type
     */
    function getEventLabel(eventType) {
        const event = DISCORD_EVENTS.find(e => e.id === eventType);
        return event ? `${event.icon} ${event.label}` : eventType;
    }

    /**
     * Format relative time (e.g., "2 min ago")
     */
    function formatRelativeTime(date) {
        const now = new Date();
        const diffMs = now - date;
        const diffSec = Math.floor(diffMs / 1000);
        const diffMin = Math.floor(diffSec / 60);
        const diffHour = Math.floor(diffMin / 60);
        const diffDay = Math.floor(diffHour / 24);

        if (diffSec < 60) return 'just now';
        if (diffMin < 60) return `${diffMin} min ago`;
        if (diffHour < 24) return `${diffHour} hour${diffHour > 1 ? 's' : ''} ago`;
        if (diffDay < 7) return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;
        return date.toLocaleDateString();
    }

    /**
     * Show toast notification
     */
    function showToast(message, type = 'info') {
        // Use global notification function if available
        if (typeof window.showNotification === 'function') {
            window.showNotification(message, type);
            return;
        }

        // Fallback: create simple toast
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 16px 24px;
            background: ${type === 'success' ? '#3BA55D' : type === 'error' ? '#ED4245' : '#5865F2'};
            color: white;
            border-radius: 8px;
            font-weight: 600;
            z-index: 10000;
            animation: slideIn 0.3s ease-out;
        `;

        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease-in';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
