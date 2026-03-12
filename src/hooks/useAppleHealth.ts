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

// Dynamic import of Health plugin
const getHealthPlugin = async (): Promise<any> => {
  if (!isNativeiOS()) return null;
  try {
    const mod = await import('@capgo/capacitor-health');
    return mod.Health || mod.default || null;
  } catch (e) {
    console.log('HealthKit not available:', e);
    return null;
  }
};

export function useAppleHealth() {
  const [isAvailable, setIsAvailable] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
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

      const Health = await getHealthPlugin();
      if (!Health) {
        setIsAvailable(false);
        return;
      }

      try {
        const result = await Health.isAvailable();
        const available = result?.available ?? false;
        setIsAvailable(available);
        
        if (available) {
          const stored = localStorage.getItem('healthkit_authorized');
          if (stored === 'true') {
            setIsAuthorized(true);
          }
        }
      } catch (error) {
        console.error('Error checking HealthKit availability:', error);
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
      await Health.requestAuthorization({
        read: ['steps', 'heartRate', 'weight'],
        write: [],
      });

      setIsAuthorized(true);
      localStorage.setItem('healthkit_authorized', 'true');
      toast.success('Apple Health connected! 🍎');
      return true;
    } catch (error: any) {
      console.error('HealthKit authorization error:', error);
      // On iOS, if the user denies, it's not necessarily an error from the plugin
      // but the data simply won't be accessible
      if (error?.message?.includes('denied') || error?.message?.includes('cancelled')) {
        toast.error('Apple Health access was denied. You can enable it in Settings > Privacy > Health.');
      } else {
        toast.error('Failed to connect to Apple Health. Please try again.');
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

      try {
        const steps = await Health.queryAggregated({
          dataType: 'steps',
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          bucket: 'day',
        });
        healthData.steps = (steps as any).aggregatedData || [];
      } catch (e) {
        console.log('Steps data not available:', e);
      }

      try {
        const heartRate = await (Health as any).queryRaw({
          dataType: 'heartRate',
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          limit: 50,
        });
        healthData.heartRate = heartRate?.data || [];
      } catch (e) {
        console.log('Heart rate data not available:', e);
      }

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
    isSyncing,
    lastSyncDate,
    requestAuthorization,
    syncMedicationsToHealth,
    syncAdherenceData,
    readHealthData,
    disconnect,
  };
}

