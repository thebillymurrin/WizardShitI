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

export function drawPixelWizard(c, x, y, s, f, col, vx, vy, wx, wy, isCrouching = false) {
    const ps = WIZARD_PIXEL_SIZE * s,
          bw = WIZARD_BODY[0].length * ps,
          bh = WIZARD_BODY.length * ps,
          sy = y - bh * 0.65,
          hy = y - bh * 0.15;
    const sw = Math.sin(animationFrame * 0.15) * Math.abs(vx),
          asw = Math.sin(animationFrame * 0.15 + Math.PI) * Math.abs(vx) * 5;
    const lx = x - 6, rx = x + 6, fy = y + 18, sl = x - 8, sr = x + 8; // fy is ground level (feet position)
    
    // Crouch visual - move body down, scrunch legs only
    const crouchBodyOffset = isCrouching ? 8 : 0; // Move body sprite down a bit when crouching
    
    // Feet must stay at the SAME absolute ground level (fy) regardless of crouching
    // When body moves down, legs extend upward to compensate
    const actualFeetY = fy; // Always use original ground level
    
    c.save();
    // Legs - scrunch when crouching (compress vertically, keep feet at ground level)
    if (isCrouching) {
        // Keep feet at original ground level (fy), compress legs upward
        const legCompression = 0.5;
        const originalLegHeight = fy - hy; // Original leg height (from hip to feet)
        const crouchedHipY = hy + crouchBodyOffset; // Hip position when crouching (moved down)
        const crouchedLegHeight = actualFeetY - crouchedHipY; // Actual leg height needed
        
        // Note: drawLimb draws a foot at (x2, y2) with size s = w+4 = 9, so it extends s/2 = 4.5 below y2
        // We want the bottom of the foot to be at ground level (fy)
        // So we anchor at fy - s/2, then y2=0 means foot center is at fy - s/2, bottom is at fy
        const footSize = 5 + 4; // w=5 for legs, plus 4 = 9 total foot size
        const footOffset = footSize / 2; // 4.5 pixels - half foot extends below center
        
        // Left leg - scrunched, feet stay at actualFeetY (ground level)
        c.save();
        c.translate(lx, actualFeetY - footOffset); // Anchor so foot bottom aligns with ground
        c.scale(1, legCompression); // Compress vertically upward from feet
        // Draw leg from hip position (negative Y) to feet (0)
        const hipOffset = -(crouchedLegHeight / legCompression);
        drawLimb(c, 0, hipOffset, sw * 6, 0, 5, col, 1);
        c.restore();
        
        // Right leg - scrunched, feet stay at actualFeetY (ground level)
        c.save();
        c.translate(rx, actualFeetY - footOffset); // Anchor so foot bottom aligns with ground
        c.scale(1, legCompression); // Compress vertically upward from feet
        drawLimb(c, 0, hipOffset, -sw * 6, 0, 5, col, 1);
        c.restore();
    } else {
        // Normal legs - fy already represents ground level (bottom of feet)
        drawLimb(c, lx, hy, lx + sw * 6, fy, 5, col, 1);
        drawLimb(c, rx, hy, rx - sw * 6, fy, 5, col, 1);
    }
    // Arms - move down with body when crouching
    drawLimb(c, f ? sr : sl, sy + crouchBodyOffset, (f ? sr : sl) + asw, sy + 15 + crouchBodyOffset, 4, col, 0);
    
    // Body - move down slightly when crouching (NO compression, just position shift)
    c.translate(x, y + crouchBodyOffset);
    if (f) c.scale(-1, 1);
    const C = ['', '#000', col, '#FFF', '#4B0082', '#FFDAB9', '#B0B0B0', '#FFD700', '', '#FFD700'];
    WIZARD_BODY.forEach((row, r) => row.forEach((p, i) => {
        if (p) {
            c.fillStyle = C[p];
            c.fillRect(-bw / 2 + i * ps, -bh + r * ps, ps, ps);
        }
    }));
    c.restore();
    // Wand arm - move down with body when crouching
    drawLimb(c, f ? sl : sr, sy + crouchBodyOffset, wx, wy, 4, col, 0);
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

function drawStaticBackground(ctx, canvas, V_W, V_H, theme = 'default') {
    // Check if we need to regenerate cache (including theme change)
    const cacheKey = `${canvas.width}x${canvas.height}_${theme}`;
    if (!backgroundCache || backgroundCache.cacheKey !== cacheKey) {
        backgroundCache = document.createElement('canvas');
        backgroundCache.width = canvas.width;
        backgroundCache.height = canvas.height;
        backgroundCache.cacheKey = cacheKey;
        const bgCtx = backgroundCache.getContext('2d');
        
        if (theme === 'clouds') {
            // Sky blue gradient background for clouds theme
            const gradient = bgCtx.createLinearGradient(0, 0, 0, canvas.height);
            gradient.addColorStop(0, '#87CEEB');  // Sky blue at top
            gradient.addColorStop(0.5, '#B0E0E6');  // Powder blue in middle
            gradient.addColorStop(1, '#87CEEB');    // Sky blue at bottom
            
            bgCtx.fillStyle = gradient;
            bgCtx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Add subtle cloud-like shapes in background for clouds theme
            bgCtx.globalAlpha = 0.3;
            bgCtx.fillStyle = '#FFFFFF';
            
            // Draw some fluffy cloud shapes
            for (let i = 0; i < 15; i++) {
                const x = (canvas.width / 16) * (i + 1);
                const y = canvas.height * (0.2 + Math.sin(i) * 0.3);
                const size = 60 + Math.sin(i * 2) * 30;
                
                bgCtx.beginPath();
                bgCtx.arc(x, y, size, 0, Math.PI * 2);
                bgCtx.arc(x + size * 0.6, y, size * 0.8, 0, Math.PI * 2);
                bgCtx.arc(x - size * 0.6, y, size * 0.8, 0, Math.PI * 2);
                bgCtx.arc(x, y - size * 0.5, size * 0.7, 0, Math.PI * 2);
                bgCtx.fill();
            }
            
            bgCtx.globalAlpha = 1.0;
        } else if (theme === 'space') {
            // Deep space gradient background - dark purple/black with stars
            const gradient = bgCtx.createLinearGradient(0, 0, 0, canvas.height);
            gradient.addColorStop(0, '#0a0520');  // Very dark purple at top
            gradient.addColorStop(0.3, '#1a0d33');  // Dark purple
            gradient.addColorStop(0.6, '#2d1a4d');  // Medium purple
            gradient.addColorStop(1, '#1a0d33');    // Dark purple at bottom
            
            bgCtx.fillStyle = gradient;
            bgCtx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Add stars (various sizes and brightness)
            bgCtx.fillStyle = '#FFFFFF';
            for (let i = 0; i < 200; i++) {
                const x = (i * 137.5) % canvas.width; // Use prime number for distribution
                const y = (i * 203.7) % canvas.height;
                const brightness = Math.random();
                const size = brightness > 0.9 ? 2 : (brightness > 0.7 ? 1.5 : 1);
                
                bgCtx.globalAlpha = brightness * 0.8 + 0.2; // 0.2-1.0 opacity
                bgCtx.beginPath();
                bgCtx.arc(x, y, size, 0, Math.PI * 2);
                bgCtx.fill();
            }
            
            // Add some brighter stars
            bgCtx.globalAlpha = 0.9;
            bgCtx.fillStyle = '#B0E0E6'; // Light blue-white
            for (let i = 0; i < 30; i++) {
                const x = (i * 421.3) % canvas.width;
                const y = (i * 613.7) % canvas.height;
                const size = 1.5 + Math.random() * 1;
                
                bgCtx.beginPath();
                bgCtx.arc(x, y, size, 0, Math.PI * 2);
                bgCtx.fill();
            }
            
            // Add nebula-like clouds
            bgCtx.globalAlpha = 0.15;
            bgCtx.fillStyle = '#6B46C1'; // Purple nebula
            for (let i = 0; i < 8; i++) {
                const x = (canvas.width / 9) * (i + 1);
                const y = canvas.height * (0.3 + Math.sin(i) * 0.4);
                const size = 150 + Math.sin(i * 2) * 80;
                
                bgCtx.beginPath();
                bgCtx.arc(x, y, size, 0, Math.PI * 2);
                bgCtx.fill();
            }
            
            // Add blue nebula clouds
            bgCtx.globalAlpha = 0.12;
            bgCtx.fillStyle = '#3B82F6'; // Blue nebula
            for (let i = 0; i < 6; i++) {
                const x = (canvas.width / 7) * (i + 1);
                const y = canvas.height * (0.5 + Math.cos(i * 1.5) * 0.3);
                const size = 120 + Math.cos(i * 1.8) * 60;
                
                bgCtx.beginPath();
                bgCtx.arc(x, y, size, 0, Math.PI * 2);
                bgCtx.fill();
            }
            
            bgCtx.globalAlpha = 1.0;
        } else if (theme === 'volcano') {
            // Lava/volcano gradient background - deep red/orange from bottom to top
            const gradient = bgCtx.createLinearGradient(0, 0, 0, canvas.height);
            gradient.addColorStop(0, '#1a0a0a');  // Very dark red at top (ceiling)
            gradient.addColorStop(0.3, '#2d0f0f');  // Dark red
            gradient.addColorStop(0.6, '#4a1a1a');  // Medium dark red
            gradient.addColorStop(0.8, '#8b3a1a');  // Orange-red (lava glow)
            gradient.addColorStop(1, '#cc5500');    // Bright orange-red at bottom (lava pool)
            
            bgCtx.fillStyle = gradient;
            bgCtx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Add glowing lava effects at the bottom
            bgCtx.globalAlpha = 0.4;
            bgCtx.fillStyle = '#ff6600';
            
            // Draw flowing lava pools at bottom
            for (let i = 0; i < 8; i++) {
                const x = (canvas.width / 9) * (i + 1);
                const y = canvas.height - 50 - Math.sin(i * 0.8) * 30;
                const width = 100 + Math.sin(i) * 40;
                const height = 40 + Math.cos(i * 1.2) * 20;
                
                bgCtx.beginPath();
                bgCtx.ellipse(x, y, width / 2, height / 2, 0, 0, Math.PI * 2);
                bgCtx.fill();
            }
            
            // Add glowing embers floating upward
            bgCtx.globalAlpha = 0.3;
            bgCtx.fillStyle = '#ffaa00';
            for (let i = 0; i < 20; i++) {
                const x = (canvas.width / 21) * (i + 1);
                const y = canvas.height * (0.7 + Math.sin(i * 0.5) * 0.2);
                const size = 3 + Math.sin(i) * 2;
                
                bgCtx.beginPath();
                bgCtx.arc(x, y, size, 0, Math.PI * 2);
                bgCtx.fill();
            }
            
            // Add heat distortion/wavy lines near lava
            bgCtx.globalAlpha = 0.2;
            bgCtx.strokeStyle = '#ff8800';
            bgCtx.lineWidth = 2;
            for (let i = 0; i < 5; i++) {
                const y = canvas.height - 100 - i * 30;
                bgCtx.beginPath();
                bgCtx.moveTo(0, y);
                for (let x = 0; x < canvas.width; x += 10) {
                    const offset = Math.sin((x / 50) + (i * 0.5)) * 5;
                    bgCtx.lineTo(x, y + offset);
                }
                bgCtx.stroke();
            }
            
            bgCtx.globalAlpha = 1.0;
        } else {
            // Create dark cave-like gradient background (default)
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
    }
    
    // Draw cached background (no transform, so it stays static)
    ctx.drawImage(backgroundCache, 0, 0);
}

export function render(ctx, canvas, cam, viewScale, world, players, myId, orbs, particles, pickups) {
    if (!ctx || !canvas || canvas.width === 0 || canvas.height === 0) return viewScale;
    
    // Draw static background first (no camera transform)
    const theme = (window.gameState && window.gameState.theme) || 'default';
    drawStaticBackground(ctx, canvas, V_W, V_H, theme);
    
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
        // Physics particles use Matter.js body position
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
        // Body position already shifts down when crouching, so wand follows automatically
        const handX = x + Math.cos(p.ang) * effectiveRadius * 1.2 + (p.dir === 1 ? effectiveRadius * 1.2 : -effectiveRadius * 1.2);
        const handY = y + Math.sin(p.ang) * effectiveRadius * 1.2 + (effectiveRadius * 0.5 - (effectiveRadius * 4.2 - effectiveRadius) / 2 + PLAYER_CFG.wandDownShift);

        // Visual crouch - pass crouch state to rendering function
        drawPixelWizard(ctx, x, y, sizeMul, p.dir === -1, p.color, p.body.velocity.x, p.body.velocity.y, handX, handY, p.isCrouching);
        
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

