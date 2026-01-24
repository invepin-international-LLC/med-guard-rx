import { Card, CardContent } from '@/components/ui/card';
import { Badge as RewardBadge, BADGE_DEFINITIONS } from '@/hooks/useRewards';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface BadgeCollectionProps {
  badges: RewardBadge[];
}

export function BadgeCollection({ badges }: BadgeCollectionProps) {
  const earnedBadgeTypes = new Set(badges.map(b => b.type));

  // All possible badges
  const allBadges = Object.entries(BADGE_DEFINITIONS).map(([type, def]) => ({
    type,
    ...def,
    earned: earnedBadgeTypes.has(type),
    earnedAt: badges.find(b => b.type === type)?.earnedAt,
  }));

  const earnedBadges = allBadges.filter(b => b.earned);
  const lockedBadges = allBadges.filter(b => !b.earned);

  return (
    <div className="space-y-6">
      {/* Earned Badges */}
      <div>
        <h4 className="font-semibold mb-3 flex items-center gap-2">
          🏆 Earned ({earnedBadges.length})
        </h4>
        {earnedBadges.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              <p className="text-4xl mb-2">🎯</p>
              <p>Take your first dose on time to earn your first badge!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {earnedBadges.map((badge) => (
              <Card key={badge.type} className="bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20">
                <CardContent className="p-4">
                  <div className="flex flex-col items-center text-center">
                    <div className="text-4xl mb-2">{badge.icon}</div>
                    <h5 className="font-semibold">{badge.name}</h5>
                    <p className="text-xs text-muted-foreground mb-1">{badge.description}</p>
                    {badge.earnedAt && (
                      <p className="text-xs text-accent">
                        {formatDistanceToNow(new Date(badge.earnedAt), { addSuffix: true })}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Locked Badges */}
      <div>
        <h4 className="font-semibold mb-3 flex items-center gap-2">
          🔒 Locked ({lockedBadges.length})
        </h4>
        <div className="grid grid-cols-2 gap-3">
          {lockedBadges.map((badge) => (
            <Card key={badge.type} className="bg-muted/50 border-muted">
              <CardContent className="p-4">
                <div className="flex flex-col items-center text-center opacity-50">
                  <div className="text-4xl mb-2 grayscale">{badge.icon}</div>
                  <h5 className="font-semibold">{badge.name}</h5>
                  <p className="text-xs text-muted-foreground">{badge.description}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
