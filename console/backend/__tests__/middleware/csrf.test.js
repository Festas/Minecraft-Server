const request = require('supertest');
const { app } = require('../../server');

describe('CSRF Protection Middleware', () => {
    let csrfToken;
    let cookies;

    beforeAll(async () => {
        // Get a CSRF token and cookies for testing
        const response = await request(app)
            .get('/api/csrf-token');
        
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('csrfToken');
        
        csrfToken = response.body.csrfToken;
        cookies = response.headers['set-cookie'];
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
                .post('/api/logout')
                .set('Cookie', cookies)
                .set('CSRF-Token', csrfToken);
            
            expectNoCsrfError(response);
        });

        it('should pass CSRF validation when valid token is provided in X-CSRF-Token header', async () => {
            const response = await request(app)
                .post('/api/logout')
                .set('Cookie', cookies)
                .set('X-CSRF-Token', csrfToken);
            
            expectNoCsrfError(response);
        });
    });

    describe('CSRF validation logging', () => {
        it('should log CSRF validation success for protected endpoints', async () => {
            const consoleSpy = jest.spyOn(console, 'log');
            
            await request(app)
                .post('/api/logout')
                .set('Cookie', cookies)
                .set('CSRF-Token', csrfToken);
            
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
    });
});
