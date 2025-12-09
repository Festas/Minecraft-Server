/**
 * CI/CD Routes Tests
 * 
 * Tests for CI/CD dashboard API endpoints
 */

const request = require('supertest');
const express = require('express');
const axios = require('axios');

// Mock axios before requiring routes
jest.mock('axios');

// Mock the requireAuth middleware
jest.mock('../../auth/auth', () => ({
    requireAuth: (req, res, next) => {
        req.session = { username: 'testuser', role: 'admin', authenticated: true };
        next();
    }
}));

// Mock the RBAC middleware
jest.mock('../../middleware/rbac', () => ({
    requirePermission: (permission) => (req, res, next) => next(),
    PERMISSIONS: { SERVER_RESTART: 'SERVER_RESTART' }
}));

// Mock rate limiter
jest.mock('express-rate-limit', () => {
    return jest.fn(() => (req, res, next) => next());
});

// Now require the routes after mocks are set up
const cicdRouter = require('../../routes/cicd');

// Create a test app
const app = express();
app.use(express.json());
app.use('/api/cicd', cicdRouter);

describe('CI/CD Routes', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('GET /api/cicd/status', () => {
        it('should return CI/CD status overview', async () => {
            const mockData = {
                total_count: 100,
                workflow_runs: [
                    {
                        id: 1,
                        name: 'Test & Build',
                        status: 'completed',
                        conclusion: 'success',
                        event: 'push',
                        head_branch: 'main',
                        created_at: '2024-01-01T00:00:00Z',
                        updated_at: '2024-01-01T00:05:00Z',
                        run_number: 1,
                        html_url: 'https://github.com/test/repo/actions/runs/1'
                    },
                    {
                        id: 2,
                        name: 'Deploy',
                        status: 'completed',
                        conclusion: 'failure',
                        event: 'push',
                        head_branch: 'main',
                        created_at: '2024-01-01T01:00:00Z',
                        updated_at: '2024-01-01T01:05:00Z',
                        run_number: 2,
                        html_url: 'https://github.com/test/repo/actions/runs/2'
                    },
                    {
                        id: 3,
                        name: 'Test',
                        status: 'in_progress',
                        conclusion: null,
                        event: 'pull_request',
                        head_branch: 'feature',
                        created_at: '2024-01-01T02:00:00Z',
                        updated_at: '2024-01-01T02:05:00Z',
                        run_number: 3,
                        html_url: 'https://github.com/test/repo/actions/runs/3'
                    }
                ]
            };

            axios.mockResolvedValue({ data: mockData });

            const response = await request(app)
                .get('/api/cicd/status')
                .expect(200);

            expect(response.body).toHaveProperty('totalRuns');
            expect(response.body).toHaveProperty('recentRuns');
            expect(response.body).toHaveProperty('success');
            expect(response.body).toHaveProperty('failed');
            expect(response.body).toHaveProperty('inProgress');
            expect(response.body.totalRuns).toBe(100);
            expect(response.body.success).toBe(1);
            expect(response.body.failed).toBe(1);
            expect(response.body.inProgress).toBe(1);
        });

        it('should handle errors gracefully', async () => {
            axios.mockRejectedValue(new Error('GitHub API error'));

            const response = await request(app)
                .get('/api/cicd/status')
                .expect(500);

            expect(response.body).toHaveProperty('error');
        });
    });

    describe('GET /api/cicd/runs', () => {
        it('should return workflow runs list', async () => {
            const mockData = {
                total_count: 50,
                workflow_runs: [
                    {
                        id: 1,
                        name: 'Test & Build',
                        display_title: 'Add new feature',
                        status: 'completed',
                        conclusion: 'success',
                        event: 'push',
                        head_branch: 'main',
                        head_sha: 'abc123def456',
                        head_commit: {
                            message: 'Add new feature'
                        },
                        actor: {
                            login: 'testuser'
                        },
                        created_at: '2024-01-01T00:00:00Z',
                        updated_at: '2024-01-01T00:05:00Z',
                        run_number: 1,
                        run_started_at: '2024-01-01T00:00:00Z',
                        html_url: 'https://github.com/test/repo/actions/runs/1',
                        jobs_url: 'https://api.github.com/repos/test/repo/actions/runs/1/jobs'
                    }
                ]
            };

            axios.mockResolvedValue({ data: mockData });

            const response = await request(app)
                .get('/api/cicd/runs')
                .expect(200);

            expect(response.body).toHaveProperty('total');
            expect(response.body).toHaveProperty('runs');
            expect(response.body).toHaveProperty('page');
            expect(response.body).toHaveProperty('perPage');
            expect(response.body.total).toBe(50);
            expect(response.body.runs).toHaveLength(1);
            expect(response.body.runs[0]).toHaveProperty('id');
            expect(response.body.runs[0]).toHaveProperty('name');
            expect(response.body.runs[0]).toHaveProperty('status');
        });

        it('should support filtering by workflow', async () => {
            const mockData = {
                total_count: 10,
                workflow_runs: []
            };

            axios.mockResolvedValue({ data: mockData });

            await request(app)
                .get('/api/cicd/runs?workflow=test-build.yml')
                .expect(200);

            expect(axios).toHaveBeenCalledWith(
                expect.objectContaining({
                    url: expect.stringContaining('workflow_id=test-build.yml')
                })
            );
        });

        it('should support filtering by status', async () => {
            const mockData = {
                total_count: 5,
                workflow_runs: []
            };

            axios.mockResolvedValue({ data: mockData });

            await request(app)
                .get('/api/cicd/runs?status=completed')
                .expect(200);

            expect(axios).toHaveBeenCalledWith(
                expect.objectContaining({
                    url: expect.stringContaining('status=completed')
                })
            );
        });
    });

    describe('GET /api/cicd/runs/:runId', () => {
        it('should return detailed workflow run information', async () => {
            const mockRun = {
                id: 1,
                name: 'Test & Build',
                display_title: 'Add feature',
                status: 'completed',
                conclusion: 'success',
                event: 'push',
                head_branch: 'main',
                head_sha: 'abc123',
                head_commit: {
                    message: 'Add feature\n\nDetailed description'
                },
                actor: {
                    login: 'testuser'
                },
                created_at: '2024-01-01T00:00:00Z',
                updated_at: '2024-01-01T00:05:00Z',
                run_number: 1,
                run_started_at: '2024-01-01T00:00:00Z',
                html_url: 'https://github.com/test/repo/actions/runs/1'
            };

            const mockJobs = {
                jobs: [
                    {
                        id: 101,
                        name: 'Backend Tests',
                        status: 'completed',
                        conclusion: 'success',
                        started_at: '2024-01-01T00:01:00Z',
                        completed_at: '2024-01-01T00:03:00Z',
                        html_url: 'https://github.com/test/repo/actions/runs/1/jobs/101',
                        steps: [
                            {
                                name: 'Checkout code',
                                status: 'completed',
                                conclusion: 'success',
                                number: 1,
                                started_at: '2024-01-01T00:01:00Z',
                                completed_at: '2024-01-01T00:01:30Z'
                            }
                        ]
                    }
                ]
            };

            // First call for run details, second for jobs
            axios
                .mockResolvedValueOnce({ data: mockRun })
                .mockResolvedValueOnce({ data: mockJobs });

            const response = await request(app)
                .get('/api/cicd/runs/1')
                .expect(200);

            expect(response.body).toHaveProperty('id', 1);
            expect(response.body).toHaveProperty('name', 'Test & Build');
            expect(response.body).toHaveProperty('jobs');
            expect(response.body.jobs).toHaveLength(1);
            expect(response.body.jobs[0]).toHaveProperty('steps');
        });
    });

    describe('GET /api/cicd/runs/:runId/artifacts', () => {
        it('should return artifacts for a workflow run', async () => {
            const mockData = {
                total_count: 2,
                artifacts: [
                    {
                        id: 1001,
                        name: 'test-results',
                        size_in_bytes: 1024000,
                        created_at: '2024-01-01T00:05:00Z',
                        expires_at: '2024-01-31T00:05:00Z',
                        expired: false
                    },
                    {
                        id: 1002,
                        name: 'coverage-report',
                        size_in_bytes: 2048000,
                        created_at: '2024-01-01T00:05:00Z',
                        expires_at: '2024-01-31T00:05:00Z',
                        expired: false
                    }
                ]
            };

            axios.mockResolvedValue({ data: mockData });

            const response = await request(app)
                .get('/api/cicd/runs/1/artifacts')
                .expect(200);

            expect(response.body).toHaveProperty('total', 2);
            expect(response.body).toHaveProperty('artifacts');
            expect(response.body.artifacts).toHaveLength(2);
            expect(response.body.artifacts[0]).toHaveProperty('downloadUrl');
        });
    });

    describe('GET /api/cicd/workflows', () => {
        it('should return list of workflows', async () => {
            const mockData = {
                total_count: 3,
                workflows: [
                    {
                        id: 1,
                        name: 'Test & Build',
                        path: '.github/workflows/test-build.yml',
                        state: 'active',
                        created_at: '2024-01-01T00:00:00Z',
                        updated_at: '2024-01-01T00:00:00Z',
                        html_url: 'https://github.com/test/repo/blob/main/.github/workflows/test-build.yml',
                        badge_url: 'https://github.com/test/repo/workflows/test-build.yml/badge.svg'
                    }
                ]
            };

            axios.mockResolvedValue({ data: mockData });

            const response = await request(app)
                .get('/api/cicd/workflows')
                .expect(200);

            expect(response.body).toHaveProperty('total', 3);
            expect(response.body).toHaveProperty('workflows');
            expect(response.body.workflows).toHaveLength(1);
            expect(response.body.workflows[0]).toHaveProperty('id');
            expect(response.body.workflows[0]).toHaveProperty('name');
        });
    });

    describe('GET /api/cicd/deployments', () => {
        it('should return deployment history', async () => {
            const mockDeployments = [
                {
                    id: 1,
                    ref: 'main',
                    environment: 'production',
                    description: 'Deploy v1.0.0',
                    creator: {
                        login: 'testuser'
                    },
                    created_at: '2024-01-01T00:00:00Z',
                    updated_at: '2024-01-01T00:05:00Z'
                }
            ];

            const mockStatuses = [
                {
                    state: 'success',
                    description: 'Deployment successful'
                }
            ];

            axios
                .mockResolvedValueOnce({ data: mockDeployments })
                .mockResolvedValueOnce({ data: mockStatuses });

            const response = await request(app)
                .get('/api/cicd/deployments')
                .expect(200);

            expect(response.body).toHaveProperty('deployments');
            expect(response.body.deployments).toHaveLength(1);
            expect(response.body.deployments[0]).toHaveProperty('status');
        });
    });
});
