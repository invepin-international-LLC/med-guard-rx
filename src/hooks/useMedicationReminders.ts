import { useEffect, useRef, useCallback } from 'react';
import { MedicationDose } from '@/hooks/useMedications';

interface MedicationDoseWithName extends MedicationDose {
  medicationName?: string;
}

interface UseMedicationRemindersProps {
  doses: MedicationDoseWithName[];
  enabled?: boolean;
}

export function useMedicationReminders({ doses, enabled = true }: UseMedicationRemindersProps) {
  const alertedDosesRef = useRef<Set<string>>(new Set());
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Play medication reminder alert (distinct chime)
  const playReminderChime = useCallback(() => {
    try {
      // Create a distinct medication reminder sound using Web Audio API
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // First tone (higher pitch)
      const osc1 = audioContext.createOscillator();
      const gain1 = audioContext.createGain();
      osc1.connect(gain1);
      gain1.connect(audioContext.destination);
      osc1.frequency.setValueAtTime(880, audioContext.currentTime); // A5
      osc1.type = 'sine';
      gain1.gain.setValueAtTime(0.3, audioContext.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      osc1.start(audioContext.currentTime);
      osc1.stop(audioContext.currentTime + 0.3);

      // Second tone (lower pitch, slight delay)
      setTimeout(() => {
        const osc2 = audioContext.createOscillator();
        const gain2 = audioContext.createGain();
        osc2.connect(gain2);
        gain2.connect(audioContext.destination);
        osc2.frequency.setValueAtTime(659.25, audioContext.currentTime); // E5
        osc2.type = 'sine';
        gain2.gain.setValueAtTime(0.3, audioContext.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
        osc2.start(audioContext.currentTime);
        osc2.stop(audioContext.currentTime + 0.3);
      }, 150);

      // Third tone (resolution)
      setTimeout(() => {
        const osc3 = audioContext.createOscillator();
        const gain3 = audioContext.createGain();
        osc3.connect(gain3);
        gain3.connect(audioContext.destination);
        osc3.frequency.setValueAtTime(523.25, audioContext.currentTime); // C5
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

  // Trigger vibration pattern for medication reminder
  const triggerVibration = useCallback(() => {
    if ('vibrate' in navigator) {
      // Distinctive pattern: short-short-long
      navigator.vibrate([100, 50, 100, 50, 300]);
    }
  }, []);

  // Check if any dose is due now
  const checkDoses = useCallback(() => {
    if (!enabled) return;

    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    doses.forEach(dose => {
      // Only check pending doses
      if (dose.status !== 'pending') return;

      // Parse dose time
      const [doseHour, doseMinute] = dose.time.split(':').map(Number);
      
      // Create a unique key for this dose + date
      const doseKey = `${dose.scheduledDoseId}-${now.toDateString()}`;
      
      // Check if this is within the reminder window (exact time to 5 minutes past)
      const isExactTime = currentHour === doseHour && currentMinute === doseMinute;
      const isWithinWindow = 
        currentHour === doseHour && 
        currentMinute >= doseMinute && 
        currentMinute <= doseMinute + 5;

      // Alert if it's time and we haven't alerted for this dose today
      if ((isExactTime || (isWithinWindow && currentMinute === doseMinute)) && 
          !alertedDosesRef.current.has(doseKey)) {
        
        // Mark as alerted
        alertedDosesRef.current.add(doseKey);
        
        // Play chime and vibrate
        playReminderChime();
        triggerVibration();
        
        console.log(`🔔 Medication reminder: Time to take ${dose.medicationName}`);
      }
    });
  }, [doses, enabled, playReminderChime, triggerVibration]);

  // Set up interval to check doses every 30 seconds
  useEffect(() => {
    if (!enabled) return;

    // Initial check
    checkDoses();

    // Set up interval
    checkIntervalRef.current = setInterval(checkDoses, 30000);

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, [checkDoses, enabled]);

  // Reset alerted doses at midnight
  useEffect(() => {
    const resetAtMidnight = () => {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      
      const msUntilMidnight = tomorrow.getTime() - now.getTime();
      
      setTimeout(() => {
        alertedDosesRef.current.clear();
        resetAtMidnight(); // Schedule next reset
      }, msUntilMidnight);
    };

    resetAtMidnight();
  }, []);

  // Manual trigger for testing
  const triggerReminder = useCallback(() => {
    playReminderChime();
    triggerVibration();
  }, [playReminderChime, triggerVibration]);

  return {
    triggerReminder,
  };
}
