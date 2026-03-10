import { useState, useEffect } from 'react';
import { Type, Sun, Monitor, Volume2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

const FONT_SIZE_KEY = 'medguard-font-size';
const HIGH_CONTRAST_KEY = 'medguard-high-contrast';

type FontSize = 'normal' | 'large' | 'extra-large';

const fontSizeLabels: Record<FontSize, string> = {
  normal: 'Normal',
  large: 'Large',
  'extra-large': 'Extra Large',
};

const fontSizeScale: Record<FontSize, string> = {
  normal: '100%',
  large: '112.5%',
  'extra-large': '125%',
};

function getStoredFontSize(): FontSize {
  return (localStorage.getItem(FONT_SIZE_KEY) as FontSize) || 'large';
}

function getStoredHighContrast(): boolean {
  return localStorage.getItem(HIGH_CONTRAST_KEY) === 'true';
}

function applyFontSize(size: FontSize) {
  document.documentElement.style.fontSize = fontSizeScale[size];
  localStorage.setItem(FONT_SIZE_KEY, size);
}

function applyHighContrast(enabled: boolean) {
  if (enabled) {
    document.documentElement.classList.add('high-contrast');
  } else {
    document.documentElement.classList.remove('high-contrast');
  }
  localStorage.setItem(HIGH_CONTRAST_KEY, String(enabled));
}

interface DisplaySettingsProps {
  className?: string;
}

export function DisplaySettings({ className }: DisplaySettingsProps) {
  const [fontSize, setFontSize] = useState<FontSize>(getStoredFontSize);
  const [highContrast, setHighContrast] = useState(getStoredHighContrast);

  useEffect(() => {
    applyFontSize(fontSize);
    applyHighContrast(highContrast);
  }, []);

  const handleFontSize = (size: FontSize) => {
    setFontSize(size);
    applyFontSize(size);
    // Persist to profile if logged in
    saveToProfile({ font_size: size });
  };

  const handleHighContrast = (checked: boolean) => {
    setHighContrast(checked);
    applyHighContrast(checked);
    saveToProfile({ high_contrast_mode: checked });
  };

  const saveToProfile = async (updates: { font_size?: string; high_contrast_mode?: boolean }) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase
        .from('profiles')
        .update(updates)
        .eq('user_id', user.id);
    } catch {
      // Silent fail for settings persistence
    }
  };

  return (
    <div className={cn("bg-muted rounded-2xl p-5 border-2 border-border space-y-5", className)}>
      <div className="flex items-start gap-4">
        <div className="w-14 h-14 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
          <Monitor className="w-7 h-7 text-primary" />
        </div>
        <div className="flex-1">
          <h3 className="text-elder-lg text-foreground">Display Settings</h3>
          <p className="text-muted-foreground mt-1">
            Adjust text size and contrast for easier reading.
          </p>
        </div>
      </div>

      {/* Font Size */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Type className="w-5 h-5 text-muted-foreground" />
          <span className="text-base font-medium text-foreground">Text Size</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {(Object.keys(fontSizeLabels) as FontSize[]).map((size) => (
            <button
              key={size}
              onClick={() => handleFontSize(size)}
              className={cn(
                "rounded-xl py-3 px-2 text-center font-medium border-2 transition-all",
                fontSize === size
                  ? "bg-primary text-primary-foreground border-primary shadow-md"
                  : "bg-card text-foreground border-border hover:border-primary/50"
              )}
              style={{
                fontSize: size === 'normal' ? '14px' : size === 'large' ? '16px' : '18px',
              }}
            >
              {fontSizeLabels[size]}
            </button>
          ))}
        </div>
        <p className="text-sm text-muted-foreground text-center">
          Preview: <span style={{ fontSize: fontSizeScale[fontSize] }}>Aa Bb Cc 123</span>
        </p>
      </div>

      {/* High Contrast */}
      <div className="flex items-center justify-between gap-4 pt-2">
        <div className="flex items-center gap-3">
          <Sun className="w-5 h-5 text-muted-foreground" />
          <div>
            <p className="text-base font-medium text-foreground">High Contrast</p>
            <p className="text-sm text-muted-foreground">Bolder text & stronger colors</p>
          </div>
        </div>
        <Switch
          checked={highContrast}
          onCheckedChange={handleHighContrast}
          className="scale-125"
        />
      </div>
    </div>
  );
}
