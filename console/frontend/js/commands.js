// Command handling and history
let commandHistory = [];
let historyIndex = -1;

async function executeCommand(command, skipConfirmation = false) {
    if (!command || !command.trim()) return;
    
    command = command.trim();
    
    // Add to history
    addToHistory(command);
    
    // Check if requires confirmation
    const dangerousCommands = ['stop', 'kill', 'ban', 'whitelist'];
    const isDangerous = dangerousCommands.some(cmd => 
        command.toLowerCase().startsWith(cmd)
    );
    
    if (isDangerous && !skipConfirmation) {
        const confirmed = await showConfirmation(
            'Dangerous Command',
            `Are you sure you want to execute: ${command}?`
        );
        
        if (!confirmed) return;
    }
    
    try {
        const response = await apiRequest('/api/commands/execute', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ command, confirmed: true })
        });
        
        const data = await response.json();
        
        if (data.requiresConfirmation && !skipConfirmation) {
            const confirmed = await showConfirmation(
                'Confirm Action',
                data.message
            );
            
            if (confirmed) {
                executeCommand(command, true);
            }
            return;
        }
        
        if (data.success) {
            showNotification('Command executed', 'success');
            if (data.response) {
                appendLog({
                    timestamp: new Date().toISOString(),
                    message: `> ${command}\n${data.response}`
                });
            }
        } else {
            if (data.error === 'RCON not connected') {
                showNotification('RCON disconnected - cannot execute commands. Check server diagnostics.', 'error');
            } else {
                showNotification(data.error || 'Command failed', 'error');
            }
        }
    } catch (error) {
        showNotification('Error executing command', 'error');
    }
}

function addToHistory(command) {
    // Don't add duplicates if it's the last command
    if (commandHistory[commandHistory.length - 1] !== command) {
        commandHistory.push(command);
    }
    
    // Keep only last 50 commands
    if (commandHistory.length > 50) {
        commandHistory.shift();
    }
    
    historyIndex = commandHistory.length;
    
    // Save to session storage
    try {
        localStorage.setItem('commandHistory', JSON.stringify(commandHistory));
    } catch (e) {
        // Ignore localStorage errors
    }
}

function loadCommandHistory() {
    try {
        const saved = localStorage.getItem('commandHistory');
        if (saved) {
            commandHistory = JSON.parse(saved);
            historyIndex = commandHistory.length;
        }
    } catch (e) {
        // Ignore localStorage errors
    }
}

function navigateHistory(direction) {
    if (commandHistory.length === 0) return null;
    
    if (direction === 'up') {
        historyIndex = Math.max(0, historyIndex - 1);
    } else if (direction === 'down') {
        historyIndex = Math.min(commandHistory.length, historyIndex + 1);
    }
    
    return historyIndex < commandHistory.length ? commandHistory[historyIndex] : '';
}

// Command autocomplete suggestions
const commonCommands = [
    'say',
    'time set day',
    'time set night',
    'weather clear',
    'weather rain',
    'weather thunder',
    'gamemode survival',
    'gamemode creative',
    'gamemode adventure',
    'gamemode spectator',
    'difficulty peaceful',
    'difficulty easy',
    'difficulty normal',
    'difficulty hard',
    'give',
    'tp',
    'kill',
    'kick',
    'ban',
    'pardon',
    'op',
    'deop',
    'whitelist add',
    'whitelist remove',
    'whitelist on',
    'whitelist off',
    'list',
    'save-all',
    'save-off',
    'save-on',
    'stop'
];

function getCommandSuggestions(input) {
    if (!input) return [];
    
    const lowercaseInput = input.toLowerCase();
    return commonCommands.filter(cmd => 
        cmd.toLowerCase().startsWith(lowercaseInput)
    );
}

// Command autocomplete functionality
let autocompleteIndex = -1;
let autocompleteSuggestions = [];

function initCommandAutocomplete() {
    const commandInput = document.getElementById('commandInput');
    const autocompleteDiv = document.getElementById('commandAutocomplete');
    
    if (!commandInput || !autocompleteDiv) return;
    
    commandInput.addEventListener('input', (e) => {
        const input = e.target.value;
        
        if (input.trim().length > 0) {
            showAutocompleteSuggestions(input);
        } else {
            hideAutocomplete();
        }
    });
    
    commandInput.addEventListener('keydown', (e) => {
        const autocompleteVisible = autocompleteDiv.style.display === 'block' && autocompleteSuggestions.length > 0;
        
        if (autocompleteVisible) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                autocompleteIndex = Math.min(autocompleteIndex + 1, autocompleteSuggestions.length - 1);
                updateAutocompleteHighlight();
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                autocompleteIndex = Math.max(autocompleteIndex - 1, 0);
                updateAutocompleteHighlight();
            } else if (e.key === 'Tab' || (e.key === 'Enter' && autocompleteIndex >= 0)) {
                e.preventDefault();
                if (autocompleteIndex >= 0 && autocompleteIndex < autocompleteSuggestions.length) {
                    selectAutocompleteSuggestion(autocompleteSuggestions[autocompleteIndex]);
                }
            } else if (e.key === 'Escape') {
                e.preventDefault();
                hideAutocomplete();
            }
        }
    });
    
    // Hide autocomplete when clicking outside
    document.addEventListener('click', (e) => {
        if (!commandInput.contains(e.target) && !autocompleteDiv.contains(e.target)) {
            hideAutocomplete();
        }
    });
}

function showAutocompleteSuggestions(input) {
    const autocompleteDiv = document.getElementById('commandAutocomplete');
    if (!autocompleteDiv) return;
    
    const suggestions = getCommandSuggestions(input);
    autocompleteSuggestions = suggestions;
    
    if (suggestions.length === 0) {
        hideAutocomplete();
        return;
    }
    
    autocompleteDiv.innerHTML = '';
    autocompleteIndex = 0;
    
    suggestions.forEach((cmd, index) => {
        const item = document.createElement('div');
        item.className = 'autocomplete-item';
        if (index === 0) item.classList.add('highlighted');
        item.textContent = cmd;
        
        item.addEventListener('click', () => {
            selectAutocompleteSuggestion(cmd);
        });
        
        item.addEventListener('mouseenter', () => {
            autocompleteIndex = index;
            updateAutocompleteHighlight();
        });
        
        autocompleteDiv.appendChild(item);
    });
    
    autocompleteDiv.style.display = 'block';
}

function updateAutocompleteHighlight() {
    const autocompleteDiv = document.getElementById('commandAutocomplete');
    if (!autocompleteDiv) return;
    
    const items = autocompleteDiv.querySelectorAll('.autocomplete-item');
    items.forEach((item, index) => {
        if (index === autocompleteIndex) {
            item.classList.add('highlighted');
            item.scrollIntoView({ block: 'nearest' });
        } else {
            item.classList.remove('highlighted');
        }
    });
}

function selectAutocompleteSuggestion(command) {
    const commandInput = document.getElementById('commandInput');
    if (commandInput) {
        commandInput.value = command;
        commandInput.focus();
    }
    hideAutocomplete();
}

function hideAutocomplete() {
    const autocompleteDiv = document.getElementById('commandAutocomplete');
    if (autocompleteDiv) {
        autocompleteDiv.style.display = 'none';
        autocompleteDiv.innerHTML = '';
    }
    autocompleteIndex = -1;
    autocompleteSuggestions = [];
}

// Initialize autocomplete on page load
document.addEventListener('DOMContentLoaded', initCommandAutocomplete);
