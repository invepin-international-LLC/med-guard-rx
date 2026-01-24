import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Coins, Trophy, Zap, Shield, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SlotMachine } from './SlotMachine';
import { BadgeCollection } from './BadgeCollection';
import { UserRewards, Badge as RewardBadge, SpinResult, BADGE_DEFINITIONS } from '@/hooks/useRewards';

interface RewardsWidgetProps {
  rewards: UserRewards | null;
  badges: RewardBadge[];
  onSpin: () => Promise<SpinResult | null>;
  spinning: boolean;
}

export function RewardsWidget({ rewards, badges, onSpin, spinning }: RewardsWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'spin' | 'badges'>('spin');

  if (!rewards) return null;

  const hasSpins = rewards.availableSpins > 0;

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Card className={cn(
          "cursor-pointer transition-all duration-300 hover:shadow-lg overflow-hidden",
          hasSpins && "ring-2 ring-accent/50 animate-gentle-pulse"
        )}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {/* Slot icon */}
                <div className={cn(
                  "w-14 h-14 rounded-xl flex items-center justify-center text-3xl",
                  hasSpins 
                    ? "bg-gradient-to-br from-accent to-warning shadow-accent" 
                    : "bg-muted"
                )}>
                  🎰
                </div>

                {/* Stats */}
                <div>
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    Daily Rewards
                    {hasSpins && (
                      <Badge variant="destructive" className="animate-pulse">
                        {rewards.availableSpins} Spins!
                      </Badge>
                    )}
                  </h3>
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Coins className="w-4 h-4 text-warning" />
                      {rewards.coins}
                    </span>
                    {rewards.streakMultiplier > 1 && (
                      <span className="flex items-center gap-1 text-accent">
                        <Zap className="w-4 h-4" />
                        {rewards.streakMultiplier}x
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Trophy className="w-4 h-4 text-primary" />
                      {badges.length}
                    </span>
                    {rewards.streakShieldActive && (
                      <span className="flex items-center gap-1 text-success">
                        <Shield className="w-4 h-4" />
                        Active
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <ChevronRight className="w-6 h-6 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </SheetTrigger>

      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl">
        <SheetHeader className="pb-4">
          <SheetTitle className="text-2xl flex items-center gap-2">
            🎮 Rewards Center
          </SheetTitle>
        </SheetHeader>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <Button
            variant={activeTab === 'spin' ? 'default' : 'outline'}
            onClick={() => setActiveTab('spin')}
            className="flex-1"
          >
            🎰 Slot Machine
          </Button>
          <Button
            variant={activeTab === 'badges' ? 'default' : 'outline'}
            onClick={() => setActiveTab('badges')}
            className="flex-1"
          >
            🏆 Badges ({badges.length})
          </Button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto pb-safe">
          {activeTab === 'spin' ? (
            <div className="space-y-4">
              <SlotMachine
                availableSpins={rewards.availableSpins}
                coins={rewards.coins}
                streakMultiplier={rewards.streakMultiplier}
                onSpin={onSpin}
                spinning={spinning}
              />

              {/* Stats Summary */}
              <Card>
                <CardContent className="p-4">
                  <h4 className="font-semibold mb-3">Your Stats</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                      <Coins className="w-8 h-8 text-warning" />
                      <div>
                        <p className="text-2xl font-bold">{rewards.coins}</p>
                        <p className="text-sm text-muted-foreground">Total Coins</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                      <div className="text-3xl">🎲</div>
                      <div>
                        <p className="text-2xl font-bold">{rewards.totalSpinsUsed}</p>
                        <p className="text-sm text-muted-foreground">Spins Used</p>
                      </div>
                    </div>
                    {rewards.streakMultiplier > 1 && (
                      <div className="flex items-center gap-3 p-3 bg-accent/10 rounded-lg col-span-2">
                        <Zap className="w-8 h-8 text-accent" />
                        <div>
                          <p className="text-xl font-bold text-accent">{rewards.streakMultiplier}x Multiplier Active</p>
                          <p className="text-sm text-muted-foreground">Coins earned are multiplied!</p>
                        </div>
                      </div>
                    )}
                    {rewards.streakShieldActive && (
                      <div className="flex items-center gap-3 p-3 bg-success/10 rounded-lg col-span-2">
                        <Shield className="w-8 h-8 text-success" />
                        <div>
                          <p className="text-xl font-bold text-success">Streak Shield Active</p>
                          <p className="text-sm text-muted-foreground">
                            Your streak is protected until{' '}
                            {rewards.streakShieldExpiresAt 
                              ? new Date(rewards.streakShieldExpiresAt).toLocaleTimeString()
                              : 'soon'
                            }
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* How to earn spins */}
              <Card>
                <CardContent className="p-4">
                  <h4 className="font-semibold mb-3">How to Earn Spins</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">💊</span>
                      <span>Take a dose on time = 1 spin</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">✨</span>
                      <span>Perfect day (all doses on time) = 2 bonus spins</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">🔥</span>
                      <span>7-day streak = 3 bonus spins</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">🏆</span>
                      <span>30-day streak = 10 bonus spins!</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <BadgeCollection badges={badges} />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
