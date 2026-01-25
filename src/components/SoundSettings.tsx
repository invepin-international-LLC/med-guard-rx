import { useState, useEffect } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
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

  return (
    <div className={cn("bg-card rounded-2xl p-5 border-2 border-border", className)}>
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
    </div>
  );
}
