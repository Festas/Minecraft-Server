// Marketplace UI Logic

let csrfToken = '';
let currentSearch = {
    query: '',
    platform: 'all',
    category: '',
    sort: 'relevance',
    offset: 0,
    limit: 20
};
let searchResults = [];
let installedPlugins = [];
let categories = {};

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
    await checkAuth();
    await fetchCsrfToken();
    await loadCategories();
    await loadFeaturedPlugins();
    await loadInstalledPlugins();
    initializeEventListeners();
});

// Check authentication
async function checkAuth() {
    try {
        const response = await fetch('/api/session', {
            credentials: 'same-origin'
        });
        const data = await response.json();
        
        if (!data.authenticated) {
            window.location.href = '/console/login.html';
            return;
        }
        
        document.getElementById('currentUser').textContent = data.username;
    } catch (error) {
        console.error('Auth check failed:', error);
        window.location.href = '/console/login.html';
    }
}

// Fetch CSRF token
async function fetchCsrfToken() {
    try {
        const response = await fetch('/api/csrf-token', {
            credentials: 'same-origin'
        });
        const data = await response.json();
        csrfToken = data.csrfToken;
    } catch (error) {
        console.error('Failed to fetch CSRF token:', error);
    }
}

// Initialize event listeners
function initializeEventListeners() {
    // Initialize data-href navigation
    initializeDataHrefNavigation();
    
    // Logout
    document.getElementById('logoutBtn').addEventListener('click', logout);
    
    // Search
    document.getElementById('searchBtn').addEventListener('click', handleSearch);
    document.getElementById('searchQuery').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSearch();
    });
    
    // Filters
    document.getElementById('platformFilter').addEventListener('change', handleSearch);
    document.getElementById('categoryFilter').addEventListener('change', handleSearch);
    document.getElementById('sortFilter').addEventListener('change', handleSearch);
    
    // Clear search
    document.getElementById('clearSearchBtn').addEventListener('click', clearSearch);
    
    // Load more
    document.getElementById('loadMoreBtn').addEventListener('click', loadMoreResults);
    
    // Check updates
    document.getElementById('checkUpdatesBtn').addEventListener('click', checkAllUpdates);
    
    // Close modal
    document.getElementById('closeDetailsModal').addEventListener('click', hideDetailsModal);
    
    // Click outside modal to close
    document.getElementById('pluginDetailsModal').addEventListener('click', (e) => {
        if (e.target.id === 'pluginDetailsModal') {
            hideDetailsModal();
        }
    });
}

// Load categories
async function loadCategories() {
    try {
        const response = await fetch('/api/marketplace/categories', {
            credentials: 'same-origin',
            headers: {
                'CSRF-Token': csrfToken
            }
        });
        const data = await response.json();
        
        if (data.success) {
            categories = data.categories;
            populateCategoryFilter();
        }
    } catch (error) {
        console.error('Failed to load categories:', error);
    }
}

// Populate category filter
function populateCategoryFilter() {
    const select = document.getElementById('categoryFilter');
    const allCategories = new Set();
    
    // Combine all categories from all platforms
    Object.values(categories).forEach(platformCats => {
        platformCats.forEach(cat => allCategories.add(cat));
    });
    
    // Sort and add to select
    Array.from(allCategories).sort().forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        select.appendChild(option);
    });
}

// Load featured plugins
async function loadFeaturedPlugins() {
    const container = document.getElementById('featuredPlugins');
    container.innerHTML = '<div class="loading">Loading featured plugins...</div>';
    
    try {
        const response = await fetch('/api/marketplace/featured?limit=12', {
            credentials: 'same-origin',
            headers: {
                'CSRF-Token': csrfToken
            }
        });
        const data = await response.json();
        
        if (data.success && data.plugins.length > 0) {
            renderPluginGrid(data.plugins, container);
        } else {
            container.innerHTML = '<div class="empty-state"><h3>No featured plugins</h3><p>Check back later for featured plugins</p></div>';
        }
    } catch (error) {
        console.error('Failed to load featured plugins:', error);
        container.innerHTML = '<div class="empty-state"><h3>Failed to load</h3><p>Unable to load featured plugins. Please try again.</p></div>';
    }
}

// Load installed plugins
async function loadInstalledPlugins() {
    const container = document.getElementById('installedPlugins');
    container.innerHTML = '<div class="loading">Loading installed plugins...</div>';
    
    try {
        const response = await fetch('/api/plugins', {
            credentials: 'same-origin',
            headers: {
                'CSRF-Token': csrfToken
            }
        });
        const data = await response.json();
        
        installedPlugins = data.plugins || [];
        document.getElementById('installedCount').textContent = installedPlugins.length;
        
        if (installedPlugins.length > 0) {
            renderInstalledPlugins(installedPlugins.slice(0, 5), container); // Show first 5
        } else {
            container.innerHTML = '<div class="empty-state"><p>No plugins installed</p></div>';
        }
    } catch (error) {
        console.error('Failed to load installed plugins:', error);
        container.innerHTML = '<div class="empty-state"><p>Failed to load plugins</p></div>';
    }
}

// Handle search
async function handleSearch() {
    currentSearch = {
        query: document.getElementById('searchQuery').value,
        platform: document.getElementById('platformFilter').value,
        category: document.getElementById('categoryFilter').value,
        sort: document.getElementById('sortFilter').value,
        offset: 0,
        limit: 20
    };
    
    await performSearch();
}

// Perform search
async function performSearch() {
    const resultsSection = document.getElementById('resultsSection');
    const resultsContainer = document.getElementById('searchResults');
    const featuredSection = document.getElementById('featuredSection');
    
    resultsContainer.innerHTML = '<div class="loading">Searching...</div>';
    resultsSection.style.display = 'block';
    featuredSection.style.display = 'none';
    
    try {
        const params = new URLSearchParams({
            q: currentSearch.query,
            platform: currentSearch.platform,
            sortBy: currentSearch.sort,
            limit: currentSearch.limit,
            offset: currentSearch.offset
        });
        
        if (currentSearch.category) {
            params.append('category', currentSearch.category);
        }
        
        const response = await fetch(`/api/marketplace/search?${params}`, {
            credentials: 'same-origin',
            headers: {
                'CSRF-Token': csrfToken
            }
        });
        const data = await response.json();
        
        if (data.success) {
            if (currentSearch.offset === 0) {
                searchResults = data.plugins;
            } else {
                searchResults = searchResults.concat(data.plugins);
            }
            
            document.getElementById('resultsCount').textContent = data.total;
            
            if (searchResults.length > 0) {
                renderPluginGrid(searchResults, resultsContainer);
                
                // Show/hide load more button
                const loadMoreContainer = document.getElementById('loadMoreContainer');
                if (data.hasMore) {
                    loadMoreContainer.style.display = 'block';
                } else {
                    loadMoreContainer.style.display = 'none';
                }
            } else {
                resultsContainer.innerHTML = '<div class="empty-state"><h3>No results found</h3><p>Try different search terms or filters</p></div>';
            }
        } else {
            throw new Error(data.message || 'Search failed');
        }
    } catch (error) {
        console.error('Search failed:', error);
        resultsContainer.innerHTML = '<div class="empty-state"><h3>Search failed</h3><p>Unable to search marketplace. Please try again.</p></div>';
    }
}

// Load more results
async function loadMoreResults() {
    currentSearch.offset += currentSearch.limit;
    await performSearch();
}

// Clear search
function clearSearch() {
    document.getElementById('searchQuery').value = '';
    document.getElementById('platformFilter').value = 'all';
    document.getElementById('categoryFilter').value = '';
    document.getElementById('sortFilter').value = 'relevance';
    
    document.getElementById('resultsSection').style.display = 'none';
    document.getElementById('featuredSection').style.display = 'block';
    
    loadFeaturedPlugins();
}

// Render plugin grid
function renderPluginGrid(plugins, container) {
    container.innerHTML = '';
    
    plugins.forEach(plugin => {
        const card = createPluginCard(plugin);
        container.appendChild(card);
    });
}

// Create plugin card
function createPluginCard(plugin) {
    const card = document.createElement('div');
    card.className = 'plugin-card';
    card.onclick = () => showPluginDetails(plugin.platform, plugin.id);
    
    const platformBadge = document.createElement('div');
    platformBadge.className = `plugin-platform-badge ${plugin.platform}`;
    platformBadge.textContent = plugin.platform;
    card.appendChild(platformBadge);
    
    const header = document.createElement('div');
    header.className = 'plugin-card-header';
    
    const icon = document.createElement('img');
    icon.className = 'plugin-icon';
    if (plugin.icon) {
        icon.src = plugin.icon;
        icon.alt = plugin.name;
    } else {
        icon.className = 'plugin-icon placeholder';
        icon.innerHTML = '🔌';
        icon.alt = '';
    }
    header.appendChild(icon);
    
    const titleContainer = document.createElement('div');
    titleContainer.className = 'plugin-card-title';
    
    const title = document.createElement('h4');
    title.textContent = plugin.name;
    titleContainer.appendChild(title);
    
    const author = document.createElement('div');
    author.className = 'plugin-author';
    author.textContent = `by ${plugin.author}`;
    titleContainer.appendChild(author);
    
    header.appendChild(titleContainer);
    card.appendChild(header);
    
    if (plugin.categories && plugin.categories.length > 0) {
        const categoriesDiv = document.createElement('div');
        categoriesDiv.className = 'plugin-categories';
        plugin.categories.slice(0, 3).forEach(cat => {
            const tag = document.createElement('span');
            tag.className = 'plugin-category-tag';
            tag.textContent = cat;
            categoriesDiv.appendChild(tag);
        });
        card.appendChild(categoriesDiv);
    }
    
    const description = document.createElement('div');
    description.className = 'plugin-description';
    description.textContent = plugin.description;
    card.appendChild(description);
    
    const meta = document.createElement('div');
    meta.className = 'plugin-meta';
    
    const downloads = document.createElement('div');
    downloads.className = 'plugin-meta-item';
    downloads.innerHTML = `<span class="icon">⬇️</span> ${formatNumber(plugin.downloads)}`;
    meta.appendChild(downloads);
    
    if (plugin.followers) {
        const followers = document.createElement('div');
        followers.className = 'plugin-meta-item';
        followers.innerHTML = `<span class="icon">⭐</span> ${formatNumber(plugin.followers)}`;
        meta.appendChild(followers);
    }
    
    card.appendChild(meta);
    
    // Check if already installed
    const isInstalled = installedPlugins.some(p => p.name.toLowerCase() === plugin.name.toLowerCase());
    
    const actions = document.createElement('div');
    actions.className = 'plugin-card-actions';
    
    const detailsBtn = document.createElement('button');
    detailsBtn.className = 'btn btn-secondary';
    detailsBtn.textContent = 'Details';
    detailsBtn.onclick = (e) => {
        e.stopPropagation();
        showPluginDetails(plugin.platform, plugin.id);
    };
    actions.appendChild(detailsBtn);
    
    if (!isInstalled) {
        const installBtn = document.createElement('button');
        installBtn.className = 'btn btn-primary';
        installBtn.textContent = 'Install';
        installBtn.onclick = (e) => {
            e.stopPropagation();
            installFromMarketplace(plugin);
        };
        actions.appendChild(installBtn);
    } else {
        const installedLabel = document.createElement('span');
        installedLabel.className = 'btn btn-success';
        installedLabel.textContent = '✓ Installed';
        installedLabel.style.cursor = 'default';
        actions.appendChild(installedLabel);
    }
    
    card.appendChild(actions);
    
    return card;
}

// Show plugin details
async function showPluginDetails(platform, pluginId) {
    const modal = document.getElementById('pluginDetailsModal');
    const content = document.getElementById('pluginDetailsContent');
    
    modal.classList.remove('hidden');
    content.innerHTML = '<div class="loading">Loading plugin details...</div>';
    
    try {
        const response = await fetch(`/api/marketplace/plugin/${platform}/${pluginId}`, {
            credentials: 'same-origin',
            headers: {
                'CSRF-Token': csrfToken
            }
        });
        const data = await response.json();
        
        if (data.success) {
            renderPluginDetails(data.plugin);
        } else {
            throw new Error(data.message || 'Failed to load details');
        }
    } catch (error) {
        console.error('Failed to load plugin details:', error);
        content.innerHTML = '<div class="empty-state"><h3>Failed to load</h3><p>Unable to load plugin details. Please try again.</p></div>';
    }
}

// Render plugin details
function renderPluginDetails(plugin) {
    const content = document.getElementById('pluginDetailsContent');
    document.getElementById('modalPluginName').textContent = plugin.name;
    
    const html = `
        <div class="plugin-details-header">
            ${plugin.icon 
                ? `<img src="${plugin.icon}" alt="${plugin.name}" class="plugin-details-icon">`
                : '<div class="plugin-details-icon placeholder">🔌</div>'
            }
            <div class="plugin-details-info">
                <h2>${escapeHtml(plugin.name)}</h2>
                <div class="plugin-details-author">by ${escapeHtml(plugin.author)}</div>
                <div class="plugin-details-stats">
                    <div><strong>${formatNumber(plugin.downloads)}</strong> downloads</div>
                    ${plugin.followers ? `<div><strong>${formatNumber(plugin.followers)}</strong> followers</div>` : ''}
                    ${plugin.license ? `<div><strong>${escapeHtml(plugin.license)}</strong> license</div>` : ''}
                </div>
            </div>
        </div>
        
        <div class="plugin-details-body">
            <h3>Description</h3>
            <p>${escapeHtml(plugin.description)}</p>
            
            ${plugin.categories && plugin.categories.length > 0 ? `
                <h3>Categories</h3>
                <div class="plugin-categories">
                    ${plugin.categories.map(cat => `<span class="plugin-category-tag">${cat}</span>`).join('')}
                </div>
            ` : ''}
            
            ${plugin.sourceUrl || plugin.issuesUrl || plugin.wikiUrl || plugin.discordUrl ? `
                <h3>Links</h3>
                <div class="plugin-details-links">
                    ${plugin.url ? `<a href="${plugin.url}" target="_blank">🔗 View on ${plugin.platform}</a>` : ''}
                    ${plugin.sourceUrl ? `<a href="${plugin.sourceUrl}" target="_blank">📦 Source Code</a>` : ''}
                    ${plugin.issuesUrl ? `<a href="${plugin.issuesUrl}" target="_blank">🐛 Issues</a>` : ''}
                    ${plugin.wikiUrl ? `<a href="${plugin.wikiUrl}" target="_blank">📖 Wiki</a>` : ''}
                    ${plugin.discordUrl ? `<a href="${plugin.discordUrl}" target="_blank">💬 Discord</a>` : ''}
                </div>
            ` : ''}
            
            ${plugin.versions && plugin.versions.length > 0 ? `
                <h3>Versions</h3>
                <div class="plugin-versions-list">
                    ${plugin.versions.slice(0, 5).map(version => `
                        <div class="version-item">
                            <div class="version-info">
                                <h4>
                                    ${escapeHtml(version.name)}
                                    <span class="version-type ${version.versionType}">${version.versionType}</span>
                                </h4>
                                <p>
                                    ${version.gameVersions.join(', ')} • 
                                    ${formatNumber(version.downloads)} downloads •
                                    ${formatDate(version.datePublished)}
                                </p>
                            </div>
                            <button class="btn btn-sm btn-primary install-version-btn" 
                                data-platform="${escapeHtml(plugin.platform)}" 
                                data-plugin-id="${escapeHtml(plugin.id)}" 
                                data-version-id="${escapeHtml(version.id)}" 
                                data-download-url="${escapeHtml(version.files[0]?.url || '')}">
                                Install
                            </button>
                        </div>
                    `).join('')}
                </div>
            ` : ''}
        </div>
        
        <div class="modal-actions">
            <button class="btn btn-primary install-latest-btn" 
                data-platform="${escapeHtml(plugin.platform)}" 
                data-plugin-id="${escapeHtml(plugin.id)}" 
                data-plugin-name="${escapeHtml(plugin.name)}">
                Install Latest Version
            </button>
            <button class="btn btn-secondary close-modal-btn">
                Close
            </button>
        </div>
    `;
    
    content.innerHTML = html;
    
    // Add event listeners for install buttons
    content.querySelectorAll('.install-version-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const platform = e.target.dataset.platform;
            const pluginId = e.target.dataset.pluginId;
            const versionId = e.target.dataset.versionId;
            const downloadUrl = e.target.dataset.downloadUrl;
            installPluginVersion(platform, pluginId, versionId, downloadUrl);
        });
    });
    
    const installLatestBtn = content.querySelector('.install-latest-btn');
    if (installLatestBtn) {
        installLatestBtn.addEventListener('click', () => {
            installFromMarketplace({
                platform: plugin.platform,
                id: plugin.id,
                name: plugin.name,
                versions: plugin.versions
            });
        });
    }
    
    const closeBtn = content.querySelector('.close-modal-btn');
    if (closeBtn) {
        closeBtn.addEventListener('click', hideDetailsModal);
    }
}

// Install from marketplace
async function installFromMarketplace(plugin) {
    if (!plugin.versions || plugin.versions.length === 0) {
        showToast('No downloadable versions available', 'error');
        return;
    }
    
    const latestVersion = plugin.versions[0];
    const downloadUrl = latestVersion.files[0]?.url;
    
    if (!downloadUrl) {
        showToast('No download URL available', 'error');
        return;
    }
    
    await installPluginVersion(plugin.platform, plugin.id, latestVersion.id, downloadUrl);
}

// Install specific plugin version
async function installPluginVersion(platform, pluginId, versionId, downloadUrl) {
    try {
        showToast('Installing plugin...', 'info');
        
        const response = await fetch('/api/plugins/install', {
            method: 'POST',
            credentials: 'same-origin',
            headers: {
                'Content-Type': 'application/json',
                'CSRF-Token': csrfToken
            },
            body: JSON.stringify({
                url: downloadUrl
            })
        });
        
        const data = await response.json();
        
        if (data.status === 'installed' || data.status === 'conflict') {
            showToast(`Plugin installed successfully!`, 'success');
            hideDetailsModal();
            await loadInstalledPlugins();
        } else {
            showToast(data.error || 'Installation failed', 'error');
        }
    } catch (error) {
        console.error('Installation error:', error);
        showToast('Installation failed. Please try again.', 'error');
    }
}

// Render installed plugins (compact view)
function renderInstalledPlugins(plugins, container) {
    container.innerHTML = '';
    
    plugins.forEach(plugin => {
        const item = document.createElement('div');
        item.className = 'plugin-compact-item';
        
        const info = document.createElement('div');
        info.className = 'plugin-compact-info';
        
        const name = document.createElement('h4');
        name.textContent = plugin.name;
        info.appendChild(name);
        
        const version = document.createElement('p');
        version.textContent = `Version ${plugin.version} • ${plugin.enabled ? 'Enabled' : 'Disabled'}`;
        info.appendChild(version);
        
        item.appendChild(info);
        container.appendChild(item);
    });
}

// Check for updates for all plugins
async function checkAllUpdates() {
    const btn = document.getElementById('checkUpdatesBtn');
    btn.disabled = true;
    btn.textContent = '🔄 Checking...';
    
    try {
        const response = await fetch('/api/plugins/updates/check-all', {
            credentials: 'same-origin',
            headers: {
                'CSRF-Token': csrfToken
            }
        });
        const data = await response.json();
        
        if (data.success) {
            if (data.updates.length > 0) {
                showToast(`${data.updates.length} update(s) available!`, 'success');
                // TODO: Show update notifications in UI
            } else {
                showToast('All plugins are up to date', 'success');
            }
        } else {
            throw new Error(data.error || 'Failed to check updates');
        }
    } catch (error) {
        console.error('Failed to check updates:', error);
        showToast('Failed to check updates', 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = '🔄 Check Updates';
    }
}

// Hide details modal
function hideDetailsModal() {
    document.getElementById('pluginDetailsModal').classList.add('hidden');
}

// Logout
async function logout() {
    try {
        await fetch('/api/logout', {
            method: 'POST',
            credentials: 'same-origin',
            headers: {
                'CSRF-Token': csrfToken
            }
        });
        window.location.href = '/console/login.html';
    } catch (error) {
        console.error('Logout failed:', error);
        window.location.href = '/console/login.html';
    }
}

// Utility functions
function formatNumber(num) {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 1) {
        return 'Today';
    } else if (diffDays < 7) {
        return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else if (diffDays < 30) {
        const weeks = Math.floor(diffDays / 7);
        return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
    } else if (diffDays < 365) {
        const months = Math.floor(diffDays / 30);
        return `${months} month${months > 1 ? 's' : ''} ago`;
    } else {
        return date.toLocaleDateString();
    }
}

function escapeHtml(text) {
    if (!text) return '';
    
    const entityMap = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
        '/': '&#x2F;'
    };
    
    return String(text).replace(/[&<>"'\/]/g, (s) => entityMap[s]);
}

function showToast(message, type = 'info') {
    // Use notifications.js if available
    if (window.showNotification) {
        window.showNotification(message, type);
    } else {
        console.log(`[${type.toUpperCase()}] ${message}`);
    }
}
