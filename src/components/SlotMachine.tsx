import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Coins, Sparkles, Zap, Gift } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SpinResult } from '@/hooks/useRewards';
import { useSoundEffects } from '@/hooks/useSoundEffects';

interface SlotMachineProps {
  availableSpins: number;
  coins: number;
  streakMultiplier: number;
  onSpin: () => Promise<SpinResult | null>;
  spinning: boolean;
}

const SYMBOLS = ['💊', '❤️', '⭐', '🏆', '💎', '🎯', '🔥'];
const REEL_ITEMS = [...SYMBOLS, ...SYMBOLS, ...SYMBOLS]; // Triple for smooth animation

export function SlotMachine({ 
  availableSpins, 
  coins, 
  streakMultiplier, 
  onSpin, 
  spinning 
}: SlotMachineProps) {
  const [displaySymbols, setDisplaySymbols] = useState(['💊', '❤️', '⭐']);
  const [isSpinning, setIsSpinning] = useState(false);
  const [result, setResult] = useState<SpinResult | null>(null);
  const [showWin, setShowWin] = useState(false);
  const reelRefs = [useRef<HTMLDivElement>(null), useRef<HTMLDivElement>(null), useRef<HTMLDivElement>(null)];
  const { playSound } = useSoundEffects();

  const handleSpin = async () => {
    if (availableSpins <= 0 || isSpinning || spinning) return;

    setIsSpinning(true);
    setShowWin(false);
    setResult(null);

    // Play spin start sound
    playSound('spinStart');

    // Haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate([50, 30, 50]);
    }

    // Animate reels with cascading stops
    reelRefs.forEach((ref, index) => {
      if (ref.current) {
        ref.current.style.transition = 'none';
        ref.current.style.transform = 'translateY(0)';
        
        setTimeout(() => {
          if (ref.current) {
            ref.current.style.transition = `transform ${1.5 + index * 0.4}s cubic-bezier(0.25, 0.1, 0.25, 1)`;
            ref.current.style.transform = `translateY(-${(SYMBOLS.length * 2 + index) * 80}px)`;
          }
        }, 50);
      }
    });

    // Get actual result from backend
    const spinResult = await onSpin();

    // Wait for animation to complete
    await new Promise(resolve => setTimeout(resolve, 2500));

    if (spinResult) {
      setDisplaySymbols(spinResult.symbols);
      setResult(spinResult);
      setShowWin(true);

      // Play appropriate sound
      if (spinResult.prizeType === 'jackpot') {
        playSound('jackpot');
      } else {
        playSound('spinStop');
        // Play coin sound after a short delay
        setTimeout(() => playSound('coinEarn'), 200);
      }

      // Victory haptic
      if (navigator.vibrate) {
        if (spinResult.prizeType === 'jackpot') {
          navigator.vibrate([100, 50, 100, 50, 200]);
        } else {
          navigator.vibrate([100, 50, 100]);
        }
      }
    }

    setIsSpinning(false);
  };

  return (
    <Card className="overflow-hidden bg-gradient-to-b from-primary/5 to-primary/10 border-2 border-primary/20">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-xl">
            <span className="text-2xl">🎰</span>
            Daily Spin
          </CardTitle>
          <div className="flex gap-3">
            <Badge variant="secondary" className="flex items-center gap-1 px-3 py-1">
              <Coins className="w-4 h-4 text-warning" />
              <span className="font-bold">{coins}</span>
            </Badge>
            {streakMultiplier > 1 && (
              <Badge variant="outline" className="flex items-center gap-1 px-3 py-1 border-accent text-accent">
                <Zap className="w-4 h-4" />
                <span className="font-bold">{streakMultiplier}x</span>
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-4">
        {/* Slot Machine Display */}
        <div className="relative bg-gradient-to-b from-background to-muted rounded-xl p-4 mb-4 border-2 border-primary/30 shadow-inner">
          {/* Glow effect on win */}
          {showWin && (
            <div className="absolute inset-0 bg-accent/20 rounded-xl animate-pulse pointer-events-none" />
          )}

          {/* Reels Container */}
          <div className="flex justify-center gap-3 h-24 overflow-hidden">
            {[0, 1, 2].map((reelIndex) => (
              <div
                key={reelIndex}
                className="relative w-20 h-24 bg-card rounded-lg border-2 border-primary/20 overflow-hidden shadow-lg"
              >
                <div
                  ref={reelRefs[reelIndex]}
                  className={cn(
                    "flex flex-col items-center",
                    !isSpinning && "transition-none"
                  )}
                >
                  {isSpinning ? (
                    REEL_ITEMS.map((symbol, idx) => (
                      <div
                        key={idx}
                        className="w-20 h-20 flex items-center justify-center text-5xl"
                      >
                        {symbol}
                      </div>
                    ))
                  ) : (
                    <div className="w-20 h-24 flex items-center justify-center text-5xl animate-fade-in">
                      {displaySymbols[reelIndex]}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Win indicator line */}
          <div className="absolute left-4 right-4 top-1/2 -translate-y-1/2 h-0.5 bg-accent/50 pointer-events-none" />
        </div>

        {/* Result Display */}
        {showWin && result && (
          <div className={cn(
            "text-center mb-4 p-4 rounded-xl animate-scale-in",
            result.prizeType === 'jackpot' 
              ? "bg-gradient-to-r from-warning/20 via-accent/20 to-warning/20 border-2 border-warning"
              : "bg-success/10 border border-success/30"
          )}>
            <div className="flex items-center justify-center gap-2 mb-1">
              {result.prizeType === 'jackpot' ? (
                <Sparkles className="w-6 h-6 text-warning animate-pulse" />
              ) : (
                <Gift className="w-5 h-5 text-success" />
              )}
              <span className={cn(
                "font-bold",
                result.prizeType === 'jackpot' ? "text-2xl text-warning" : "text-lg text-success"
              )}>
                {result.prizeType === 'jackpot' ? 'JACKPOT!' : 'You Won!'}
              </span>
              {result.prizeType === 'jackpot' && (
                <Sparkles className="w-6 h-6 text-warning animate-pulse" />
              )}
            </div>
            <p className="text-foreground font-medium">{result.prizeName}</p>
          </div>
        )}

        {/* Spin Button */}
        <Button
          onClick={handleSpin}
          disabled={availableSpins <= 0 || isSpinning || spinning}
          className={cn(
            "w-full h-16 text-xl font-bold transition-all duration-200",
            availableSpins > 0 && !isSpinning
              ? "bg-gradient-to-r from-accent to-warning hover:from-accent/90 hover:to-warning/90 shadow-accent"
              : ""
          )}
          size="lg"
        >
          {isSpinning ? (
            <span className="flex items-center gap-2">
              <span className="animate-spin">🎰</span>
              Spinning...
            </span>
          ) : availableSpins > 0 ? (
            <span className="flex items-center gap-2">
              <span>🎲</span>
              SPIN ({availableSpins} left)
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <span>😴</span>
              No Spins Available
            </span>
          )}
        </Button>

        {/* Help text */}
        <p className="text-center text-muted-foreground text-sm mt-3">
          Take your meds on time to earn more spins! 💊
        </p>
      </CardContent>
    </Card>
  );
}
