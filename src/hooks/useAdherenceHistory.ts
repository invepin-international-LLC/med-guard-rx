import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type TimeGranularity = 'year' | 'month' | 'week' | 'day' | 'hour';

export interface AdherenceDataPoint {
  label: string;
  period: string; // ISO date or key
  taken: number;
  missed: number;
  skipped: number;
  total: number;
  adherenceRate: number;
}

export interface DayHeatmapEntry {
  date: string; // YYYY-MM-DD
  adherenceRate: number;
  taken: number;
  total: number;
}

interface RawDoseLog {
  status: string;
  scheduled_for: string;
  action_at: string | null;
}

export function useAdherenceHistory() {
  const [logs, setLogs] = useState<RawDoseLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id);
    });
  }, []);

  const fetchLogs = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

      const { data, error } = await supabase
        .from('dose_logs')
        .select('status, scheduled_for, action_at')
        .eq('user_id', userId)
        .gte('scheduled_for', oneYearAgo.toISOString())
        .order('scheduled_for', { ascending: true });

      if (error) throw error;
      setLogs(data || []);
    } catch (e) {
      console.error('Error fetching adherence history:', e);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const getDataByGranularity = useCallback((
    granularity: TimeGranularity,
    focusDate?: Date
  ): AdherenceDataPoint[] => {
    if (!logs.length) return [];

    const buckets = new Map<string, { taken: number; missed: number; skipped: number; total: number }>();

    const getKey = (d: Date): string => {
      switch (granularity) {
        case 'year':
          return d.toLocaleString('default', { month: 'short', year: '2-digit' });
        case 'month': {
          const weekNum = Math.ceil(d.getDate() / 7);
          return `Week ${weekNum}`;
        }
        case 'week':
          return d.toLocaleString('default', { weekday: 'short', month: 'short', day: 'numeric' });
        case 'day':
          return `${d.getHours().toString().padStart(2, '0')}:00`;
        case 'hour':
          return `${d.getHours().toString().padStart(2, '0')}:${(Math.floor(d.getMinutes() / 15) * 15).toString().padStart(2, '0')}`;
        default:
          return d.toISOString().split('T')[0];
      }
    };

    const isInRange = (d: Date): boolean => {
      if (!focusDate) return true;
      switch (granularity) {
        case 'year': return true;
        case 'month':
          return d.getFullYear() === focusDate.getFullYear() && d.getMonth() === focusDate.getMonth();
        case 'week': {
          const start = new Date(focusDate);
          start.setDate(start.getDate() - start.getDay());
          start.setHours(0, 0, 0, 0);
          const end = new Date(start);
          end.setDate(end.getDate() + 7);
          return d >= start && d < end;
        }
        case 'day':
          return d.toISOString().split('T')[0] === focusDate.toISOString().split('T')[0];
        case 'hour':
          return d.toISOString().split('T')[0] === focusDate.toISOString().split('T')[0] &&
                 d.getHours() === focusDate.getHours();
        default:
          return true;
      }
    };

    for (const log of logs) {
      const d = new Date(log.scheduled_for);
      if (!isInRange(d)) continue;
      const key = getKey(d);
      const bucket = buckets.get(key) || { taken: 0, missed: 0, skipped: 0, total: 0 };
      bucket.total++;
      if (log.status === 'taken') bucket.taken++;
      else if (log.status === 'missed') bucket.missed++;
      else if (log.status === 'skipped') bucket.skipped++;
      buckets.set(key, bucket);
    }

    return Array.from(buckets.entries()).map(([label, b]) => ({
      label,
      period: label,
      taken: b.taken,
      missed: b.missed,
      skipped: b.skipped,
      total: b.total,
      adherenceRate: b.total > 0 ? Math.round((b.taken / b.total) * 100) : 0,
    }));
  }, [logs]);

  const getHeatmapData = useCallback((): DayHeatmapEntry[] => {
    if (!logs.length) return [];
    const dayMap = new Map<string, { taken: number; total: number }>();
    for (const log of logs) {
      const key = new Date(log.scheduled_for).toISOString().split('T')[0];
      const entry = dayMap.get(key) || { taken: 0, total: 0 };
      entry.total++;
      if (log.status === 'taken') entry.taken++;
      dayMap.set(key, entry);
    }
    return Array.from(dayMap.entries()).map(([date, e]) => ({
      date,
      adherenceRate: e.total > 0 ? Math.round((e.taken / e.total) * 100) : 0,
      taken: e.taken,
      total: e.total,
    })).sort((a, b) => a.date.localeCompare(b.date));
  }, [logs]);

  return { loading, getDataByGranularity, getHeatmapData, refetch: fetchLogs };
}
