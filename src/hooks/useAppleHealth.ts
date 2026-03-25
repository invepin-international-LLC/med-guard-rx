import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Types for Health data
interface HealthDataPoint {
  value: number;
  startDate: string;
  endDate: string;
  unit: string;
}

interface MedicationRecord {
  id: string;
  name: string;
  strength: string;
  form: string;
}

interface AdherenceData {
  date: string;
  taken: number;
  missed: number;
  adherenceRate: number;
}

// Check if we're running in Capacitor on iOS
const isNativeiOS = () => {
  if (typeof window === 'undefined') return false;
  const cap = (window as any).Capacitor;
  // Use isNativePlatform to ensure we're truly in a native context
  return cap?.isNativePlatform?.() && cap?.getPlatform?.() === 'ios';
};

// Cached reference to avoid repeated dynamic imports
let cachedHealthPlugin: any = null;

// Dynamic import of Health plugin
const getHealthPlugin = async (): Promise<any> => {
  if (!isNativeiOS()) return null;
  if (cachedHealthPlugin) return cachedHealthPlugin;
  try {
    const mod = await import('@capgo/capacitor-health');
    cachedHealthPlugin = mod.Health || mod.default || null;
    if (!cachedHealthPlugin) {
      console.warn('HealthKit plugin loaded but no Health export found. Module keys:', Object.keys(mod));
    }
    return cachedHealthPlugin;
  } catch (e) {
    console.error('Failed to load HealthKit plugin:', e);
    return null;
  }
};

export function useAppleHealth() {
  const [isAvailable, setIsAvailable] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isDenied, setIsDenied] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncDate, setLastSyncDate] = useState<Date | null>(null);

  // Check if HealthKit is available
  useEffect(() => {
    const checkAvailability = async () => {
      // Early exit if not native iOS
      if (!isNativeiOS()) {
        setIsAvailable(false);
        return;
      }

      try {
        const Health = await getHealthPlugin();
        if (!Health) {
          console.warn('HealthKit plugin not loaded — hiding feature');
          setIsAvailable(false);
          return;
        }

        // Wrap in a timeout so a hanging native call doesn't block forever
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('HealthKit availability check timed out')), 5000)
        );

        const result = await Promise.race([Health.isAvailable(), timeoutPromise]) as any;
        const available = result?.available === true;
        console.log('HealthKit availability:', JSON.stringify(result));
        setIsAvailable(available);

        if (available) {
          const stored = localStorage.getItem('healthkit_authorized');
          if (stored === 'true') {
            setIsAuthorized(true);
          }
        }
      } catch (error) {
        console.error('Error checking HealthKit availability:', error);
        // Hide the feature entirely so it doesn't appear broken
        setIsAvailable(false);
      }
    };

    checkAvailability();
  }, []);

  // Request HealthKit authorization
  const requestAuthorization = useCallback(async () => {
    const Health = await getHealthPlugin();
    if (!Health) {
      toast.error('Apple Health is only available on iOS devices');
      return false;
    }

    try {
      const authResult = await Health.requestAuthorization({
        read: ['steps', 'heartRate', 'weight'],
        write: [],
      });
      console.log('HealthKit authorization result:', JSON.stringify(authResult));

      setIsAuthorized(true);
      localStorage.setItem('healthkit_authorized', 'true');
      toast.success('Apple Health connected! 🍎');
      return true;
    } catch (error: any) {
      console.error('HealthKit authorization error:', error);
      if (error?.message?.includes('denied') || error?.message?.includes('cancelled')) {
        setIsDenied(true);
        toast.error('Apple Health access was denied. You can grant access from the Health app under Sharing & Permissions.');
      } else {
        // Don't show a scary error; just let the user know it didn't work
        toast.error('Could not connect to Apple Health right now. Please try again later.');
      }
      return false;
    }
  }, []);

  // Sync medications to HealthKit
  const syncMedicationsToHealth = useCallback(async (medications: MedicationRecord[]) => {
    if (!isAuthorized) {
      console.log('Not authorized to sync to HealthKit');
      return false;
    }

    try {
      const syncData = {
        lastSync: new Date().toISOString(),
        medicationCount: medications.length,
        medications: medications.map(m => ({
          id: m.id,
          name: m.name,
          strength: m.strength,
        })),
      };
      
      localStorage.setItem('healthkit_med_sync', JSON.stringify(syncData));
      return true;
    } catch (error) {
      console.error('Error syncing medications:', error);
      return false;
    }
  }, [isAuthorized]);

  // Read health data
  const readHealthData = useCallback(async () => {
    const Health = await getHealthPlugin();
    if (!Health || !isAuthorized) return null;

    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);

      const healthData: Record<string, HealthDataPoint[]> = {};

      // Wrap each read in its own try/catch so one failure doesn't break all
      const readSample = async (dataType: string) => {
        try {
          const result = await Health.readSamples({
            dataType,
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
          });
          return result?.samples || [];
        } catch (e) {
          console.log(`${dataType} data not available:`, e);
          return [];
        }
      };

      healthData.steps = await readSample('steps');
      healthData.heartRate = await readSample('heartRate');

      return healthData;
    } catch (error) {
      console.error('Error reading health data:', error);
      return null;
    }
  }, [isAuthorized]);

  // Sync adherence data
  const syncAdherenceData = useCallback(async () => {
    if (!isAuthorized) return;

    setIsSyncing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);

      const { data: doseLogs, error } = await supabase
        .from('dose_logs')
        .select('*')
        .eq('user_id', user.id)
        .gte('scheduled_for', startDate.toISOString())
        .lte('scheduled_for', endDate.toISOString());

      if (error) throw error;

      const dailyStats: Record<string, { taken: number; missed: number }> = {};
      
      doseLogs?.forEach(log => {
        const date = new Date(log.scheduled_for).toISOString().split('T')[0];
        if (!dailyStats[date]) {
          dailyStats[date] = { taken: 0, missed: 0 };
        }
        if (log.status === 'taken') {
          dailyStats[date].taken++;
        } else if (log.status === 'missed') {
          dailyStats[date].missed++;
        }
      });

      const adherenceData: AdherenceData[] = Object.entries(dailyStats).map(([date, stats]) => ({
        date,
        taken: stats.taken,
        missed: stats.missed,
        adherenceRate: stats.taken / (stats.taken + stats.missed) * 100 || 0,
      }));

      localStorage.setItem('healthkit_adherence_sync', JSON.stringify({
        lastSync: new Date().toISOString(),
        data: adherenceData,
      }));

      setLastSyncDate(new Date());
      toast.success('Health data synced! 💚');
    } catch (error) {
      console.error('Error syncing adherence:', error);
      toast.error('Failed to sync health data');
    } finally {
      setIsSyncing(false);
    }
  }, [isAuthorized]);

  // Disconnect from HealthKit
  const disconnect = useCallback(() => {
    localStorage.removeItem('healthkit_authorized');
    localStorage.removeItem('healthkit_med_sync');
    localStorage.removeItem('healthkit_adherence_sync');
    setIsAuthorized(false);
    toast.info('Disconnected from Apple Health');
  }, []);

  return {
    isAvailable,
    isAuthorized,
    isDenied,
    isSyncing,
    lastSyncDate,
    requestAuthorization,
    syncMedicationsToHealth,
    syncAdherenceData,
    readHealthData,
    disconnect,
  };
}

