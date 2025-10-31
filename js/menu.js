/* Menu Management */

// Settings management
const settings = {
    musicVolume: parseInt(localStorage.getItem('musicVolume') || '60'),
    sfxVolume: parseInt(localStorage.getItem('sfxVolume') || '80'),
    // Keybinds
    keybindMoveLeft: localStorage.getItem('keybindMoveLeft') || 'a',
    keybindMoveRight: localStorage.getItem('keybindMoveRight') || 'd',
    keybindJump: localStorage.getItem('keybindJump') || ' ',
    keybindCrouch: localStorage.getItem('keybindCrouch') || 'control',
    keybindClimb: localStorage.getItem('keybindClimb') || 'w',
    // Particle settings
    enableParticles: localStorage.getItem('enableParticles') !== 'false', // Default to true
    maxParticles: parseInt(localStorage.getItem('maxParticles') || '50'),
    particleDuration: parseFloat(localStorage.getItem('particleDuration') || '3.0')
};

// Recent rooms management
function getRecentRooms() {
    const rooms = localStorage.getItem('recentRooms');
    return rooms ? JSON.parse(rooms) : [];
}

function addRecentRoom(roomName) {
    const rooms = getRecentRooms();
    // Remove if already exists
    const index = rooms.indexOf(roomName);
    if (index > -1) {
        rooms.splice(index, 1);
    }
    // Add to front
    rooms.unshift(roomName);
    // Keep only last 10
    if (rooms.length > 10) {
        rooms.pop();
    }
    localStorage.setItem('recentRooms', JSON.stringify(rooms));
}

function updateRecentRoomsList() {
    const list = document.getElementById('recentRoomsList');
    if (!list) return; // Element doesn't exist, skip
    
    const rooms = getRecentRooms();
    
    list.innerHTML = '';
    
    if (rooms.length === 0) {
        const item = document.createElement('div');
        item.className = 'room-item empty';
        item.textContent = 'No recent rooms';
        list.appendChild(item);
    } else {
        rooms.forEach(roomName => {
            const item = document.createElement('div');
            item.className = 'room-item';
            item.textContent = `> ${roomName}`;
            item.addEventListener('click', () => {
                const joinRoomInput = document.getElementById('joinRoomName');
                if (joinRoomInput) {
                    joinRoomInput.value = roomName;
                }
            });
            list.appendChild(item);
        });
    }
}

// Initialize menu when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const menuScreen = document.getElementById('menuScreen');
    const gameScreen = document.getElementById('gameScreen');
    const bgMusic = document.getElementById('bgMusic');
    
    const playBtn = document.getElementById('playBtn');
    const joinRoomBtn = document.getElementById('joinRoomBtn');
    const settingsBtn = document.getElementById('settingsBtn');
    
    const settingsPanel = document.getElementById('settingsPanel');
    const applySettingsBtn = document.getElementById('applySettingsBtn');
    const closeSettingsBtn = document.getElementById('closeSettingsBtn');
    
    const joinRoomNameInput = document.getElementById('joinRoomName');
    const playerNameInput = document.getElementById('playerNameInput');
    
    // Convert player name input to uppercase as user types
    if (playerNameInput) {
        playerNameInput.addEventListener('input', (e) => {
            e.target.value = e.target.value.toUpperCase();
        });
    }
    
    // Convert room name input to uppercase as user types
    if (joinRoomNameInput) {
        joinRoomNameInput.addEventListener('input', (e) => {
            e.target.value = e.target.value.toUpperCase();
        });
    }
    
    // Update recent rooms list (if element exists)
    updateRecentRoomsList();
    
    // Initialize settings UI
    function initSettings() {
        const musicVolumeSlider = document.getElementById('musicVolume');
        const sfxVolumeSlider = document.getElementById('sfxVolume');
        const musicVolumeValue = document.getElementById('musicVolumeValue');
        const sfxVolumeValue = document.getElementById('sfxVolumeValue');
        
        musicVolumeSlider.value = settings.musicVolume;
        sfxVolumeSlider.value = settings.sfxVolume;
        musicVolumeValue.textContent = settings.musicVolume + '%';
        sfxVolumeValue.textContent = settings.sfxVolume + '%';
        
        // Initialize keybinds
        const keybindMoveLeft = document.getElementById('keybindMoveLeft');
        const keybindMoveRight = document.getElementById('keybindMoveRight');
        const keybindJump = document.getElementById('keybindJump');
        const keybindCrouch = document.getElementById('keybindCrouch');
        const keybindClimb = document.getElementById('keybindClimb');
        
        keybindMoveLeft.value = settings.keybindMoveLeft === ' ' ? 'Space' : settings.keybindMoveLeft.toUpperCase();
        keybindMoveRight.value = settings.keybindMoveRight === ' ' ? 'Space' : settings.keybindMoveRight.toUpperCase();
        keybindJump.value = settings.keybindJump === ' ' ? 'Space' : settings.keybindJump.toUpperCase();
        keybindCrouch.value = settings.keybindCrouch === 'control' ? 'Ctrl' : settings.keybindCrouch.toUpperCase();
        keybindClimb.value = settings.keybindClimb === ' ' ? 'Space' : settings.keybindClimb.toUpperCase();
        
        // Initialize particle settings
        const enableParticlesToggle = document.getElementById('enableParticlesToggle');
        const maxParticlesSlider = document.getElementById('maxParticles');
        const maxParticlesValue = document.getElementById('maxParticlesValue');
        const particleDurationSlider = document.getElementById('particleDuration');
        const particleDurationValue = document.getElementById('particleDurationValue');
        
        maxParticlesSlider.value = settings.maxParticles;
        maxParticlesValue.textContent = settings.maxParticles;
        particleDurationSlider.value = settings.particleDuration;
        particleDurationValue.textContent = settings.particleDuration.toFixed(1) + 'x';
        
        // Particles enabled by default
        if (settings.enableParticles) {
            enableParticlesToggle.classList.add('on');
        } else {
            enableParticlesToggle.classList.remove('on');
        }
        
        updateBgMusicVolume();
        updateSFXVolume();
    }
    
    // Keybind input handler
    function setupKeybindInput(inputId, settingKey) {
        const input = document.getElementById(inputId);
        let isListening = false;
        
        input.addEventListener('click', () => {
            if (!isListening) {
                isListening = true;
                input.value = 'Press key...';
                input.style.background = '#ff4444';
                
                const keyHandler = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    let keyValue = '';
                    if (e.key === ' ') {
                        keyValue = ' ';
                        input.value = 'Space';
                    } else if (e.key === 'Control' || e.ctrlKey) {
                        keyValue = 'control';
                        input.value = 'Ctrl';
                    } else if (e.key.length === 1) {
                        keyValue = e.key.toLowerCase();
                        input.value = e.key.toUpperCase();
                    } else if (e.key.toLowerCase().startsWith('arrow')) {
                        keyValue = e.key.toLowerCase();
                        input.value = e.key.replace('Arrow', '→');
                    } else {
                        keyValue = e.key.toLowerCase();
                        input.value = e.key;
                    }
                    
                    settings[settingKey] = keyValue;
                    input.style.background = '';
                    isListening = false;
                    
                    window.removeEventListener('keydown', keyHandler);
                };
                
                window.addEventListener('keydown', keyHandler, { once: true });
            }
        });
    }
    
    // Update background music volume
    function updateBgMusicVolume() {
        const musicVolumeSlider = document.getElementById('musicVolume');
        const musicVol = parseInt(musicVolumeSlider.value) / 100;
        
        // Update all music volumes
        if (bgMusic) {
            bgMusic.volume = musicVol;
        }
        const battleMusic = document.getElementById('battleMusic');
        if (battleMusic && !battleMusic.paused) {
            battleMusic.volume = musicVol;
        }
        const cloudsMusic = document.getElementById('cloudsMusic');
        if (cloudsMusic && !cloudsMusic.paused) {
            cloudsMusic.volume = musicVol;
        }
        const spaceMusic = document.getElementById('spaceMusic');
        if (spaceMusic && !spaceMusic.paused) {
            spaceMusic.volume = musicVol;
        }
        const lavaMusic = document.getElementById('lavaMusic');
        if (lavaMusic && !lavaMusic.paused) {
            lavaMusic.volume = musicVol;
        }
    }
    
    // Update SFX volume
    function updateSFXVolume() {
        const sfxVolumeSlider = document.getElementById('sfxVolume');
        const sfxVol = parseInt(sfxVolumeSlider.value) / 100;
        
        // Update SFX volume in audio module
        if (window.updateSFXVolume) {
            window.updateSFXVolume(sfxVol);
        }
    }
    
    // Volume sliders
    document.getElementById('musicVolume').addEventListener('input', (e) => {
        document.getElementById('musicVolumeValue').textContent = e.target.value + '%';
        updateBgMusicVolume();
    });
    
    document.getElementById('sfxVolume').addEventListener('input', (e) => {
        document.getElementById('sfxVolumeValue').textContent = e.target.value + '%';
        updateSFXVolume();
    });
    
    // Toggle switches
    document.getElementById('enableParticlesToggle').addEventListener('click', function() {
        this.classList.toggle('on');
    });
    
    // Max particles slider
    document.getElementById('maxParticles').addEventListener('input', (e) => {
        document.getElementById('maxParticlesValue').textContent = e.target.value;
    });
    
    // Particle duration slider
    document.getElementById('particleDuration').addEventListener('input', (e) => {
        document.getElementById('particleDurationValue').textContent = parseFloat(e.target.value).toFixed(1) + 'x';
    });
    
    // Setup keybind inputs
    setupKeybindInput('keybindMoveLeft', 'keybindMoveLeft');
    setupKeybindInput('keybindMoveRight', 'keybindMoveRight');
    setupKeybindInput('keybindJump', 'keybindJump');
    setupKeybindInput('keybindCrouch', 'keybindCrouch');
    setupKeybindInput('keybindClimb', 'keybindClimb');
    
    // Button handlers
    playBtn.addEventListener('click', () => {
        // Join any match - generate random room name
        const randomRoom = 'match' + Math.random().toString(36).substr(2, 6);
        startGame(randomRoom);
    });
    
    joinRoomBtn.addEventListener('click', () => {
        const roomName = joinRoomNameInput.value.trim();
        if (roomName) {
            addRecentRoom(roomName);
            startGame(roomName);
        }
    });
    
    // Allow Enter key to join room
    if (joinRoomNameInput) {
        joinRoomNameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                joinRoomBtn.click();
            }
        });
    }
    
    settingsBtn.addEventListener('click', () => {
        settingsPanel.classList.add('active');
    });
    
    closeSettingsBtn.addEventListener('click', () => {
        settingsPanel.classList.remove('active');
    });
    
    // Apply settings
    applySettingsBtn.addEventListener('click', () => {
        const musicVolumeSlider = document.getElementById('musicVolume');
        const sfxVolumeSlider = document.getElementById('sfxVolume');
        const enableParticlesToggle = document.getElementById('enableParticlesToggle');
        const maxParticlesSlider = document.getElementById('maxParticles');
        const particleDurationSlider = document.getElementById('particleDuration');
        
        settings.musicVolume = parseInt(musicVolumeSlider.value);
        settings.sfxVolume = parseInt(sfxVolumeSlider.value);
        settings.enableParticles = enableParticlesToggle.classList.contains('on');
        settings.maxParticles = parseInt(maxParticlesSlider.value);
        settings.particleDuration = parseFloat(particleDurationSlider.value);
        
        localStorage.setItem('musicVolume', settings.musicVolume);
        localStorage.setItem('sfxVolume', settings.sfxVolume);
        localStorage.setItem('keybindMoveLeft', settings.keybindMoveLeft);
        localStorage.setItem('keybindMoveRight', settings.keybindMoveRight);
        localStorage.setItem('keybindJump', settings.keybindJump);
        localStorage.setItem('keybindCrouch', settings.keybindCrouch);
        localStorage.setItem('keybindClimb', settings.keybindClimb);
        localStorage.setItem('enableParticles', settings.enableParticles);
        localStorage.setItem('maxParticles', settings.maxParticles);
        localStorage.setItem('particleDuration', settings.particleDuration);
        
        // Update global settings for game to use
        if (window.gameSettings) {
            window.gameSettings = settings;
        }
        
        // Update KEYBINDS and PARTICLE_SETTINGS in config
        if (window.updateGameConfig) {
            window.updateGameConfig();
        }
        
        updateBgMusicVolume();
        updateSFXVolume();
        
        // Always play music if enabled (no toggle anymore)
        if (bgMusic && bgMusic.paused) {
            bgMusic.play().catch(() => {});
        }
        
        settingsPanel.classList.remove('active');
    });
    
    // Expose settings globally
    window.gameSettings = settings;
    
    // Load settings into config on startup
    if (window.updateGameConfig) {
        window.updateGameConfig();
    }
    
    // Start game function
    function startGame(roomName) {
        menuScreen.classList.add('hidden');
        gameScreen.style.display = 'block';
        
        // Update room name display
        document.getElementById('currentRoomName').textContent = roomName;
        
        // Detect theme from room name to determine which music to play
        const roomLower = roomName.toLowerCase();
        let theme = 'default';
        if (roomLower.includes('clouds')) {
            theme = 'clouds';
        } else if (roomLower.includes('volcano') || roomLower.includes('lava') || roomLower.includes('fire')) {
            theme = 'volcano';
        } else if (roomLower.includes('space') || roomLower.includes('cosmic') || roomLower.includes('stars')) {
            theme = 'space';
        }
        
        // Switch to appropriate battle music based on theme
        const bgMusic = document.getElementById('bgMusic');
        const battleMusic = document.getElementById('battleMusic');
        const cloudsMusic = document.getElementById('cloudsMusic');
        const spaceMusic = document.getElementById('spaceMusic');
        const lavaMusic = document.getElementById('lavaMusic');
        
        if (bgMusic) {
            // Stop and pause background music immediately
            bgMusic.pause();
            bgMusic.currentTime = 0;
            bgMusic.volume = 0;
        }
        
        // Stop all game music tracks first
        if (battleMusic) {
            battleMusic.pause();
            battleMusic.currentTime = 0;
            battleMusic.volume = 0;
        }
        if (cloudsMusic) {
            cloudsMusic.pause();
            cloudsMusic.currentTime = 0;
            cloudsMusic.volume = 0;
        }
        if (spaceMusic) {
            spaceMusic.pause();
            spaceMusic.currentTime = 0;
            spaceMusic.volume = 0;
        }
        if (lavaMusic) {
            lavaMusic.pause();
            lavaMusic.currentTime = 0;
            lavaMusic.volume = 0;
        }
        
        // Start appropriate music based on theme
        const musicVol = parseInt(document.getElementById('musicVolume').value) / 100;
        let musicToPlay = battleMusic;
        if (theme === 'clouds') {
            musicToPlay = cloudsMusic;
        } else if (theme === 'space') {
            musicToPlay = spaceMusic;
        } else if (theme === 'volcano') {
            musicToPlay = lavaMusic;
        }
        
        if (musicToPlay) {
            musicToPlay.volume = musicVol;
            musicToPlay.currentTime = 0;
            musicToPlay.play().catch(() => {});
        }
        
        // Start the game with room name
        if (window.startGameWithRoom) {
            window.startGameWithRoom(roomName);
        }
    }
    
    // Expose startGame function globally
    window.startGameWithRoom = function(roomName) {
        // This will be called from main.js
        if (window.initializeGame) {
            window.initializeGame(roomName);
        }
    };
    
    // Leave game button (in game screen)
    const leaveGameBtn = document.getElementById('leaveGameBtn');
    if (leaveGameBtn) {
        leaveGameBtn.addEventListener('click', () => {
            if (confirm('Leave current game?')) {
                // Switch back to theme music
                const bgMusic = document.getElementById('bgMusic');
                const battleMusic = document.getElementById('battleMusic');
                const cloudsMusic = document.getElementById('cloudsMusic');
                const spaceMusic = document.getElementById('spaceMusic');
                const lavaMusic = document.getElementById('lavaMusic');
                
                // Stop all game music tracks
                if (battleMusic) {
                    battleMusic.pause();
                    battleMusic.currentTime = 0;
                    battleMusic.volume = 0;
                }
                if (cloudsMusic) {
                    cloudsMusic.pause();
                    cloudsMusic.currentTime = 0;
                    cloudsMusic.volume = 0;
                }
                if (spaceMusic) {
                    spaceMusic.pause();
                    spaceMusic.currentTime = 0;
                    spaceMusic.volume = 0;
                }
                if (lavaMusic) {
                    lavaMusic.pause();
                    lavaMusic.currentTime = 0;
                    lavaMusic.volume = 0;
                }
                
                // Resume theme music
                if (bgMusic) {
                    const musicVol = parseInt(document.getElementById('musicVolume').value) / 100;
                    bgMusic.volume = musicVol;
                    bgMusic.currentTime = 0;
                    bgMusic.play().catch(() => {});
                }
                
                // Reset game state
                if (window.resetGame) {
                    window.resetGame();
                }
                gameScreen.style.display = 'none';
                menuScreen.classList.remove('hidden');
                // Reload to reset everything
                location.reload();
            }
        });
    }
    
    // Start background music
    function startMusic() {
        bgMusic.play().catch(() => {});
    }
    
    // Initialize on first interaction
    document.addEventListener('click', startMusic, { once: true });
    document.addEventListener('keydown', startMusic, { once: true });
    
    // Initialize settings
    initSettings();
});

