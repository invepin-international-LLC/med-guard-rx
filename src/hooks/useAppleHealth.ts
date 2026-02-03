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
  return typeof window !== 'undefined' && 
         window.Capacitor?.getPlatform() === 'ios';
};

// Dynamic import of Health plugin
const getHealthPlugin = async () => {
  if (!isNativeiOS()) return null;
  try {
    const { Health } = await import('@capgo/capacitor-health');
    return Health;
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
      const Health = await getHealthPlugin();
      if (!Health) {
        setIsAvailable(false);
        return;
      }

      try {
        const { available } = await Health.isAvailable();
        setIsAvailable(available);
        
        if (available) {
          // Check if already authorized
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
      // Request read/write access for relevant data types
      await Health.requestAuthorization({
        read: [
          'steps',
          'heartRate',
          'weight',
        ],
        write: [],
      });

      setIsAuthorized(true);
      localStorage.setItem('healthkit_authorized', 'true');
      toast.success('Apple Health connected! 🍎');
      return true;
    } catch (error) {
      console.error('HealthKit authorization error:', error);
      toast.error('Failed to connect to Apple Health');
      return false;
    }
  }, []);

  // Sync medications to HealthKit (write medication records)
  const syncMedicationsToHealth = useCallback(async (medications: MedicationRecord[]) => {
    if (!isAuthorized) {
      console.log('Not authorized to sync to HealthKit');
      return false;
    }

    // Note: HealthKit medication data is read-only in most plugins
    // We'll store a reference locally and sync adherence data instead
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

  // Read health data that might be relevant for medication interactions
  const readHealthData = useCallback(async () => {
    const Health = await getHealthPlugin();
    if (!Health || !isAuthorized) return null;

    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7); // Last 7 days

      const healthData: Record<string, HealthDataPoint[]> = {};

      // Read steps (general health indicator)
      try {
        const steps = await Health.queryAggregated({
          dataType: 'steps',
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          bucket: 'day',
        });
        healthData.steps = (steps as any).aggregatedData || [];
      } catch (e) {
        console.log('Steps data not available');
      }

      // Read heart rate (important for many medications)
      try {
        const heartRate = await (Health as any).queryRaw({
          dataType: 'heartRate',
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          limit: 50,
        });
        healthData.heartRate = heartRate?.data || [];
      } catch (e) {
        console.log('Heart rate data not available');
      }

      return healthData;
    } catch (error) {
      console.error('Error reading health data:', error);
      return null;
    }
  }, [isAuthorized]);

  // Sync adherence data to local storage (for health report export)
  const syncAdherenceData = useCallback(async () => {
    if (!isAuthorized) return;

    setIsSyncing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get last 30 days of dose logs
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

      // Calculate daily adherence
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

      // Store for health export
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

// Extend Window interface for Capacitor
declare global {
  interface Window {
    Capacitor?: {
      getPlatform: () => string;
    };
  }
}
