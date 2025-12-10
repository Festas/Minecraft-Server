# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added - Package 14: Final Polish, QA, Security & Launch

#### Documentation & Guides
- docs/getting-started/qa-checklist.md - Comprehensive quality assurance checklist
- docs/getting-started/launch-checklist.md - Pre-launch validation checklist
- docs/admin/upgrade-guide.md - Complete upgrade procedures and rollback guide
- docs/admin/onboarding.md - New administrator onboarding guide
- docs/admin/localization.md - i18n implementation and translation guide

#### Security Enhancements
- Enhanced docs/admin/security.md with comprehensive security features documentation
- Added security scanning workflow (.github/workflows/security-scan.yml)
- CodeQL security analysis integration
- NPM audit automation
- Docker image security scanning with Trivy
- Secret scanning with TruffleHog
- Dependency review for pull requests

#### Branding & UI
- Added favicon.svg to all console frontend pages
- Improved visual consistency across all pages
- Enhanced theme support documentation

#### Localization (i18n)
- i18n infrastructure (console/frontend/js/i18n.js)
- English translations (console/frontend/locales/en.json)
- Spanish translations (console/frontend/locales/es.json)
- Automatic locale detection based on browser language
- localStorage preference support

#### Scripts & Automation
- scripts/upgrade.sh - Automated upgrade script with rollback capability
- scripts/validate-launch.sh - Pre-launch validation script
- Health check integration
- Backup automation before upgrades

#### Testing & Quality
- Comprehensive QA checklist covering all features
- Security testing procedures
- Performance testing guidelines
- Accessibility testing checklist
- Browser compatibility validation

### Changed
- Enhanced docs/admin/security.md with detailed security features, audit logging, and incident response
- Updated test-build.yml workflow to use actions/download-artifact@v4.1.3 (CVE fix)
- Improved documentation structure and organization

### Security
- Added automated security scanning workflows
- Enhanced secrets management documentation
- Added penetration testing guidelines
- Documented incident response procedures
- Added security checklist for deployment

## [Previous Releases]

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
- Security policy (docs/admin/security.md)
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
