/* Networking and Multiplayer with PeerJS */

import { sanitize, initSeededRandom } from './utils.js';
import { buildLevel } from './physics.js';
import { addPlayer, findSafeSpawnLocation } from './player.js';
import { COLLISION_FILTERS, PLAYER_CFG, PR, POWERUP_TYPES, POWERUP_CATEGORY } from './config.js';

export function startNetworking(roomName, world, players, ui, info, pc, gameState, levelBuiltRef, levelSeedRef, seededRandomRef, isHostRef, schedulePickupSpawns) {
    // Wait for PeerJS to load
    const checkPeerJS = () => {
        // PeerJS should be available as Peer in global scope when loaded via script tag
        let PeerJS = null;
        
        // Check various ways PeerJS might be exposed
        if (typeof Peer !== 'undefined') {
            PeerJS = Peer;
        } else if (window.Peer) {
            PeerJS = window.Peer;
        } else if (typeof globalThis !== 'undefined' && globalThis.Peer) {
            PeerJS = globalThis.Peer;
        }
        
        if (!PeerJS) {
            console.log('Waiting for PeerJS to load...');
            setTimeout(checkPeerJS, 100);
            return;
        }
        
        console.log('✓ PeerJS available, starting networking...');
        initializeNetworking(roomName, world, players, ui, info, pc, gameState, levelBuiltRef, levelSeedRef, seededRandomRef, isHostRef, schedulePickupSpawns, PeerJS);
    };
    
    checkPeerJS();
}

function initializeNetworking(roomName, world, players, ui, info, pc, gameState, levelBuiltRef, levelSeedRef, seededRandomRef, isHostRef, schedulePickupSpawns, PeerJS) {
    
    const safe = sanitize(roomName);
    console.log(`Room name: "${roomName}" → sanitized: "${safe}"`);
    
    // Use room name as seed for deterministic level generation
    let seed = 0;
    for (let i = 0; i < safe.length; i++) {
        const char = safe.charCodeAt(i);
        seed = ((seed << 5) - seed) + char;
        seed = seed + (seed << 15);
        seed = seed ^ (seed >> 7);
    }
    seed = Math.abs(seed) + (safe.length * 73856093);
    seed = seed || 1;
    
    // Rebuild level if seed changed
    if (levelSeedRef.current !== seed) {
        const allBodies = [...world.bodies];
        allBodies.forEach(body => Matter.World.remove(world, body));
        
        const playerIds = Object.keys(players);
        playerIds.forEach(id => {
            delete players[id];
        });
        
        // Detect theme from room name
        let theme = 'default';
        const roomLower = safe.toLowerCase();
        if (roomLower.includes('clouds')) {
            theme = 'clouds';
        } else if (roomLower.includes('volcano') || roomLower.includes('lava') || roomLower.includes('fire')) {
            theme = 'volcano';
        } else if (roomLower.includes('space') || roomLower.includes('cosmic') || roomLower.includes('stars')) {
            theme = 'space';
        }
        
        levelSeedRef.current = seed;
        seededRandomRef.current = initSeededRandom(seed);
        buildLevel(world, seededRandomRef.current, theme);
        levelBuiltRef.current = true;
        gameState.theme = theme;
    }
    
    // Generate temporary ID (will be replaced by PeerJS when connected)
    // Don't set gameState.myId here - it will be set when PeerJS connects
    
    // Create room ID from sanitized room name (this will be the host peer ID)
    // For room-based connections, we'll use the room name as the host peer ID
    const roomId = safe.toLowerCase().substring(0, 20); // PeerJS peer IDs are limited length
    
    // Initialize PeerJS with public server and proper STUN/TURN configuration
    const peerConfig = {
        host: '0.peerjs.com',
        port: 443,
        path: '/',
        secure: true,
        config: {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
                { urls: 'stun:stun2.l.google.com:19302' },
                { urls: 'stun:stun3.l.google.com:19302' },
                { urls: 'stun:stun4.l.google.com:19302' }
            ]
        },
        debug: 2
    };
    
    console.log(`✓ Initializing PeerJS with room ID: ${roomId}`);
    
    // Create peer - first attempt to be host (using room name as peer ID)
    let peer = new PeerJS(roomId, peerConfig);
    let isHost = true;
    let hostPeerId = roomId;
    
    gameState.peer = peer;
    gameState.isHost = isHost;
    gameState.roomId = roomId;
    gameState.connections = {};
    
    // Update player count display
    const updatePlayerCount = () => {
        try {
            if (pc) {
                const totalPlayers = Object.keys(players).length;
                pc.textContent = totalPlayers;
            }
        } catch (e) {
            console.warn('Failed to update player count:', e);
        }
    };
    
    // Function to connect to host
    const connectToHost = (hostId) => {
        if (!hostId || !peer) return;
        
        console.log(`Connecting to host: ${hostId}`);
        const conn = peer.connect(hostId, {
            reliable: true
        });
        
        if (!conn) {
            console.error('Failed to create connection');
            return;
        }
        
        setupConnection(conn, hostId);
    };
    
    // Track which connections are open
    const openConnections = new Set();
    
    // Send message to a specific peer
    const sendMessage = (peerId, message) => {
        if (peerId && gameState.connections[peerId] && openConnections.has(peerId)) {
            try {
                gameState.connections[peerId].send(message);
            } catch (e) {
                // Silently handle connection errors (connection might be closing)
                if (!e.message || !e.message.includes('not open')) {
                    console.error(`Failed to send message to ${peerId}:`, e);
                }
            }
        }
    };
    
    // Broadcast message to all peers
    const broadcastMessage = (message) => {
        openConnections.forEach(peerId => {
            sendMessage(peerId, message);
        });
    };
    
    // Setup connection handlers
    const setupConnection = (conn, peerId) => {
        if (gameState.connections[peerId]) {
            console.log(`Connection to ${peerId} already exists`);
            return;
        }
        
        gameState.connections[peerId] = conn;
        
        conn.on('open', () => {
            console.log(`✓ Connection opened with ${peerId}`);
            openConnections.add(peerId);
            
            // Send join message
            const p = players[gameState.myId];
            if (p) {
                sendMessage(peerId, {
                    type: 'join',
                    data: {
                        id: gameState.myId,
                        x: p.body.position.x,
                        y: p.body.position.y,
                        color: p.color,
                        name: p.name,
                        seed: levelSeedRef.current
                    }
                });
            }
            
            updatePlayerCount();
        });
        
        conn.on('data', (data) => {
            handleMessage(data, peerId);
        });
        
        conn.on('close', () => {
            console.log(`✗ Connection closed with ${peerId}`);
            openConnections.delete(peerId);
            delete gameState.connections[peerId];
            
            if (players[peerId]) {
                Matter.World.remove(world, players[peerId].body);
                delete players[peerId];
            }
            
            updatePlayerCount();
        });
        
        conn.on('error', (err) => {
            // If connection fails or closes, remove from open set
            if (err.type === 'connection-closed' || err.message?.includes('not open')) {
                openConnections.delete(peerId);
            }
            // Only log non-trivial errors
            if (!err.message || (!err.message.includes('not open') && !err.message.includes('closed'))) {
                console.error(`Connection error with ${peerId}:`, err);
            }
        });
    };
    
    // Get player name (get it early, but don't use myId yet)
    const playerNameInput = document.getElementById('playerNameInput');
    const defaultPlayerName = 'PLAYER';
    
    // Handle peer connection open
    peer.on('open', (id) => {
        console.log(`✓ PeerJS connected. My ID: ${id}`);
        gameState.myId = id;
        
        // NOW add the local player with the correct ID
        const playerName = (playerNameInput && playerNameInput.value.trim().toUpperCase()) || `Player${id.substring(0, 4).toUpperCase()}`;
        const spawn = findSafeSpawnLocation(world, players);
        addPlayer(world, players, pc, gameState.myId, spawn.x, spawn.y, null, playerName);
        console.log(`✓ Added local player with ID: ${gameState.myId}`);
        updatePlayerCount();
        
        if (isHost) {
            console.log(`✓ Hosting room: ${roomId}`);
            // Host is ready, wait for clients to connect
            isHostRef.current = true;
            if (schedulePickupSpawns) {
                setTimeout(() => {
                    schedulePickupSpawns();
                }, 1000);
            }
        }
    });
    
    // Handle peer connection errors
    peer.on('error', (err) => {
        console.error('PeerJS error:', err);
        
        if (err.type === 'unavailable-id') {
            // Room ID already taken, connect as client with random ID
            console.log('Room ID taken, connecting as client...');
            peer.destroy();
            peer = new PeerJS(peerConfig);
            gameState.peer = peer;
            isHost = false;
            gameState.isHost = false;
            
            peer.on('open', (id) => {
                gameState.myId = id;
                console.log(`✓ Connected as client with ID: ${id}`);
                
                // Add the local player with the correct ID
                const playerName = (playerNameInput && playerNameInput.value.trim().toUpperCase()) || `Player${id.substring(0, 4).toUpperCase()}`;
                const spawn = findSafeSpawnLocation(world, players);
                addPlayer(world, players, pc, gameState.myId, spawn.x, spawn.y, null, playerName);
                console.log(`✓ Added local player with ID: ${gameState.myId}`);
                updatePlayerCount();
                
                // Try to connect to host
                setTimeout(() => {
                    connectToHost(hostPeerId);
                }, 500);
            });
            
            peer.on('connection', (conn) => {
                console.log(`✓ Incoming connection from: ${conn.peer}`);
                setupConnection(conn, conn.peer);
            });
        }
    });
    
    // Handle incoming connections (for host)
    peer.on('connection', (conn) => {
        console.log(`✓ Incoming connection from: ${conn.peer}`);
        setupConnection(conn, conn.peer);
    });
    
    // Show UI elements (player will be added when PeerJS connects)
    if (ui) ui.style.display = 'block';
    const leaderboard = document.getElementById('leaderboard');
    if (leaderboard) leaderboard.style.display = 'block';
    
    // Handle messages
    const handleMessage = (message, peerId) => {
        if (!message || !message.type) return;
        
        switch (message.type) {
            case 'join':
                const joinData = message.data;
                console.log(`✓ Received join from ${peerId}:`, joinData);
                if (joinData.id !== gameState.myId && !players[joinData.id]) {
                    addPlayer(world, players, pc, joinData.id, joinData.x, joinData.y, joinData.color, joinData.name);
                    console.log(`✓ Added remote player: ${joinData.name || joinData.id}`);
                    
                    // Send our join message back
                    const p = players[gameState.myId];
                    if (p) {
                        sendMessage(peerId, {
                            type: 'join',
                            data: {
                                id: gameState.myId,
                                x: p.body.position.x,
                                y: p.body.position.y,
                                color: p.color,
                                name: p.name,
                                seed: levelSeedRef.current
                            }
                        });
                    }
                    
                    updatePlayerCount();
                }
                break;
                
            case 'state':
                const stateData = message.data;
                if (stateData.id !== gameState.myId) {
                    if (!players[stateData.id]) {
                        console.log(`Received state from new player: ${stateData.id}`);
                        addPlayer(world, players, pc, stateData.id, stateData.x, stateData.y, stateData.color, stateData.name);
                        updatePlayerCount();
                    }
                    const p = players[stateData.id];
                    if (!p) return;
                    
                    Matter.Body.setPosition(p.body, { x: stateData.x, y: stateData.y });
                    Matter.Body.setVelocity(p.body, { x: stateData.vx, y: stateData.vy });
                    p.dir = stateData.dir;
                    p.ang = stateData.ang;
                    if (stateData.health !== undefined) p.health = stateData.health;
                    if (stateData.name !== undefined) p.name = stateData.name;
                    if (stateData.kills !== undefined) p.kills = stateData.kills;
                    if (stateData.deaths !== undefined) p.deaths = stateData.deaths;
                    
                    // Sync crouch state
                    if (stateData.isCrouching !== undefined) {
                        const wasCrouching = p.isCrouching;
                        p.isCrouching = !!stateData.isCrouching;
                        
                        if (wasCrouching !== p.isCrouching) {
                            if (!p.originalRadius) p.originalRadius = PR;
                            if (p.currentScale === undefined) p.currentScale = 1.0;
                            
                            const crouchScale = 0.7;
                            if (p.isCrouching) {
                                const scaleFactor = crouchScale / p.currentScale;
                                Matter.Body.scale(p.body, scaleFactor, scaleFactor);
                                p.currentScale = crouchScale;
                            } else {
                                const scaleFactor = 1.0 / p.currentScale;
                                Matter.Body.scale(p.body, scaleFactor, scaleFactor);
                                p.currentScale = 1.0;
                            }
                        }
                    }
                }
                break;
                
            case 'orb':
                if (window.receiveOrbHandler) {
                    window.receiveOrbHandler(message.data, peerId);
                }
                break;
                
            case 'pickup':
                if (window.receivePickupHandler) {
                    window.receivePickupHandler(message.data, peerId);
                }
                break;
                
            case 'pickupCollected':
                if (window.receivePickupCollectedHandler) {
                    window.receivePickupCollectedHandler(message.data, peerId);
                }
                break;
                
            case 'voxelDmg':
                if (window.receiveVoxelDamageHandler) {
                    window.receiveVoxelDamageHandler(message.data, peerId);
                }
                break;
        }
    };
    
    // Store broadcast functions globally
    window.broadcastState = (data) => {
        broadcastMessage({
            type: 'state',
            data: data
        });
    };
    
    window.broadcastOrb = (data) => {
        broadcastMessage({
            type: 'orb',
            data: data
        });
    };
    
    window.broadcastPickup = (data) => {
        broadcastMessage({
            type: 'pickup',
            data: data
        });
    };
    
    window.broadcastPickupCollected = (data) => {
        broadcastMessage({
            type: 'pickupCollected',
            data: data
        });
    };
    
    window.broadcastVoxelDamage = (data) => {
        broadcastMessage({
            type: 'voxelDmg',
            data: data
        });
    };
    
    // Host status
    if (isHost) {
        isHostRef.current = true;
        if (schedulePickupSpawns) {
            setTimeout(() => {
                schedulePickupSpawns();
            }, 1000);
        }
    } else {
        // Check if we should become host if no connections
        setTimeout(() => {
            if (Object.keys(gameState.connections).length === 0 && !isHostRef.current && schedulePickupSpawns) {
                isHostRef.current = true;
                setTimeout(() => {
                    schedulePickupSpawns();
                }, 500);
            }
        }, 3000);
    }
    
    // Periodic connection check
    setInterval(() => {
        const connectionCount = Object.keys(gameState.connections).length;
        const playerCount = Object.keys(players).length;
        console.log(`Connection status: ${connectionCount} connection(s), ${playerCount} total player(s)`);
        updatePlayerCount();
    }, 5000);
}
