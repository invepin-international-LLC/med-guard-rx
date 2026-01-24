import { usePushNotifications } from '@/hooks/usePushNotifications';
import { Button } from '@/components/ui/button';
import { Bell, BellOff, BellRing, Smartphone, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NotificationSettingsProps {
  className?: string;
}

export function NotificationSettings({ className }: NotificationSettingsProps) {
  const { 
    isSupported, 
    isRegistered, 
    permissionStatus,
    requestPermission 
  } = usePushNotifications();

  const handleEnableNotifications = async () => {
    await requestPermission();
  };

  // Not on a native device
  if (!isSupported) {
    return (
      <div className={cn("bg-muted rounded-2xl p-5 border-2 border-border", className)}>
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
            <Smartphone className="w-7 h-7 text-muted-foreground" />
          </div>
          <div className="flex-1">
            <h3 className="text-elder-lg text-foreground">Push Notifications</h3>
            <p className="text-muted-foreground mt-1">
              Install the MedRemind app on your iPhone or Android to receive medication reminders even when you're not using the app.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Already registered
  if (isRegistered && permissionStatus === 'granted') {
    return (
      <div className={cn("bg-success/10 rounded-2xl p-5 border-2 border-success/30", className)}>
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-full bg-success/20 flex items-center justify-center flex-shrink-0">
            <BellRing className="w-7 h-7 text-success" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-elder-lg text-foreground">Notifications Enabled</h3>
              <CheckCircle className="w-5 h-5 text-success" />
            </div>
            <p className="text-muted-foreground mt-1">
              You'll receive reminders for your scheduled medications.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Permission denied
  if (permissionStatus === 'denied') {
    return (
      <div className={cn("bg-destructive/10 rounded-2xl p-5 border-2 border-destructive/30", className)}>
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-full bg-destructive/20 flex items-center justify-center flex-shrink-0">
            <BellOff className="w-7 h-7 text-destructive" />
          </div>
          <div className="flex-1">
            <h3 className="text-elder-lg text-foreground">Notifications Blocked</h3>
            <p className="text-muted-foreground mt-1">
              To receive medication reminders, please enable notifications in your device settings.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Go to Settings → MedRemind → Notifications → Allow Notifications
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Can request permission
  return (
    <div className={cn("bg-accent/10 rounded-2xl p-5 border-2 border-accent/30", className)}>
      <div className="flex items-start gap-4">
        <div className="w-14 h-14 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
          <Bell className="w-7 h-7 text-accent" />
        </div>
        <div className="flex-1">
          <h3 className="text-elder-lg text-foreground">Enable Reminders</h3>
          <p className="text-muted-foreground mt-1 mb-4">
            Get notified when it's time to take your medications, even when the app is closed.
          </p>
          <Button 
            onClick={handleEnableNotifications}
            className="w-full h-14 text-lg gap-2"
            size="lg"
          >
            <Bell className="w-6 h-6" />
            Enable Push Notifications
          </Button>
        </div>
      </div>
    </div>
  );
}
