import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Types for Capacitor Push Notifications (when running on native)
interface PushNotificationToken {
  value: string;
}

interface PushNotificationActionPerformed {
  actionId: string;
  notification: {
    title?: string;
    body?: string;
    data?: Record<string, unknown>;
  };
}

interface PushNotification {
  title?: string;
  body?: string;
  data?: Record<string, unknown>;
}

// Check if we're running in Capacitor
const isNative = () => {
  return typeof window !== 'undefined' && 
         window.Capacitor !== undefined;
};

// Dynamic import of Capacitor Push Notifications
const getPushNotificationsPlugin = async () => {
  if (!isNative()) return null;
  try {
    const { PushNotifications } = await import('@capacitor/push-notifications');
    return PushNotifications;
  } catch (e) {
    console.log('Push notifications not available:', e);
    return null;
  }
};

export function usePushNotifications() {
  const [isSupported, setIsSupported] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<'prompt' | 'granted' | 'denied'>('prompt');

  // Check if push notifications are supported
  useEffect(() => {
    const checkSupport = async () => {
      const PushNotifications = await getPushNotificationsPlugin();
      if (PushNotifications) {
        setIsSupported(true);
        
        // Check current permission status
        const status = await PushNotifications.checkPermissions();
        setPermissionStatus(status.receive as 'prompt' | 'granted' | 'denied');
      }
    };
    checkSupport();
  }, []);

  // Register device token with backend
  const registerToken = useCallback(async (pushToken: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('No user logged in, cannot register token');
        return;
      }

      // Detect platform
      const platform = window.Capacitor?.getPlatform() || 'web';

      // Upsert the token
      const { error } = await supabase
        .from('push_tokens')
        .upsert({
          user_id: user.id,
          token: pushToken,
          platform: platform === 'ios' ? 'ios' : platform === 'android' ? 'android' : 'web',
          device_name: navigator.userAgent.slice(0, 100),
          is_active: true,
        }, {
          onConflict: 'user_id,token'
        });

      if (error) throw error;
      
      setToken(pushToken);
      setIsRegistered(true);
      console.log('Push token registered successfully');
    } catch (error) {
      console.error('Error registering push token:', error);
    }
  }, []);

  // Request permissions and register for push notifications
  const requestPermission = useCallback(async () => {
    const PushNotifications = await getPushNotificationsPlugin();
    if (!PushNotifications) {
      toast.error('Push notifications are only available on iOS/Android devices');
      return false;
    }

    try {
      // Request permission
      const permResult = await PushNotifications.requestPermissions();
      
      if (permResult.receive === 'granted') {
        setPermissionStatus('granted');
        
        // Register with Apple/Google to get token
        await PushNotifications.register();
        
        toast.success('Push notifications enabled! 🔔');
        return true;
      } else {
        setPermissionStatus('denied');
        toast.error('Push notification permission denied');
        return false;
      }
    } catch (error) {
      console.error('Error requesting push permission:', error);
      toast.error('Failed to enable push notifications');
      return false;
    }
  }, []);

  // Set up listeners
  useEffect(() => {
    let removeRegistration: (() => void) | undefined;
    let removeError: (() => void) | undefined;
    let removeNotification: (() => void) | undefined;
    let removeAction: (() => void) | undefined;

    const setupListeners = async () => {
      const PushNotifications = await getPushNotificationsPlugin();
      if (!PushNotifications) return;

      // On successful registration, save the token
      const registrationListener = await PushNotifications.addListener(
        'registration',
        (token: PushNotificationToken) => {
          console.log('Push registration success, token:', token.value);
          registerToken(token.value);
        }
      );
      removeRegistration = () => registrationListener.remove();

      // Handle registration errors
      const errorListener = await PushNotifications.addListener(
        'registrationError',
        (error: { error: string }) => {
          console.error('Push registration error:', error);
          toast.error('Failed to register for push notifications');
        }
      );
      removeError = () => errorListener.remove();

      // Handle foreground notifications
      const notificationListener = await PushNotifications.addListener(
        'pushNotificationReceived',
        (notification: PushNotification) => {
          console.log('Push notification received:', notification);
          
          // Show as toast when app is in foreground
          toast(notification.title || 'Medication Reminder', {
            description: notification.body,
            duration: 10000,
            action: notification.data?.doseId ? {
              label: 'Take Now',
              onClick: () => {
                // Handle take action
                console.log('Take dose:', notification.data?.doseId);
              }
            } : undefined,
          });
        }
      );
      removeNotification = () => notificationListener.remove();

      // Handle notification tap (app opened from notification)
      const actionListener = await PushNotifications.addListener(
        'pushNotificationActionPerformed',
        (action: PushNotificationActionPerformed) => {
          console.log('Push notification action:', action);
          
          // Navigate to relevant screen based on notification data
          const data = action.notification.data;
          if (data?.doseId) {
            // Could navigate to the specific medication
            console.log('Should navigate to dose:', data.doseId);
          }
        }
      );
      removeAction = () => actionListener.remove();
    };

    setupListeners();

    return () => {
      removeRegistration?.();
      removeError?.();
      removeNotification?.();
      removeAction?.();
    };
  }, [registerToken]);

  // Unregister token (on logout)
  const unregisterToken = useCallback(async () => {
    if (!token) return;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('push_tokens')
        .update({ is_active: false })
        .eq('user_id', user.id)
        .eq('token', token);

      setIsRegistered(false);
      setToken(null);
    } catch (error) {
      console.error('Error unregistering token:', error);
    }
  }, [token]);

  return {
    isSupported,
    isRegistered,
    permissionStatus,
    requestPermission,
    unregisterToken,
  };
}

// Extend Window interface for Capacitor
declare global {
  interface Window {
    Capacitor?: {
      getPlatform: () => string;
    };
  }
}
