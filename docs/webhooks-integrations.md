# Webhooks & Integrations Guide

## Overview

The Minecraft Console provides powerful webhook capabilities for integrating with external services and automation tools. Webhooks enable bidirectional communication:

- **Outbound Webhooks**: Send notifications when server events occur
- **Inbound Webhooks**: Receive commands from external services to trigger server actions

## Table of Contents

- [Outbound Webhooks](#outbound-webhooks)
  - [Event Types](#event-types)
  - [Creating a Webhook](#creating-a-webhook)
  - [Integration Templates](#integration-templates)
  - [Webhook Security](#webhook-security)
- [Inbound Webhooks](#inbound-webhooks)
  - [Available Actions](#available-actions)
  - [Security](#inbound-webhook-security)
  - [Examples](#inbound-webhook-examples)
- [Popular Integrations](#popular-integrations)
  - [Discord](#discord-integration)
  - [Slack](#slack-integration)
  - [Custom Services](#custom-integrations)
- [Troubleshooting](#troubleshooting)
- [Security Best Practices](#security-best-practices)

---

## Outbound Webhooks

Outbound webhooks allow you to send HTTP requests to external services when specific events occur on your Minecraft server.

### Event Types

The console supports the following event types:

#### Server Events
- `server.start` - Server has started
- `server.stop` - Server has stopped
- `server.restart` - Server is restarting
- `server.crash` - Server has crashed

#### Player Events
- `player.join` - Player joined the server
- `player.leave` - Player left the server
- `player.chat` - Player sent a chat message
- `player.death` - Player died
- `player.achievement` - Player earned an achievement

#### Admin Events
- `player.kick` - Player was kicked
- `player.ban` - Player was banned
- `player.pardon` - Player was unbanned
- `player.op` - Player was given operator status

#### Automation Events
- `automation.executed` - Scheduled task executed
- `backup.completed` - Backup completed successfully
- `backup.failed` - Backup failed

#### Alert Events
- `alert.critical` - Critical system alert
- `alert.warning` - Warning alert

#### Special
- `*` - All events (use with caution)

### Creating a Webhook

1. Navigate to **Webhooks** in the console
2. Click **Create Webhook**
3. Fill in the webhook details:
   - **Name**: Descriptive name for the webhook
   - **URL**: The endpoint URL to send requests to
   - **Method**: HTTP method (POST, PUT, PATCH)
   - **Event Types**: Select which events trigger this webhook
   - **Enabled**: Whether the webhook is active

### Webhook Payload

Outbound webhooks send a JSON payload with the following structure:

```json
{
  "event_type": "player.join",
  "timestamp": "2024-12-09T19:45:00.000Z",
  "data": {
    "player": "Steve",
    "uuid": "069a79f4-44e9-4726-a5be-fca90e38aaf5",
    "ip": "192.168.1.100"
  },
  "server": {
    "name": "Minecraft Server"
  }
}
```

### Webhook Headers

Every webhook request includes:

```
User-Agent: Minecraft-Console-Webhook/1.0
X-Webhook-Event: player.join
X-Webhook-Signature: sha256=<hmac_signature>
X-Webhook-Signature-256: sha256=<hmac_signature>
Content-Type: application/json
```

### HMAC Signature Verification

Webhooks are signed with HMAC-SHA256 for security. To verify:

```javascript
const crypto = require('crypto');

function verifySignature(payload, signature, secret) {
    const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(JSON.stringify(payload))
        .digest('hex');
    
    return crypto.timingSafeEqual(
        Buffer.from(signature.replace('sha256=', '')),
        Buffer.from(expectedSignature)
    );
}
```

```python
import hmac
import hashlib

def verify_signature(payload, signature, secret):
    expected_signature = hmac.new(
        secret.encode(),
        payload.encode(),
        hashlib.sha256
    ).hexdigest()
    
    return hmac.compare_digest(
        signature.replace('sha256=', ''),
        expected_signature
    )
```

### Retry Logic

Failed webhook deliveries are automatically retried:
- Maximum retries: 3 (configurable)
- Backoff strategy: Exponential (1s, 2s, 4s)
- Timeout: 30 seconds (configurable)

---

## Integration Templates

### Discord Integration

Discord webhooks are built-in and formatted with rich embeds.

**Setup:**
1. In your Discord server, go to Server Settings → Integrations → Webhooks
2. Create a new webhook and copy the URL
3. In the Console, create a webhook with template "Discord"
4. Paste your Discord webhook URL
5. Select events to monitor

**Example Discord Payload:**
```json
{
  "username": "Minecraft Server",
  "avatar_url": "https://www.minecraft.net/.../minecraft-creeper-icon.jpg",
  "embeds": [{
    "title": "Player Joined",
    "description": "Steve joined the server",
    "color": 3447003,
    "timestamp": "2024-12-09T19:45:00.000Z",
    "fields": [
      {
        "name": "Player",
        "value": "Steve",
        "inline": true
      },
      {
        "name": "UUID",
        "value": "069a79f4-44e9-4726-a5be-fca90e38aaf5",
        "inline": true
      }
    ]
  }]
}
```

### Slack Integration

Slack webhooks use the Incoming Webhooks app.

**Setup:**
1. In Slack, go to Apps → Incoming Webhooks
2. Add to your workspace and select a channel
3. Copy the webhook URL
4. In the Console, create a webhook with template "Slack"
5. Paste your Slack webhook URL

**Example Slack Payload:**
```json
{
  "text": "Player Joined",
  "blocks": [
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "Steve joined the server"
      }
    }
  ]
}
```

---

## Inbound Webhooks

Inbound webhooks allow external services to trigger actions on your Minecraft server.

### Available Actions

- `server.start` - Start the server
- `server.stop` - Stop the server
- `server.restart` - Restart the server
- `command.execute` - Execute a Minecraft command
- `broadcast` - Broadcast a message to all players
- `player.kick` - Kick a player
- `player.ban` - Ban a player
- `player.pardon` - Unban a player
- `automation.trigger` - Trigger a scheduled automation task

### Creating an Inbound Webhook

1. Navigate to **Webhooks** → **Inbound Webhooks**
2. Click **Create Inbound Webhook**
3. Configure:
   - **Name**: Descriptive name
   - **Actions**: Select allowed actions
   - **Allowed IPs**: Optional IP whitelist (e.g., `192.168.1.*, 10.0.0.100`)
   - **Enabled**: Active status

4. Copy the generated webhook URL

### Inbound Webhook Security

#### HMAC Signature

All inbound webhook requests must include an HMAC signature:

```bash
# Generate signature
payload='{"action":"broadcast","data":{"message":"Hello World"}}'
secret="your-webhook-secret"
signature=$(echo -n "$payload" | openssl dgst -sha256 -hmac "$secret" | cut -d' ' -f2)

# Send request
curl -X POST \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Signature: sha256=$signature" \
  -d "$payload" \
  "https://your-server.com/api/webhooks/receive/inbound-webhook-123"
```

#### IP Whitelisting

Restrict webhook access to specific IP addresses or CIDR ranges:
- `192.168.1.100` - Single IP
- `192.168.1.*` - Wildcard
- Leave empty to allow all IPs (not recommended for production)

### Inbound Webhook Examples

#### Execute a Command

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Signature: sha256=<signature>" \
  -d '{"action":"command.execute","data":{"command":"time set day"}}' \
  "https://your-server.com/api/webhooks/receive/webhook-id"
```

#### Broadcast Message

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Signature: sha256=<signature>" \
  -d '{"action":"broadcast","data":{"message":"Server restarting in 5 minutes"}}' \
  "https://your-server.com/api/webhooks/receive/webhook-id"
```

#### Kick Player

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Signature: sha256=<signature>" \
  -d '{"action":"player.kick","data":{"player":"BadPlayer","reason":"Violation of rules"}}' \
  "https://your-server.com/api/webhooks/receive/webhook-id"
```

---

## Popular Integrations

### Discord Bot Integration

Create a Discord bot that responds to commands and triggers server actions:

```javascript
const Discord = require('discord.js');
const crypto = require('crypto');
const axios = require('axios');

const client = new Discord.Client();
const WEBHOOK_URL = 'https://your-server.com/api/webhooks/receive/webhook-id';
const WEBHOOK_SECRET = 'your-secret';

client.on('message', async (message) => {
    if (message.content === '!start') {
        const payload = { action: 'server.start' };
        const signature = crypto
            .createHmac('sha256', WEBHOOK_SECRET)
            .update(JSON.stringify(payload))
            .digest('hex');

        try {
            await axios.post(WEBHOOK_URL, payload, {
                headers: {
                    'X-Webhook-Signature': `sha256=${signature}`,
                    'Content-Type': 'application/json'
                }
            });
            message.reply('Server starting!');
        } catch (error) {
            message.reply('Failed to start server');
        }
    }
});

client.login('your-bot-token');
```

### GitHub Actions Integration

Trigger server actions from GitHub workflows:

```yaml
name: Deploy Plugin
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Server Restart
        run: |
          payload='{"action":"server.restart"}'
          signature=$(echo -n "$payload" | openssl dgst -sha256 -hmac "${{ secrets.WEBHOOK_SECRET }}" | cut -d' ' -f2)
          
          curl -X POST \
            -H "Content-Type: application/json" \
            -H "X-Webhook-Signature: sha256=$signature" \
            -d "$payload" \
            "${{ secrets.WEBHOOK_URL }}"
```

### Monitoring Integration

Send webhooks to monitoring services like PagerDuty, Datadog, or custom dashboards.

---

## Troubleshooting

### Webhook Delivery Failures

**Check delivery logs:**
1. Go to Webhooks → Delivery Logs
2. Review failed deliveries
3. Check error messages and response codes

**Common issues:**
- **SSL Certificate errors**: Disable "Verify SSL" for self-signed certificates (not recommended for production)
- **Timeout errors**: Increase timeout or check target service availability
- **Authentication errors**: Verify webhook URL and any required authentication

### Signature Verification Failures

**Symptoms:**
- Inbound webhook returns "Invalid signature" error

**Solutions:**
1. Verify the secret is correct
2. Ensure payload is sent as JSON string (not object)
3. Check header name: `X-Webhook-Signature` or `X-Webhook-Signature-256`
4. Verify signature format: `sha256=<hash>`

### IP Whitelist Issues

**Symptoms:**
- Inbound webhook returns "IP address not whitelisted"

**Solutions:**
1. Check your actual IP address
2. Use wildcards for dynamic IPs: `192.168.1.*`
3. Remove IP restrictions for testing (add back for production)

---

## Security Best Practices

### For Outbound Webhooks

1. **Always verify HMAC signatures** on the receiving end
2. **Use HTTPS** for webhook URLs
3. **Keep secrets secure** - never commit to version control
4. **Limit event types** - only subscribe to needed events
5. **Monitor delivery logs** for suspicious activity

### For Inbound Webhooks

1. **Always enable signature verification**
2. **Use IP whitelisting** when possible
3. **Rotate secrets regularly** (at least every 90 days)
4. **Limit actions** to minimum required permissions
5. **Monitor usage logs** for unauthorized access attempts
6. **Use HTTPS** for all webhook endpoints
7. **Implement rate limiting** on receiving end

### Secret Management

**Generate strong secrets:**
```bash
# Generate a secure 32-byte secret
openssl rand -hex 32
```

**Store secrets securely:**
- Use environment variables
- Use secret management services (AWS Secrets Manager, HashiCorp Vault)
- Never hardcode in source code
- Rotate regularly

### Webhook URL Security

**DO:**
- Use HTTPS
- Include authentication tokens in headers (not URL)
- Use unpredictable webhook IDs

**DON'T:**
- Expose webhook URLs publicly
- Include secrets in URLs
- Reuse webhook URLs across environments

---

## API Reference

### Outbound Webhook Endpoints

```
GET    /api/webhooks                 - List all webhooks
GET    /api/webhooks/:id             - Get webhook details
POST   /api/webhooks                 - Create webhook
PUT    /api/webhooks/:id             - Update webhook
DELETE /api/webhooks/:id             - Delete webhook
POST   /api/webhooks/:id/test        - Test webhook
POST   /api/webhooks/:id/trigger     - Manually trigger webhook
GET    /api/webhooks/:id/logs        - Get webhook delivery logs
GET    /api/webhooks/templates/all   - Get integration templates
```

### Inbound Webhook Endpoints

```
GET    /api/webhooks/inbound/all           - List all inbound webhooks
GET    /api/webhooks/inbound/:id           - Get inbound webhook details
POST   /api/webhooks/inbound               - Create inbound webhook
PUT    /api/webhooks/inbound/:id           - Update inbound webhook
DELETE /api/webhooks/inbound/:id           - Delete inbound webhook
POST   /api/webhooks/inbound/:id/regenerate-secret - Regenerate secret
POST   /api/webhooks/receive/:id           - Receive webhook (public)
```

---

## Examples

### Complete Discord Integration Example

See [Discord Integration Guide](./discord-webhook-guide.md) for a complete setup guide with bot commands and role-based access.

### Complete Slack Integration Example

See [Slack Integration Guide](./slack-webhook-guide.md) for slash commands and interactive messages.

---

## Support

For issues or questions:
- Check the [Troubleshooting](#troubleshooting) section
- Review delivery logs in the console
- Check audit logs for access issues
- Consult the [Security Best Practices](#security-best-practices)

---

**Last Updated**: December 2024  
**Version**: 1.0
