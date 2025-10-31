/* Main Entry Point and Initialization */

import { setPlayerConfig } from './config.js';
import { ensureToneStarted, initGameSounds } from './audio.js';
import { setupCollisionHandler } from './collisions.js';
import { update, gameLoop } from './game.js';
import { render } from './graphics.js';
import { startNetworking } from './networking.js';
import { schedulePickupSpawns, updateActiveUI, collectPickup, applyPickup } from './pickups.js';
import { damagePlayer, respawnPlayer, unstuckPlayer } from './player.js';
import { POWERUP_TYPES, COLLISION_FILTERS, VOXEL_CFG } from './config.js';
import { initConsole, toggleConsole } from './console.js';
import { destroyedVoxels, VOXEL_REGENERATION_TIME } from './physics.js';

// Initialize canvas
let canvas, ctx;
function initCanvas() {
    canvas = document.createElement('canvas');
    // Add canvas to game screen instead of body
    const gameScreen = document.getElementById('gameScreen');
    if (gameScreen) {
        gameScreen.appendChild(canvas);
    } else {
        document.body.appendChild(canvas);
    }
    ctx = canvas.getContext('2d');
    resize();
    window.addEventListener('resize', resize);
}

function resize() {
    canvas.width = innerWidth;
    canvas.height = innerHeight;
}

// Initialize physics engine
let engine, world;
function initPhysics() {
    if (typeof Matter === 'undefined') {
        console.error('Matter.js is not loaded! Please check your internet connection or CDN.');
        return false;
    }
    engine = Matter.Engine.create();
    world = engine.world;
    world.gravity.y = 0.2;
    return true;
}

// Game state
const gameState = {
    myId: null,
    room: null,
    players: {},
    keys: {},
    mouse: { x: 0, y: 0 },
    viewScale: { current: 1 },
    orbCooldown: { current: 0 },
    orbs: [],
    particles: [],
    pickups: [],
    cam: { x: 0, y: 0 },
    mouseDown: false,
    levelSeed: { current: 0 },
    seededRandom: { current: null },
    levelBuilt: { current: false },
    isHost: { current: false }
};

// UI elements (may not exist if menu is showing)
const ui = document.getElementById('ui');
const info = document.getElementById('info');
const pc = document.getElementById('pc') || document.getElementById('pc2');
const activeUpsDiv = document.getElementById('activeUps');
const cooldownFill = document.getElementById('cooldownFill');

// Input handling
window.addEventListener('keydown', e => {
    // Handle console toggle with backtick
    if (e.key === '`' || e.key === '~') {
        e.preventDefault();
        toggleConsole();
        return;
    }
    
    // Don't process game keys if console is open
    if (!gameState.consoleOpen) {
        gameState.keys[e.key.toLowerCase()] = true;
        // Handle Control key separately
        if (e.ctrlKey) {
            gameState.keys['control'] = true;
        }
        // Handle Space key
        if (e.key === ' ') {
            gameState.keys[' '] = true;
            gameState.keys['space'] = true;
        }
    }
});
window.addEventListener('keyup', e => {
    // Don't process game keys if console is open (except for backtick)
    if (!gameState.consoleOpen || e.key === '`' || e.key === '~') {
        gameState.keys[e.key.toLowerCase()] = false;
        // Handle Control key separately
        if (!e.ctrlKey) {
            gameState.keys['control'] = false;
        }
        // Handle Space key
        if (e.key === ' ') {
            gameState.keys[' '] = false;
            gameState.keys['space'] = false;
        }
    }
});

function addMouseListeners() {
    window.addEventListener('mousemove', e => {
        if (!canvas) return;
        const r = canvas.getBoundingClientRect();
        gameState.mouse.x = e.clientX - r.left;
        gameState.mouse.y = e.clientY - r.top;
    });
    window.addEventListener('mousedown', e => { gameState.mouseDown = true; });
    window.addEventListener('mouseup', e => { gameState.mouseDown = false; });
}

// Wrapper functions for callbacks
const updateActiveUIWrapper = () => {
    updateActiveUI(gameState.players, gameState.myId, activeUpsDiv, POWERUP_TYPES);
};

const damagePlayerWrapper = (players, playerId, damage, world, attackerId, myId) => {
    damagePlayer(players, playerId, damage, world, attackerId, myId, updateActiveUIWrapper);
};

const respawnPlayerWrapper = (world, players, playerId, myId) => {
    respawnPlayer(world, players, playerId, myId, updateActiveUIWrapper);
};

const collectPickupWrapper = (body) => {
    collectPickup(world, body, gameState.players, gameState.myId, gameState.pickups, 
                  (players, playerId, typeKey, myId) => applyPickup(players, playerId, typeKey, myId, updateActiveUIWrapper),
                  window.broadcastPickupCollected);
};

const schedulePickupSpawnsWrapper = () => {
    // Use a function that gets broadcastPickup at call time, not definition time
    const broadcastFn = window.broadcastPickup || null;
    schedulePickupSpawns(world, gameState.pickups, broadcastFn);
};

// Initialize game function (called from menu)
window.initializeGame = function(roomName) {
    ensureToneStarted();
    initGameSounds();
    // Reset pickup array when joining new room
    gameState.pickups = [];
    
    // Reset level state when joining a new room
    gameState.levelBuilt.current = false;
    gameState.levelSeed.current = 0; // Reset so it will always be different
    
    if (roomName) {
        startNetworking(
            roomName, world, gameState.players, ui, info, pc,
            gameState, gameState.levelBuilt,
            gameState.levelSeed, gameState.seededRandom,
            gameState.isHost, schedulePickupSpawnsWrapper
        );
    }
    
    // Ensure canvas is visible and resized
    if (canvas) {
        resize();
        canvas.style.display = 'block';
        canvas.style.position = 'absolute';
        canvas.style.top = '0';
        canvas.style.left = '0';
        canvas.style.zIndex = '1';
    }
    
    // Start game loop when game initializes
    setTimeout(() => {
        startGameLoop();
        // Force initial render
        renderFn();
    }, 100);
};

// Reset game function (called when leaving)
window.resetGame = function() {
    // Clean up game state
    gameState.myId = null;
    gameState.room = null;
    gameState.players = {};
    gameState.orbs = [];
    gameState.particles = [];
    gameState.pickups = [];
    gameState.levelBuilt.current = false;
    gameState.levelSeed.current = 0;
    gameState.isHost.current = false;
    
    // Clear world bodies
    if (world) {
        world.bodies.forEach(body => Matter.World.remove(world, body));
    }
};

// Set up network message handlers before networking starts
window.receiveOrbHandler = (data, peerId) => {
    if (data.id !== gameState.myId) {
        const orb = Matter.Bodies.circle(data.x, data.y, data.radius, {
            restitution: 0.2,
            frictionAir: 0.01,
            label: 'orb',
            render: { fillStyle: data.colour },
            isSensor: false,
            collisionFilter: COLLISION_FILTERS.orb
        });
        orb.isOrb = true;
        orb.ownerId = data.id;
        orb.life = data.life;
        orb.damage = data.damage;
        orb.isRPG = data.isRPG || false;
        orb.isBouncy = data.isBouncy || false;
        orb.isHoming = data.isHoming || false;
        
        // Set restitution for bouncing
        if (orb.isBouncy) {
            orb.restitution = 0.9; // high bounce
            Matter.Body.set(orb, { restitution: 0.9 });
        }
        
        Matter.Body.setVelocity(orb, {
            x: Math.cos(data.angle) * data.speed,
            y: Math.sin(data.angle) * data.speed
        });
        Matter.World.add(world, orb);
        gameState.orbs.push(orb);
    }
};

window.receivePickupHandler = (data, peerId) => {
    const body = Matter.Bodies.circle(data.x, data.y, 12, {
        isStatic: true,
        isSensor: true,
        render: { fillStyle: '#ff0' },
        collisionFilter: COLLISION_FILTERS.pickup
    });
    body.isPickup = true;
    body.pickupType = data.typeKey;
    body.spawnTime = data.spawnTime;
    body.expireTime = data.expireTime;
    Matter.World.add(world, body);
    gameState.pickups.push({ id: body.id, body, typeKey: data.typeKey });
};

window.receivePickupCollectedHandler = (data, peerId) => {
    const pickup = gameState.pickups.find(p => p.id === data.pickupId);
    if (pickup) {
        Matter.World.remove(world, pickup.body);
        gameState.pickups = gameState.pickups.filter(p => p.id !== data.pickupId);
    }
    applyPickup(gameState.players, data.playerId, data.typeKey, gameState.myId, updateActiveUIWrapper);
};

window.receiveVoxelDamageHandler = (data, peerId) => {
    // Find the matching voxel by position and size
    const voxel = world.bodies.find(body => {
        if (!body.isVoxel || !body.voxelData) return false;
        const vd = body.voxelData;
        // Match by position and dimensions (with small tolerance for floating point)
        return Math.abs(vd.x - data.x) < 1 && 
               Math.abs(vd.y - data.y) < 1 && 
               Math.abs(vd.width - data.width) < 1 && 
               Math.abs(vd.height - data.height) < 1;
    });
    
    if (voxel) {
        // Apply damage without broadcasting (to avoid loop)
        if (data.damage >= 9999) {
            // Complete destruction
            if (voxel.voxelData) {
                destroyedVoxels.push({
                    data: voxel.voxelData,
                    regenerateTime: Date.now() + VOXEL_REGENERATION_TIME
                });
            }
            Matter.World.remove(world, voxel);
        } else {
            // Partial damage
            if (voxel.health === undefined) {
                voxel.health = VOXEL_CFG.maxHealth;
                voxel.maxHealth = VOXEL_CFG.maxHealth;
            }
            voxel.health -= data.damage;
            if (voxel.health <= 0) {
                // Destroy voxel
                if (voxel.voxelData) {
                    destroyedVoxels.push({
                        data: voxel.voxelData,
                        regenerateTime: Date.now() + VOXEL_REGENERATION_TIME
                    });
                }
                Matter.World.remove(world, voxel);
            }
        }
    }
};

// Main initialization - wait for DOM
function initializeGame() {
    initCanvas();
    if (!initPhysics()) {
        console.error('Failed to initialize physics engine. Matter.js may not be loaded.');
        return;
    }
    addMouseListeners();
    setupCollisionHandler(
        engine, world, gameState.players, gameState.orbs, gameState.particles,
        gameState, collectPickupWrapper, damagePlayerWrapper, respawnPlayerWrapper, updateActiveUIWrapper
    );
    
    // Initialize console
    initConsole();
    
    // Make gameState available globally for console commands
    window.gameState = gameState;
    
    // Make applyPickup available globally for console
    window.applyPickupFunction = (players, playerId, typeKey, myId) => {
        applyPickup(players, playerId, typeKey, myId, updateActiveUIWrapper);
    };
    
    // Make unstuckPlayer available globally for console
    window.unstuckPlayerFunction = () => {
        if (gameState.myId && gameState.players[gameState.myId]) {
            unstuckPlayer(world, gameState.players, gameState.myId);
        }
    };
}

// Wait for DOM to be ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeGame);
} else {
    initializeGame();
}

// Game loop - only runs when game is active
let lastTimestamp = { current: performance.now() };
let gameLoopRunning = false;

const updateFn = (deltaMs) => {
    if (!gameState.myId || !gameState.players[gameState.myId]) return;
    update(
        deltaMs,
        gameState.myId, gameState.players, gameState.keys, gameState.mouse, gameState.mouseDown,
        world, engine, gameState.orbs, gameState.particles, gameState.pickups,
        gameState.orbCooldown, gameState.viewScale, gameState.cam, canvas, ctx,
        window.broadcastState, window.broadcastOrb, updateActiveUIWrapper, cooldownFill
    );
};

const renderFn = () => {
    if (!canvas || !ctx) return;
    // Always render, even if game hasn't started (shows black screen)
    gameState.viewScale.current = render(
        ctx, canvas, gameState.cam, gameState.viewScale.current, world,
        gameState.players, gameState.myId, gameState.orbs,
        gameState.particles, gameState.pickups
    );
};

function startGameLoop() {
    if (!gameLoopRunning) {
        gameLoopRunning = true;
        requestAnimationFrame((timestamp) => {
            lastTimestamp.current = timestamp;
            gameLoop(timestamp, lastTimestamp, updateFn, renderFn);
        });
    }
}

// Start loop immediately (it will skip updates if game not started)
startGameLoop();

// Expose config helper for console
window.setPlayerConfig = setPlayerConfig;

