/* Orb/Bullet Firing */

import { PLAYER_CFG, POWERUP_TYPES, POWERUP_CATEGORY, COLLISION_FILTERS, PR } from './config.js';
import { playFireSound, isToneStarted } from './audio.js';

export function fireOrb(world, players, myId, orbs, mouse, viewScale, broadcastOrb) {
    if (!players[myId]) return;
    const p = players[myId];

    // Start with base values
    let curCooldown = PLAYER_CFG.fireCooldown;
    let curRadius = PLAYER_CFG.orbRadius;
    let curSpeed = PLAYER_CFG.orbSpeed;
    let pelletCount = 1;
    let damageMultiplier = 1.0;

    // Apply stacked modifiers
    const powerUps = p.activePowerUps;
    for (const key in powerUps) {
        const pu = powerUps[key];
        const cfg = POWERUP_TYPES[key];
        if (!cfg) continue;
        const n = pu.stacks;                     // number of stacks

        // Fire rate modifiers (cooldown reduction) - percentage based
        if (cfg.fireRatePercent) {
            const multiplier = 1 + (cfg.fireRatePercent / 100);
            curCooldown /= Math.pow(multiplier, n);
        }
        if (cfg.cooldownMul) {
            curCooldown *= Math.pow(cfg.cooldownMul, n);
        }
        
        // Radius and speed modifiers
        // Tank category radiusMul affects player size, not bullet size - skip for bullets
        if (cfg.radiusMul && cfg.category !== POWERUP_CATEGORY.TANK) {
            curRadius *= Math.pow(cfg.radiusMul, n);
        }
        if (cfg.speedMul) curSpeed *= Math.pow(cfg.speedMul, n);
        
        // Damage multipliers - percentage based
        if (cfg.damagePercent) {
            const multiplier = 1 + (cfg.damagePercent / 100);
            damageMultiplier *= Math.pow(multiplier, n);
        }

        // Pellet count modifiers
        // Original buckshot replaces base pellet count
        if (cfg.pellets) {
            pelletCount = Math.max(pelletCount, cfg.pellets * n);
        }
        // Extra pellets add to existing count
        if (cfg.extraPellets) {
            pelletCount += cfg.extraPellets * n;
        }
    }
    
    // Ensure at least 1 pellet
    if (pelletCount < 1) pelletCount = 1;

    // Wand tip (same maths as rendering) - account for player size
    const effectiveRadius = p.effectivePlayerRadius || PR;
    const handX = p.body.position.x + Math.cos(p.ang) * effectiveRadius * 1.2 + (p.dir === 1 ? effectiveRadius * 1.2 : -effectiveRadius * 1.2);
    const handY = p.body.position.y + Math.sin(p.ang) * effectiveRadius * 1.2 + (effectiveRadius * 0.5 - (effectiveRadius * 4.2 - effectiveRadius) / 2 + PLAYER_CFG.wandDownShift);

    // Get base time for sound scheduling once
    const baseSoundTime = isToneStarted() ? Tone.now() : null;
    
    // Play sound once for all pellets
    playFireSound(curRadius, curSpeed, curCooldown, 0, baseSoundTime);
    
    for (let i = 0; i < pelletCount; i++) {
        const spread = (pelletCount === 1) ? 0 : (i - (pelletCount - 1) / 2) * 0.12;
        const angle = p.ang + spread;

        // Calculate damage based on size and speed, then apply damage multiplier
        const baseDamage = (curRadius / PLAYER_CFG.orbRadius) * (curSpeed / PLAYER_CFG.orbSpeed) * 10;
        const damage = baseDamage * damageMultiplier;
        
        // Determine base restitution
        const baseRestitution = powerUps['Bouncy'] ? 0.9 : 0.2;
        
        const orb = Matter.Bodies.circle(handX, handY, curRadius, {
            restitution: baseRestitution,
            frictionAir: 0.01,
            label: 'orb',
            render: { fillStyle: p.color },
            isSensor: false,
            collisionFilter: COLLISION_FILTERS.orb
        });
        orb.isOrb = true;
        orb.ownerId = myId;
        orb.life = PLAYER_CFG.orbLifeFrames;
        orb.damage = damage;
        orb.isRPG = powerUps['RPG'] ? true : false; // mark as RPG if player has RPG power-up
        orb.isBouncy = powerUps['Bouncy'] ? true : false; // mark as bouncy if player has Bouncy power-up
        orb.isHoming = powerUps['Homing'] ? true : false; // mark as homing if player has Homing power-up
        
        Matter.Body.setVelocity(orb, { x: Math.cos(angle) * curSpeed, y: Math.sin(angle) * curSpeed });
        Matter.World.add(world, orb);
        orbs.push(orb);

        // Broadcast to peers
        if (broadcastOrb) {
            broadcastOrb({
                x: handX,
                y: handY,
                radius: curRadius,
                speed: curSpeed,
                angle: angle,
                colour: p.color,
                life: PLAYER_CFG.orbLifeFrames,
                damage: damage,
                isRPG: powerUps['RPG'] ? true : false,
                isBouncy: powerUps['Bouncy'] ? true : false,
                isHoming: powerUps['Homing'] ? true : false
            });
        }
    }
    
    return curCooldown;
}

