# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Input validation middleware using express-validator
- Global error handling middleware
- Rate limiting middleware for all API endpoints
- Request logging with Morgan
- ESLint configuration for code quality
- Jest testing infrastructure
- Prettier configuration for code formatting
- EditorConfig for consistent coding styles
- Dependabot configuration for automated dependency updates
- Comprehensive API documentation
- Security policy (SECURITY.md)
- RCON password validation script
- Network isolation in Docker Compose
- Resource limits for Docker containers

### Changed
- Replaced deprecated `csurf` package with `csrf-csrf`
- Improved Content Security Policy with nonce-based approach
- Enhanced rate limiting across all endpoints
- Updated package.json with additional scripts (lint, test, audit)

### Security
- Fixed deprecated CSRF protection library
- Improved CSP to eliminate unsafe-inline directives
- Added RCON password validation to prevent default passwords
- Enhanced input validation on all routes
- Added comprehensive rate limiting

## [1.0.0] - 2024-01-01

### Added
- Initial release
- Web-based console for Minecraft server management
- RCON integration for remote command execution
- Real-time log streaming via WebSocket
- Player management features
- Plugin management system
- Backup and restore functionality
- File browser for server files
- Docker deployment configuration

[Unreleased]: https://github.com/Festas/Minecraft-Server/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/Festas/Minecraft-Server/releases/tag/v1.0.0
