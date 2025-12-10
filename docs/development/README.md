# 💻 Development

Welcome to the Development section! This section contains technical documentation for contributors, developers, and those working on server infrastructure.

---

## 📋 Architecture Overview

The festas_builds server uses a containerized microservices architecture with three main components:

1. **Minecraft Server (Paper)** - Game server with plugins, worlds, and cross-platform support
2. **Web Console (Node.js)** - Administration interface with RCON, authentication, and real-time monitoring
3. **Website (Static)** - Public-facing site with BlueMap integration

**Key Technologies:**
- Docker for containerization
- Node.js + Express for backend
- SQLite for data storage
- RCON for server communication
- WebSocket for real-time updates

See [Architecture Guide](./architecture.md) for detailed diagrams and data flows.

---

## 🚀 Development Environment Setup

### Prerequisites

```bash
# Required
- Docker & Docker Compose
- Node.js 18+ (for local development)
- Git

# Optional
- VS Code with ESLint extension
- Postman for API testing
```

### Quick Setup

```bash
# 1. Clone repository
git clone https://github.com/Festas/Minecraft-Server.git
cd Minecraft-Server

# 2. Configure environment
cp .env.example .env
# Edit .env with your settings

# 3. Start development containers
docker compose up -d

# 4. Install console dependencies (for local dev)
cd console
npm install
npm run dev
```

### Running Tests

```bash
# Backend tests
cd console
npm test

# Linting
npm run lint

# Security audit
npm audit
```

See [Contributing Guide](./contributing.md) for detailed setup instructions.

---

## 📝 Code Style Guidelines

### JavaScript/Node.js

- **ESLint**: All code must pass ESLint validation
- **Async/Await**: Prefer async/await over callbacks
- **Error Handling**: Always use try-catch for async operations
- **Naming**: Use camelCase for variables, PascalCase for classes
- **Comments**: Document complex logic and public APIs

### Shell Scripts

- **ShellCheck**: All scripts must pass ShellCheck
- **Quoting**: Always quote variables
- **Error Handling**: Check return codes and handle errors
- **Shebang**: Use `#!/bin/bash`

See [Contributing Guide](./contributing.md) for complete style guide.

---

## 🔄 Pull Request Process

1. **Fork & Branch**: Create feature branch from `main`
2. **Make Changes**: Follow code style guidelines
3. **Test**: Run tests and ensure they pass
4. **Commit**: Use clear, descriptive commit messages
5. **Push**: Push to your fork
6. **PR**: Create pull request with description
7. **Review**: Address feedback from reviewers
8. **Merge**: Maintainers will merge when approved

### PR Review Checklist

- [ ] Code follows style guidelines
- [ ] All tests pass
- [ ] Documentation updated
- [ ] No security vulnerabilities
- [ ] Backward compatible (or documented breaking changes)
- [ ] Commit messages are clear

---

## 📖 API Documentation Index

### REST API Endpoints

- **Authentication**: `/api/auth/*` - Login, logout, session management
- **Server**: `/api/server/*` - Server status, commands, logs
- **Players**: `/api/players/*` - Player management (kick, ban, OP)
- **Plugins**: `/api/plugins/*` - Plugin management (legacy)
- **Plugins V2**: `/api/v2/plugins/*` - Job-based plugin management
- **Backups**: `/api/backups/*` - Backup creation and restoration
- **API Keys**: `/api/api-keys/*` - API key management

### Authentication Methods

1. **Session-based** - Cookie authentication for web UI
2. **Bearer Token** - API key authentication for automation
3. **Legacy Token** - PLUGIN_ADMIN_TOKEN for backward compatibility

See [Plugin Manager API](./plugin-manager-api.md) for detailed API documentation.

---

## 🔗 Source Code Links

### Console Application

- **Backend**: [`console/backend/`](../../console/backend/) - Express server, routes, services
- **Frontend**: [`console/frontend/`](../../console/frontend/) - HTML, CSS, JavaScript
- **Tests**: [`console/backend/__tests__/`](../../console/backend/__tests__/) - Jest tests

### Website

- **Source**: [`website/`](../../website/) - Static site and BlueMap integration

### Configuration

- **Docker**: [`docker-compose*.yml`](../../) - Container definitions
- **Environment**: [`.env.example`](../../.env.example) - Environment variables template
- **Server Config**: [`config/`](../../config/) - Minecraft server configuration

---

## 📚 Documents in This Section

### Core Documentation

- **[Contributing Guide](./contributing.md)** - How to contribute to the project
- **[Changelog](./changelog.md)** - Version history and release notes
- **[Architecture](./architecture.md)** - System architecture and design

### API & Plugin Development

- **[Plugin Manager API](./plugin-manager-api.md)** - Plugin Manager V2 job queue system
- **[Plugin Manager Quickstart](./plugin-manager-quickstart.md)** - Quick setup for Plugin Manager V2

### Related Documentation (Other Sections)

- **API Documentation**: See [`docs/API.md`](../API.md)
- **API Authentication**: See [`docs/API-AUTHENTICATION-GUIDE.md`](../API-AUTHENTICATION-GUIDE.md)
- **Console Setup**: See [`docs/admin/console-setup.md`](../admin/console-setup.md)
- **Webhooks**: See [`docs/webhooks-integrations.md`](../webhooks-integrations.md)
- **CI/CD**: See [`docs/ci-cd-testing.md`](../ci-cd-testing.md)
- **Localization**: See [`docs/admin/localization.md`](../admin/localization.md)
- **OpenAPI**: See [`docs/openapi.yaml`](../openapi.yaml)

---

## 🔗 Related Sections

- **[Getting Started](../getting-started/)** - Console deployment
- **[Administration](../admin/)** - Console management
- **[Features](../features/)** - Plugin development
- **[Troubleshooting](../troubleshooting/)** - Development diagnostics
- **[Archive](../archive/)** - Implementation summaries

---

## 💡 Quick Tips

- Read the Contributing Guide before submitting pull requests
- Use the Architecture Guide to understand system design
- The Console uses RBAC for permission management
- API authentication supports both session tokens and API keys
- Plugin Manager V2 uses a job queue system for async operations
- Webhooks support HMAC-SHA256 signatures for security
- Localization uses i18n with English and Spanish translations
- Check the Archive section for detailed implementation summaries

---

[← Back to Documentation Hub](../)
