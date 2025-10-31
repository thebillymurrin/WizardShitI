/* Networking and Multiplayer */

import { sanitize, initSeededRandom } from './utils.js';
import { buildLevel } from './physics.js';
import { addPlayer, findSafeSpawnLocation } from './player.js';
import { COLLISION_FILTERS, PLAYER_CFG, PR, POWERUP_TYPES, POWERUP_CATEGORY } from './config.js';

export function startNetworking(roomName, world, players, ui, info, pc, gameState, levelBuiltRef, levelSeedRef, seededRandomRef, isHostRef, schedulePickupSpawns) {
    // Wait for Trystero to load
    if (!window.trystero) {
        setTimeout(() => startNetworking(roomName, world, players, ui, info, pc, gameState, levelBuiltRef, levelSeedRef, seededRandomRef, isHostRef, schedulePickupSpawns), 100);
        return;
    }
    
    const safe = sanitize(roomName);
    console.log(`Room name: "${roomName}" → sanitized: "${safe}"`);
    
    // Use room name as seed for deterministic level generation
    // Improved hash function for better seed distribution
    let seed = 0;
    for (let i = 0; i < safe.length; i++) {
        const char = safe.charCodeAt(i);
        seed = ((seed << 5) - seed) + char;
        // Mix bits for better distribution
        seed = seed + (seed << 15);
        seed = seed ^ (seed >> 7);
    }
    // Add room name length to ensure different lengths produce different seeds
    seed = Math.abs(seed) + (safe.length * 73856093);
    seed = seed || 1; // Ensure seed is never 0
    
    // Rebuild level if seed changed
    if (levelSeedRef.current !== seed) {
        // Clear ALL bodies from world (including players, orbs, pickups, etc.)
        const allBodies = [...world.bodies];
        allBodies.forEach(body => Matter.World.remove(world, body));
        
        // Clear players array
        const playerIds = Object.keys(players);
        playerIds.forEach(id => {
            delete players[id];
        });
        
        // Detect theme from room name (case-insensitive)
        let theme = 'default';
        const roomLower = safe.toLowerCase();
        if (roomLower.includes('clouds')) {
            theme = 'clouds';
        } else if (roomLower.includes('volcano') || roomLower.includes('lava') || roomLower.includes('fire')) {
            theme = 'volcano';
        } else if (roomLower.includes('space') || roomLower.includes('cosmic') || roomLower.includes('stars')) {
            theme = 'space';
        }
        
        // Reset seed and build level
        levelSeedRef.current = seed;
        seededRandomRef.current = initSeededRandom(seed);
        buildLevel(world, seededRandomRef.current, theme);
        levelBuiltRef.current = true;
        
        // Store theme in gameState for graphics to use
        gameState.theme = theme;
    }
    
    // Join room with Trystero
    // Note: Trystero uses Firebase for signaling by default, which should work over the internet
    // If multiplayer only works locally, check:
    // 1. Firewall settings (allow WebRTC ports UDP 3478, 5349, 49152-65535)
    // 2. NAT type (strict NAT may prevent connections)
    // 3. Browser console for WebRTC connection errors
    try {
        gameState.room = window.trystero.joinRoom({ appId: 'wizard-game' }, safe);
        gameState.myId = Math.random().toString(36).substr(2, 9);
        
        console.log(`✓ Joining room: ${safe}`);
        console.log(`✓ My ID: ${gameState.myId}`);
        
        // Log room info for debugging
        if (gameState.room) {
            console.log('✓ Room created successfully');
        }
    } catch (error) {
        console.error('✗ Failed to join room:', error);
        alert('Failed to connect to multiplayer room. Check console for details.');
        return;
    }
    
    // Setup message channels (names must be ≤12 bytes)
    const [sendState, receiveState] = gameState.room.makeAction('state');
    const [sendOrb, receiveOrb] = gameState.room.makeAction('orb');
    const [sendPickup, receivePickup] = gameState.room.makeAction('pickup');
    const [sendPickupCollected, receivePickupCollected] = gameState.room.makeAction('pickupCol');
    const [sendJoin, receiveJoin] = gameState.room.makeAction('join');
    const [sendVoxelDamage, receiveVoxelDamage] = gameState.room.makeAction('voxelDmg');
    
    // Get player name from input or use default (convert to uppercase)
    const playerNameInput = document.getElementById('playerNameInput');
    const playerName = (playerNameInput && playerNameInput.value.trim().toUpperCase()) || `Player${gameState.myId.substring(0, 4).toUpperCase()}`;
    
    // Add local player
    const spawn = findSafeSpawnLocation(world, players);
    addPlayer(world, players, pc, gameState.myId, spawn.x, spawn.y, null, playerName);
    
    // Update player count display
    const updatePlayerCount = () => {
        try {
            if (gameState.room && pc) {
                const peers = gameState.room.getPeers();
                const peerCount = (peers && Array.isArray(peers)) ? peers.length : 0;
                const totalPlayers = Object.keys(players).length;
                pc.textContent = Math.max(totalPlayers, peerCount + 1);
                console.log(`Player count updated: ${pc.textContent} (peers: ${peerCount}, local players: ${totalPlayers})`);
            }
        } catch (e) {
            console.warn('Failed to update player count:', e);
        }
    };
    
    // Initial player count update
    updatePlayerCount();
    
    // Show UI elements (leaderboard replaces info)
    if (ui) ui.style.display = 'block';
    const leaderboard = document.getElementById('leaderboard');
    if (leaderboard) leaderboard.style.display = 'block';
    
    // Handle peer joining
    gameState.room.onPeerJoin(peerId => {
        console.log(`✓ Peer joined: ${peerId}`);
        updatePlayerCount();
        
        // Send our player info to new peer
        const p = players[gameState.myId];
        if (p) {
            console.log(`Sending join message to new peer ${peerId}`);
            sendJoin({
                id: gameState.myId,
                x: p.body.position.x,
                y: p.body.position.y,
                color: p.color,
                name: p.name,
                seed: levelSeedRef.current
            }, peerId);
        }
    });
    
    // Handle peer leaving
    gameState.room.onPeerLeave(peerId => {
        console.log(`✗ Peer left: ${peerId}`);
        if (players[peerId]) {
            Matter.World.remove(world, players[peerId].body);
            delete players[peerId];
        }
        updatePlayerCount();
        
        // Handle host migration if host leaves
        const remainingPeers = gameState.room.getPeers();
        if (remainingPeers.length === 0 && !isHostRef.current && schedulePickupSpawns) {
            isHostRef.current = true;
            setTimeout(() => {
                schedulePickupSpawns();
            }, 500);
        }
    });
    
    // Check for existing peers periodically and send join message if needed
    // This ensures we connect to peers who joined before us
    const checkExistingPeers = () => {
        try {
            if (!gameState.room) {
                setTimeout(checkExistingPeers, 500);
                return;
            }
            
            const existingPeers = gameState.room.getPeers();
            const p = players[gameState.myId];
            
            if (p && existingPeers && existingPeers.length > 0) {
                console.log(`Found ${existingPeers.length} existing peer(s), sending join messages...`);
                existingPeers.forEach(peerId => {
                    // Send join message to existing peers
                    sendJoin({
                        id: gameState.myId,
                        x: p.body.position.x,
                        y: p.body.position.y,
                        color: p.color,
                        name: p.name,
                        seed: levelSeedRef.current
                    }, peerId);
                });
            }
            
            updatePlayerCount();
        } catch (e) {
            console.warn('Error checking existing peers:', e);
        }
    };
    
    // Check for existing peers after a short delay (allow room to initialize)
    setTimeout(checkExistingPeers, 1000);
    setTimeout(checkExistingPeers, 3000);
    setTimeout(checkExistingPeers, 5000);
    
    // Receive join messages
    receiveJoin((data, peerId) => {
        console.log(`✓ Received join from peer ${peerId}:`, data);
        if (data.id !== gameState.myId && !players[data.id]) {
            addPlayer(world, players, pc, data.id, data.x, data.y, data.color, data.name);
            console.log(`✓ Added remote player: ${data.name || data.id}`);
            updatePlayerCount();
        } else if (players[data.id]) {
            console.log(`Player ${data.id} already exists, skipping`);
        }
    });
    
    // Receive state updates
    receiveState((data, peerId) => {
        if (data.id !== gameState.myId) {
            if (!players[data.id]) {
                console.log(`Received state from new player: ${data.id} (peer: ${peerId})`);
                addPlayer(world, players, pc, data.id, data.x, data.y, data.color, data.name);
                updatePlayerCount();
            }
            const p = players[data.id];
            if (!p) {
                console.warn(`Received state for unknown player: ${data.id}`);
                return;
            }
            Matter.Body.setPosition(p.body, { x: data.x, y: data.y });
            Matter.Body.setVelocity(p.body, { x: data.vx, y: data.vy });
            p.dir = data.dir;
            p.ang = data.ang;
            if (data.health !== undefined) p.health = data.health;
            if (data.name !== undefined) p.name = data.name;
            if (data.kills !== undefined) p.kills = data.kills;
            if (data.deaths !== undefined) p.deaths = data.deaths;
            
            // Sync crouch state and update hitbox
            if (data.isCrouching !== undefined) {
                const wasCrouching = p.isCrouching;
                p.isCrouching = !!data.isCrouching;
                
                // Update hitbox when crouch state changes
                if (wasCrouching !== p.isCrouching) {
                    // Store original radius if not already stored
                    if (!p.originalRadius) {
                        p.originalRadius = PR;
                    }
                    
                    // Track current scale factor
                    if (p.currentScale === undefined) {
                        p.currentScale = 1.0;
                    }
                    
                    // Scale body down when crouching, restore when standing
                    const crouchScale = 0.7; // Reduce hitbox to 70% when crouching
                    if (p.isCrouching) {
                        // Scale down the body (this keeps center at same position)
                        const scaleFactor = crouchScale / p.currentScale;
                        Matter.Body.scale(p.body, scaleFactor, scaleFactor);
                        p.currentScale = crouchScale;
                    } else {
                        // Scale back up to original size
                        const scaleFactor = 1.0 / p.currentScale;
                        Matter.Body.scale(p.body, scaleFactor, scaleFactor);
                        p.currentScale = 1.0;
                    }
                }
            }
        }
    });
    
    // Receive orbs
    receiveOrb((data, peerId) => {
        if (window.receiveOrbHandler) {
            window.receiveOrbHandler(data, peerId);
        }
    });
    
    // Receive pickups
    receivePickup((data, peerId) => {
        if (window.receivePickupHandler) {
            window.receivePickupHandler(data, peerId);
        }
    });
    
    // Receive pickup collected
    receivePickupCollected((data, peerId) => {
        if (window.receivePickupCollectedHandler) {
            window.receivePickupCollectedHandler(data, peerId);
        }
    });
    
    // Receive voxel damage
    receiveVoxelDamage((data, peerId) => {
        if (window.receiveVoxelDamageHandler) {
            window.receiveVoxelDamageHandler(data, peerId);
        }
    });
    
    // Store send functions globally for other modules
    window.broadcastState = sendState;
    window.broadcastOrb = sendOrb;
    window.broadcastPickup = sendPickup;
    window.broadcastPickupCollected = sendPickupCollected;
    window.broadcastVoxelDamage = sendVoxelDamage;
    
    // Determine host status - always be host if we can't determine peers (solo play)
    const startPickupSpawning = () => {
        if (isHostRef.current) return;
        
        isHostRef.current = true;
        
        if (schedulePickupSpawns) {
            setTimeout(() => {
                schedulePickupSpawns();
            }, 1000);
        }
    };
    
    // Check host status after room is initialized
    const checkHostStatus = () => {
        try {
            if (!gameState.room) {
                setTimeout(checkHostStatus, 500);
                return;
            }
            
            const peers = gameState.room.getPeers();
            const peerCount = (peers && Array.isArray(peers)) ? peers.length : 0;
            
            if (peerCount === 0 && !isHostRef.current) {
                startPickupSpawning();
            }
        } catch (e) {
            // If we can't determine, assume host for solo play
            if (!isHostRef.current) {
                startPickupSpawning();
            }
        }
    };
    
    // Check immediately and after delays to catch async initialization
    setTimeout(checkHostStatus, 300);
    setTimeout(checkHostStatus, 1000);
    setTimeout(checkHostStatus, 2000);
    
    // Log peer count periodically for debugging (less verbose)
    let lastPeerCount = -1;
    setInterval(() => {
        try {
            if (gameState.room) {
                const peers = gameState.room.getPeers();
                const peerCount = (peers && Array.isArray(peers)) ? peers.length : 0;
                // Only log if peer count changes
                if (peerCount !== lastPeerCount) {
                    lastPeerCount = peerCount;
                    console.log(`Peer status: ${peerCount} peer(s) connected, ${Object.keys(players).length} total player(s)`);
                    updatePlayerCount();
                }
            }
        } catch (e) {
            // Ignore errors
        }
    }, 5000);
}

