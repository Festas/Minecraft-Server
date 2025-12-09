const marketplaceService = require('../../services/marketplaceService');
const axios = require('axios');

// Mock axios
jest.mock('axios');

describe('Marketplace Service', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('searchPlugins', () => {
        it('should search Modrinth successfully', async () => {
            const mockResponse = {
                data: {
                    hits: [
                        {
                            project_id: 'test-id',
                            slug: 'test-plugin',
                            title: 'Test Plugin',
                            description: 'Test description',
                            author: 'test-author',
                            downloads: 1000,
                            follows: 100,
                            icon_url: 'https://example.com/icon.png',
                            categories: ['admin'],
                            versions: ['1.20.1'],
                            date_created: '2024-01-01',
                            date_modified: '2024-01-02'
                        }
                    ],
                    total_hits: 1
                }
            };

            axios.get.mockResolvedValueOnce(mockResponse);

            const result = await marketplaceService.searchPlugins('test', { platform: 'modrinth' });

            expect(result).toHaveProperty('plugins');
            expect(result.plugins).toHaveLength(1);
            expect(result.plugins[0].name).toBe('Test Plugin');
            expect(result.plugins[0].platform).toBe('modrinth');
            expect(result.total).toBe(1);
        });

        it('should search Hangar successfully', async () => {
            const mockResponse = {
                data: {
                    result: [
                        {
                            name: 'TestPlugin',
                            description: 'Test description',
                            owner: 'test-author',
                            stats: { downloads: 1000, watchers: 100 },
                            avatarUrl: 'https://example.com/icon.png',
                            category: 'admin',
                            createdAt: '2024-01-01',
                            lastUpdated: '2024-01-02',
                            namespace: { owner: 'test-author' }
                        }
                    ],
                    pagination: { count: 1 }
                }
            };

            axios.get.mockResolvedValueOnce(mockResponse);

            const result = await marketplaceService.searchPlugins('test', { platform: 'hangar' });

            expect(result).toHaveProperty('plugins');
            expect(result.plugins).toHaveLength(1);
            expect(result.plugins[0].name).toBe('TestPlugin');
            expect(result.plugins[0].platform).toBe('hangar');
        });

        it('should handle search errors gracefully', async () => {
            axios.get.mockRejectedValueOnce(new Error('Network error'));

            await expect(
                marketplaceService.searchPlugins('test')
            ).rejects.toThrow('Marketplace search failed');
        });

        it('should apply filters correctly', async () => {
            const mockResponse = {
                data: {
                    hits: [],
                    total_hits: 0
                }
            };

            axios.get.mockResolvedValueOnce(mockResponse);

            await marketplaceService.searchPlugins('test', {
                platform: 'modrinth',
                category: 'admin',
                version: '1.20.1',
                sortBy: 'downloads',
                limit: 10,
                offset: 0
            });

            expect(axios.get).toHaveBeenCalledWith(
                expect.stringContaining('categories:admin')
            );
        });
    });

    describe('getPluginDetails', () => {
        it('should get Modrinth plugin details', async () => {
            const mockProject = {
                data: {
                    id: 'test-id',
                    slug: 'test-plugin',
                    title: 'Test Plugin',
                    description: 'Test description',
                    body: 'Full description',
                    team: 'test-author',
                    downloads: 1000,
                    followers: 100,
                    categories: ['admin'],
                    license: { name: 'MIT' },
                    published: '2024-01-01',
                    updated: '2024-01-02'
                }
            };

            const mockVersions = {
                data: [
                    {
                        id: 'version-id',
                        name: '1.0.0',
                        version_number: '1.0.0',
                        game_versions: ['1.20.1'],
                        version_type: 'release',
                        downloads: 500,
                        date_published: '2024-01-01',
                        files: [
                            {
                                filename: 'plugin.jar',
                                url: 'https://example.com/plugin.jar',
                                size: 1024,
                                primary: true
                            }
                        ]
                    }
                ]
            };

            axios.get
                .mockResolvedValueOnce(mockProject)
                .mockResolvedValueOnce(mockVersions);

            const result = await marketplaceService.getPluginDetails('test-id', 'modrinth');

            expect(result).toHaveProperty('name', 'Test Plugin');
            expect(result).toHaveProperty('versions');
            expect(result.versions).toHaveLength(1);
            expect(result.platform).toBe('modrinth');
        });

        it('should handle invalid platform', async () => {
            await expect(
                marketplaceService.getPluginDetails('test-id', 'invalid')
            ).rejects.toThrow('Invalid platform');
        });
    });

    describe('getPluginVersions', () => {
        it('should get plugin versions', async () => {
            const mockVersions = {
                data: [
                    {
                        id: 'v1',
                        name: '1.0.0',
                        version_number: '1.0.0',
                        game_versions: ['1.20.1'],
                        version_type: 'release',
                        downloads: 100,
                        date_published: '2024-01-01',
                        files: [{ url: 'https://example.com/v1.jar', filename: 'plugin.jar', size: 1024, primary: true }]
                    },
                    {
                        id: 'v2',
                        name: '1.1.0',
                        version_number: '1.1.0',
                        game_versions: ['1.20.1'],
                        version_type: 'release',
                        downloads: 200,
                        date_published: '2024-01-02',
                        files: [{ url: 'https://example.com/v2.jar', filename: 'plugin.jar', size: 2048, primary: true }]
                    }
                ]
            };

            axios.get.mockResolvedValueOnce(mockVersions);

            const result = await marketplaceService.getPluginVersions('test-id', 'modrinth');

            expect(result).toHaveLength(2);
            expect(result[0].versionNumber).toBe('1.0.0');
            expect(result[1].versionNumber).toBe('1.1.0');
        });

        it('should filter by game version', async () => {
            const mockVersions = {
                data: []
            };

            axios.get.mockResolvedValueOnce(mockVersions);

            await marketplaceService.getPluginVersions('test-id', 'modrinth', '1.20.1');

            expect(axios.get).toHaveBeenCalledWith(
                expect.stringContaining('game_versions')
            );
        });
    });

    describe('getFeaturedPlugins', () => {
        it('should get featured plugins', async () => {
            const mockModrinthResponse = {
                data: {
                    hits: [
                        {
                            project_id: 'm1',
                            slug: 'plugin1',
                            title: 'Plugin 1',
                            description: 'Description 1',
                            author: 'author1',
                            downloads: 10000,
                            follows: 500
                        }
                    ],
                    total_hits: 1
                }
            };

            const mockHangarResponse = {
                data: {
                    result: [
                        {
                            name: 'Plugin2',
                            description: 'Description 2',
                            owner: 'author2',
                            stats: { downloads: 5000, watchers: 200 },
                            namespace: { owner: 'author2' }
                        }
                    ],
                    pagination: { count: 1 }
                }
            };

            axios.get
                .mockResolvedValueOnce(mockModrinthResponse)
                .mockResolvedValueOnce(mockHangarResponse);

            const result = await marketplaceService.getFeaturedPlugins({ limit: 10 });

            expect(result).toBeInstanceOf(Array);
            expect(result.length).toBeGreaterThan(0);
        });
    });

    describe('getCategories', () => {
        it('should return category lists', async () => {
            const result = await marketplaceService.getCategories();

            expect(result).toHaveProperty('modrinth');
            expect(result).toHaveProperty('hangar');
            expect(result.modrinth).toBeInstanceOf(Array);
            expect(result.hangar).toBeInstanceOf(Array);
            expect(result.modrinth.length).toBeGreaterThan(0);
            expect(result.hangar.length).toBeGreaterThan(0);
        });
    });
});
