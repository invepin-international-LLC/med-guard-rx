import { Medication, Dose, TimeOfDay } from '@/types/medication';
import { MedicationCard } from './MedicationCard';
import { Sun, CloudSun, Sunset, Moon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

interface TimeOfDaySectionProps {
  timeOfDay: TimeOfDay;
  medications: { medication: Medication; dose: Dose }[];
  onTake: (medicationId: string, doseId: string) => void;
  onSkip: (medicationId: string, doseId: string) => void;
  onSnooze: (medicationId: string, doseId: string) => void;
  onViewDetails: (medication: Medication) => void;
}

const timeConfig = {
  morning: {
    icon: Sun,
    labelKey: 'timeOfDay.morning',
    rangeKey: 'timeOfDay.morningRange',
    bgClass: 'bg-morning/10',
    textClass: 'text-morning',
    borderClass: 'border-morning/30',
  },
  afternoon: {
    icon: CloudSun,
    labelKey: 'timeOfDay.afternoon',
    rangeKey: 'timeOfDay.afternoonRange',
    bgClass: 'bg-afternoon/10',
    textClass: 'text-afternoon',
    borderClass: 'border-afternoon/30',
  },
  evening: {
    icon: Sunset,
    labelKey: 'timeOfDay.evening',
    rangeKey: 'timeOfDay.eveningRange',
    bgClass: 'bg-evening/10',
    textClass: 'text-evening',
    borderClass: 'border-evening/30',
  },
  bedtime: {
    icon: Moon,
    labelKey: 'timeOfDay.bedtime',
    rangeKey: 'timeOfDay.bedtimeRange',
    bgClass: 'bg-bedtime/10',
    textClass: 'text-bedtime',
    borderClass: 'border-bedtime/30',
  },
};

export function TimeOfDaySection({ 
  timeOfDay, 
  medications, 
  onTake, 
  onSkip, 
  onSnooze,
  onViewDetails 
}: TimeOfDaySectionProps) {
  const { t } = useTranslation();
  const config = timeConfig[timeOfDay];
  const Icon = config.icon;

  if (medications.length === 0) {
    return null;
  }

  const allTaken = medications.every(m => m.dose.status === 'taken' || m.dose.status === 'skipped');

  return (
    <section className="mb-8">
      {/* Section Header */}
      <div className={cn(
        "flex items-center gap-3 mb-4 p-4 rounded-xl border-2",
        config.bgClass,
        config.borderClass,
        allTaken && "opacity-60"
      )}>
        <div className={cn(
          "w-12 h-12 rounded-full flex items-center justify-center",
          config.bgClass
        )}>
          <Icon className={cn("w-7 h-7", config.textClass)} />
        </div>
        <div>
          <h2 className="text-elder-lg text-foreground">{t(config.labelKey)}</h2>
          <p className="text-muted-foreground">{t(config.rangeKey)}</p>
        </div>
        {allTaken && (
          <div className="ml-auto bg-success/20 text-success px-4 py-2 rounded-full font-semibold">
            ✓ {t('common.complete')}
          </div>
        )}
      </div>

      {/* Medication Cards */}
      <div className="space-y-4 pl-4">
        {medications.map(({ medication, dose }) => (
          <MedicationCard
            key={`${medication.id}-${dose.id}`}
            medication={medication}
            dose={dose}
            onTake={onTake}
            onSkip={onSkip}
            onSnooze={onSnooze}
            onViewDetails={onViewDetails}
          />
        ))}
      </div>
    </section>
  );
}