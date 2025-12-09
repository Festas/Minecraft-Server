# Automation & Scheduler

The Automation & Scheduler system allows you to automate routine server maintenance tasks and execute them on a predefined schedule. This powerful feature helps maintain your server efficiently while ensuring accountability through comprehensive logging.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Task Types](#task-types)
- [Cron Expressions](#cron-expressions)
- [Role-Based Access Control](#role-based-access-control)
- [Creating Tasks](#creating-tasks)
- [Managing Tasks](#managing-tasks)
- [Execution History](#execution-history)
- [API Reference](#api-reference)
- [Troubleshooting](#troubleshooting)
- [Best Practices](#best-practices)
- [Advanced Usage](#advanced-usage)

## Overview

The Automation & Scheduler provides a robust framework for scheduling and executing automated tasks on your Minecraft server. All tasks are:

- **Persistent**: Tasks survive server restarts and are stored in the database
- **Audited**: Every execution (scheduled or manual) is logged for accountability
- **RBAC-Enforced**: Permissions are enforced based on user roles
- **Reliable**: Uses industry-standard node-cron for precise scheduling

## Features

### Core Capabilities

- ✅ **Schedule Automation**: Create tasks that run automatically on a cron schedule
- ✅ **Manual Execution**: Trigger any task on-demand with a button click
- ✅ **Task Management**: Create, edit, delete, enable/disable tasks
- ✅ **Execution History**: View detailed logs of all task executions
- ✅ **Multiple Task Types**: Support for backups, restarts, broadcasts, and custom commands
- ✅ **Error Handling**: Comprehensive error tracking and reporting
- ✅ **RBAC Integration**: Role-based permissions for all operations

### Task Types Supported

1. **Backup**: Automated world backups with save-off protection
2. **Restart**: Scheduled server restarts with player warnings
3. **Broadcast**: Send scheduled messages to all players
4. **Command**: Execute any RCON command on schedule

## Task Types

### 1. Backup Tasks

Automatically create backups of your server at specified intervals.

**Features:**
- Disables auto-save before backup
- Saves all chunks
- Runs backup script
- Re-enables auto-save after completion

**Configuration:**
- No additional configuration required

**Example Use Cases:**
- Daily backups at midnight
- Hourly backups during peak hours
- Weekly full backups

**Cron Examples:**
```
0 0 * * *        # Daily at midnight
0 */6 * * *      # Every 6 hours
0 3 * * 0        # Weekly on Sunday at 3 AM
```

### 2. Restart Tasks

Schedule server restarts with optional player warnings.

**Features:**
- Configurable warning message
- Adjustable warning delay
- Saves world before restart
- Graceful shutdown and restart

**Configuration:**
- `warning_message` (string): Message to display to players (default: "Server restarting in 30 seconds!")
- `warning_delay` (number): Delay in seconds after warning (default: 30, min: 10, max: 300)

**Example Use Cases:**
- Daily restarts for performance
- Weekly maintenance restarts
- Scheduled update installations

**Cron Examples:**
```
0 4 * * *        # Daily at 4 AM
0 3 * * 1        # Weekly on Monday at 3 AM
0 */12 * * *     # Every 12 hours
```

### 3. Broadcast Tasks

Send scheduled messages to all online players.

**Features:**
- Custom message content
- Delivered via in-game chat
- Perfect for announcements and reminders

**Configuration:**
- `message` (string, required): The message to broadcast

**Example Use Cases:**
- Hourly tips for new players
- Daily event reminders
- Server rules notifications
- Periodic announcements

**Cron Examples:**
```
0 * * * *        # Every hour
*/30 * * * *     # Every 30 minutes
0 12 * * *       # Daily at noon
```

### 4. Command Tasks

Execute any RCON command on a schedule.

**Features:**
- Execute any valid Minecraft command
- Full RCON command support
- Response logging

**Configuration:**
- `command` (string, required): The command to execute (without leading slash)

**Example Use Cases:**
- Clear weather periodically
- Set time to day every morning
- Run custom plugin commands
- Execute maintenance scripts

**Cron Examples:**
```
0 8 * * *        # Daily at 8 AM (e.g., "time set day")
*/15 * * * *     # Every 15 minutes (e.g., "weather clear")
0 0 1 * *        # Monthly on 1st (e.g., custom cleanup)
```

## Cron Expressions

Automation tasks use standard cron expressions to define schedules.

### Format

```
* * * * *
│ │ │ │ │
│ │ │ │ └─── Day of Week (0-6, 0 = Sunday)
│ │ │ └───── Month (1-12)
│ │ └─────── Day of Month (1-31)
│ └───────── Hour (0-23)
└─────────── Minute (0-59)
```

### Common Patterns

| Pattern | Description | Example Use |
|---------|-------------|-------------|
| `0 0 * * *` | Daily at midnight | Daily backups |
| `0 */6 * * *` | Every 6 hours | Frequent backups |
| `*/30 * * * *` | Every 30 minutes | Regular broadcasts |
| `0 3 * * 0` | Weekly on Sunday at 3 AM | Weekly restarts |
| `0 4 * * 1-5` | Weekdays at 4 AM | Business day restarts |
| `0 0 1 * *` | Monthly on 1st at midnight | Monthly tasks |

### Special Characters

- `*` : Any value
- `,` : List separator (e.g., `1,3,5`)
- `-` : Range (e.g., `1-5`)
- `/` : Step values (e.g., `*/2` = every 2 units)

### Examples

```bash
# Every hour at minute 0
0 * * * *

# Every day at 3:30 AM
30 3 * * *

# Every Monday at 2 AM
0 2 * * 1

# Every 15 minutes
*/15 * * * *

# First day of every month
0 0 1 * *

# Weekdays at 6 PM
0 18 * * 1-5
```

## Role-Based Access Control

Automation features are protected by role-based permissions:

### Permission Matrix

| Permission | Owner | Admin | Moderator | Viewer | Description |
|-----------|-------|-------|-----------|--------|-------------|
| View Tasks | ✅ | ✅ | ✅ | ✅ | View scheduled tasks |
| Create Tasks | ✅ | ✅ | ❌ | ❌ | Create new tasks |
| Edit Tasks | ✅ | ✅ | ❌ | ❌ | Modify existing tasks |
| Delete Tasks | ✅ | ✅ | ❌ | ❌ | Remove tasks |
| Execute Tasks | ✅ | ✅ | ✅ | ❌ | Manually trigger tasks |
| View History | ✅ | ✅ | ✅ | ✅ | View execution logs |

### Permission Details

**Owner & Admin:**
- Full control over automation system
- Can create, edit, delete, and execute tasks
- Can view execution history
- Recommended for server administrators

**Moderator:**
- Can view and execute tasks
- Cannot modify task configuration
- Can view execution history
- Good for trusted staff who need to run maintenance

**Viewer:**
- Can only view tasks and history
- Cannot execute or modify tasks
- Perfect for read-only monitoring

## Creating Tasks

### Via Web Interface

1. Navigate to **Automation** in the console sidebar
2. Click **➕ Create Task**
3. Fill in task details:
   - **Name**: Descriptive task name (required)
   - **Description**: Optional details about the task
   - **Task Type**: Select backup, restart, broadcast, or command
   - **Schedule**: Enter cron expression
   - **Configuration**: Task-specific settings (varies by type)
   - **Enabled**: Check to activate immediately

4. Click **Save Task**

### Via API

```bash
curl -X POST https://your-server.com/api/automation/tasks \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: YOUR_TOKEN" \
  -d '{
    "name": "Daily Backup",
    "description": "Backup at midnight every day",
    "task_type": "backup",
    "cron_expression": "0 0 * * *",
    "config": {},
    "enabled": true
  }'
```

### Task Configuration Examples

**Backup Task:**
```json
{
  "name": "Hourly Backup",
  "task_type": "backup",
  "cron_expression": "0 * * * *",
  "config": {},
  "enabled": true
}
```

**Restart Task:**
```json
{
  "name": "Daily Restart",
  "task_type": "restart",
  "cron_expression": "0 4 * * *",
  "config": {
    "warning_message": "Server restarting in 30 seconds for maintenance!",
    "warning_delay": 30
  },
  "enabled": true
}
```

**Broadcast Task:**
```json
{
  "name": "Hourly Tip",
  "task_type": "broadcast",
  "cron_expression": "0 * * * *",
  "config": {
    "message": "Remember to claim your daily rewards!"
  },
  "enabled": true
}
```

**Command Task:**
```json
{
  "name": "Morning Daylight",
  "task_type": "command",
  "cron_expression": "0 8 * * *",
  "config": {
    "command": "time set day"
  },
  "enabled": true
}
```

## Managing Tasks

### Editing Tasks

1. Click the **✏️ Edit** button on any task card
2. Modify the desired fields
3. Click **Save Task**

**Note:** Editing a scheduled task will automatically reschedule it with the new configuration.

### Enabling/Disabling Tasks

- Click the **⏸️/▶️** toggle button to enable or disable a task
- Disabled tasks remain in the system but won't execute on schedule
- You can still manually execute disabled tasks

### Deleting Tasks

1. Click the **🗑️ Delete** button on the task card
2. Confirm deletion in the prompt
3. Task and its schedule will be permanently removed

**Warning:** Deletion is permanent and cannot be undone. Execution history is preserved.

### Manual Execution

Click the **▶️ Execute** button to trigger a task immediately, regardless of its schedule.

**Use Cases:**
- Testing new tasks
- Emergency backups
- Immediate restarts
- One-off announcements

## Execution History

The system maintains a complete audit trail of all task executions.

### Viewing History

1. Navigate to the **History** tab in Automation
2. View execution records with:
   - Task name and type
   - Execution timestamp
   - Executor (user or system)
   - Execution type (manual or scheduled)
   - Status (success, failed, partial)
   - Duration
   - Error messages (if failed)

### Filtering History

Use the filter dropdown to view:
- All tasks
- Backups only
- Restarts only
- Broadcasts only
- Commands only

### Status Indicators

- **SUCCESS** (green): Task completed successfully
- **FAILED** (red): Task encountered an error
- **PARTIAL** (orange): Task partially completed

## API Reference

### Endpoints

#### GET /api/automation/tasks

List all automation tasks.

**Permissions:** `automation:view`

**Response:**
```json
{
  "tasks": [
    {
      "id": "task-123",
      "name": "Daily Backup",
      "description": "Backup at midnight",
      "task_type": "backup",
      "cron_expression": "0 0 * * *",
      "config": {},
      "enabled": true,
      "created_by": "admin",
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z",
      "last_run": "2024-01-02T00:00:00Z",
      "next_run": "2024-01-03T00:00:00Z",
      "run_count": 5
    }
  ]
}
```

#### GET /api/automation/tasks/:id

Get specific task details.

**Permissions:** `automation:view`

**Response:**
```json
{
  "task": { /* task object */ }
}
```

#### POST /api/automation/tasks

Create a new automation task.

**Permissions:** `automation:create`

**Request Body:**
```json
{
  "name": "Daily Backup",
  "description": "Optional description",
  "task_type": "backup",
  "cron_expression": "0 0 * * *",
  "config": {},
  "enabled": true
}
```

**Response:**
```json
{
  "success": true,
  "task": { /* created task */ }
}
```

#### PUT /api/automation/tasks/:id

Update an existing task.

**Permissions:** `automation:edit`

**Request Body:**
```json
{
  "name": "Updated Name",
  "enabled": false
}
```

**Response:**
```json
{
  "success": true,
  "task": { /* updated task */ }
}
```

#### DELETE /api/automation/tasks/:id

Delete a task.

**Permissions:** `automation:delete`

**Response:**
```json
{
  "success": true,
  "message": "Task deleted successfully"
}
```

#### POST /api/automation/tasks/:id/execute

Manually execute a task.

**Permissions:** `automation:execute`

**Response:**
```json
{
  "success": true,
  "result": {
    "status": "success",
    "duration_ms": 1234,
    "error_message": null,
    "result_details": {
      "message": "Task executed successfully"
    }
  }
}
```

#### GET /api/automation/history

Get execution history.

**Permissions:** `automation:history`

**Query Parameters:**
- `task_id` (optional): Filter by task ID
- `task_type` (optional): Filter by task type
- `execution_type` (optional): Filter by `manual` or `scheduled`
- `status` (optional): Filter by status
- `limit` (optional): Max results (default: 100)

**Response:**
```json
{
  "history": [
    {
      "id": 1,
      "task_id": "task-123",
      "task_name": "Daily Backup",
      "task_type": "backup",
      "execution_type": "scheduled",
      "executed_by": "system",
      "executed_at": "2024-01-01T00:00:00Z",
      "status": "success",
      "duration_ms": 1234,
      "error_message": null,
      "result_details": {}
    }
  ]
}
```

#### GET /api/automation/validate-cron

Validate a cron expression.

**Permissions:** `automation:view`

**Query Parameters:**
- `expression` (required): Cron expression to validate

**Response:**
```json
{
  "valid": true,
  "expression": "0 0 * * *"
}
```

## Troubleshooting

### Common Issues

#### Task Not Executing

**Symptoms:** Task is enabled but doesn't run on schedule

**Solutions:**
1. Verify cron expression is valid using the validator
2. Check server logs for errors
3. Ensure automation service is running
4. Verify task is enabled
5. Check execution history for error messages

#### Invalid Cron Expression

**Symptoms:** Error when creating/updating task

**Solutions:**
1. Use the cron validator endpoint
2. Refer to cron format documentation
3. Test with common patterns first
4. Use online cron expression builders

#### Permission Denied

**Symptoms:** Cannot create, edit, or execute tasks

**Solutions:**
1. Verify your user role
2. Check RBAC permission matrix
3. Contact server owner for role upgrade if needed

#### Task Execution Fails

**Symptoms:** Task runs but reports failure status

**Solutions:**
1. Check execution history for specific error
2. Verify RCON connection is active
3. For backup tasks: Check backup script exists and is executable
4. For restart tasks: Verify Docker access
5. For broadcast/command tasks: Test command manually in console

#### Tasks Not Persisting After Restart

**Symptoms:** Tasks disappear after server restart

**Solutions:**
1. Check database file permissions
2. Verify database writes are successful
3. Check server logs for database errors
4. Ensure data directory is writable

### Debug Mode

Enable detailed logging:

1. Check backend logs: `docker-compose logs -f console`
2. Look for `[Automation]` prefixed messages
3. Note any error stack traces

### Getting Help

If issues persist:

1. Check execution history for detailed error messages
2. Review server logs
3. Verify all dependencies are installed
4. Check database integrity
5. Contact server administrator

## Best Practices

### Scheduling

1. **Avoid Peak Hours**: Schedule heavy tasks (backups, restarts) during low-traffic periods
2. **Stagger Tasks**: Don't schedule multiple heavy tasks at the same time
3. **Use Appropriate Intervals**: Consider server load and necessity
4. **Test First**: Manually execute new tasks before enabling scheduled execution

### Task Configuration

1. **Descriptive Names**: Use clear, descriptive names for easy identification
2. **Add Descriptions**: Document task purpose and any special considerations
3. **Warning Times**: For restarts, give players adequate warning (minimum 30 seconds)
4. **Backup Frequency**: Balance between data safety and disk space

### Security

1. **Limit Permissions**: Only grant automation permissions to trusted users
2. **Review Regularly**: Periodically audit tasks for relevance and security
3. **Monitor History**: Check execution logs for suspicious activity
4. **Validate Commands**: Carefully review command tasks before enabling

### Maintenance

1. **Regular Reviews**: Review active tasks monthly
2. **Clean Up**: Delete obsolete or redundant tasks
3. **Monitor Performance**: Check execution durations in history
4. **Update Schedules**: Adjust cron expressions as server needs change

## Advanced Usage

### Complex Cron Patterns

**Business Hours Only:**
```bash
# Monday-Friday, 9 AM to 5 PM, every hour
0 9-17 * * 1-5
```

**Multiple Times Per Day:**
```bash
# 6 AM, noon, 6 PM, midnight
0 6,12,18,0 * * *
```

**Quarterly Backups:**
```bash
# 1st day of Jan, Apr, Jul, Oct at midnight
0 0 1 1,4,7,10 *
```

### Conditional Execution

While not directly supported, you can:

1. Create multiple tasks with different schedules
2. Use command tasks with conditional plugin commands
3. Manually execute tasks based on server state

### Integration with External Systems

**Webhook Notifications:**
Use command tasks to trigger webhook endpoints via custom commands (if supported by plugins).

**Monitoring Integration:**
Parse execution history via API to integrate with monitoring systems.

### Task Chains

To execute tasks in sequence:

1. Create separate tasks for each step
2. Stagger their cron expressions by appropriate intervals
3. Monitor execution history to verify sequence

**Example - Backup and Restart Chain:**
```
Task 1: Backup at 3:00 AM
Task 2: Restart at 3:10 AM (after backup completes)
```

### High-Availability Considerations

1. **Backup Task Frequency**: More frequent for high-value servers
2. **Graceful Restarts**: Always use restart tasks with warnings
3. **Redundancy**: Create backup copies of critical task configurations
4. **Monitoring**: Regularly check execution history for failures

## Conclusion

The Automation & Scheduler system provides a powerful and flexible way to automate your Minecraft server maintenance. By following best practices and understanding the RBAC system, you can ensure reliable, secure, and efficient server operations.

For additional support or feature requests, please consult your server administrator.
