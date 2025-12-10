/**
 * Bearer Auth Middleware Tests (API Key Support)
 */

const { 
    verifyApiKey, 
    requireAuthOrToken, 
    requireApiScope 
} = require('../../auth/bearerAuth');

// Mock the apiKeyService
jest.mock('../../services/apiKeyService');
const apiKeyService = require('../../services/apiKeyService');

describe('Bearer Auth with API Keys', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('verifyApiKey', () => {
        it('should verify valid API key', () => {
            const mockKeyData = {
                id: 'key-1',
                name: 'Test Key',
                scopes: ['server:read'],
                enabled: true
            };

            apiKeyService.validateApiKey.mockReturnValue(mockKeyData);

            const req = {
                headers: {
                    authorization: 'Bearer mcs_validkey123456789'
                }
            };

            const result = verifyApiKey(req);

            expect(result).toEqual(mockKeyData);
            expect(apiKeyService.validateApiKey).toHaveBeenCalledWith('mcs_validkey123456789');
        });

        it('should return null for invalid API key', () => {
            apiKeyService.validateApiKey.mockReturnValue(null);

            const req = {
                headers: {
                    authorization: 'Bearer mcs_invalidkey'
                }
            };

            const result = verifyApiKey(req);
            expect(result).toBeNull();
        });

        it('should return null for non-mcs_ prefixed token', () => {
            const req = {
                headers: {
                    authorization: 'Bearer some_other_token'
                }
            };

            const result = verifyApiKey(req);
            expect(result).toBeNull();
            expect(apiKeyService.validateApiKey).not.toHaveBeenCalled();
        });

        it('should return null when no authorization header', () => {
            const req = {
                headers: {}
            };

            const result = verifyApiKey(req);
            expect(result).toBeNull();
        });

        it('should return null for non-Bearer auth', () => {
            const req = {
                headers: {
                    authorization: 'Basic username:password'
                }
            };

            const result = verifyApiKey(req);
            expect(result).toBeNull();
        });
    });

    describe('requireAuthOrToken', () => {
        it('should authenticate with valid API key', () => {
            const mockKeyData = {
                id: 'key-1',
                name: 'Test Key',
                scopes: ['server:read']
            };

            apiKeyService.validateApiKey.mockReturnValue(mockKeyData);

            const req = {
                headers: {
                    authorization: 'Bearer mcs_validkey'
                },
                session: {}
            };

            const res = {};
            const next = jest.fn();

            requireAuthOrToken(req, res, next);

            expect(next).toHaveBeenCalled();
            expect(req.authenticatedVia).toBe('apiKey');
            expect(req.apiKey).toEqual(mockKeyData);
        });

        it('should fallback to session auth when no API key', () => {
            apiKeyService.validateApiKey.mockReturnValue(null);
            
            // Mock PLUGIN_ADMIN_TOKEN as not configured
            const originalEnv = process.env.PLUGIN_ADMIN_TOKEN;
            delete process.env.PLUGIN_ADMIN_TOKEN;

            const req = {
                headers: {},
                session: {
                    authenticated: true,
                    username: 'testuser'
                }
            };

            const res = {};
            const next = jest.fn();

            requireAuthOrToken(req, res, next);

            expect(next).toHaveBeenCalled();
            expect(req.authenticatedVia).toBe('session');

            // Restore env
            if (originalEnv) {
                process.env.PLUGIN_ADMIN_TOKEN = originalEnv;
            }
        });

        it('should return 401 when no valid authentication', () => {
            apiKeyService.validateApiKey.mockReturnValue(null);
            
            const originalEnv = process.env.PLUGIN_ADMIN_TOKEN;
            delete process.env.PLUGIN_ADMIN_TOKEN;

            const req = {
                headers: {},
                session: {}
            };

            const res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn()
            };
            const next = jest.fn();

            requireAuthOrToken(req, res, next);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    error: 'Authentication required'
                })
            );
            expect(next).not.toHaveBeenCalled();

            if (originalEnv) {
                process.env.PLUGIN_ADMIN_TOKEN = originalEnv;
            }
        });
    });

    describe('requireApiScope', () => {
        it('should allow request with required scope', () => {
            const mockKeyData = {
                id: 'key-1',
                scopes: ['server:read', 'server:control']
            };

            apiKeyService.hasScope.mockReturnValue(true);

            const req = {
                authenticatedVia: 'apiKey',
                apiKey: mockKeyData
            };

            const res = {};
            const next = jest.fn();

            const middleware = requireApiScope('server:read');
            middleware(req, res, next);

            expect(next).toHaveBeenCalled();
            expect(apiKeyService.hasScope).toHaveBeenCalledWith(mockKeyData, 'server:read');
        });

        it('should reject request without required scope', () => {
            const mockKeyData = {
                id: 'key-1',
                scopes: ['server:read']
            };

            apiKeyService.hasScope.mockReturnValue(false);

            const req = {
                authenticatedVia: 'apiKey',
                apiKey: mockKeyData
            };

            const res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn()
            };
            const next = jest.fn();

            const middleware = requireApiScope('players:manage');
            middleware(req, res, next);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    error: 'Forbidden',
                    message: expect.stringContaining('players:manage')
                })
            );
            expect(next).not.toHaveBeenCalled();
        });

        it('should skip scope check for non-API key auth', () => {
            const req = {
                authenticatedVia: 'session',
                session: { username: 'testuser' }
            };

            const res = {};
            const next = jest.fn();

            const middleware = requireApiScope('server:read');
            middleware(req, res, next);

            expect(next).toHaveBeenCalled();
            expect(apiKeyService.hasScope).not.toHaveBeenCalled();
        });

        it('should return 403 when API key is missing', () => {
            const req = {
                authenticatedVia: 'apiKey'
                // Missing apiKey property
            };

            const res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn()
            };
            const next = jest.fn();

            const middleware = requireApiScope('server:read');
            middleware(req, res, next);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    error: 'Forbidden'
                })
            );
            expect(next).not.toHaveBeenCalled();
        });
    });
});
