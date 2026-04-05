import { Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useSiriShortcuts } from '@/hooks/useSiriShortcuts';

export function SiriShortcutsSettings() {
  const {
    isAvailable: siriAvailable,
    openShortcutsSettings,
    availableShortcuts,
  } = useSiriShortcuts();

  // Hide entirely when Siri is not available
  if (!siriAvailable) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Siri Shortcuts Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
            Siri Shortcuts
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Use your voice to log medications and check your schedule.
          </p>

          {/* Available Phrases */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Available voice commands:</p>
            <div className="space-y-1">
              {availableShortcuts.slice(0, 4).map((shortcut) => (
                <div
                  key={shortcut.persistentIdentifier}
                  className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg px-3 py-2"
                >
                  <span className="text-primary">"Hey Siri,</span>
                  <span>{shortcut.suggestedInvocationPhrase}"</span>
                </div>
              ))}
            </div>
          </div>

          <Button
            variant="outline"
            onClick={openShortcutsSettings}
            className="w-full"
          >
            Open Shortcuts App
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
