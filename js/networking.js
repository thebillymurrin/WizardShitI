/* Networking and Multiplayer */

import { sanitize, initSeededRandom } from './utils.js';
import { buildLevel } from './physics.js';
import { addPlayer, findSafeSpawnLocation } from './player.js';
import { COLLISION_FILTERS, PLAYER_CFG } from './config.js';

export function startNetworking(roomName, world, players, ui, info, pc, gameState, levelBuiltRef, levelSeedRef, seededRandomRef, isHostRef, schedulePickupSpawns) {
    // Wait for Trystero to load
    if (!window.trystero) {
        setTimeout(() => startNetworking(roomName, world, players, ui, info, pc, gameState, levelBuiltRef, levelSeedRef, seededRandomRef, isHostRef, schedulePickupSpawns), 100);
        return;
    }
    
    const safe = sanitize(roomName);
    
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
        
        // Reset seed and build level
        levelSeedRef.current = seed;
        seededRandomRef.current = initSeededRandom(seed);
        buildLevel(world, seededRandomRef.current);
        levelBuiltRef.current = true;
    }
    
    // Join room with Trystero (no keys needed!)
    gameState.room = window.trystero.joinRoom({ appId: 'wizard-game' }, safe);
    gameState.myId = Math.random().toString(36).substr(2, 9);
    
    // Setup message channels (names must be ≤12 bytes)
    const [sendState, receiveState] = gameState.room.makeAction('state');
    const [sendOrb, receiveOrb] = gameState.room.makeAction('orb');
    const [sendPickup, receivePickup] = gameState.room.makeAction('pickup');
    const [sendPickupCollected, receivePickupCollected] = gameState.room.makeAction('pickupCol');
    const [sendJoin, receiveJoin] = gameState.room.makeAction('join');
    
    // Add local player
    const spawn = findSafeSpawnLocation(world, players);
    addPlayer(world, players, pc, gameState.myId, spawn.x, spawn.y);
    // Show UI elements (don't hide ui, it shows room info)
    if (ui) ui.style.display = 'block';
    if (info) info.style.display = 'block';
    
    // Handle peer joining
    gameState.room.onPeerJoin(peerId => {
        pc.textContent = gameState.room.getPeers().length + 1;
        
        // Send our player info to new peer
        const p = players[gameState.myId];
        if (p) {
            sendJoin({
                id: gameState.myId,
                x: p.body.position.x,
                y: p.body.position.y,
                color: p.color,
                seed: levelSeedRef.current
            }, peerId);
        }
    });
    
    // Handle peer leaving
    gameState.room.onPeerLeave(peerId => {
        if (players[peerId]) {
            Matter.World.remove(world, players[peerId].body);
            delete players[peerId];
        }
        pc.textContent = gameState.room.getPeers().length + 1;
        
        // Handle host migration if host leaves
        const remainingPeers = gameState.room.getPeers();
        if (remainingPeers.length === 0 && !isHostRef.current && schedulePickupSpawns) {
            isHostRef.current = true;
            setTimeout(() => {
                schedulePickupSpawns();
            }, 500);
        }
    });
    
    // Receive join messages
    receiveJoin((data, peerId) => {
        if (data.id !== gameState.myId && !players[data.id]) {
            addPlayer(world, players, pc, data.id, data.x, data.y, data.color);
        }
    });
    
    // Receive state updates
    receiveState((data, peerId) => {
        if (data.id !== gameState.myId) {
            if (!players[data.id]) addPlayer(world, players, pc, data.id, data.x, data.y, data.color);
            const p = players[data.id];
            Matter.Body.setPosition(p.body, { x: data.x, y: data.y });
            Matter.Body.setVelocity(p.body, { x: data.vx, y: data.vy });
            p.dir = data.dir;
            p.ang = data.ang;
            if (data.health !== undefined) p.health = data.health;
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
    
    // Store send functions globally for other modules
    window.broadcastState = sendState;
    window.broadcastOrb = sendOrb;
    window.broadcastPickup = sendPickup;
    window.broadcastPickupCollected = sendPickupCollected;
    
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
}

