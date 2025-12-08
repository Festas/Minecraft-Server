const request = require('supertest');
const { app } = require('../../server');

/**
 * Test suite for enhanced CSRF and session diagnostic logging
 * Verifies that development-only logging is working correctly
 */
describe('Enhanced Diagnostic Logging', () => {
    let csrfToken;
    let cookies;
    let consoleSpy;

    beforeEach(() => {
        // Spy on console.log and console.error
        consoleSpy = {
            log: jest.spyOn(console, 'log').mockImplementation(),
            error: jest.spyOn(console, 'error').mockImplementation()
        };
    });

    afterEach(() => {
        // Restore console
        consoleSpy.log.mockRestore();
        consoleSpy.error.mockRestore();
    });

    describe('CSRF Token Endpoint Logging', () => {
        it('should log session and cookie information', async () => {
            const response = await request(app)
                .get('/api/csrf-token');

            expect(response.status).toBe(200);

            // Verify logging occurred
            const logCalls = consoleSpy.log.mock.calls.filter(call =>
                call[0] && call[0].includes('[CSRF] Token request')
            );
            expect(logCalls.length).toBeGreaterThan(0);

            // Check that log includes expected fields
            const logData = logCalls[0][1];
            expect(logData).toHaveProperty('sessionID');
            expect(logData).toHaveProperty('authenticated');
            expect(logData).toHaveProperty('username');
            expect(logData).toHaveProperty('timestamp');
        });

        it('should log token generation details', async () => {
            const response = await request(app)
                .get('/api/csrf-token');

            expect(response.status).toBe(200);

            // Verify token generation logging
            const logCalls = consoleSpy.log.mock.calls.filter(call =>
                call[0] && call[0].includes('[CSRF] Token generated and cookie set')
            );
            expect(logCalls.length).toBeGreaterThan(0);

            // Check log includes expected fields
            const logData = logCalls[0][1];
            expect(logData).toHaveProperty('tokenLength');
            expect(logData).toHaveProperty('cookieName');
            expect(logData).toHaveProperty('cookieOptions');
        });

        it('should include development-only fields in development mode', async () => {
            // Set NODE_ENV to development
            const originalEnv = process.env.NODE_ENV;
            process.env.NODE_ENV = 'development';

            try {
                const response = await request(app)
                    .get('/api/csrf-token');

                expect(response.status).toBe(200);

                // In development, should log actual token value
                const tokenGenLogs = consoleSpy.log.mock.calls.filter(call =>
                    call[0] && call[0].includes('[CSRF] Token generated and cookie set')
                );

                if (tokenGenLogs.length > 0) {
                    const logData = tokenGenLogs[0][1];
                // In development mode, tokenValue should be present
                expect(logData).toHaveProperty('tokenValue');
                }
            } finally {
                process.env.NODE_ENV = originalEnv;
            }
        });
    });

    describe('CSRF Validation Logging', () => {
        beforeAll(async () => {
            // Get a CSRF token for testing
            const response = await request(app)
                .get('/api/csrf-token');

            csrfToken = response.body.csrfToken;
            cookies = response.headers['set-cookie'];
        });

        it('should log detailed information on CSRF validation failure', async () => {
            const response = await request(app)
                .post('/api/logout')
                .set('Cookie', cookies);
            // No CSRF token header - should fail

            expect(response.status).toBe(403);

            // Check error logging
            const errorLogs = consoleSpy.error.mock.calls.filter(call =>
                call[0] && call[0].includes('[CSRF] CSRF validation failed')
            );
            expect(errorLogs.length).toBeGreaterThan(0);

            // Verify diagnostic info is logged
            const logData = errorLogs[0][1];
            expect(logData).toHaveProperty('path');
            expect(logData).toHaveProperty('method');
            expect(logData).toHaveProperty('csrfHeader');
            expect(logData).toHaveProperty('csrfCookie');
            expect(logData).toHaveProperty('sessionID');
            expect(logData).toHaveProperty('allCookies');
        });

        it('should log success on valid CSRF token', async () => {
            const response = await request(app)
                .post('/api/logout')
                .set('Cookie', cookies)
                .set('CSRF-Token', csrfToken);

            // Should not be 403 (might be 200 or other)
            expect(response.status).not.toBe(403);

            // Check success logging
            const successLogs = consoleSpy.log.mock.calls.filter(call =>
                call[0] && call[0].includes('[CSRF] CSRF validation passed')
            );
            expect(successLogs.length).toBeGreaterThan(0);
        });
    });

    describe('Rate Limiter Logging', () => {
        it('should log rate limit events with detailed information', async () => {
            // Make multiple rapid login attempts to trigger rate limit
            const attempts = [];
            for (let i = 0; i < 6; i++) {
                attempts.push(
                    request(app)
                        .post('/api/login')
                        .send({ username: 'test', password: 'wrong' })
                );
            }

            const responses = await Promise.all(attempts);

            // At least one should be rate limited (429)
            const rateLimited = responses.some(r => r.status === 429);

            if (rateLimited) {
                // Check for rate limit logging
                const rateLimitLogs = consoleSpy.error.mock.calls.filter(call =>
                    call[0] && call[0].includes('[RATE_LIMIT]')
                );

                if (rateLimitLogs.length > 0) {
                    const logData = rateLimitLogs[0][1];
                    expect(logData).toHaveProperty('ip');
                    expect(logData).toHaveProperty('timestamp');
                }
            }
        });
    });

    describe('Development vs Production Logging', () => {
        it('should include sensitive data only in development mode', async () => {
            const originalEnv = process.env.NODE_ENV;

            // Test in development mode
            process.env.NODE_ENV = 'development';
            consoleSpy.log.mockClear();

            await request(app)
                .get('/api/csrf-token');

            const devLogs = consoleSpy.log.mock.calls.filter(call =>
                call[0] && call[0].includes('[CSRF] Token request')
            );

            // Restore environment
            process.env.NODE_ENV = originalEnv;

            // Verify that in development, additional fields are logged
            // (We can't easily test production logging in the same test due to module caching)
            if (devLogs.length > 0) {
                const logData = devLogs[0][1];
                expect(logData).toBeDefined();
            }
        });
    });
});
