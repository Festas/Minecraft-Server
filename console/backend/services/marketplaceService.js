const axios = require('axios');
const auditLog = require('./auditLog');

/**
 * Plugin Marketplace Service
 * Integrates with multiple plugin marketplaces (Modrinth, Hangar, SpigotMC)
 */

// Marketplace APIs
const MODRINTH_API = 'https://api.modrinth.com/v2';
const HANGAR_API = 'https://hangar.papermc.io/api/v1';

/**
 * Search plugins across marketplaces
 * @param {string} query - Search query
 * @param {object} options - Search options (platform, category, version, limit, offset)
 * @returns {Promise<object>} Search results
 */
async function searchPlugins(query, options = {}) {
    const {
        platform = 'all', // all, modrinth, hangar
        category = null,
        version = null,
        limit = 20,
        offset = 0,
        sortBy = 'relevance' // relevance, downloads, updated, newest
    } = options;

    const results = {
        plugins: [],
        total: 0,
        hasMore: false
    };

    try {
        // Search Modrinth if platform is 'all' or 'modrinth'
        if (platform === 'all' || platform === 'modrinth') {
            const modrinthResults = await searchModrinth(query, { category, version, limit, offset, sortBy });
            results.plugins.push(...modrinthResults.hits.map(hit => formatModrinthPlugin(hit)));
            results.total += modrinthResults.total_hits;
        }

        // Search Hangar if platform is 'all' or 'hangar'
        if (platform === 'all' || platform === 'hangar') {
            const hangarResults = await searchHangar(query, { category, version, limit, offset, sortBy });
            results.plugins.push(...hangarResults.result.map(project => formatHangarPlugin(project)));
            results.total += hangarResults.pagination.count;
        }

        // Sort and deduplicate if searching all platforms
        if (platform === 'all') {
            results.plugins = deduplicatePlugins(results.plugins);
            results.plugins = sortPlugins(results.plugins, sortBy);
        }

        results.hasMore = results.plugins.length < results.total;

        return results;
    } catch (error) {
        console.error('Error searching plugins:', error);
        throw new Error(`Marketplace search failed: ${error.message}`);
    }
}

/**
 * Get detailed plugin information
 * @param {string} pluginId - Plugin identifier
 * @param {string} platform - Platform (modrinth, hangar)
 * @returns {Promise<object>} Plugin details
 */
async function getPluginDetails(pluginId, platform) {
    try {
        if (platform === 'modrinth') {
            const project = await getModrinthProject(pluginId);
            const versions = await getModrinthVersions(pluginId);
            return formatModrinthDetails(project, versions);
        } else if (platform === 'hangar') {
            const project = await getHangarProject(pluginId);
            const versions = await getHangarVersions(pluginId);
            return formatHangarDetails(project, versions);
        } else {
            throw new Error('Invalid platform specified');
        }
    } catch (error) {
        console.error('Error fetching plugin details:', error);
        throw new Error(`Failed to fetch plugin details: ${error.message}`);
    }
}

/**
 * Get available versions for a plugin
 * @param {string} pluginId - Plugin identifier
 * @param {string} platform - Platform (modrinth, hangar)
 * @param {string} gameVersion - Minecraft version filter
 * @returns {Promise<Array>} Available versions
 */
async function getPluginVersions(pluginId, platform, gameVersion = null) {
    try {
        if (platform === 'modrinth') {
            const versions = await getModrinthVersions(pluginId, gameVersion);
            return versions.map(v => formatModrinthVersion(v));
        } else if (platform === 'hangar') {
            const versions = await getHangarVersions(pluginId, gameVersion);
            return versions.map(v => formatHangarVersion(v));
        } else {
            throw new Error('Invalid platform specified');
        }
    } catch (error) {
        console.error('Error fetching plugin versions:', error);
        throw new Error(`Failed to fetch plugin versions: ${error.message}`);
    }
}

/**
 * Get popular/featured plugins
 * @param {object} options - Options (limit, category, version)
 * @returns {Promise<Array>} Popular plugins
 */
async function getFeaturedPlugins(options = {}) {
    const { limit = 10, category = null, version = null } = options;

    try {
        const modrinthFeatured = await searchModrinth('', {
            limit,
            category,
            version,
            sortBy: 'downloads'
        });

        const hangarFeatured = await searchHangar('', {
            limit,
            category,
            version,
            sortBy: 'downloads'
        });

        const plugins = [
            ...modrinthFeatured.hits.map(hit => formatModrinthPlugin(hit)),
            ...hangarFeatured.result.map(project => formatHangarPlugin(project))
        ];

        // Sort by downloads and return top N
        return sortPlugins(plugins, 'downloads').slice(0, limit);
    } catch (error) {
        console.error('Error fetching featured plugins:', error);
        throw new Error(`Failed to fetch featured plugins: ${error.message}`);
    }
}

/**
 * Get plugin categories
 * @returns {Promise<object>} Available categories by platform
 */
async function getCategories() {
    return {
        modrinth: [
            'adventure', 'cursed', 'decoration', 'economy', 'equipment',
            'food', 'game-mechanics', 'library', 'magic', 'management',
            'minigame', 'mobs', 'optimization', 'social', 'storage',
            'technology', 'transportation', 'utility', 'worldgen'
        ],
        hangar: [
            'admin_tools', 'chat', 'dev_tools', 'economy', 'gameplay',
            'games', 'protection', 'role_playing', 'world_management', 'misc'
        ]
    };
}

// ============================================================================
// Modrinth API Functions
// ============================================================================

async function searchModrinth(query, options = {}) {
    const params = new URLSearchParams();
    
    if (query) params.append('query', query);
    params.append('limit', options.limit || 20);
    params.append('offset', options.offset || 0);
    params.append('facets', JSON.stringify([['project_type:plugin']]));
    
    if (options.category) {
        params.append('facets', JSON.stringify([[`categories:${options.category}`]]));
    }
    
    if (options.version) {
        params.append('facets', JSON.stringify([[`versions:${options.version}`]]));
    }
    
    // Map sort options
    const sortMap = {
        relevance: 'relevance',
        downloads: 'downloads',
        updated: 'updated',
        newest: 'newest'
    };
    params.append('index', sortMap[options.sortBy] || 'relevance');

    const response = await axios.get(`${MODRINTH_API}/search?${params.toString()}`);
    return response.data;
}

async function getModrinthProject(projectId) {
    const response = await axios.get(`${MODRINTH_API}/project/${projectId}`);
    return response.data;
}

async function getModrinthVersions(projectId, gameVersion = null) {
    let url = `${MODRINTH_API}/project/${projectId}/version`;
    if (gameVersion) {
        url += `?game_versions=["${gameVersion}"]`;
    }
    const response = await axios.get(url);
    return response.data;
}

function formatModrinthPlugin(hit) {
    return {
        id: hit.project_id,
        slug: hit.slug,
        name: hit.title,
        description: hit.description,
        author: hit.author,
        downloads: hit.downloads,
        followers: hit.follows,
        icon: hit.icon_url,
        categories: hit.categories || [],
        versions: hit.versions || [],
        dateCreated: hit.date_created,
        dateModified: hit.date_modified,
        platform: 'modrinth',
        url: `https://modrinth.com/plugin/${hit.slug}`
    };
}

function formatModrinthDetails(project, versions) {
    return {
        id: project.id,
        slug: project.slug,
        name: project.title,
        description: project.description,
        body: project.body,
        author: project.team,
        downloads: project.downloads,
        followers: project.followers,
        icon: project.icon_url,
        categories: project.categories || [],
        license: project.license,
        sourceUrl: project.source_url,
        issuesUrl: project.issues_url,
        wikiUrl: project.wiki_url,
        discordUrl: project.discord_url,
        versions: versions.map(v => formatModrinthVersion(v)),
        dateCreated: project.published,
        dateModified: project.updated,
        platform: 'modrinth',
        url: `https://modrinth.com/plugin/${project.slug}`
    };
}

function formatModrinthVersion(version) {
    return {
        id: version.id,
        name: version.name,
        versionNumber: version.version_number,
        gameVersions: version.game_versions || [],
        versionType: version.version_type,
        downloads: version.downloads,
        datePublished: version.date_published,
        files: version.files.map(f => ({
            filename: f.filename,
            url: f.url,
            size: f.size,
            primary: f.primary
        })),
        changelog: version.changelog
    };
}

// ============================================================================
// Hangar API Functions
// ============================================================================

async function searchHangar(query, options = {}) {
    const params = new URLSearchParams();
    
    if (query) params.append('q', query);
    params.append('limit', options.limit || 20);
    params.append('offset', options.offset || 0);
    
    if (options.category) {
        params.append('category', options.category);
    }
    
    if (options.version) {
        params.append('version', options.version);
    }
    
    // Map sort options
    const sortMap = {
        relevance: '-relevance',
        downloads: '-downloads',
        updated: '-updated',
        newest: '-created'
    };
    params.append('sort', sortMap[options.sortBy] || '-relevance');

    const response = await axios.get(`${HANGAR_API}/projects?${params.toString()}`);
    return response.data;
}

async function getHangarProject(projectId) {
    const response = await axios.get(`${HANGAR_API}/projects/${projectId}`);
    return response.data;
}

async function getHangarVersions(projectId, gameVersion = null) {
    let url = `${HANGAR_API}/projects/${projectId}/versions`;
    if (gameVersion) {
        url += `?version=${gameVersion}`;
    }
    const response = await axios.get(url);
    return response.data.result || [];
}

function formatHangarPlugin(project) {
    return {
        id: project.name,
        slug: project.name.toLowerCase(),
        name: project.name,
        description: project.description || project.tagline || '',
        author: project.owner || project.namespace?.owner,
        downloads: project.stats?.downloads || 0,
        followers: project.stats?.watchers || 0,
        icon: project.avatarUrl,
        categories: project.category ? [project.category.toLowerCase()] : [],
        versions: [],
        dateCreated: project.createdAt,
        dateModified: project.lastUpdated,
        platform: 'hangar',
        url: `https://hangar.papermc.io/${project.namespace?.owner}/${project.name}`
    };
}

function formatHangarDetails(project, versions) {
    return {
        id: project.name,
        slug: project.name.toLowerCase(),
        name: project.name,
        description: project.description || '',
        body: project.description || '',
        author: project.owner || project.namespace?.owner,
        downloads: project.stats?.downloads || 0,
        followers: project.stats?.watchers || 0,
        icon: project.avatarUrl,
        categories: project.category ? [project.category.toLowerCase()] : [],
        license: project.settings?.license?.name,
        sourceUrl: project.settings?.links?.find(l => l.type === 'source')?.url,
        issuesUrl: project.settings?.links?.find(l => l.type === 'issues')?.url,
        wikiUrl: project.settings?.links?.find(l => l.type === 'wiki')?.url,
        discordUrl: project.settings?.links?.find(l => l.type === 'discord')?.url,
        versions: versions.map(v => formatHangarVersion(v)),
        dateCreated: project.createdAt,
        dateModified: project.lastUpdated,
        platform: 'hangar',
        url: `https://hangar.papermc.io/${project.namespace?.owner}/${project.name}`
    };
}

function formatHangarVersion(version) {
    return {
        id: version.name,
        name: version.name,
        versionNumber: version.name,
        gameVersions: version.platformDependencies?.PAPER || [],
        versionType: version.channel || 'release',
        downloads: version.stats?.downloads || 0,
        datePublished: version.createdAt,
        files: version.downloads?.PAPER ? Object.entries(version.downloads.PAPER).map(([platform, download]) => ({
            filename: download.fileInfo?.name || `${version.name}.jar`,
            url: download.downloadUrl,
            size: download.fileInfo?.sizeBytes || 0,
            primary: true
        })) : [],
        changelog: version.description || ''
    };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Deduplicate plugins across platforms (prefer Modrinth)
 */
function deduplicatePlugins(plugins) {
    const seen = new Map();
    
    for (const plugin of plugins) {
        const key = plugin.name.toLowerCase();
        if (!seen.has(key)) {
            seen.set(key, plugin);
        } else {
            // Prefer Modrinth over Hangar
            const existing = seen.get(key);
            if (plugin.platform === 'modrinth' && existing.platform === 'hangar') {
                seen.set(key, plugin);
            }
        }
    }
    
    return Array.from(seen.values());
}

/**
 * Sort plugins by criteria
 */
function sortPlugins(plugins, sortBy) {
    const sortMap = {
        relevance: (a, b) => 0, // Already sorted by API
        downloads: (a, b) => b.downloads - a.downloads,
        updated: (a, b) => new Date(b.dateModified) - new Date(a.dateModified),
        newest: (a, b) => new Date(b.dateCreated) - new Date(a.dateCreated)
    };
    
    return [...plugins].sort(sortMap[sortBy] || sortMap.relevance);
}

module.exports = {
    searchPlugins,
    getPluginDetails,
    getPluginVersions,
    getFeaturedPlugins,
    getCategories
};
