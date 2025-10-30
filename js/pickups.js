/* Power-up and Pickup Management */

import { V_W, V_H, PLAYER_CFG, POWERUP_TYPES, COLLISION_FILTERS, RARITY } from './config.js';

export function spawnPickup(world, pickups, broadcastPickup) {
    if (pickups.length >= 12) {
        return;               // max 8 on map
    }
    
    // Weighted random selection based on rarity
    const keys = Object.keys(POWERUP_TYPES);
    
    // Define rarity weights (higher = more common)
    const rarityWeights = {
        [RARITY.COMMON]: 50,        // Very common
        [RARITY.UNCOMMON]: 30,      // Common
        [RARITY.RARE]: 15,          // Uncommon
        [RARITY.LEGENDARY]: 5       // Rare
    };
    
    // Calculate weights for each power-up
    let totalWeight = 0;
    const weightedKeys = keys.map(key => {
        const powerup = POWERUP_TYPES[key];
        const weight = rarityWeights[powerup.rarity] || 25;
        totalWeight += weight;
        return { key, weight, cumulative: 0 };
    });
    
    // Calculate cumulative weights
    let cumulative = 0;
    weightedKeys.forEach(item => {
        cumulative += item.weight;
        item.cumulative = cumulative;
    });
    
    // Select based on weighted random
    const random = Math.random() * totalWeight;
    let chosenKey = weightedKeys[0].key; // fallback
    for (const item of weightedKeys) {
        if (random <= item.cumulative) {
            chosenKey = item.key;
            break;
        }
    }

    const safeMargin = PLAYER_CFG.tileSize * 2;
    let x, y, tries = 0;
    let foundSafeSpot = false;
    
    do {
        x = Math.random() * (V_W - 2 * safeMargin) + safeMargin;
        y = Math.random() * (V_H - 2 * safeMargin) + safeMargin;
        const region = { min: { x: x - 10, y: y - 10 }, max: { x: x + 10, y: y + 10 } };
        const hits = Matter.Query.region(world.bodies.filter(b => b.isStatic), region);
        if (!hits.length) {
            foundSafeSpot = true;
            break;
        }
    } while (++tries < 50);
    
    // If we couldn't find a safe spot, try a few more times with a larger margin
    if (!foundSafeSpot) {
        tries = 0;
        do {
            x = Math.random() * (V_W - safeMargin) + safeMargin / 2;
            y = Math.random() * (V_H - safeMargin) + safeMargin / 2;
            const region = { min: { x: x - 20, y: y - 20 }, max: { x: x + 20, y: y + 20 } };
            const hits = Matter.Query.region(world.bodies.filter(b => b.isStatic), region);
            if (!hits.length) {
                foundSafeSpot = true;
                break;
            }
        } while (++tries < 20);
    }
    
    // Get power-up config for color
    const powerup = POWERUP_TYPES[chosenKey];
    const pickupColor = powerup ? (powerup.rarity || '#ff0') : '#ff0';
    
    // Static sensor – never falls
    const body = Matter.Bodies.circle(x, y, 12, {
        isStatic: true,
        isSensor: true,
        render: { fillStyle: pickupColor },
        collisionFilter: COLLISION_FILTERS.pickup
    });
    body.isPickup = true;
    body.pickupType = chosenKey;
    body.spawnTime = Date.now();
    body.expireTime = body.spawnTime + 30_000;   // 30 s on ground
    Matter.World.add(world, body);
    pickups.push({ id: body.id, body, typeKey: chosenKey });
    
    // Broadcast to peers
    if (broadcastPickup) {
        broadcastPickup({ x, y, typeKey: chosenKey, spawnTime: body.spawnTime, expireTime: body.expireTime });
    }
}

let spawnTimer = null;

export function schedulePickupSpawns(world, pickups, broadcastPickup) {
    // Clear any existing timer to avoid duplicates
    if (spawnTimer) {
        clearTimeout(spawnTimer);
        spawnTimer = null;
    }
    
    // Spawn first pickup immediately
    spawnPickup(world, pickups, broadcastPickup);
    
    // Then schedule regular spawns
    const scheduleNext = () => {
        const interval = 5_000 + Math.random() * 10_000; // 5‑15 s
        spawnTimer = setTimeout(() => {
            spawnPickup(world, pickups, broadcastPickup);
            scheduleNext();
        }, interval);
    };
    
    scheduleNext();
}

export function applyPickup(players, playerId, typeKey, myId, updateActiveUI) {
    if (!players[playerId]) return;
    const powerup = POWERUP_TYPES[typeKey];
    if (!powerup) return;
    
    // Handle instant effects (like health)
    if (powerup.instant) {
        if (powerup.healPercent) {
            const player = players[playerId];
            const healAmount = (player.maxHealth * powerup.healPercent) / 100;
            player.health = Math.min(player.maxHealth, player.health + healAmount);
        }
        return; // Instant effects don't stack or have timers
    }
    
    // Handle stackable power-ups
    const powerUps = players[playerId].activePowerUps;
    if (!powerUps[typeKey]) powerUps[typeKey] = { timer: 0, stacks: 0 };
    powerUps[typeKey].stacks++;
    powerUps[typeKey].timer += 15_000;      // +15 s per pickup
    if (playerId === myId && updateActiveUI) updateActiveUI();
}

export function updatePowerupTimers(players, myId, deltaMs, updateActiveUI) {
    if (!players[myId]) return;
    const powerUps = players[myId].activePowerUps;
    for (const key in powerUps) {
        const pu = powerUps[key];
        pu.timer -= deltaMs;
        if (pu.timer <= 0) delete powerUps[key];
    }
    if (updateActiveUI) updateActiveUI();
}

export function updateActiveUI(players, myId, activeUpsDiv, POWERUP_TYPES) {
    if (!players[myId]) return;
    const lines = [];
    const powerUps = players[myId].activePowerUps;
    for (const key in powerUps) {
        const pu = powerUps[key];
        const secs = Math.max(0, Math.floor(pu.timer / 1000));
        lines.push(`${POWERUP_TYPES[key].name} x${pu.stacks} (${secs}s)`);
    }
    activeUpsDiv.innerHTML = lines.map(l => `<div>${l}</div>`).join('');
}

export function collectPickup(world, body, players, myId, pickups, applyPickup, broadcastPickupCollected) {
    // Mark as collected immediately to prevent multiple collections
    if (body.collected) return;
    body.collected = true;
    
    const key = body.pickupType;
    
    // Remove from world first
    Matter.World.remove(world, body);
    
    // Remove from pickups array
    const index = pickups.findIndex(p => p.body.id === body.id);
    if (index !== -1) {
        pickups.splice(index, 1);
    }
    
    // Apply the power-up
    applyPickup(players, myId, key, myId);
    
    // Broadcast pickup collection
    if (broadcastPickupCollected) {
        broadcastPickupCollected({ pickupId: body.id, typeKey: key, playerId: myId });
    }
}

