# Advanced Logging & Notification System

The Advanced Logging & Notification System provides comprehensive event tracking, searchable logs, and real-time notifications for your Minecraft server console. This system ensures that important events are captured, searchable, and delivered to the right users at the right time.

## Table of Contents

- [Overview](#overview)
- [Event Logging](#event-logging)
  - [Event Categories](#event-categories)
  - [Event Severity Levels](#event-severity-levels)
  - [Event Types](#event-types)
- [Querying Logs](#querying-logs)
  - [API Endpoints](#api-endpoints)
  - [Query Parameters](#query-parameters)
  - [Export Formats](#export-formats)
- [Notification System](#notification-system)
  - [Notification Channels](#notification-channels)
  - [User Preferences](#user-preferences)
  - [Quiet Hours](#quiet-hours)
- [API Reference](#api-reference)
- [Integration Guide](#integration-guide)
  - [Logging Events from Code](#logging-events-from-code)
  - [Plugin Integration](#plugin-integration)
  - [Webhook Integration](#webhook-integration)
- [Troubleshooting](#troubleshooting)
- [Best Practices](#best-practices)

## Overview

The Advanced Logging & Notification System consists of three main components:

1. **Event Logger**: Centralized logging service that stores all server, plugin, user, and automation events in a searchable SQLite database
2. **Notification Service**: Manages user notifications, preferences, and real-time delivery via WebSocket
3. **Frontend UI**: User interface for viewing logs, managing notifications, and configuring preferences

### Key Features

- ✅ **Persistent Event Logging**: All events stored in SQLite database
- ✅ **Advanced Search & Filtering**: Query by category, severity, date range, actor, and more
- ✅ **Export Capabilities**: Export logs in JSON or CSV format
- ✅ **Real-time Notifications**: WebSocket-based delivery of notifications
- ✅ **Per-user Preferences**: Customize notification delivery, severity filters, and quiet hours
- ✅ **Multiple Channels**: Web notifications, toast popups, and persistent inbox
- ✅ **RBAC Integration**: Role-based access control for log viewing and exporting

## Event Logging

### Event Categories

Events are organized into eight primary categories:

| Category | Description | Examples |
|----------|-------------|----------|
| `server` | Server lifecycle events | Start, stop, restart, crash |
| `plugin` | Plugin management events | Install, update, delete, enable, disable |
| `user` | User management events | Login, logout, created, deleted, role changed |
| `automation` | Automation task events | Task created, executed, failed |
| `player` | Player actions | Join, leave, kick, ban, whitelist |
| `backup` | Backup operations | Created, restored, deleted, failed |
| `security` | Security-related events | Access denied, suspicious activity |
| `system` | General system events | Errors, warnings, info messages |

### Event Severity Levels

Events are classified by severity to help prioritize and filter:

| Severity | Description | Use Case |
|----------|-------------|----------|
| `debug` | Diagnostic information | Development and troubleshooting |
| `info` | Informational messages | Normal operations, successful actions |
| `warning` | Warning conditions | Non-critical issues requiring attention |
| `error` | Error conditions | Failures that don't stop the system |
| `critical` | Critical conditions | System failures, security breaches |

### Event Types

Each category has specific event types. Here are some common examples:

#### Server Events
- `server.start` - Server started
- `server.stop` - Server stopped
- `server.restart` - Server restarted
- `server.crash` - Server crashed
- `server.performance.warning` - Performance degradation detected

#### Plugin Events
- `plugin.installed` - Plugin installed
- `plugin.updated` - Plugin updated
- `plugin.deleted` - Plugin removed
- `plugin.enabled` - Plugin enabled
- `plugin.disabled` - Plugin disabled
- `plugin.error` - Plugin error occurred

#### User Events
- `user.login` - User logged in
- `user.logout` - User logged out
- `user.created` - User account created
- `user.deleted` - User account deleted
- `user.role.changed` - User role changed

#### Automation Events
- `automation.task.created` - Automation task created
- `automation.task.executed` - Task executed successfully
- `automation.task.failed` - Task execution failed

## Querying Logs

### API Endpoints

#### Query Events
```
GET /api/logs/query
```

Query event logs with filtering and pagination.

**Query Parameters:**
- `category` - Filter by event category
- `severity` - Filter by severity level
- `eventType` - Filter by specific event type
- `actor` - Filter by username who performed action
- `target` - Filter by target (partial match)
- `startDate` - Filter by start date (ISO 8601)
- `endDate` - Filter by end date (ISO 8601)
- `search` - Full-text search in title and message
- `limit` - Maximum results (1-1000, default: 100)
- `offset` - Offset for pagination (default: 0)
- `sortBy` - Sort field (timestamp, severity, category, event_type)
- `sortOrder` - Sort order (asc, desc, default: desc)

**Example:**
```bash
curl -X GET "http://localhost:3001/api/logs/query?category=server&severity=error&limit=50" \
  --cookie "session=..." \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**
```json
{
  "events": [
    {
      "id": 123,
      "event_type": "server.crash",
      "category": "server",
      "severity": "critical",
      "title": "Server crashed unexpectedly",
      "message": "Out of memory error",
      "actor": "system",
      "target": null,
      "metadata": {},
      "timestamp": "2024-01-15T14:30:00Z"
    }
  ],
  "total": 150,
  "limit": 50,
  "offset": 0,
  "hasMore": true
}
```

#### Get Recent Events
```
GET /api/logs/recent?limit=50
```

Get the most recent events (default: 50, max: 100).

#### Get Event Statistics
```
GET /api/logs/stats?startDate=2024-01-01T00:00:00Z&endDate=2024-01-31T23:59:59Z
```

Get aggregated statistics for events within a date range.

**Response:**
```json
{
  "total": 1250,
  "byCategory": [
    { "category": "server", "count": 450 },
    { "category": "player", "count": 380 }
  ],
  "bySeverity": [
    { "severity": "info", "count": 890 },
    { "severity": "warning", "count": 200 }
  ],
  "byEventType": [
    { "event_type": "player.joined", "count": 150 }
  ]
}
```

#### Export Logs
```
GET /api/logs/export?format=csv&category=server&startDate=2024-01-01T00:00:00Z
```

Export event logs in JSON or CSV format. Requires `LOG_EXPORT` permission.

**Formats:**
- `json` - JSON array of events
- `csv` - CSV file with standard fields

### Query Parameters

Common query parameters and their usage:

#### Date Filtering
```bash
# Events from the last 24 hours
startDate=2024-01-15T00:00:00Z&endDate=2024-01-16T00:00:00Z

# Events in January 2024
startDate=2024-01-01T00:00:00Z&endDate=2024-01-31T23:59:59Z
```

#### Full-text Search
```bash
# Search for "backup" in title or message
search=backup

# Search for error messages containing "permission"
search=permission&severity=error
```

#### Pagination
```bash
# First page (results 1-100)
limit=100&offset=0

# Second page (results 101-200)
limit=100&offset=100
```

### Export Formats

#### JSON Export
The JSON export returns an array of event objects with all fields:

```json
[
  {
    "id": 1,
    "event_type": "server.start",
    "category": "server",
    "severity": "info",
    "title": "Server started",
    "message": "Minecraft server started successfully",
    "actor": "admin",
    "target": null,
    "metadata": {"version": "1.20.1"},
    "timestamp": "2024-01-15T10:00:00Z",
    "created_at": "2024-01-15T10:00:00Z"
  }
]
```

#### CSV Export
The CSV export includes these columns:
- ID
- Timestamp
- Category
- Severity
- Event Type
- Title
- Message
- Actor
- Target

## Notification System

### Notification Channels

Notifications can be delivered through three channels:

1. **Web Notifications**: Browser push notifications (if permissions granted)
2. **Toast Popups**: Temporary on-screen notifications in the console
3. **Inbox**: Persistent notifications in the Notifications page

Users can configure which channels they want to receive notifications on.

### User Preferences

Each user can customize their notification preferences:

#### Enable/Disable Notifications
Turn notifications on or off entirely.

#### Channel Selection
Choose which channels to receive notifications on:
- Web
- Toast
- Inbox

#### Severity Filter
Set minimum severity level for notifications:
- `debug` - All notifications
- `info` - Info and above (default)
- `warning` - Warnings and above
- `error` - Errors and critical only
- `critical` - Critical only

#### Category Filter
Select specific categories to receive notifications for. If no categories are selected, all categories are included.

Available categories:
- Server
- Plugin
- User
- Automation
- Player
- Backup
- Security
- System

### Quiet Hours

Configure quiet hours to reduce notification noise during specific times:

- **Start Time**: When quiet hours begin (e.g., 22:00)
- **End Time**: When quiet hours end (e.g., 08:00)

During quiet hours:
- Only **critical** severity notifications are shown
- All other notifications are still saved to inbox but not pushed

Example:
```
Quiet Hours: 22:00 to 08:00
- At 23:00: Critical server crash → Notification shown
- At 23:30: Info player joined → Notification saved to inbox only
```

## API Reference

### Event Logging Endpoints

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/api/logs/query` | Query event logs | `LOG_VIEW` |
| GET | `/api/logs/recent` | Get recent events | `LOG_VIEW` |
| GET | `/api/logs/stats` | Get event statistics | `LOG_VIEW` |
| GET | `/api/logs/export` | Export logs | `LOG_EXPORT` |
| GET | `/api/logs/types` | Get available types | `LOG_VIEW` |

### Notification Endpoints

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/api/notifications` | Get user notifications | (Authenticated) |
| GET | `/api/notifications/unread-count` | Get unread count | (Authenticated) |
| PUT | `/api/notifications/:id/read` | Mark as read | (Authenticated) |
| PUT | `/api/notifications/read-all` | Mark all as read | (Authenticated) |
| DELETE | `/api/notifications/:id` | Delete notification | (Authenticated) |
| GET | `/api/notifications/preferences` | Get preferences | (Authenticated) |
| PUT | `/api/notifications/preferences` | Update preferences | (Authenticated) |

### WebSocket Events

The system uses WebSocket for real-time notification delivery:

```javascript
// Listen for new notifications
socket.on('notification', (notification) => {
    console.log('New notification:', notification);
});

// Listen for toast notifications
socket.on('toast-notification', (notification) => {
    showToast(notification);
});
```

## Integration Guide

### Logging Events from Code

To log events from your backend code:

```javascript
const { eventLogger, EVENT_TYPES, EVENT_CATEGORIES, EVENT_SEVERITY } = require('./services/eventLogger');

// Log a server event
eventLogger.logEvent({
    eventType: EVENT_TYPES.SERVER_START,
    category: EVENT_CATEGORIES.SERVER,
    severity: EVENT_SEVERITY.INFO,
    title: 'Server started',
    message: 'Minecraft server started successfully',
    actor: 'admin',
    target: null,
    metadata: {
        version: '1.20.1',
        memory: '4GB'
    }
});

// Log a plugin event
eventLogger.logEvent({
    eventType: EVENT_TYPES.PLUGIN_INSTALLED,
    category: EVENT_CATEGORIES.PLUGIN,
    severity: EVENT_SEVERITY.INFO,
    title: 'Plugin installed',
    message: 'EssentialsX plugin installed',
    actor: req.session.username,
    target: 'EssentialsX',
    metadata: {
        version: '2.20.1'
    }
});

// Log a security event
eventLogger.logEvent({
    eventType: EVENT_TYPES.SECURITY_ACCESS_DENIED,
    category: EVENT_CATEGORIES.SECURITY,
    severity: EVENT_SEVERITY.WARNING,
    title: 'Access denied',
    message: 'User attempted to access restricted resource',
    actor: req.session.username,
    target: '/api/admin/config',
    metadata: {
        ip: req.ip,
        role: req.session.role
    }
});
```

### Plugin Integration

Plugins can log events through the event logger service:

```javascript
// In your plugin code
const { eventLogger, EVENT_TYPES, EVENT_CATEGORIES, EVENT_SEVERITY } = require('../services/eventLogger');

// Log plugin-specific event
eventLogger.logEvent({
    eventType: 'plugin.custom.event',
    category: EVENT_CATEGORIES.PLUGIN,
    severity: EVENT_SEVERITY.INFO,
    title: 'Custom plugin event',
    message: 'Plugin performed custom action',
    actor: 'system',
    target: 'MyPlugin',
    metadata: {
        action: 'custom_action',
        details: {...}
    }
});
```

### Webhook Integration

For external systems to log events, create a webhook endpoint:

```javascript
// routes/webhooks.js
router.post('/webhooks/events',
    requireAuth,
    requirePermission('LOG_CREATE'),
    [
        body('eventType').notEmpty(),
        body('category').isIn(Object.values(EVENT_CATEGORIES)),
        body('severity').isIn(Object.values(EVENT_SEVERITY)),
        body('title').notEmpty()
    ],
    (req, res) => {
        const eventId = eventLogger.logEvent({
            eventType: req.body.eventType,
            category: req.body.category,
            severity: req.body.severity,
            title: req.body.title,
            message: req.body.message,
            actor: req.body.actor || 'webhook',
            target: req.body.target,
            metadata: req.body.metadata
        });
        
        res.json({ success: true, eventId });
    }
);
```

## Troubleshooting

### Events Not Appearing in Logs

**Problem**: Events are logged but don't appear in queries.

**Solution**:
1. Check database file exists: `console/backend/data/events.db`
2. Verify event logger initialized successfully (check server logs)
3. Try querying without filters first
4. Check date range is correct (use ISO 8601 format)

### Notifications Not Received

**Problem**: User doesn't receive notifications.

**Solution**:
1. Check notification preferences are enabled
2. Verify severity filter isn't too restrictive
3. Check if in quiet hours
4. Confirm WebSocket connection (check browser console)
5. Verify user has necessary permissions

### Database Performance Issues

**Problem**: Log queries are slow.

**Solution**:
1. Events table has indexes on commonly queried fields
2. Use pagination (limit results to 100-1000)
3. Consider archiving old events (use date filters)
4. Run VACUUM on database periodically:
   ```bash
   sqlite3 console/backend/data/events.db "VACUUM;"
   ```

### Export Fails

**Problem**: Log export returns error.

**Solution**:
1. Verify user has `LOG_EXPORT` permission
2. Check export limit (max 10,000 events)
3. Reduce date range if too many events
4. Try JSON format if CSV fails

## Best Practices

### Event Logging

1. **Use Appropriate Severity**:
   - `debug` - Development only
   - `info` - Normal operations
   - `warning` - Potential issues
   - `error` - Failures
   - `critical` - System failures

2. **Provide Context**:
   - Include relevant metadata
   - Use descriptive titles and messages
   - Specify actor and target when applicable

3. **Be Consistent**:
   - Use defined event types
   - Follow naming conventions
   - Include timestamps automatically

### Notification Configuration

1. **Set Appropriate Filters**:
   - Use severity filter to reduce noise
   - Select relevant categories
   - Configure quiet hours for off-hours

2. **Choose Channels Wisely**:
   - Critical events → All channels
   - Info events → Inbox only
   - Frequent events → Limit to inbox

3. **Review Regularly**:
   - Check notification inbox weekly
   - Adjust preferences based on volume
   - Archive or delete old notifications

### Database Maintenance

1. **Regular Cleanup**:
   - Delete events older than 90 days
   - Archive important events before deletion
   - Run VACUUM to reclaim space

2. **Monitor Size**:
   - Check database file size regularly
   - Plan for growth based on event volume
   - Consider external archival for compliance

3. **Backup Database**:
   - Include events.db in backup strategy
   - Test restore procedures
   - Keep backups for required retention period

### Security

1. **Protect Sensitive Data**:
   - Don't log passwords or tokens
   - Sanitize user input in messages
   - Be careful with IP addresses and PII

2. **Access Control**:
   - Enforce RBAC permissions
   - Audit log access regularly
   - Monitor for suspicious queries

3. **Data Retention**:
   - Define retention policy
   - Comply with regulations (GDPR, etc.)
   - Securely delete old data

---

For additional support or questions, please refer to the main documentation or open an issue on GitHub.
