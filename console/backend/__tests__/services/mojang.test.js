const mojangService = require('../../services/mojang');
const axios = require('axios');

// Mock axios
jest.mock('axios');

describe('MojangService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mojangService.clearCache();
    });

    describe('getUuid', () => {
        it('should fetch UUID from Mojang API', async () => {
            const mockResponse = {
                data: {
                    name: 'TestPlayer',
                    id: '12345678123412341234123456789abc'
                }
            };

            axios.get.mockResolvedValue(mockResponse);

            const uuid = await mojangService.getUuid('TestPlayer');

            expect(uuid).toBe('12345678-1234-1234-1234-123456789abc');
            expect(axios.get).toHaveBeenCalledWith(
                'https://api.mojang.com/users/profiles/minecraft/TestPlayer',
                { timeout: 5000 }
            );
        });

        it('should cache UUID results', async () => {
            const mockResponse = {
                data: {
                    name: 'TestPlayer',
                    id: '12345678123412341234123456789abc'
                }
            };

            axios.get.mockResolvedValue(mockResponse);

            // First call
            const uuid1 = await mojangService.getUuid('TestPlayer');

            // Second call (should use cache)
            const uuid2 = await mojangService.getUuid('TestPlayer');

            expect(uuid1).toBe(uuid2);
            expect(axios.get).toHaveBeenCalledTimes(1); // Only called once
        });

        it('should handle 404 not found', async () => {
            const error = new Error('Not found');
            error.response = { status: 404 };

            axios.get.mockRejectedValue(error);

            const uuid = await mojangService.getUuid('NonExistentPlayer');

            expect(uuid).toBeNull();
        });

        it('should generate fallback UUID on API error', async () => {
            const error = new Error('Network error');
            axios.get.mockRejectedValue(error);

            const uuid = await mojangService.getUuid('TestPlayer');

            expect(uuid).toBeDefined();
            expect(uuid).toMatch(/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i);
        });

        it('should generate same fallback UUID for same username', async () => {
            const error = new Error('Network error');
            axios.get.mockRejectedValue(error);

            const uuid1 = await mojangService.getUuid('TestPlayer');
            const uuid2 = await mojangService.getUuid('TestPlayer');

            expect(uuid1).toBe(uuid2);
        });
    });

    describe('formatUuid', () => {
        it('should format UUID with dashes', () => {
            const formatted = mojangService.formatUuid('12345678123412341234123456789abc');
            expect(formatted).toBe('12345678-1234-1234-1234-123456789abc');
        });

        it('should not modify already formatted UUID', () => {
            const formatted = mojangService.formatUuid('12345678-1234-1234-1234-123456789abc');
            expect(formatted).toBe('12345678-1234-1234-1234-123456789abc');
        });
    });

    describe('generateFallbackUuid', () => {
        it('should generate valid UUID format', () => {
            const uuid = mojangService.generateFallbackUuid('TestPlayer');
            expect(uuid).toMatch(/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[a-f0-9]{4}-[a-f0-9]{12}$/i);
        });

        it('should be deterministic for same username', () => {
            const uuid1 = mojangService.generateFallbackUuid('TestPlayer');
            const uuid2 = mojangService.generateFallbackUuid('TestPlayer');
            expect(uuid1).toBe(uuid2);
        });

        it('should be case-insensitive', () => {
            const uuid1 = mojangService.generateFallbackUuid('TestPlayer');
            const uuid2 = mojangService.generateFallbackUuid('testplayer');
            expect(uuid1).toBe(uuid2);
        });
    });

    describe('clearCache', () => {
        it('should clear the cache', async () => {
            const mockResponse = {
                data: {
                    name: 'TestPlayer',
                    id: '12345678123412341234123456789abc'
                }
            };

            axios.get.mockResolvedValue(mockResponse);

            // First call
            await mojangService.getUuid('TestPlayer');

            // Clear cache
            mojangService.clearCache();

            // Second call (should fetch again)
            await mojangService.getUuid('TestPlayer');

            expect(axios.get).toHaveBeenCalledTimes(2);
        });
    });
});
