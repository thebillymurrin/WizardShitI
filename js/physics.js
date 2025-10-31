/* Physics and Level Generation */

import { V_W, V_H, PLAYER_CFG, COLLISION_FILTERS, VOXEL_CFG, PARTICLE_SETTINGS } from './config.js';

// Helper to create static wall bodies with voxel texture
export function createStaticWall(x, y, width, height, options = {}, theme = 'default') {
    const body = Matter.Bodies.rectangle(x, y, width, height, {
        isStatic: true,
        collisionFilter: COLLISION_FILTERS.wall,
        ...options
    });
    
    // Pre-render voxel texture to canvas
    const vs = 8, cols = Math.ceil(width / vs), rows = Math.ceil(height / vs);
    const cv = document.createElement('canvas');
    cv.width = width;
    cv.height = height;
    const c = cv.getContext('2d');
    
    for (let r = 0; r < rows; r++) {
        for (let i = 0; i < cols; i++) {
            const vx = i * vs, vy = r * vs;
            const seed = ((x + vx) * 73856093) ^ ((y + vy) * 19349663);
            const rand = ((seed * 2654435761) % 1000) / 1000;
            
            if (theme === 'clouds') {
                // White cloud-like bricks with slight variation
                const white = 240 + Math.floor(rand * 15); // 240-255 for white with slight variation
                c.fillStyle = `rgb(${white},${white},${white})`;
            } else if (theme === 'volcano') {
                // Volcanic stone bricks - dark red/orange/brown tones
                const hue = Math.floor(rand * 30); // 0-30 for red-orange range
                const red = 80 + Math.floor(rand * 40); // 80-120 dark red
                const green = 30 + Math.floor(rand * 30); // 30-60 dark orange/brown
                const blue = 20 + Math.floor(rand * 20); // 20-40 very dark
                c.fillStyle = `rgb(${red},${green},${blue})`;
            } else if (theme === 'space') {
                // Space/cosmic bricks - dark purple/blue with occasional sparkles
                if (rand > 0.85) {
                    // Occasional bright sparkle (15% chance)
                    const sparkle = 200 + Math.floor(rand * 55); // 200-255 bright
                    c.fillStyle = `rgb(${sparkle},${sparkle},${sparkle})`;
                } else {
                    // Dark cosmic purple/blue
                    const red = 40 + Math.floor(rand * 30); // 40-70 dark purple
                    const green = 30 + Math.floor(rand * 25); // 30-55 dark blue-purple
                    const blue = 60 + Math.floor(rand * 40); // 60-100 dark blue
                    c.fillStyle = `rgb(${red},${green},${blue})`;
                }
            } else {
                // Default grey bricks
                const grey = 60 + Math.floor(rand * 60);
                c.fillStyle = `rgb(${grey},${grey},${grey})`;
            }
            c.fillRect(vx, vy, vs - 1, vs - 1);
        }
    }
    body.voxelTex = cv;
    return body;
}

// Particle pool for object reuse
const particlePool = [];
const MAX_POOL_SIZE = 200;

// Helper to create and add a particle (with object pooling)
export function createParticle(x, y, size, angle, speed, life, fillStyle, type = null, world, particles) {
    // Don't create particles if simulation is disabled
    if (!PARTICLE_SETTINGS.simulateParticles) {
        return null;
    }
    
    const adjustedLife = Math.floor(life * PARTICLE_SETTINGS.particleDuration);
    
    // Remove oldest particles if we're at the cap (for performance)
    while (particles.length >= PARTICLE_SETTINGS.maxParticles) {
        const oldestParticle = particles[0]; // Oldest is first in array
        recycleParticle(oldestParticle, world, particles);
    }
    
    // Create physics-based particle
    let particle;
    
    // Try to reuse from pool
    if (particlePool.length > 0) {
        particle = particlePool.pop();
        // Reset particle properties and physics state
        Matter.Body.setPosition(particle, { x, y });
        Matter.Body.setVelocity(particle, { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed });
        Matter.Body.setAngularVelocity(particle, 0);
        // Update circle radius if changed
        if (particle.circleRadius !== size) {
            Matter.Body.scale(particle, size / particle.circleRadius, size / particle.circleRadius);
        }
        particle.circleRadius = size;
        particle.render.fillStyle = fillStyle;
        particle.life = adjustedLife;
        particle.isGlowing = type === 'fire';
        particle.isSmoke = type === 'smoke';
        particle.maxLife = adjustedLife;
    } else {
        // Create new particle as full physics body
        particle = Matter.Bodies.circle(x, y, size, {
            restitution: type === 'smoke' ? 0.1 : type === 'fire' ? 0.2 : 0.3,
            frictionAir: type === 'smoke' ? 0.02 : type === 'fire' ? 0.08 : 0.06,
            friction: 0.1,
            density: 0.001, // Light particles
            render: { fillStyle },
            // Particles can collide with walls but not with each other or players
            collisionFilter: { 
                category: 0x0010, // Particle category
                mask: COLLISION_FILTERS.wall.category // Can collide with walls
            }
        });
        particle.isParticle = true;
        particle.circleRadius = size;
        particle.life = adjustedLife;
        particle.maxLife = adjustedLife;
        if (type === 'fire') particle.isGlowing = true;
        if (type === 'smoke') particle.isSmoke = true;
    }
    
    // Set initial velocity for physics simulation
    Matter.Body.setVelocity(particle, {
        x: Math.cos(angle) * speed,
        y: Math.sin(angle) * speed
    });
    
    // Add to world for physics simulation
    Matter.World.add(world, particle);
    particles.push(particle);
    return particle;
}

// Return particle to pool instead of destroying
export function recycleParticle(particle, world, particles) {
    const index = particles.indexOf(particle);
    if (index > -1) {
        particles.splice(index, 1);
    }
    
    // Remove from world and return to physics pool
    if (particle && !particle.isVisual) {
        Matter.World.remove(world, particle);
        if (particlePool.length < MAX_POOL_SIZE) {
            particlePool.push(particle);
        }
    }
}

export function buildLevel(world, seededRandom, theme = 'default') {
    const TS = PLAYER_CFG.tileSize;
    const floorY = V_H - PLAYER_CFG.floorThickness * TS;
    const playableWidth = V_W - 2 * TS;
    const playableHeight = floorY - TS;
    
    // Helper functions - these use the seeded random
    const randInt = (min, max) => {
        return Math.floor(seededRandom() * (max - min + 1)) + min;
    };
    const randFloat = (min, max) => seededRandom() * (max - min) + min;
    
    // VOXEL CAVE GENERATION
    // Create a 2D grid for the cave (each cell is TS x TS)
    const gridWidth = Math.floor(V_W / TS);
    const gridHeight = Math.floor(playableHeight / TS);
    
    // Initialize grid - 1 = solid/wall, 0 = empty/air
    const grid = [];
    for (let y = 0; y < gridHeight; y++) {
        grid[y] = [];
        for (let x = 0; x < gridWidth; x++) {
            grid[y][x] = 1; // Start with all solid
        }
    }
    
    // Generate cave using cellular automata approach
    // Step 1: Random initial state (balanced for density and connectivity)
    const fillProbability = 0.55; // 55% solid initially (balanced)
    for (let y = 0; y < gridHeight; y++) {
        for (let x = 0; x < gridWidth; x++) {
            // Keep edges solid for boundaries
            if (x === 0 || x === gridWidth - 1 || y === 0 || y === gridHeight - 1) {
                grid[y][x] = 1;
            } else {
                grid[y][x] = seededRandom() < fillProbability ? 1 : 0;
            }
        }
    }
    
    // Step 2: Smooth using cellular automata rules (more iterations = denser)
    const smoothIterations = 5; // Increased from 4 to fill gaps
    for (let iter = 0; iter < smoothIterations; iter++) {
        const newGrid = [];
        for (let y = 0; y < gridHeight; y++) {
            newGrid[y] = [];
            for (let x = 0; x < gridWidth; x++) {
                // Count neighbors (including diagonals)
                let neighbors = 0;
                for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        const ny = y + dy;
                        const nx = x + dx;
                        if (ny >= 0 && ny < gridHeight && nx >= 0 && nx < gridWidth) {
                            if (grid[ny][nx] === 1) neighbors++;
                        } else {
                            neighbors++; // Count edges as walls
                        }
                    }
                }
                
                // Cellular automata rule: balanced threshold for moderate density
                // This creates cave-like structures with good connectivity
                if (neighbors >= 5) { // Balanced back to 5 for better connectivity
                    newGrid[y][x] = 1;
                } else {
                    newGrid[y][x] = 0;
                }
            }
        }
        for (let y = 0; y < gridHeight; y++) {
            for (let x = 0; x < gridWidth; x++) {
                grid[y][x] = newGrid[y][x];
            }
        }
    }
    
    // Step 3: Add vertical level travel tunnels on left and right walls FIRST
    // Left wall vertical tunnel
    const leftTunnelX = 1; // Inside the left boundary
    for (let y = 2; y < gridHeight - 2; y++) {
        grid[y][leftTunnelX] = 0;
        grid[y][leftTunnelX + 1] = 0;
        grid[y][leftTunnelX + 2] = 0;
        // Add horizontal platforms connecting to main area every few levels
        if (y % 15 === 0 || seededRandom() < 0.05) {
            for (let x = leftTunnelX + 3; x < Math.min(leftTunnelX + 20, gridWidth - 1); x++) {
                grid[y][x] = 0;
                grid[y - 1][x] = 0;
            }
        }
    }
    
    // Right wall vertical tunnel
    const rightTunnelX = gridWidth - 2; // Inside the right boundary
    for (let y = 2; y < gridHeight - 2; y++) {
        grid[y][rightTunnelX] = 0;
        grid[y][rightTunnelX - 1] = 0;
        grid[y][rightTunnelX - 2] = 0;
        // Add horizontal platforms connecting to main area every few levels
        if (y % 15 === 0 || seededRandom() < 0.05) {
            for (let x = rightTunnelX - 3; x > Math.max(rightTunnelX - 20, 0); x--) {
                grid[y][x] = 0;
                grid[y - 1][x] = 0;
            }
        }
    }
    
    // Bottom wall horizontal tunnel
    const bottomTunnelY = gridHeight - 2; // Inside the bottom boundary
    for (let x = 1; x < gridWidth - 1; x++) {
        grid[bottomTunnelY][x] = 0;
        grid[bottomTunnelY - 1][x] = 0;
        grid[bottomTunnelY - 2][x] = 0;
        // Add vertical platforms connecting to main area periodically
        if (x % 20 === 0 || seededRandom() < 0.05) {
            for (let y = bottomTunnelY - 3; y > Math.max(bottomTunnelY - 25, 2); y--) {
                grid[y][x] = 0;
                grid[y][x - 1] = 0;
                grid[y][x + 1] = 0;
            }
        }
    }
    
    // Connect bottom tunnel to left and right tunnels (complete the loop)
    // Left connection
    for (let x = 1; x < 5; x++) {
        for (let y = bottomTunnelY - 2; y <= bottomTunnelY; y++) {
            if (y >= 2 && y < gridHeight - 1) {
                grid[y][x] = 0;
            }
        }
    }
    // Right connection
    for (let x = gridWidth - 5; x < gridWidth - 1; x++) {
        for (let y = bottomTunnelY - 2; y <= bottomTunnelY; y++) {
            if (y >= 2 && y < gridHeight - 1) {
                grid[y][x] = 0;
            }
        }
    }
    
    // Step 4: Ensure connectivity - create main tunnel network (guaranteed paths)
    // Create tunnels at varied heights for less flat terrain
    const mainTunnelCount = randInt(4, 7); // More tunnels at different heights
    const tunnelYPositions = [];
    
    for (let t = 0; t < mainTunnelCount; t++) {
        // Create horizontal tunnels at varied heights (more vertical variation)
        const tunnelY = randInt(Math.floor(gridHeight * 0.1), Math.floor(gridHeight * 0.9));
        tunnelYPositions.push(tunnelY);
        
        // Vary tunnel widths for more interesting terrain
        const tunnelWidth = randInt(3, 5);
        
        // Clear horizontal path across the map with some height variation
        for (let x = 5; x < gridWidth - 5; x++) { // Leave space for side tunnels
            // Add slight vertical variation to tunnel path (less flat)
            const yOffset = Math.floor(Math.sin(x * 0.05 + t) * 2);
            const currentY = Math.max(2, Math.min(gridHeight - 3, tunnelY + yOffset));
            
            if (currentY >= 2 && currentY < gridHeight - 2) {
                grid[currentY][x] = 0;
                // Always clear adjacent rows for safe passage
                if (currentY - 1 >= 2) grid[currentY - 1][x] = 0;
                if (currentY + 1 < gridHeight - 2) grid[currentY + 1][x] = 0;
            }
        }
        
        // Connect to side tunnels
        for (let y = Math.max(2, tunnelY - 2); y <= Math.min(gridHeight - 3, tunnelY + 2); y++) {
            // Connect to left tunnel
            for (let x = 1; x < 5; x++) {
                if (y >= 2 && y < gridHeight - 2) {
                    grid[y][x] = 0;
                }
            }
            // Connect to right tunnel
            for (let x = gridWidth - 5; x < gridWidth - 1; x++) {
                if (y >= 2 && y < gridHeight - 2) {
                    grid[y][x] = 0;
                }
            }
        }
        
        // Connect to bottom tunnel if tunnel is near bottom
        if (tunnelY >= gridHeight - 15) {
            const connectX = randInt(Math.floor(gridWidth * 0.2), Math.floor(gridWidth * 0.8));
            for (let y = tunnelY; y <= gridHeight - 6; y++) {
                if (connectX >= 5 && connectX < gridWidth - 5) {
                    grid[y][connectX] = 0;
                    if (connectX - 1 >= 5) grid[y][connectX - 1] = 0;
                    if (connectX + 1 < gridWidth - 5) grid[y][connectX + 1] = 0;
                }
            }
        }
        
        // Add vertical connections between horizontal tunnels at random points
        if (t > 0) {
            const prevY = tunnelYPositions[t - 1];
            const minY = Math.min(tunnelY, prevY);
            const maxY = Math.max(tunnelY, prevY);
            // Multiple connection points for more vertical travel
            const connectPoints = randInt(2, 4);
            for (let cp = 0; cp < connectPoints; cp++) {
                const connectX = randInt(Math.floor(gridWidth * 0.2), Math.floor(gridWidth * 0.8));
                
                for (let y = minY; y <= maxY && y < gridHeight - 1; y++) {
                    if (connectX >= 5 && connectX < gridWidth - 5) {
                        grid[y][connectX] = 0;
                        // Clear adjacent for width
                        if (connectX - 1 >= 5) grid[y][connectX - 1] = 0;
                        if (connectX + 1 < gridWidth - 5) grid[y][connectX + 1] = 0;
                    }
                }
            }
        }
    }
    
    // Add additional smaller tunnels and vertical structures for variety (less flat)
    const extraTunnelCount = randInt(3, 6);
    for (let t = 0; t < extraTunnelCount; t++) {
        const tunnelY = randInt(2, gridHeight - 3);
        const tunnelWidth = randInt(3, 6);
        const startX = randInt(5, gridWidth - tunnelWidth - 5); // Avoid side tunnels
        
        // Add height variation to these tunnels
        for (let x = startX; x < startX + tunnelWidth && x < gridWidth - 5; x++) {
            const heightVar = Math.floor(Math.sin(x * 0.1) * 1.5);
            const currentY = Math.max(2, Math.min(gridHeight - 3, tunnelY + heightVar));
            
            if (currentY >= 2 && currentY < gridHeight - 2) {
                grid[currentY][x] = 0;
                // Clear adjacent for passable tunnels
                if (currentY - 1 >= 2 && seededRandom() < 0.6) grid[currentY - 1][x] = 0;
                if (currentY + 1 < gridHeight - 2 && seededRandom() < 0.6) grid[currentY + 1][x] = 0;
            }
        }
    }
    
    // Add vertical cliffs/platforms for more vertical terrain
    const verticalStructureCount = randInt(5, 10);
    for (let v = 0; v < verticalStructureCount; v++) {
        const structX = randInt(10, gridWidth - 10);
        const structHeight = randInt(8, 20);
        const structY = randInt(5, gridHeight - structHeight - 5);
        const structWidth = randInt(3, 6);
        
        // Create vertical structure (cliff/column)
        for (let y = structY; y < structY + structHeight && y < gridHeight - 2; y++) {
            for (let x = structX; x < structX + structWidth && x < gridWidth - 5; x++) {
                grid[y][x] = 1; // Solid structure
            }
        }
        // Clear space around it for navigation
        for (let y = structY; y < structY + structHeight && y < gridHeight - 2; y++) {
            if (structX - 1 >= 5) grid[y][structX - 1] = 0;
            if (structX + structWidth < gridWidth - 5) grid[y][structX + structWidth] = 0;
        }
    }
    
    // Step 5: Create some chambers at varied heights (less flat)
    const chamberCount = randInt(3, 6); // Moderate amount
    for (let c = 0; c < chamberCount; c++) {
        const chamberWidth = randInt(5, 9);
        const chamberHeight = randInt(5, 8);
        // Place chambers near main tunnels for connectivity
        const nearTunnelY = tunnelYPositions.length > 0 
            ? tunnelYPositions[randInt(0, Math.min(tunnelYPositions.length - 1, 2))]
            : randInt(Math.floor(gridHeight * 0.3), Math.floor(gridHeight * 0.7));
        const chamberY = Math.max(2, Math.min(gridHeight - chamberHeight - 2, nearTunnelY + randInt(-3, 3)));
        const chamberX = randInt(2, gridWidth - chamberWidth - 2);
        
        // Clear chamber area
        for (let y = chamberY; y < chamberY + chamberHeight && y < gridHeight - 1; y++) {
            for (let x = chamberX; x < chamberX + chamberWidth && x < gridWidth - 1; x++) {
                grid[y][x] = 0;
            }
        }
        
        // Ensure chamber connects to nearby tunnels (clear connection path)
        if (tunnelYPositions.length > 0) {
            const connectToY = tunnelYPositions[randInt(0, tunnelYPositions.length - 1)];
            const connectX = chamberX + Math.floor(chamberWidth / 2);
            const minY = Math.min(chamberY + Math.floor(chamberHeight / 2), connectToY);
            const maxY = Math.max(chamberY + Math.floor(chamberHeight / 2), connectToY);
            
            for (let y = minY; y <= maxY && y < gridHeight - 1; y++) {
                if (connectX >= 1 && connectX < gridWidth - 1) {
                    grid[y][connectX] = 0;
                    if (connectX - 1 >= 1) grid[y][connectX - 1] = 0;
                    if (connectX + 1 < gridWidth - 1) grid[y][connectX + 1] = 0;
                }
            }
        }
    }
    
    // Step 6: Add boundary walls (solid edges - side tunnels are already inside at x=1-3 and x=gridWidth-4 to gridWidth-2)
    for (let x = 0; x < gridWidth; x++) {
        grid[0][x] = 1; // Top
        grid[gridHeight - 1][x] = 1; // Bottom
    }
    for (let y = 0; y < gridHeight; y++) {
        grid[y][0] = 1; // Left outer boundary (tunnels are at x=1-3, so this doesn't block them)
        grid[y][gridWidth - 1] = 1; // Right outer boundary (tunnels are inside, so this doesn't block them)
    }
    
    // Step 7: Convert grid to voxel blocks
    // Optimize by merging adjacent blocks horizontally
    for (let y = 0; y < gridHeight; y++) {
        let blockStartX = -1;
        let blockWidth = 0;
        
        for (let x = 0; x <= gridWidth; x++) {
            if (x < gridWidth && grid[y][x] === 1) {
                if (blockStartX === -1) {
                    blockStartX = x;
                    blockWidth = 1;
                } else {
                    blockWidth++;
                }
            } else {
                if (blockStartX !== -1 && blockWidth > 0) {
                    // Create a merged block
                    const blockX = blockStartX * TS + (blockWidth * TS) / 2;
                    const blockY = TS + y * TS + TS / 2;
                    const blockW = blockWidth * TS;
                    
                    // Check if this is an edge wall (boundary)
                    const isEdgeWall = blockStartX === 0 || (blockStartX + blockWidth - 1) === gridWidth - 1 || 
                                      y === 0 || y === gridHeight - 1;
                    
                    if (blockY > TS && blockY < floorY) {
                        const wall = createStaticWall(blockX, blockY, blockW, TS, {}, theme);
                        if (isEdgeWall) {
                            wall.isVoxel = false; // Edge walls are indestructible
                        } else {
                            wall.isVoxel = true; // Mark as destructible voxel
                            wall.health = VOXEL_CFG.maxHealth; // Initialize health
                            wall.maxHealth = VOXEL_CFG.maxHealth;
                            wall.voxelData = { x: blockX, y: blockY, width: blockW, height: TS, theme }; // Store for regeneration
                        }
                        Matter.World.add(world, wall);
                    }
                    
                    blockStartX = -1;
                    blockWidth = 0;
                }
            }
        }
        
        // Handle block at end of row
        if (blockStartX !== -1 && blockWidth > 0) {
            const blockX = blockStartX * TS + (blockWidth * TS) / 2;
            const blockY = TS + y * TS + TS / 2;
            const blockW = blockWidth * TS;
            
            // Check if this is an edge wall (boundary)
            const isEdgeWall = blockStartX === 0 || (blockStartX + blockWidth - 1) === gridWidth - 1 || 
                              y === 0 || y === gridHeight - 1;
            
            if (blockY > TS && blockY < floorY) {
                const wall = createStaticWall(blockX, blockY, blockW, TS, {}, theme);
                if (isEdgeWall) {
                    wall.isVoxel = false; // Edge walls are indestructible
                } else {
                    wall.isVoxel = true; // Mark as destructible voxel
                    wall.health = VOXEL_CFG.maxHealth; // Initialize health
                    wall.maxHealth = VOXEL_CFG.maxHealth;
                    wall.voxelData = { x: blockX, y: blockY, width: blockW, height: TS }; // Store for regeneration
                }
                Matter.World.add(world, wall);
            }
        }
    }
    
    // Step 8: Add boundary walls (visual boundaries) - these are NOT destructible
    const leftBoundary = createStaticWall(TS / 2, playableHeight / 2 + TS, TS, playableHeight, {}, theme);
    leftBoundary.isVoxel = false; // Not destructible
    Matter.World.add(world, leftBoundary);
    
    const rightBoundary = createStaticWall(V_W - TS / 2, playableHeight / 2 + TS, TS, playableHeight, {}, theme);
    rightBoundary.isVoxel = false; // Not destructible
    Matter.World.add(world, rightBoundary);
    
    const ceilingBoundary = createStaticWall(V_W / 2, TS / 2, V_W, TS, {}, theme);
    ceilingBoundary.isVoxel = false; // Not destructible
    Matter.World.add(world, ceilingBoundary);
}

// Store destroyed voxels for regeneration
export const destroyedVoxels = [];
export const VOXEL_REGENERATION_TIME = 10000; // 10 seconds

export function damageVoxel(world, voxelBody, damage, particles, broadcastDamage = null) {
    // Don't damage boundary walls - only destructible voxels
    if (!voxelBody.isVoxel || voxelBody.isVoxel === false) return;
    
    // Initialize health if not set
    if (voxelBody.health === undefined) {
        voxelBody.health = VOXEL_CFG.maxHealth;
        voxelBody.maxHealth = VOXEL_CFG.maxHealth;
    }
    
    // Broadcast damage to other players if this is local damage
    if (broadcastDamage && voxelBody.voxelData) {
        broadcastDamage({
            x: voxelBody.voxelData.x,
            y: voxelBody.voxelData.y,
            width: voxelBody.voxelData.width,
            height: voxelBody.voxelData.height,
            damage: damage
        });
    }
    
    // Apply damage
    voxelBody.health -= damage;
    
    // Create small damage particles (fewer particles than destruction)
    const pos = voxelBody.position;
    const color = '#888'; // Gray debris color
    const particleCount = Math.max(3, Math.floor(damage / 10)); // More particles for more damage
    
    for (let i = 0; i < particleCount; i++) {
        const angle = (Math.PI * 2 / particleCount) * i + (Math.random() - 0.5) * 0.3;
        const speed = 1 + Math.random() * 3;
        const size = 1 + Math.random() * 2;
        const life = 20 + Math.random() * 15;
        createParticle(pos.x, pos.y, size, angle, speed, life, color, null, world, particles);
    }
    
    // Check if destroyed
    if (voxelBody.health <= 0) {
        destroyVoxel(world, voxelBody, particles, broadcastDamage);
    }
}

function destroyVoxel(world, voxelBody, particles, broadcastDamage = null) {
    if (!voxelBody.isVoxel) return; // Don't destroy boundary walls
    
    const pos = voxelBody.position;
    const color = '#888'; // Gray debris color
    
    // Broadcast destruction if this is local
    if (broadcastDamage && voxelBody.voxelData) {
        broadcastDamage({
            x: voxelBody.voxelData.x,
            y: voxelBody.voxelData.y,
            width: voxelBody.voxelData.width,
            height: voxelBody.voxelData.height,
            damage: 9999 // Signal complete destruction
        });
    }
    
    // Create destruction particles
    for (let i = 0; i < 15; i++) {
        const angle = (Math.PI * 2 / 15) * i + (Math.random() - 0.5) * 0.3;
        const speed = 2 + Math.random() * 4;
        const size = 2 + Math.random() * 3;
        const life = 30 + Math.random() * 20;
        createParticle(pos.x, pos.y, size, angle, speed, life, color, null, world, particles);
    }
    
    // Store voxel data for regeneration
    if (voxelBody.voxelData) {
        destroyedVoxels.push({
            data: voxelBody.voxelData,
            regenerateTime: Date.now() + VOXEL_REGENERATION_TIME
        });
    }
    
    // Remove from world
    Matter.World.remove(world, voxelBody);
}

export function regenerateVoxels(world, players = {}) {
    const now = Date.now();
    for (let i = destroyedVoxels.length - 1; i >= 0; i--) {
        const voxel = destroyedVoxels[i];
        if (now >= voxel.regenerateTime) {
            // Check if any player is inside the voxel space before regenerating
            let playerInWay = false;
            const voxelBounds = {
                minX: voxel.data.x - voxel.data.width / 2,
                maxX: voxel.data.x + voxel.data.width / 2,
                minY: voxel.data.y - voxel.data.height / 2,
                maxY: voxel.data.y + voxel.data.height / 2
            };
            
            // Check all players
            for (const playerId in players) {
                const player = players[playerId];
                if (!player || !player.body) continue;
                
                const playerPos = player.body.position;
                const playerRadius = player.effectivePlayerRadius || 20; // Use effective radius if available
                
                // Check if player overlaps with voxel bounds
                const playerMinX = playerPos.x - playerRadius;
                const playerMaxX = playerPos.x + playerRadius;
                const playerMinY = playerPos.y - playerRadius;
                const playerMaxY = playerPos.y + playerRadius;
                
                // Check for overlap
                if (playerMinX < voxelBounds.maxX && playerMaxX > voxelBounds.minX &&
                    playerMinY < voxelBounds.maxY && playerMaxY > voxelBounds.minY) {
                    playerInWay = true;
                    break;
                }
            }
            
            // Only regenerate if no player is in the way
            if (!playerInWay) {
                // Regenerate the voxel with full health (use theme from voxel data if available)
                const theme = voxel.data.theme || 'default';
                const wall = createStaticWall(voxel.data.x, voxel.data.y, voxel.data.width, voxel.data.height, {}, theme);
                wall.isVoxel = true;
                wall.health = VOXEL_CFG.maxHealth;
                wall.maxHealth = VOXEL_CFG.maxHealth;
                wall.voxelData = voxel.data;
                Matter.World.add(world, wall);
                
                // Remove from destroyed list
                destroyedVoxels.splice(i, 1);
            }
            // If player is in way, keep it in the list and check again next frame
        }
    }
}

