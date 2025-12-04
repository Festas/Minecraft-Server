# Minecraft Web Console

A comprehensive web-based management console for Minecraft servers running in Docker.

## Features

- 🔐 Secure authentication with bcrypt and sessions
- 📊 Real-time server monitoring (CPU, memory, TPS, player count)
- 💻 Live console with command execution via RCON
- 📝 WebSocket-based log streaming
- 👥 Player management (kick, ban, OP, gamemode)
- ⚡ Quick action buttons (start, stop, restart, save, backup)
- 🎨 Minecraft-inspired dark theme
- 📱 Responsive design for mobile/tablet
- 🔒 CSRF protection and rate limiting
- 📦 Backup management

## Quick Start

See [CONSOLE-SETUP.md](../CONSOLE-SETUP.md) in the root directory for detailed setup instructions.

### Basic Setup

1. Copy environment template:
   ```bash
   cp ../.env.example ../.env
   ```

2. Edit `.env` with your settings

3. Start the console:
   ```bash
   docker-compose -f ../docker-compose.console.yml up -d
   ```

4. Access at `http://your-server:3001/console`

## Directory Structure

```
console/
├── backend/
│   ├── auth/              # Authentication & session management
│   ├── routes/            # API endpoints
│   ├── services/          # Business logic (RCON, Docker, logs, stats)
│   ├── config/            # Configuration files (users, settings, schedule)
│   ├── server.js          # Main Express + Socket.io server
│   ├── package.json       # Dependencies
│   └── Dockerfile         # Container definition
└── frontend/
    ├── css/               # Stylesheets (main, console, Minecraft theme)
    ├── js/                # Client-side JavaScript
    ├── index.html         # Main console interface
    └── login.html         # Login page
```

## Technology Stack

- **Backend**: Node.js, Express, Socket.io
- **Frontend**: Vanilla HTML/CSS/JavaScript
- **Authentication**: Bcrypt, express-session
- **Server Control**: RCON protocol, Docker API
- **Real-time**: WebSocket (Socket.io)

## Security Features

- Bcrypt password hashing
- Session-based authentication
- CSRF protection
- Rate limiting on login
- httpOnly, secure, sameSite cookies
- Input sanitization
- Confirmation dialogs for dangerous commands
- Optional IP whitelist

## Development

To run in development mode:

```bash
cd backend
npm install
npm run dev
```

Frontend is static files served from `frontend/` directory.

## License

MIT
