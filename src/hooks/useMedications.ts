import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'bedtime';
export type DoseStatus = 'pending' | 'taken' | 'skipped' | 'snoozed' | 'missed';

export interface Medication {
  id: string;
  name: string;
  genericName?: string;
  strength: string;
  form: string;
  purpose?: string;
  howItWorks?: string;
  instructions?: string;
  sideEffects?: string[];
  importantWarnings?: string[];
  refillDate?: string;
  quantityRemaining?: number;
  prescriber?: string;
  imageUrl?: string;
}

export interface MedicationDose {
  id: string;
  medicationId: string;
  scheduledDoseId: string;
  time: string;
  timeOfDay: TimeOfDay;
  status: DoseStatus;
  takenAt?: string;
  snoozeUntil?: string;
  scheduledFor: string;
}

export interface UserProfile {
  name: string;
  dateOfBirth?: string;
  allergies: string[];
  conditions: string[];
}

export interface AdherenceStats {
  currentStreak: number;
  longestStreak: number;
  weeklyAdherence: number;
  monthlyAdherence: number;
  todayTaken: number;
  todayTotal: number;
}

export function useMedications() {
  const [medications, setMedications] = useState<Medication[]>([]);
  const [doses, setDoses] = useState<MedicationDose[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<AdherenceStats>({
    currentStreak: 0,
    longestStreak: 0,
    weeklyAdherence: 0,
    monthlyAdherence: 0,
    todayTaken: 0,
    todayTotal: 0,
  });
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  // Get current user
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
    };
    getUser();
  }, []);

  // Fetch medications
  const fetchMedications = useCallback(async () => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from('medications')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true);

      if (error) throw error;

      const meds: Medication[] = (data || []).map(med => ({
        id: med.id,
        name: med.name,
        genericName: med.generic_name || undefined,
        strength: med.strength,
        form: med.form,
        purpose: med.purpose || undefined,
        howItWorks: med.how_it_works || undefined,
        instructions: med.instructions || undefined,
        sideEffects: med.side_effects || [],
        importantWarnings: med.important_warnings || [],
        refillDate: med.refill_date || undefined,
        quantityRemaining: med.quantity_remaining ?? undefined,
        prescriber: med.prescriber || undefined,
        imageUrl: med.image_url || undefined,
      }));

      setMedications(meds);
    } catch (error) {
      console.error('Error fetching medications:', error);
    }
  }, [userId]);

  // Fetch today's doses
  const fetchTodaysDoses = useCallback(async () => {
    if (!userId) return;

    try {
      const today = new Date();
      const startOfDay = new Date(today);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(today);
      endOfDay.setHours(23, 59, 59, 999);
      const dayOfWeek = today.getDay();

      // Get scheduled doses for today
      const { data: scheduledDoses, error: scheduleError } = await supabase
        .from('scheduled_doses')
        .select(`
          id,
          medication_id,
          scheduled_time,
          time_of_day,
          days_of_week
        `)
        .eq('user_id', userId)
        .eq('is_active', true);

      if (scheduleError) throw scheduleError;

      // Filter to today's doses based on days_of_week
      const todaysScheduled = (scheduledDoses || []).filter(dose => {
        const daysOfWeek = dose.days_of_week as number[] | null;
        if (!daysOfWeek || daysOfWeek.length === 0) return true;
        return daysOfWeek.includes(dayOfWeek);
      });

      // Get dose logs for today
      const { data: doseLogs, error: logsError } = await supabase
        .from('dose_logs')
        .select('*')
        .eq('user_id', userId)
        .gte('scheduled_for', startOfDay.toISOString())
        .lte('scheduled_for', endOfDay.toISOString());

      if (logsError) throw logsError;

      // Create dose log map for quick lookup
      const doseLogMap = new Map<string, typeof doseLogs[0]>();
      (doseLogs || []).forEach(log => {
        doseLogMap.set(log.scheduled_dose_id, log);
      });

      // Build doses array
      const todaysDoses: MedicationDose[] = todaysScheduled.map(scheduled => {
        const log = doseLogMap.get(scheduled.id);
        const [hours, minutes] = scheduled.scheduled_time.split(':');
        const scheduledFor = new Date(today);
        scheduledFor.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);

        return {
          id: log?.id || `temp-${scheduled.id}`,
          medicationId: scheduled.medication_id,
          scheduledDoseId: scheduled.id,
          time: scheduled.scheduled_time.slice(0, 5), // HH:MM
          timeOfDay: scheduled.time_of_day as TimeOfDay,
          status: (log?.status as DoseStatus) || 'pending',
          takenAt: log?.action_at ? new Date(log.action_at).toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: true 
          }) : undefined,
          snoozeUntil: log?.snoozed_until ? new Date(log.snoozed_until).toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: true 
          }) : undefined,
          scheduledFor: scheduledFor.toISOString(),
        };
      });

      // Sort by time
      todaysDoses.sort((a, b) => a.time.localeCompare(b.time));

      setDoses(todaysDoses);
    } catch (error) {
      console.error('Error fetching doses:', error);
    }
  }, [userId]);

  // Fetch user profile
  const fetchProfile = useCallback(async () => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setProfile({
          name: data.name,
          dateOfBirth: data.date_of_birth || undefined,
          allergies: data.allergies || [],
          conditions: data.conditions || [],
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  }, [userId]);

  // Fetch adherence stats
  const fetchStats = useCallback(async () => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from('adherence_streaks')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;

      const takenCount = doses.filter(d => d.status === 'taken').length;

      setStats({
        currentStreak: data?.current_streak || 0,
        longestStreak: data?.longest_streak || 0,
        weeklyAdherence: Number(data?.weekly_adherence) || 0,
        monthlyAdherence: Number(data?.monthly_adherence) || 0,
        todayTaken: takenCount,
        todayTotal: doses.length,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  }, [userId, doses]);

  // Take a dose
  const takeDose = useCallback(async (dose: MedicationDose) => {
    if (!userId) return;

    const now = new Date();

    try {
      // Upsert dose log
      const { error } = await supabase
        .from('dose_logs')
        .upsert({
          id: dose.id.startsWith('temp-') ? undefined : dose.id,
          user_id: userId,
          medication_id: dose.medicationId,
          scheduled_dose_id: dose.scheduledDoseId,
          scheduled_for: dose.scheduledFor,
          status: 'taken',
          action_at: now.toISOString(),
        }, {
          onConflict: 'scheduled_dose_id,scheduled_for',
        });

      if (error) throw error;

      // Update local state
      setDoses(prev => prev.map(d => 
        d.scheduledDoseId === dose.scheduledDoseId 
          ? { 
              ...d, 
              status: 'taken' as const, 
              takenAt: now.toLocaleTimeString('en-US', { 
                hour: '2-digit', 
                minute: '2-digit',
                hour12: true 
              }) 
            }
          : d
      ));

      // Haptic feedback
      if (navigator.vibrate) {
        navigator.vibrate([100, 50, 100]);
      }

      toast.success('Medication taken! Great job! 💪');
    } catch (error) {
      console.error('Error taking dose:', error);
      toast.error('Failed to record dose');
    }
  }, [userId]);

  // Skip a dose
  const skipDose = useCallback(async (dose: MedicationDose) => {
    if (!userId) return;

    try {
      const { error } = await supabase
        .from('dose_logs')
        .upsert({
          id: dose.id.startsWith('temp-') ? undefined : dose.id,
          user_id: userId,
          medication_id: dose.medicationId,
          scheduled_dose_id: dose.scheduledDoseId,
          scheduled_for: dose.scheduledFor,
          status: 'skipped',
          action_at: new Date().toISOString(),
        }, {
          onConflict: 'scheduled_dose_id,scheduled_for',
        });

      if (error) throw error;

      setDoses(prev => prev.map(d => 
        d.scheduledDoseId === dose.scheduledDoseId 
          ? { ...d, status: 'skipped' as const }
          : d
      ));

      toast.info('Dose skipped', {
        description: 'Remember to take your next dose on time.',
      });
    } catch (error) {
      console.error('Error skipping dose:', error);
      toast.error('Failed to skip dose');
    }
  }, [userId]);

  // Snooze a dose
  const snoozeDose = useCallback(async (dose: MedicationDose, minutes: number = 10) => {
    if (!userId) return;

    const snoozeUntil = new Date();
    snoozeUntil.setMinutes(snoozeUntil.getMinutes() + minutes);

    try {
      const { error } = await supabase
        .from('dose_logs')
        .upsert({
          id: dose.id.startsWith('temp-') ? undefined : dose.id,
          user_id: userId,
          medication_id: dose.medicationId,
          scheduled_dose_id: dose.scheduledDoseId,
          scheduled_for: dose.scheduledFor,
          status: 'snoozed',
          snoozed_until: snoozeUntil.toISOString(),
        }, {
          onConflict: 'scheduled_dose_id,scheduled_for',
        });

      if (error) throw error;

      const timeStr = snoozeUntil.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      });

      setDoses(prev => prev.map(d => 
        d.scheduledDoseId === dose.scheduledDoseId 
          ? { ...d, status: 'snoozed' as const, snoozeUntil: timeStr }
          : d
      ));

      if (navigator.vibrate) {
        navigator.vibrate(50);
      }

      toast('Snoozed for 10 minutes ⏰', {
        description: `We'll remind you at ${timeStr}`,
      });
    } catch (error) {
      console.error('Error snoozing dose:', error);
      toast.error('Failed to snooze dose');
    }
  }, [userId]);

  // Add a medication (from scanner)
  const addMedication = useCallback(async (med: {
    ndcCode?: string;
    name: string;
    genericName?: string;
    strength: string;
    form: string;
    manufacturer?: string;
  }) => {
    if (!userId) return null;

    try {
      const { data, error } = await supabase
        .from('medications')
        .insert({
          user_id: userId,
          ndc_code: med.ndcCode,
          name: med.name,
          generic_name: med.genericName,
          strength: med.strength,
          form: med.form,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;

      // Refresh medications
      await fetchMedications();

      return data;
    } catch (error) {
      console.error('Error adding medication:', error);
      toast.error('Failed to add medication');
      return null;
    }
  }, [userId, fetchMedications]);

  // Initial fetch
  useEffect(() => {
    if (!userId) return;

    const fetchAll = async () => {
      setLoading(true);
      await Promise.all([
        fetchMedications(),
        fetchTodaysDoses(),
        fetchProfile(),
      ]);
      setLoading(false);
    };

    fetchAll();
  }, [userId, fetchMedications, fetchTodaysDoses, fetchProfile]);

  // Fetch stats when doses change
  useEffect(() => {
    if (userId && doses.length > 0) {
      fetchStats();
    }
  }, [userId, doses, fetchStats]);

  return {
    medications,
    doses,
    profile,
    stats,
    loading,
    takeDose,
    skipDose,
    snoozeDose,
    addMedication,
    refetch: () => {
      fetchMedications();
      fetchTodaysDoses();
      fetchProfile();
      fetchStats();
    },
  };
}
