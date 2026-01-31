import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface TripleSpinsAnimationProps {
  isActive: boolean;
  onComplete?: () => void;
}

const REEL_SYMBOLS = ['🍒', '💎', '7️⃣', '🪙', '⭐', '🎰'];

export function TripleSpinsAnimation({ 
  isActive, 
  onComplete 
}: TripleSpinsAnimationProps) {
  const [phase, setPhase] = useState<'idle' | 'appearing' | 'spinning' | 'celebrating' | 'complete'>('idle');
  const [reelSymbols, setReelSymbols] = useState(['7️⃣', '7️⃣', '7️⃣']);

  useEffect(() => {
    if (isActive) {
      setPhase('appearing');
      
      // Phase 1: Slot machine appears
      const appearTimer = setTimeout(() => {
        setPhase('spinning');
      }, 800);
      
      // Animate reels during spinning
      let spinInterval: NodeJS.Timeout;
      const spinStartTimer = setTimeout(() => {
        spinInterval = setInterval(() => {
          setReelSymbols([
            REEL_SYMBOLS[Math.floor(Math.random() * REEL_SYMBOLS.length)],
            REEL_SYMBOLS[Math.floor(Math.random() * REEL_SYMBOLS.length)],
            REEL_SYMBOLS[Math.floor(Math.random() * REEL_SYMBOLS.length)],
          ]);
        }, 80);
      }, 800);
      
      // Phase 2: Stop spinning, show triple 7s
      const celebrateTimer = setTimeout(() => {
        if (spinInterval) clearInterval(spinInterval);
        setReelSymbols(['7️⃣', '7️⃣', '7️⃣']);
        setPhase('celebrating');
      }, 2200);
      
      // Phase 3: Complete
      const completeTimer = setTimeout(() => {
        setPhase('complete');
      }, 3800);
      
      // Phase 4: Cleanup
      const cleanupTimer = setTimeout(() => {
        onComplete?.();
        setPhase('idle');
      }, 4300);

      return () => {
        clearTimeout(appearTimer);
        clearTimeout(spinStartTimer);
        clearTimeout(celebrateTimer);
        clearTimeout(completeTimer);
        clearTimeout(cleanupTimer);
        if (spinInterval) clearInterval(spinInterval);
      };
    }
  }, [isActive, onComplete]);

  if (phase === 'idle') return null;

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none flex items-center justify-center overflow-hidden">
      {/* Purple/gold radial backdrop */}
      <div 
        className={cn(
          "absolute inset-0 transition-opacity duration-500",
          phase === 'appearing' && "opacity-100",
          phase === 'spinning' && "opacity-100",
          phase === 'celebrating' && "opacity-80",
          phase === 'complete' && "opacity-0"
        )}
        style={{
          background: 'radial-gradient(circle at center, hsl(280, 70%, 50%, 0.4) 0%, hsl(38, 92%, 50%, 0.2) 40%, transparent 70%)',
        }}
      />

      {/* Slot machine container */}
      <div 
        className={cn(
          "relative transition-all duration-700",
          phase === 'appearing' && "animate-slot-machine-appear",
          phase === 'spinning' && "scale-100 opacity-100",
          phase === 'celebrating' && "animate-slot-machine-celebrate",
          phase === 'complete' && "opacity-0 scale-75"
        )}
      >
        {/* Machine frame */}
        <div 
          className="relative rounded-2xl p-2 shadow-2xl"
          style={{
            background: 'linear-gradient(135deg, hsl(280, 60%, 35%) 0%, hsl(280, 70%, 25%) 50%, hsl(280, 60%, 20%) 100%)',
            boxShadow: '0 0 60px hsl(280, 70%, 50%, 0.5), inset 0 2px 0 hsl(280, 60%, 50%), inset 0 -2px 0 hsl(280, 80%, 15%)',
          }}
        >
          {/* "TRIPLE SPINS" header */}
          <div 
            className="text-center py-2 px-6 rounded-t-lg mb-2"
            style={{
              background: 'linear-gradient(to bottom, hsl(38, 92%, 55%), hsl(38, 92%, 45%))',
              textShadow: '0 2px 4px rgba(0,0,0,0.3)',
            }}
          >
            <span className="text-lg font-black text-white tracking-wider">
              ×3 SPINS!
            </span>
          </div>

          {/* Reel display */}
          <div 
            className="flex gap-2 p-3 rounded-lg mx-1"
            style={{
              background: 'linear-gradient(to bottom, hsl(0, 0%, 10%), hsl(0, 0%, 5%))',
              boxShadow: 'inset 0 4px 8px rgba(0,0,0,0.5)',
            }}
          >
            {reelSymbols.map((symbol, i) => (
              <div
                key={i}
                className={cn(
                  "w-16 h-20 rounded-lg flex items-center justify-center transition-all",
                  phase === 'spinning' && "animate-reel-spin"
                )}
                style={{
                  background: 'linear-gradient(to bottom, hsl(0, 0%, 95%), hsl(0, 0%, 85%))',
                  boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1), 0 2px 4px rgba(0,0,0,0.2)',
                  animationDelay: phase === 'spinning' ? `${i * 0.1}s` : '0s',
                }}
              >
                <span 
                  className="text-4xl"
                  style={{
                    filter: phase === 'celebrating' ? 'drop-shadow(0 0 10px hsl(38, 92%, 50%))' : 'none',
                  }}
                >
                  {symbol}
                </span>
              </div>
            ))}
          </div>

          {/* Machine base */}
          <div 
            className="h-3 mt-2 rounded-b-lg"
            style={{
              background: 'linear-gradient(to bottom, hsl(280, 60%, 30%), hsl(280, 70%, 20%))',
            }}
          />
        </div>

        {/* Glow effect behind machine */}
        <div 
          className={cn(
            "absolute inset-0 -z-10 blur-2xl transition-opacity duration-500",
            (phase === 'spinning' || phase === 'celebrating') ? "opacity-60" : "opacity-0"
          )}
          style={{
            background: 'radial-gradient(circle, hsl(280, 70%, 60%) 0%, hsl(38, 92%, 50%) 50%, transparent 70%)',
            transform: 'scale(1.5)',
          }}
        />
      </div>

      {/* Flying spin tokens */}
      {phase === 'celebrating' && (
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(12)].map((_, i) => {
            const angle = (i / 12) * 360;
            return (
              <div
                key={i}
                className="absolute left-1/2 top-1/2 animate-spin-token-burst"
                style={{
                  animationDelay: `${i * 0.05}s`,
                  '--burst-angle': `${angle}deg`,
                } as React.CSSProperties}
              >
                <span className="text-3xl">🎰</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Sparkle particles */}
      {(phase === 'spinning' || phase === 'celebrating') && (
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(16)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-triple-spin-sparkle"
              style={{
                left: `${25 + Math.random() * 50}%`,
                top: `${25 + Math.random() * 50}%`,
                animationDelay: `${i * 0.1}s`,
              }}
            >
              <span className="text-xl">✨</span>
            </div>
          ))}
        </div>
      )}

      {/* Status text */}
      <div 
        className={cn(
          "absolute left-1/2 -translate-x-1/2 text-center whitespace-nowrap transition-all duration-500",
          phase === 'appearing' && "opacity-0 translate-y-8",
          phase === 'spinning' && "opacity-0 translate-y-8",
          phase === 'celebrating' && "opacity-100 translate-y-0",
          phase === 'complete' && "opacity-0 -translate-y-8"
        )}
        style={{ top: '72%' }}
      >
        <p 
          className="text-3xl font-black drop-shadow-lg"
          style={{
            background: 'linear-gradient(to right, hsl(280, 70%, 60%), hsl(38, 92%, 50%))',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
          }}
        >
          Triple Spins Unlocked!
        </p>
        <p className="text-lg text-foreground mt-2 font-semibold drop-shadow">
          +3 bonus slot machine spins added
        </p>
      </div>

      {/* Corner decorations */}
      {phase === 'celebrating' && (
        <>
          <div className="absolute top-[15%] left-[15%] animate-corner-spin">
            <span className="text-5xl">🎰</span>
          </div>
          <div className="absolute top-[15%] right-[15%] animate-corner-spin" style={{ animationDelay: '0.2s' }}>
            <span className="text-5xl">🎰</span>
          </div>
          <div className="absolute bottom-[20%] left-[15%] animate-corner-spin" style={{ animationDelay: '0.4s' }}>
            <span className="text-5xl">🎰</span>
          </div>
          <div className="absolute bottom-[20%] right-[15%] animate-corner-spin" style={{ animationDelay: '0.6s' }}>
            <span className="text-5xl">🎰</span>
          </div>
        </>
      )}
    </div>
  );
}
