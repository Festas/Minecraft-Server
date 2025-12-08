const request = require('supertest');
const { app } = require('../../server');

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

describe('CSRF Protection Middleware', () => {
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

        // Get a CSRF token and cookies for testing with authenticated session
        const parsedSession = parseCookies(sessionCookies);
        
        const response = await request(app)
            .get('/api/csrf-token')
            .set('Cookie', parsedSession);
        
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('csrfToken');
        
        csrfToken = response.body.csrfToken;
        
        // Combine session and CSRF cookies
        const csrfCookies = response.headers['set-cookie'] || [];
        const allCookies = [...sessionCookies, ...csrfCookies];
        cookies = parseCookies(allCookies);
    });

    describe('CSRF token endpoint', () => {
        it('should return a CSRF token', async () => {
            const response = await request(app)
                .get('/api/csrf-token');
            
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('csrfToken');
            expect(typeof response.body.csrfToken).toBe('string');
            expect(response.body.csrfToken.length).toBeGreaterThan(0);
        });

        it('should set csrf-token cookie with correct attributes', async () => {
            const response = await request(app)
                .get('/api/csrf-token');
            
            expect(response.status).toBe(200);
            expect(response.headers['set-cookie']).toBeDefined();
            
            const csrfCookie = response.headers['set-cookie'].find(cookie => 
                cookie.startsWith('csrf-token=')
            );
            expect(csrfCookie).toBeDefined();
            // MUST NOT be HttpOnly - client JS needs to read cookie for double-submit pattern
            expect(csrfCookie).not.toMatch(/HttpOnly/);
            expect(csrfCookie).toMatch(/Path=\//);
            expect(csrfCookie).toMatch(/SameSite=Lax/i);
        });
    });

    describe('CSRF validation on protected endpoints', () => {
        it('should skip CSRF validation for /api/login', async () => {
            const response = await request(app)
                .post('/api/login')
                .send({ username: 'admin', password: 'test' });
            
            // Should not return 403 CSRF error (might return 401 for invalid creds)
            expect(response.status).not.toBe(403);
            expect(response.body.error).not.toMatch(/csrf/i);
        });

        it('should skip CSRF validation for /api/session GET', async () => {
            const response = await request(app)
                .get('/api/session');
            
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('authenticated');
        });

        it('should skip CSRF validation for /api/csrf-token GET', async () => {
            const response = await request(app)
                .get('/api/csrf-token');
            
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('csrfToken');
        });
    });

    describe('CSRF validation failures', () => {
        it('should return 403 when CSRF token is missing on protected POST endpoint', async () => {
            const response = await request(app)
                .post('/api/logout');
            
            expect(response.status).toBe(403);
            expect(response.body).toHaveProperty('error');
            expect(response.body.error.toLowerCase()).toMatch(/csrf|token/);
        });

        it('should return 403 when CSRF header is missing but cookie is present', async () => {
            const response = await request(app)
                .post('/api/logout')
                .set('Cookie', cookies);
            
            expect(response.status).toBe(403);
            expect(response.body).toHaveProperty('error');
            expect(response.body.error.toLowerCase()).toMatch(/csrf|token/);
        });

        it('should return 403 when CSRF token is invalid', async () => {
            const response = await request(app)
                .post('/api/logout')
                .set('Cookie', cookies)
                .set('CSRF-Token', 'invalid-token-12345');
            
            expect(response.status).toBe(403);
            expect(response.body).toHaveProperty('error');
            expect(response.body.error.toLowerCase()).toMatch(/csrf|token/);
        });
    });

    describe('CSRF validation success', () => {
        // Helper to verify CSRF doesn't block the request
        const expectNoCsrfError = (response) => {
            expect(response.status).not.toBe(403);
            if (response.status === 500 || response.status === 401) {
                expect(response.body.error).not.toMatch(/csrf.*token/i);
            }
        };

        it('should pass CSRF validation when valid token is provided in CSRF-Token header', async () => {
            const response = await request(app)
                .post('/api/commands/history')
                .set('Cookie', cookies)
                .set('CSRF-Token', csrfToken)
                .send({ command: 'test command' });
            
            expectNoCsrfError(response);
        });

        it('should pass CSRF validation when valid token is provided in X-CSRF-Token header', async () => {
            const response = await request(app)
                .post('/api/commands/history')
                .set('Cookie', cookies)
                .set('X-CSRF-Token', csrfToken)
                .send({ command: 'test command' });
            
            expectNoCsrfError(response);
        });
    });

    describe('CSRF validation logging', () => {
        it('should log CSRF validation success for protected endpoints', async () => {
            const consoleSpy = jest.spyOn(console, 'log');
            
            await request(app)
                .post('/api/commands/history')
                .set('Cookie', cookies)
                .set('CSRF-Token', csrfToken)
                .send({ command: 'test' });
            
            // Check that success log was called
            const csrfSuccessLogs = consoleSpy.mock.calls.filter(call => 
                call[0] && call[0].includes('[CSRF] CSRF validation passed')
            );
            expect(csrfSuccessLogs.length).toBeGreaterThan(0);
            
            consoleSpy.mockRestore();
        });

        it('should log CSRF validation failure details', async () => {
            const consoleErrorSpy = jest.spyOn(console, 'error');
            
            await request(app)
                .post('/api/logout')
                .set('Cookie', cookies)
                .set('CSRF-Token', 'invalid-token');
            
            // Check that error log was called
            const csrfErrorLogs = consoleErrorSpy.mock.calls.filter(call => 
                call[0] && call[0].includes('[CSRF] CSRF validation failed')
            );
            expect(csrfErrorLogs.length).toBeGreaterThan(0);
            
            consoleErrorSpy.mockRestore();
        });

        it('should log session details in CSRF validation logs', async () => {
            const consoleSpy = jest.spyOn(console, 'log');
            
            await request(app)
                .post('/api/commands/history')
                .set('Cookie', cookies)
                .set('CSRF-Token', csrfToken)
                .send({ command: 'test' });
            
            // Find the CSRF validation log
            const csrfLogs = consoleSpy.mock.calls.filter(call => 
                call[0] && call[0].includes('[CSRF] Applying CSRF protection')
            );
            expect(csrfLogs.length).toBeGreaterThan(0);
            
            // Verify session details are logged
            const logData = csrfLogs[0][1];
            expect(logData).toHaveProperty('session');
            expect(logData.session).toHaveProperty('sessionID');
            expect(logData.session).toHaveProperty('authenticated');
            expect(logData.session).toHaveProperty('username');
            
            consoleSpy.mockRestore();
        });

        it('should log token presence and header source', async () => {
            const consoleSpy = jest.spyOn(console, 'log');
            
            await request(app)
                .post('/api/commands/history')
                .set('Cookie', cookies)
                .set('X-CSRF-Token', csrfToken)
                .send({ command: 'test' });
            
            // Find the CSRF validation log
            const csrfLogs = consoleSpy.mock.calls.filter(call => 
                call[0] && call[0].includes('[CSRF] Applying CSRF protection')
            );
            expect(csrfLogs.length).toBeGreaterThan(0);
            
            // Verify token details are logged
            const logData = csrfLogs[0][1];
            expect(logData).toHaveProperty('tokens');
            expect(logData.tokens).toHaveProperty('headerPresent');
            expect(logData.tokens).toHaveProperty('cookiePresent');
            expect(logData.tokens).toHaveProperty('headerSource');
            expect(logData.tokens.headerSource).toBe('X-CSRF-Token');
            
            consoleSpy.mockRestore();
        });

        it('should log specific failure reason when CSRF validation fails', async () => {
            const consoleErrorSpy = jest.spyOn(console, 'error');
            
            await request(app)
                .post('/api/logout')
                .set('Cookie', cookies)
                .set('CSRF-Token', 'invalid-token');
            
            // Find the CSRF failure log
            const csrfErrorLogs = consoleErrorSpy.mock.calls.filter(call => 
                call[0] && call[0].includes('[CSRF] CSRF validation failed')
            );
            expect(csrfErrorLogs.length).toBeGreaterThan(0);
            
            // Verify failure reason is logged
            const logData = csrfErrorLogs[0][1];
            expect(logData).toHaveProperty('failureReason');
            expect(typeof logData.failureReason).toBe('string');
            expect(logData.failureReason.length).toBeGreaterThan(0);
            
            consoleErrorSpy.mockRestore();
        });

        it('should log missing header as failure reason when session is authenticated', async () => {
            const consoleErrorSpy = jest.spyOn(console, 'error');
            
            // Send authenticated cookies with CSRF cookie but no CSRF header
            await request(app)
                .post('/api/commands/history')
                .set('Cookie', cookies) // has session + csrf cookie but no csrf header
                .send({ command: 'test' });
            
            // Find the CSRF failure log
            const csrfErrorLogs = consoleErrorSpy.mock.calls.filter(call => 
                call[0] && call[0].includes('[CSRF] CSRF validation failed')
            );
            expect(csrfErrorLogs.length).toBeGreaterThan(0);
            
            // Verify failure reason mentions missing header
            const logData = csrfErrorLogs[0][1];
            expect(logData.failureReason).toMatch(/header/i);
            expect(logData.failureReason).toMatch(/missing/i);
            
            consoleErrorSpy.mockRestore();
        });

        it('should support both CSRF-Token and X-CSRF-Token headers', async () => {
            const consoleSpy = jest.spyOn(console, 'log');
            
            // Test CSRF-Token header
            await request(app)
                .post('/api/commands/history')
                .set('Cookie', cookies)
                .set('CSRF-Token', csrfToken)
                .send({ command: 'test1' });
            
            const csrfTokenLogs = consoleSpy.mock.calls.filter(call => 
                call[0] && call[0].includes('[CSRF] Applying CSRF protection')
            );
            expect(csrfTokenLogs.length).toBeGreaterThan(0);
            let logData = csrfTokenLogs[csrfTokenLogs.length - 1][1];
            expect(logData.tokens.headerSource).toBe('CSRF-Token');
            
            // Test X-CSRF-Token header
            await request(app)
                .post('/api/commands/history')
                .set('Cookie', cookies)
                .set('X-CSRF-Token', csrfToken)
                .send({ command: 'test2' });
            
            const xCsrfTokenLogs = consoleSpy.mock.calls.filter(call => 
                call[0] && call[0].includes('[CSRF] Applying CSRF protection')
            );
            expect(xCsrfTokenLogs.length).toBeGreaterThan(1);
            logData = xCsrfTokenLogs[xCsrfTokenLogs.length - 1][1];
            expect(logData.tokens.headerSource).toBe('X-CSRF-Token');
            
            consoleSpy.mockRestore();
        });
    });
});
