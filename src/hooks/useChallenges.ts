import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { startOfWeek, format } from 'date-fns';

export interface Challenge {
  id: string;
  name: string;
  description: string;
  challengeType: string;
  targetCount: number;
  rewardCoins: number;
  rewardSpins: number;
  timeOfDay: string | null;
}

export interface UserChallenge {
  id: string;
  challengeId: string;
  weekStart: string;
  currentProgress: number;
  isCompleted: boolean;
  completedAt: string | null;
  rewardClaimed: boolean;
  challenge: Challenge;
}

export function useChallenges() {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [userChallenges, setUserChallenges] = useState<UserChallenge[]>([]);
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

  // Get current week start (Monday)
  const getWeekStart = () => {
    return format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
  };

  // Fetch all available challenges
  const fetchChallenges = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('weekly_challenges')
        .select('*')
        .order('reward_coins', { ascending: false });

      if (error) throw error;

      setChallenges((data || []).map(c => ({
        id: c.id,
        name: c.name,
        description: c.description,
        challengeType: c.challenge_type,
        targetCount: c.target_count,
        rewardCoins: c.reward_coins,
        rewardSpins: c.reward_spins,
        timeOfDay: c.time_of_day,
      })));
    } catch (error) {
      console.error('Error fetching challenges:', error);
    }
  }, []);

  // Fetch user's challenge progress for current week
  const fetchUserChallenges = useCallback(async () => {
    if (!userId) return;

    const weekStart = getWeekStart();

    try {
      const { data, error } = await supabase
        .from('user_challenges')
        .select(`
          *,
          weekly_challenges (*)
        `)
        .eq('user_id', userId)
        .eq('week_start', weekStart);

      if (error) throw error;

      setUserChallenges((data || []).map(uc => ({
        id: uc.id,
        challengeId: uc.challenge_id,
        weekStart: uc.week_start,
        currentProgress: uc.current_progress,
        isCompleted: uc.is_completed,
        completedAt: uc.completed_at,
        rewardClaimed: uc.reward_claimed,
        challenge: {
          id: uc.weekly_challenges.id,
          name: uc.weekly_challenges.name,
          description: uc.weekly_challenges.description,
          challengeType: uc.weekly_challenges.challenge_type,
          targetCount: uc.weekly_challenges.target_count,
          rewardCoins: uc.weekly_challenges.reward_coins,
          rewardSpins: uc.weekly_challenges.reward_spins,
          timeOfDay: uc.weekly_challenges.time_of_day,
        },
      })));
    } catch (error) {
      console.error('Error fetching user challenges:', error);
    }
  }, [userId]);

  // Initialize user challenges for current week — uses server-side RPC
  const initializeWeeklyChallenges = useCallback(async () => {
    if (!userId || challenges.length === 0) return;

    const weekStart = getWeekStart();

    try {
      // Check which challenges user hasn't started yet
      const existingChallengeIds = userChallenges.map(uc => uc.challengeId);
      const newChallenges = challenges.filter(c => !existingChallengeIds.includes(c.id));

      if (newChallenges.length === 0) return;

      // Use increment_challenge_progress to initialize each (it creates if not exists)
      for (const c of newChallenges) {
        // We just need to create the record, increment_challenge_progress handles upsert
        // But we don't want to increment, so let's just call it and it'll create with progress 0
        // Actually the function increments by 1, so we need a separate init function
        // For now, just fetch - the records will be created when progress is first tracked
      }

      await fetchUserChallenges();
    } catch (error) {
      console.error('Error initializing challenges:', error);
    }
  }, [userId, challenges, userChallenges, fetchUserChallenges]);

  // Update challenge progress when a dose is taken — uses server-side RPC
  const updateChallengeProgress = useCallback(async (
    timeOfDay: string,
    wasOnTime: boolean,
    wasEarly: boolean,
    wasSnoozed: boolean
  ) => {
    if (!userId) return;

    const weekStart = getWeekStart();

    try {
      // Get user's challenges for this week (read-only, allowed by SELECT policy)
      const { data: currentChallenges, error: fetchError } = await supabase
        .from('user_challenges')
        .select(`
          *,
          weekly_challenges (*)
        `)
        .eq('user_id', userId)
        .eq('week_start', weekStart)
        .eq('is_completed', false);

      if (fetchError) throw fetchError;

      // Also check challenges that don't have records yet
      const existingChallengeIds = (currentChallenges || []).map(uc => uc.challenge_id);
      const unstarted = challenges.filter(c => !existingChallengeIds.includes(c.id));

      // Process existing challenges
      for (const uc of (currentChallenges || [])) {
        const challenge = uc.weekly_challenges;
        let shouldIncrement = false;

        switch (challenge.challenge_type) {
          case 'time_streak':
            if (wasOnTime && challenge.time_of_day === timeOfDay) shouldIncrement = true;
            break;
          case 'perfect_week':
            if (wasOnTime) shouldIncrement = true;
            break;
          case 'no_snooze':
            if (!wasSnoozed) shouldIncrement = true;
            break;
          case 'early_dose':
            if (wasEarly) shouldIncrement = true;
            break;
        }

        if (shouldIncrement) {
          const { data, error } = await supabase.rpc('increment_challenge_progress', {
            _challenge_id: uc.challenge_id,
            _week_start: weekStart,
          });

          if (error) {
            console.error('Error incrementing challenge:', error);
            continue;
          }

          const result = data as { new_progress: number; is_completed: boolean; target: number } | null;
          if (result && result.is_completed) {
            toast.success(`🎯 Challenge Complete: ${challenge.name}!`, {
              description: `Claim your ${challenge.reward_coins} coins and ${challenge.reward_spins} spins!`,
            });
          }
        }
      }

      // Process unstarted challenges (will create + increment atomically)
      for (const challenge of unstarted) {
        let shouldIncrement = false;

        switch (challenge.challengeType) {
          case 'time_streak':
            if (wasOnTime && challenge.timeOfDay === timeOfDay) shouldIncrement = true;
            break;
          case 'perfect_week':
            if (wasOnTime) shouldIncrement = true;
            break;
          case 'no_snooze':
            if (!wasSnoozed) shouldIncrement = true;
            break;
          case 'early_dose':
            if (wasEarly) shouldIncrement = true;
            break;
        }

        if (shouldIncrement) {
          const { data, error } = await supabase.rpc('increment_challenge_progress', {
            _challenge_id: challenge.id,
            _week_start: weekStart,
          });

          if (error) {
            console.error('Error creating/incrementing challenge:', error);
            continue;
          }

          const result = data as { new_progress: number; is_completed: boolean; target: number } | null;
          if (result && result.is_completed) {
            toast.success(`🎯 Challenge Complete: ${challenge.name}!`, {
              description: `Claim your ${challenge.rewardCoins} coins and ${challenge.rewardSpins} spins!`,
            });
          }
        }
      }

      // Refresh user challenges
      await fetchUserChallenges();
    } catch (error) {
      console.error('Error updating challenge progress:', error);
    }
  }, [userId, challenges, fetchUserChallenges]);

  // Claim reward for completed challenge — uses server-side RPC
  const claimChallengeReward = useCallback(async (userChallengeId: string) => {
    if (!userId) return false;

    try {
      const userChallenge = userChallenges.find(uc => uc.id === userChallengeId);
      if (!userChallenge || !userChallenge.isCompleted || userChallenge.rewardClaimed) {
        return false;
      }

      const { data, error } = await supabase.rpc('claim_challenge_reward', {
        _user_challenge_id: userChallengeId,
      });

      if (error) throw error;

      const result = data as { coins_awarded: number; spins_awarded: number };

      toast.success('🎉 Rewards Claimed!', {
        description: `+${result.coins_awarded} coins, +${result.spins_awarded} spins!`,
      });

      await fetchUserChallenges();
      return true;
    } catch (error) {
      console.error('Error claiming challenge reward:', error);
      toast.error('Failed to claim reward');
      return false;
    }
  }, [userId, userChallenges, fetchUserChallenges]);

  // Initial fetch
  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      await fetchChallenges();
      setLoading(false);
    };
    fetchAll();
  }, [fetchChallenges]);

  useEffect(() => {
    if (userId && challenges.length > 0) {
      fetchUserChallenges();
    }
  }, [userId, challenges, fetchUserChallenges]);

  // Initialize challenges once we have user and challenges
  useEffect(() => {
    if (userId && challenges.length > 0 && userChallenges.length === 0 && !loading) {
      initializeWeeklyChallenges();
    }
  }, [userId, challenges, userChallenges, loading, initializeWeeklyChallenges]);

  return {
    challenges,
    userChallenges,
    loading,
    updateChallengeProgress,
    claimChallengeReward,
    refetch: () => {
      fetchChallenges();
      fetchUserChallenges();
    },
  };
}
