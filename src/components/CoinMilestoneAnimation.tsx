import { useEffect, useState } from 'react';
import { Coins, Trophy, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSoundEffects } from '@/hooks/useSoundEffects';

interface CoinMilestoneAnimationProps {
  milestone: number;
  isVisible: boolean;
  onComplete?: () => void;
}

const MILESTONE_CONFIG: Record<number, { title: string; subtitle: string; icon: 'coins' | 'trophy' | 'star'; color: string }> = {
  500: {
    title: '500 Coins!',
    subtitle: 'Rising Star',
    icon: 'star',
    color: 'from-blue-400 to-cyan-400',
  },
  1000: {
    title: '1,000 Coins!',
    subtitle: 'High Roller',
    icon: 'trophy',
    color: 'from-warning to-amber-400',
  },
  2500: {
    title: '2,500 Coins!',
    subtitle: 'Coin Master',
    icon: 'trophy',
    color: 'from-purple-400 to-pink-400',
  },
  5000: {
    title: '5,000 Coins!',
    subtitle: 'Legendary',
    icon: 'trophy',
    color: 'from-amber-300 to-yellow-200',
  },
};

export function CoinMilestoneAnimation({ 
  milestone, 
  isVisible, 
  onComplete 
}: CoinMilestoneAnimationProps) {
  const [animating, setAnimating] = useState(false);
  const [phase, setPhase] = useState<'burst' | 'reveal' | 'celebrate' | 'fade'>('burst');
  const { playSound } = useSoundEffects();

  const config = MILESTONE_CONFIG[milestone] || MILESTONE_CONFIG[500];

  useEffect(() => {
    if (isVisible && !animating) {
      setAnimating(true);
      setPhase('burst');
      
      // Play celebration sound
      playSound('jackpot');
      
      // Phase timing
      setTimeout(() => setPhase('reveal'), 300);
      setTimeout(() => setPhase('celebrate'), 800);
      setTimeout(() => setPhase('fade'), 2500);
      
      // Complete after animation
      setTimeout(() => {
        setAnimating(false);
        setPhase('burst');
        onComplete?.();
      }, 3200);
    }
  }, [isVisible, onComplete, animating, playSound]);

  if (!isVisible && !animating) return null;

  const IconComponent = config.icon === 'trophy' ? Trophy : config.icon === 'star' ? Star : Coins;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center">
      {/* Dark overlay */}
      <div 
        className={cn(
          "absolute inset-0 bg-black/60 transition-opacity duration-300",
          phase === 'fade' ? 'opacity-0' : 'opacity-100'
        )} 
      />
      
      {/* Radial burst effect */}
      {(phase === 'burst' || phase === 'reveal') && (
        <div className="absolute inset-0 flex items-center justify-center">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-24 bg-gradient-to-t from-warning/80 to-transparent animate-milestone-ray"
              style={{
                transform: `rotate(${i * 30}deg)`,
                transformOrigin: 'bottom center',
                animationDelay: `${i * 30}ms`,
              }}
            />
          ))}
        </div>
      )}

      {/* Main content */}
      <div 
        className={cn(
          "relative flex flex-col items-center gap-4 transition-all duration-500",
          phase === 'burst' && "scale-0 opacity-0",
          phase === 'reveal' && "scale-110 opacity-100",
          phase === 'celebrate' && "scale-100 opacity-100",
          phase === 'fade' && "scale-95 opacity-0 translate-y-4"
        )}
      >
        {/* Glowing circle with icon */}
        <div 
          className={cn(
            "relative w-32 h-32 rounded-full flex items-center justify-center",
            "bg-gradient-to-br shadow-2xl",
            config.color
          )}
          style={{
            boxShadow: phase === 'celebrate' 
              ? '0 0 60px 20px rgba(251, 191, 36, 0.5), 0 0 100px 40px rgba(251, 191, 36, 0.3)' 
              : '0 0 30px 10px rgba(251, 191, 36, 0.3)',
          }}
        >
          {/* Inner glow */}
          <div className="absolute inset-2 rounded-full bg-white/20 backdrop-blur-sm" />
          
          {/* Icon */}
          <IconComponent 
            className={cn(
              "w-16 h-16 text-white drop-shadow-lg relative z-10",
              phase === 'celebrate' && "animate-bounce"
            )} 
          />
          
          {/* Sparkle ring */}
          {phase === 'celebrate' && (
            <div className="absolute inset-0 rounded-full animate-spin-slow">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="absolute w-3 h-3 bg-white rounded-full animate-pulse"
                  style={{
                    top: '50%',
                    left: '50%',
                    transform: `rotate(${i * 45}deg) translateY(-70px) translateX(-50%)`,
                    animationDelay: `${i * 100}ms`,
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Text content */}
        <div className="text-center">
          <div className="text-white/60 text-sm font-medium uppercase tracking-wider mb-1">
            Milestone Reached!
          </div>
          <div 
            className={cn(
              "text-4xl font-bold text-white mb-2 bg-clip-text",
              phase === 'celebrate' && "animate-pulse"
            )}
          >
            {config.title}
          </div>
          <div 
            className={cn(
              "text-lg font-semibold bg-gradient-to-r bg-clip-text text-transparent",
              config.color
            )}
          >
            {config.subtitle}
          </div>
        </div>

        {/* Floating coins */}
        {phase === 'celebrate' && (
          <div className="absolute inset-0 pointer-events-none">
            {Array.from({ length: 20 }).map((_, i) => (
              <div
                key={i}
                className="absolute animate-milestone-coin"
                style={{
                  left: `${10 + Math.random() * 80}%`,
                  top: `${20 + Math.random() * 60}%`,
                  animationDelay: `${Math.random() * 500}ms`,
                  animationDuration: `${1000 + Math.random() * 500}ms`,
                }}
              >
                <div 
                  className="w-6 h-6 rounded-full bg-gradient-to-br from-warning to-amber-400 flex items-center justify-center shadow-lg"
                  style={{
                    boxShadow: '0 0 10px 2px rgba(251, 191, 36, 0.5)',
                  }}
                >
                  <Coins className="w-4 h-4 text-white" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Export milestone thresholds for use in hooks
export const COIN_MILESTONES = [500, 1000, 2500, 5000];
