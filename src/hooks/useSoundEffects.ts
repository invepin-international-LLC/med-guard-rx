import { useCallback, useRef } from 'react';

type SoundType = 'coinEarn' | 'spinStart' | 'spinStop' | 'jackpot' | 'click' | 'success';

// Audio context singleton for better performance
let audioContext: AudioContext | null = null;

const getAudioContext = (): AudioContext => {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  // Resume if suspended (browser autoplay policy)
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }
  return audioContext;
};

// Create oscillator-based sounds
const createOscillatorSound = (
  ctx: AudioContext,
  frequency: number,
  type: OscillatorType,
  duration: number,
  gain: number = 0.3
): { oscillator: OscillatorNode; gainNode: GainNode } => {
  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();
  
  oscillator.type = type;
  oscillator.frequency.value = frequency;
  gainNode.gain.value = gain;
  
  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);
  
  // Fade out
  gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
  
  return { oscillator, gainNode };
};

// Sound definitions
const sounds: Record<SoundType, (ctx: AudioContext) => void> = {
  coinEarn: (ctx) => {
    // Coin collection: Rising arpeggio
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    notes.forEach((freq, i) => {
      setTimeout(() => {
        const { oscillator, gainNode } = createOscillatorSound(ctx, freq, 'sine', 0.15, 0.25);
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.15);
      }, i * 60);
    });
  },
  
  spinStart: (ctx) => {
    // Slot machine start: Ratchet-like clicks
    for (let i = 0; i < 8; i++) {
      setTimeout(() => {
        const { oscillator } = createOscillatorSound(ctx, 200 + i * 30, 'square', 0.03, 0.15);
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.03);
      }, i * 40);
    }
  },
  
  spinStop: (ctx) => {
    // Reel stop: Satisfying thunk
    const { oscillator: osc1 } = createOscillatorSound(ctx, 150, 'sine', 0.1, 0.3);
    const { oscillator: osc2 } = createOscillatorSound(ctx, 100, 'triangle', 0.15, 0.2);
    
    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.1);
    
    osc2.start(ctx.currentTime + 0.02);
    osc2.stop(ctx.currentTime + 0.15);
  },
  
  jackpot: (ctx) => {
    // Jackpot: Triumphant fanfare
    const melody = [
      { freq: 523.25, delay: 0, duration: 0.15 },    // C5
      { freq: 659.25, delay: 100, duration: 0.15 },  // E5
      { freq: 783.99, delay: 200, duration: 0.15 },  // G5
      { freq: 1046.50, delay: 300, duration: 0.3 },  // C6
      { freq: 1318.51, delay: 450, duration: 0.4 },  // E6
    ];
    
    melody.forEach(({ freq, delay, duration }) => {
      setTimeout(() => {
        const { oscillator } = createOscillatorSound(ctx, freq, 'sine', duration, 0.3);
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + duration);
        
        // Harmony
        const { oscillator: harm } = createOscillatorSound(ctx, freq * 1.5, 'sine', duration, 0.15);
        harm.start(ctx.currentTime);
        harm.stop(ctx.currentTime + duration);
      }, delay);
    });
  },
  
  click: (ctx) => {
    // UI click
    const { oscillator } = createOscillatorSound(ctx, 800, 'sine', 0.05, 0.1);
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.05);
  },
  
  success: (ctx) => {
    // Success: Two-tone chime
    const { oscillator: osc1 } = createOscillatorSound(ctx, 523.25, 'sine', 0.2, 0.25);
    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.2);
    
    setTimeout(() => {
      const { oscillator: osc2 } = createOscillatorSound(ctx, 659.25, 'sine', 0.3, 0.25);
      osc2.start(ctx.currentTime);
      osc2.stop(ctx.currentTime + 0.3);
    }, 100);
  },
};

export function useSoundEffects() {
  const enabledRef = useRef(true);
  
  const playSound = useCallback((type: SoundType) => {
    if (!enabledRef.current) return;
    
    try {
      const ctx = getAudioContext();
      sounds[type](ctx);
    } catch (error) {
      console.warn('Sound playback failed:', error);
    }
  }, []);
  
  const setEnabled = useCallback((enabled: boolean) => {
    enabledRef.current = enabled;
  }, []);
  
  return {
    playSound,
    setEnabled,
  };
}
