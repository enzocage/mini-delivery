/***************************************************************************
 * 2. PROCEDURAL WEB AUDIO SYNTHESIZER & OPTIONAL BACKGROUND MUSIC
 ***************************************************************************/
class SoundEngine {
    constructor() {
        this.ctx = null;
        this.enabled = true;
        // C Major 9th / Pentatonic harmonic palette (like Mini Metro)
        this.scale = [261.63, 293.66, 329.63, 392.00, 440.00, 493.88, 523.25, 587.33, 659.25, 783.99, 880.00, 1046.50];
    }
    init() {
        if (!this.ctx) {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (AudioCtx) this.ctx = new AudioCtx();
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }
    playTone(freq, type = 'sine', duration = 0.28, vol = 0.10, slideTo = null, attack = 0.015) {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;
        try {
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = type;
            osc.frequency.setValueAtTime(freq, now);
            if (slideTo) {
                osc.frequency.exponentialRampToValueAtTime(slideTo, now + duration);
            }
            gain.gain.setValueAtTime(0.0005, now);
            gain.gain.linearRampToValueAtTime(vol, now + attack);
            gain.gain.exponentialRampToValueAtTime(0.0005, now + duration);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now);
            osc.stop(now + duration + 0.03);
        } catch (e) {}
    }
    playPackageDelivered(size) {
        if (size === 'S') {
            const f = this.scale[6 + Math.floor(Math.random() * 5)];
            this.playTone(f, 'sine', 0.26, 0.08, null, 0.01);
        } else if (size === 'L') {
            const f = this.scale[3 + Math.floor(Math.random() * 4)];
            this.playTone(f, 'triangle', 0.34, 0.11, null, 0.015);
        } else {
            const f = this.scale[0 + Math.floor(Math.random() * 3)];
            this.playTone(f, 'triangle', 0.45, 0.13, null, 0.02);
            setTimeout(() => this.playTone(f * 1.5, 'sine', 0.38, 0.08), 50);
        }
    }
    playPickupPip() {
        const f = this.scale[7 + Math.floor(Math.random() * 4)];
        this.playTone(f * 0.5, 'sine', 0.11, 0.045, f * 0.75, 0.008);
    }
    playConnect(hasBridge = false, lineId = 0) {
        const base = this.scale[(lineId * 2) % 7];
        this.playTone(base, 'triangle', 0.22, 0.11, base * 1.25);
        if (hasBridge) {
            setTimeout(() => this.playTone(base * 1.5, 'sine', 0.30, 0.10), 65);
        }
    }
    playDisconnect() {
        this.playTone(392.00, 'sine', 0.18, 0.08, 261.63);
    }
    playPlaceDepot(size) {
        const base = size === 'XL' ? 261.63 : (size === 'L' ? 329.63 : 392.00);
        this.playTone(base, 'triangle', 0.26, 0.12);
        setTimeout(() => this.playTone(base * 1.25, 'sine', 0.32, 0.10), 60);
        setTimeout(() => this.playTone(base * 1.5, 'sine', 0.38, 0.10), 120);
    }
    playSpawnBuilding(demandType = 'S') {
        const idx = demandType === 'XL' ? 1 : (demandType === 'L' ? 3 : 5);
        const f = this.scale[idx + Math.floor(Math.random() * 3)];
        this.playTone(f * 0.5, 'sine', 0.35, 0.08, f, 0.025);
    }
    playWarningTick(urgency = 0.5) {
        const freq = 680 + urgency * 340;
        this.playTone(freq, 'sine', 0.09, 0.04 + urgency * 0.05, null, 0.005);
    }
    playWeeklyChord() {
        [261.63, 329.63, 392.00, 493.88, 587.33].forEach((f, idx) => {
            setTimeout(() => this.playTone(f, 'sine', 0.75, 0.08, null, 0.03), idx * 70);
        });
    }
}

const sfx = new SoundEngine();

const bgMusic = new Audio('https://www.enzocage.de/mp3/enzo_cage_sinus/enzo_cage_bright.mp3');
bgMusic.loop = true;
bgMusic.volume = 0.42;
bgMusic.preload = 'none';
let bgMusicPlaying = false;
