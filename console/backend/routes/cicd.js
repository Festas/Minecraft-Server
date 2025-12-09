/**
 * CI/CD Dashboard Routes
 * 
 * Provides endpoints for viewing CI/CD status, workflow runs, and build artifacts
 */

const express = require('express');
const router = express.Router();
const axios = require('axios');
const { requireAuth } = require('../auth/auth');
const { requirePermission } = require('../middleware/rbac');
const { PERMISSIONS } = require('../config/rbac');
const rateLimit = require('express-rate-limit');

// Rate limiter for CI/CD endpoints
const cicdLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 30,
    message: 'Too many CI/CD requests, please try again later'
});

// GitHub API configuration
const GITHUB_OWNER = process.env.GITHUB_OWNER || 'Festas';
const GITHUB_REPO = process.env.GITHUB_REPO || 'Minecraft-Server';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';
const GITHUB_API = 'https://api.github.com';

/**
 * Helper function to make GitHub API requests
 */
async function githubRequest(endpoint, options = {}) {
    const headers = {
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'Minecraft-Console-CI-Dashboard'
    };

    if (GITHUB_TOKEN) {
        headers['Authorization'] = `Bearer ${GITHUB_TOKEN}`;
    }

    try {
        const response = await axios({
            url: `${GITHUB_API}${endpoint}`,
            headers,
            timeout: 10000,
            ...options
        });
        return response.data;
    } catch (error) {
        console.error('GitHub API request failed:', error.message);
        throw error;
    }
}

/**
 * Get CI/CD status overview
 */
router.get('/status', requireAuth, requirePermission(PERMISSIONS.CICD_VIEW), cicdLimiter, async (req, res) => {
    try {
        // Get recent workflow runs
        const runs = await githubRequest(
            `/repos/${GITHUB_OWNER}/${GITHUB_REPO}/actions/runs?per_page=10`
        );

        // Calculate statistics in a single pass
        const stats = (runs.workflow_runs || []).reduce((acc, run) => {
            if (run.conclusion === 'success') acc.success++;
            if (run.conclusion === 'failure') acc.failed++;
            if (run.status === 'in_progress') acc.inProgress++;
            return acc;
        }, { success: 0, failed: 0, inProgress: 0 });

        const overview = {
            totalRuns: runs.total_count || 0,
            recentRuns: runs.workflow_runs?.slice(0, 5).map(run => ({
                id: run.id,
                name: run.name,
                status: run.status,
                conclusion: run.conclusion,
                event: run.event,
                branch: run.head_branch,
                createdAt: run.created_at,
                updatedAt: run.updated_at,
                runNumber: run.run_number,
                url: run.html_url
            })) || [],
            ...stats
        };

        res.json(overview);
    } catch (error) {
        console.error('Failed to fetch CI/CD status:', error);
        res.status(500).json({ 
            error: 'Failed to fetch CI/CD status',
            message: error.message 
        });
    }
});

/**
 * Get workflow runs with filtering
 */
router.get('/runs', requireAuth, requirePermission(PERMISSIONS.CICD_VIEW), cicdLimiter, async (req, res) => {
    try {
        const { 
            workflow, 
            branch, 
            event, 
            status, 
            per_page = 20, 
            page = 1 
        } = req.query;

        let endpoint = `/repos/${GITHUB_OWNER}/${GITHUB_REPO}/actions/runs?per_page=${per_page}&page=${page}`;

        if (workflow) endpoint += `&workflow_id=${workflow}`;
        if (branch) endpoint += `&branch=${branch}`;
        if (event) endpoint += `&event=${event}`;
        if (status) endpoint += `&status=${status}`;

        const runs = await githubRequest(endpoint);

        const formattedRuns = runs.workflow_runs?.map(run => ({
            id: run.id,
            name: run.name,
            displayTitle: run.display_title,
            status: run.status,
            conclusion: run.conclusion,
            event: run.event,
            branch: run.head_branch,
            commitSha: run.head_sha?.substring(0, 7),
            commitMessage: run.head_commit?.message,
            actor: run.actor?.login,
            createdAt: run.created_at,
            updatedAt: run.updated_at,
            runNumber: run.run_number,
            runStartedAt: run.run_started_at,
            url: run.html_url,
            jobsUrl: run.jobs_url
        })) || [];

        res.json({
            total: runs.total_count,
            runs: formattedRuns,
            page: parseInt(page),
            perPage: parseInt(per_page)
        });
    } catch (error) {
        console.error('Failed to fetch workflow runs:', error);
        res.status(500).json({ 
            error: 'Failed to fetch workflow runs',
            message: error.message 
        });
    }
});

/**
 * Get specific workflow run details
 */
router.get('/runs/:runId', requireAuth, requirePermission(PERMISSIONS.CICD_VIEW), cicdLimiter, async (req, res) => {
    try {
        const { runId } = req.params;

        // Get run details
        const run = await githubRequest(
            `/repos/${GITHUB_OWNER}/${GITHUB_REPO}/actions/runs/${runId}`
        );

        // Get jobs for this run
        const jobs = await githubRequest(
            `/repos/${GITHUB_OWNER}/${GITHUB_REPO}/actions/runs/${runId}/jobs`
        );

        const details = {
            id: run.id,
            name: run.name,
            displayTitle: run.display_title,
            status: run.status,
            conclusion: run.conclusion,
            event: run.event,
            branch: run.head_branch,
            commitSha: run.head_sha,
            commitMessage: run.head_commit?.message,
            actor: run.actor?.login,
            createdAt: run.created_at,
            updatedAt: run.updated_at,
            runNumber: run.run_number,
            runStartedAt: run.run_started_at,
            url: run.html_url,
            jobs: jobs.jobs?.map(job => ({
                id: job.id,
                name: job.name,
                status: job.status,
                conclusion: job.conclusion,
                startedAt: job.started_at,
                completedAt: job.completed_at,
                url: job.html_url,
                steps: job.steps?.map(step => ({
                    name: step.name,
                    status: step.status,
                    conclusion: step.conclusion,
                    number: step.number,
                    startedAt: step.started_at,
                    completedAt: step.completed_at
                })) || []
            })) || []
        };

        res.json(details);
    } catch (error) {
        console.error('Failed to fetch workflow run details:', error);
        res.status(500).json({ 
            error: 'Failed to fetch workflow run details',
            message: error.message 
        });
    }
});

/**
 * Get artifacts for a workflow run
 */
router.get('/runs/:runId/artifacts', requireAuth, requirePermission(PERMISSIONS.CICD_VIEW), cicdLimiter, async (req, res) => {
    try {
        const { runId } = req.params;

        const artifacts = await githubRequest(
            `/repos/${GITHUB_OWNER}/${GITHUB_REPO}/actions/runs/${runId}/artifacts`
        );

        const formattedArtifacts = artifacts.artifacts?.map(artifact => ({
            id: artifact.id,
            name: artifact.name,
            sizeInBytes: artifact.size_in_bytes,
            createdAt: artifact.created_at,
            expiresAt: artifact.expires_at,
            expired: artifact.expired,
            downloadUrl: `/api/cicd/artifacts/${artifact.id}/download`
        })) || [];

        res.json({
            total: artifacts.total_count,
            artifacts: formattedArtifacts
        });
    } catch (error) {
        console.error('Failed to fetch artifacts:', error);
        res.status(500).json({ 
            error: 'Failed to fetch artifacts',
            message: error.message 
        });
    }
});

/**
 * Download artifact (requires admin permission)
 */
router.get('/artifacts/:artifactId/download', 
    requireAuth, 
    requirePermission(PERMISSIONS.CICD_DOWNLOAD_ARTIFACTS), 
    cicdLimiter, 
    async (req, res) => {
    try {
        const { artifactId } = req.params;

        if (!GITHUB_TOKEN) {
            return res.status(403).json({ 
                error: 'Artifact download requires GitHub token configuration' 
            });
        }

        // Get artifact download URL
        const response = await axios({
            url: `${GITHUB_API}/repos/${GITHUB_OWNER}/${GITHUB_REPO}/actions/artifacts/${artifactId}/zip`,
            headers: {
                'Authorization': `Bearer ${GITHUB_TOKEN}`,
                'Accept': 'application/vnd.github+json'
            },
            maxRedirects: 0,
            validateStatus: status => status === 302
        });

        // GitHub returns a redirect to the actual download URL
        const downloadUrl = response.headers.location;
        if (downloadUrl) {
            res.redirect(downloadUrl);
        } else {
            res.status(404).json({ error: 'Download URL not found' });
        }
    } catch (error) {
        console.error('Failed to download artifact:', error);
        res.status(500).json({ 
            error: 'Failed to download artifact',
            message: error.message 
        });
    }
});

/**
 * Get list of workflows
 */
router.get('/workflows', requireAuth, requirePermission(PERMISSIONS.CICD_VIEW), cicdLimiter, async (req, res) => {
    try {
        const workflows = await githubRequest(
            `/repos/${GITHUB_OWNER}/${GITHUB_REPO}/actions/workflows`
        );

        const formattedWorkflows = workflows.workflows?.map(workflow => ({
            id: workflow.id,
            name: workflow.name,
            path: workflow.path,
            state: workflow.state,
            createdAt: workflow.created_at,
            updatedAt: workflow.updated_at,
            url: workflow.html_url,
            badgeUrl: workflow.badge_url
        })) || [];

        res.json({
            total: workflows.total_count,
            workflows: formattedWorkflows
        });
    } catch (error) {
        console.error('Failed to fetch workflows:', error);
        res.status(500).json({ 
            error: 'Failed to fetch workflows',
            message: error.message 
        });
    }
});

/**
 * Trigger workflow (requires admin permission)
 */
router.post('/workflows/:workflowId/dispatch',
    requireAuth,
    requirePermission(PERMISSIONS.CICD_TRIGGER),
    cicdLimiter,
    async (req, res) => {
    try {
        const { workflowId } = req.params;
        const { ref = 'main', inputs = {} } = req.body;

        if (!GITHUB_TOKEN) {
            return res.status(403).json({ 
                error: 'Workflow dispatch requires GitHub token configuration' 
            });
        }

        await axios({
            method: 'POST',
            url: `${GITHUB_API}/repos/${GITHUB_OWNER}/${GITHUB_REPO}/actions/workflows/${workflowId}/dispatches`,
            headers: {
                'Authorization': `Bearer ${GITHUB_TOKEN}`,
                'Accept': 'application/vnd.github+json',
                'Content-Type': 'application/json'
            },
            data: { ref, inputs }
        });

        res.json({ 
            success: true, 
            message: 'Workflow dispatch triggered successfully' 
        });
    } catch (error) {
        console.error('Failed to trigger workflow:', error);
        res.status(500).json({ 
            error: 'Failed to trigger workflow',
            message: error.message 
        });
    }
});

/**
 * Get deployment history
 */
router.get('/deployments', requireAuth, requirePermission(PERMISSIONS.CICD_VIEW), cicdLimiter, async (req, res) => {
    try {
        const { per_page = 10, page = 1 } = req.query;

        const deployments = await githubRequest(
            `/repos/${GITHUB_OWNER}/${GITHUB_REPO}/deployments?per_page=${per_page}&page=${page}`
        );

        const formattedDeployments = await Promise.all(
            (deployments || []).map(async deployment => {
                try {
                    // Get deployment statuses
                    const statuses = await githubRequest(
                        `/repos/${GITHUB_OWNER}/${GITHUB_REPO}/deployments/${deployment.id}/statuses`
                    );

                    return {
                        id: deployment.id,
                        ref: deployment.ref,
                        environment: deployment.environment,
                        description: deployment.description,
                        creator: deployment.creator?.login,
                        createdAt: deployment.created_at,
                        updatedAt: deployment.updated_at,
                        status: statuses[0]?.state || 'unknown',
                        statusDescription: statuses[0]?.description || ''
                    };
                } catch (error) {
                    return {
                        id: deployment.id,
                        ref: deployment.ref,
                        environment: deployment.environment,
                        error: 'Failed to fetch status'
                    };
                }
            })
        );

        res.json({
            deployments: formattedDeployments,
            page: parseInt(page),
            perPage: parseInt(per_page)
        });
    } catch (error) {
        console.error('Failed to fetch deployments:', error);
        res.status(500).json({ 
            error: 'Failed to fetch deployments',
            message: error.message 
        });
    }
});

module.exports = router;
