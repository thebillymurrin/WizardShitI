/* Audio/Sound Handling */

import { clamp } from './utils.js';
import { PLAYER_CFG } from './config.js';

let jumpSynth, leadSynth, bassSynth;
let toneStarted = false;
let sfxGainNode = null;

export function ensureToneStarted() {
    if (!toneStarted) {
        // Create SFX gain node for volume control
        sfxGainNode = new Tone.Gain(0.8).toDestination();
        
        // Create synths on first user interaction
        jumpSynth = new Tone.MembraneSynth({
            pitch: "C2",
            envelope: { attack: 0.001, decay: 0.2, sustain: 0, release: 0.1 }
        }).connect(sfxGainNode);
        
        leadSynth = new Tone.Synth({
            oscillator: { type: "square" },
            envelope: { attack: 0.01, decay: 0.08, sustain: 0, release: 0.08 }
        }).connect(sfxGainNode);
        
        bassSynth = new Tone.Synth({
            oscillator: { type: "sawtooth" },
            envelope: { attack: 0.02, decay: 0.12, sustain: 0, release: 0.12 },
            filter: { type: "lowpass", rolloff: -12 }
        }).connect(sfxGainNode);
        
        Tone.start().then(() => { toneStarted = true; });
    }
}

export function playJumpSound() {
    if (!toneStarted || !jumpSynth) return;
    // Add larger delay to prevent conflict with fire sound
    const scheduleTime = Tone.now() + 0.05;
    try {
        jumpSynth.triggerAttackRelease("C2", "8n", scheduleTime);
    } catch (e) {
        console.warn('Audio timing conflict, skipping jump sound');
    }
}

export function playFireSound(radius, speed, cooldown, delayMs = 0, baseTime = null) {
    if (!toneStarted || !leadSynth || !bassSynth) return;

    // Pitch mapping (bigger bullet → lower pitch)
    const minPitch = 200, maxPitch = 800;
    const pitch = clamp(
        maxPitch - (radius - PLAYER_CFG.orbRadius) / (PLAYER_CFG.orbRadius * 3) * (maxPitch - minPitch),
        20, 20000
    );

    // Lead synth (mid‑range)
    const leadAttack = Math.max(0.005, 0.03 - (speed - PLAYER_CFG.orbSpeed) * 0.004);
    const leadCutoff = clamp(800 + (PLAYER_CFG.fireCooldown - cooldown) * 400, 20, 20000);
    leadSynth.set({
        envelope: { attack: leadAttack, decay: 0.08, sustain: 0, release: 0.08 },
        filter: { type: "lowpass", frequency: leadCutoff }
    });
    
    // Bass synth (one octave lower)
    const bassPitch = clamp(pitch / 2, 20, 20000);
    const bassAttack = Math.max(0.01, leadAttack * 1.5);
    const bassCutoff = clamp(400 + (PLAYER_CFG.fireCooldown - cooldown) * 200, 20, 20000);
    bassSynth.set({
        envelope: { attack: bassAttack, decay: 0.12, sustain: 0, release: 0.12 },
        filter: { type: "lowpass", frequency: bassCutoff }
    });
    
    // Stagger synth triggers to prevent audio context overload
    const delaySec = delayMs / 1000;
    const scheduleTime = (baseTime !== null ? baseTime : Tone.now()) + delaySec + 0.02;
    try {
        leadSynth.triggerAttackRelease(pitch, "8n", scheduleTime);
        bassSynth.triggerAttackRelease(bassPitch, "8n", scheduleTime);
    } catch (e) {
        console.warn('Audio timing conflict, skipping sound');
    }
}

export function isToneStarted() {
    return toneStarted;
}

let explosionSynth, pickupSynth;

export function initGameSounds() {
    if (!toneStarted) return;
    
    // Ensure SFX gain node exists
    if (!sfxGainNode) {
        sfxGainNode = new Tone.Gain(0.8).toDestination();
    }
    
    // Explosion sound - low rumbling bass
    explosionSynth = new Tone.MembraneSynth({
        pitch: "C1",
        envelope: { attack: 0.001, decay: 0.3, sustain: 0, release: 0.4 }
    }).connect(sfxGainNode);
    
    // Pickup sound - bright chime
    pickupSynth = new Tone.Synth({
        oscillator: { type: "triangle" },
        envelope: { attack: 0.01, decay: 0.1, sustain: 0.3, release: 0.2 }
    }).connect(sfxGainNode);
}

// Update SFX volume (called from menu)
export function updateSFXVolume(volume) {
    if (sfxGainNode) {
        sfxGainNode.gain.value = volume;
    }
}

// Expose globally for menu to call
if (typeof window !== 'undefined') {
    window.updateSFXVolume = updateSFXVolume;
}

export function playExplosionSound() {
    if (!toneStarted || !explosionSynth) {
        if (toneStarted) initGameSounds();
        return;
    }
    
    try {
        const scheduleTime = Tone.now() + 0.01;
        // Deep rumbling explosion with multiple layers
        explosionSynth.triggerAttackRelease("C1", "8n", scheduleTime);
        
        // Add a second layer for more impact
        setTimeout(() => {
            if (explosionSynth) {
                explosionSynth.triggerAttackRelease("F1", "16n", Tone.now() + 0.01);
            }
        }, 50);
    } catch (e) {
        console.warn('Audio timing conflict, skipping explosion sound');
    }
}

export function playPickupSound() {
    if (!toneStarted || !pickupSynth) {
        if (toneStarted) initGameSounds();
        return;
    }
    
    try {
        const scheduleTime = Tone.now() + 0.01;
        // Pleasant chime for pickup
        pickupSynth.triggerAttackRelease("C5", "16n", scheduleTime);
        pickupSynth.triggerAttackRelease("E5", "16n", scheduleTime + 0.05);
    } catch (e) {
        console.warn('Audio timing conflict, skipping pickup sound');
    }
}

