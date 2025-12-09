# User Management & Role-Based Access Control (RBAC)

## Overview

The Minecraft Server Console now supports multi-user authentication with role-based access control. This allows you to grant different levels of access to multiple trusted users while maintaining security and audit trails.

## Key Features

- **Multi-User Authentication**: Support for multiple users with unique credentials
- **Role-Based Access Control (RBAC)**: Four permission levels (Owner, Admin, Moderator, Viewer)
- **Audit Logging**: Track all security-sensitive actions
- **Session Management**: Secure session handling with Redis persistence
- **User Management**: Owner-level interface for managing users and roles

## Roles and Permissions

### Role Hierarchy

The system implements a hierarchical role structure where higher roles inherit permissions from lower roles:

```
Owner > Admin > Moderator > Viewer
```

### Permission Matrix

| Permission | Owner | Admin | Moderator | Viewer |
|------------|-------|-------|-----------|--------|
| **Server Control** |
| Start Server | ✅ | ✅ | ❌ | ❌ |
| Stop Server | ✅ | ✅ | ❌ | ❌ |
| Restart Server | ✅ | ✅ | ❌ | ❌ |
| Kill Server (Emergency) | ✅ | ❌ | ❌ | ❌ |
| Save Worlds | ✅ | ✅ | ✅ | ❌ |
| View Server Stats | ✅ | ✅ | ✅ | ✅ |
| View Server Logs | ✅ | ✅ | ✅ | ✅ |
| **Console Commands** |
| Execute Commands | ✅ | ✅ | ✅ | ❌ |
| View Command History | ✅ | ✅ | ✅ | ✅ |
| **Player Management** |
| Kick Players | ✅ | ✅ | ✅ | ❌ |
| Ban/Pardon Players | ✅ | ✅ | ✅ | ❌ |
| Manage Whitelist | ✅ | ✅ | ✅ | ❌ |
| OP/DeOP Players | ✅ | ✅ | ❌ | ❌ |
| View Player List | ✅ | ✅ | ✅ | ✅ |
| **Backup Management** |
| Create Backups | ✅ | ✅ | ❌ | ❌ |
| Restore Backups | ✅ | ✅ | ❌ | ❌ |
| Delete Backups | ✅ | ✅ | ❌ | ❌ |
| Download Backups | ✅ | ✅ | ✅ | ❌ |
| View Backups | ✅ | ✅ | ✅ | ✅ |
| **Plugin Management** |
| Install Plugins | ✅ | ✅ | ❌ | ❌ |
| Update Plugins | ✅ | ✅ | ❌ | ❌ |
| Delete Plugins | ✅ | ✅ | ❌ | ❌ |
| Enable/Disable Plugins | ✅ | ✅ | ✅ | ❌ |
| Reload Plugins | ✅ | ✅ | ✅ | ❌ |
| View Plugins | ✅ | ✅ | ✅ | ✅ |
| **File Management** |
| Upload Files | ✅ | ✅ | ❌ | ❌ |
| Edit Files | ✅ | ✅ | ❌ | ❌ |
| Delete Files | ✅ | ✅ | ❌ | ❌ |
| Download Files | ✅ | ✅ | ✅ | ❌ |
| View Files | ✅ | ✅ | ✅ | ✅ |
| **Configuration** |
| Edit Configuration | ✅ | ✅ | ❌ | ❌ |
| View Configuration | ✅ | ✅ | ✅ | ✅ |
| **User Management** |
| Create Users | ✅ | ❌ | ❌ | ❌ |
| Edit Users | ✅ | ❌ | ❌ | ❌ |
| Delete Users | ✅ | ❌ | ❌ | ❌ |
| Change User Roles | ✅ | ❌ | ❌ | ❌ |
| View Users | ✅ | ✅ | ❌ | ❌ |
| **Audit Logs** |
| View Audit Logs | ✅ | ❌ | ❌ | ❌ |
| Export Audit Logs | ✅ | ❌ | ❌ | ❌ |

### Role Descriptions

#### Owner
- **Full system access** with no restrictions
- Can manage all users and roles
- Can view and export audit logs
- Can perform emergency operations (force kill)
- **Note**: At least one Owner account must exist at all times

#### Admin
- **Administrative access** for day-to-day server management
- Can control server, manage players, backups, and plugins
- Can view (but not manage) user list
- Cannot perform emergency kill or manage users/roles
- Ideal for trusted server administrators

#### Moderator
- **Moderation access** for player management and basic operations
- Can kick/ban players, manage whitelist
- Can enable/disable plugins and view configurations
- Cannot start/stop server or manage backups
- Ideal for community moderators

#### Viewer
- **Read-only access** to monitor server status
- Can view stats, logs, players, plugins, and files
- Cannot perform any modifications or execute commands
- Ideal for monitoring or observer accounts

## User Management

### Initial Setup

The system automatically creates an Owner account on first startup using environment variables:

```bash
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your-secure-password
```

### Creating Users (Owner Only)

**API Endpoint**: `POST /api/users`

```bash
curl -X POST http://localhost:3001/api/users \
  -H "Content-Type: application/json" \
  -H "CSRF-Token: <token>" \
  -b "console.sid=<session-cookie>" \
  -d '{
    "username": "newuser",
    "password": "secure-password-123",
    "role": "admin"
  }'
```

**Requirements**:
- Username: 3-32 characters, alphanumeric plus `-` and `_`
- Password: Minimum 8 characters
- Role: One of `owner`, `admin`, `moderator`, `viewer`

### Managing Users (Owner Only)

#### Change User Role
```bash
PUT /api/users/:username/role
{
  "role": "moderator"
}
```

#### Change User Password
```bash
PUT /api/users/:username/password
{
  "password": "new-secure-password"
}
```

#### Enable/Disable User
```bash
PUT /api/users/:username/status
{
  "enabled": false
}
```

#### Delete User
```bash
DELETE /api/users/:username
```

**Protections**:
- Cannot modify your own account
- Cannot delete the last Owner account
- Cannot disable your own account

### Viewing Users

**List All Users** (Owner/Admin):
```bash
GET /api/users
```

**Get Specific User** (Owner):
```bash
GET /api/users/:username
```

Response includes:
- Username
- Role
- Creation date and creator
- Last login timestamp
- Enabled status

## Audit Logging

All security-sensitive actions are logged with:
- Timestamp
- Event type
- Username
- IP address
- Event details

### Logged Events

**Authentication**:
- Login success/failure
- Logout
- Session expiration

**User Management**:
- User creation, updates, deletion
- Role changes
- Password changes
- Account enable/disable

**Server Operations**:
- Server start, stop, restart, kill
- Configuration changes

**Backups**:
- Backup creation, restoration, deletion

**Plugins**:
- Plugin installation, updates, deletion

**Critical Commands**:
- Execution of dangerous commands (ban, pardon, whitelist, etc.)

### Viewing Audit Logs (Owner Only)

**Get Audit Logs**:
```bash
GET /api/audit/logs?limit=100&username=admin&eventType=auth.login.success
```

Query parameters:
- `limit`: Max entries (default: 100)
- `username`: Filter by username
- `eventType`: Filter by event type
- `startDate`: ISO 8601 date
- `endDate`: ISO 8601 date

**Export Audit Logs**:
```bash
GET /api/audit/export
```

Downloads a JSON file with filtered audit logs.

### Sample Audit Log Entry

```json
{
  "timestamp": "2024-01-15T10:30:45.123Z",
  "eventType": "user.created",
  "username": "admin",
  "ipAddress": "192.168.1.100",
  "details": {
    "newUsername": "moderator1",
    "role": "moderator",
    "createdBy": "admin"
  }
}
```

## Migration Guide

### Migrating from Single Admin to Multi-User

1. **Before Migration**:
   - Note your current `ADMIN_USERNAME` and `ADMIN_PASSWORD` from `.env`
   - This account will become the first Owner account

2. **During First Startup**:
   - The system automatically creates a `users.json` file
   - Your admin account is converted to Owner role
   - Password is hashed using bcrypt
   - Creation timestamp is recorded

3. **After Migration**:
   - Login with your existing credentials
   - Navigate to User Management (Owner only)
   - Create additional user accounts as needed
   - Assign appropriate roles

4. **File Locations**:
   - User data: `console/backend/config/users.json`
   - Password hash: `console/backend/config/.password_hash`
   - Audit logs: `console/backend/data/audit.log`

### Existing Users.json

If you already have a `users.json` file without role fields:

1. **Backup your current file**:
   ```bash
   cp console/backend/config/users.json console/backend/config/users.json.backup
   ```

2. **Add role field** to each user:
   ```json
   {
     "users": [
       {
         "username": "admin",
         "password": "$2a$10$...",
         "role": "owner",
         "createdAt": "2024-01-01T00:00:00.000Z",
         "createdBy": "system",
         "enabled": true
       }
     ]
   }
   ```

3. **Restart the console** to apply changes

## Security Best Practices

### Password Security

1. **Use Strong Passwords**:
   - Minimum 12 characters
   - Mix of uppercase, lowercase, numbers, symbols
   - Avoid common words or patterns

2. **Password Generation**:
   ```bash
   # Generate secure password
   openssl rand -base64 32
   ```

3. **Regular Password Rotation**:
   - Change passwords every 90 days
   - Force change after security incidents

### Access Control

1. **Principle of Least Privilege**:
   - Grant minimum necessary permissions
   - Use Viewer role for monitoring-only access
   - Reserve Owner role for infrastructure admins

2. **Regular Access Review**:
   - Audit user list monthly
   - Disable unused accounts
   - Remove former team members promptly

3. **Session Security**:
   - Sessions expire after 24 hours
   - Logout when finished
   - Use secure HTTPS connections

### Audit and Monitoring

1. **Review Audit Logs Regularly**:
   - Check for failed login attempts
   - Monitor critical operations
   - Investigate suspicious activity

2. **Export Logs for Compliance**:
   - Archive audit logs monthly
   - Store in secure location
   - Meet regulatory requirements

3. **Monitor User Activity**:
   - Track last login timestamps
   - Identify inactive accounts
   - Detect anomalous behavior

### Multi-Factor Authentication (Future)

Currently not implemented, but planned:
- TOTP (Time-based One-Time Password)
- Hardware security keys
- IP-based restrictions

## API Reference

### Authentication Endpoints

| Method | Endpoint | Description | Auth Required | Role Required |
|--------|----------|-------------|---------------|---------------|
| POST | `/api/login` | Login | No | - |
| POST | `/api/logout` | Logout | Yes | - |
| GET | `/api/session` | Check session | No | - |

### User Management Endpoints

| Method | Endpoint | Description | Auth Required | Role Required |
|--------|----------|-------------|---------------|---------------|
| GET | `/api/users` | List all users | Yes | Owner |
| GET | `/api/users/:username` | Get user details | Yes | Owner |
| POST | `/api/users` | Create user | Yes | Owner |
| PUT | `/api/users/:username/role` | Change role | Yes | Owner |
| PUT | `/api/users/:username/password` | Change password | Yes | Owner |
| PUT | `/api/users/:username/status` | Enable/disable | Yes | Owner |
| DELETE | `/api/users/:username` | Delete user | Yes | Owner |

### Audit Log Endpoints

| Method | Endpoint | Description | Auth Required | Role Required |
|--------|----------|-------------|---------------|---------------|
| GET | `/api/audit/logs` | View audit logs | Yes | Owner |
| GET | `/api/audit/export` | Export audit logs | Yes | Owner |

## Troubleshooting

### Cannot Login

**Problem**: Invalid credentials error

**Solutions**:
1. Verify username and password in `.env`
2. Check `users.json` exists and is readable
3. Review console logs for authentication errors
4. Ensure account is enabled (`"enabled": true`)

### Permission Denied

**Problem**: 403 error when accessing features

**Solutions**:
1. Check your role in session: `GET /api/session`
2. Review permission matrix above
3. Contact Owner to upgrade role if needed
4. Check audit logs for access denied events

### Session Expires Frequently

**Problem**: Forced to login repeatedly

**Solutions**:
1. Check Redis connection (production)
2. Verify SESSION_SECRET is set
3. Check cookie security settings
4. Ensure browser accepts cookies

### Audit Logs Not Recording

**Problem**: No entries in audit logs

**Solutions**:
1. Check `console/backend/data/` directory exists
2. Verify write permissions on `audit.log`
3. Review console logs for errors
4. Ensure audit service initialized

## File Structure

```
console/backend/
├── auth/
│   └── auth.js                 # User authentication and management
├── config/
│   ├── rbac.js                 # Role and permission definitions
│   ├── users.json              # User database (auto-generated)
│   ├── users.json.example      # Example user configuration
│   └── users.schema.json       # JSON schema for validation
├── middleware/
│   └── rbac.js                 # RBAC middleware
├── routes/
│   ├── users.js                # User management API
│   └── audit.js                # Audit log API
├── services/
│   └── auditLog.js             # Audit logging service
└── data/
    └── audit.log               # Audit log file (auto-generated)
```

## Support and Contributing

For issues, questions, or contributions:

1. Check existing documentation
2. Review GitHub Issues
3. Submit pull requests with tests
4. Follow security disclosure policy

## License

Same as parent project - see LICENSE file.
