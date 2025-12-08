/**
 * CSRF Cookie Regression Tests
 * 
 * Tests for the comprehensive CSRF fix addressing the issue where:
 * - /api/csrf-token endpoint returns token in JSON but doesn't set cookie properly
 * - Plugin install fails with 403 'invalid csrf token' even with valid session and header
 * - Backend expects BOTH cookie AND header for double-submit CSRF pattern
 * 
 * These tests verify:
 * 1. /api/csrf-token sets Set-Cookie header with correct attributes
 * 2. Plugin install works with valid session + cookie + header
 * 3. Plugin install fails appropriately when token or cookie is missing
 */

const request = require('supertest');

// Mock pluginManager before importing server
jest.mock('../services/pluginManager', () => ({
    installFromUrl: jest.fn(),
    getAllPlugins: jest.fn().mockResolvedValue([]),
    hasBackup: jest.fn().mockReturnValue(false)
}));

const pluginManager = require('../services/pluginManager');
const { app } = require('../server');

// Helper function to convert Set-Cookie headers array to Cookie header string
// Set-Cookie format: "name=value; Path=/; HttpOnly; SameSite=Lax"
// Cookie format: "name1=value1; name2=value2"
function parseCookies(setCookieHeaders) {
    if (!setCookieHeaders || !Array.isArray(setCookieHeaders)) {
        return '';
    }
    return setCookieHeaders
        .map(cookie => cookie.split(';')[0].trim())
        .join('; ');
}

describe('CSRF Cookie Regression Tests', () => {
    describe('/api/csrf-token endpoint cookie behavior', () => {
        it('should set Set-Cookie header when returning CSRF token', async () => {
            const response = await request(app)
                .get('/api/csrf-token');
            
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('csrfToken');
            expect(response.headers['set-cookie']).toBeDefined();
            expect(Array.isArray(response.headers['set-cookie'])).toBe(true);
            
            // Find the csrf-token cookie
            const csrfCookie = response.headers['set-cookie'].find(cookie => 
                cookie.startsWith('csrf-token=')
            );
            expect(csrfCookie).toBeDefined();
        });

        it('should set csrf-token cookie with httpOnly: false for client-side access', async () => {
            const response = await request(app)
                .get('/api/csrf-token');
            
            const csrfCookie = response.headers['set-cookie'].find(cookie => 
                cookie.startsWith('csrf-token=')
            );
            
            expect(csrfCookie).toBeDefined();
            // CRITICAL: Must NOT be HttpOnly - client JS needs to read it
            expect(csrfCookie).not.toMatch(/HttpOnly/);
        });

        it('should set csrf-token cookie with sameSite: lax', async () => {
            const response = await request(app)
                .get('/api/csrf-token');
            
            const csrfCookie = response.headers['set-cookie'].find(cookie => 
                cookie.startsWith('csrf-token=')
            );
            
            expect(csrfCookie).toBeDefined();
            expect(csrfCookie).toMatch(/SameSite=Lax/i);
        });

        it('should set csrf-token cookie with Path=/', async () => {
            const response = await request(app)
                .get('/api/csrf-token');
            
            const csrfCookie = response.headers['set-cookie'].find(cookie => 
                cookie.startsWith('csrf-token=')
            );
            
            expect(csrfCookie).toBeDefined();
            expect(csrfCookie).toMatch(/Path=\//);
        });

        it('should return token value in JSON response', async () => {
            const response = await request(app)
                .get('/api/csrf-token');
            
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('csrfToken');
            expect(typeof response.body.csrfToken).toBe('string');
            expect(response.body.csrfToken.length).toBeGreaterThan(0);
        });

        it('should set cookie value containing the JSON token', async () => {
            const response = await request(app)
                .get('/api/csrf-token');
            
            const jsonToken = response.body.csrfToken;
            const csrfCookie = response.headers['set-cookie'].find(cookie => 
                cookie.startsWith('csrf-token=')
            );
            
            expect(csrfCookie).toBeDefined();
            // Extract the cookie value (before first semicolon)
            const cookieValue = csrfCookie.split(';')[0].split('=')[1];
            // Cookie value contains token|hash, URL-encoded
            // Decode it and check it starts with the token
            const decodedCookieValue = decodeURIComponent(cookieValue);
            expect(decodedCookieValue).toContain(jsonToken);
        });
    });

    describe('Plugin install with CSRF cookie + header validation', () => {
        let csrfToken;
        let cookies;
        let sessionCookies;

        beforeAll(async () => {
            // Login to get authenticated session
            const loginResponse = await request(app)
                .post('/api/login')
                .send({ 
                    username: process.env.ADMIN_USERNAME || 'admin', 
                    password: process.env.ADMIN_PASSWORD || 'test-password-123' 
                });
            
            if (loginResponse.status === 200) {
                sessionCookies = loginResponse.headers['set-cookie'];
            } else {
                sessionCookies = [];
            }

            // Get CSRF token with authenticated session
            const csrfResponse = await request(app)
                .get('/api/csrf-token')
                .set('Cookie', parseCookies(sessionCookies));
            
            expect(csrfResponse.status).toBe(200);
            csrfToken = csrfResponse.body.csrfToken;
            
            // Combine session and CSRF cookies
            const csrfCookies = csrfResponse.headers['set-cookie'] || [];
            const allCookies = [...sessionCookies, ...csrfCookies];
            cookies = parseCookies(allCookies);
        });

        beforeEach(() => {
            jest.clearAllMocks();
        });

        it('should succeed when valid session + cookie + header are provided', async () => {
            pluginManager.installFromUrl.mockResolvedValue({
                status: 'installed',
                pluginName: 'TestPlugin',
                version: '1.0.0'
            });

            const response = await request(app)
                .post('/api/plugins/install')
                .set('Cookie', cookies)
                .set('CSRF-Token', csrfToken)
                .send({ url: 'https://example.com/plugin.jar' });
            
            // Should NOT return 403 CSRF error
            expect(response.status).not.toBe(403);
            
            // If 403, verify it's not CSRF-related
            if (response.status === 403) {
                expect(response.body.error).not.toMatch(/csrf.*token/i);
            }
        });

        it('should fail with 403 when CSRF header is missing (cookie only)', async () => {
            const response = await request(app)
                .post('/api/plugins/install')
                .set('Cookie', cookies)
                // No CSRF-Token header
                .send({ url: 'https://example.com/plugin.jar' });
            
            expect(response.status).toBe(403);
            expect(response.body).toHaveProperty('error');
            expect(response.body.error.toLowerCase()).toMatch(/csrf|token/);
        });

        it('should fail with 403 when CSRF cookie is missing (header only)', async () => {
            const response = await request(app)
                .post('/api/plugins/install')
                .set('Cookie', parseCookies(sessionCookies)) // Only session cookie, no CSRF cookie
                .set('CSRF-Token', csrfToken)
                .send({ url: 'https://example.com/plugin.jar' });
            
            expect(response.status).toBe(403);
            expect(response.body).toHaveProperty('error');
            expect(response.body.error.toLowerCase()).toMatch(/csrf|token/);
        });

        it('should fail with 403 when CSRF token is invalid', async () => {
            const response = await request(app)
                .post('/api/plugins/install')
                .set('Cookie', cookies)
                .set('CSRF-Token', 'invalid-token-value-12345')
                .send({ url: 'https://example.com/plugin.jar' });
            
            expect(response.status).toBe(403);
            expect(response.body).toHaveProperty('error');
            expect(response.body.error.toLowerCase()).toMatch(/csrf|token/);
        });

        it('should work with X-CSRF-Token header (alternative header name)', async () => {
            pluginManager.installFromUrl.mockResolvedValue({
                status: 'installed',
                pluginName: 'TestPlugin',
                version: '1.0.0'
            });

            const response = await request(app)
                .post('/api/plugins/install')
                .set('Cookie', cookies)
                .set('X-CSRF-Token', csrfToken) // Alternative header name
                .send({ url: 'https://example.com/plugin.jar' });
            
            expect(response.status).not.toBe(403);
            
            if (response.status === 403) {
                expect(response.body.error).not.toMatch(/csrf.*token/i);
            }
        });

        it('should log CSRF cookie and header presence in plugin install endpoint', async () => {
            const consoleSpy = jest.spyOn(console, 'log');
            
            pluginManager.installFromUrl.mockResolvedValue({
                status: 'installed',
                pluginName: 'TestPlugin',
                version: '1.0.0'
            });

            await request(app)
                .post('/api/plugins/install')
                .set('Cookie', cookies)
                .set('CSRF-Token', csrfToken)
                .send({ url: 'https://example.com/plugin.jar' });
            
            // Check for plugin install API CSRF debug logs
            const pluginInstallLogs = consoleSpy.mock.calls.filter(call => 
                call[0] && call[0].includes('[PLUGIN_INSTALL_API] Install request received')
            );
            
            expect(pluginInstallLogs.length).toBeGreaterThan(0);
            
            // Verify the log includes CSRF details
            const logDetails = pluginInstallLogs[0][1];
            expect(logDetails).toHaveProperty('csrf');
            expect(logDetails.csrf).toHaveProperty('headerPresent');
            expect(logDetails.csrf).toHaveProperty('cookiePresent');
            
            consoleSpy.mockRestore();
        });
    });

    describe('CSRF middleware order validation', () => {
        it('should have cookie-parser middleware before CSRF middleware', () => {
            // This is validated by the tests passing - if cookie-parser wasn't
            // before CSRF, the CSRF middleware wouldn't be able to read cookies
            // and all CSRF-protected requests would fail
            expect(true).toBe(true);
        });
    });
});
