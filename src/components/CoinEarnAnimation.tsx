import { useEffect, useState } from 'react';
import { Coins } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CoinEarnAnimationProps {
  amount: number;
  isVisible: boolean;
  onComplete?: () => void;
  position?: 'center' | 'top-right';
}

interface FlyingCoin {
  id: number;
  x: number;
  y: number;
  delay: number;
  size: number;
}

export function CoinEarnAnimation({ 
  amount, 
  isVisible, 
  onComplete,
  position = 'center' 
}: CoinEarnAnimationProps) {
  const [coins, setCoins] = useState<FlyingCoin[]>([]);
  const [showAmount, setShowAmount] = useState(false);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    if (isVisible && !animating) {
      setAnimating(true);
      
      // Generate flying coins with random positions
      const coinCount = Math.min(amount, 12); // Max 12 coins for performance
      const newCoins: FlyingCoin[] = Array.from({ length: coinCount }, (_, i) => ({
        id: i,
        x: Math.random() * 120 - 60, // Random spread -60 to 60
        y: Math.random() * 40 - 20, // Random vertical variation
        delay: i * 50, // Staggered animation
        size: 16 + Math.random() * 8, // Random size 16-24
      }));
      
      setCoins(newCoins);
      
      // Show amount text after coins start flying
      setTimeout(() => setShowAmount(true), 200);
      
      // Cleanup after animation
      setTimeout(() => {
        setAnimating(false);
        setCoins([]);
        setShowAmount(false);
        onComplete?.();
      }, 1500);
    }
  }, [isVisible, amount, onComplete, animating]);

  if (!isVisible && !animating) return null;

  return (
    <div 
      className={cn(
        "fixed inset-0 pointer-events-none z-50 flex items-center justify-center",
        position === 'top-right' && "items-start justify-end pr-8 pt-20"
      )}
    >
      {/* Flying Coins Container */}
      <div className="relative">
        {/* Coins flying upward */}
        {coins.map((coin) => (
          <div
            key={coin.id}
            className="absolute animate-coin-fly"
            style={{
              '--coin-x': `${coin.x}px`,
              '--coin-delay': `${coin.delay}ms`,
              animationDelay: `${coin.delay}ms`,
            } as React.CSSProperties}
          >
            <div 
              className="bg-gradient-to-br from-warning to-amber-400 rounded-full flex items-center justify-center shadow-lg animate-coin-spin"
              style={{ width: coin.size, height: coin.size }}
            >
              <Coins className="text-white" style={{ width: coin.size * 0.6, height: coin.size * 0.6 }} />
            </div>
          </div>
        ))}

        {/* Amount Display */}
        {showAmount && (
          <div className="absolute inset-0 flex items-center justify-center animate-amount-pop">
            <div className="bg-gradient-to-br from-warning via-amber-400 to-yellow-300 text-white px-6 py-3 rounded-2xl shadow-lg shadow-warning/40 flex items-center gap-2">
              <Coins className="w-8 h-8" />
              <span className="text-2xl font-bold">+{amount}</span>
            </div>
          </div>
        )}

        {/* Sparkle effects */}
        {animating && (
          <>
            <div className="absolute -top-8 -left-8 w-4 h-4 bg-warning/80 rounded-full animate-sparkle" style={{ animationDelay: '0ms' }} />
            <div className="absolute -top-4 left-8 w-3 h-3 bg-yellow-300/80 rounded-full animate-sparkle" style={{ animationDelay: '100ms' }} />
            <div className="absolute top-4 -right-8 w-4 h-4 bg-amber-400/80 rounded-full animate-sparkle" style={{ animationDelay: '200ms' }} />
            <div className="absolute -bottom-6 right-4 w-3 h-3 bg-warning/80 rounded-full animate-sparkle" style={{ animationDelay: '300ms' }} />
            <div className="absolute -bottom-4 -left-6 w-2 h-2 bg-yellow-200/80 rounded-full animate-sparkle" style={{ animationDelay: '150ms' }} />
          </>
        )}
      </div>
    </div>
  );
}
