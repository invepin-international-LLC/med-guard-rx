import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Coins, Sparkles, Gift, CheckCircle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { UserChallenge } from '@/hooks/useChallenges';
import { format, differenceInDays, endOfWeek, startOfWeek } from 'date-fns';

interface WeeklyChallengesProps {
  userChallenges: UserChallenge[];
  onClaimReward: (userChallengeId: string) => Promise<boolean>;
}

const CHALLENGE_ICONS: Record<string, string> = {
  time_streak: '⏰',
  perfect_week: '🌟',
  no_snooze: '⚡',
  early_dose: '🐦',
};

const TIME_ICONS: Record<string, string> = {
  morning: '🌅',
  afternoon: '☀️',
  evening: '🌙',
};

export function WeeklyChallenges({ userChallenges, onClaimReward }: WeeklyChallengesProps) {
  const today = new Date();
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
  const daysRemaining = differenceInDays(weekEnd, today);

  // Sort: claimable first, then in-progress, then completed
  const sortedChallenges = [...userChallenges].sort((a, b) => {
    // Claimable (completed but not claimed) first
    if (a.isCompleted && !a.rewardClaimed && (!b.isCompleted || b.rewardClaimed)) return -1;
    if (b.isCompleted && !b.rewardClaimed && (!a.isCompleted || a.rewardClaimed)) return 1;
    // In progress before fully claimed
    if (!a.rewardClaimed && b.rewardClaimed) return -1;
    if (a.rewardClaimed && !b.rewardClaimed) return 1;
    // Sort by progress percentage
    const aProgress = a.currentProgress / a.challenge.targetCount;
    const bProgress = b.currentProgress / b.challenge.targetCount;
    return bProgress - aProgress;
  });

  if (userChallenges.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <div className="text-4xl mb-2">🎯</div>
          <h3 className="font-semibold text-lg mb-1">Weekly Challenges</h3>
          <p className="text-muted-foreground text-sm">
            Complete challenges to earn bonus coins and spins!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Week Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg flex items-center gap-2">
          🎯 Weekly Challenges
        </h3>
        <Badge variant="outline" className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {daysRemaining} days left
        </Badge>
      </div>

      {/* Challenge List */}
      <div className="space-y-3">
        {sortedChallenges.map((uc) => {
          const progress = Math.min(100, (uc.currentProgress / uc.challenge.targetCount) * 100);
          const isClaimable = uc.isCompleted && !uc.rewardClaimed;
          const isClaimed = uc.rewardClaimed;

          return (
            <Card
              key={uc.id}
              className={cn(
                "transition-all duration-300",
                isClaimable && "ring-2 ring-accent animate-gentle-pulse",
                isClaimed && "opacity-60"
              )}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  {/* Challenge Icon */}
                  <div className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0",
                    isClaimable 
                      ? "bg-gradient-to-br from-accent to-warning" 
                      : isClaimed
                        ? "bg-success/20"
                        : "bg-muted"
                  )}>
                    {isClaimed ? (
                      <CheckCircle className="w-6 h-6 text-success" />
                    ) : (
                      <>
                        {uc.challenge.timeOfDay 
                          ? TIME_ICONS[uc.challenge.timeOfDay] 
                          : CHALLENGE_ICONS[uc.challenge.challengeType] || '🎯'
                        }
                      </>
                    )}
                  </div>

                  {/* Challenge Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className={cn(
                        "font-semibold truncate",
                        isClaimed && "line-through text-muted-foreground"
                      )}>
                        {uc.challenge.name}
                      </h4>
                      {isClaimable && (
                        <Badge variant="default" className="shrink-0 animate-pulse">
                          <Gift className="w-3 h-3 mr-1" />
                          Claim!
                        </Badge>
                      )}
                    </div>
                    
                    <p className="text-sm text-muted-foreground mb-2 line-clamp-1">
                      {uc.challenge.description}
                    </p>

                    {/* Progress Bar */}
                    {!isClaimed && (
                      <div className="space-y-1">
                        <Progress 
                          value={progress} 
                          className={cn(
                            "h-2",
                            isClaimable && "bg-accent/20"
                          )}
                        />
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">
                            {uc.currentProgress} / {uc.challenge.targetCount}
                          </span>
                          <span className="flex items-center gap-2 text-muted-foreground">
                            <span className="flex items-center gap-0.5">
                              <Coins className="w-3 h-3 text-warning" />
                              {uc.challenge.rewardCoins}
                            </span>
                            <span className="flex items-center gap-0.5">
                              <Sparkles className="w-3 h-3 text-accent" />
                              {uc.challenge.rewardSpins} spins
                            </span>
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Claim Button */}
                    {isClaimable && (
                      <Button
                        size="sm"
                        className="w-full mt-2 bg-gradient-to-r from-accent to-warning text-accent-foreground"
                        onClick={() => onClaimReward(uc.id)}
                      >
                        <Gift className="w-4 h-4 mr-2" />
                        Claim {uc.challenge.rewardCoins} Coins + {uc.challenge.rewardSpins} Spins
                      </Button>
                    )}

                    {/* Claimed Status */}
                    {isClaimed && (
                      <div className="flex items-center gap-1 text-sm text-success mt-1">
                        <CheckCircle className="w-4 h-4" />
                        Completed & Claimed
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Tips */}
      <Card className="bg-muted/50">
        <CardContent className="p-3">
          <p className="text-xs text-muted-foreground text-center">
            💡 Challenges reset every Monday. Complete them all for maximum rewards!
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
