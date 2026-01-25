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

  // Initialize user challenges for current week if not exists
  const initializeWeeklyChallenges = useCallback(async () => {
    if (!userId || challenges.length === 0) return;

    const weekStart = getWeekStart();

    try {
      // Check which challenges user hasn't started yet
      const existingChallengeIds = userChallenges.map(uc => uc.challengeId);
      const newChallenges = challenges.filter(c => !existingChallengeIds.includes(c.id));

      if (newChallenges.length === 0) return;

      const inserts = newChallenges.map(c => ({
        user_id: userId,
        challenge_id: c.id,
        week_start: weekStart,
        current_progress: 0,
      }));

      const { error } = await supabase
        .from('user_challenges')
        .insert(inserts);

      if (error && error.code !== '23505') throw error; // Ignore duplicates

      await fetchUserChallenges();
    } catch (error) {
      console.error('Error initializing challenges:', error);
    }
  }, [userId, challenges, userChallenges, fetchUserChallenges]);

  // Update challenge progress when a dose is taken
  const updateChallengeProgress = useCallback(async (
    timeOfDay: string,
    wasOnTime: boolean,
    wasEarly: boolean,
    wasSnoozed: boolean
  ) => {
    if (!userId) return;

    const weekStart = getWeekStart();

    try {
      // Get user's challenges for this week
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
      if (!currentChallenges || currentChallenges.length === 0) return;

      for (const uc of currentChallenges) {
        const challenge = uc.weekly_challenges;
        let shouldIncrement = false;

        switch (challenge.challenge_type) {
          case 'time_streak':
            // Only count if dose was on time and matches time of day
            if (wasOnTime && challenge.time_of_day === timeOfDay) {
              shouldIncrement = true;
            }
            break;
          case 'perfect_week':
            // Count any on-time dose
            if (wasOnTime) {
              shouldIncrement = true;
            }
            break;
          case 'no_snooze':
            // Count doses taken without snoozing
            if (!wasSnoozed) {
              shouldIncrement = true;
            }
            break;
          case 'early_dose':
            // Count doses taken early (within 5 min)
            if (wasEarly) {
              shouldIncrement = true;
            }
            break;
        }

        if (shouldIncrement) {
          const newProgress = uc.current_progress + 1;
          const isCompleted = newProgress >= challenge.target_count;

          const { error: updateError } = await supabase
            .from('user_challenges')
            .update({
              current_progress: newProgress,
              is_completed: isCompleted,
              completed_at: isCompleted ? new Date().toISOString() : null,
            })
            .eq('id', uc.id);

          if (updateError) throw updateError;

          if (isCompleted) {
            toast.success(`🎯 Challenge Complete: ${challenge.name}!`, {
              description: `Claim your ${challenge.reward_coins} coins and ${challenge.reward_spins} spins!`,
            });
          }
        }
      }

      // Refresh user challenges
      await fetchUserChallenges();
    } catch (error) {
      console.error('Error updating challenge progress:', error);
    }
  }, [userId, fetchUserChallenges]);

  // Claim reward for completed challenge
  const claimChallengeReward = useCallback(async (userChallengeId: string) => {
    if (!userId) return false;

    try {
      // Get the challenge details
      const userChallenge = userChallenges.find(uc => uc.id === userChallengeId);
      if (!userChallenge || !userChallenge.isCompleted || userChallenge.rewardClaimed) {
        return false;
      }

      // Get current rewards
      const { data: currentRewards, error: rewardsError } = await supabase
        .from('user_rewards')
        .select('coins, available_spins')
        .eq('user_id', userId)
        .maybeSingle();

      if (rewardsError) throw rewardsError;
      if (!currentRewards) return false;

      // Update rewards
      const { error: updateRewardsError } = await supabase
        .from('user_rewards')
        .update({
          coins: currentRewards.coins + userChallenge.challenge.rewardCoins,
          available_spins: currentRewards.available_spins + userChallenge.challenge.rewardSpins,
        })
        .eq('user_id', userId);

      if (updateRewardsError) throw updateRewardsError;

      // Mark reward as claimed
      const { error: claimError } = await supabase
        .from('user_challenges')
        .update({ reward_claimed: true })
        .eq('id', userChallengeId);

      if (claimError) throw claimError;

      toast.success('🎉 Rewards Claimed!', {
        description: `+${userChallenge.challenge.rewardCoins} coins, +${userChallenge.challenge.rewardSpins} spins!`,
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
