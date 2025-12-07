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
const INSTALL_ERRORS_LOG = path.join(__dirname, '../data/install-errors.log');

/**
 * Log plugin install attempt to install-errors.log
 * Logs all install attempts (success and failure) for debugging
 */
async function logInstallAttempt(logEntry) {
    try {
        const timestamp = new Date().toISOString();
        const logLine = JSON.stringify({
            timestamp,
            ...logEntry
        }) + '\n';
        
        // Ensure data directory exists
        const dataDir = path.dirname(INSTALL_ERRORS_LOG);
        await fs.mkdir(dataDir, { recursive: true });
        
        // Append to log file
        await fs.appendFile(INSTALL_ERRORS_LOG, logLine, 'utf8');
        
        // Also log to console for immediate visibility
        console.log(`[PLUGIN_INSTALL] ${JSON.stringify(logEntry)}`);
    } catch (error) {
        console.error('Failed to write to install-errors.log:', error.message);
    }
}

/**
 * Download a file from URL with timeout protection
 */
async function downloadFile(url, outputPath, onProgress = null) {
    const writer = fsSync.createWriteStream(outputPath);
    
    try {
        const response = await axios({
            url,
            method: 'GET',
            responseType: 'stream',
            timeout: 120000, // 2 minutes - reduced from 5 to prevent long freezes
            maxContentLength: 100 * 1024 * 1024, // 100MB max file size
            maxBodyLength: 100 * 1024 * 1024,
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
            // Add timeout for the write operation - same as HTTP timeout
            const writeTimeout = setTimeout(() => {
                writer.destroy();
                reject(new Error('Download write timeout - file writing took too long'));
            }, 120000); // 2 minutes - same as HTTP timeout
            
            writer.on('finish', () => {
                clearTimeout(writeTimeout);
                resolve();
            });
            writer.on('error', (err) => {
                clearTimeout(writeTimeout);
                reject(err);
            });
        });
    } catch (error) {
        writer.destroy();
        throw error;
    }
}

/**
 * Get all plugins from plugins.json
 * Returns empty array on any error (missing file, parse error, etc.)
 */
async function getAllPlugins() {
    try {
        // Check if file exists
        try {
            await fs.access(PLUGINS_JSON);
        } catch (accessError) {
            console.warn(`plugins.json not found at ${PLUGINS_JSON}, returning empty plugin list`);
            return [];
        }
        
        const content = await fs.readFile(PLUGINS_JSON, 'utf8');
        
        // Validate content is not empty
        if (!content || content.trim().length === 0) {
            console.error(`plugins.json is empty at ${PLUGINS_JSON}`);
            return [];
        }
        
        let data;
        try {
            data = JSON.parse(content);
        } catch (parseError) {
            // Sanitize content preview - only show first 100 chars and mask potential secrets
            const preview = content.substring(0, 100).replace(/(['"])([^'"]{8,})(['"])/g, '$1***$3');
            console.error(`Failed to parse plugins.json: ${parseError.message}`, {
                file: PLUGINS_JSON,
                contentPreview: preview,
                contentLength: content.length,
                parseErrorLine: parseError.message
            });
            return [];
        }
        
        // Validate structure
        if (!data || typeof data !== 'object') {
            console.error('plugins.json does not contain a valid object');
            return [];
        }
        
        return Array.isArray(data.plugins) ? data.plugins : [];
    } catch (error) {
        console.error(`Unexpected error reading plugins.json: ${error.message}`, {
            file: PLUGINS_JSON,
            error: error.stack
        });
        return [];
    }
}

/**
 * Update plugins.json with proper error handling and validation
 */
async function updatePluginsJson(plugins) {
    try {
        // Ensure plugins directory exists
        const pluginsDir = path.dirname(PLUGINS_JSON);
        await fs.mkdir(pluginsDir, { recursive: true });
        
        // Check if directory is writable
        try {
            await fs.access(pluginsDir, fs.constants.W_OK);
        } catch (accessError) {
            throw new Error(`plugins directory is not writable: ${pluginsDir}`);
        }
        
        const data = { plugins };
        const jsonContent = JSON.stringify(data, null, 2);
        
        // Write to temp file first for atomic operation
        const tempFile = `${PLUGINS_JSON}.tmp`;
        await fs.writeFile(tempFile, jsonContent, 'utf8');
        
        // Verify the temp file can be parsed
        try {
            const verifyContent = await fs.readFile(tempFile, 'utf8');
            JSON.parse(verifyContent);
        } catch (verifyError) {
            await fs.unlink(tempFile).catch(() => {});
            throw new Error(`Generated invalid JSON: ${verifyError.message}`);
        }
        
        // Atomic rename
        await fs.rename(tempFile, PLUGINS_JSON);
        
        console.log(`Successfully updated plugins.json with ${plugins.length} plugins`);
    } catch (error) {
        console.error('Failed to update plugins.json:', {
            error: error.message,
            stack: error.stack,
            file: PLUGINS_JSON
        });
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
    const startTime = Date.now();
    
    // Log the install attempt at the start
    await logInstallAttempt({
        action: 'install_attempt',
        url,
        customName,
        status: 'started'
    });
    
    try {
        // Validate plugins directory first
        try {
            await fs.access(PLUGINS_DIR);
            await fs.access(PLUGINS_DIR, fs.constants.W_OK);
        } catch (accessError) {
            const permissionError = `Plugins directory not accessible or not writable: ${PLUGINS_DIR}`;
            
            // Log permission error
            await logInstallAttempt({
                action: 'install_attempt',
                url,
                customName,
                status: 'failed',
                error: permissionError,
                errorType: 'permission_error',
                pluginsDir: PLUGINS_DIR,
                duration_ms: Date.now() - startTime
            });
            
            throw new Error(permissionError);
        }
        
        // Parse URL
        const urlInfo = await parseUrl(url);
        
        if (urlInfo.type === 'spigot') {
            await logInstallAttempt({
                action: 'install_attempt',
                url,
                customName,
                status: 'failed',
                error: urlInfo.error,
                errorType: 'unsupported_url_type',
                duration_ms: Date.now() - startTime
            });
            throw new Error(urlInfo.error);
        }
        
        if (urlInfo.type === 'github-release-multiple') {
            // Return options for user to choose
            await logInstallAttempt({
                action: 'install_attempt',
                url,
                customName,
                status: 'multiple_options',
                optionsCount: urlInfo.options?.length || 0,
                duration_ms: Date.now() - startTime
            });
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
                
                await logInstallAttempt({
                    action: 'install_attempt',
                    url,
                    customName,
                    status: 'failed',
                    error: 'Invalid plugin file: Missing or corrupt plugin.yml',
                    errorType: 'invalid_jar',
                    downloadUrl: urlInfo.downloadUrl,
                    duration_ms: Date.now() - startTime
                });
                
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
                
                await logInstallAttempt({
                    action: 'install_attempt',
                    url,
                    customName,
                    status: 'plugin_exists',
                    pluginName,
                    currentVersion,
                    newVersion,
                    comparison,
                    duration_ms: Date.now() - startTime
                });
                
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
            const newPluginEntry = {
                name: pluginName,
                enabled: true,
                category: 'custom',
                source: 'url',
                direct_url: url,
                version: metadata.version,
                description: metadata.description,
                installed_at: new Date().toISOString()
            };
            plugins.push(newPluginEntry);
            
            await updatePluginsJson(plugins);
            
            // Add history entry
            await addHistoryEntry({
                action: 'installed',
                plugin: pluginName,
                version: metadata.version,
                details: `Installed from URL`
            });
            
            // Log successful installation with all details
            await logInstallAttempt({
                action: 'install_attempt',
                url,
                customName,
                status: 'success',
                pluginName,
                version: metadata.version,
                jarFile: finalFilename,
                jarPath: finalPath,
                addedToPluginsJson: true,
                pluginEntry: newPluginEntry,
                totalPlugins: plugins.length,
                duration_ms: Date.now() - startTime
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
            } catch (e) {
                console.warn(`Failed to cleanup temp file ${tempFile}:`, e.message);
            }
            throw error;
        }
    } catch (error) {
        console.error('Plugin installation failed:', {
            url,
            error: error.message,
            stack: error.stack
        });
        
        // Log the error if not already logged
        if (!error.message.includes('not accessible or not writable') && 
            !error.message.includes('Invalid plugin file')) {
            await logInstallAttempt({
                action: 'install_attempt',
                url,
                customName,
                status: 'failed',
                error: error.message,
                errorType: 'unexpected_error',
                stack: error.stack,
                duration_ms: Date.now() - startTime
            });
        }
        
        throw new Error(`Installation failed: ${error.message}`);
    }
}

/**
 * Proceed with installation when plugin exists (update/downgrade/reinstall)
 */
async function proceedWithInstall(url, pluginName, action, onProgress = null) {
    const startTime = Date.now();
    
    // Log the proceed install attempt at the start
    await logInstallAttempt({
        action: 'proceed_install_attempt',
        url,
        pluginName,
        actionType: action,
        status: 'started'
    });
    
    try {
        const urlInfo = await parseUrl(url);
        const tempFile = path.join(PLUGINS_DIR, `.temp-${Date.now()}.jar`);
        
        try {
            await downloadFile(urlInfo.downloadUrl, tempFile, onProgress);
            
            if (!isValidJar(tempFile)) {
                await fs.unlink(tempFile);
                
                await logInstallAttempt({
                    action: 'proceed_install_attempt',
                    url,
                    pluginName,
                    actionType: action,
                    status: 'failed',
                    error: 'Invalid plugin file',
                    errorType: 'invalid_jar',
                    duration_ms: Date.now() - startTime
                });
                
                throw new Error('Invalid plugin file');
            }
            
            const metadata = parsePluginYml(tempFile);
            const jarFilename = `${pluginName}.jar`;
            const jarPath = path.join(PLUGINS_DIR, jarFilename);
            
            // Create backup
            let backupCreated = false;
            if (fsSync.existsSync(jarPath)) {
                const backupPath = `${jarPath}.backup`;
                await fs.copyFile(jarPath, backupPath);
                backupCreated = true;
            }
            
            // Replace JAR
            await fs.rename(tempFile, jarPath);
            
            // Update plugins.json
            const plugins = await getAllPlugins();
            const pluginIndex = plugins.findIndex(p => p.name.toLowerCase() === pluginName.toLowerCase());
            
            let updatedPluginEntry = null;
            if (pluginIndex !== -1) {
                updatedPluginEntry = {
                    ...plugins[pluginIndex],
                    version: metadata.version,
                    description: metadata.description,
                    direct_url: url,
                    source: 'url',
                    updated_at: new Date().toISOString()
                };
                plugins[pluginIndex] = updatedPluginEntry;
                await updatePluginsJson(plugins);
            }
            
            // Add history
            await addHistoryEntry({
                action: action === 'update' ? 'updated' : action === 'downgrade' ? 'downgraded' : 'reinstalled',
                plugin: pluginName,
                version: metadata.version,
                details: `${action} from URL`
            });
            
            // Log successful update with all details
            await logInstallAttempt({
                action: 'proceed_install_attempt',
                url,
                pluginName,
                actionType: action,
                status: 'success',
                version: metadata.version,
                jarFile: jarFilename,
                jarPath,
                backupCreated,
                updatedInPluginsJson: pluginIndex !== -1,
                pluginEntry: updatedPluginEntry,
                duration_ms: Date.now() - startTime
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
            } catch (e) {
                // Ignore cleanup errors
            }
            throw error;
        }
    } catch (error) {
        // Log the error if not already logged
        if (!error.message.includes('Invalid plugin file')) {
            await logInstallAttempt({
                action: 'proceed_install_attempt',
                url,
                pluginName,
                actionType: action,
                status: 'failed',
                error: error.message,
                errorType: 'unexpected_error',
                stack: error.stack,
                duration_ms: Date.now() - startTime
            });
        }
        
        throw new Error(`Installation failed: ${error.message}`);
    }
}

/**
 * Uninstall a plugin
 */
async function uninstallPlugin(pluginName, deleteConfigs = false) {
    try {
        // Validate plugins directory first
        try {
            await fs.access(PLUGINS_DIR);
            await fs.access(PLUGINS_DIR, fs.constants.W_OK);
        } catch (accessError) {
            throw new Error(`Plugins directory not accessible or not writable: ${PLUGINS_DIR}`);
        }
        
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
        console.error('Plugin uninstall failed:', {
            pluginName,
            deleteConfigs,
            error: error.message,
            stack: error.stack
        });
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

/**
 * Check plugin manager health status
 * Returns object with status and details
 */
async function checkHealth() {
    const health = {
        healthy: true,
        checks: {
            pluginsJson: { status: 'unknown', message: '' },
            pluginsDir: { status: 'unknown', message: '' }
        }
    };
    
    // Check plugins.json exists and is parseable
    try {
        await fs.access(PLUGINS_JSON);
        const content = await fs.readFile(PLUGINS_JSON, 'utf8');
        
        if (!content || content.trim().length === 0) {
            health.checks.pluginsJson.status = 'error';
            health.checks.pluginsJson.message = 'plugins.json is empty';
            health.healthy = false;
        } else {
            try {
                const data = JSON.parse(content);
                if (!data || typeof data !== 'object' || !Array.isArray(data.plugins)) {
                    health.checks.pluginsJson.status = 'error';
                    health.checks.pluginsJson.message = 'plugins.json has invalid structure';
                    health.healthy = false;
                } else {
                    health.checks.pluginsJson.status = 'ok';
                    health.checks.pluginsJson.message = `Found ${data.plugins.length} plugins`;
                }
            } catch (parseError) {
                health.checks.pluginsJson.status = 'error';
                health.checks.pluginsJson.message = `JSON parse error: ${parseError.message}`;
                health.healthy = false;
            }
        }
    } catch (accessError) {
        health.checks.pluginsJson.status = 'error';
        health.checks.pluginsJson.message = `File not found: ${PLUGINS_JSON}`;
        health.healthy = false;
    }
    
    // Check plugins directory exists and is writable
    try {
        await fs.access(PLUGINS_DIR);
        const stats = await fs.stat(PLUGINS_DIR);
        
        if (!stats.isDirectory()) {
            health.checks.pluginsDir.status = 'error';
            health.checks.pluginsDir.message = `${PLUGINS_DIR} is not a directory`;
            health.healthy = false;
        } else {
            // Check if writable
            try {
                await fs.access(PLUGINS_DIR, fs.constants.W_OK);
                health.checks.pluginsDir.status = 'ok';
                health.checks.pluginsDir.message = 'Directory is writable';
            } catch (writeError) {
                health.checks.pluginsDir.status = 'error';
                health.checks.pluginsDir.message = 'Directory is not writable';
                health.healthy = false;
            }
        }
    } catch (accessError) {
        health.checks.pluginsDir.status = 'error';
        health.checks.pluginsDir.message = `Directory not found: ${PLUGINS_DIR}`;
        health.healthy = false;
    }
    
    return health;
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
    parseUrl,
    checkHealth
};
