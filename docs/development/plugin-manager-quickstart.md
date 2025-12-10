[← Back to Development](./README.md) | [Documentation Hub](../README.md)

---

# Plugin Manager V2 - Quick Start Guide

## For Server Administrators

### Setup in 3 Steps

#### 1. Generate a Bearer Token

The Plugin Manager V2 uses a secure Bearer token for authentication. Generate one with:

```bash
openssl rand -base64 48
```

This will output something like:
```
8f3K9mL2nP5qR7sT1uV4wX6yZ8aB0cD2eF4gH6iJ8kL0mN2oP4qR6sT8uV0wX2yZ
```

#### 2. Add to Environment Variables

Add the generated token to your `.env` file:

```bash
# In console/.env
PLUGIN_ADMIN_TOKEN=8f3K9mL2nP5qR7sT1uV4wX6yZ8aB0cD2eF4gH6iJ8kL0mN2oP4qR6sT8uV0wX2yZ
```

**Security Notes:**
- Never commit this token to git
- Store securely - anyone with this token can manage plugins
- Use at least 32 characters (48+ recommended)
- Rotate periodically for security

#### 3. Restart the Backend

```bash
# Using docker-compose
docker compose -f docker-compose.console.yml restart

# Or if running directly
cd console/backend
npm start
```

### Verify Setup

Check that the token is configured:

```bash
docker logs minecraft-console | grep "Bearer token"
```

You should see:
```
✓ Bearer token authentication configured
  Token length: 64 characters
  Token prefix: 8f3K9mL2...
```

### Access the UI

1. Navigate to: `http://your-server:3001/console/plugins-v2.html`
2. When prompted, enter your `PLUGIN_ADMIN_TOKEN`
3. The token is saved in browser localStorage for convenience

## Using the API

### Quick Example

```bash
# Set your token
export TOKEN="your-plugin-admin-token"

# Install a plugin
curl -X POST http://localhost:3001/api/v2/plugins/job \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "install",
    "url": "https://github.com/PluginOwner/PluginName/releases/latest"
  }'

# Check job status
curl http://localhost:3001/api/v2/plugins/jobs \
  -H "Authorization: Bearer $TOKEN"
```

### Common Operations

**List all plugins:**
```bash
curl http://localhost:3001/api/v2/plugins/list \
  -H "Authorization: Bearer $TOKEN"
```

**Enable a plugin:**
```bash
curl -X POST http://localhost:3001/api/v2/plugins/job \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"action": "enable", "name": "PluginName"}'
```

**Disable a plugin:**
```bash
curl -X POST http://localhost:3001/api/v2/plugins/job \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"action": "disable", "name": "PluginName"}'
```

**Uninstall a plugin:**
```bash
curl -X POST http://localhost:3001/api/v2/plugins/job \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "uninstall",
    "name": "PluginName",
    "options": {"deleteConfigs": false}
  }'
```

## For Developers

### Automation Script Example

```bash
#!/bin/bash
# install-plugins.sh - Automated plugin installation

TOKEN="your-plugin-admin-token"
API_URL="http://localhost:3001/api/v2/plugins"

# Function to submit a job
submit_job() {
    local action=$1
    local name=$2
    local url=$3
    
    curl -X POST "${API_URL}/job" \
        -H "Authorization: Bearer ${TOKEN}" \
        -H "Content-Type: application/json" \
        -d "{\"action\":\"${action}\",\"name\":\"${name}\",\"url\":\"${url}\"}"
}

# Function to check job status
check_jobs() {
    curl -s "${API_URL}/jobs" \
        -H "Authorization: Bearer ${TOKEN}" | jq '.jobs[] | {id, action, status}'
}

# Install plugins
submit_job "install" "" "https://github.com/PluginOwner/Plugin1/releases/latest"
submit_job "install" "" "https://github.com/PluginOwner/Plugin2/releases/latest"

# Wait a bit
sleep 5

# Check status
check_jobs
```

### Job Polling Example

```python
import requests
import time

TOKEN = "your-plugin-admin-token"
API_URL = "http://localhost:3001/api/v2/plugins"

headers = {"Authorization": f"Bearer {TOKEN}"}

# Submit job
response = requests.post(
    f"{API_URL}/job",
    headers=headers,
    json={"action": "install", "url": "https://example.com/plugin.jar"}
)
job_id = response.json()["job"]["id"]
print(f"Job created: {job_id}")

# Poll until complete
while True:
    response = requests.get(f"{API_URL}/jobs/{job_id}", headers=headers)
    job = response.json()["job"]
    
    print(f"Status: {job['status']}")
    
    if job["status"] in ["completed", "failed", "cancelled"]:
        print(f"Final status: {job['status']}")
        if job.get("error"):
            print(f"Error: {job['error']}")
        if job.get("result"):
            print(f"Result: {job['result']}")
        break
    
    time.sleep(2)
```

## Troubleshooting

### "401 Unauthorized" Error

**Cause:** Invalid or missing Bearer token

**Solution:**
1. Verify `PLUGIN_ADMIN_TOKEN` is set in `.env`
2. Check token matches exactly (no extra spaces)
3. Restart backend after changing token

### Jobs Not Processing

**Cause:** Job worker not running

**Solution:**
1. Check server logs: `docker logs minecraft-console`
2. Look for: `[Startup] ✓ Job worker started`
3. If missing, restart backend

### Token Not Saving in Browser

**Cause:** Browser localStorage blocked

**Solution:**
1. Check browser console for errors
2. Enable localStorage in browser settings
3. Use Private/Incognito mode as test

## Security Best Practices

1. **Token Storage:**
   - Store in environment variables only
   - Never commit to git or share publicly
   - Use different tokens for dev/staging/prod

2. **Token Rotation:**
   - Rotate tokens every 90 days
   - Generate new token: `openssl rand -base64 48`
   - Update in `.env` and restart backend
   - Update in any automation scripts

3. **Access Control:**
   - Limit who has access to the token
   - Use separate tokens for different admins if needed
   - Audit token usage via server logs

4. **Network Security:**
   - Use HTTPS in production
   - Restrict API access to trusted networks
   - Enable firewall rules for port 3001

## Additional Resources

- **Full Documentation:** See [Plugin Manager API](./plugin-manager-api.md)
- **API Reference:** See [Admin Plugin Manager Guide](../admin/plugin-manager.md) section "Version 2"
- **Migration Guide:** See [Plugin Manager API](./plugin-manager-api.md) section "Migration from V1"

## Support

For issues or questions:
1. Check server logs: `docker logs minecraft-console`
2. Review documentation in `docs/`
3. Open an issue on GitHub with logs and error details

---

## Related Documents

- [Plugin Manager API](./plugin-manager-api.md) - Complete API documentation
- [Plugin Diagnostics](../troubleshooting/plugin-diagnostics.md) - Troubleshooting guide
- [Admin Plugin Manager](../admin/plugin-manager.md) - Management guide
- [Security Guide](../admin/security.md) - Security best practices

---

[← Back to Development](./README.md) | [Documentation Hub](../README.md)
