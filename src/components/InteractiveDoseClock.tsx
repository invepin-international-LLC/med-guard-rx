import { cn } from '@/lib/utils';

interface InteractiveDoseClockProps {
  doses: { hour: number; status: 'taken' | 'missed' | 'upcoming' | 'pending' }[];
  size?: 'sm' | 'md' | 'lg';
}

export function InteractiveDoseClock({ doses, size = 'md' }: InteractiveDoseClockProps) {
  const currentHour = new Date().getHours();
  
  const sizeClasses = {
    sm: 'w-48 h-48',
    md: 'w-64 h-64',
    lg: 'w-80 h-80',
  };

  const dotSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  const statusColors = {
    taken: 'bg-success',
    missed: 'bg-destructive',
    upcoming: 'bg-info animate-gentle-pulse',
    pending: 'bg-accent',
  };

  return (
    <div className={cn("relative mx-auto", sizeClasses[size])}>
      {/* Clock face background */}
      <div className="absolute inset-0 rounded-full bg-card border-4 border-border shadow-elder-lg" />
      
      {/* Center dot */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-primary" />

      {/* Hour markers */}
      {Array.from({ length: 24 }, (_, i) => {
        const angle = (i * 15 - 90) * (Math.PI / 180);
        const radius = size === 'lg' ? 120 : size === 'md' ? 100 : 80;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        
        const dose = doses.find(d => d.hour === i);
        const isCurrentHour = i === currentHour;
        
        return (
          <div
            key={i}
            className="absolute top-1/2 left-1/2"
            style={{
              transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
            }}
          >
            {dose ? (
              <div
                className={cn(
                  dotSizes[size],
                  "rounded-full flex items-center justify-center font-bold text-xs",
                  statusColors[dose.status],
                  dose.status === 'taken' && "text-success-foreground",
                  dose.status === 'missed' && "text-destructive-foreground",
                  dose.status === 'upcoming' && "text-info-foreground",
                  isCurrentHour && "ring-4 ring-primary ring-offset-2"
                )}
                title={`${i}:00 - ${dose.status}`}
              >
                {dose.status === 'taken' ? '✓' : ''}
              </div>
            ) : (
              <div
                className={cn(
                  "w-2 h-2 rounded-full",
                  isCurrentHour ? "bg-primary" : "bg-muted-foreground/30"
                )}
              />
            )}
          </div>
        );
      })}

      {/* Time labels */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 text-sm font-bold text-foreground">12</div>
      <div className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-foreground">6</div>
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-sm font-bold text-foreground">0</div>
      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-foreground">18</div>

      {/* Legend */}
      <div className="absolute -bottom-16 left-0 right-0 flex justify-center gap-4 text-sm">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-success" />
          <span className="text-muted-foreground">Taken</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-destructive" />
          <span className="text-muted-foreground">Missed</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-info" />
          <span className="text-muted-foreground">Upcoming</span>
        </div>
      </div>
    </div>
  );
}
