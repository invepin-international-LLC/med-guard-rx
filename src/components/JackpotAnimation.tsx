import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface JackpotAnimationProps {
  isActive: boolean;
  prizeValue: number;
  onComplete?: () => void;
}

export function JackpotAnimation({ 
  isActive, 
  prizeValue,
  onComplete 
}: JackpotAnimationProps) {
  const [phase, setPhase] = useState<'idle' | 'exploding' | 'celebrating' | 'counting' | 'complete'>('idle');
  const [displayedCoins, setDisplayedCoins] = useState(0);

  useEffect(() => {
    if (isActive) {
      setPhase('exploding');
      setDisplayedCoins(0);
      
      // Phase 1: Initial explosion
      const explodeTimer = setTimeout(() => {
        setPhase('celebrating');
      }, 800);
      
      // Phase 2: Coin counting animation
      const countTimer = setTimeout(() => {
        setPhase('counting');
        // Animate coin counter
        const duration = 1500;
        const steps = 30;
        const increment = prizeValue / steps;
        let current = 0;
        const countInterval = setInterval(() => {
          current += increment;
          if (current >= prizeValue) {
            setDisplayedCoins(prizeValue);
            clearInterval(countInterval);
          } else {
            setDisplayedCoins(Math.floor(current));
          }
        }, duration / steps);
      }, 1800);
      
      // Phase 3: Complete
      const completeTimer = setTimeout(() => {
        setPhase('complete');
      }, 4000);
      
      // Phase 4: Cleanup
      const cleanupTimer = setTimeout(() => {
        onComplete?.();
        setPhase('idle');
      }, 4800);

      return () => {
        clearTimeout(explodeTimer);
        clearTimeout(countTimer);
        clearTimeout(completeTimer);
        clearTimeout(cleanupTimer);
      };
    }
  }, [isActive, prizeValue, onComplete]);

  if (phase === 'idle') return null;

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none flex items-center justify-center overflow-hidden">
      {/* Radial explosion backdrop */}
      <div 
        className={cn(
          "absolute inset-0 transition-opacity duration-500",
          phase === 'exploding' && "opacity-100",
          phase === 'celebrating' && "opacity-90",
          phase === 'counting' && "opacity-70",
          phase === 'complete' && "opacity-0"
        )}
        style={{
          background: 'radial-gradient(circle at center, hsl(38, 92%, 50%, 0.5) 0%, hsl(25, 95%, 53%, 0.3) 30%, transparent 70%)',
        }}
      />

      {/* Golden rays burst */}
      <div 
        className={cn(
          "absolute inset-0 transition-opacity duration-700",
          (phase === 'exploding' || phase === 'celebrating') ? "opacity-40" : "opacity-0"
        )}
      >
        {[...Array(24)].map((_, i) => (
          <div
            key={i}
            className="absolute left-1/2 top-1/2 origin-bottom animate-jackpot-ray"
            style={{
              width: '3px',
              height: '50vh',
              transform: `rotate(${i * 15}deg) translateY(-50%)`,
              background: 'linear-gradient(to top, hsl(38, 92%, 55%), hsl(38, 92%, 70%), transparent)',
              animationDelay: `${i * 0.02}s`,
            }}
          />
        ))}
      </div>

      {/* Central JACKPOT text */}
      <div 
        className={cn(
          "relative transition-all duration-500",
          phase === 'exploding' && "animate-jackpot-text-appear",
          phase === 'celebrating' && "animate-jackpot-text-pulse",
          phase === 'counting' && "opacity-100 scale-100",
          phase === 'complete' && "opacity-0 scale-50"
        )}
      >
        {/* Glowing background */}
        <div 
          className="absolute inset-0 blur-3xl -z-10"
          style={{
            background: 'radial-gradient(circle, hsl(38, 92%, 60%) 0%, transparent 70%)',
            transform: 'scale(2)',
          }}
        />
        
        {/* Main text */}
        <h1 
          className="text-6xl md:text-7xl font-black tracking-wider"
          style={{
            background: 'linear-gradient(to bottom, hsl(45, 100%, 70%), hsl(38, 92%, 50%), hsl(30, 90%, 40%))',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.4))',
            textShadow: '0 0 40px hsl(38, 92%, 50%)',
          }}
        >
          🎰 JACKPOT! 🎰
        </h1>

        {/* Coin counter */}
        <div 
          className={cn(
            "text-center mt-4 transition-all duration-500",
            (phase === 'counting' || phase === 'complete') ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          )}
        >
          <div className="flex items-center justify-center gap-3">
            <span className="text-5xl">🪙</span>
            <span 
              className="text-5xl font-black"
              style={{
                color: 'hsl(38, 92%, 50%)',
                textShadow: '0 0 20px hsl(38, 92%, 50%)',
              }}
            >
              +{displayedCoins}
            </span>
          </div>
          <p className="text-xl text-foreground mt-2 font-bold drop-shadow">
            coins earned!
          </p>
        </div>
      </div>

      {/* Exploding coins */}
      {(phase === 'exploding' || phase === 'celebrating') && (
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(30)].map((_, i) => {
            const angle = (i / 30) * 360;
            const distance = 120 + Math.random() * 100;
            return (
              <div
                key={i}
                className="absolute left-1/2 top-1/2 animate-jackpot-coin-burst"
                style={{
                  animationDelay: `${i * 0.03}s`,
                  '--burst-angle': `${angle}deg`,
                  '--burst-distance': `${distance}px`,
                } as React.CSSProperties}
              >
                <span 
                  className="text-4xl"
                  style={{
                    filter: 'drop-shadow(0 0 10px hsl(38, 92%, 50%))',
                  }}
                >
                  🪙
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Floating trophy icons */}
      {phase === 'celebrating' && (
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-jackpot-float"
              style={{
                left: `${10 + (i % 4) * 25}%`,
                top: `${15 + Math.floor(i / 4) * 60}%`,
                animationDelay: `${i * 0.15}s`,
              }}
            >
              <span className="text-4xl">{i % 2 === 0 ? '🏆' : '⭐'}</span>
            </div>
          ))}
        </div>
      )}

      {/* Sparkle particles */}
      {(phase === 'celebrating' || phase === 'counting') && (
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(25)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-jackpot-sparkle"
              style={{
                left: `${10 + Math.random() * 80}%`,
                top: `${10 + Math.random() * 80}%`,
                animationDelay: `${i * 0.08}s`,
              }}
            >
              <span className="text-2xl">{i % 3 === 0 ? '✨' : i % 3 === 1 ? '💫' : '⭐'}</span>
            </div>
          ))}
        </div>
      )}

      {/* Confetti ribbons */}
      {(phase === 'exploding' || phase === 'celebrating') && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-jackpot-confetti"
              style={{
                left: `${Math.random() * 100}%`,
                top: '-5%',
                animationDelay: `${i * 0.1}s`,
                animationDuration: `${2 + Math.random()}s`,
              }}
            >
              <div 
                className="w-3 h-8 rounded-full"
                style={{
                  background: [
                    'hsl(38, 92%, 50%)', 
                    'hsl(45, 100%, 60%)', 
                    'hsl(0, 84%, 60%)',
                    'hsl(280, 70%, 50%)',
                    'hsl(142, 70%, 45%)',
                  ][i % 5],
                  transform: `rotate(${Math.random() * 360}deg)`,
                }}
              />
            </div>
          ))}
        </div>
      )}

      {/* Bottom celebration bar */}
      <div 
        className={cn(
          "absolute bottom-[15%] left-1/2 -translate-x-1/2 transition-all duration-500",
          (phase === 'celebrating' || phase === 'counting') ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
        )}
      >
        <div className="flex items-center gap-4">
          {['🎊', '🎉', '🥳', '🎉', '🎊'].map((emoji, i) => (
            <span 
              key={i} 
              className="text-4xl animate-jackpot-bounce"
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              {emoji}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
