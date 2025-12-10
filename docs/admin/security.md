← [Back to Admin Guide](./README.md) | [Documentation Home](../README.md)

---

# Security Policy

## Supported Versions

We release patches for security vulnerabilities for the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 1.x     | :white_check_mark: |

## Reporting a Vulnerability

We take the security of our Minecraft server project seriously. If you believe you have found a security vulnerability, please report it to us as described below.

### How to Report

**Please do not report security vulnerabilities through public GitHub issues.**

Instead, please report them by creating a private security advisory on GitHub or by contacting the repository maintainers directly.

You should receive a response within 48 hours. If for some reason you do not, please follow up to ensure we received your original message.

Please include the following information in your report:

- Type of issue (e.g., buffer overflow, SQL injection, cross-site scripting, etc.)
- Full paths of source file(s) related to the manifestation of the issue
- The location of the affected source code (tag/branch/commit or direct URL)
- Any special configuration required to reproduce the issue
- Step-by-step instructions to reproduce the issue
- Proof-of-concept or exploit code (if possible)
- Impact of the issue, including how an attacker might exploit it

### What to Expect

- We will acknowledge receipt of your vulnerability report
- We will confirm the vulnerability and determine its impact
- We will release a fix as soon as possible, depending on complexity
- We will credit you for the discovery (unless you prefer to remain anonymous)

## Security Update Policy

- **Critical vulnerabilities**: Patched within 24-48 hours
- **High severity**: Patched within 1 week
- **Medium severity**: Patched within 2 weeks
- **Low severity**: Patched in next regular release

## Security Best Practices

When deploying this Minecraft server:

1. **Change default passwords**: Always set a strong RCON password
2. **Use HTTPS**: Deploy behind a reverse proxy with SSL/TLS
3. **Firewall configuration**: Only expose necessary ports
4. **Regular updates**: Keep all dependencies up to date
5. **Access control**: Use strong passwords for the web console
6. **Environment variables**: Never commit secrets to version control
7. **Network isolation**: Use Docker networks to isolate services

## Known Security Considerations

- RCON protocol is not encrypted by default - use behind firewall or VPN
- Web console should be deployed behind HTTPS reverse proxy
- Session secrets should be rotated regularly
- Backup files may contain sensitive player data

## Security Features

### Authentication & Authorization

#### Session Management
- Secure session storage via Redis
- Session timeout after inactivity
- Session regeneration on login
- HttpOnly and Secure cookie flags
- SameSite cookie protection

#### Password Security
- bcrypt hashing with salt rounds
- Minimum password complexity requirements
- Account lockout after failed attempts
- Secure password reset flow

#### API Security
- Bearer token authentication for APIs
- API key generation with mcs_ prefix
- SHA256 hashing for API key storage
- 256-bit entropy for security
- Scope-based permissions via RBAC

### Input Validation & Sanitization

#### SQL Injection Prevention
- Parameterized queries throughout
- Better-sqlite3 prepared statements
- Input validation with express-validator
- Whitelisting of allowed values

#### XSS Prevention
- Content Security Policy (CSP) with nonces
- HTML escaping on all user-controlled data
- escapeHtml() function for output sanitization
- DOMPurify for rich content (if used)

#### Command Injection Prevention
- RCON command validation
- Shell command escaping
- Whitelist of allowed commands
- Input length limitations

#### Path Traversal Prevention
- Path validation in file operations
- Restricted access to server directories
- No direct user input in file paths
- Normalized path checking

### Network Security

#### HTTPS/TLS
- Enforce HTTPS in production
- TLS 1.2+ minimum
- Strong cipher suites
- HSTS headers enabled

#### CORS Configuration
- Strict origin validation
- Credentials allowed only for trusted origins
- Preflight request handling

#### Rate Limiting
- Global rate limits on all endpoints
- Per-route rate limiting for sensitive operations
- Brute force protection on login
- API key rate limiting

### CSRF Protection

- Double-submit cookie pattern via csrf-csrf
- Automatic CSRF token validation
- Token regeneration per request
- Bearer token routes skip CSRF (by design)

### Headers & Security Middleware

Using Helmet.js for:
- Content-Security-Policy
- X-Frame-Options (DENY)
- X-Content-Type-Options (nosniff)
- Strict-Transport-Security
- X-DNS-Prefetch-Control
- X-Download-Options
- X-Permitted-Cross-Domain-Policies

### RBAC (Role-Based Access Control)

Four roles with granular permissions:
1. **Owner** - Full system access
2. **Admin** - Administrative operations
3. **Moderator** - Player management, limited admin
4. **Viewer** - Read-only access

See [IMPLEMENTATION_SUMMARY_RBAC.md](../archive/implementation-rbac.md) for details.

### Webhook Security

#### Outbound Webhooks
- HMAC-SHA256 signatures for verification
- Configurable retry logic
- Timeout protection
- SSL certificate validation

#### Inbound Webhooks
- Signature verification required
- IP whitelisting with safe regex
- Rate limiting
- Payload size limits

### Audit Logging

- All administrative actions logged
- Event logger tracks user activities
- API key usage logged
- Webhook deliveries recorded
- Failed authentication attempts logged

### Backup Security

- Automatic pre-restore backups
- Backup file encryption (optional)
- Access control on backup operations
- Backup integrity verification
- Secure backup download/upload

### Docker Security

- Network isolation between services
- Resource limits on containers
- Non-root user in containers (where possible)
- Read-only filesystems where appropriate
- Minimal base images
- Regular image updates

### Secrets Management

- Environment variables for all secrets
- No secrets in source code
- No secrets in logs
- Secrets rotation procedures documented
- GitHub Secrets for CI/CD

## Security Scanning

### Automated Scanning

#### Dependency Scanning
```bash
# Run npm audit
cd console/backend
npm audit --production

# Fix vulnerabilities
npm audit fix
```

#### CodeQL Analysis
- Enabled via GitHub Actions
- Scans for security vulnerabilities
- Runs on every push and PR
- Results in Security tab

#### Container Scanning
```bash
# Scan Docker images
docker scan ghcr.io/festas/minecraft-console:latest
```

### Manual Security Review

Before deployment:
1. Review all new dependencies
2. Check for hardcoded secrets
3. Validate input sanitization
4. Test authentication/authorization
5. Verify HTTPS enforcement
6. Check CORS configuration
7. Test rate limiting
8. Review CSP headers

## Security Checklist for Deployment

### Pre-Deployment
- [ ] All dependencies up to date
- [ ] npm audit shows no high/critical issues
- [ ] CodeQL scan passes
- [ ] Security.md reviewed
- [ ] Secrets properly configured
- [ ] HTTPS enabled
- [ ] Firewall rules configured
- [ ] Docker security best practices followed

### Post-Deployment
- [ ] Penetration testing completed
- [ ] Security headers verified (securityheaders.com)
- [ ] SSL configuration tested (ssllabs.com)
- [ ] RCON not exposed to internet
- [ ] Admin access restricted to trusted IPs
- [ ] Monitoring and alerting configured
- [ ] Incident response plan documented
- [ ] Regular security audit scheduled

## Penetration Testing

If conducting authorized penetration testing:

### Scope
- Authentication bypass attempts
- SQL injection testing
- XSS testing
- CSRF testing
- Session hijacking attempts
- Rate limiting validation
- API security testing
- File upload vulnerabilities

### Out of Scope
- DoS attacks against production
- Social engineering
- Physical security
- Third-party services

### Reporting
Report findings via GitHub Security Advisory with:
- Detailed vulnerability description
- Steps to reproduce
- Proof of concept (if safe)
- Suggested remediation
- CVSS score if applicable

## Incident Response Plan

### Detection
1. Monitor logs for suspicious activity
2. Review security alerts
3. Check access logs regularly
4. Monitor system resources

### Containment
1. Isolate affected systems
2. Block suspicious IPs
3. Revoke compromised credentials
4. Disable compromised features

### Eradication
1. Identify root cause
2. Remove malicious code/access
3. Patch vulnerabilities
4. Update dependencies

### Recovery
1. Restore from clean backups
2. Reset all credentials
3. Verify system integrity
4. Gradually restore services

### Post-Incident
1. Document incident timeline
2. Identify lessons learned
3. Update security procedures
4. Notify affected parties (if required)
5. Implement additional controls

## Security Contacts

### Reporting Security Issues
**Please do not report security vulnerabilities through public GitHub issues.**

Use one of:
1. GitHub Security Advisories (preferred)
2. Private disclosure to maintainers
3. Email (check repository for contact)

### Response Timeline
- **Acknowledgment:** Within 48 hours
- **Initial assessment:** Within 1 week
- **Fix deployed:** Based on severity
  - Critical: 24-48 hours
  - High: 1 week
  - Medium: 2 weeks
  - Low: Next release

## Security Training

Recommended resources for team:
- OWASP Top 10: https://owasp.org/www-project-top-ten/
- Node.js Security Best Practices: https://nodejs.org/en/docs/guides/security/
- Docker Security: https://docs.docker.com/engine/security/
- API Security: https://owasp.org/www-project-api-security/

## Compliance

This project aims to follow:
- OWASP Application Security Verification Standard (ASVS)
- CIS Docker Benchmark
- Node.js Security Best Practices
- GDPR considerations for player data (where applicable)

## Contact

For security-related questions or concerns, please use GitHub's security advisory feature or contact the repository maintainers.

---

## Related Documents

- [Admin Guide](./admin-guide.md) - Daily administration tasks
- [Server Management](./server-management.md) - Technical operations
- [Onboarding Guide](./onboarding.md) - New admin training
- [Quick Reference](./cheatsheet.md) - Command cheat sheet
- [Documentation Hub](../README.md) - All documentation

[← Back to Admin Guide](./README.md)
