/* Main Game Loop */

import { V_W, V_H, PR, PLAYER_CFG, POWERUP_TYPES, POWERUP_CATEGORY } from './config.js';
import { playJumpSound } from './audio.js';
import { fireOrb } from './orbs.js';
import { updatePowerupTimers, updateActiveUI } from './pickups.js';
import { updateCamera } from './camera.js';
import { incrementAnimationFrame, render } from './graphics.js';
import { recycleParticle, regenerateVoxels } from './physics.js';

// Helper function to calculate player size for any player
function calculatePlayerSize(powerUps) {
    let playerSizeMultiplier = 1.0;
    for (const key in powerUps) {
        const pu = powerUps[key];
        const cfg = POWERUP_TYPES[key];
        // Tank category power-ups use radiusMul to increase player size
        if (cfg && cfg.category === POWERUP_CATEGORY.TANK && cfg.radiusMul) {
            const n = pu.stacks;
            playerSizeMultiplier *= Math.pow(cfg.radiusMul, n);
        }
    }
    return {
        multiplier: playerSizeMultiplier,
        radius: PR * playerSizeMultiplier
    };
}

export function update(
    deltaMs,
    myId, players, keys, mouse, mouseDown,
    world, engine, orbs, particles, pickups,
    orbCooldownRef, viewScaleRef, cam, canvas, ctx,
    broadcastState, broadcastOrb, updateActiveUI, cooldownFill
) {
    // Note: cam is used for converting mouse screen coordinates to world coordinates
    if (!myId || !players[myId]) return;
    const p = players[myId];

    // Calculate player size for ALL players (for rendering consistency)
    for (const playerId in players) {
        const player = players[playerId];
        const sizeData = calculatePlayerSize(player.activePowerUps || {});
        player.playerSizeMultiplier = sizeData.multiplier;
        player.effectivePlayerRadius = sizeData.radius;
    }
    
    // Get power-ups reference
    const powerUps = p.activePowerUps;
    
    // Use the calculated values
    const playerSizeMultiplier = p.playerSizeMultiplier;
    const effectivePlayerRadius = p.effectivePlayerRadius;
    
    // Movement - apply speed multipliers
    let moveSpeedMultiplier = 1.0;
    for (const key in powerUps) {
        const pu = powerUps[key];
        const cfg = POWERUP_TYPES[key];
        if (!cfg || !cfg.moveSpeedMul) continue;
        const n = pu.stacks;
        moveSpeedMultiplier *= Math.pow(cfg.moveSpeedMul, n);
    }
    
    let horizForce = 0;
    if (keys['a'] || keys['arrowleft']) horizForce = -PLAYER_CFG.force * moveSpeedMultiplier;
    else if (keys['d'] || keys['arrowright']) horizForce = PLAYER_CFG.force * moveSpeedMultiplier;
    if (horizForce !== 0) Matter.Body.applyForce(p.body, p.body.position, { x: horizForce, y: 0 });

    // Ground check - use effective radius
    const rayStart = { x: p.body.position.x, y: p.body.position.y + effectivePlayerRadius },
          rayEnd = { x: p.body.position.x, y: p.body.position.y + effectivePlayerRadius + 5 },
          onGround = Matter.Query.ray(world.bodies.filter(b => b.isStatic), rayStart, rayEnd).length > 0;
    p.canJump = onGround;

    // Wall check - use effective radius
    const staticBodies = world.bodies.filter(b => b.isStatic);
    const leftHits = Matter.Query.ray(staticBodies,
          { x: p.body.position.x - effectivePlayerRadius, y: p.body.position.y },
          { x: p.body.position.x - effectivePlayerRadius - PLAYER_CFG.wallDetectDist, y: p.body.position.y });
    const rightHits = Matter.Query.ray(staticBodies,
          { x: p.body.position.x + effectivePlayerRadius, y: p.body.position.y },
          { x: p.body.position.x + effectivePlayerRadius + PLAYER_CFG.wallDetectDist, y: p.body.position.y });
    p.onWall = leftHits.length > 0 || rightHits.length > 0;
    p.wallSide = leftHits.length > 0 ? -1 : (rightHits.length > 0 ? 1 : 0);

    // Jump
    if ((keys['w'] || keys['arrowup']) && p.canJump) {
        Matter.Body.applyForce(p.body, p.body.position, { x: 0, y: -PLAYER_CFG.jumpForce });
        playJumpSound();
    }

    // Wall‑climb
    if ((keys['w'] || keys['arrowup']) && p.onWall) {
        Matter.Body.applyForce(p.body, p.body.position, { x: 0, y: -PLAYER_CFG.climbForce });
    }

    // Aim direction - convert mouse screen coordinates to world coordinates
    // Account for camera offset and view scale
    const worldMouseX = (mouse.x / viewScaleRef.current) + cam.x;
    const worldMouseY = (mouse.y / viewScaleRef.current) + cam.y;
    const aimDx = worldMouseX - p.body.position.x;
    p.dir = aimDx > 0 ? 1 : -1;
    p.ang = Math.atan2(worldMouseY - p.body.position.y, aimDx);

    // Physics step – fixed timestep (16 ms)
    Matter.Engine.update(engine, 1000 / 60);

    // Clamp velocity to prevent wall glitching
    const maxVel = 15;
    if (Math.abs(p.body.velocity.x) > maxVel) {
        Matter.Body.setVelocity(p.body, { x: Math.sign(p.body.velocity.x) * maxVel, y: p.body.velocity.y });
    }
    if (Math.abs(p.body.velocity.y) > maxVel) {
        Matter.Body.setVelocity(p.body, { x: p.body.velocity.x, y: Math.sign(p.body.velocity.y) * maxVel });
    }
    
    // Prevent escaping map bounds - use effective radius
    if (p.body.position.x < effectivePlayerRadius) Matter.Body.setPosition(p.body, { x: effectivePlayerRadius, y: p.body.position.y });
    if (p.body.position.x > V_W - effectivePlayerRadius) Matter.Body.setPosition(p.body, { x: V_W - effectivePlayerRadius, y: p.body.position.y });
    if (p.body.position.y < effectivePlayerRadius) Matter.Body.setPosition(p.body, { x: p.body.position.x, y: effectivePlayerRadius });
    if (p.body.position.y > V_H - effectivePlayerRadius) Matter.Body.setPosition(p.body, { x: p.body.position.x, y: V_H - effectivePlayerRadius });

    // Cooldown countdown (seconds)
    orbCooldownRef.current = Math.max(0, orbCooldownRef.current - deltaMs / 1000);

    // Continuous fire (mouse held)
    if (mouseDown && orbCooldownRef.current <= 0) {
        const newCooldown = fireOrb(world, players, myId, orbs, mouse, viewScaleRef.current, broadcastOrb);
        orbCooldownRef.current = newCooldown;
    }

    // Update orbs (lifetimes and homing behavior)
    for (let i = orbs.length - 1; i >= 0; i--) {
        const orb = orbs[i];
        
        // Homing behavior - steer toward nearest enemy
        if (orb.isHoming && orb.ownerId) {
            const ownerId = orb.ownerId;
            let nearestPlayer = null;
            let nearestDist = Infinity;
            
            // Find nearest enemy player
            for (const pid in players) {
                if (pid === ownerId) continue;
                const player = players[pid];
                if (!player || !player.body) continue;
                
                const dx = player.body.position.x - orb.position.x;
                const dy = player.body.position.y - orb.position.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                if (dist < nearestDist && dist < 800) { // only home within 800 units
                    nearestDist = dist;
                    nearestPlayer = player;
                }
            }
            
            // Steer toward nearest enemy
            if (nearestPlayer) {
                const dx = nearestPlayer.body.position.x - orb.position.x;
                const dy = nearestPlayer.body.position.y - orb.position.y;
                const angle = Math.atan2(dy, dx);
                const currentAngle = Math.atan2(orb.velocity.y, orb.velocity.x);
                
                // Smooth steering (lerp toward target angle)
                const turnSpeed = 0.15; // how fast it turns
                let newAngle = currentAngle;
                let angleDiff = angle - currentAngle;
                
                // Normalize angle difference to [-PI, PI]
                while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
                while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
                
                newAngle = currentAngle + angleDiff * turnSpeed;
                const speed = Math.sqrt(orb.velocity.x * orb.velocity.x + orb.velocity.y * orb.velocity.y);
                Matter.Body.setVelocity(orb, { 
                    x: Math.cos(newAngle) * speed, 
                    y: Math.sin(newAngle) * speed 
                });
            }
        }
        
        // Lifetime countdown
        orb.life--;
        if (orb.life <= 0) {
            Matter.World.remove(world, orb);
            orbs.splice(i, 1);
        }
    }
    // Update particle lifetimes (optimized with recycling)
    for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].life--;
        if (particles[i].life <= 0) {
            recycleParticle(particles[i], world, particles);
        }
    }

    // Regenerate destroyed voxels (pass players to check for collisions)
    regenerateVoxels(world, players);
    
    // Power‑up timers (real elapsed time)
    updatePowerupTimers(players, myId, deltaMs, updateActiveUI);

    // Pickup expiration
    const now = Date.now();
    for (let i = pickups.length - 1; i >= 0; i--) {
        if (now > pickups[i].body.expireTime) {
            Matter.World.remove(world, pickups[i].body);
            pickups.splice(i, 1);
        }
    }

    // Broadcast state
    if (broadcastState) {
        broadcastState({
            id: myId,
            x: p.body.position.x,
            y: p.body.position.y,
            vx: p.body.velocity.x,
            vy: p.body.velocity.y,
            dir: p.dir,
            ang: p.ang,
            color: p.color,
            health: p.health
        });
    }

    // Camera
    updateCamera(cam, players, myId, viewScaleRef, canvas, V_W, V_H);
    
    // Update animation
    incrementAnimationFrame();
    
    // Update cooldown bar
    if (players[myId] && cooldownFill) {
        const maxCooldown = PLAYER_CFG.fireCooldown;
        let effectiveCooldown = maxCooldown;
        const powerUps = players[myId].activePowerUps;
        for (const key in powerUps) {
            const cfg = POWERUP_TYPES[key];
            if (!cfg) continue;
            const n = powerUps[key].stacks;
            
            // Apply fire rate modifiers (reduce cooldown) - percentage based
            if (cfg.fireRatePercent) {
                const multiplier = 1 + (cfg.fireRatePercent / 100);
                effectiveCooldown /= Math.pow(multiplier, n);
            }
            // Apply cooldown multipliers
            if (cfg.cooldownMul) {
                effectiveCooldown *= Math.pow(cfg.cooldownMul, n);
            }
        }
        const cooldownPercent = Math.max(0, Math.min(100, (1 - orbCooldownRef.current / effectiveCooldown) * 100));
        cooldownFill.style.width = cooldownPercent + '%';
    }
}

export function gameLoop(
    timestamp,
    lastTimestampRef,
    updateFn,
    renderFn
) {
    const deltaMs = timestamp - lastTimestampRef.current;
    lastTimestampRef.current = timestamp;
    updateFn(deltaMs);
    renderFn();
    requestAnimationFrame((ts) => gameLoop(ts, lastTimestampRef, updateFn, renderFn));
}

