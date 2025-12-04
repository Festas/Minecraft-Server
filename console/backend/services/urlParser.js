const axios = require('axios');

/**
 * Detect URL type and parse accordingly
 * @param {string} url - The URL to parse
 * @returns {object} - Parsed URL information
 */
async function parseUrl(url) {
    try {
        // Direct JAR URL
        if (url.match(/\.jar$/i)) {
            return {
                type: 'direct',
                downloadUrl: url,
                filename: url.split('/').pop()
            };
        }
        
        // GitHub release page
        if (url.match(/github\.com\/([^/]+)\/([^/]+)\/releases\/tag\/([^/]+)/)) {
            const match = url.match(/github\.com\/([^/]+)\/([^/]+)\/releases\/tag\/([^/]+)/);
            const owner = match[1];
            const repo = match[2];
            const tag = match[3];
            
            return await parseGitHubReleaseTag(owner, repo, tag);
        }
        
        // GitHub latest release
        if (url.match(/github\.com\/([^/]+)\/([^/]+)\/releases\/latest/)) {
            const match = url.match(/github\.com\/([^/]+)\/([^/]+)\//);
            const owner = match[1];
            const repo = match[2];
            
            return await parseGitHubLatestRelease(owner, repo);
        }
        
        // Modrinth project page
        if (url.match(/modrinth\.com\/plugin\/([^/]+)/)) {
            const match = url.match(/modrinth\.com\/plugin\/([^/]+)/);
            const projectId = match[1];
            
            return await parseModrinthProject(projectId);
        }
        
        // SpigotMC
        if (url.match(/spigotmc\.org\/resources/)) {
            return {
                type: 'spigot',
                error: 'SpigotMC requires manual download. Please download the plugin JAR manually and use the direct JAR URL.'
            };
        }
        
        // Unknown URL type - try direct download
        return {
            type: 'unknown',
            downloadUrl: url,
            filename: url.split('/').pop() || 'plugin.jar'
        };
    } catch (error) {
        throw new Error(`Failed to parse URL: ${error.message}`);
    }
}

/**
 * Parse GitHub release by tag
 */
async function parseGitHubReleaseTag(owner, repo, tag) {
    try {
        const apiUrl = `https://api.github.com/repos/${owner}/${repo}/releases/tags/${tag}`;
        const headers = {};
        
        if (process.env.GITHUB_TOKEN) {
            headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
        }
        
        const response = await axios.get(apiUrl, { headers });
        const release = response.data;
        
        const jarAssets = release.assets.filter(asset => 
            asset.name.endsWith('.jar') && 
            !asset.name.includes('sources') &&
            !asset.name.includes('javadoc') &&
            !asset.name.includes('api')
        );
        
        if (jarAssets.length === 0) {
            throw new Error('No JAR files found in release');
        }
        
        if (jarAssets.length === 1) {
            return {
                type: 'github-release',
                downloadUrl: jarAssets[0].browser_download_url,
                filename: jarAssets[0].name,
                size: jarAssets[0].size
            };
        }
        
        // Multiple JARs - return all options
        return {
            type: 'github-release-multiple',
            options: jarAssets.map(asset => ({
                downloadUrl: asset.browser_download_url,
                filename: asset.name,
                size: asset.size
            }))
        };
    } catch (error) {
        throw new Error(`Failed to fetch GitHub release: ${error.message}`);
    }
}

/**
 * Parse GitHub latest release
 */
async function parseGitHubLatestRelease(owner, repo) {
    try {
        const apiUrl = `https://api.github.com/repos/${owner}/${repo}/releases/latest`;
        const headers = {};
        
        if (process.env.GITHUB_TOKEN) {
            headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
        }
        
        const response = await axios.get(apiUrl, { headers });
        const release = response.data;
        
        const jarAssets = release.assets.filter(asset => 
            asset.name.endsWith('.jar') && 
            !asset.name.includes('sources') &&
            !asset.name.includes('javadoc') &&
            !asset.name.includes('api')
        );
        
        if (jarAssets.length === 0) {
            throw new Error('No JAR files found in latest release');
        }
        
        if (jarAssets.length === 1) {
            return {
                type: 'github-release',
                downloadUrl: jarAssets[0].browser_download_url,
                filename: jarAssets[0].name,
                size: jarAssets[0].size
            };
        }
        
        // Multiple JARs - return all options
        return {
            type: 'github-release-multiple',
            options: jarAssets.map(asset => ({
                downloadUrl: asset.browser_download_url,
                filename: asset.name,
                size: asset.size
            }))
        };
    } catch (error) {
        throw new Error(`Failed to fetch GitHub latest release: ${error.message}`);
    }
}

/**
 * Parse Modrinth project
 */
async function parseModrinthProject(projectId) {
    try {
        const apiUrl = `https://api.modrinth.com/v2/project/${projectId}/version`;
        const response = await axios.get(apiUrl);
        const versions = response.data;
        
        if (!versions || versions.length === 0) {
            throw new Error('No versions found for Modrinth project');
        }
        
        // Get the latest version compatible with Paper/Bukkit/Spigot
        const compatibleLoaders = ['paper', 'bukkit', 'spigot', 'purpur', 'folia'];
        const compatibleVersion = versions.find(v => 
            v.loaders && v.loaders.some(loader => 
                compatibleLoaders.includes(loader.toLowerCase())
            )
        );
        
        if (!compatibleVersion) {
            throw new Error('No compatible version found for Paper/Bukkit/Spigot');
        }
        
        const primaryFile = compatibleVersion.files.find(f => f.primary) || compatibleVersion.files[0];
        
        if (!primaryFile) {
            throw new Error('No downloadable files found');
        }
        
        return {
            type: 'modrinth',
            downloadUrl: primaryFile.url,
            filename: primaryFile.filename,
            size: primaryFile.size,
            version: compatibleVersion.version_number
        };
    } catch (error) {
        throw new Error(`Failed to fetch Modrinth project: ${error.message}`);
    }
}

module.exports = {
    parseUrl
};
