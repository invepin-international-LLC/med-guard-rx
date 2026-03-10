import { useEffect, useRef, useCallback, useState } from 'react';
import { MedicationDose } from '@/hooks/useMedications';
import { getSoundEnabled } from '@/hooks/useSoundEffects';
import { getTorchEnabled } from '@/components/SoundSettings';
import { getVoiceEnabled } from '@/components/DisplaySettings';
import { Capacitor } from '@capacitor/core';

interface MedicationDoseWithName extends MedicationDose {
  medicationName?: string;
}

interface UseMedicationRemindersProps {
  doses: MedicationDoseWithName[];
  enabled?: boolean;
}

// How many minutes past scheduled time before we consider it "missed"
const MISSED_THRESHOLD_MINUTES = 15;
// Re-alert interval for missed doses (minutes)
const MISSED_RE_ALERT_MINUTES = 5;

export function useMedicationReminders({ doses, enabled = true }: UseMedicationRemindersProps) {
  const alertedDosesRef = useRef<Set<string>>(new Set());
  const missedAlertedRef = useRef<Map<string, number>>(new Map()); // doseKey -> last alert timestamp
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [missedDoseAlert, setMissedDoseAlert] = useState<{
    active: boolean;
    medicationName?: string;
  }>({ active: false });

  // Play medication reminder chime (gentle — for on-time doses)
  const playReminderChime = useCallback(() => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

      const osc1 = audioContext.createOscillator();
      const gain1 = audioContext.createGain();
      osc1.connect(gain1);
      gain1.connect(audioContext.destination);
      osc1.frequency.setValueAtTime(880, audioContext.currentTime);
      osc1.type = 'sine';
      gain1.gain.setValueAtTime(0.3, audioContext.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      osc1.start(audioContext.currentTime);
      osc1.stop(audioContext.currentTime + 0.3);

      setTimeout(() => {
        const osc2 = audioContext.createOscillator();
        const gain2 = audioContext.createGain();
        osc2.connect(gain2);
        gain2.connect(audioContext.destination);
        osc2.frequency.setValueAtTime(659.25, audioContext.currentTime);
        osc2.type = 'sine';
        gain2.gain.setValueAtTime(0.3, audioContext.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
        osc2.start(audioContext.currentTime);
        osc2.stop(audioContext.currentTime + 0.3);
      }, 150);

      setTimeout(() => {
        const osc3 = audioContext.createOscillator();
        const gain3 = audioContext.createGain();
        osc3.connect(gain3);
        gain3.connect(audioContext.destination);
        osc3.frequency.setValueAtTime(523.25, audioContext.currentTime);
        osc3.type = 'sine';
        gain3.gain.setValueAtTime(0.25, audioContext.currentTime);
        gain3.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
        osc3.start(audioContext.currentTime);
        osc3.stop(audioContext.currentTime + 0.5);
      }, 350);
    } catch (error) {
      console.error('Error playing reminder chime:', error);
    }
  }, []);

  // Play URGENT missed-dose alarm — loud, repeating, attention-grabbing
  const playMissedDoseAlarm = useCallback(() => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const t = ctx.currentTime;

      // Three urgent alarm bursts
      for (let burst = 0; burst < 3; burst++) {
        const offset = burst * 0.6;

        // High siren tone
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(880, t + offset);
        osc.frequency.linearRampToValueAtTime(1200, t + offset + 0.15);
        osc.frequency.linearRampToValueAtTime(880, t + offset + 0.3);
        gain.gain.setValueAtTime(0.4, t + offset);
        gain.gain.setValueAtTime(0.4, t + offset + 0.25);
        gain.gain.exponentialRampToValueAtTime(0.01, t + offset + 0.35);
        osc.start(t + offset);
        osc.stop(t + offset + 0.35);

        // Sub-bass impact
        const sub = ctx.createOscillator();
        const subGain = ctx.createGain();
        sub.connect(subGain);
        subGain.connect(ctx.destination);
        sub.type = 'sine';
        sub.frequency.setValueAtTime(110, t + offset);
        subGain.gain.setValueAtTime(0.35, t + offset);
        subGain.gain.exponentialRampToValueAtTime(0.01, t + offset + 0.2);
        sub.start(t + offset);
        sub.stop(t + offset + 0.2);
      }
    } catch (error) {
      console.error('Error playing missed dose alarm:', error);
    }
  }, []);

  // Trigger vibration pattern for medication reminder
  const triggerVibration = useCallback(() => {
    if ('vibrate' in navigator) {
      navigator.vibrate([100, 50, 100, 50, 300]);
    }
  }, []);

  // Trigger URGENT vibration for missed dose — long, aggressive pattern
  const triggerUrgentVibration = useCallback(() => {
    if ('vibrate' in navigator) {
      navigator.vibrate([
        300, 100, 300, 100, 300, 200,
        500, 150, 500, 150, 500,
      ]);
    }
  }, []);

  // Blink the phone's LED flashlight for hearing-impaired users (native only)
  const blinkTorch = useCallback(async () => {
    if (!Capacitor.isNativePlatform()) return;
    if (!getTorchEnabled()) return;
    try {
      const { CapacitorFlash } = await import('@capgo/capacitor-flash');
      const { value: available } = await CapacitorFlash.isAvailable();
      if (!available) return;

      for (let i = 0; i < 5; i++) {
        await CapacitorFlash.switchOn({ intensity: 1 });
        await new Promise(r => setTimeout(r, 250));
        await CapacitorFlash.switchOff();
        await new Promise(r => setTimeout(r, 150));
      }
    } catch (e) {
      console.warn('Torch blink unavailable:', e);
    }
  }, []);

  // Speak medication name aloud using browser TTS
  const speakReminder = useCallback((medicationName?: string, isMissed = false) => {
    if (!getVoiceEnabled() || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const message = isMissed
      ? `Attention. You missed your dose of ${medicationName || 'medication'}. Please take it now.`
      : `Time to take your ${medicationName || 'medication'}.`;
    const utterance = new SpeechSynthesisUtterance(message);
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 1;
    window.speechSynthesis.speak(utterance);
  }, []);

  // Trigger screen flash for hearing impaired
  const triggerScreenFlash = useCallback((medicationName?: string) => {
    setMissedDoseAlert({ active: true, medicationName });
  }, []);

  const dismissFlash = useCallback(() => {
    setMissedDoseAlert({ active: false });
  }, []);

  // Check if any dose is due now or MISSED
  const checkDoses = useCallback(() => {
    if (!enabled) return;

    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const nowMs = now.getTime();

    doses.forEach(dose => {
      if (dose.status !== 'pending') return;

      const [doseHour, doseMinute] = dose.time.split(':').map(Number);
      const doseKey = `${dose.scheduledDoseId}-${now.toDateString()}`;

      // Calculate minutes past scheduled time
      const scheduledMinutes = doseHour * 60 + doseMinute;
      const currentMinutes = currentHour * 60 + currentMinute;
      const minutesPast = currentMinutes - scheduledMinutes;

      // ON-TIME REMINDER: exact time to 5 minutes past
      const isExactTime = currentHour === doseHour && currentMinute === doseMinute;
      if (isExactTime && !alertedDosesRef.current.has(doseKey)) {
        alertedDosesRef.current.add(doseKey);
        playReminderChime();
        triggerVibration();
        console.log(`🔔 Medication reminder: Time to take ${dose.medicationName}`);
      }

      // MISSED DOSE ALERT: past the threshold, dose still pending
      if (minutesPast >= MISSED_THRESHOLD_MINUTES && minutesPast > 0) {
        const missedKey = `missed-${doseKey}`;
        const lastAlerted = missedAlertedRef.current.get(missedKey) || 0;
        const minutesSinceLastAlert = (nowMs - lastAlerted) / 60000;

        // Alert initially, then re-alert every MISSED_RE_ALERT_MINUTES
        if (lastAlerted === 0 || minutesSinceLastAlert >= MISSED_RE_ALERT_MINUTES) {
          missedAlertedRef.current.set(missedKey, nowMs);

          // Loud alarm sound
          playMissedDoseAlarm();
          // Aggressive vibration
          triggerUrgentVibration();
          // LED torch blink for hearing impaired (native only)
          blinkTorch();
          // Screen flash for hearing impaired (web fallback)
          triggerScreenFlash(dose.medicationName);

          console.log(`🚨 MISSED DOSE ALERT: ${dose.medicationName} was due at ${dose.time}`);
        }
      }
    });
  }, [doses, enabled, playReminderChime, playMissedDoseAlarm, triggerVibration, triggerUrgentVibration, blinkTorch, triggerScreenFlash]);

  // Check every 15 seconds for faster missed-dose detection
  useEffect(() => {
    if (!enabled) return;

    checkDoses();
    checkIntervalRef.current = setInterval(checkDoses, 15000);

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, [checkDoses, enabled]);

  // Reset at midnight
  useEffect(() => {
    const resetAtMidnight = () => {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);

      const msUntilMidnight = tomorrow.getTime() - now.getTime();

      setTimeout(() => {
        alertedDosesRef.current.clear();
        missedAlertedRef.current.clear();
        resetAtMidnight();
      }, msUntilMidnight);
    };

    resetAtMidnight();
  }, []);

  // Manual trigger for testing
  const triggerReminder = useCallback(() => {
    playReminderChime();
    triggerVibration();
  }, [playReminderChime, triggerVibration]);

  // Test missed dose alert
  const triggerMissedDoseTest = useCallback(() => {
    playMissedDoseAlarm();
    triggerUrgentVibration();
    blinkTorch();
    triggerScreenFlash('Test Medication');
  }, [playMissedDoseAlarm, triggerUrgentVibration, blinkTorch, triggerScreenFlash]);

  return {
    triggerReminder,
    triggerMissedDoseTest,
    missedDoseAlert,
    dismissFlash,
  };
}