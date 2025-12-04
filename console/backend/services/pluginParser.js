const AdmZip = require('adm-zip');
const yaml = require('js-yaml');
const fs = require('fs');

/**
 * Parse plugin.yml from a JAR file
 * @param {string} jarPath - Path to the JAR file
 * @returns {object} - Parsed plugin metadata
 */
function parsePluginYml(jarPath) {
    try {
        // Verify file exists
        if (!fs.existsSync(jarPath)) {
            throw new Error(`JAR file not found: ${jarPath}`);
        }

        // Verify it's a valid JAR (ZIP) file
        const zip = new AdmZip(jarPath);
        const pluginYmlEntry = zip.getEntry('plugin.yml');
        
        if (!pluginYmlEntry) {
            throw new Error('Missing plugin.yml in JAR file');
        }
        
        const content = pluginYmlEntry.getData().toString('utf8');
        const pluginData = yaml.load(content);
        
        // Validate required fields
        if (!pluginData.name) {
            throw new Error('Missing required field: name in plugin.yml');
        }
        
        if (!pluginData.version) {
            throw new Error('Missing required field: version in plugin.yml');
        }
        
        // Normalize authors field
        let authors = [];
        if (pluginData.author) {
            authors = [pluginData.author];
        } else if (pluginData.authors && Array.isArray(pluginData.authors)) {
            authors = pluginData.authors;
        }
        
        // Normalize dependencies
        const depend = Array.isArray(pluginData.depend) ? pluginData.depend : 
                      (pluginData.depend ? [pluginData.depend] : []);
        const softdepend = Array.isArray(pluginData.softdepend) ? pluginData.softdepend : 
                          (pluginData.softdepend ? [pluginData.softdepend] : []);
        
        return {
            name: pluginData.name,
            version: pluginData.version,
            description: pluginData.description || '',
            authors: authors,
            apiVersion: pluginData['api-version'] || null,
            depend: depend,
            softdepend: softdepend,
            main: pluginData.main || null,
            website: pluginData.website || null,
            commands: pluginData.commands || {},
            permissions: pluginData.permissions || {}
        };
    } catch (error) {
        throw new Error(`Failed to parse plugin.yml: ${error.message}`);
    }
}

/**
 * Validate if a file is a valid JAR
 * @param {string} filePath - Path to the file
 * @returns {boolean} - True if valid JAR
 */
function isValidJar(filePath) {
    try {
        if (!fs.existsSync(filePath)) {
            return false;
        }
        
        // Check file size
        const stats = fs.statSync(filePath);
        if (stats.size === 0) {
            return false;
        }
        
        // Try to open as ZIP
        const zip = new AdmZip(filePath);
        const entries = zip.getEntries();
        
        // Must have plugin.yml
        return entries.some(entry => entry.entryName === 'plugin.yml');
    } catch (error) {
        return false;
    }
}

module.exports = {
    parsePluginYml,
    isValidJar
};
