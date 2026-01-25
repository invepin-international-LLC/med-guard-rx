import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface StreakShieldAnimationProps {
  isActive: boolean;
  duration?: string;
  onComplete?: () => void;
}

export function StreakShieldAnimation({ 
  isActive, 
  duration = '24h',
  onComplete 
}: StreakShieldAnimationProps) {
  const [phase, setPhase] = useState<'idle' | 'activating' | 'shielding' | 'complete'>('idle');

  useEffect(() => {
    if (isActive) {
      setPhase('activating');
      
      // Phase 1: Initial activation (shield appears)
      const activateTimer = setTimeout(() => {
        setPhase('shielding');
      }, 800);
      
      // Phase 2: Shield pulse effect
      const shieldTimer = setTimeout(() => {
        setPhase('complete');
      }, 2500);
      
      // Phase 3: Cleanup
      const completeTimer = setTimeout(() => {
        onComplete?.();
        setPhase('idle');
      }, 3200);

      return () => {
        clearTimeout(activateTimer);
        clearTimeout(shieldTimer);
        clearTimeout(completeTimer);
      };
    }
  }, [isActive, onComplete]);

  if (phase === 'idle') return null;

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none flex items-center justify-center">
      {/* Radial energy backdrop */}
      <div 
        className={cn(
          "absolute inset-0 transition-opacity duration-500",
          phase === 'activating' && "opacity-100",
          phase === 'shielding' && "opacity-80",
          phase === 'complete' && "opacity-0"
        )}
        style={{
          background: 'radial-gradient(circle at center, hsl(var(--primary) / 0.3) 0%, transparent 70%)',
        }}
      />

      {/* Central shield container */}
      <div className="relative">
        {/* Outer energy ring */}
        <div 
          className={cn(
            "absolute inset-0 rounded-full",
            phase === 'activating' && "animate-shield-ring-expand",
            phase === 'shielding' && "animate-shield-ring-pulse"
          )}
          style={{
            width: '280px',
            height: '280px',
            marginLeft: '-140px',
            marginTop: '-140px',
            left: '50%',
            top: '50%',
            border: '4px solid hsl(var(--primary) / 0.6)',
            boxShadow: '0 0 40px hsl(var(--primary) / 0.4), inset 0 0 40px hsl(var(--primary) / 0.2)',
          }}
        />

        {/* Inner energy ring */}
        <div 
          className={cn(
            "absolute rounded-full",
            phase === 'shielding' && "animate-shield-ring-pulse-delayed"
          )}
          style={{
            width: '220px',
            height: '220px',
            marginLeft: '-110px',
            marginTop: '-110px',
            left: '50%',
            top: '50%',
            border: '3px solid hsl(var(--accent) / 0.5)',
            boxShadow: '0 0 30px hsl(var(--accent) / 0.3)',
          }}
        />

        {/* Shield icon container */}
        <div 
          className={cn(
            "relative w-32 h-32 flex items-center justify-center",
            phase === 'activating' && "animate-shield-appear",
            phase === 'shielding' && "animate-shield-glow",
            phase === 'complete' && "animate-shield-fade-out"
          )}
        >
          {/* Shield glow backdrop */}
          <div 
            className="absolute inset-0 rounded-full"
            style={{
              background: 'radial-gradient(circle, hsl(var(--primary) / 0.4) 0%, transparent 70%)',
              filter: 'blur(20px)',
            }}
          />
          
          {/* Main shield emoji */}
          <span 
            className={cn(
              "text-8xl drop-shadow-2xl relative z-10",
              phase === 'shielding' && "animate-bounce"
            )}
            style={{
              filter: 'drop-shadow(0 0 20px hsl(var(--primary) / 0.8))',
            }}
          >
            🛡️
          </span>
        </div>

        {/* Particle effects */}
        {(phase === 'activating' || phase === 'shielding') && (
          <div className="absolute inset-0 pointer-events-none">
            {[...Array(12)].map((_, i) => (
              <div
                key={i}
                className="absolute w-3 h-3 rounded-full animate-shield-particle"
                style={{
                  left: '50%',
                  top: '50%',
                  background: i % 2 === 0 
                    ? 'hsl(var(--primary))' 
                    : 'hsl(var(--accent))',
                  boxShadow: `0 0 10px ${i % 2 === 0 ? 'hsl(var(--primary))' : 'hsl(var(--accent))'}`,
                  animationDelay: `${i * 0.1}s`,
                  transform: `rotate(${i * 30}deg) translateY(-100px)`,
                }}
              />
            ))}
          </div>
        )}

        {/* Status text */}
        <div 
          className={cn(
            "absolute left-1/2 -translate-x-1/2 text-center whitespace-nowrap transition-all duration-500",
            phase === 'activating' && "opacity-0 translate-y-4",
            phase === 'shielding' && "opacity-100 translate-y-0",
            phase === 'complete' && "opacity-0 -translate-y-4"
          )}
          style={{ top: '160px' }}
        >
          <p className="text-2xl font-bold text-foreground drop-shadow-lg">
            Shield Activated!
          </p>
          <p className="text-lg text-primary mt-1 font-semibold">
            Protected for {duration}
          </p>
        </div>
      </div>

      {/* Hexagon grid overlay for tech feel */}
      <div 
        className={cn(
          "absolute inset-0 opacity-10 transition-opacity duration-1000",
          phase === 'complete' && "opacity-0"
        )}
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='28' height='49' viewBox='0 0 28 49'%3E%3Cg fill-rule='evenodd'%3E%3Cg fill='hsl(220, 80%25, 60%25)' fill-opacity='0.4'%3E%3Cpath d='M13.99 9.25l13 7.5v15l-13 7.5L1 31.75v-15l12.99-7.5zM3 17.9v12.7l10.99 6.34 11-6.35V17.9l-11-6.34L3 17.9zM0 15l12.98-7.5V0h-2v6.35L0 12.69v2.3zm0 18.5L12.98 41v8h-2v-6.85L0 35.81v-2.3zM15 0v7.5L27.99 15H28v-2.31h-.01L17 6.35V0h-2zm0 49v-8l12.99-7.5H28v2.31h-.01L17 42.15V49h-2z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />
    </div>
  );
}
