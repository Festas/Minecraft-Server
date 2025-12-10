# CI/CD & Testing Guide

Complete guide for automated testing, continuous integration, continuous deployment, and troubleshooting.

## Table of Contents
1. [Overview](#overview)
2. [Testing Infrastructure](#testing-infrastructure)
3. [GitHub Actions Workflows](#github-actions-workflows)
4. [CI/CD Dashboard](#cicd-dashboard)
5. [Writing Tests](#writing-tests)
6. [Running Tests](#running-tests)
7. [Deployment Process](#deployment-process)
8. [Rollback Procedures](#rollback-procedures)
9. [Monitoring & Alerts](#monitoring--alerts)
10. [Troubleshooting](#troubleshooting)

## Overview

The Minecraft Console project uses comprehensive automated testing and CI/CD pipelines to ensure code quality, security, and reliable deployments.

### Key Features
- **Automated Testing**: Backend test suite with 380+ tests
- **Code Coverage**: Automatic coverage reporting and tracking
- **Security Scanning**: npm audit and vulnerability checks
- **Multi-Stage CI/CD**: Lint → Test → Build → Deploy
- **Artifact Management**: Test reports, coverage data, logs
- **Status Dashboard**: Real-time CI/CD monitoring
- **Failure Alerts**: Instant notifications on build/test failures
- **Rollback Support**: Quick deployment rollback capability

## Testing Infrastructure

### Backend Tests

The backend uses **Jest** as the testing framework with the following structure:

```
console/backend/__tests__/
├── auth/                  # Authentication tests
├── config/               # RBAC and configuration tests
├── diagnostics/          # System diagnostic tests
├── middleware/           # Middleware tests (RBAC, CSRF, validation)
├── routes/              # API endpoint tests
│   ├── automation.test.js
│   ├── webhooks.test.js
│   ├── api.test.js
│   └── ...
└── services/            # Service layer tests
    ├── automationService.test.js
    ├── pluginManager.test.js
    ├── database.test.js
    └── ...
```

### Test Configuration

**jest.config.js**:
```javascript
module.exports = {
  testEnvironment: 'node',
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'services/**/*.js',
    'routes/**/*.js',
    'auth/**/*.js',
    'middleware/**/*.js'
  ],
  testMatch: ['**/__tests__/**/*.js', '**/*.test.js'],
  verbose: true,
  setupFiles: ['<rootDir>/jest.setup.js']
};
```

### Coverage Thresholds

Current coverage targets:
- **Statements**: 70%+
- **Branches**: 65%+
- **Functions**: 70%+
- **Lines**: 70%+

## GitHub Actions Workflows

### 1. Test & Build Workflow

**File**: `.github/workflows/test-build.yml`

**Triggers**:
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop`
- Manual dispatch

**Jobs**:

#### Backend Tests
- Install dependencies
- Run Jest test suite
- Generate coverage reports
- Upload artifacts (coverage, test results)
- Comment coverage on PRs

#### Frontend Lint
- ESLint validation
- Code style checking

#### Build Console
- Docker image build
- Push to GitHub Container Registry (main branch only)
- Caching for faster builds

#### Security Audit
- npm audit for vulnerabilities
- Generate audit reports
- Upload findings as artifacts

#### Test Summary
- Aggregate results from all jobs
- Generate summary in GitHub Actions UI
- Provide deployment readiness status

### 2. Lint Workflow

**File**: `.github/workflows/lint.yml`

**Checks**:
- ShellCheck for shell scripts
- ESLint for JavaScript
- Hadolint for Dockerfiles
- yamllint for YAML files

### 3. Deploy Console Workflow

**File**: `.github/workflows/deploy-console.yml`

**Stages**:
1. **Build**: Create Docker image
2. **Pre-deployment diagnostics**: Health checks
3. **Deploy**: Update production containers
4. **Post-deployment verification**: Functional tests
5. **Artifact upload**: Logs and diagnostics

## CI/CD Dashboard

### Accessing the Dashboard

Navigate to **https://mc.festas-builds.com/console/cicd.html** (or your domain).

### Features

#### Status Overview
- Total workflow runs
- Success/failure counts
- In-progress builds
- Recent run history

#### Workflow Runs
- Filter by workflow, status, branch
- View detailed job information
- Step-by-step execution logs
- Real-time status updates

#### Artifacts
- Download test reports
- Access coverage data
- Review deployment logs
- Browse diagnostic outputs

#### Actions
- View GitHub Actions logs
- Trigger manual workflows (admin only)
- Download artifacts
- Monitor deployment history

### Dashboard API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/cicd/status` | GET | CI/CD status overview |
| `/api/cicd/runs` | GET | List workflow runs |
| `/api/cicd/runs/:id` | GET | Get run details |
| `/api/cicd/runs/:id/artifacts` | GET | List run artifacts |
| `/api/cicd/artifacts/:id/download` | GET | Download artifact |
| `/api/cicd/workflows` | GET | List workflows |
| `/api/cicd/workflows/:id/dispatch` | POST | Trigger workflow |
| `/api/cicd/deployments` | GET | Deployment history |

## Writing Tests

### Backend Test Example

```javascript
/**
 * Example Route Test
 */
const request = require('supertest');
const express = require('express');

// Mock dependencies
jest.mock('../../services/myService');
const myService = require('../../services/myService');

// Mock authentication
jest.mock('../../auth/auth', () => ({
    requireAuth: (req, res, next) => {
        req.session = { username: 'testuser', role: 'admin', authenticated: true };
        next();
    }
}));

// Mock RBAC middleware
jest.mock('../../middleware/rbac', () => ({
    requirePermission: (permission) => (req, res, next) => next()
}));

// Create test app
const myRouter = require('../../routes/myRoute');
const app = express();
app.use(express.json());
app.use('/api/myroute', myRouter);

describe('My Route Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('GET /api/myroute', () => {
        it('should return data successfully', async () => {
            const mockData = { id: 1, name: 'Test' };
            myService.getData.mockResolvedValue(mockData);

            const response = await request(app)
                .get('/api/myroute')
                .expect(200);

            expect(response.body).toEqual(mockData);
            expect(myService.getData).toHaveBeenCalledTimes(1);
        });

        it('should handle errors', async () => {
            myService.getData.mockRejectedValue(new Error('Test error'));

            const response = await request(app)
                .get('/api/myroute')
                .expect(500);

            expect(response.body.error).toBeDefined();
        });
    });
});
```

### Service Test Example

```javascript
/**
 * Example Service Test
 */
const myService = require('../../services/myService');
const database = require('../../services/database');

jest.mock('../../services/database');

describe('My Service', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('processData', () => {
        it('should process data correctly', async () => {
            const input = { value: 10 };
            const expected = { value: 20 };

            database.query.mockResolvedValue({ rows: [expected] });

            const result = await myService.processData(input);

            expect(result).toEqual(expected);
            expect(database.query).toHaveBeenCalledWith(
                expect.stringContaining('SELECT'),
                expect.any(Array)
            );
        });
    });
});
```

### Test Best Practices

1. **Use descriptive test names**: `should return error when input is invalid`
2. **Mock external dependencies**: Database, RCON, HTTP requests
3. **Test edge cases**: Empty inputs, null values, errors
4. **Test permissions**: RBAC authorization checks
5. **Clean up**: Use `beforeEach`/`afterEach` to reset state
6. **Isolate tests**: Each test should be independent
7. **Use assertions**: Verify both success and error paths

## Running Tests

### Local Development

```bash
# Install dependencies
cd console/backend
npm install

# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- __tests__/routes/automation.test.js

# Run in watch mode
npm run test:watch

# Run with verbose output
npm test -- --verbose
```

### Coverage Report

After running `npm run test:coverage`, view the HTML report:

```bash
# Open in browser
open coverage/lcov-report/index.html
```

### CI Environment

Tests run automatically on:
- Every push to `main` or `develop`
- Every pull request
- Manual workflow dispatch

Environment variables needed:
- `ADMIN_USERNAME`: Test admin user
- `ADMIN_PASSWORD`: Test admin password
- `RCON_PASSWORD`: Test RCON password
- `SESSION_SECRET`: Test session secret
- `CSRF_SECRET`: Test CSRF secret

## Deployment Process

### Automated Deployment

Deployments to production happen automatically when:
1. Code is pushed to `main` branch
2. All tests pass
3. Build succeeds
4. Security audit passes

### Deployment Steps

1. **Build Docker Image**
   ```bash
   docker build -t ghcr.io/festas/minecraft-console:latest console/backend
   ```

2. **Push to Registry**
   ```bash
   docker push ghcr.io/festas/minecraft-console:latest
   ```

3. **Pre-deployment Checks**
   - Health check existing deployment
   - Run diagnostic scripts
   - Verify secret configuration

4. **Deploy**
   ```bash
   docker compose pull
   docker compose up -d
   ```

5. **Post-deployment Verification**
   - Health check new deployment
   - Run functional tests
   - Verify plugin install API

6. **Artifact Upload**
   - Pre/post deployment diagnostics
   - Plugin install logs
   - Console logs

### Manual Deployment

To deploy manually:

```bash
# 1. SSH to server
ssh deploy@your-server.com

# 2. Navigate to deployment directory
cd /home/deploy/minecraft-console

# 3. Pull latest image
docker pull ghcr.io/festas/minecraft-console:latest

# 4. Update deployment
docker compose up -d

# 5. Check health
docker logs minecraft-console --tail 50
curl http://localhost:3001/health
```

### Deployment Requirements

**Required Secrets**:
- `GHCR_PAT`: GitHub Container Registry token
- `SSH_PRIVATE_KEY`: Deployment SSH key
- `SERVER_HOST`: Production server hostname
- `SERVER_USER`: SSH username
- `CONSOLE_ADMIN_USER`: Admin username
- `CONSOLE_ADMIN_PASSWORD`: Admin password
- `RCON_PASSWORD`: RCON password
- `SESSION_SECRET`: Session encryption key
- `CSRF_SECRET`: CSRF token secret
- `REDIS_HOST`: Redis server host
- `REDIS_PORT`: Redis server port

**Optional Secrets**:
- `PLUGIN_ADMIN_TOKEN`: Plugin management token
- `DOMAIN`: Custom domain name
- `MINECRAFT_VERSION`: Minecraft version

## Rollback Procedures

### Quick Rollback

If deployment fails or issues are detected:

```bash
# 1. SSH to server
ssh deploy@your-server.com

# 2. Navigate to deployment directory
cd /home/deploy/minecraft-console

# 3. Pull previous working version
docker pull ghcr.io/festas/minecraft-console:COMMIT_SHA

# 4. Update docker-compose.yml to use specific version
sed -i 's|:latest|:COMMIT_SHA|' docker-compose.yml

# 5. Redeploy
docker compose up -d

# 6. Verify
curl http://localhost:3001/health
```

### GitHub Actions Rollback

Use the GitHub Actions UI to:
1. Navigate to Actions → Deploy Console workflow
2. Find the last successful run
3. Click "Re-run jobs"
4. Select "Re-run all jobs"

### Manual Rollback Steps

```bash
# List available image tags
docker images ghcr.io/festas/minecraft-console

# Stop current deployment
docker compose down

# Edit docker-compose.yml with previous version
vim docker-compose.yml
# Change: image: ghcr.io/festas/minecraft-console:PREVIOUS_SHA

# Deploy previous version
docker compose up -d

# Monitor logs
docker logs -f minecraft-console
```

### Rollback Verification Checklist

- [ ] Health endpoint returns 200 OK
- [ ] Can login to web console
- [ ] RCON connection works
- [ ] Plugin management functional
- [ ] Database accessible
- [ ] Session persistence working
- [ ] CSRF protection active
- [ ] No errors in logs

## Monitoring & Alerts

### Build Status Monitoring

**Dashboard**: Monitor real-time CI/CD status at `/cicd.html`

**Metrics**:
- Success rate over time
- Average build duration
- Test pass/fail trends
- Deployment frequency

### Failure Alerts

Failures trigger alerts via:

1. **GitHub Actions UI**
   - Failed run annotations
   - Step-by-step failure details
   - Downloadable logs

2. **CI/CD Dashboard**
   - Real-time status updates
   - Failure badges
   - Error summaries

3. **GitHub Notifications**
   - Email alerts (configurable)
   - Web notifications
   - Mobile app notifications

### Setting Up Email Alerts

Configure in GitHub repository settings:
1. Go to Settings → Notifications
2. Enable "Actions" notifications
3. Select "Send notifications for failed workflows only"
4. Add notification email

### Webhook Integration

Forward CI/CD events to external services:

```javascript
// Example: Send to Slack/Discord
POST https://hooks.slack.com/services/YOUR/WEBHOOK/URL
{
  "text": "Build failed: Run #123",
  "attachments": [{
    "color": "danger",
    "fields": [
      { "title": "Branch", "value": "main" },
      { "title": "Commit", "value": "abc1234" },
      { "title": "Status", "value": "Failed" }
    ]
  }]
}
```

### Log Aggregation

Download and review logs:

```bash
# Download workflow logs
gh run view RUN_ID --log > workflow.log

# Download artifact
gh run download RUN_ID -n artifact-name

# View specific job logs
gh run view RUN_ID --job JOB_ID --log
```

## Troubleshooting

### Common Issues

#### 1. Tests Failing Locally

**Symptom**: Tests pass in CI but fail locally

**Solutions**:
```bash
# Clean install dependencies
rm -rf node_modules package-lock.json
npm install

# Clear Jest cache
npm test -- --clearCache

# Check Node version matches CI
node --version  # Should be 18.x
```

#### 2. Build Timeout

**Symptom**: Docker build times out

**Solutions**:
```yaml
# Increase timeout in workflow
- name: Build Docker image
  timeout-minutes: 30  # Add this
  uses: docker/build-push-action@v5
```

#### 3. Coverage Report Not Generated

**Symptom**: Coverage artifact missing

**Solutions**:
```bash
# Ensure coverage directory exists
mkdir -p coverage

# Run with coverage explicitly
npm run test:coverage -- --coverage --coverageDirectory=coverage
```

#### 4. Deployment Secrets Missing

**Symptom**: "Missing required secrets" error

**Solutions**:
1. Go to repository Settings → Secrets and variables → Actions
2. Add missing secrets listed in error message
3. Refer to admin/console-setup.md for secret values

#### 5. CSRF Token Errors in Tests

**Symptom**: 403 Forbidden errors in deployment tests

**Solutions**:
```bash
# Check Redis is running
docker ps | grep redis

# Verify CSRF secret is set
echo $CSRF_SECRET

# Check session middleware initialization
docker logs minecraft-console | grep -i session
```

#### 6. Artifact Download Fails

**Symptom**: Cannot download artifacts from dashboard

**Solutions**:
- Ensure `GITHUB_TOKEN` environment variable is set
- Verify user has admin permissions
- Check artifact hasn't expired (30-day retention)

### Debug Mode

Enable verbose logging:

```bash
# Backend tests with debug output
DEBUG=* npm test

# GitHub Actions debug logs
# Add secret ACTIONS_STEP_DEBUG = true in repository settings
```

### Getting Help

1. **Check workflow logs**: Actions → Failed run → View logs
2. **Review artifacts**: Download diagnostic reports
3. **Check CI/CD dashboard**: Real-time status and history
4. **Review documentation**: This guide and admin/console-setup.md
5. **Open an issue**: Include logs and steps to reproduce

## Best Practices

### Testing

- Write tests for all new features
- Maintain >70% code coverage
- Test both success and error paths
- Mock external dependencies
- Use meaningful test descriptions

### CI/CD

- Keep workflows fast (<5 minutes)
- Use caching for dependencies
- Upload artifacts for debugging
- Add timeout limits to prevent hanging
- Use matrix builds for multiple versions

### Deployment

- Always deploy to staging first
- Run smoke tests post-deployment
- Keep rollback plans ready
- Monitor logs after deployment
- Document deployment changes

### Security

- Run security audits regularly
- Keep dependencies updated
- Review audit reports
- Fix critical vulnerabilities immediately
- Use secret scanning

## Resources

- [Jest Documentation](https://jestjs.io/)
- [GitHub Actions Docs](https://docs.github.com/en/actions)
- [Docker Build Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)

## Examples

### Example: Adding a New Test

```javascript
// 1. Create test file
// console/backend/__tests__/routes/myroute.test.js

const request = require('supertest');
const express = require('express');
const myRouter = require('../../routes/myroute');

const app = express();
app.use(express.json());
app.use('/api/myroute', myRouter);

describe('My Route', () => {
    test('GET /api/myroute should return 200', async () => {
        const response = await request(app).get('/api/myroute');
        expect(response.status).toBe(200);
    });
});

// 2. Run the test
// npm test -- myroute.test.js

// 3. Add to coverage
// npm run test:coverage
```

### Example: Triggering Manual Deployment

```bash
# Using GitHub CLI
gh workflow run deploy-console.yml

# Or via GitHub UI
# 1. Go to Actions tab
# 2. Select "Deploy Console" workflow
# 3. Click "Run workflow"
# 4. Select branch
# 5. Click "Run workflow" button
```

### Example: Checking Deployment Status

```bash
# Via API
curl https://mc.festas-builds.com/console/api/cicd/status

# Via dashboard
# Navigate to: https://mc.festas-builds.com/console/cicd.html

# Via CLI
gh run list --workflow=deploy-console.yml --limit 5
```

## Conclusion

This CI/CD infrastructure ensures reliable, automated deployments with comprehensive testing and monitoring. Follow this guide for smooth development, testing, and deployment workflows.

For additional help, refer to:
- admin/console-setup.md - Setup instructions
- API.md - API documentation
- troubleshooting/diagnostics-guide.md - Troubleshooting guide
