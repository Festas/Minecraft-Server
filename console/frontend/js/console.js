// Console log management
// Constants
const SCROLL_BOTTOM_THRESHOLD = 50; // pixels from bottom to consider "at bottom"

// State variables
let logsPaused = false;
let autoScroll = true;
let logs = [];
let searchTerm = '';
let currentFilter = 'all';
let searchMatches = [];
let currentMatchIndex = -1;
let logCounts = {
    all: 0,
    info: 0,
    warn: 0,
    error: 0,
    chat: 0,
    join: 0,
    leave: 0
};

function appendLog(log) {
    // Filter out internal RCON polling commands that spam the console
    if (log.message && (
        log.message.includes('[Essentials] Rcon issued server command: /list') ||
        log.message.includes('Rcon issued server command: /list')
    )) {
        return; // Skip this log entry
    }
    
    logs.push(log);
    
    // Keep only last 1000 logs
    if (logs.length > 1000) {
        logs.shift();
    }
    
    // Update log counts
    const type = parseLogType(log.message);
    logCounts.all++;
    logCounts[type]++;
    updateLogCounts();
    
    // Render to console
    renderLog(log);
}

function renderLog(log) {
    const consoleOutput = document.getElementById('consoleOutput');
    const logPreview = document.getElementById('logPreview');
    
    if (!consoleOutput || logsPaused) return;
    
    const logLine = createLogElement(log);
    const type = parseLogType(log.message);
    
    // Check if log matches current filter
    if (!shouldDisplayLogForFilter(type, currentFilter)) {
        logLine.style.display = 'none';
    }
    
    // Add to main console
    consoleOutput.appendChild(logLine);
    
    // Add to preview
    if (logPreview) {
        const previewLog = logLine.cloneNode(true);
        logPreview.appendChild(previewLog);
        
        // Keep preview at max 50 lines
        while (logPreview.children.length > 50) {
            logPreview.removeChild(logPreview.firstChild);
        }
    }
    
    // Auto-scroll if enabled
    if (autoScroll) {
        if (isScrolledToBottom()) {
            consoleOutput.scrollTop = consoleOutput.scrollHeight;
            if (logPreview) {
                logPreview.scrollTop = logPreview.scrollHeight;
            }
            hideScrollIndicator();
        } else {
            showScrollIndicator();
        }
    } else if (!isScrolledToBottom()) {
        showScrollIndicator();
    }
    
    // Keep max 500 lines in DOM
    while (consoleOutput.children.length > 500) {
        consoleOutput.removeChild(consoleOutput.firstChild);
    }
}

function createLogElement(log) {
    const line = document.createElement('div');
    line.className = 'log-line';
    
    // Parse log type
    const type = parseLogType(log.message);
    line.classList.add(type);
    line.dataset.logType = type;
    
    // Create log level badge
    const badge = document.createElement('span');
    badge.className = `log-level-badge ${type}`;
    badge.textContent = type.toUpperCase();
    
    // Create timestamp
    const timestamp = document.createElement('span');
    timestamp.className = 'log-timestamp';
    timestamp.textContent = formatTimestamp(log.timestamp);
    
    // Create message with syntax highlighting
    const message = document.createElement('span');
    message.className = 'log-message';
    message.innerHTML = formatLogMessage(stripAnsiCodes(log.message));
    
    // Highlight search term
    if (searchTerm && message.textContent.toLowerCase().includes(searchTerm.toLowerCase())) {
        line.classList.add('search-highlight');
    }
    
    line.appendChild(badge);
    line.appendChild(timestamp);
    line.appendChild(message);
    
    return line;
}

function parseLogType(message) {
    const msg = message.toLowerCase();
    
    if (msg.includes('error') || msg.includes('severe')) return 'error';
    if (msg.includes('warn')) return 'warn';
    if (msg.includes('joined the game')) return 'join';
    if (msg.includes('left the game')) return 'leave';
    if (msg.match(/<[^>]+>/)) return 'chat';
    
    return 'info';
}

function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    const milliseconds = String(date.getMilliseconds()).padStart(3, '0');
    return `[${hours}:${minutes}:${seconds}.${milliseconds}]`;
}

function formatLogMessage(message) {
    // Note: Depends on global escapeHtml function from utils.js
    // utils.js is loaded before console.js (see index.html script order)
    let formatted = escapeHtml(message);
    
    // Highlight player names <Name>
    formatted = formatted.replace(/&lt;([^<>&]+)&gt;/g, '<span class="log-player">&lt;$1&gt;</span>');
    
    // Highlight coordinates (X, Y, Z)
    formatted = formatted.replace(/(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/g, 
        '<span class="log-coords">$1, $2, $3</span>');
    
    // Highlight commands /command
    formatted = formatted.replace(/\/([a-zA-Z0-9_-]+)/g, '<span class="log-command">/$1</span>');
    
    // Highlight UUIDs
    formatted = formatted.replace(/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/g, 
        '<span class="log-uuid">$&</span>');
    
    return formatted;
}

function stripAnsiCodes(str) {
    // Remove ANSI color codes
    return str.replace(/\x1b\[[0-9;]*m/g, '');
}

function clearLogs() {
    const consoleOutput = document.getElementById('consoleOutput');
    const logPreview = document.getElementById('logPreview');
    
    if (consoleOutput) consoleOutput.innerHTML = '';
    if (logPreview) logPreview.innerHTML = '';
    
    logs = [];
    
    // Reset log counts
    logCounts = {
        all: 0,
        info: 0,
        warn: 0,
        error: 0,
        chat: 0,
        join: 0,
        leave: 0
    };
    updateLogCounts();
    
    // Clear search
    searchTerm = '';
    searchMatches = [];
    currentMatchIndex = -1;
    updateSearchResultsCount();
}

function downloadLogs() {
    const text = logs.map(log => 
        `${formatTimestamp(log.timestamp)} ${stripAnsiCodes(log.message)}`
    ).join('\n');
    
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `minecraft-logs-${new Date().toISOString()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
}

function searchLogs(term) {
    searchTerm = term;
    searchMatches = [];
    currentMatchIndex = -1;
    
    const consoleOutput = document.getElementById('consoleOutput');
    const lines = consoleOutput.querySelectorAll('.log-line');
    
    lines.forEach(line => {
        line.classList.remove('search-highlight', 'search-match', 'search-current');
        
        if (term && term.length > 0) {
            const message = line.querySelector('.log-message').textContent;
            
            if (message.toLowerCase().includes(term.toLowerCase())) {
                line.classList.add('search-highlight', 'search-match');
                searchMatches.push(line);
            }
        }
    });
    
    updateSearchResultsCount();
    
    // Highlight first match
    if (searchMatches.length > 0) {
        currentMatchIndex = 0;
        highlightCurrentMatch();
    }
}

function navigateSearch(direction) {
    if (searchMatches.length === 0) return;
    
    // Remove current highlight
    if (currentMatchIndex >= 0 && currentMatchIndex < searchMatches.length) {
        searchMatches[currentMatchIndex].classList.remove('search-current');
    }
    
    // Update index
    if (direction === 'next') {
        currentMatchIndex = (currentMatchIndex + 1) % searchMatches.length;
    } else if (direction === 'prev') {
        currentMatchIndex = (currentMatchIndex - 1 + searchMatches.length) % searchMatches.length;
    }
    
    highlightCurrentMatch();
}

function highlightCurrentMatch() {
    if (currentMatchIndex >= 0 && currentMatchIndex < searchMatches.length) {
        const match = searchMatches[currentMatchIndex];
        match.classList.add('search-current');
        match.scrollIntoView({ behavior: 'smooth', block: 'center' });
        updateSearchResultsCount();
    }
}

function updateSearchResultsCount() {
    const countElement = document.getElementById('searchResultsCount');
    if (countElement) {
        if (searchMatches.length > 0 && currentMatchIndex >= 0) {
            countElement.textContent = `${currentMatchIndex + 1}/${searchMatches.length}`;
            countElement.style.display = 'inline';
        } else if (searchTerm) {
            countElement.textContent = 'No matches';
            countElement.style.display = 'inline';
        } else {
            countElement.style.display = 'none';
        }
    }
}

function togglePauseLogs() {
    logsPaused = !logsPaused;
    
    const pauseBtn = document.getElementById('pauseLogsBtn');
    if (pauseBtn) {
        pauseBtn.textContent = logsPaused ? '▶️ Resume' : '⏸️ Pause';
    }
    
    const consoleOutput = document.getElementById('consoleOutput');
    const logPreview = document.getElementById('logPreview');
    
    if (logsPaused) {
        if (consoleOutput) consoleOutput.classList.add('paused');
        if (logPreview) logPreview.classList.add('paused');
    } else {
        if (consoleOutput) consoleOutput.classList.remove('paused');
        if (logPreview) logPreview.classList.remove('paused');
    }
}

function setupFilterTabs() {
    const filterTabs = document.querySelectorAll('.log-filter-tab');
    filterTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const filter = tab.dataset.filter;
            setLogFilter(filter);
            
            // Update active state
            filterTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
        });
    });
}

function setLogFilter(filter) {
    currentFilter = filter;
    
    const consoleOutput = document.getElementById('consoleOutput');
    const lines = consoleOutput.querySelectorAll('.log-line');
    
    lines.forEach(line => {
        const type = line.dataset.logType;
        
        if (filter === 'all') {
            line.style.display = '';
        } else if (filter === 'join') {
            // JOIN/LEAVE shows both join and leave logs
            line.style.display = (type === 'join' || type === 'leave') ? '' : 'none';
        } else {
            line.style.display = (type === filter) ? '' : 'none';
        }
    });
}

function updateLogCounts() {
    document.getElementById('logCountAll').textContent = logCounts.all;
    document.getElementById('logCountInfo').textContent = logCounts.info;
    document.getElementById('logCountWarn').textContent = logCounts.warn;
    document.getElementById('logCountError').textContent = logCounts.error;
    document.getElementById('logCountChat').textContent = logCounts.chat;
    
    // JOIN/LEAVE count is sum of join and leave
    const joinLeaveCount = logCounts.join + logCounts.leave;
    document.getElementById('logCountJoin').textContent = joinLeaveCount;
}

function toggleAutoScroll() {
    autoScroll = !autoScroll;
    
    const autoScrollBtn = document.getElementById('autoScrollBtn');
    if (autoScrollBtn) {
        if (autoScroll) {
            autoScrollBtn.classList.add('active');
            autoScrollBtn.textContent = '📜 Auto-scroll';
            
            // Scroll to bottom immediately
            const consoleOutput = document.getElementById('consoleOutput');
            if (consoleOutput) {
                consoleOutput.scrollTop = consoleOutput.scrollHeight;
            }
            hideScrollIndicator();
        } else {
            autoScrollBtn.classList.remove('active');
            autoScrollBtn.textContent = '📜 Manual';
        }
    }
}

// Helper function to determine if log should be displayed for current filter
function shouldDisplayLogForFilter(logType, filter) {
    if (filter === 'all') return true;
    if (filter === 'join') return logType === 'join' || logType === 'leave';
    return logType === filter;
}

function isScrolledToBottom() {
    const consoleOutput = document.getElementById('consoleOutput');
    if (!consoleOutput) return true;
    
    return consoleOutput.scrollHeight - consoleOutput.scrollTop - consoleOutput.clientHeight < SCROLL_BOTTOM_THRESHOLD;
}

function showScrollIndicator() {
    const indicator = document.getElementById('scrollIndicator');
    if (indicator && !autoScroll) {
        indicator.classList.add('visible');
    }
}

function hideScrollIndicator() {
    const indicator = document.getElementById('scrollIndicator');
    if (indicator) {
        indicator.classList.remove('visible');
    }
}

function updateConsoleStatus(status) {
    const statusText = document.getElementById('consoleStatusText');
    const statusBar = document.querySelector('.console-header-bar');
    
    if (statusText && statusBar) {
        const dot = statusBar.querySelector('.console-status-dot');
        
        // Remove all status classes
        dot.classList.remove('connected', 'disconnected', 'connecting');
        
        if (status === 'connected') {
            statusText.textContent = 'Connected';
            dot.classList.add('connected');
        } else if (status === 'connecting') {
            statusText.textContent = 'Connecting...';
            dot.classList.add('connecting');
        } else {
            statusText.textContent = 'Disconnected';
            dot.classList.add('disconnected');
        }
    }
}

function initConsole() {
    // Setup filter tabs
    setupFilterTabs();
    
    // Setup search buttons
    const searchInput = document.getElementById('logSearchInput');
    const searchPrevBtn = document.getElementById('searchPrevBtn');
    const searchNextBtn = document.getElementById('searchNextBtn');
    const clearSearchBtn = document.getElementById('clearSearchBtn');
    
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            searchLogs(e.target.value);
        });
        
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                navigateSearch(e.shiftKey ? 'prev' : 'next');
            } else if (e.key === 'Escape') {
                searchInput.value = '';
                searchLogs('');
            }
        });
    }
    
    if (searchPrevBtn) {
        searchPrevBtn.addEventListener('click', () => navigateSearch('prev'));
    }
    
    if (searchNextBtn) {
        searchNextBtn.addEventListener('click', () => navigateSearch('next'));
    }
    
    if (clearSearchBtn) {
        clearSearchBtn.addEventListener('click', () => {
            if (searchInput) {
                searchInput.value = '';
                searchLogs('');
            }
        });
    }
    
    // Setup auto-scroll button
    const autoScrollBtn = document.getElementById('autoScrollBtn');
    if (autoScrollBtn) {
        autoScrollBtn.addEventListener('click', toggleAutoScroll);
    }
    
    // Setup scroll indicator click
    const scrollIndicator = document.getElementById('scrollIndicator');
    if (scrollIndicator) {
        scrollIndicator.addEventListener('click', () => {
            const consoleOutput = document.getElementById('consoleOutput');
            if (consoleOutput) {
                consoleOutput.scrollTop = consoleOutput.scrollHeight;
                hideScrollIndicator();
            }
        });
    }
    
    // Monitor scroll position
    const consoleOutput = document.getElementById('consoleOutput');
    if (consoleOutput) {
        consoleOutput.addEventListener('scroll', () => {
            if (isScrolledToBottom()) {
                hideScrollIndicator();
            }
        });
    }
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Ctrl+F for search (only when on console section)
        const consoleSection = document.getElementById('console');
        if (e.ctrlKey && e.key === 'f' && consoleSection && consoleSection.classList.contains('active')) {
            e.preventDefault();
            if (searchInput) {
                searchInput.focus();
            }
        }
    });
    
    // Initialize log counts
    updateLogCounts();
}

// Initialize console on page load
document.addEventListener('DOMContentLoaded', initConsole);
