const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const axios = require('axios');
const semver = require('semver');
const { parsePluginYml, isValidJar } = require('./pluginParser');
const { parseUrl } = require('./urlParser');

const PLUGINS_DIR = process.env.PLUGINS_DIR || path.join(process.cwd(), '../../plugins');
const PLUGINS_JSON = process.env.PLUGINS_JSON || path.join(process.cwd(), '../../plugins.json');
const HISTORY_FILE = path.join(__dirname, '../data/plugin-history.json');

/**
 * Download a file from URL
 */
async function downloadFile(url, outputPath, onProgress = null) {
    const writer = fsSync.createWriteStream(outputPath);
    
    const response = await axios({
        url,
        method: 'GET',
        responseType: 'stream',
        timeout: 300000, // 5 minutes
        onDownloadProgress: (progressEvent) => {
            if (onProgress && progressEvent.total) {
                const progress = {
                    loaded: progressEvent.loaded,
                    total: progressEvent.total,
                    percentage: Math.round((progressEvent.loaded / progressEvent.total) * 100)
                };
                onProgress(progress);
            }
        }
    });
    
    response.data.pipe(writer);
    
    return new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
    });
}

/**
 * Get all plugins from plugins.json
 */
async function getAllPlugins() {
    try {
        const content = await fs.readFile(PLUGINS_JSON, 'utf8');
        const data = JSON.parse(content);
        return data.plugins || [];
    } catch (error) {
        throw new Error(`Failed to read plugins.json: ${error.message}`);
    }
}

/**
 * Update plugins.json
 */
async function updatePluginsJson(plugins) {
    try {
        const data = { plugins };
        await fs.writeFile(PLUGINS_JSON, JSON.stringify(data, null, 2), 'utf8');
    } catch (error) {
        throw new Error(`Failed to update plugins.json: ${error.message}`);
    }
}

/**
 * Find a plugin by name (case-insensitive)
 */
async function findPlugin(name) {
    const plugins = await getAllPlugins();
    return plugins.find(p => p.name.toLowerCase() === name.toLowerCase());
}

/**
 * Add log entry to plugin history
 */
async function addHistoryEntry(entry) {
    try {
        // Ensure data directory exists
        const dataDir = path.dirname(HISTORY_FILE);
        await fs.mkdir(dataDir, { recursive: true });
        
        let history = [];
        try {
            const content = await fs.readFile(HISTORY_FILE, 'utf8');
            history = JSON.parse(content);
        } catch (error) {
            // File doesn't exist yet
        }
        
        history.unshift({
            ...entry,
            timestamp: new Date().toISOString()
        });
        
        // Keep only last 100 entries
        history = history.slice(0, 100);
        
        await fs.writeFile(HISTORY_FILE, JSON.stringify(history, null, 2), 'utf8');
    } catch (error) {
        console.error('Failed to update history:', error);
    }
}

/**
 * Get plugin history
 */
async function getHistory() {
    try {
        const content = await fs.readFile(HISTORY_FILE, 'utf8');
        return JSON.parse(content);
    } catch (error) {
        return [];
    }
}

/**
 * Install plugin from URL
 */
async function installFromUrl(url, customName = null, onProgress = null) {
    try {
        // Parse URL
        const urlInfo = await parseUrl(url);
        
        if (urlInfo.type === 'spigot') {
            throw new Error(urlInfo.error);
        }
        
        if (urlInfo.type === 'github-release-multiple') {
            // Return options for user to choose
            return {
                status: 'multiple-options',
                options: urlInfo.options
            };
        }
        
        // Download to temp location
        const tempFile = path.join(PLUGINS_DIR, `.temp-${Date.now()}.jar`);
        
        try {
            await downloadFile(urlInfo.downloadUrl, tempFile, onProgress);
            
            // Validate JAR
            if (!isValidJar(tempFile)) {
                await fs.unlink(tempFile);
                throw new Error('Invalid plugin file: Missing or corrupt plugin.yml');
            }
            
            // Parse plugin metadata
            const metadata = parsePluginYml(tempFile);
            const pluginName = customName || metadata.name;
            
            // Check if plugin already exists
            const existingPlugin = await findPlugin(pluginName);
            
            if (existingPlugin) {
                // Compare versions
                const currentVersion = existingPlugin.version || '0.0.0';
                const newVersion = metadata.version;
                
                const comparison = compareVersions(newVersion, currentVersion);
                
                await fs.unlink(tempFile);
                
                return {
                    status: 'exists',
                    pluginName,
                    currentVersion,
                    newVersion,
                    comparison, // 'upgrade', 'downgrade', or 'same'
                    metadata,
                    tempFile: null
                };
            }
            
            // Install new plugin
            const finalFilename = `${pluginName}.jar`;
            const finalPath = path.join(PLUGINS_DIR, finalFilename);
            
            await fs.rename(tempFile, finalPath);
            
            // Add to plugins.json
            const plugins = await getAllPlugins();
            plugins.push({
                name: pluginName,
                enabled: true,
                category: 'custom',
                source: 'url',
                direct_url: url,
                version: metadata.version,
                description: metadata.description,
                installed_at: new Date().toISOString()
            });
            
            await updatePluginsJson(plugins);
            
            // Add history entry
            await addHistoryEntry({
                action: 'installed',
                plugin: pluginName,
                version: metadata.version,
                details: `Installed from URL`
            });
            
            return {
                status: 'installed',
                pluginName,
                version: metadata.version,
                metadata
            };
        } catch (error) {
            // Cleanup temp file
            try {
                await fs.unlink(tempFile);
            } catch (e) {}
            throw error;
        }
    } catch (error) {
        throw new Error(`Installation failed: ${error.message}`);
    }
}

/**
 * Proceed with installation when plugin exists (update/downgrade/reinstall)
 */
async function proceedWithInstall(url, pluginName, action, onProgress = null) {
    try {
        const urlInfo = await parseUrl(url);
        const tempFile = path.join(PLUGINS_DIR, `.temp-${Date.now()}.jar`);
        
        try {
            await downloadFile(urlInfo.downloadUrl, tempFile, onProgress);
            
            if (!isValidJar(tempFile)) {
                await fs.unlink(tempFile);
                throw new Error('Invalid plugin file');
            }
            
            const metadata = parsePluginYml(tempFile);
            const jarFilename = `${pluginName}.jar`;
            const jarPath = path.join(PLUGINS_DIR, jarFilename);
            
            // Create backup
            if (fsSync.existsSync(jarPath)) {
                const backupPath = `${jarPath}.backup`;
                await fs.copyFile(jarPath, backupPath);
            }
            
            // Replace JAR
            await fs.rename(tempFile, jarPath);
            
            // Update plugins.json
            const plugins = await getAllPlugins();
            const pluginIndex = plugins.findIndex(p => p.name.toLowerCase() === pluginName.toLowerCase());
            
            if (pluginIndex !== -1) {
                plugins[pluginIndex] = {
                    ...plugins[pluginIndex],
                    version: metadata.version,
                    description: metadata.description,
                    direct_url: url,
                    source: 'url',
                    updated_at: new Date().toISOString()
                };
                await updatePluginsJson(plugins);
            }
            
            // Add history
            await addHistoryEntry({
                action: action === 'update' ? 'updated' : action === 'downgrade' ? 'downgraded' : 'reinstalled',
                plugin: pluginName,
                version: metadata.version,
                details: `${action} from URL`
            });
            
            return {
                status: 'success',
                action,
                pluginName,
                version: metadata.version,
                metadata
            };
        } catch (error) {
            try {
                await fs.unlink(tempFile);
            } catch (e) {}
            throw error;
        }
    } catch (error) {
        throw new Error(`Installation failed: ${error.message}`);
    }
}

/**
 * Uninstall a plugin
 */
async function uninstallPlugin(pluginName, deleteConfigs = false) {
    try {
        const plugin = await findPlugin(pluginName);
        
        if (!plugin) {
            throw new Error('Plugin not found');
        }
        
        const jarPath = path.join(PLUGINS_DIR, `${pluginName}.jar`);
        
        // Delete JAR
        if (fsSync.existsSync(jarPath)) {
            await fs.unlink(jarPath);
        }
        
        // Delete backup if exists
        const backupPath = `${jarPath}.backup`;
        if (fsSync.existsSync(backupPath)) {
            await fs.unlink(backupPath);
        }
        
        // Delete configs if requested
        if (deleteConfigs) {
            const configDir = path.join(PLUGINS_DIR, pluginName);
            if (fsSync.existsSync(configDir)) {
                await fs.rm(configDir, { recursive: true });
            }
        }
        
        // Remove from plugins.json
        const plugins = await getAllPlugins();
        const filtered = plugins.filter(p => p.name.toLowerCase() !== pluginName.toLowerCase());
        await updatePluginsJson(filtered);
        
        // Add history
        await addHistoryEntry({
            action: 'uninstalled',
            plugin: pluginName,
            details: deleteConfigs ? 'Removed JAR and configs' : 'Removed JAR only'
        });
        
        return { status: 'success' };
    } catch (error) {
        throw new Error(`Uninstall failed: ${error.message}`);
    }
}

/**
 * Rollback to backup version
 */
async function rollbackPlugin(pluginName) {
    try {
        const jarPath = path.join(PLUGINS_DIR, `${pluginName}.jar`);
        const backupPath = `${jarPath}.backup`;
        
        if (!fsSync.existsSync(backupPath)) {
            throw new Error('No backup available for this plugin');
        }
        
        // Get version from backup
        const backupMetadata = parsePluginYml(backupPath);
        
        // Replace current with backup
        await fs.copyFile(backupPath, jarPath);
        
        // Update plugins.json
        const plugins = await getAllPlugins();
        const pluginIndex = plugins.findIndex(p => p.name.toLowerCase() === pluginName.toLowerCase());
        
        if (pluginIndex !== -1) {
            plugins[pluginIndex].version = backupMetadata.version;
            plugins[pluginIndex].updated_at = new Date().toISOString();
            await updatePluginsJson(plugins);
        }
        
        // Add history
        await addHistoryEntry({
            action: 'rolled-back',
            plugin: pluginName,
            version: backupMetadata.version,
            details: 'Restored from backup'
        });
        
        return {
            status: 'success',
            version: backupMetadata.version
        };
    } catch (error) {
        throw new Error(`Rollback failed: ${error.message}`);
    }
}

/**
 * Toggle plugin enabled state
 */
async function togglePlugin(pluginName, enabled) {
    try {
        const plugins = await getAllPlugins();
        const pluginIndex = plugins.findIndex(p => p.name.toLowerCase() === pluginName.toLowerCase());
        
        if (pluginIndex === -1) {
            throw new Error('Plugin not found');
        }
        
        plugins[pluginIndex].enabled = enabled;
        await updatePluginsJson(plugins);
        
        // Add history
        await addHistoryEntry({
            action: enabled ? 'enabled' : 'disabled',
            plugin: pluginName,
            details: `Plugin ${enabled ? 'enabled' : 'disabled'}`
        });
        
        return { status: 'success' };
    } catch (error) {
        throw new Error(`Toggle failed: ${error.message}`);
    }
}

/**
 * Check if plugin has backup
 */
function hasBackup(pluginName) {
    const jarPath = path.join(PLUGINS_DIR, `${pluginName}.jar`);
    const backupPath = `${jarPath}.backup`;
    return fsSync.existsSync(backupPath);
}

/**
 * Compare two versions
 */
function compareVersions(newVersion, currentVersion) {
    try {
        // Clean versions (remove 'v' prefix, etc)
        const cleanNew = newVersion.replace(/^v/, '').split('-')[0];
        const cleanCurrent = currentVersion.replace(/^v/, '').split('-')[0];
        
        // Try semver comparison
        if (semver.valid(cleanNew) && semver.valid(cleanCurrent)) {
            if (semver.gt(cleanNew, cleanCurrent)) {
                return 'upgrade';
            } else if (semver.lt(cleanNew, cleanCurrent)) {
                return 'downgrade';
            } else {
                return 'same';
            }
        }
        
        // Fallback to string comparison
        if (newVersion === currentVersion) {
            return 'same';
        }
        
        return 'unknown';
    } catch (error) {
        return 'unknown';
    }
}

module.exports = {
    getAllPlugins,
    findPlugin,
    installFromUrl,
    proceedWithInstall,
    uninstallPlugin,
    rollbackPlugin,
    togglePlugin,
    hasBackup,
    getHistory,
    parseUrl
};
