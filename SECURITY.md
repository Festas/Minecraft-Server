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

## Contact

For security-related questions or concerns, please use GitHub's security advisory feature or contact the repository maintainers.
