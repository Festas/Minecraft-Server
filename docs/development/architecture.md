[← Back to Development](./README.md) | [Documentation Hub](../README.md)

---

# System Architecture

This document provides a comprehensive overview of the festas_builds Minecraft Server architecture, components, technology stack, and data flows.

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Component Descriptions](#component-descriptions)
- [Technology Stack](#technology-stack)
- [Data Flow](#data-flow)
- [Directory Structure](#directory-structure)

---

## Architecture Overview

The festas_builds server uses a containerized microservices architecture with three main components:

```
┌─────────────────────────────────────────────────────────────┐
│                    External Users                            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │  Java    │  │ Bedrock  │  │  Web     │  │ Discord  │   │
│  │ Players  │  │ Players  │  │ Console  │  │   Bot    │   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘   │
└───────┼─────────────┼─────────────┼─────────────┼──────────┘
        │             │             │             │
        │ 25565/TCP   │ 19132/UDP   │ 3001/HTTPS  │ Webhooks
        │             │             │             │
┌───────▼─────────────▼─────────────▼─────────────▼──────────┐
│                    Docker Network (mc-net)                  │
│                                                              │
│  ┌─────────────────┐  ┌──────────────┐  ┌───────────────┐ │
│  │ Minecraft Server│  │  Web Console │  │    Website    │ │
│  │   (Paper)       │◄─┤   (Node.js)  │  │   (Node.js)   │ │
│  │                 │  │              │  │               │ │
│  │  - Plugins      │  │  - RCON      │  │  - Static     │ │
│  │  - Worlds       │  │  - Auth      │  │  - BlueMap    │ │
│  │  - Configs      │  │  - WebSocket │  │  - Discord    │ │
│  └─────────────────┘  └──────────────┘  └───────────────┘ │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │           Shared Volumes (Host Filesystem)            │  │
│  │  - minecraft-data (server data, worlds, plugins)     │  │
│  │  - console-data (database, backups, logs)            │  │
│  │  - website-data (static files)                       │  │
│  └──────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

### Key Design Principles

1. **Containerization**: All services run in Docker containers for isolation and portability
2. **Separation of Concerns**: Each component has a specific responsibility
3. **Shared Storage**: Persistent data stored in Docker volumes mounted to host filesystem
4. **Network Isolation**: Services communicate over private Docker network
5. **Stateless Design**: Containers can be recreated without data loss

---

## Component Descriptions

### 1. Minecraft Server (Paper)

**Purpose**: Hosts the actual Minecraft game server with plugins and worlds.

**Container**: `minecraft-server` (based on `itzg/minecraft-server:java21`)

**Key Features**:
- Paper server (high-performance Spigot fork)
- Plugin ecosystem (50+ plugins)
- Multi-world support
- Cross-platform play (Java + Bedrock via Geyser)
- RCON enabled for remote management

**Exposed Ports**:
- `25565/TCP` - Java Edition gameplay
- `19132/UDP` - Bedrock Edition gameplay (Geyser)
- `25575/TCP` - RCON (internal network only)

**Data Volumes**:
- `/data` → `minecraft-data` (server files, worlds, plugins)

**Configuration**:
- Environment variables in `.env`
- `server.properties` for Minecraft settings
- Plugin configs in `/data/plugins/`

### 2. Web Console (Node.js Backend)

**Purpose**: Provides web-based administration interface for server management.

**Container**: `minecraft-console` (Node.js + Express)

**Key Features**:
- Real-time dashboard (TPS, memory, players)
- RCON command execution
- Live log streaming via WebSocket
- Player management (kick, ban, OP, teleport)
- Plugin management (install, update, configure)
- Backup/restore system
- User authentication with RBAC
- API endpoints for automation

**Exposed Ports**:
- `3001/TCP` - HTTPS web interface

**Data Volumes**:
- Console database (SQLite)
- Backup storage
- Session storage

**Technology**:
- Backend: Node.js + Express
- Auth: bcrypt, session-based + API keys
- Database: SQLite (via better-sqlite3)
- WebSocket: ws library
- RCON: minecraft-rcon library

**Authentication**:
- Session-based login for web UI
- Bearer token (API keys) for automation
- RBAC with 4 roles: Owner, Admin, Moderator, Viewer

### 3. Website (Static + BlueMap)

**Purpose**: Public-facing website with live map and server information.

**Container**: `minecraft-website` (Node.js + Express)

**Key Features**:
- Static website content
- BlueMap 3D world viewer
- Server status and player count
- Discord integration
- Join instructions

**Exposed Ports**:
- `3000/TCP` - HTTP web server

**Data Volumes**:
- Static assets
- BlueMap renders

**Technology**:
- Frontend: HTML, CSS, JavaScript
- Server: Node.js + Express (static file serving)
- Map: BlueMap plugin integration

---

## Technology Stack

### Minecraft Server

| Component | Technology | Version |
|-----------|-----------|---------|
| Java Runtime | OpenJDK | 21 |
| Server Software | Paper | Latest stable |
| Container | itzg/minecraft-server | java21 tag |

**Key Plugins**:
- **Geyser** - Bedrock Edition support
- **BlueMap** - 3D web map
- **GriefPrevention** - Land claiming
- **CoreProtect** - Rollback/logging
- **LuckPerms** - Permissions
- **Vault** - Economy API
- **PlotSquared** - Creative plots
- **DiscordSRV** - Discord bridge

### Web Console

| Component | Technology | Version |
|-----------|-----------|---------|
| Runtime | Node.js | 18+ |
| Framework | Express | 4.x |
| Database | SQLite | 3.x (better-sqlite3) |
| Authentication | bcrypt + sessions | - |
| WebSocket | ws | 8.x |
| RCON Client | minecraft-rcon | 1.x |
| Process Manager | PM2 | 5.x |

**Key Dependencies**:
- `express-session` - Session management
- `csrf-csrf` - CSRF protection
- `express-validator` - Input validation
- `express-rate-limit` - Rate limiting
- `helmet` - Security headers
- `morgan` - HTTP logging

### Website

| Component | Technology |
|-----------|-----------|
| Runtime | Node.js 18+ |
| Server | Express 4.x |
| Frontend | Vanilla JS + CSS |
| Map Viewer | BlueMap |

---

## Data Flow

### Player Connects to Server

```
Player → Minecraft Server (25565/TCP or 19132/UDP)
  ↓
Paper processes connection
  ↓
Geyser translates Bedrock packets (if Bedrock player)
  ↓
Player spawns in world
  ↓
BlueMap plugin renders player on web map
```

### Admin Executes Command via Console

```
Admin → Web Console (HTTPS)
  ↓
Authentication & Session Validation
  ↓
RBAC Permission Check
  ↓
RCON Client connects to Minecraft Server (25575)
  ↓
Command executed on server
  ↓
Response sent back to console
  ↓
WebSocket pushes log updates to browser
```

### Plugin Installation Flow

```
Admin → Web Console → Upload/URL
  ↓
Backend validates plugin JAR
  ↓
Parse plugin.yml metadata
  ↓
Check for conflicts with existing plugins
  ↓
Backup existing plugin (if updating)
  ↓
Download/copy JAR to plugins/ directory
  ↓
Update plugins.json registry
  ↓
Log installation in plugin-history.json
  ↓
Server reload via RCON (or manual restart)
```

### Backup Creation Flow

```
Admin → Web Console → Create Backup
  ↓
RCON: Disable auto-save
  ↓
RCON: Force save-all
  ↓
Create tar.gz of world directories
  ↓
Store backup in backups/ directory
  ↓
Update backup registry in database
  ↓
RCON: Re-enable auto-save
  ↓
Return backup metadata to admin
```

---

## Directory Structure

### Repository Root

```
/home/runner/work/Minecraft-Server/Minecraft-Server/
├── .github/              # GitHub Actions workflows
│   └── workflows/        # CI/CD and diagnostics
├── config/              # Server configuration files
│   ├── server.properties
│   ├── spigot.yml
│   ├── paper.yml
│   └── bukkit.yml
├── console/             # Web console application
│   ├── backend/         # Node.js backend
│   │   ├── routes/      # API endpoints
│   │   ├── services/    # Business logic
│   │   ├── middleware/  # Auth, validation, etc.
│   │   └── auth/        # Authentication logic
│   ├── frontend/        # Web UI
│   │   ├── css/         # Stylesheets
│   │   ├── js/          # JavaScript
│   │   └── locales/     # i18n translations
│   └── data/            # Runtime data (gitignored)
│       ├── backups/     # Server backups
│       ├── console.db   # SQLite database
│       └── logs/        # Application logs
├── docs/                # Documentation
│   ├── getting-started/ # Setup guides
│   ├── admin/           # Administration
│   ├── features/        # Feature documentation
│   ├── development/     # Developer docs
│   ├── troubleshooting/ # Diagnostics
│   ├── reference/       # Quick references
│   └── archive/         # Implementation summaries
├── plugins/             # Minecraft plugin JARs
├── scripts/             # Automation scripts
│   ├── upgrade.sh       # Server upgrade automation
│   ├── validate-launch.sh # Pre-launch checks
│   └── diagnose-*.sh    # Diagnostic scripts
├── website/             # Public website
│   ├── public/          # Static assets
│   └── server.js        # Web server
├── docker-compose.yml           # Main server
├── docker-compose.console.yml   # Console
├── docker-compose.web.yml       # Website
└── .env                 # Environment configuration
```

### Minecraft Server Container (`/data`)

```
/data/
├── world/              # Overworld
├── world_nether/       # Nether dimension
├── world_the_end/      # End dimension
├── plugins/            # Plugin JARs and configs
│   ├── *.jar           # Plugin binaries
│   └── PluginName/     # Plugin data directories
├── logs/               # Server logs
├── server.properties   # Server configuration
├── bukkit.yml
├── spigot.yml
├── paper.yml
├── permissions.yml
├── banned-players.json
├── banned-ips.json
├── ops.json
└── whitelist.json
```

### Console Container (`/app`)

```
/app/
├── backend/
│   ├── server.js       # Entry point
│   ├── routes/         # Express routes
│   ├── services/       # Business logic
│   ├── middleware/     # Express middleware
│   └── config/         # Configuration
├── frontend/
│   ├── index.html      # Login page
│   ├── dashboard.html  # Main dashboard
│   └── *.html          # Other pages
├── data/               # Persistent data
│   ├── console.db      # SQLite database
│   ├── backups/        # Server backups
│   └── logs/           # App logs
└── package.json        # Dependencies
```

---

## Network Architecture

### Docker Network

All containers communicate over a custom bridge network (`mc-net`):

```
mc-net (172.20.0.0/16)
├── minecraft-server  (172.20.0.2)
├── minecraft-console (172.20.0.3)
└── minecraft-website (172.20.0.4)
```

**Benefits**:
- Service discovery by container name
- Network isolation from other containers
- Controlled port exposure to host

### Port Mapping

| Service | Internal Port | External Port | Protocol |
|---------|--------------|---------------|----------|
| Minecraft (Java) | 25565 | 25565 | TCP |
| Minecraft (Bedrock) | 19132 | 19132 | UDP |
| Minecraft (RCON) | 25575 | - | TCP (internal only) |
| Console | 3001 | 3001 | TCP |
| Website | 3000 | 3000 | TCP |

**Security Notes**:
- RCON port NOT exposed to host (internal only)
- Console protected by authentication
- Website is read-only public interface

---

## Security Architecture

### Authentication & Authorization

1. **Web Console**:
   - Session-based authentication (cookie)
   - bcrypt password hashing (10 rounds)
   - CSRF protection (double-submit cookie)
   - RBAC with 4 roles (Owner, Admin, Moderator, Viewer)
   - API key support for automation

2. **RCON**:
   - Password-based authentication
   - Only accessible from console container
   - Password validation (must not be default)

3. **API Keys**:
   - Bearer token authentication
   - SHA-256 hashing for storage
   - Scope-based permissions
   - Rate limiting (20 req/min)

### Data Protection

1. **Encryption**:
   - HTTPS for web console (TLS 1.2+)
   - Bcrypt for passwords
   - Session secrets in environment variables

2. **Input Validation**:
   - express-validator on all endpoints
   - SQL injection prevention (parameterized queries)
   - XSS prevention (Content Security Policy)
   - Path traversal prevention

3. **Rate Limiting**:
   - Global: 100 requests/15 minutes per IP
   - Auth endpoints: 5 requests/15 minutes per IP
   - API endpoints: 20 requests/minute per key

---

## Deployment Architecture

### Production Deployment

```
┌─────────────────────────────────────────────┐
│         Production Server (VPS/Cloud)        │
│                                               │
│  ┌────────────────────────────────────────┐ │
│  │        Reverse Proxy (Nginx)           │ │
│  │  - TLS termination                     │ │
│  │  - Rate limiting                       │ │
│  │  - Header security                     │ │
│  └───┬──────────────────────┬─────────────┘ │
│      │                      │                 │
│  ┌───▼──────────┐      ┌───▼──────────┐     │
│  │   Console    │      │   Website    │     │
│  │  (port 3001) │      │  (port 3000) │     │
│  └──────────────┘      └──────────────┘     │
│                                               │
│  ┌────────────────────────────────────────┐ │
│  │      Minecraft Server (Paper)          │ │
│  │      - Java Edition (25565)            │ │
│  │      - Bedrock Edition (19132)         │ │
│  └────────────────────────────────────────┘ │
│                                               │
│  ┌────────────────────────────────────────┐ │
│  │         Docker Volumes                  │ │
│  │  - minecraft-data                      │ │
│  │  - console-data                        │ │
│  │  - website-data                        │ │
│  └────────────────────────────────────────┘ │
└───────────────────────────────────────────────┘
```

### CI/CD Pipeline

```
GitHub Push → Actions Workflow
  ↓
Run Tests (Jest, ShellCheck)
  ↓
Security Scan (CodeQL, npm audit)
  ↓
Build Docker Images
  ↓
[Manual Deploy Gate]
  ↓
SSH to Production Server
  ↓
Pull Latest Code
  ↓
Backup Current State
  ↓
Run Upgrade Script
  ↓
Health Checks
  ↓
Rollback on Failure
```

---

## Related Documents

- [Contributing Guide](./contributing.md) - Development setup
- [Changelog](./changelog.md) - Version history
- [Admin Guide](../admin/admin-guide.md) - Server management
- [Security Guide](../admin/security.md) - Security features

---

[← Back to Development](./README.md) | [Documentation Hub](../README.md)
