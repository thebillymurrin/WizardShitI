/* Game Configuration Constants */

export const V_W = 3840;               // virtual world width (px) - 2x bigger
export const V_H = 2160;               // virtual world height (px) - 2x bigger
export const PR = 20;                  // player radius (px)

export const VOXEL_CFG = {
    maxHealth: 50,                     // Base health for voxel walls
};

export const PLAYER_CFG = {
    /* Movement */
    force: 0.001,
    maxSpeed: 1.5,
    jumpForce: 0.01,
    climbForce: 0.005,

    /* Weapon – base values (modified by power‑ups) */
    fireCooldown: 2.0,        // seconds between shots (base)
    orbSpeed: 6,
    orbLifeFrames: 360,
    orbRadius: 3,              // <-- smaller bullets (was 6)
    
    /* Health */
    maxHealth: 100,
    healthBarWidth: 40,
    healthBarHeight: 4,

    /* Misc */
    wallDetectDist: 22,
    floorThickness: 2,
    tileSize: 32,
    rowSpacing: 80,
    platformMin: 2,
    platformMax: 5,
    platformTileMin: 2,
    platformTileMax: 4,
    platformGap: 20,
    wallCount: 5,
    wallTileMin: 2,
    wallTileMax: 4,
    wandDownShift: 5
};

export const COLLISION = {
    PLAYER: 0x0001,
    ORB: 0x0002,
    WALL: 0x0004,
    PICKUP: 0x0008,
    PARTICLE: 0x0010
};

export const COLLISION_FILTERS = {
    wall: {
        category: COLLISION.WALL,
        mask: COLLISION.PLAYER | COLLISION.WALL | COLLISION.PICKUP | COLLISION.ORB | COLLISION.PARTICLE
    },
    player: {
        category: COLLISION.PLAYER,
        mask: COLLISION.PLAYER | COLLISION.WALL | COLLISION.PICKUP | COLLISION.ORB
    },
    orb: {
        category: COLLISION.ORB,
        mask: COLLISION.PLAYER | COLLISION.WALL | COLLISION.PICKUP
    },
    pickup: {
        category: COLLISION.PICKUP,
        mask: COLLISION.PLAYER | COLLISION.WALL | COLLISION.PICKUP | COLLISION.ORB
    },
    particle: {
        category: COLLISION.PARTICLE,
        mask: COLLISION.WALL  // Particles only collide with walls
    }
};

// Rarity colors
export const RARITY = {
    COMMON: '#00ff00',      // Green
    UNCOMMON: '#ffff00',    // Yellow
    RARE: '#ff0000',        // Red
    LEGENDARY: '#ffd700'    // Gold
};

// Power-up categories
export const POWERUP_CATEGORY = {
    WEAPON: 'Weapon',
    DAMAGE: 'Damage',
    FIRERATE: 'Fire Rate',
    PELLETS: 'Pellets',
    SPEED: 'Speed',
    HEALTH: 'Health',
    TANK: 'Tank',
    SNIPER: 'Sniper',
    HYBRID: 'Hybrid',
    CHAOS: 'Chaos'
};

export const POWERUP_TYPES = {
    // Original power-ups
    Buckshot: { name: 'Buckshot', pellets: 5, radiusMul: 0.8, cooldownMul: 1.0, rarity: RARITY.COMMON, category: POWERUP_CATEGORY.WEAPON },
    Spray: { name: 'Spray', pellets: 1, radiusMul: 0.55, cooldownMul: 0.15, speedMul: 1.5, rarity: RARITY.COMMON, category: POWERUP_CATEGORY.WEAPON },
    Sniper: { name: 'Sniper', pellets: 1, radiusMul: 1.25, cooldownMul: 1.5, speedMul: 3.0, rarity: RARITY.UNCOMMON, category: POWERUP_CATEGORY.SNIPER },
    RPG: { name: 'RPG', pellets: 1, radiusMul: 2.0, cooldownMul: 2.0, explosionRadius: 80, explosionDamage: 30, rarity: RARITY.RARE, category: POWERUP_CATEGORY.WEAPON },
    
    // Sniper variants (rifle names)
    HuntingRifle: { name: 'Hunting Rifle', pellets: 1, radiusMul: 1.15, cooldownMul: 1.3, speedMul: 2.5, rarity: RARITY.COMMON, category: POWERUP_CATEGORY.SNIPER },
    MarksmanRifle: { name: 'Marksman Rifle', pellets: 1, radiusMul: 1.35, cooldownMul: 1.8, speedMul: 3.5, rarity: RARITY.UNCOMMON, category: POWERUP_CATEGORY.SNIPER },
    AWPRifle: { name: 'AWP Rifle', pellets: 1, radiusMul: 1.5, cooldownMul: 2.2, speedMul: 4.0, rarity: RARITY.RARE, category: POWERUP_CATEGORY.SNIPER },
    BarretM82: { name: 'Barret M82', pellets: 1, radiusMul: 1.75, cooldownMul: 2.8, speedMul: 5.0, rarity: RARITY.LEGENDARY, glowing: true, category: POWERUP_CATEGORY.SNIPER },
    
    // Damage multipliers (percentage increase) - funny names
    Damage15: { name: 'Weak Sauce', damagePercent: 50, rarity: RARITY.COMMON, stackable: true, category: POWERUP_CATEGORY.DAMAGE },
    Damage2: { name: 'Ouch My Bones', damagePercent: 100, rarity: RARITY.UNCOMMON, stackable: true, category: POWERUP_CATEGORY.DAMAGE },
    Damage3: { name: 'Crit Go Brrr', damagePercent: 200, rarity: RARITY.RARE, stackable: true, category: POWERUP_CATEGORY.DAMAGE },
    Damage5: { name: 'Big Chungus Damage', damagePercent: 400, rarity: RARITY.LEGENDARY, stackable: true, glowing: true, category: POWERUP_CATEGORY.DAMAGE },
    
    // Buckshot variants - funny names
    CheapBuckshot: { name: 'Birdshot', extraPellets: 3, rarity: RARITY.COMMON, stackable: true, category: POWERUP_CATEGORY.PELLETS },
    DecentBuckshot: { name: 'Slug Shell', extraPellets: 5, rarity: RARITY.UNCOMMON, stackable: true, category: POWERUP_CATEGORY.PELLETS },
    DoublePump: { name: 'Double Barrel', extraPellets: 7, rarity: RARITY.RARE, stackable: true, category: POWERUP_CATEGORY.PELLETS },
    AutomaticShotgun: { name: 'AA-12', extraPellets: 8, fireRatePercent: 300, rarity: RARITY.LEGENDARY, stackable: true, glowing: true, category: POWERUP_CATEGORY.HYBRID },
    
    // Fire rate modifiers (percentage increase) - funny names
    IllegalCrappySwitch: { name: '3D Printed Switch', fireRatePercent: 40, rarity: RARITY.COMMON, stackable: true, category: POWERUP_CATEGORY.FIRERATE },
    DecentSwitch: { name: 'Mil-Spec Trigger', fireRatePercent: 100, rarity: RARITY.UNCOMMON, stackable: true, category: POWERUP_CATEGORY.FIRERATE },
    NoFullAuto: { name: 'Full Auto In Building', fireRatePercent: 250, rarity: RARITY.RARE, stackable: true, category: POWERUP_CATEGORY.FIRERATE },
    Minigun: { name: 'Brrrrt Gun', fireRatePercent: 400, rarity: RARITY.LEGENDARY, stackable: true, glowing: true, category: POWERUP_CATEGORY.FIRERATE },
    
    // Health pickups (instant, not stackable) - funny names
    Heal20: { name: 'Band-Aid', healPercent: 20, instant: true, rarity: RARITY.COMMON, category: POWERUP_CATEGORY.HEALTH },
    Heal30: { name: 'Medkit', healPercent: 30, instant: true, rarity: RARITY.UNCOMMON, category: POWERUP_CATEGORY.HEALTH },
    Heal45: { name: 'First Aid Kit', healPercent: 45, instant: true, rarity: RARITY.RARE, category: POWERUP_CATEGORY.HEALTH },
    Heal75: { name: 'Health Potion', healPercent: 75, instant: true, rarity: RARITY.LEGENDARY, glowing: true, category: POWERUP_CATEGORY.HEALTH },
    
    // More funny power-ups
    RubberBand: { name: 'Rubber Band', moveSpeedMul: 1.3, rarity: RARITY.COMMON, stackable: true, category: POWERUP_CATEGORY.SPEED },
    Zoomies: { name: 'Zoomies', moveSpeedMul: 1.6, rarity: RARITY.UNCOMMON, stackable: true, category: POWERUP_CATEGORY.SPEED },
    SonicBoom: { name: 'Sonic Boom', moveSpeedMul: 2.0, rarity: RARITY.RARE, stackable: true, category: POWERUP_CATEGORY.SPEED },
    GottaGoFast: { name: 'Gotta Go Fast', moveSpeedMul: 3.0, rarity: RARITY.LEGENDARY, stackable: true, glowing: true, category: POWERUP_CATEGORY.SPEED },
    
    Tanky: { name: 'Tanky Boi', radiusMul: 1.2, damagePercent: -20, rarity: RARITY.COMMON, stackable: true, category: POWERUP_CATEGORY.TANK },
    Chonker: { name: 'Absolute Chonker', radiusMul: 1.5, damagePercent: -30, rarity: RARITY.UNCOMMON, stackable: true, category: POWERUP_CATEGORY.TANK },
    MegaChonk: { name: 'Mega Chonk', radiusMul: 2.0, damagePercent: -40, rarity: RARITY.RARE, stackable: true, category: POWERUP_CATEGORY.TANK },
    
    PocketSand: { name: 'Pocket Sand', extraPellets: 8, radiusMul: 0.5, rarity: RARITY.COMMON, stackable: true, category: POWERUP_CATEGORY.CHAOS },
    BeanBag: { name: 'Bean Bag', radiusMul: 1.8, damagePercent: -50, rarity: RARITY.UNCOMMON, stackable: true, category: POWERUP_CATEGORY.TANK },
    
    LuckyShot: { name: 'Lucky Shot', damagePercent: 150, cooldownMul: 1.5, rarity: RARITY.UNCOMMON, stackable: true, category: POWERUP_CATEGORY.HYBRID },
    HeadHunter: { name: 'Head Hunter', damagePercent: 250, radiusMul: 0.7, rarity: RARITY.RARE, stackable: true, category: POWERUP_CATEGORY.HYBRID },
    
    SprayNPray: { name: 'Spray n Pray', extraPellets: 12, radiusMul: 0.4, fireRatePercent: 200, rarity: RARITY.RARE, stackable: true, category: POWERUP_CATEGORY.CHAOS },
    BulletHell: { name: 'Bullet Hell', extraPellets: 20, radiusMul: 0.3, fireRatePercent: 150, cooldownMul: 0.8, rarity: RARITY.LEGENDARY, stackable: true, glowing: true, category: POWERUP_CATEGORY.CHAOS },
    
    SteadyAim: { name: 'Steady Aim', radiusMul: 1.4, speedMul: 2.0, rarity: RARITY.UNCOMMON, stackable: true, category: POWERUP_CATEGORY.HYBRID },
    DeadEye: { name: 'Dead Eye', radiusMul: 1.8, speedMul: 3.5, damagePercent: 100, rarity: RARITY.RARE, stackable: true, category: POWERUP_CATEGORY.HYBRID },
    
    GlassCannon: { name: 'Glass Cannon', damagePercent: 300, radiusMul: 0.6, rarity: RARITY.RARE, stackable: true, category: POWERUP_CATEGORY.HYBRID },
    OneShotOneKill: { name: 'One Shot One Kill', damagePercent: 100000, cooldownMul: 3.0, speedMul: 5.0, rarity: RARITY.LEGENDARY, stackable: true, glowing: true, category: POWERUP_CATEGORY.SNIPER },
    
    // More damage power-ups
    BabyFists: { name: 'Baby Fists', damagePercent: 25, rarity: RARITY.COMMON, stackable: true, category: POWERUP_CATEGORY.DAMAGE },
    PowerGlove: { name: 'Power Glove', damagePercent: 75, rarity: RARITY.COMMON, stackable: true, category: POWERUP_CATEGORY.DAMAGE },
    Mjolnir: { name: 'Mjolnir', damagePercent: 350, rarity: RARITY.LEGENDARY, stackable: true, glowing: true, category: POWERUP_CATEGORY.DAMAGE },
    
    // More pellet power-ups
    PeaShooter: { name: 'Pea Shooter', extraPellets: 2, radiusMul: 0.6, rarity: RARITY.COMMON, stackable: true, category: POWERUP_CATEGORY.PELLETS },
    Blunderbuss: { name: 'Blunderbuss', extraPellets: 6, radiusMul: 0.7, rarity: RARITY.UNCOMMON, stackable: true, category: POWERUP_CATEGORY.PELLETS },
    ShotgunExpress: { name: 'Shotgun Express', extraPellets: 10, fireRatePercent: 150, rarity: RARITY.RARE, stackable: true, category: POWERUP_CATEGORY.HYBRID },
    
    // More fire rate power-ups
    HairTrigger: { name: 'Hair Trigger', fireRatePercent: 25, rarity: RARITY.COMMON, stackable: true, category: POWERUP_CATEGORY.FIRERATE },
    RapidFire: { name: 'Rapid Fire', fireRatePercent: 150, rarity: RARITY.UNCOMMON, stackable: true, category: POWERUP_CATEGORY.FIRERATE },
    SpeedDemon: { name: 'Speed Demon', fireRatePercent: 350, rarity: RARITY.RARE, stackable: true, category: POWERUP_CATEGORY.FIRERATE },
    
    // More speed power-ups
    Caffeine: { name: 'Caffeine', moveSpeedMul: 1.15, rarity: RARITY.COMMON, stackable: true, category: POWERUP_CATEGORY.SPEED },
    Adrenaline: { name: 'Adrenaline', moveSpeedMul: 1.4, fireRatePercent: 50, rarity: RARITY.UNCOMMON, stackable: true, category: POWERUP_CATEGORY.HYBRID },
    SpeedForce: { name: 'Speed Force', moveSpeedMul: 2.5, rarity: RARITY.RARE, stackable: true, category: POWERUP_CATEGORY.SPEED },
    
    // More tank power-ups
    LightArmor: { name: 'Light Armor', radiusMul: 1.1, damagePercent: -10, rarity: RARITY.COMMON, stackable: true, category: POWERUP_CATEGORY.TANK },
    HeavyArmor: { name: 'Heavy Armor', radiusMul: 1.4, damagePercent: -25, rarity: RARITY.UNCOMMON, stackable: true, category: POWERUP_CATEGORY.TANK },
    Fortress: { name: 'Fortress', radiusMul: 2.5, damagePercent: -60, moveSpeedMul: 0.7, rarity: RARITY.LEGENDARY, stackable: true, glowing: true, category: POWERUP_CATEGORY.TANK },
    
    // More hybrid power-ups
    Balanced: { name: 'Balanced', damagePercent: 80, fireRatePercent: 80, moveSpeedMul: 1.2, rarity: RARITY.UNCOMMON, stackable: true, category: POWERUP_CATEGORY.HYBRID },
    AllRounder: { name: 'All Rounder', damagePercent: 120, fireRatePercent: 120, radiusMul: 1.15, rarity: RARITY.RARE, stackable: true, category: POWERUP_CATEGORY.HYBRID },
    
    // More chaos power-ups
    Scattershot: { name: 'Scattershot', extraPellets: 6, radiusMul: 0.45, fireRatePercent: 100, rarity: RARITY.COMMON, stackable: true, category: POWERUP_CATEGORY.CHAOS },
    SpreadGun: { name: 'Spread Gun', extraPellets: 15, radiusMul: 0.35, fireRatePercent: 180, rarity: RARITY.UNCOMMON, stackable: true, category: POWERUP_CATEGORY.CHAOS },
    ClusterBomb: { name: 'Cluster Bomb', extraPellets: 25, radiusMul: 0.25, fireRatePercent: 120, damagePercent: -30, rarity: RARITY.RARE, stackable: true, category: POWERUP_CATEGORY.CHAOS },
    
    // More sniper variants
    LongRifle: { name: 'Long Rifle', pellets: 1, radiusMul: 1.2, cooldownMul: 1.4, speedMul: 2.8, rarity: RARITY.COMMON, category: POWERUP_CATEGORY.SNIPER },
    PrecisionRifle: { name: 'Precision Rifle', pellets: 1, radiusMul: 1.4, cooldownMul: 1.9, speedMul: 3.8, damagePercent: 50, rarity: RARITY.UNCOMMON, stackable: true, category: POWERUP_CATEGORY.HYBRID },
    Railgun: { name: 'Railgun', pellets: 1, radiusMul: 2.0, cooldownMul: 3.5, speedMul: 6.0, damagePercent: 500, rarity: RARITY.LEGENDARY, stackable: true, glowing: true, category: POWERUP_CATEGORY.SNIPER },
    
    // Unique/gimmick power-ups
    Bouncy: { name: 'Bouncy Bullets', radiusMul: 0.9, damagePercent: -20, rarity: RARITY.COMMON, stackable: true, category: POWERUP_CATEGORY.CHAOS },
    Homing: { name: 'Homing Bullets', radiusMul: 0.8, speedMul: 0.7, damagePercent: 40, rarity: RARITY.RARE, stackable: true, category: POWERUP_CATEGORY.HYBRID },
    
    // More health variants
    SmallPot: { name: 'Small Pot', healPercent: 15, instant: true, rarity: RARITY.COMMON, category: POWERUP_CATEGORY.HEALTH },
    Elixir: { name: 'Elixir', healPercent: 50, instant: true, rarity: RARITY.RARE, category: POWERUP_CATEGORY.HEALTH },
    PhoenixDown: { name: 'Phoenix Down', healPercent: 100, instant: true, rarity: RARITY.LEGENDARY, glowing: true, category: POWERUP_CATEGORY.HEALTH }
};

export const EXPLOSION = {
    RPG_RADIUS: 120,
    RPG_DAMAGE: 30,
    FIRE_PARTICLE_COUNT: 40,
    SMOKE_PARTICLE_COUNT: 20,
    BULLET_PARTICLE_COUNT: 16
};

export const WIZARD_PIXEL_SIZE = 1.8;
export const ANIMATION_SPEED = 12;

// Wizard body pixel art (0=transparent, 1=black, 2=robe, 3=eyes, 4=hat, 5=skin, 6=beard, 7=belt, 9=hat star)
export const WIZARD_BODY = [
    [0, 0, 0, 0, 0, 9, 9, 0, 0, 0, 0, 0],      // Hat tip star
    [0, 0, 0, 0, 4, 4, 4, 4, 0, 0, 0, 0],      // Hat point
    [0, 0, 0, 4, 4, 4, 4, 4, 4, 0, 0, 0],      // Hat
    [0, 0, 4, 4, 4, 4, 4, 4, 4, 4, 0, 0],      // Hat
    [0, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 0],      // Hat wide
    [0, 1, 1, 4, 4, 4, 4, 4, 4, 1, 1, 0],      // Hat brim
    [0, 0, 1, 5, 5, 5, 5, 5, 5, 1, 0, 0],      // Head outline
    [0, 0, 5, 5, 5, 5, 5, 5, 5, 5, 0, 0],      // Forehead
    [0, 0, 5, 3, 1, 5, 5, 1, 3, 5, 0, 0],      // Eyes with pupils
    [0, 0, 5, 5, 5, 5, 5, 5, 5, 5, 0, 0],      // Nose
    [0, 0, 5, 5, 5, 1, 1, 5, 5, 5, 0, 0],      // Mouth
    [0, 0, 6, 6, 6, 6, 6, 6, 6, 6, 0, 0],      // Beard top
    [0, 0, 6, 6, 6, 6, 6, 6, 6, 6, 0, 0],      // Beard
    [0, 0, 1, 6, 6, 6, 6, 6, 6, 1, 0, 0],      // Beard bottom
    [0, 0, 0, 2, 2, 2, 2, 2, 2, 0, 0, 0],      // Neck
    [0, 0, 2, 2, 2, 2, 2, 2, 2, 2, 0, 0],      // Shoulders
    [0, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 0],      // Chest
    [0, 2, 2, 7, 7, 7, 7, 7, 7, 2, 2, 0],      // Belt
    [0, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 0],      // Torso
    [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2],      // Robe
    [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2],      // Robe
    [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2],      // Robe
    [0, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 0]       // Robe bottom (no legs!)
];

// Runtime helper to modify config
export function setPlayerConfig(key, value) {
    if (key in PLAYER_CFG) {
        PLAYER_CFG[key] = value;
        console.log(`PLAYER_CFG.${key}=`, value);
    } else {
        console.warn(`Unknown PLAYER_CFG key: ${key}`);
    }
}

// Keybinds configuration (defaults)
export const KEYBINDS = {
    moveLeft: 'a',
    moveRight: 'd',
    jump: ' ',
    crouch: 'control',
    climb: 'w'
};

// Particle settings
export const PARTICLE_SETTINGS = {
    simulateParticles: false,  // Default to false (disabled)
    particleDuration: 3.0,  // multiplier for particle lifetime (max by default)
    maxParticles: 50  // Maximum particles before removing oldest (for performance)
};

// Load keybinds from localStorage or use defaults
export function loadKeybinds() {
    if (typeof window !== 'undefined' && window.gameSettings) {
        KEYBINDS.moveLeft = window.gameSettings.keybindMoveLeft || 'a';
        KEYBINDS.moveRight = window.gameSettings.keybindMoveRight || 'd';
        KEYBINDS.jump = window.gameSettings.keybindJump || ' ';
        KEYBINDS.crouch = window.gameSettings.keybindCrouch || 'control';
        KEYBINDS.climb = window.gameSettings.keybindClimb || 'w';
    }
}

// Load particle settings from localStorage or use defaults
export function loadParticleSettings() {
    if (typeof window !== 'undefined' && window.gameSettings) {
        // Check localStorage first, then window.gameSettings
        const stored = localStorage.getItem('enableParticles');
        if (stored !== null) {
            PARTICLE_SETTINGS.simulateParticles = stored === 'true';
        } else {
            PARTICLE_SETTINGS.simulateParticles = window.gameSettings.enableParticles === true;
        }
        PARTICLE_SETTINGS.particleDuration = window.gameSettings.particleDuration || 3.0;
        PARTICLE_SETTINGS.maxParticles = window.gameSettings.maxParticles || 50;
    }
}

// Expose update function globally
if (typeof window !== 'undefined') {
    window.updateGameConfig = function() {
        loadKeybinds();
        loadParticleSettings();
    };
}

