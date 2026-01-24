import { Sun, CloudSun, Sunset, Moon } from 'lucide-react';
import { cn } from '@/lib/utils';

type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'bedtime';

interface TimeOfDayHeaderProps {
  timeOfDay: TimeOfDay;
  medicationCount: number;
  completedCount: number;
}

const timeConfig = {
  morning: {
    icon: Sun,
    label: 'Morning',
    timeRange: '6 AM - 12 PM',
    bgClass: 'bg-morning-gradient',
    borderClass: 'border-morning',
    iconClass: 'text-morning',
  },
  afternoon: {
    icon: CloudSun,
    label: 'Afternoon',
    timeRange: '12 PM - 5 PM',
    bgClass: 'bg-afternoon-gradient',
    borderClass: 'border-afternoon',
    iconClass: 'text-afternoon',
  },
  evening: {
    icon: Sunset,
    label: 'Evening',
    timeRange: '5 PM - 9 PM',
    bgClass: 'bg-evening-gradient',
    borderClass: 'border-evening',
    iconClass: 'text-evening',
  },
  bedtime: {
    icon: Moon,
    label: 'Bedtime',
    timeRange: '9 PM - 12 AM',
    bgClass: 'bg-bedtime-gradient',
    borderClass: 'border-bedtime',
    iconClass: 'text-bedtime',
  },
};

export function TimeOfDayHeader({ timeOfDay, medicationCount, completedCount }: TimeOfDayHeaderProps) {
  const config = timeConfig[timeOfDay];
  const Icon = config.icon;
  const allComplete = completedCount >= medicationCount;

  return (
    <div className={cn(
      "flex items-center gap-4 p-5 rounded-2xl border-3 transition-all",
      config.bgClass,
      config.borderClass,
      allComplete && "opacity-70"
    )}>
      <div className={cn(
        "w-16 h-16 rounded-full flex items-center justify-center",
        "bg-card shadow-elder"
      )}>
        <Icon className={cn("w-9 h-9", config.iconClass)} />
      </div>
      
      <div className="flex-1">
        <h2 className="text-elder-xl text-foreground">{config.label}</h2>
        <p className="text-muted-foreground text-lg">{config.timeRange}</p>
      </div>

      {medicationCount > 0 && (
        <div className={cn(
          "px-5 py-2 rounded-full font-bold text-lg",
          allComplete 
            ? "bg-success/20 text-success" 
            : "bg-card text-foreground"
        )}>
          {allComplete ? '✓ Done' : `${completedCount}/${medicationCount}`}
        </div>
      )}
    </div>
  );
}
