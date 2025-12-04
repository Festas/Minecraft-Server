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
            showNotification(data.error || 'Command failed', 'error');
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
