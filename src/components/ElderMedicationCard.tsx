import { Button } from '@/components/ui/button';
import { Check, Clock, X, ChevronRight, Volume2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'bedtime';
type DoseStatus = 'pending' | 'taken' | 'skipped' | 'snoozed' | 'missed';

interface MedicationDose {
  id: string;
  time: string;
  timeOfDay: TimeOfDay;
  status: DoseStatus;
  takenAt?: string;
  snoozeUntil?: string;
}

interface Medication {
  id: string;
  name: string;
  genericName?: string;
  strength: string;
  form: string;
  purpose?: string;
}

interface ElderMedicationCardProps {
  medication: Medication;
  dose: MedicationDose;
  onTake: () => void;
  onSkip: () => void;
  onSnooze: () => void;
  onViewDetails: () => void;
  onVoiceRead?: () => void;
}

const formEmojis: Record<string, string> = {
  pill: '💊',
  capsule: '💊',
  liquid: '🧴',
  injection: '💉',
  patch: '🩹',
  inhaler: '🌬️',
  drops: '💧',
  cream: '🧴',
  other: '💊',
};

const timeOfDayStyles = {
  morning: 'bg-morning-gradient border-morning/40',
  afternoon: 'bg-afternoon-gradient border-afternoon/40',
  evening: 'bg-evening-gradient border-evening/40',
  bedtime: 'bg-bedtime-gradient border-bedtime/40',
};

export function ElderMedicationCard({ 
  medication, 
  dose, 
  onTake, 
  onSkip, 
  onSnooze, 
  onViewDetails,
  onVoiceRead 
}: ElderMedicationCardProps) {
  const isPending = dose.status === 'pending' || dose.status === 'snoozed';
  const isTaken = dose.status === 'taken';
  const isSkipped = dose.status === 'skipped';
  const isMissed = dose.status === 'missed';

  return (
    <div 
      className={cn(
        "rounded-3xl border-4 p-6 transition-all duration-300 shadow-elder-lg",
        timeOfDayStyles[dose.timeOfDay],
        isTaken && "opacity-70 border-success/50",
        isMissed && "border-destructive/50",
        isPending && "animate-urgent-pulse"
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div className="flex items-center gap-4">
          <div className="text-5xl">{formEmojis[medication.form] || '💊'}</div>
          <div>
            <h3 className="text-elder-xl text-foreground">{medication.name}</h3>
            <p className="text-elder text-muted-foreground">{medication.strength}</p>
          </div>
        </div>
        
        <div className="flex gap-2">
          {onVoiceRead && (
            <button
              onClick={onVoiceRead}
              className="p-3 rounded-xl bg-info/20 text-info hover:bg-info/30 transition-colors"
              aria-label="Read aloud"
            >
              <Volume2 className="w-7 h-7" />
            </button>
          )}
          <button
            onClick={onViewDetails}
            className="flex items-center gap-1 p-3 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
            aria-label={`View details for ${medication.name}`}
          >
            <span className="text-lg font-semibold hidden sm:inline">Details</span>
            <ChevronRight className="w-7 h-7" />
          </button>
        </div>
      </div>

      {/* Time */}
      <div className="flex items-center gap-3 mb-5 text-muted-foreground bg-card/50 rounded-xl p-3">
        <Clock className="w-7 h-7" />
        <span className="text-elder-lg">{dose.time}</span>
        {dose.snoozeUntil && (
          <span className="text-warning font-bold ml-auto">
            ⏰ Snoozed until {dose.snoozeUntil}
          </span>
        )}
      </div>

      {/* Status / Actions */}
      {isTaken ? (
        <div className="flex items-center gap-4 bg-success/15 rounded-2xl p-5 border-2 border-success/30">
          <div className="w-14 h-14 rounded-full bg-success flex items-center justify-center animate-check-pop shadow-success">
            <Check className="w-8 h-8 text-success-foreground" />
          </div>
          <div>
            <p className="text-success font-bold text-elder-lg">Taken ✓</p>
            {dose.takenAt && <p className="text-muted-foreground text-lg">at {dose.takenAt}</p>}
          </div>
        </div>
      ) : isSkipped ? (
        <div className="flex items-center gap-4 bg-muted rounded-2xl p-5 border-2 border-border">
          <div className="w-14 h-14 rounded-full bg-muted-foreground/20 flex items-center justify-center">
            <X className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground font-bold text-elder-lg">Skipped</p>
        </div>
      ) : isMissed ? (
        <div className="flex items-center gap-4 bg-destructive/15 rounded-2xl p-5 border-2 border-destructive/30">
          <div className="w-14 h-14 rounded-full bg-destructive flex items-center justify-center">
            <X className="w-8 h-8 text-destructive-foreground" />
          </div>
          <p className="text-destructive font-bold text-elder-lg">Missed</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          <Button 
            variant="take" 
            onClick={onTake}
            className="flex-1 flex-col py-6 h-auto"
          >
            <Check className="w-10 h-10 mb-1" />
            <span>Take</span>
          </Button>
          <Button 
            variant="snooze" 
            onClick={onSnooze}
            className="flex-1 flex-col py-6 h-auto"
          >
            <Clock className="w-10 h-10 mb-1" />
            <span>10 min</span>
          </Button>
          <Button 
            variant="skip" 
            onClick={onSkip}
            className="flex-1 flex-col py-6 h-auto"
          >
            <X className="w-10 h-10 mb-1" />
            <span>Skip</span>
          </Button>
        </div>
      )}
    </div>
  );
}
