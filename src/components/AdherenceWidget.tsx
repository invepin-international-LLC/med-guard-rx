import { Flame, Trophy, TrendingUp, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AdherenceStats {
  currentStreak: number;
  longestStreak: number;
  weeklyAdherence: number;
  monthlyAdherence: number;
  todayTaken: number;
  todayTotal: number;
}

interface AdherenceWidgetProps {
  stats: AdherenceStats;
  size?: 'compact' | 'full';
}

const encouragements = [
  "Amazing work! 🌟",
  "Keep it up! 💪",
  "You're doing great! ❤️",
  "Fantastic! 🎉",
  "On fire! 🔥",
  "Perfect! ✨",
  "Excellent! 👏",
];

export function AdherenceWidget({ stats, size = 'full' }: AdherenceWidgetProps) {
  const encouragement = encouragements[stats.currentStreak % encouragements.length];
  const isNewRecord = stats.currentStreak >= stats.longestStreak && stats.currentStreak > 0;
  const todayProgress = stats.todayTotal > 0 ? Math.round((stats.todayTaken / stats.todayTotal) * 100) : 0;

  if (size === 'compact') {
    return (
      <div className="bg-card rounded-2xl p-5 shadow-elder border-2 border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-accent/20 flex items-center justify-center">
              <Flame className="w-8 h-8 text-accent" />
            </div>
            <div>
              <p className="text-3xl font-bold text-foreground">{stats.currentStreak}</p>
              <p className="text-muted-foreground font-medium">Day Streak</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-success">{stats.weeklyAdherence}%</p>
            <p className="text-muted-foreground font-medium">This Week</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-3xl p-6 shadow-elder-lg border-2 border-border">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-elder-xl text-foreground">Your Progress</h2>
        <div className="text-4xl">💪</div>
      </div>

      {/* Today's Progress */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-elder text-muted-foreground">Today</span>
          <span className="text-elder-lg text-primary font-bold">{todayProgress}%</span>
        </div>
        <div className="h-4 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary rounded-full transition-all duration-500"
            style={{ width: `${todayProgress}%` }}
          />
        </div>
        <p className="text-muted-foreground mt-2 text-lg">
          {stats.todayTaken} of {stats.todayTotal} medications
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        {/* Current Streak */}
        <div className={cn(
          "rounded-2xl p-5 text-center border-2",
          stats.currentStreak > 0 
            ? "bg-accent/10 border-accent/30" 
            : "bg-muted border-border"
        )}>
          <div className="flex items-center justify-center gap-2 mb-2">
            <Flame className={cn(
              "w-8 h-8",
              stats.currentStreak > 0 ? "text-accent" : "text-muted-foreground"
            )} />
            {isNewRecord && <Trophy className="w-7 h-7 text-warning" />}
          </div>
          <div className={cn(
            "text-5xl font-extrabold",
            stats.currentStreak > 0 ? "text-accent" : "text-muted-foreground"
          )}>
            {stats.currentStreak}
          </div>
          <div className="text-muted-foreground font-medium text-lg">Day Streak</div>
        </div>

        {/* Weekly Adherence */}
        <div className="bg-success/10 rounded-2xl p-5 text-center border-2 border-success/30">
          <div className="flex items-center justify-center mb-2">
            <TrendingUp className="w-8 h-8 text-success" />
          </div>
          <div className="text-5xl font-extrabold text-success">
            {stats.weeklyAdherence}%
          </div>
          <div className="text-muted-foreground font-medium text-lg">This Week</div>
        </div>
      </div>

      {/* Monthly */}
      <div className="bg-info/10 rounded-2xl p-4 mb-6 border-2 border-info/30">
        <div className="flex items-center gap-3">
          <Calendar className="w-7 h-7 text-info" />
          <span className="text-lg text-muted-foreground">Monthly Adherence:</span>
          <span className="text-2xl font-bold text-info ml-auto">{stats.monthlyAdherence}%</span>
        </div>
      </div>

      {/* Encouragement */}
      <div className="bg-primary/10 rounded-2xl p-5 text-center border-2 border-primary/20">
        <p className="text-elder-lg text-primary font-bold">{encouragement}</p>
        {isNewRecord && (
          <p className="text-warning font-bold mt-2 text-xl">🏆 New personal record!</p>
        )}
      </div>
    </div>
  );
}
