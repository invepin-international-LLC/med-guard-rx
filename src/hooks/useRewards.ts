import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { COIN_MILESTONES } from '@/components/CoinMilestoneAnimation';

export interface UserRewards {
  coins: number;
  availableSpins: number;
  totalSpinsUsed: number;
  streakMultiplier: number;
  streakShieldActive: boolean;
  streakShieldExpiresAt?: string;
  lastSpinDate?: string;
}

export interface MilestoneEvent {
  milestone: number;
  timestamp: number;
}

export interface Badge {
  id: string;
  type: string;
  name: string;
  description?: string;
  earnedAt: string;
}

export interface SpinResult {
  symbols: string[];
  prizeType: 'coins' | 'multiplier' | 'shield' | 'badge' | 'bonus_spin' | 'jackpot';
  prizeValue: number;
  prizeName: string;
}

// Slot machine symbols with their weights
const SYMBOLS = ['💊', '❤️', '⭐', '🏆', '💎', '🎯', '🔥'];
const SYMBOL_WEIGHTS = [30, 25, 20, 12, 8, 3, 2]; // Higher = more common

// Prize configurations
const PRIZE_CONFIG = {
  // Three of a kind prizes
  '💊💊💊': { type: 'coins', value: 50, name: '50 Coins!' },
  '❤️❤️❤️': { type: 'coins', value: 100, name: '100 Coins!' },
  '⭐⭐⭐': { type: 'multiplier', value: 1.5, name: '1.5x Streak Multiplier!' },
  '🏆🏆🏆': { type: 'shield', value: 24, name: '24hr Streak Shield!' },
  '💎💎💎': { type: 'bonus_spin', value: 3, name: '3 Bonus Spins!' },
  '🎯🎯🎯': { type: 'badge', value: 1, name: 'Sharpshooter Badge!' },
  '🔥🔥🔥': { type: 'jackpot', value: 500, name: '🎉 JACKPOT! 500 Coins!' },
  // Two of a kind prizes
  'pair': { type: 'coins', value: 25, name: '25 Coins' },
  // No match
  'none': { type: 'coins', value: 10, name: '10 Coins' },
} as const;

// Badge definitions
export const BADGE_DEFINITIONS = {
  first_dose: { name: 'First Step', description: 'Took your first dose on time', icon: '🌟' },
  week_streak: { name: 'Week Warrior', description: '7-day streak achieved', icon: '🗓️' },
  month_streak: { name: 'Monthly Master', description: '30-day streak achieved', icon: '📅' },
  perfect_day: { name: 'Perfect Day', description: 'All doses on time in one day', icon: '✨' },
  early_bird: { name: 'Early Bird', description: 'Took 10 morning doses on time', icon: '🐦' },
  night_owl: { name: 'Night Owl', description: 'Never missed a bedtime dose for a week', icon: '🦉' },
  sharpshooter: { name: 'Sharpshooter', description: 'Won the sharpshooter jackpot', icon: '🎯' },
  high_roller: { name: 'High Roller', description: 'Accumulated 1000 coins', icon: '💰' },
  lucky_spin: { name: 'Lucky Spin', description: 'Won the grand jackpot', icon: '🎰' },
  collector: { name: 'Collector', description: 'Earned 5 different badges', icon: '🏅' },
};

export function useRewards() {
  const [rewards, setRewards] = useState<UserRewards | null>(null);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);
  const [spinning, setSpinning] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [pendingMilestone, setPendingMilestone] = useState<MilestoneEvent | null>(null);
  const previousCoinsRef = useRef<number | null>(null);

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

  // Fetch rewards
  const fetchRewards = useCallback(async () => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from('user_rewards')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setRewards({
          coins: data.coins,
          availableSpins: data.available_spins,
          totalSpinsUsed: data.total_spins_used,
          streakMultiplier: Number(data.streak_multiplier),
          streakShieldActive: data.streak_shield_active,
          streakShieldExpiresAt: data.streak_shield_expires_at || undefined,
          lastSpinDate: data.last_spin_date || undefined,
        });
      } else {
        // Initialize rewards for user if not exists
        const { data: newData, error: insertError } = await supabase
          .from('user_rewards')
          .insert({ user_id: userId, available_spins: 1 })
          .select()
          .single();

        if (!insertError && newData) {
          setRewards({
            coins: newData.coins,
            availableSpins: newData.available_spins,
            totalSpinsUsed: newData.total_spins_used,
            streakMultiplier: Number(newData.streak_multiplier),
            streakShieldActive: newData.streak_shield_active,
            streakShieldExpiresAt: newData.streak_shield_expires_at || undefined,
            lastSpinDate: newData.last_spin_date || undefined,
          });
        }
      }
    } catch (error) {
      console.error('Error fetching rewards:', error);
    }
  }, [userId]);

  // Fetch badges
  const fetchBadges = useCallback(async () => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from('user_badges')
        .select('*')
        .eq('user_id', userId)
        .order('earned_at', { ascending: false });

      if (error) throw error;

      setBadges((data || []).map(b => ({
        id: b.id,
        type: b.badge_type,
        name: b.badge_name,
        description: b.badge_description || undefined,
        earnedAt: b.earned_at,
      })));
    } catch (error) {
      console.error('Error fetching badges:', error);
    }
  }, [userId]);

  // Weighted random symbol selection
  const getRandomSymbol = () => {
    const totalWeight = SYMBOL_WEIGHTS.reduce((a, b) => a + b, 0);
    let random = Math.random() * totalWeight;
    
    for (let i = 0; i < SYMBOLS.length; i++) {
      random -= SYMBOL_WEIGHTS[i];
      if (random <= 0) return SYMBOLS[i];
    }
    return SYMBOLS[0];
  };

  // Spin the slot machine
  const spin = useCallback(async (): Promise<SpinResult | null> => {
    if (!userId || !rewards || rewards.availableSpins <= 0 || spinning) {
      return null;
    }

    setSpinning(true);

    try {
      // Generate result
      const symbols = [getRandomSymbol(), getRandomSymbol(), getRandomSymbol()];
      const resultKey = symbols.join('');

      let prize: { type: string; value: number; name: string };

      // Check for three of a kind
      if (symbols[0] === symbols[1] && symbols[1] === symbols[2]) {
        prize = PRIZE_CONFIG[resultKey as keyof typeof PRIZE_CONFIG] || PRIZE_CONFIG['💊💊💊'];
      }
      // Check for two of a kind
      else if (symbols[0] === symbols[1] || symbols[1] === symbols[2] || symbols[0] === symbols[2]) {
        prize = PRIZE_CONFIG['pair'];
      }
      // No match
      else {
        prize = PRIZE_CONFIG['none'];
      }

      // Apply streak multiplier to coin rewards
      let finalValue = prize.value;
      if (prize.type === 'coins') {
        finalValue = Math.floor(prize.value * rewards.streakMultiplier);
      }

      // Calculate new values based on prize type
      let newCoins = rewards.coins;
      let newSpins = rewards.availableSpins - 1;
      let newMultiplier = rewards.streakMultiplier;
      let newShieldActive = rewards.streakShieldActive;
      let newShieldExpires = rewards.streakShieldExpiresAt;

      switch (prize.type) {
        case 'coins':
        case 'jackpot':
          newCoins += finalValue;
          break;
        case 'multiplier':
          newMultiplier = Math.min(3.0, newMultiplier + (prize.value - 1)); // Cap at 3x
          break;
        case 'shield':
          newShieldActive = true;
          const expires = new Date();
          expires.setHours(expires.getHours() + prize.value);
          newShieldExpires = expires.toISOString();
          break;
        case 'bonus_spin':
          newSpins += prize.value;
          break;
        case 'badge':
          // Award sharpshooter badge
          await awardBadge('sharpshooter');
          break;
      }

      // Update database
      const { error: updateError } = await supabase
        .from('user_rewards')
        .update({
          coins: newCoins,
          available_spins: newSpins,
          total_spins_used: rewards.totalSpinsUsed + 1,
          streak_multiplier: newMultiplier,
          streak_shield_active: newShieldActive,
          streak_shield_expires_at: newShieldExpires,
          last_spin_date: new Date().toISOString().split('T')[0],
        })
        .eq('user_id', userId);

      if (updateError) throw updateError;

      // Record spin history
      await supabase.from('spin_history').insert({
        user_id: userId,
        spin_result: symbols,
        prize_type: prize.type,
        prize_value: finalValue,
      });

      // Update local state and check for milestones
      const prevCoins = rewards.coins;
      setRewards(prev => prev ? {
        ...prev,
        coins: newCoins,
        availableSpins: newSpins,
        totalSpinsUsed: prev.totalSpinsUsed + 1,
        streakMultiplier: newMultiplier,
        streakShieldActive: newShieldActive,
        streakShieldExpiresAt: newShieldExpires,
      } : null);

      // Check for coin milestones
      checkAndTriggerMilestone(prevCoins, newCoins);

      // Check for high roller badge
      if (newCoins >= 1000 && !badges.find(b => b.type === 'high_roller')) {
        await awardBadge('high_roller');
      }

      // Check for lucky spin badge (jackpot)
      if (prize.type === 'jackpot' && !badges.find(b => b.type === 'lucky_spin')) {
        await awardBadge('lucky_spin');
      }

      return {
        symbols,
        prizeType: prize.type as SpinResult['prizeType'],
        prizeValue: finalValue,
        prizeName: prize.type === 'coins' && rewards.streakMultiplier > 1 
          ? `${finalValue} Coins (${rewards.streakMultiplier}x bonus!)` 
          : prize.name,
      };
    } catch (error) {
      console.error('Error spinning:', error);
      toast.error('Failed to spin');
      return null;
    } finally {
      setSpinning(false);
    }
  }, [userId, rewards, spinning, badges]);

  // Award a spin for taking a dose on time
  const awardSpinForDose = useCallback(async () => {
    if (!userId || !rewards) return;

    try {
      const { error } = await supabase
        .from('user_rewards')
        .update({
          available_spins: rewards.availableSpins + 1,
        })
        .eq('user_id', userId);

      if (error) throw error;

      setRewards(prev => prev ? {
        ...prev,
        availableSpins: prev.availableSpins + 1,
      } : null);

      toast.success('🎰 You earned a spin!', {
        description: 'Tap to play the slot machine!',
      });
    } catch (error) {
      console.error('Error awarding spin:', error);
    }
  }, [userId, rewards]);

  // Award bonus spins for streak milestones
  const awardBonusSpinsForStreak = useCallback(async (streak: number) => {
    if (!userId || !rewards) return;

    let bonusSpins = 0;
    if (streak === 7) bonusSpins = 3;
    else if (streak === 14) bonusSpins = 5;
    else if (streak === 30) bonusSpins = 10;
    else if (streak % 30 === 0) bonusSpins = 10;

    if (bonusSpins === 0) return;

    try {
      const { error } = await supabase
        .from('user_rewards')
        .update({
          available_spins: rewards.availableSpins + bonusSpins,
        })
        .eq('user_id', userId);

      if (error) throw error;

      setRewards(prev => prev ? {
        ...prev,
        availableSpins: prev.availableSpins + bonusSpins,
      } : null);

      toast.success(`🎉 ${streak}-Day Streak Bonus!`, {
        description: `You earned ${bonusSpins} bonus spins!`,
      });
    } catch (error) {
      console.error('Error awarding bonus spins:', error);
    }
  }, [userId, rewards]);

  // Award a badge
  const awardBadge = useCallback(async (badgeType: keyof typeof BADGE_DEFINITIONS) => {
    if (!userId) return;

    const definition = BADGE_DEFINITIONS[badgeType];
    if (!definition) return;

    // Check if already has badge
    const existing = badges.find(b => b.type === badgeType);
    if (existing) return;

    try {
      const { data, error } = await supabase
        .from('user_badges')
        .insert({
          user_id: userId,
          badge_type: badgeType,
          badge_name: definition.name,
          badge_description: definition.description,
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') return; // Duplicate, ignore
        throw error;
      }

      setBadges(prev => [{
        id: data.id,
        type: data.badge_type,
        name: data.badge_name,
        description: data.badge_description || undefined,
        earnedAt: data.earned_at,
      }, ...prev]);

      toast.success(`🏆 New Badge: ${definition.name}!`, {
        description: definition.description,
      });

      // Check for collector badge (5 badges)
      if (badges.length + 1 >= 5 && !badges.find(b => b.type === 'collector')) {
        setTimeout(() => awardBadge('collector'), 1000);
      }
    } catch (error) {
      console.error('Error awarding badge:', error);
    }
  }, [userId, badges]);

  // Award spin for perfect day
  const awardPerfectDayBonus = useCallback(async () => {
    if (!userId || !rewards) return;

    try {
      // Award 2 spins for perfect day
      const { error } = await supabase
        .from('user_rewards')
        .update({
          available_spins: rewards.availableSpins + 2,
        })
        .eq('user_id', userId);

      if (error) throw error;

      setRewards(prev => prev ? {
        ...prev,
        availableSpins: prev.availableSpins + 2,
      } : null);

      // Award perfect day badge
      await awardBadge('perfect_day');

      toast.success('🌟 Perfect Day!', {
        description: 'You earned 2 bonus spins!',
      });
    } catch (error) {
      console.error('Error awarding perfect day bonus:', error);
    }
  }, [userId, rewards, awardBadge]);

  // Initial fetch
  useEffect(() => {
    if (!userId) return;

    const fetchAll = async () => {
      setLoading(true);
      await Promise.all([fetchRewards(), fetchBadges()]);
      setLoading(false);
    };

    fetchAll();
  }, [userId, fetchRewards, fetchBadges]);

  // Check if coins crossed a milestone threshold
  const checkAndTriggerMilestone = useCallback((prevCoins: number, newCoins: number) => {
    for (const milestone of COIN_MILESTONES) {
      if (prevCoins < milestone && newCoins >= milestone) {
        setPendingMilestone({ milestone, timestamp: Date.now() });
        break; // Only trigger one milestone at a time
      }
    }
  }, []);

  // Clear milestone after animation completes
  const clearMilestone = useCallback(() => {
    setPendingMilestone(null);
  }, []);

  return {
    rewards,
    badges,
    loading,
    spinning,
    spin,
    awardSpinForDose,
    awardBonusSpinsForStreak,
    awardBadge,
    awardPerfectDayBonus,
    pendingMilestone,
    clearMilestone,
    refetch: () => {
      fetchRewards();
      fetchBadges();
    },
  };
}
