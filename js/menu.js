/* Menu Management */

// Settings management
const settings = {
    masterVolume: parseInt(localStorage.getItem('masterVolume') || '70'),
    musicVolume: parseInt(localStorage.getItem('musicVolume') || '60'),
    sfxVolume: parseInt(localStorage.getItem('sfxVolume') || '80'),
    musicEnabled: localStorage.getItem('musicEnabled') !== 'false'
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
                document.getElementById('joinRoomName').value = roomName;
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
    const createRoomBtn = document.getElementById('createRoomBtn');
    const joinRoomBtn = document.getElementById('joinRoomBtn');
    const settingsBtn = document.getElementById('settingsBtn');
    
    const createRoomPanel = document.getElementById('createRoomPanel');
    const joinRoomPanel = document.getElementById('joinRoomPanel');
    const settingsPanel = document.getElementById('settingsPanel');
    
    const confirmCreateBtn = document.getElementById('confirmCreateBtn');
    const cancelCreateBtn = document.getElementById('cancelCreateBtn');
    const confirmJoinBtn = document.getElementById('confirmJoinBtn');
    const cancelJoinBtn = document.getElementById('cancelJoinBtn');
    const applySettingsBtn = document.getElementById('applySettingsBtn');
    const closeSettingsBtn = document.getElementById('closeSettingsBtn');
    
    const createRoomNameInput = document.getElementById('createRoomName');
    const joinRoomNameInput = document.getElementById('joinRoomName');
    
    // Update recent rooms list
    updateRecentRoomsList();
    
    // Initialize settings UI
    function initSettings() {
        const masterVolumeSlider = document.getElementById('masterVolume');
        const musicVolumeSlider = document.getElementById('musicVolume');
        const sfxVolumeSlider = document.getElementById('sfxVolume');
        const musicToggle = document.getElementById('musicToggle');
        const volumeValue = document.getElementById('volumeValue');
        const musicVolumeValue = document.getElementById('musicVolumeValue');
        const sfxVolumeValue = document.getElementById('sfxVolumeValue');
        
        masterVolumeSlider.value = settings.masterVolume;
        musicVolumeSlider.value = settings.musicVolume;
        sfxVolumeSlider.value = settings.sfxVolume;
        volumeValue.textContent = settings.masterVolume + '%';
        musicVolumeValue.textContent = settings.musicVolume + '%';
        sfxVolumeValue.textContent = settings.sfxVolume + '%';
        
        if (settings.musicEnabled) {
            musicToggle.classList.add('on');
        } else {
            musicToggle.classList.remove('on');
        }
        
        updateBgMusicVolume();
    }
    
    // Update background music volume
    function updateBgMusicVolume() {
        const masterVolumeSlider = document.getElementById('masterVolume');
        const musicVolumeSlider = document.getElementById('musicVolume');
        const masterVol = parseInt(masterVolumeSlider.value) / 100;
        const musicVol = parseInt(musicVolumeSlider.value) / 100;
        const targetVolume = masterVol * musicVol;
        
        // Update both theme and battle music volumes
        if (bgMusic) {
            bgMusic.volume = targetVolume;
        }
        const battleMusic = document.getElementById('battleMusic');
        if (battleMusic && !battleMusic.paused) {
            battleMusic.volume = targetVolume;
        }
    }
    
    // Volume sliders
    document.getElementById('masterVolume').addEventListener('input', (e) => {
        document.getElementById('volumeValue').textContent = e.target.value + '%';
        updateBgMusicVolume();
    });
    
    document.getElementById('musicVolume').addEventListener('input', (e) => {
        document.getElementById('musicVolumeValue').textContent = e.target.value + '%';
        updateBgMusicVolume();
    });
    
    document.getElementById('sfxVolume').addEventListener('input', (e) => {
        document.getElementById('sfxVolumeValue').textContent = e.target.value + '%';
    });
    
    // Toggle switches
    document.getElementById('musicToggle').addEventListener('click', function() {
        this.classList.toggle('on');
    });
    
    // Button handlers
    playBtn.addEventListener('click', () => {
        // Quick match - generate random room name
        const randomRoom = 'match' + Math.random().toString(36).substr(2, 6);
        startGame(randomRoom);
    });
    
    createRoomBtn.addEventListener('click', () => {
        createRoomPanel.classList.add('active');
        createRoomNameInput.focus();
    });
    
    joinRoomBtn.addEventListener('click', () => {
        joinRoomPanel.classList.add('active');
        updateRecentRoomsList();
        joinRoomNameInput.focus();
    });
    
    settingsBtn.addEventListener('click', () => {
        settingsPanel.classList.add('active');
    });
    
    // Panel close handlers
    cancelCreateBtn.addEventListener('click', () => {
        createRoomPanel.classList.remove('active');
        createRoomNameInput.value = '';
    });
    
    cancelJoinBtn.addEventListener('click', () => {
        joinRoomPanel.classList.remove('active');
        joinRoomNameInput.value = '';
    });
    
    closeSettingsBtn.addEventListener('click', () => {
        settingsPanel.classList.remove('active');
    });
    
    // Confirm handlers
    confirmCreateBtn.addEventListener('click', () => {
        const roomName = createRoomNameInput.value.trim();
        if (roomName) {
            addRecentRoom(roomName);
            startGame(roomName);
        }
    });
    
    confirmJoinBtn.addEventListener('click', () => {
        const roomName = joinRoomNameInput.value.trim();
        if (roomName) {
            addRecentRoom(roomName);
            startGame(roomName);
        }
    });
    
    // Enter key handlers
    createRoomNameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            confirmCreateBtn.click();
        }
    });
    
    joinRoomNameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            confirmJoinBtn.click();
        }
    });
    
    // Apply settings
    applySettingsBtn.addEventListener('click', () => {
        const masterVolumeSlider = document.getElementById('masterVolume');
        const musicVolumeSlider = document.getElementById('musicVolume');
        const sfxVolumeSlider = document.getElementById('sfxVolume');
        const musicToggle = document.getElementById('musicToggle');
        
        settings.masterVolume = parseInt(masterVolumeSlider.value);
        settings.musicVolume = parseInt(musicVolumeSlider.value);
        settings.sfxVolume = parseInt(sfxVolumeSlider.value);
        settings.musicEnabled = musicToggle.classList.contains('on');
        
        localStorage.setItem('masterVolume', settings.masterVolume);
        localStorage.setItem('musicVolume', settings.musicVolume);
        localStorage.setItem('sfxVolume', settings.sfxVolume);
        localStorage.setItem('musicEnabled', settings.musicEnabled);
        
        updateBgMusicVolume();
        if (settings.musicEnabled && bgMusic.paused) {
            bgMusic.play().catch(() => {});
        } else if (!settings.musicEnabled && !bgMusic.paused) {
            bgMusic.pause();
        }
        
        settingsPanel.classList.remove('active');
    });
    
    // Start game function
    function startGame(roomName) {
        menuScreen.classList.add('hidden');
        gameScreen.style.display = 'block';
        
        // Update room name display
        document.getElementById('currentRoomName').textContent = roomName;
        
        // Switch to battle music
        const bgMusic = document.getElementById('bgMusic');
        const battleMusic = document.getElementById('battleMusic');
        
        if (bgMusic && battleMusic && settings.musicEnabled) {
            // Fade out theme music
            const fadeOut = setInterval(() => {
                if (bgMusic.volume > 0.1) {
                    bgMusic.volume -= 0.1;
                } else {
                    bgMusic.volume = 0;
                    bgMusic.pause();
                    clearInterval(fadeOut);
                    
                    // Start battle music with fade in
                    battleMusic.volume = 0;
                    battleMusic.currentTime = 0;
                    battleMusic.play().catch(() => {});
                    
                    const fadeIn = setInterval(() => {
                        const masterVol = parseInt(document.getElementById('masterVolume').value) / 100;
                        const musicVol = parseInt(document.getElementById('musicVolume').value) / 100;
                        const targetVolume = masterVol * musicVol;
                        
                        if (battleMusic.volume < targetVolume) {
                            battleMusic.volume = Math.min(battleMusic.volume + 0.1, targetVolume);
                        } else {
                            clearInterval(fadeIn);
                        }
                    }, 50);
                }
            }, 50);
        } else if (battleMusic && settings.musicEnabled) {
            // Direct switch if fade not needed
            const masterVol = parseInt(document.getElementById('masterVolume').value) / 100;
            const musicVol = parseInt(document.getElementById('musicVolume').value) / 100;
            battleMusic.volume = masterVol * musicVol;
            battleMusic.currentTime = 0;
            battleMusic.play().catch(() => {});
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
                
                if (battleMusic && bgMusic && settings.musicEnabled) {
                    // Fade out battle music
                    const fadeOut = setInterval(() => {
                        if (battleMusic.volume > 0.1) {
                            battleMusic.volume -= 0.1;
                        } else {
                            battleMusic.volume = 0;
                            battleMusic.pause();
                            clearInterval(fadeOut);
                            
                            // Resume theme music with fade in
                            const masterVol = parseInt(document.getElementById('masterVolume').value) / 100;
                            const musicVol = parseInt(document.getElementById('musicVolume').value) / 100;
                            bgMusic.volume = 0;
                            bgMusic.currentTime = 0;
                            bgMusic.play().catch(() => {});
                            
                            const fadeIn = setInterval(() => {
                                const targetVolume = masterVol * musicVol;
                                if (bgMusic.volume < targetVolume) {
                                    bgMusic.volume = Math.min(bgMusic.volume + 0.1, targetVolume);
                                } else {
                                    clearInterval(fadeIn);
                                }
                            }, 50);
                        }
                    }, 50);
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
        if (settings.musicEnabled) {
            bgMusic.play().catch(() => {});
        }
    }
    
    // Initialize on first interaction
    document.addEventListener('click', startMusic, { once: true });
    document.addEventListener('keydown', startMusic, { once: true });
    
    // Initialize settings
    initSettings();
});

