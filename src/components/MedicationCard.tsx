import { Medication, Dose, DoseStatus } from '@/types/medication';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Clock, X, ChevronRight, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MedicationCardProps {
  medication: Medication;
  dose: Dose;
  onTake: (medicationId: string, doseId: string) => void;
  onSkip: (medicationId: string, doseId: string) => void;
  onSnooze: (medicationId: string, doseId: string) => void;
  onViewDetails: (medication: Medication) => void;
}

const timeOfDayStyles = {
  morning: 'bg-morning-gradient border-morning/30',
  afternoon: 'bg-afternoon-gradient border-afternoon/30',
  evening: 'bg-evening-gradient border-evening/30',
  bedtime: 'bg-bedtime-gradient border-bedtime/30',
};

const formIcons: Record<string, string> = {
  pill: '💊',
  capsule: '💊',
  liquid: '🧴',
  injection: '💉',
  patch: '🩹',
  inhaler: '🌬️',
  drops: '💧',
};

export function MedicationCard({ 
  medication, 
  dose, 
  onTake, 
  onSkip, 
  onSnooze, 
  onViewDetails 
}: MedicationCardProps) {
  const isPending = dose.status === 'pending' || dose.status === 'snoozed';
  const isTaken = dose.status === 'taken';
  const isSkipped = dose.status === 'skipped';
  const isLowStock = medication.quantityRemaining !== undefined && medication.quantityRemaining <= 7;

  return (
    <div 
      className={cn(
        "rounded-2xl border-2 p-5 transition-all duration-300 shadow-soft",
        timeOfDayStyles[dose.timeOfDay],
        isTaken && "opacity-70",
        isPending && "animate-gentle-pulse"
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="text-3xl">{formIcons[medication.form] || '💊'}</div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-elder-lg text-foreground">{medication.name}</h3>
              {isLowStock && (
                <Badge variant="destructive" className="flex items-center gap-1 text-xs">
                  <AlertTriangle className="w-3 h-3" />
                  Low Stock
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground">{medication.strength}</p>
          </div>
        </div>
        <button
          onClick={() => onViewDetails(medication)}
          className="flex items-center gap-1 text-primary hover:text-primary/80 transition-colors p-2"
          aria-label={`View details for ${medication.name}`}
        >
          <span className="text-base font-medium">Info</span>
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Time */}
      <div className="flex items-center gap-2 mb-4 text-muted-foreground">
        <Clock className="w-5 h-5" />
        <span className="text-lg">{dose.time}</span>
        {dose.snoozeUntil && (
          <span className="text-warning font-medium">• Snoozed until {dose.snoozeUntil}</span>
        )}
      </div>

      {/* Status / Actions */}
      {isTaken ? (
        <div className="flex items-center gap-3 bg-success/10 rounded-xl p-4">
          <div className="w-10 h-10 rounded-full bg-success flex items-center justify-center animate-check-pop">
            <Check className="w-6 h-6 text-success-foreground" />
          </div>
          <div>
            <p className="text-success font-semibold text-lg">Taken</p>
            {dose.takenAt && <p className="text-muted-foreground">at {dose.takenAt}</p>}
          </div>
        </div>
      ) : isSkipped ? (
        <div className="flex items-center gap-3 bg-muted rounded-xl p-4">
          <div className="w-10 h-10 rounded-full bg-muted-foreground/20 flex items-center justify-center">
            <X className="w-6 h-6 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground font-medium text-lg">Skipped</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          <Button 
            variant="take" 
            size="lg"
            onClick={() => onTake(medication.id, dose.id)}
            className="flex-1"
          >
            <Check className="w-6 h-6" />
            Take
          </Button>
          <Button 
            variant="snooze" 
            size="lg"
            onClick={() => onSnooze(medication.id, dose.id)}
            className="flex-1"
          >
            <Clock className="w-6 h-6" />
            Snooze
          </Button>
          <Button 
            variant="skip" 
            size="lg"
            onClick={() => onSkip(medication.id, dose.id)}
            className="flex-1"
          >
            <X className="w-6 h-6" />
            Skip
          </Button>
        </div>
      )}
    </div>
  );
}
