/* Graphics and Rendering */

import { WIZARD_PIXEL_SIZE, WIZARD_BODY, PLAYER_CFG, PR, POWERUP_TYPES, V_W, V_H } from './config.js';
import { hexToRgb, rgbArrayToString } from './utils.js';

let animationFrame = 0;

// Pixel limb renderer
const drawLimb = (c, x1, y1, x2, y2, w, col, leg) => {
    const dx = x2 - x1, dy = y2 - y1, n = Math.floor(Math.sqrt(dx * dx + dy * dy) / 3);
    c.fillStyle = col;
    for (let i = 0; i < n; i++) {
        const t = i / n, px = Math.round(x1 + dx * t), py = Math.round(y1 + dy * t);
        c.fillRect(px - w / 2, py - w / 2, w, w);
    }
    const j = w + 2;
    c.fillRect(Math.round(x1 - j / 2), Math.round(y1 - j / 2), j, j);
    const s = leg ? w + 4 : w + 2;
    c.fillStyle = leg ? '#654321' : '#FFDAB9';
    c.fillRect(Math.round(x2 - s / 2), Math.round(y2 - s / 2), s, s);
};

export function drawPixelWizard(c, x, y, s, f, col, vx, vy, wx, wy) {
    const ps = WIZARD_PIXEL_SIZE * s,
          bw = WIZARD_BODY[0].length * ps,
          bh = WIZARD_BODY.length * ps,
          sy = y - bh * 0.65,
          hy = y - bh * 0.15;
    const sw = Math.sin(animationFrame * 0.15) * Math.abs(vx),
          asw = Math.sin(animationFrame * 0.15 + Math.PI) * Math.abs(vx) * 5;
    const lx = x - 6, rx = x + 6, fy = y + 18, sl = x - 8, sr = x + 8;
    c.save();
    drawLimb(c, lx, hy, lx + sw * 6, fy, 5, col, 1);
    drawLimb(c, rx, hy, rx - sw * 6, fy, 5, col, 1);
    drawLimb(c, f ? sr : sl, sy, (f ? sr : sl) + asw, sy + 15, 4, col, 0);
    c.translate(x, y);
    if (f) c.scale(-1, 1);
    const C = ['', '#000', col, '#FFF', '#4B0082', '#FFDAB9', '#B0B0B0', '#FFD700', '', '#FFD700'];
    WIZARD_BODY.forEach((row, r) => row.forEach((p, i) => {
        if (p) {
            c.fillStyle = C[p];
            c.fillRect(-bw / 2 + i * ps, -bh + r * ps, ps, ps);
        }
    }));
    c.restore();
    drawLimb(c, f ? sl : sr, sy, wx, wy, 4, col, 0);
}

export function drawPixelWand(ctx, x, y, rotation, color) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    
    // Wand stick (brown/wood)
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(-2, 0, 4, 16);
    
    // Wand tip (glowing star)
    ctx.fillStyle = color;
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
        const angle = (i * 4 * Math.PI / 5) - Math.PI / 2;
        const radius = i % 2 === 0 ? 6 : 3;
        const px = Math.cos(angle) * radius;
        const py = Math.sin(angle) * radius - 2;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    
    // Glow effect
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.beginPath();
    ctx.arc(0, -2, 3, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
}

export function incrementAnimationFrame() {
    animationFrame++;
}

// Cache background pattern for performance
let backgroundCache = null;

function drawStaticBackground(ctx, canvas, V_W, V_H) {
    // Check if we need to regenerate cache
    if (!backgroundCache || backgroundCache.width !== canvas.width || backgroundCache.height !== canvas.height) {
        backgroundCache = document.createElement('canvas');
        backgroundCache.width = canvas.width;
        backgroundCache.height = canvas.height;
        const bgCtx = backgroundCache.getContext('2d');
        
        // Create dark cave-like gradient background
        const gradient = bgCtx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, '#0a0a1a');  // Very dark blue-black at top
        gradient.addColorStop(0.3, '#1a1a2e');  // Dark blue-gray
        gradient.addColorStop(0.6, '#16213e');  // Slightly lighter
        gradient.addColorStop(1, '#0f1419');    // Dark at bottom
        
        bgCtx.fillStyle = gradient;
        bgCtx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Add subtle cave wall textures/stalactites in background (very faint)
        bgCtx.globalAlpha = 0.15;
        bgCtx.fillStyle = '#2a2a3a';
        
        // Draw some subtle vertical "cave wall" patterns
        const wallCount = Math.floor(canvas.width / 200);
        for (let i = 0; i < wallCount; i++) {
            const x = (canvas.width / (wallCount + 1)) * (i + 1);
            bgCtx.beginPath();
            bgCtx.moveTo(x, 0);
            
            // Create wavy cave wall pattern
            for (let y = 0; y < canvas.height; y += 10) {
                const offset = Math.sin((y / 50) + (i * 2)) * 15;
                bgCtx.lineTo(x + offset, y);
            }
            bgCtx.lineTo(x, canvas.height);
            bgCtx.lineTo(x - 30, canvas.height);
            
            for (let y = canvas.height; y > 0; y -= 10) {
                const offset = Math.sin((y / 50) + (i * 2)) * 15;
                bgCtx.lineTo(x - 30 + offset, y);
            }
            bgCtx.closePath();
            bgCtx.fill();
        }
        
        // Add some very subtle distant stalactites/stalagmites
        bgCtx.globalAlpha = 0.08;
        bgCtx.fillStyle = '#1a1a2a';
        for (let i = 0; i < 20; i++) {
            const x = (canvas.width / 21) * (i + 1);
            const height = 40 + Math.sin(i) * 20;
            const y = Math.random() > 0.5 ? 0 : canvas.height - height;
            
            bgCtx.beginPath();
            bgCtx.moveTo(x, y);
            bgCtx.lineTo(x - 10, y + (y === 0 ? height : -height));
            bgCtx.lineTo(x + 10, y + (y === 0 ? height : -height));
            bgCtx.closePath();
            bgCtx.fill();
        }
        
        bgCtx.globalAlpha = 1.0;
    }
    
    // Draw cached background (no transform, so it stays static)
    ctx.drawImage(backgroundCache, 0, 0);
}

export function render(ctx, canvas, cam, viewScale, world, players, myId, orbs, particles, pickups) {
    if (!ctx || !canvas || canvas.width === 0 || canvas.height === 0) return viewScale;
    
    // Draw static background first (no camera transform)
    drawStaticBackground(ctx, canvas, V_W, V_H);
    
    // Use fixed reference size (original 1920x1080) for consistent zoom level
    // This ensures the player sees the same relative area regardless of world size
    const REF_W = 1920, REF_H = 1080;
    const newViewScale = Math.min(canvas.width / REF_W, canvas.height / REF_H);

    ctx.save();
    ctx.translate(-cam.x, -cam.y);   // camera offset

    // Static bodies - voxel terrain
    world.bodies.filter(b => b.isStatic).forEach(b => {
        if (b.voxelTex) {
            ctx.drawImage(b.voxelTex, b.position.x - b.voxelTex.width / 2, b.position.y - b.voxelTex.height / 2);
        } else {
            // Fallback for bodies without voxel texture
            const w = b.bounds.max.x - b.bounds.min.x, h = b.bounds.max.y - b.bounds.min.y;
            ctx.fillStyle = '#666';
            ctx.fillRect(b.position.x - w / 2, b.position.y - h / 2, w, h);
        }
    });

    // Pickups - with rarity colors
    pickups.forEach(p => {
        const { body, typeKey } = p;
        const powerup = POWERUP_TYPES[typeKey];
        if (!powerup) return;
        
        const color = powerup.rarity || '#ff0';
        const isGlowing = powerup.glowing || false;
        
        // Glow effect for legendary items
        if (isGlowing) {
            ctx.shadowBlur = 20;
            ctx.shadowColor = color;
        }
        
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(body.position.x, body.position.y, 12, 0, Math.PI * 2);
        ctx.fill();
        
        // Gold border for legendary
        if (isGlowing) {
            ctx.strokeStyle = '#ffd700';
            ctx.lineWidth = 2;
            ctx.stroke();
        }
        
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#fff';
        ctx.font = '11px MedievalSharp, cursive';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(powerup.name, body.position.x, body.position.y - 18);
        
        // Category text below name
        if (powerup.category) {
            ctx.fillStyle = '#c9a9dd';
            ctx.font = '9px MedievalSharp, cursive';
            ctx.fillText(powerup.category, body.position.x, body.position.y + 20);
        }
    });

    // Orbs – neon glow with shadows
    orbs.forEach(orb => {
        const radius = orb.circleRadius || PLAYER_CFG.orbRadius;
        const lifeRatio = orb.life / PLAYER_CFG.orbLifeFrames;
        const rgb = hexToRgb(orb.render.fillStyle);
        const rgbStr = rgbArrayToString(rgb);

        // Shadow glow effect
        if (orb.isRPG) {
            ctx.shadowBlur = 30;
            ctx.shadowColor = '#ff6600';
        } else {
            ctx.shadowBlur = 25;
            ctx.shadowColor = orb.render.fillStyle;
        }

        // Outer colored halo
        const haloGrad = ctx.createRadialGradient(
            orb.position.x, orb.position.y, radius,
            orb.position.x, orb.position.y, radius * 2.5);
        haloGrad.addColorStop(0, `rgba(${rgbStr},${0.3 * lifeRatio})`);
        haloGrad.addColorStop(1, `rgba(${rgbStr},0)`);

        ctx.fillStyle = haloGrad;
        ctx.beginPath();
        ctx.arc(orb.position.x, orb.position.y, radius * 2.5, 0, Math.PI * 2);
        ctx.fill();

        // Main bullet color
        ctx.fillStyle = orb.render.fillStyle;
        ctx.beginPath();
        ctx.arc(orb.position.x, orb.position.y, radius, 0, Math.PI * 2);
        ctx.fill();

        // Bright white core
        const coreGrad = ctx.createRadialGradient(
            orb.position.x, orb.position.y, 0,
            orb.position.x, orb.position.y, radius);
        coreGrad.addColorStop(0, `rgba(255,255,255,${0.9 * lifeRatio})`);
        coreGrad.addColorStop(0.4, `rgba(255,255,255,${0.6 * lifeRatio})`);
        coreGrad.addColorStop(1, `rgba(255,255,255,0)`);

        ctx.fillStyle = coreGrad;
        ctx.beginPath();
        ctx.arc(orb.position.x, orb.position.y, radius * 0.5, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.shadowBlur = 0;
    });

    // Particles - optimized with viewport culling and batch rendering
    const viewLeft = cam.x;
    const viewRight = cam.x + canvas.width / viewScale;
    const viewTop = cam.y;
    const viewBottom = cam.y + canvas.height / viewScale;
    
    // Separate particles by type for batch rendering
    const fireParticles = [];
    const smokeParticles = [];
    const normalParticles = [];
    
    particles.forEach(p => {
        const px = p.position.x;
        const py = p.position.y;
        
        // Viewport culling - only render visible particles
        if (px < viewLeft - 100 || px > viewRight + 100 || 
            py < viewTop - 100 || py > viewBottom + 100) {
            return;
        }
        
        if (p.isGlowing) {
            fireParticles.push(p);
        } else if (p.isSmoke) {
            smokeParticles.push(p);
        } else {
            normalParticles.push(p);
        }
    });
    
    // Render fire particles (with glow)
    if (fireParticles.length > 0) {
        ctx.shadowBlur = 20;
        fireParticles.forEach(p => {
            ctx.shadowColor = p.render.fillStyle;
            const radius = p.circleRadius || ((p.bounds.max.x - p.bounds.min.x) / 2);
            ctx.fillStyle = p.render.fillStyle;
            ctx.beginPath();
            ctx.arc(p.position.x, p.position.y, radius, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.shadowBlur = 0;
    }
    
    // Render smoke particles (with alpha)
    if (smokeParticles.length > 0) {
        smokeParticles.forEach(p => {
            const alpha = p.maxLife ? (p.life / p.maxLife) * 0.4 : (p.life / 120) * 0.4;
            ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
            const radius = p.circleRadius || ((p.bounds.max.x - p.bounds.min.x) / 2);
            ctx.fillStyle = p.render.fillStyle;
            ctx.beginPath();
            ctx.arc(p.position.x, p.position.y, radius, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.globalAlpha = 1.0;
    }
    
    // Render normal particles (batch fill)
    if (normalParticles.length > 0) {
        normalParticles.forEach(p => {
            const radius = p.circleRadius || ((p.bounds.max.x - p.bounds.min.x) / 2);
            ctx.fillStyle = p.render.fillStyle;
            ctx.beginPath();
            ctx.arc(p.position.x, p.position.y, radius, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    // Players
    Object.entries(players).forEach(([id, p]) => {
        const { x, y } = p.body.position;
        
        // Get player size multiplier (for tank power-ups)
        const sizeMul = p.playerSizeMultiplier || 1.0;
        const effectiveRadius = p.effectivePlayerRadius || PR;
        const wizW = PR * 2.8 * sizeMul, wizH = PR * 4.2 * sizeMul;

        // Calculate wand position (same point we fire from) - scale with size
        const handX = x + Math.cos(p.ang) * effectiveRadius * 1.2 + (p.dir === 1 ? effectiveRadius * 1.2 : -effectiveRadius * 1.2);
        const handY = y + Math.sin(p.ang) * effectiveRadius * 1.2 + (effectiveRadius * 0.5 - (effectiveRadius * 4.2 - effectiveRadius) / 2 + PLAYER_CFG.wandDownShift);

        drawPixelWizard(ctx, x, y, sizeMul, p.dir === -1, p.color, p.body.velocity.x, p.body.velocity.y, handX, handY);
        
        drawPixelWand(ctx, handX, handY, p.ang + Math.PI / 4, p.color);

        // Health bar (positioned above wizard) - scale with player size
        const barW = PLAYER_CFG.healthBarWidth * sizeMul;
        const barH = PLAYER_CFG.healthBarHeight * sizeMul;
        const barY = y - wizH - 5; // Above wizard
        const healthPct = players[id].health / players[id].maxHealth;
        
        // Background
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(x - barW / 2, barY, barW, barH);
        
        // Health fill (green to red gradient)
        const healthColor = healthPct > 0.5 ? `rgb(${255 * (1 - healthPct) * 2},255,0)` : `rgb(255,${255 * healthPct * 2},0)`;
        ctx.fillStyle = healthColor;
        ctx.fillRect(x - barW / 2, barY, barW * healthPct, barH);
        
        // Border
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.strokeRect(x - barW / 2, barY, barW, barH);
        
        // Local‑player label
        if (id === myId) {
            ctx.fillStyle = '#fff';
            ctx.font = '12px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('YOU', x, barY - 4);
        }
    });

    ctx.restore();   // end camera transform
    
    return newViewScale;
}

