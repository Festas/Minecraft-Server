// Console log management
let logsPaused = false;
let autoScroll = true;
let logs = [];
let searchTerm = '';

function appendLog(log) {
    logs.push(log);
    
    // Keep only last 1000 logs
    if (logs.length > 1000) {
        logs.shift();
    }
    
    // Render to console
    renderLog(log);
}

function renderLog(log) {
    const consoleOutput = document.getElementById('consoleOutput');
    const logPreview = document.getElementById('logPreview');
    
    if (!consoleOutput || logsPaused) return;
    
    const logLine = createLogElement(log);
    
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
        consoleOutput.scrollTop = consoleOutput.scrollHeight;
        if (logPreview) {
            logPreview.scrollTop = logPreview.scrollHeight;
        }
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
    
    // Create timestamp
    const timestamp = document.createElement('span');
    timestamp.className = 'log-timestamp';
    timestamp.textContent = formatTimestamp(log.timestamp);
    
    // Create message
    const message = document.createElement('span');
    message.className = 'log-message';
    message.textContent = stripAnsiCodes(log.message);
    
    // Highlight search term
    if (searchTerm && message.textContent.toLowerCase().includes(searchTerm.toLowerCase())) {
        line.classList.add('highlight');
    }
    
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
    return `[${hours}:${minutes}:${seconds}]`;
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
    
    const consoleOutput = document.getElementById('consoleOutput');
    const lines = consoleOutput.querySelectorAll('.log-line');
    
    lines.forEach(line => {
        const message = line.querySelector('.log-message').textContent;
        
        if (term && message.toLowerCase().includes(term.toLowerCase())) {
            line.classList.add('highlight');
        } else {
            line.classList.remove('highlight');
        }
    });
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
