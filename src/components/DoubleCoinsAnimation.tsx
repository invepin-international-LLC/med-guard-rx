import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface DoubleCoinsAnimationProps {
  isActive: boolean;
  onComplete?: () => void;
}

export function DoubleCoinsAnimation({ 
  isActive, 
  onComplete 
}: DoubleCoinsAnimationProps) {
  const [phase, setPhase] = useState<'idle' | 'multiplying' | 'celebrating' | 'complete'>('idle');

  useEffect(() => {
    if (isActive) {
      setPhase('multiplying');
      
      // Phase 1: Coins multiply
      const multiplyTimer = setTimeout(() => {
        setPhase('celebrating');
      }, 1200);
      
      // Phase 2: Celebration
      const celebrateTimer = setTimeout(() => {
        setPhase('complete');
      }, 2800);
      
      // Phase 3: Cleanup
      const completeTimer = setTimeout(() => {
        onComplete?.();
        setPhase('idle');
      }, 3500);

      return () => {
        clearTimeout(multiplyTimer);
        clearTimeout(celebrateTimer);
        clearTimeout(completeTimer);
      };
    }
  }, [isActive, onComplete]);

  if (phase === 'idle') return null;

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none flex items-center justify-center overflow-hidden">
      {/* Golden radial backdrop */}
      <div 
        className={cn(
          "absolute inset-0 transition-opacity duration-500",
          phase === 'multiplying' && "opacity-100",
          phase === 'celebrating' && "opacity-80",
          phase === 'complete' && "opacity-0"
        )}
        style={{
          background: 'radial-gradient(circle at center, hsl(38, 92%, 50%, 0.4) 0%, transparent 60%)',
        }}
      />

      {/* Central coin container */}
      <div className="relative flex items-center justify-center">
        {/* Original coin (left) */}
        <div 
          className={cn(
            "relative transition-all duration-700",
            phase === 'multiplying' && "animate-coin-split-left",
            phase === 'celebrating' && "animate-coin-bounce",
            phase === 'complete' && "opacity-0 scale-0"
          )}
        >
          <div className="relative">
            <span 
              className="text-8xl drop-shadow-2xl"
              style={{
                filter: 'drop-shadow(0 0 20px hsl(38, 92%, 50%))',
              }}
            >
              🪙
            </span>
            {/* Coin glow */}
            <div 
              className="absolute inset-0 rounded-full blur-xl opacity-60"
              style={{
                background: 'radial-gradient(circle, hsl(38, 92%, 60%) 0%, transparent 70%)',
              }}
            />
          </div>
        </div>

        {/* Multiplier symbol */}
        <div 
          className={cn(
            "mx-4 transition-all duration-500",
            phase === 'multiplying' && "animate-multiplier-appear",
            phase === 'celebrating' && "opacity-100 scale-100",
            phase === 'complete' && "opacity-0 scale-0"
          )}
        >
          <span 
            className="text-6xl font-black text-warning drop-shadow-lg"
            style={{
              textShadow: '0 0 30px hsl(38, 92%, 50%), 0 0 60px hsl(38, 92%, 50%)',
            }}
          >
            ×2
          </span>
        </div>

        {/* Duplicated coin (right) */}
        <div 
          className={cn(
            "relative transition-all duration-700",
            phase === 'multiplying' && "animate-coin-split-right",
            phase === 'celebrating' && "animate-coin-bounce-delayed",
            phase === 'complete' && "opacity-0 scale-0"
          )}
        >
          <div className="relative">
            <span 
              className="text-8xl drop-shadow-2xl"
              style={{
                filter: 'drop-shadow(0 0 20px hsl(38, 92%, 50%))',
              }}
            >
              🪙
            </span>
            {/* Coin glow */}
            <div 
              className="absolute inset-0 rounded-full blur-xl opacity-60"
              style={{
                background: 'radial-gradient(circle, hsl(38, 92%, 60%) 0%, transparent 70%)',
              }}
            />
          </div>
        </div>
      </div>

      {/* Sparkle particles */}
      {(phase === 'multiplying' || phase === 'celebrating') && (
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-coin-sparkle"
              style={{
                left: `${30 + Math.random() * 40}%`,
                top: `${30 + Math.random() * 40}%`,
                animationDelay: `${i * 0.08}s`,
              }}
            >
              <span className="text-2xl">✨</span>
            </div>
          ))}
        </div>
      )}

      {/* Flying coins */}
      {phase === 'celebrating' && (
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(16)].map((_, i) => {
            const angle = (i / 16) * 360;
            const delay = i * 0.05;
            return (
              <div
                key={i}
                className="absolute left-1/2 top-1/2 animate-coin-burst"
                style={{
                  animationDelay: `${delay}s`,
                  '--burst-angle': `${angle}deg`,
                } as React.CSSProperties}
              >
                <span className="text-3xl">🪙</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Status text */}
      <div 
        className={cn(
          "absolute left-1/2 -translate-x-1/2 text-center whitespace-nowrap transition-all duration-500",
          phase === 'multiplying' && "opacity-0 translate-y-8",
          phase === 'celebrating' && "opacity-100 translate-y-0",
          phase === 'complete' && "opacity-0 -translate-y-8"
        )}
        style={{ top: '65%' }}
      >
        <p 
          className="text-3xl font-black drop-shadow-lg"
          style={{
            color: 'hsl(38, 92%, 50%)',
            textShadow: '0 2px 10px rgba(0,0,0,0.3), 0 0 30px hsl(38, 92%, 50%)',
          }}
        >
          Double Coins Activated!
        </p>
        <p className="text-lg text-foreground mt-2 font-semibold drop-shadow">
          Earn 2× coins for 24 hours
        </p>
      </div>

      {/* Golden rays */}
      <div 
        className={cn(
          "absolute inset-0 transition-opacity duration-1000",
          phase === 'celebrating' ? "opacity-30" : "opacity-0"
        )}
      >
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className="absolute left-1/2 top-1/2 origin-bottom h-[50vh] w-1"
            style={{
              transform: `rotate(${i * 30}deg) translateY(-50%)`,
              background: 'linear-gradient(to top, hsl(38, 92%, 50%), transparent)',
            }}
          />
        ))}
      </div>
    </div>
  );
}
