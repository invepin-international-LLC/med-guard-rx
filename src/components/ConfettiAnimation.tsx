import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface ConfettiAnimationProps {
  isVisible: boolean;
  onComplete?: () => void;
  variant?: 'celebration' | 'jackpot';
}

interface ConfettiPiece {
  id: number;
  x: number;
  color: string;
  size: number;
  delay: number;
  duration: number;
  rotation: number;
  shape: 'square' | 'circle' | 'strip';
}

const CELEBRATION_COLORS = [
  'hsl(142 70% 45%)', // success green
  'hsl(25 95% 53%)',  // accent orange
  'hsl(38 92% 50%)',  // warning yellow
  'hsl(210 100% 50%)', // info blue
  'hsl(270 70% 55%)', // purple
  'hsl(340 80% 55%)', // pink
];

const JACKPOT_COLORS = [
  'hsl(38 92% 50%)',  // gold
  'hsl(45 100% 51%)', // bright yellow
  'hsl(25 95% 53%)',  // orange
  'hsl(38 92% 60%)',  // light gold
  'hsl(30 100% 50%)', // amber
  'hsl(50 100% 60%)', // yellow
];

export function ConfettiAnimation({ 
  isVisible, 
  onComplete,
  variant = 'celebration'
}: ConfettiAnimationProps) {
  const [pieces, setPieces] = useState<ConfettiPiece[]>([]);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    if (isVisible && !animating) {
      setAnimating(true);
      
      const colors = variant === 'jackpot' ? JACKPOT_COLORS : CELEBRATION_COLORS;
      const pieceCount = variant === 'jackpot' ? 80 : 50;
      
      // Generate confetti pieces
      const newPieces: ConfettiPiece[] = Array.from({ length: pieceCount }, (_, i) => ({
        id: i,
        x: Math.random() * 100, // percentage across screen
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 6 + Math.random() * 8,
        delay: Math.random() * 500,
        duration: 2000 + Math.random() * 1500,
        rotation: Math.random() * 360,
        shape: ['square', 'circle', 'strip'][Math.floor(Math.random() * 3)] as 'square' | 'circle' | 'strip',
      }));
      
      setPieces(newPieces);
      
      // Cleanup after animation
      const maxDuration = Math.max(...newPieces.map(p => p.delay + p.duration));
      setTimeout(() => {
        setAnimating(false);
        setPieces([]);
        onComplete?.();
      }, maxDuration + 200);
    }
  }, [isVisible, onComplete, animating, variant]);

  if (!isVisible && !animating) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {pieces.map((piece) => (
        <div
          key={piece.id}
          className="absolute animate-confetti-fall"
          style={{
            left: `${piece.x}%`,
            top: '-20px',
            '--confetti-duration': `${piece.duration}ms`,
            '--confetti-delay': `${piece.delay}ms`,
            '--confetti-rotation': `${piece.rotation}deg`,
            '--confetti-end-rotation': `${piece.rotation + 720 + Math.random() * 360}deg`,
            '--confetti-drift': `${(Math.random() - 0.5) * 100}px`,
            animationDelay: `${piece.delay}ms`,
            animationDuration: `${piece.duration}ms`,
          } as React.CSSProperties}
        >
          <div
            className={cn(
              "animate-confetti-spin",
              piece.shape === 'circle' && "rounded-full",
              piece.shape === 'strip' && "rounded-sm"
            )}
            style={{
              width: piece.shape === 'strip' ? piece.size * 0.4 : piece.size,
              height: piece.shape === 'strip' ? piece.size * 1.5 : piece.size,
              backgroundColor: piece.color,
              transform: `rotate(${piece.rotation}deg)`,
              boxShadow: variant === 'jackpot' ? `0 0 ${piece.size}px ${piece.color}` : 'none',
            }}
          />
        </div>
      ))}
      
      {/* Center burst effect for jackpot */}
      {variant === 'jackpot' && animating && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="w-32 h-32 rounded-full bg-gradient-to-r from-warning/50 to-amber-400/50 animate-jackpot-burst" />
        </div>
      )}
    </div>
  );
}
