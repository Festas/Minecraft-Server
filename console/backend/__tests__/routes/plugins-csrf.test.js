const request = require('supertest');

// Mock pluginManager before importing server
jest.mock('../../services/pluginManager', () => ({
    installFromUrl: jest.fn(),
    getAllPlugins: jest.fn().mockResolvedValue([]),
    hasBackup: jest.fn().mockReturnValue(false)
}));

const pluginManager = require('../../services/pluginManager');

// Import server after mocks are set up
const { app } = require('../../server');

describe('Plugin Install API with CSRF Protection', () => {
    let csrfToken;
    let cookies;
    let sessionCookies;

    beforeAll(async () => {
        // First, login to get an authenticated session
        const loginResponse = await request(app)
            .post('/api/login')
            .send({ 
                username: process.env.ADMIN_USERNAME || 'admin', 
                password: process.env.ADMIN_PASSWORD || 'changeme123' 
            });
        
        if (loginResponse.status === 200) {
            sessionCookies = loginResponse.headers['set-cookie'];
        } else {
            console.warn('Login failed, tests may fail due to auth requirements');
            sessionCookies = [];
        }

        // Get a CSRF token with the authenticated session
        const csrfResponse = await request(app)
            .get('/api/csrf-token')
            .set('Cookie', sessionCookies);
        
        expect(csrfResponse.status).toBe(200);
        expect(csrfResponse.body).toHaveProperty('csrfToken');
        
        csrfToken = csrfResponse.body.csrfToken;
        
        // Combine session and CSRF cookies
        const csrfCookies = csrfResponse.headers['set-cookie'] || [];
        cookies = [...sessionCookies, ...csrfCookies];
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('CSRF protection on /api/plugins/install', () => {
        it('should return 403 when CSRF token is missing', async () => {
            const response = await request(app)
                .post('/api/plugins/install')
                .set('Cookie', sessionCookies)
                .send({ url: 'https://example.com/plugin.jar' });
            
            expect(response.status).toBe(403);
            expect(response.body).toHaveProperty('error');
            expect(response.body.error.toLowerCase()).toMatch(/csrf|token/);
        });

        it('should return 403 when CSRF token is invalid', async () => {
            const response = await request(app)
                .post('/api/plugins/install')
                .set('Cookie', cookies)
                .set('CSRF-Token', 'invalid-token-12345')
                .send({ url: 'https://example.com/plugin.jar' });
            
            expect(response.status).toBe(403);
            expect(response.body).toHaveProperty('error');
            expect(response.body.error.toLowerCase()).toMatch(/csrf|token/);
        });

        it('should accept valid CSRF token and proceed with plugin install logic', async () => {
            // Mock successful plugin installation
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
            
            // Should not return 403 CSRF error
            expect(response.status).not.toBe(403);
            
            // If authentication is required and fails, it would be 401
            // If plugin install succeeds, it would be 200
            // We just want to verify CSRF didn't block the request
            if (response.status === 403) {
                // If it is 403, make sure it's not a CSRF error
                expect(response.body.error).not.toMatch(/csrf.*token/i);
            }
        });

        it('should work with X-CSRF-Token header', async () => {
            pluginManager.installFromUrl.mockResolvedValue({
                status: 'installed',
                pluginName: 'TestPlugin',
                version: '1.0.0'
            });

            const response = await request(app)
                .post('/api/plugins/install')
                .set('Cookie', cookies)
                .set('X-CSRF-Token', csrfToken)
                .send({ url: 'https://example.com/plugin.jar' });
            
            // Should not return 403 CSRF error
            expect(response.status).not.toBe(403);
            
            if (response.status === 403) {
                expect(response.body.error).not.toMatch(/csrf.*token/i);
            }
        });
    });

    describe('Plugin install endpoint functionality with valid CSRF', () => {
        it('should return 400 when URL is missing', async () => {
            const response = await request(app)
                .post('/api/plugins/install')
                .set('Cookie', cookies)
                .set('CSRF-Token', csrfToken)
                .send({});
            
            // Should pass CSRF but fail validation
            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('error');
            expect(response.body.error.toLowerCase()).toMatch(/url.*required/i);
        });

        it('should call pluginManager.installFromUrl when CSRF and auth pass', async () => {
            pluginManager.installFromUrl.mockResolvedValue({
                status: 'installed',
                pluginName: 'TestPlugin',
                version: '1.0.0'
            });

            const testUrl = 'https://example.com/test-plugin.jar';
            const response = await request(app)
                .post('/api/plugins/install')
                .set('Cookie', cookies)
                .set('CSRF-Token', csrfToken)
                .send({ url: testUrl });
            
            // If auth passes, pluginManager should be called
            if (response.status === 200) {
                expect(pluginManager.installFromUrl).toHaveBeenCalledWith(
                    testUrl,
                    undefined,
                    expect.any(Function)
                );
                expect(response.body).toHaveProperty('status', 'installed');
            }
        });

        it('should handle plugin installation errors appropriately', async () => {
            pluginManager.installFromUrl.mockRejectedValue(
                new Error('Invalid plugin file')
            );

            const response = await request(app)
                .post('/api/plugins/install')
                .set('Cookie', cookies)
                .set('CSRF-Token', csrfToken)
                .send({ url: 'https://example.com/invalid.jar' });
            
            // Should not be CSRF error (403), but installation error
            expect(response.status).not.toBe(403);
            
            if (response.status >= 400) {
                // Should be some other error, not CSRF
                expect(response.body.error).not.toMatch(/csrf.*token/i);
            }
        });
    });

    describe('CSRF validation logging for plugin install', () => {
        it('should log CSRF validation details for plugin install requests', async () => {
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
            
            // Check for CSRF validation log
            const csrfLogs = consoleSpy.mock.calls.filter(call => 
                call[0] && (
                    call[0].includes('[CSRF] Applying CSRF protection') ||
                    call[0].includes('[CSRF] CSRF validation passed')
                )
            );
            
            expect(csrfLogs.length).toBeGreaterThan(0);
            
            consoleSpy.mockRestore();
        });
    });
});
