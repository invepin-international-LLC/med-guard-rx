import { Sun, CloudSun, Sunset, Moon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'bedtime';

interface TimeOfDayHeaderProps {
  timeOfDay: TimeOfDay;
  medicationCount: number;
  completedCount: number;
}

const timeConfig = {
  morning: {
    icon: Sun,
    labelKey: 'timeOfDay.morning',
    rangeKey: 'timeOfDay.morningRange',
    bgClass: 'bg-morning-gradient',
    borderClass: 'border-morning',
    iconClass: 'text-morning',
  },
  afternoon: {
    icon: CloudSun,
    labelKey: 'timeOfDay.afternoon',
    rangeKey: 'timeOfDay.afternoonRange',
    bgClass: 'bg-afternoon-gradient',
    borderClass: 'border-afternoon',
    iconClass: 'text-afternoon',
  },
  evening: {
    icon: Sunset,
    labelKey: 'timeOfDay.evening',
    rangeKey: 'timeOfDay.eveningRange',
    bgClass: 'bg-evening-gradient',
    borderClass: 'border-evening',
    iconClass: 'text-evening',
  },
  bedtime: {
    icon: Moon,
    labelKey: 'timeOfDay.bedtime',
    rangeKey: 'timeOfDay.bedtimeRange',
    bgClass: 'bg-bedtime-gradient',
    borderClass: 'border-bedtime',
    iconClass: 'text-bedtime',
  },
};

export function TimeOfDayHeader({ timeOfDay, medicationCount, completedCount }: TimeOfDayHeaderProps) {
  const { t } = useTranslation();
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
        <h2 className="text-elder-xl text-foreground">{t(config.labelKey)}</h2>
        <p className="text-muted-foreground text-lg">{t(config.rangeKey)}</p>
      </div>

      {medicationCount > 0 && (
        <div className={cn(
          "px-5 py-2 rounded-full font-bold text-lg",
          allComplete 
            ? "bg-success/20 text-success" 
            : "bg-card text-foreground"
        )}>
          {allComplete ? `✓ ${t('common.done')}` : `${completedCount}/${medicationCount}`}
        </div>
      )}
    </div>
  );
}