/* Player Management */

import { PR, PLAYER_CFG, COLLISION_FILTERS, V_W, V_H } from './config.js';
import { randNeon } from './utils.js';

export function findSafeSpawnLocation(world, players) {
    const minDist = 200; // minimum distance from other players
    const margin = PR * 3; // margin from walls
    let attempts = 0;
    const maxAttempts = 100;
    
    while (attempts < maxAttempts) {
        // Random position within bounds
        const x = margin + Math.random() * (V_W - 2 * margin);
        const y = margin + Math.random() * (V_H - 2 * margin);
        
        // Check collision with static bodies
        const testRegion = { min: { x: x - PR - 10, y: y - PR - 10 }, max: { x: x + PR + 10, y: y + PR + 10 } };
        const hits = Matter.Query.region(world.bodies.filter(b => b.isStatic), testRegion);
        
        if (hits.length > 0) {
            attempts++;
            continue; // collision detected, try again
        }
        
        // Check distance from other players
        let tooClose = false;
        for (const pid in players) {
            const other = players[pid];
            const dx = other.body.position.x - x;
            const dy = other.body.position.y - y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < minDist) {
                tooClose = true;
                break;
            }
        }
        
        if (!tooClose) {
            return { x, y }; // found safe location
        }
        
        attempts++;
    }
    
    // Fallback to center if no safe spot found
    return { x: V_W / 2, y: V_H / 2 };
}

export function addPlayer(world, players, playerCountElement, id, x, y, col, name) {
    const body = Matter.Bodies.circle(x, y, PR, {
        restitution: 0,
        friction: 0.9,
        frictionAir: 0.05,
        density: 0.002,
        collisionFilter: COLLISION_FILTERS.player
    });
    players[id] = {
        body,
        color: col || randNeon(),
        name: name || `Player${id.substring(0, 4)}`,
        dir: 1,
        ang: 0,
        onWall: false,
        wallSide: 0,
        activePowerUps: {},  // per-player power-ups
        health: PLAYER_CFG.maxHealth,
        maxHealth: PLAYER_CFG.maxHealth,
        isCrouching: false,
        originalRadius: PR,
        currentScale: 1.0,
        kills: 0,
        deaths: 0
    };
    Matter.World.add(world, body);
    if (playerCountElement) {
        playerCountElement.textContent = Object.keys(players).length;
    }
}

export function respawnPlayer(world, players, playerId, myId, updateActiveUI) {
    if (!players[playerId]) return;
    const p = players[playerId];
    p.health = p.maxHealth;
    
    // Reset position to random safe location
    const spawn = findSafeSpawnLocation(world, players);
    Matter.Body.setPosition(p.body, { x: spawn.x, y: spawn.y });
    Matter.Body.setVelocity(p.body, { x: 0, y: 0 });
    
    // Clear power-ups on death
    p.activePowerUps = {};
    if (playerId === myId && updateActiveUI) updateActiveUI();
}

export function unstuckPlayer(world, players, playerId) {
    if (!players[playerId]) return;
    const p = players[playerId];
    
    // Find a safe location away from walls
    const spawn = findSafeSpawnLocation(world, players);
    Matter.Body.setPosition(p.body, { x: spawn.x, y: spawn.y });
    Matter.Body.setVelocity(p.body, { x: 0, y: 0 });
}

export function damagePlayer(players, playerId, damage, world, attackerId, myId, updateActiveUI) {
    if (!players[playerId]) return;
    const wasAlive = players[playerId].health > 0;
    players[playerId].health = Math.max(0, players[playerId].health - damage);
    
    // Respawn if dead
    if (players[playerId].health <= 0 && wasAlive) {
        // Increment deaths for the player who died
        players[playerId].deaths = (players[playerId].deaths || 0) + 1;
        
        // Increment kills for the attacker (if attacker exists and is not the same player)
        if (attackerId && attackerId !== playerId && players[attackerId]) {
            players[attackerId].kills = (players[attackerId].kills || 0) + 1;
        }
        
        respawnPlayer(world, players, playerId, myId, updateActiveUI);
    }
}

