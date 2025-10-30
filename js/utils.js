/* Utility Functions */

export const sanitize = s => {
    const r = s.replace(/[^a-zA-Z0-9_-]/g, '').trim();
    return r || 'room' + Math.random().toString(36).substr(2, 6);
};

export function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

export const randNeon = () => {
    const hue = Math.random() * 360;
    const saturation = 80 + Math.random() * 20;
    const lightness = 50 + Math.random() * 20;
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
};

export function hexToRgb(hex) {
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (m) return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)];
    return [255, 255, 255];
}

export function rgbArrayToString(rgb) {
    return `${rgb[0]},${rgb[1]},${rgb[2]}`;
}

// Seeded random number generator for deterministic level generation
// Improved to be more sensitive to seed changes
export function initSeededRandom(seed) {
    // Use seed to initialize both generators for better variation
    let m_w = (seed * 2654435761) & 0xffffffff;
    let m_z = ((seed * 73856093) ^ (seed >> 16)) & 0xffffffff;
    
    // Ensure both are non-zero
    if (m_w === 0) m_w = 1;
    if (m_z === 0) m_z = 987654321;
    
    const mask = 0xffffffff;
    return function() {
        m_z = (36969 * (m_z & 65535) + (m_z >> 16)) & mask;
        m_w = (18000 * (m_w & 65535) + (m_w >> 16)) & mask;
        let result = ((m_z << 16) + (m_w & 65535)) >>> 0;
        result /= 4294967296;
        return result;
    };
}

