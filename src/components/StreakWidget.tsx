import { AdherenceStreak } from '@/types/medication';
import { Flame, Trophy, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

interface StreakWidgetProps {
  streak: AdherenceStreak;
}

export function StreakWidget({ streak }: StreakWidgetProps) {
  const { t } = useTranslation();
  const isNewRecord = streak.currentStreak >= streak.longestStreak && streak.currentStreak > 0;

  return (
    <div className="bg-card rounded-2xl p-6 shadow-soft border border-border">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-elder-lg text-foreground">{t('adherence.yourProgress')}</h2>
        <div className="text-2xl">💪</div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* Current Streak */}
        <div className={cn(
          "rounded-xl p-4 text-center",
          streak.currentStreak > 0 ? "bg-accent/10" : "bg-muted"
        )}>
          <div className="flex items-center justify-center gap-2 mb-1">
            <Flame className={cn(
              "w-6 h-6",
              streak.currentStreak > 0 ? "text-accent" : "text-muted-foreground"
            )} />
            {isNewRecord && <Trophy className="w-5 h-5 text-warning" />}
          </div>
          <div className={cn(
            "text-4xl font-bold",
            streak.currentStreak > 0 ? "text-accent" : "text-muted-foreground"
          )}>
            {streak.currentStreak}
          </div>
          <div className="text-muted-foreground text-sm">{t('adherence.dayStreak')}</div>
        </div>

        {/* Weekly Adherence */}
        <div className="bg-success/10 rounded-xl p-4 text-center">
          <div className="flex items-center justify-center mb-1">
            <TrendingUp className="w-6 h-6 text-success" />
          </div>
          <div className="text-4xl font-bold text-success">
            {streak.weeklyAdherence}%
          </div>
          <div className="text-muted-foreground text-sm">{t('adherence.thisWeek')}</div>
        </div>
      </div>

      {/* Encouragement */}
      <div className="bg-primary/5 rounded-xl p-4 text-center">
        {isNewRecord && (
          <p className="text-warning font-semibold mt-2">{t('adherence.newRecord')}</p>
        )}
      </div>
    </div>
  );
}