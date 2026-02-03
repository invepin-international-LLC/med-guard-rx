import { Heart, RefreshCw, Unlink, Activity, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAppleHealth } from '@/hooks/useAppleHealth';
import { useSiriShortcuts } from '@/hooks/useSiriShortcuts';
import { formatDistanceToNow } from 'date-fns';

export function AppleHealthSettings() {
  const {
    isAvailable: healthAvailable,
    isAuthorized: healthAuthorized,
    isSyncing,
    lastSyncDate,
    requestAuthorization,
    syncAdherenceData,
    disconnect,
  } = useAppleHealth();

  const {
    isAvailable: siriAvailable,
    openShortcutsSettings,
    availableShortcuts,
  } = useSiriShortcuts();

  // Show different UI based on platform
  if (!healthAvailable && !siriAvailable) {
    return (
      <Card className="bg-muted/30 border-muted">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Smartphone className="h-5 w-5" />
            Apple Integration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            Apple Health and Siri Shortcuts are only available when running as a native iOS app.
          </p>
          <p className="text-muted-foreground text-sm mt-2">
            To enable these features, build and install the app on an iPhone.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Apple Health Section */}
      <Card className={healthAuthorized ? 'border-green-500/50 bg-green-500/5' : ''}>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-lg">
              <Heart className="h-5 w-5 text-red-500" />
              Apple Health
            </div>
            {healthAuthorized && (
              <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/50">
                Connected
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {healthAvailable ? (
            <>
              <p className="text-sm text-muted-foreground">
                {healthAuthorized 
                  ? 'Your medication adherence data syncs with Apple Health for a complete health picture.'
                  : 'Connect to Apple Health to sync your medication adherence and track health metrics.'}
              </p>

              {healthAuthorized ? (
                <div className="space-y-3">
                  {/* Sync Status */}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Last synced:</span>
                    <span>
                      {lastSyncDate 
                        ? formatDistanceToNow(lastSyncDate, { addSuffix: true })
                        : 'Never'}
                    </span>
                  </div>

                  {/* Data Types */}
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary" className="text-xs">
                      <Activity className="h-3 w-3 mr-1" />
                      Adherence
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      <Heart className="h-3 w-3 mr-1" />
                      Heart Rate
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      Steps
                    </Badge>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={syncAdherenceData}
                      disabled={isSyncing}
                      className="flex-1"
                    >
                      <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
                      {isSyncing ? 'Syncing...' : 'Sync Now'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={disconnect}
                      className="text-destructive hover:text-destructive"
                    >
                      <Unlink className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  onClick={requestAuthorization}
                  className="w-full bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600"
                >
                  <Heart className="h-4 w-4 mr-2" />
                  Connect Apple Health
                </Button>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Apple Health is only available on iPhone.
            </p>
          )}
        </CardContent>
      </Card>

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
          {siriAvailable ? (
            <>
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
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Siri Shortcuts are only available on iPhone.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
