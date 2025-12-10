[← Back to Development](./README.md) | [Documentation Hub](../README.md)

---

# Plugin Manager V2 - Job Queue System

## Overview

The Plugin Manager V2 introduces a modern, asynchronous job queue system that eliminates UI freezes, provides real-time progress tracking, and uses simple Bearer token authentication.

## Architecture

```
┌─────────────────┐
│   Frontend UI   │ ──► Submits jobs via REST API
└────────┬────────┘
         │ Polls every 2s
         ▼
┌─────────────────┐
│   REST API      │ ──► Authenticated via Bearer token
│ /api/v2/plugins │     No sessions or CSRF needed
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Job Queue     │ ──► Persistent queue in plugin-jobs.json
│                 │     Stores job state, logs, results
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Job Worker    │ ──► Background worker processes jobs
│                 │     Updates status and logs in real-time
│                 │     Runs every 2 seconds
└─────────────────┘
```

## Key Components

### 1. Job Queue Service (`services/jobQueue.js`)

**Responsibilities:**
- Persist jobs to `data/plugin-jobs.json`
- Create, read, update jobs
- Add log entries to jobs
- Track job lifecycle

**Job Structure:**
```javascript
{
  id: "job-1701234567890-abc123",
  action: "install",        // install, uninstall, update, enable, disable
  pluginName: "MyPlugin",
  url: "https://...",
  options: {},
  status: "queued",         // queued, running, completed, failed, cancelled
  logs: [
    { timestamp: "2024-12-09T10:30:00Z", message: "Started install operation" }
  ],
  error: null,
  result: null,
  createdAt: "2024-12-09T10:30:00Z",
  startedAt: null,
  completedAt: null
}
```

### 2. Job Worker (`services/jobWorker.js`)

**Responsibilities:**
- Poll queue every 2 seconds for queued jobs
- Execute one job at a time
- Update job status and logs during execution
- Handle errors and cancellations
- Graceful shutdown on server stop

**Job Execution Flow:**
1. Worker finds next `queued` job
2. Updates status to `running`
3. Executes plugin operation (install/uninstall/etc.)
4. Logs progress to job
5. Updates status to `completed` or `failed`
6. Moves to next job

### 3. Bearer Token Authentication (`auth/bearerAuth.js`)

**Responsibilities:**
- Verify Bearer tokens from `Authorization` header
- Support both Bearer token and session authentication
- Skip CSRF for Bearer token requests
- Constant-time token comparison (security)

**Token Format:**
```
Authorization: Bearer <your-token-here>
```

**Environment Variable:**
```bash
PLUGIN_ADMIN_TOKEN=your-secure-token-minimum-32-chars
```

### 4. REST API Routes (`routes/pluginsV2.js`)

**Endpoints:**

| Method | Path | Description |
|--------|------|-------------|
| POST | `/job` | Submit a new job |
| GET | `/jobs` | List recent jobs |
| GET | `/jobs/:id` | Get specific job |
| PUT | `/job/:id/cancel` | Cancel a job |
| GET | `/list` | List all plugins |
| GET | `/health` | Health check |

**All endpoints:**
- Require Bearer token authentication
- Support both `Authorization: Bearer` and legacy session auth
- Skip CSRF validation for Bearer tokens
- Rate limited (30 requests/minute)

### 5. Frontend UI (`frontend/plugins-v2.html`, `frontend/js/pluginsV2.js`)

**Features:**
- Bearer token stored in localStorage
- Real-time job status polling (every 2 seconds)
- Live log display in job details modal
- Install, enable/disable, uninstall operations
- No UI freezes - all operations are async
- Status badges with color coding
- Job cancellation

## Usage Examples

### Web Interface

1. **Access UI:**
   - Navigate to `/console/plugins-v2.html`
   - Enter Bearer token when prompted
   - Token is saved in browser for future visits

2. **Install a plugin:**
   - Paste plugin URL
   - Click "Install Plugin"
   - Watch job status in real-time
   - View logs in job details

3. **Manage plugins:**
   - Toggle enable/disable switches
   - Click uninstall for any plugin
   - All operations create jobs

### API Examples

**Submit an install job:**
```bash
curl -X POST http://localhost:3001/api/v2/plugins/job \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "install",
    "url": "https://github.com/owner/plugin/releases/latest"
  }'
```

**Poll for job status:**
```bash
# Get all jobs
curl http://localhost:3001/api/v2/plugins/jobs \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get only active jobs
curl "http://localhost:3001/api/v2/plugins/jobs?status=running" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get last 5 jobs
curl "http://localhost:3001/api/v2/plugins/jobs?limit=5" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Get specific job:**
```bash
curl http://localhost:3001/api/v2/plugins/jobs/job-123 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Cancel a job:**
```bash
curl -X PUT http://localhost:3001/api/v2/plugins/job/job-123/cancel \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**List all plugins:**
```bash
curl http://localhost:3001/api/v2/plugins/list \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Job Actions

### Install
```json
{
  "action": "install",
  "url": "https://github.com/owner/plugin/releases/latest",
  "options": {
    "customName": "MyPlugin"  // optional
  }
}
```

### Uninstall
```json
{
  "action": "uninstall",
  "name": "MyPlugin",
  "options": {
    "deleteConfigs": false  // optional, default: false
  }
}
```

### Update
```json
{
  "action": "update",
  "name": "MyPlugin",
  "url": "https://github.com/owner/plugin/releases/latest"
}
```

### Enable/Disable
```json
{
  "action": "enable",  // or "disable"
  "name": "MyPlugin"
}
```

## Error Handling

### Job Failures

When a job fails, the error is captured in the job object:

```json
{
  "id": "job-123",
  "status": "failed",
  "error": "Plugin conflict: MyPlugin already exists (1.0.0 -> 1.1.0, upgrade). Use update action instead.",
  "logs": [
    {"timestamp": "...", "message": "Started install operation"},
    {"timestamp": "...", "message": "Failed: Plugin conflict..."}
  ]
}
```

### Common Errors

1. **Plugin already exists**
   - Error: `Plugin conflict: MyPlugin already exists`
   - Solution: Use `update` action instead of `install`

2. **Invalid URL**
   - Error: `Invalid plugin file: Missing or corrupt plugin.yml`
   - Solution: Verify the URL points to a valid JAR file

3. **Permission errors**
   - Error: `Plugins directory not accessible or not writable`
   - Solution: Check directory permissions

4. **Download timeout**
   - Error: `Download timeout - file writing took too long`
   - Solution: Check network connectivity or increase timeout

## Security

### Bearer Token

- **Minimum length:** 32 characters (48+ recommended)
- **Generation:** Use `openssl rand -base64 48`
- **Storage:** Environment variable `PLUGIN_ADMIN_TOKEN`
- **Validation:** Constant-time comparison to prevent timing attacks
- **Never commit:** Add to `.gitignore`, use `.env` file

### Rate Limiting

- 30 requests per minute per IP
- Applies to all V2 plugin endpoints
- Returns 429 status when exceeded

### No CSRF Required

Bearer token authentication bypasses CSRF validation:
- Stateless design
- No session cookies needed
- Simpler for API clients and automation

## Performance

### Job Processing

- **Worker interval:** 2 seconds
- **Concurrent jobs:** 1 (sequential processing)
- **Job timeout:** Determined by plugin operation (typically 2 minutes for downloads)
- **Queue limit:** 100 recent jobs (auto-cleanup)

### Polling

- **Frontend polling interval:** 2 seconds
- **Efficient:** Only fetches job updates, not full plugin list
- **Auto-stops:** When user leaves page

### File Operations

- **Atomic writes:** Jobs written to temp file then renamed
- **Backup creation:** Before updating existing plugins
- **Cleanup:** Old jobs pruned automatically

## Monitoring

### Health Check

```bash
curl http://localhost:3001/api/v2/plugins/health \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**
```json
{
  "status": "healthy",
  "checks": {
    "pluginsJson": {
      "status": "ok",
      "message": "Found 15 plugins"
    },
    "pluginsDir": {
      "status": "ok",
      "message": "Directory is writable"
    },
    "jobWorker": {
      "status": "idle",
      "message": "No active jobs"
    }
  }
}
```

### Logs

- Server logs show job creation, execution, completion
- Each job has detailed logs array
- Worker logs show polling and execution details

**Example server logs:**
```
[JobQueue] Created job job-123: install https://...
[JobWorker] Processing job job-123: install https://...
[JobQueue] Updated job job-123: running
[JobQueue] Updated job job-123: completed
[JobWorker] Job job-123 completed successfully
```

## Troubleshooting

### Jobs stuck in queued state

**Symptoms:** Jobs never start processing

**Causes:**
1. Worker not running
2. Previous job blocking queue
3. Worker crashed

**Solutions:**
1. Check server logs for worker startup: `[Startup] ✓ Job worker started`
2. Restart backend server
3. Check for errors in server logs

### Bearer token not working

**Symptoms:** 401 Unauthorized responses

**Causes:**
1. Token not set in environment
2. Token too short (<32 chars)
3. Wrong token provided

**Solutions:**
1. Verify `PLUGIN_ADMIN_TOKEN` in `.env`
2. Check server logs: `✓ Bearer token authentication configured`
3. Regenerate token with `openssl rand -base64 48`

### Jobs failing immediately

**Symptoms:** Jobs go straight to `failed` status

**Causes:**
1. Invalid input (missing required fields)
2. Plugin directory permissions
3. Network issues

**Solutions:**
1. Check job error field for specific message
2. View job logs in detail modal
3. Check server logs for stack traces
4. Verify plugins directory is writable

### UI not updating

**Symptoms:** Job status not refreshing

**Causes:**
1. Polling stopped
2. Bearer token expired/invalid
3. Network issues

**Solutions:**
1. Check browser console for errors
2. Re-enter Bearer token
3. Hard refresh page (Ctrl+Shift+R)
4. Check network tab for failed requests

## Migration from V1

### For End Users

1. Continue using `/console/plugins.html` (V1) - it still works
2. Optionally switch to `/console/plugins-v2.html` for better UX
3. Both UIs manage the same plugins

### For API Clients

**V1 (session-based):**
```bash
# Login
curl -c cookies.txt -X POST http://localhost:3001/api/login \
  -d '{"username":"admin","password":"pass"}'

# Get CSRF token
CSRF=$(curl -b cookies.txt http://localhost:3001/api/csrf-token | jq -r '.csrfToken')

# Install plugin
curl -b cookies.txt -X POST http://localhost:3001/api/plugins/install \
  -H "CSRF-Token: $CSRF" \
  -d '{"url":"..."}'
```

**V2 (Bearer token):**
```bash
# Install plugin (single request!)
curl -X POST http://localhost:3001/api/v2/plugins/job \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"action":"install","url":"..."}'

# Check status
curl http://localhost:3001/api/v2/plugins/jobs \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Benefits of V2:**
- No login/session management
- No CSRF token handling
- Simpler authentication
- Non-blocking operations
- Better error tracking

## Development

### Running Locally

1. Install dependencies:
   ```bash
   cd console/backend
   npm install
   ```

2. Set environment variables:
   ```bash
   cp .env.example .env
   # Edit .env and set PLUGIN_ADMIN_TOKEN
   ```

3. Start server:
   ```bash
   npm start
   ```

4. Access UI:
   - V2: http://localhost:3001/console/plugins-v2.html
   - V1: http://localhost:3001/console/plugins.html

### Testing

**Test job creation:**
```javascript
const jobQueue = require('./services/jobQueue');

const job = await jobQueue.createJob({
  action: 'install',
  url: 'https://example.com/plugin.jar'
});

console.log('Job created:', job.id);
```

**Test job worker:**
```javascript
const jobWorker = require('./services/jobWorker');

// Start worker
jobWorker.startWorker();

// Process next job manually
await jobWorker.processNextJob();

// Stop worker
jobWorker.stopWorker();
```

**Test Bearer auth:**
```bash
# Invalid token
curl http://localhost:3001/api/v2/plugins/list \
  -H "Authorization: Bearer wrong-token"
# Returns: 401 Unauthorized

# Valid token
curl http://localhost:3001/api/v2/plugins/list \
  -H "Authorization: Bearer correct-token"
# Returns: Plugin list
```

## Future Enhancements

- [ ] Priority queue for critical jobs
- [ ] Job retry mechanism for transient failures
- [ ] Job scheduling (install at specific time)
- [ ] Batch operations (install multiple plugins in one job)
- [ ] Job notifications (webhook, email)
- [ ] Job dependencies (install A before B)
- [ ] Pause/resume queue
- [ ] Job history export
- [ ] Plugin update checker (auto-create update jobs)
- [ ] Multi-worker support for parallel execution

## License

MIT

---

## Related Documents

- [Plugin Manager Quickstart](./plugin-manager-quickstart.md) - Quick setup guide
- [Plugin Diagnostics](../troubleshooting/plugin-diagnostics.md) - Troubleshooting plugin issues
- [Admin Guide](../admin/plugin-manager.md) - Plugin management guide
- [Plugins Guide](../admin/plugins.md) - Plugin configuration

---

[← Back to Development](./README.md) | [Documentation Hub](../README.md)
