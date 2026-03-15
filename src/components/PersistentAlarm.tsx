import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Clock, Check, SkipForward, Timer } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PersistentAlarmProps {
  isActive: boolean;
  medicationName?: string;
  doseTime?: string;
  onTakeNow: () => void;
  onSnooze: () => void;
  onSkip: () => void;
}

/**
 * Full-screen persistent alarm that plays a loud continuous alarm
 * and keeps the screen awake until the user takes action.
 * This is the #1 requested feature across competitor reviews.
 */
export function PersistentAlarm({
  isActive,
  medicationName,
  doseTime,
  onTakeNow,
  onSnooze,
  onSkip,
}: PersistentAlarmProps) {
  const [minutesOverdue, setMinutesOverdue] = useState(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const alarmIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const oscillatorsRef = useRef<OscillatorNode[]>([]);

  // Calculate minutes overdue
  useEffect(() => {
    if (!isActive || !doseTime) return;
    const update = () => {
      const [h, m] = doseTime.split(':').map(Number);
      const now = new Date();
      const scheduled = h * 60 + m;
      const current = now.getHours() * 60 + now.getMinutes();
      setMinutesOverdue(Math.max(0, current - scheduled));
    };
    update();
    const interval = setInterval(update, 30000);
    return () => clearInterval(interval);
  }, [isActive, doseTime]);

  // Play continuous alarm sound
  const playAlarmCycle = useCallback(() => {
    try {
      const ctx = audioContextRef.current;
      if (!ctx) return;
      if (ctx.state === 'suspended') ctx.resume();

      const t = ctx.currentTime;

      // Two-tone siren pattern
      for (let i = 0; i < 4; i++) {
        const offset = i * 0.5;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(880, t + offset);
        osc.frequency.linearRampToValueAtTime(1320, t + offset + 0.2);
        osc.frequency.linearRampToValueAtTime(880, t + offset + 0.4);
        gain.gain.setValueAtTime(0.5, t + offset);
        gain.gain.setValueAtTime(0.5, t + offset + 0.35);
        gain.gain.exponentialRampToValueAtTime(0.01, t + offset + 0.45);
        osc.start(t + offset);
        osc.stop(t + offset + 0.45);
        oscillatorsRef.current.push(osc);
      }
    } catch (e) {
      console.error('Alarm sound error:', e);
    }
  }, []);

  // Request wake lock to prevent screen from sleeping
  const requestWakeLock = useCallback(async () => {
    try {
      if ('wakeLock' in navigator) {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
      }
    } catch (e) {
      console.warn('Wake lock not available:', e);
    }
  }, []);

  const releaseWakeLock = useCallback(() => {
    wakeLockRef.current?.release();
    wakeLockRef.current = null;
  }, []);

  // Start/stop alarm
  useEffect(() => {
    if (isActive) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      requestWakeLock();

      // Play alarm immediately then repeat every 3 seconds
      playAlarmCycle();
      alarmIntervalRef.current = setInterval(playAlarmCycle, 3000);

      // Vibrate continuously
      const vibrateLoop = () => {
        if ('vibrate' in navigator) {
          navigator.vibrate([500, 200, 500, 200, 500, 1000]);
        }
      };
      vibrateLoop();
      const vibInterval = setInterval(vibrateLoop, 3000);

      return () => {
        clearInterval(alarmIntervalRef.current!);
        clearInterval(vibInterval);
        oscillatorsRef.current.forEach(o => { try { o.stop(); } catch {} });
        oscillatorsRef.current = [];
        audioContextRef.current?.close();
        audioContextRef.current = null;
        releaseWakeLock();
        if ('vibrate' in navigator) navigator.vibrate(0);
      };
    }
  }, [isActive, playAlarmCycle, requestWakeLock, releaseWakeLock]);

  const handleAction = useCallback((action: () => void) => {
    // Stop everything before calling the action
    if (alarmIntervalRef.current) clearInterval(alarmIntervalRef.current);
    oscillatorsRef.current.forEach(o => { try { o.stop(); } catch {} });
    oscillatorsRef.current = [];
    audioContextRef.current?.close();
    audioContextRef.current = null;
    releaseWakeLock();
    if ('vibrate' in navigator) navigator.vibrate(0);
    action();
  }, [releaseWakeLock]);

  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[99999] bg-destructive flex flex-col items-center justify-center p-6"
        >
          {/* Pulsing background */}
          <motion.div
            className="absolute inset-0 bg-destructive"
            animate={{ opacity: [1, 0.7, 1] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
          />

          {/* Content */}
          <div className="relative z-10 text-center w-full max-w-sm">
            {/* Alert icon */}
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 0.8 }}
              className="w-28 h-28 mx-auto mb-6 rounded-full bg-white/20 flex items-center justify-center"
            >
              <AlertTriangle className="w-16 h-16 text-white" />
            </motion.div>

            {/* Title */}
            <h1 className="text-4xl font-black text-white mb-2">
              MISSED DOSE
            </h1>

            {/* Medication name */}
            {medicationName && (
              <p className="text-2xl font-bold text-white/90 mb-2">
                {medicationName}
              </p>
            )}

            {/* Time overdue */}
            {minutesOverdue > 0 && (
              <div className="flex items-center justify-center gap-2 text-white/80 mb-8">
                <Clock className="w-5 h-5" />
                <span className="text-lg font-semibold">{minutesOverdue} min overdue</span>
              </div>
            )}

            {/* Action buttons */}
            <div className="space-y-3">
              <Button
                size="xl"
                onClick={() => handleAction(onTakeNow)}
                className="w-full bg-white text-destructive hover:bg-white/90 text-xl font-bold py-6 shadow-2xl"
              >
                <Check className="w-7 h-7 mr-3" />
                Take Now
              </Button>

              <Button
                size="xl"
                variant="outline"
                onClick={() => handleAction(onSnooze)}
                className="w-full border-2 border-white/50 text-white hover:bg-white/20 text-lg py-5"
              >
                <Timer className="w-6 h-6 mr-3" />
                Snooze 10 min
              </Button>

              <Button
                size="xl"
                variant="ghost"
                onClick={() => handleAction(onSkip)}
                className="w-full text-white/70 hover:text-white hover:bg-white/10 text-lg py-5"
              >
                <SkipForward className="w-6 h-6 mr-3" />
                Skip This Dose
              </Button>
            </div>

            <p className="text-white/50 text-sm mt-6">
              Take action to dismiss alarm
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
