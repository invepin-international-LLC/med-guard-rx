import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Types for Siri Shortcuts
interface ShortcutOptions {
  persistentIdentifier: string;
  title: string;
  suggestedInvocationPhrase: string;
  isEligibleForSearch: boolean;
  isEligibleForPrediction: boolean;
  userInfo: Record<string, string>;
}

interface ShortcutResponse {
  deeplink?: string;
  action?: string;
  timeOfDay?: string;
}

// Check if we're running in Capacitor on iOS
const isNativeiOS = () => {
  return typeof window !== 'undefined' && 
         window.Capacitor?.getPlatform() === 'ios';
};

// Dynamic import of Siri Shortcuts plugin
const getSiriPlugin = async (): Promise<any> => {
  if (!isNativeiOS()) return null;
  try {
    // Try to get Siri Shortcuts from registered plugins
    const { registerPlugin } = await import('@capacitor/core');
    const SiriShortcuts = registerPlugin('SiriShortcuts');
    return SiriShortcuts;
  } catch (e) {
    console.log('Siri Shortcuts not available:', e);
    return null;
  }
};

// Predefined shortcuts for medication management
const MEDICATION_SHORTCUTS: ShortcutOptions[] = [
  {
    persistentIdentifier: 'log-morning-meds',
    title: 'Log Morning Medications',
    suggestedInvocationPhrase: 'Log my morning meds',
    isEligibleForSearch: true,
    isEligibleForPrediction: true,
    userInfo: { action: 'log_dose', timeOfDay: 'morning' },
  },
  {
    persistentIdentifier: 'log-afternoon-meds',
    title: 'Log Afternoon Medications',
    suggestedInvocationPhrase: 'Log my afternoon meds',
    isEligibleForSearch: true,
    isEligibleForPrediction: true,
    userInfo: { action: 'log_dose', timeOfDay: 'afternoon' },
  },
  {
    persistentIdentifier: 'log-evening-meds',
    title: 'Log Evening Medications',
    suggestedInvocationPhrase: 'Log my evening meds',
    isEligibleForSearch: true,
    isEligibleForPrediction: true,
    userInfo: { action: 'log_dose', timeOfDay: 'evening' },
  },
  {
    persistentIdentifier: 'log-bedtime-meds',
    title: 'Log Bedtime Medications',
    suggestedInvocationPhrase: 'Log my bedtime meds',
    isEligibleForSearch: true,
    isEligibleForPrediction: true,
    userInfo: { action: 'log_dose', timeOfDay: 'bedtime' },
  },
  {
    persistentIdentifier: 'check-schedule',
    title: 'Check Medication Schedule',
    suggestedInvocationPhrase: "What's my medication schedule",
    isEligibleForSearch: true,
    isEligibleForPrediction: true,
    userInfo: { action: 'view_schedule', deeplink: 'schedule' },
  },
  {
    persistentIdentifier: 'check-refills',
    title: 'Check Refills Needed',
    suggestedInvocationPhrase: 'Do I need any refills',
    isEligibleForSearch: true,
    isEligibleForPrediction: true,
    userInfo: { action: 'view_refills', deeplink: 'refills' },
  },
];

export function useSiriShortcuts() {
  // Donate all shortcuts when the app starts (makes them available to Siri)
  const donateAllShortcuts = useCallback(async () => {
    const SiriShortcuts = await getSiriPlugin();
    if (!SiriShortcuts) return;

    try {
      for (const shortcut of MEDICATION_SHORTCUTS) {
        await SiriShortcuts.donate(shortcut);
      }
      console.log('Siri shortcuts donated successfully');
    } catch (error) {
      console.error('Error donating shortcuts:', error);
    }
  }, []);

  // Handle shortcut activation (when user says the phrase)
  const handleShortcutActivation = useCallback(async (response: ShortcutResponse) => {
    const { action, timeOfDay, deeplink } = response;

    if (action === 'log_dose' && timeOfDay) {
      // Auto-log all pending doses for this time of day
      await logDosesForTimeOfDay(timeOfDay);
    } else if (action === 'view_schedule') {
      // Navigate to schedule view
      window.location.hash = '#schedule';
    } else if (action === 'view_refills') {
      // Navigate to refills view
      window.location.hash = '#refills';
    } else if (deeplink) {
      // Generic deeplink handling
      window.location.hash = `#${deeplink}`;
    }
  }, []);

  // Log all pending doses for a specific time of day
  const logDosesForTimeOfDay = async (timeOfDay: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please sign in to log medications');
        return;
      }

      // Get today's date range
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Find pending doses for this time of day
      const { data: pendingDoses, error } = await supabase
        .from('dose_logs')
        .select(`
          id,
          medication_id,
          scheduled_dose_id,
          scheduled_for,
          scheduled_doses!inner(time_of_day),
          medications!inner(name)
        `)
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .gte('scheduled_for', today.toISOString())
        .lt('scheduled_for', tomorrow.toISOString())
        .eq('scheduled_doses.time_of_day', timeOfDay);

      if (error) throw error;

      if (!pendingDoses || pendingDoses.length === 0) {
        toast.info(`No ${timeOfDay} medications to log`);
        return;
      }

      // Mark all as taken
      const now = new Date().toISOString();
      const { error: updateError } = await supabase
        .from('dose_logs')
        .update({ 
          status: 'taken',
          action_at: now,
        })
        .in('id', pendingDoses.map(d => d.id));

      if (updateError) throw updateError;

      const medNames = pendingDoses.map((d: any) => d.medications?.name).filter(Boolean);
      toast.success(`Logged ${timeOfDay} meds: ${medNames.join(', ')} ✓`, {
        duration: 5000,
      });

      // Trigger haptic feedback if available
      if (navigator.vibrate) {
        navigator.vibrate([50, 30, 50]);
      }
    } catch (error) {
      console.error('Error logging doses via Siri:', error);
      toast.error('Failed to log medications');
    }
  };

  // Set up listener for shortcut activations
  useEffect(() => {
    let removeListener: (() => void) | undefined;

    const setupListener = async () => {
      const SiriShortcuts = await getSiriPlugin();
      if (!SiriShortcuts) return;

      try {
        // Listen for app launch via Siri shortcut
        const listener = await SiriShortcuts.addListener(
          'appLaunchBySirishortcuts',
          (response: ShortcutResponse) => {
            console.log('App launched via Siri:', response);
            handleShortcutActivation(response);
          }
        );
        removeListener = () => listener.remove();

        // Donate shortcuts on startup
        await donateAllShortcuts();
      } catch (error) {
        console.error('Error setting up Siri listener:', error);
      }
    };

    setupListener();

    return () => {
      removeListener?.();
    };
  }, [donateAllShortcuts, handleShortcutActivation]);

  // Donate a custom shortcut (e.g., after taking a specific medication)
  const donateCustomShortcut = useCallback(async (
    identifier: string,
    title: string,
    phrase: string,
    userInfo: Record<string, string>
  ) => {
    const SiriShortcuts = await getSiriPlugin();
    if (!SiriShortcuts) return;

    try {
      await SiriShortcuts.donate({
        persistentIdentifier: identifier,
        title,
        suggestedInvocationPhrase: phrase,
        isEligibleForSearch: true,
        isEligibleForPrediction: true,
        userInfo,
      });
    } catch (error) {
      console.error('Error donating custom shortcut:', error);
    }
  }, []);

  // Open Siri Shortcuts settings (for user to add voice triggers)
  const openShortcutsSettings = useCallback(() => {
    // On iOS, we can try to open the Shortcuts app
    if (isNativeiOS()) {
      window.open('shortcuts://', '_system');
    } else {
      toast.info('Siri Shortcuts are only available on iOS');
    }
  }, []);

  return {
    isAvailable: isNativeiOS(),
    donateAllShortcuts,
    donateCustomShortcut,
    openShortcutsSettings,
    availableShortcuts: MEDICATION_SHORTCUTS,
  };
}
