import { useState, useCallback } from 'react';
import { Volume2, VolumeX, Bell, AlertTriangle } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { getSoundEnabled, setSoundEnabled } from '@/hooks/useSoundEffects';

interface SoundSettingsProps {
  className?: string;
}

export function SoundSettings({ className }: SoundSettingsProps) {
  const [enabled, setEnabled] = useState(getSoundEnabled);

  const handleToggle = (checked: boolean) => {
    setEnabled(checked);
    setSoundEnabled(checked);
  };

  const testMedicationChime = useCallback(() => {
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

      if ('vibrate' in navigator) {
        navigator.vibrate([100, 50, 100, 50, 300]);
      }
    } catch (error) {
      console.error('Error playing test chime:', error);
    }
  }, []);

  const testMissedDoseAlarm = useCallback(() => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const t = ctx.currentTime;

      for (let burst = 0; burst < 3; burst++) {
        const offset = burst * 0.6;
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

      if ('vibrate' in navigator) {
        navigator.vibrate([300, 100, 300, 100, 300, 200, 500, 150, 500, 150, 500]);
      }
    } catch (error) {
      console.error('Error playing missed dose alarm:', error);
    }
  }, []);

  return (
    <div className={cn("bg-card rounded-2xl p-5 border-2 border-border space-y-4", className)}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            {enabled ? (
              <Volume2 className="w-7 h-7 text-primary" />
            ) : (
              <VolumeX className="w-7 h-7 text-muted-foreground" />
            )}
          </div>
          <div>
            <h3 className="text-elder-lg text-foreground">Sound Effects</h3>
            <p className="text-muted-foreground">
              {enabled ? 'Audio feedback is on' : 'Audio feedback is muted'}
            </p>
          </div>
        </div>
        <Switch
          checked={enabled}
          onCheckedChange={handleToggle}
          className="scale-125"
        />
      </div>

      {/* Test Medication Reminder */}
      <div className="flex items-center justify-between gap-4 pt-2 border-t border-border">
        <div className="flex items-center gap-3">
          <Bell className="w-5 h-5 text-accent" />
          <div>
            <p className="font-medium">Dose Reminder</p>
            <p className="text-sm text-muted-foreground">Chime & vibration at dose time</p>
          </div>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={testMedicationChime}
          className="gap-2"
        >
          Test
        </Button>
      </div>

      {/* Test Missed Dose Alarm */}
      <div className="flex items-center justify-between gap-4 pt-2 border-t border-border">
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-destructive" />
          <div>
            <p className="font-medium">Missed Dose Alarm</p>
            <p className="text-sm text-muted-foreground">Loud alarm, vibration & flash</p>
          </div>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={testMissedDoseAlarm}
          className="gap-2 border-destructive/30 text-destructive hover:bg-destructive/10"
        >
          Test
        </Button>
      </div>
    </div>
  );
}