/* Developer Console */

import { POWERUP_TYPES } from './config.js';

let consoleElement = null;
let consoleInput = null;
let consoleHistory = [];
let historyIndex = -1;

export function initConsole() {
    // Use existing console HTML or create it
    consoleElement = document.getElementById('devConsole');
    if (!consoleElement) {
        // Create console HTML if it doesn't exist
        const consoleDiv = document.createElement('div');
        consoleDiv.id = 'devConsole';
        consoleDiv.className = 'dev-console hidden';
        consoleDiv.innerHTML = `
            <div class="console-header">
                <span>Developer Console</span>
                <button class="console-close" onclick="window.closeConsole()">×</button>
            </div>
            <div class="console-output" id="consoleOutput"></div>
            <div class="console-input-wrapper">
                <span class="console-prompt">></span>
                <input type="text" id="consoleInput" class="console-input" autocomplete="off" spellcheck="false">
            </div>
        `;
        document.body.appendChild(consoleDiv);
        consoleElement = consoleDiv;
    }
    
    consoleInput = document.getElementById('consoleInput');
    const outputDiv = document.getElementById('consoleOutput');
    
    // Handle input
    consoleInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const command = consoleInput.value.trim();
            if (command) {
                executeCommand(command);
                consoleHistory.push(command);
                historyIndex = consoleHistory.length;
                consoleInput.value = '';
            }
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (historyIndex > 0) {
                historyIndex--;
                consoleInput.value = consoleHistory[historyIndex];
            }
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (historyIndex < consoleHistory.length - 1) {
                historyIndex++;
                consoleInput.value = consoleHistory[historyIndex];
            } else {
                historyIndex = consoleHistory.length;
                consoleInput.value = '';
            }
        } else if (e.key === 'Escape') {
            closeConsole();
        }
    });
    
    // Focus input when console opens
    consoleInput.addEventListener('focus', () => {
        consoleInput.focus();
    });
}

export function toggleConsole() {
    if (!consoleElement) return;
    
    if (consoleElement.classList.contains('hidden')) {
        openConsole();
    } else {
        closeConsole();
    }
}

export function openConsole() {
    if (!consoleElement || !consoleInput) return;
    consoleElement.classList.remove('hidden');
    consoleInput.focus();
    // Prevent game input while console is open
    if (window.gameState) {
        window.gameState.consoleOpen = true;
    }
}

export function closeConsole() {
    if (!consoleElement) return;
    consoleElement.classList.add('hidden');
    // Re-enable game input
    if (window.gameState) {
        window.gameState.consoleOpen = false;
    }
}

function executeCommand(command) {
    const outputDiv = document.getElementById('consoleOutput');
    if (!outputDiv) return;
    
    // Add command to output
    addOutput(`> ${command}`, 'command');
    
    const parts = command.trim().split(/\s+/);
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1);
    
    try {
        switch (cmd) {
            case 'givepowerup':
            case 'give': {
                if (args.length < 1) {
                    addOutput('Usage: givepowerup <powerupName> [playerId]', 'error');
                    break;
                }
                
                const powerupName = args[0];
                const playerId = args.length > 1 ? args[1] : (window.gameState?.myId || null);
                
                // Find powerup by name - try exact match first, then partial match
                let powerupKey = null;
                const searchName = powerupName.toLowerCase();
                
                // First, try matching by power-up key (case-insensitive)
                for (const key in POWERUP_TYPES) {
                    if (key.toLowerCase() === searchName) {
                        powerupKey = key;
                        break;
                    }
                }
                
                // Second, try exact match on display name (case-insensitive)
                if (!powerupKey) {
                    for (const key in POWERUP_TYPES) {
                        if (POWERUP_TYPES[key].name.toLowerCase() === searchName) {
                            powerupKey = key;
                            break;
                        }
                    }
                }
                
                // If no exact match, try partial/fuzzy matching
                if (!powerupKey) {
                    const matches = [];
                    for (const key in POWERUP_TYPES) {
                        const powerupNameLower = POWERUP_TYPES[key].name.toLowerCase();
                        const keyLower = key.toLowerCase();
                        // Check if search term is contained in power-up name or key
                        if (powerupNameLower.includes(searchName) || 
                            searchName.includes(powerupNameLower.split(' ')[0]) ||
                            keyLower.includes(searchName) ||
                            searchName.includes(keyLower)) {
                            matches.push({ key, name: POWERUP_TYPES[key].name });
                        }
                    }
                    
                    // If exactly one match, use it; otherwise show matches
                    if (matches.length === 1) {
                        powerupKey = matches[0].key;
                        addOutput(`Matched: ${matches[0].name}`, 'info');
                    } else if (matches.length > 1) {
                        addOutput(`Multiple matches found for "${powerupName}":`, 'info');
                        matches.forEach(m => addOutput(`  - ${m.name} (key: ${m.key})`, 'info'));
                        addOutput('Please be more specific.', 'error');
                        break;
                    }
                }
                
                if (!powerupKey) {
                    addOutput(`Power-up "${powerupName}" not found.`, 'error');
                    // Show suggestions based on first word
                    const firstWord = searchName.split(' ')[0];
                    const suggestions = [];
                    for (const key in POWERUP_TYPES) {
                        const powerupNameLower = POWERUP_TYPES[key].name.toLowerCase();
                        if (powerupNameLower.includes(firstWord)) {
                            suggestions.push(POWERUP_TYPES[key].name);
                        }
                    }
                    if (suggestions.length > 0 && suggestions.length <= 10) {
                        addOutput('Suggestions: ' + suggestions.join(', '), 'info');
                    } else {
                        addOutput('Type "help" to see all commands. Available power-ups: ' + Object.keys(POWERUP_TYPES).join(', '), 'info');
                    }
                    break;
                }
                
                if (!window.gameState || !window.gameState.players) {
                    addOutput('Game not initialized or no players found.', 'error');
                    break;
                }
                
                if (playerId && !window.gameState.players[playerId]) {
                    addOutput(`Player "${playerId}" not found.`, 'error');
                    break;
                }
                
                const targetId = playerId || window.gameState.myId;
                if (!targetId) {
                    addOutput('No player ID specified and no local player found.', 'error');
                    break;
                }
                
                // Apply power-up
                if (window.applyPickupFunction) {
                    window.applyPickupFunction(window.gameState.players, targetId, powerupKey, window.gameState.myId);
                    addOutput(`Gave ${POWERUP_TYPES[powerupKey].name} to player ${targetId}`, 'success');
                } else {
                    addOutput('applyPickup function not available.', 'error');
                }
                break;
            }
            
            case 'help':
            case '?': {
                addOutput('Available commands:', 'info');
                addOutput('  givepowerup <name> [playerId] - Give a power-up to a player', 'info');
                addOutput('  help - Show this help message', 'info');
                addOutput('  clear - Clear console output', 'info');
                break;
            }
            
            case 'clear': {
                outputDiv.innerHTML = '';
                break;
            }
            
            default: {
                addOutput(`Unknown command: ${cmd}. Type 'help' for available commands.`, 'error');
            }
        }
    } catch (error) {
        addOutput(`Error executing command: ${error.message}`, 'error');
        console.error('Console command error:', error);
    }
}

function addOutput(text, type = 'normal') {
    const outputDiv = document.getElementById('consoleOutput');
    if (!outputDiv) return;
    
    const line = document.createElement('div');
    line.className = `console-line console-${type}`;
    line.textContent = text;
    outputDiv.appendChild(line);
    outputDiv.scrollTop = outputDiv.scrollHeight;
}

// Make functions available globally for HTML onclick
window.toggleConsole = toggleConsole;
window.openConsole = openConsole;
window.closeConsole = closeConsole;

