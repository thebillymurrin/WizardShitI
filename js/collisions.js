/* Collision Handling */

import { EXPLOSION, PLAYER_CFG, COLLISION_FILTERS } from './config.js';
import { createParticle, damageVoxel } from './physics.js';
import { damagePlayer } from './player.js';
import { playExplosionSound, playPickupSound } from './audio.js';

export function setupCollisionHandler(engine, world, players, orbs, particles, gameState, collectPickup, damagePlayerFn, respawnPlayer, updateActiveUI) {
    Matter.Events.on(engine, 'collisionStart', event => {
        for (const pair of event.pairs) {
            const a = pair.bodyA, b = pair.bodyB;
            
            // Check orb-player collisions for damage
            if (a.isOrb && !b.isStatic && !b.isOrb) {
                handleOrbPlayerCollision(a, b, players, orbs, world, particles, gameState, damagePlayerFn, respawnPlayer, updateActiveUI);
            } else if (b.isOrb && !a.isStatic && !a.isOrb) {
                handleOrbPlayerCollision(b, a, players, orbs, world, particles, gameState, damagePlayerFn, respawnPlayer, updateActiveUI);
            }
            
            // Orb hits wall (RPGs explode, others break or destroy voxels)
            if (a.isOrb && b.isStatic) {
                handleOrbWallCollision(a, b, orbs, world, players, particles, gameState, damagePlayerFn);
            } else if (b.isOrb && a.isStatic) {
                handleOrbWallCollision(b, a, orbs, world, players, particles, gameState, damagePlayerFn);
            }
            
            // Pickup collection (only by players, not orbs/particles)
            // Check if the other body is a player by searching in players object
            const isPlayerBody = (body) => {
                return !body.isStatic && !body.isOrb && !body.isParticle && !body.isPickup &&
                       Object.values(players).some(p => p.body === body);
            };
            
            if (a.isPickup && isPlayerBody(b) && !a.collected) {
                playPickupSound();
                collectPickup(a);
            } else if (b.isPickup && isPlayerBody(a) && !b.collected) {
                playPickupSound();
                collectPickup(b);
            }
        }
    });
}

function handleOrbPlayerCollision(orb, playerBody, players, orbs, world, particles, gameState, damagePlayerFn, respawnPlayer, updateActiveUI) {
    const hitPlayerId = Object.keys(players).find(id => players[id].body === playerBody);
    if (hitPlayerId && hitPlayerId !== orb.ownerId) {
        if (orb.isRPG) {
            explodeRPG(orb, players, orbs, world, particles, gameState, damagePlayerFn);
        } else {
            damagePlayerFn(players, hitPlayerId, orb.damage || 10, world, gameState.myId, updateActiveUI);
            breakOrb(orb, orbs, world, particles);
        }
    }
}

function handleOrbWallCollision(orb, wallBody, orbs, world, players, particles, gameState, damagePlayerFn) {
    if (orb.isRPG) {
        explodeRPG(orb, players, orbs, world, particles, gameState, damagePlayerFn);
    } else {
        // Check if wall is a destructible voxel
        if (wallBody.isVoxel) {
            // Damage the voxel based on bullet damage
            const damage = orb.damage || 10;
            damageVoxel(world, wallBody, damage, particles);
            breakOrb(orb, orbs, world, particles);
        } else if (orb.isBouncy) {
            // Bouncy bullets don't break on wall hit, they bounce (handled by Matter.js restitution)
            // But reduce life slightly on each bounce
            orb.life = Math.max(0, orb.life - 10);
            if (orb.life <= 0) {
                breakOrb(orb, orbs, world, particles);
            }
        } else {
            breakOrb(orb, orbs, world, particles);
        }
    }
}

function explodeRPG(orb, players, orbs, world, particles, gameState, damagePlayerFn) {
    const pos = orb.position;
    
    // Play explosion sound
    playExplosionSound();
    
    // Apply area damage to all players in radius
    for (const pid in players) {
        if (pid === orb.ownerId) continue;
        const playerPos = players[pid].body.position;
        const dx = playerPos.x - pos.x;
        const dy = playerPos.y - pos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < EXPLOSION.RPG_RADIUS) {
            const damageFalloff = 1 - (dist / EXPLOSION.RPG_RADIUS);
            damagePlayerFn(players, pid, EXPLOSION.RPG_DAMAGE * damageFalloff, world, gameState.myId);
        }
    }
    
    // Damage/destroy nearby voxels (only destructible ones, not boundary walls)
    const voxelDamage = EXPLOSION.RPG_DAMAGE * 2; // RPGs do significant damage to walls
    world.bodies.filter(b => b.isVoxel && b.isStatic && b.isVoxel === true).forEach(voxel => {
        const dx = voxel.position.x - pos.x;
        const dy = voxel.position.y - pos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < EXPLOSION.RPG_RADIUS) {
            const damageFalloff = 1 - (dist / EXPLOSION.RPG_RADIUS);
            damageVoxel(world, voxel, voxelDamage * damageFalloff, particles);
        }
    });
    
    // Create fire particles (glowing orange)
    for (let i = 0; i < EXPLOSION.FIRE_PARTICLE_COUNT; i++) {
        const angle = (Math.PI * 2 / EXPLOSION.FIRE_PARTICLE_COUNT) * i + (Math.random() - 0.5) * 0.3;
        const speed = 5 + Math.random() * 8;
        const size = 2 + Math.random() * 4;
        const life = 40 + Math.random() * 20;
        const color = `hsl(${Math.random() * 40 + 10}, 100%, ${50 + Math.random() * 20}%)`;
        createParticle(pos.x, pos.y, size, angle, speed, life, color, 'fire', world, particles);
    }
    
    // Create smoke particles (gray, slower)
    for (let i = 0; i < EXPLOSION.SMOKE_PARTICLE_COUNT; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1 + Math.random() * 3;
        const size = 4 + Math.random() * 6;
        const life = 80 + Math.random() * 40;
        const color = `rgba(100,100,100,${0.3 + Math.random() * 0.3})`;
        createParticle(pos.x, pos.y, size, angle, speed, life, color, 'smoke', world, particles);
    }
    
    // Remove the RPG
    Matter.World.remove(world, orb);
    const index = orbs.indexOf(orb);
    if (index > -1) orbs.splice(index, 1);
}

function breakOrb(orb, orbs, world, particles) {
    const pos = orb.position;
    const color = orb.render.fillStyle;
    
    // Create bullet break particles
    for (let i = 0; i < EXPLOSION.BULLET_PARTICLE_COUNT; i++) {
        const angle = (Math.PI * 2 / EXPLOSION.BULLET_PARTICLE_COUNT) * i + (Math.random() - 0.5) * 0.2;
        const speed = 2 + Math.random() * 3;
        const size = 1 + Math.random() * 2;
        const life = 50 + Math.random() * 20;
        createParticle(pos.x, pos.y, size, angle, speed, life, color, null, world, particles);
    }
    
    Matter.World.remove(world, orb);
    const index = orbs.indexOf(orb);
    if (index > -1) orbs.splice(index, 1);
}

