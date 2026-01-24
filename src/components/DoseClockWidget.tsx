import { Medication, Dose } from '@/types/medication';
import { cn } from '@/lib/utils';

interface DoseClockWidgetProps {
  medication: Medication;
}

export function DoseClockWidget({ medication }: DoseClockWidgetProps) {
  // Create 24-hour slots
  const hours = Array.from({ length: 24 }, (_, i) => i);
  
  // Get dose times as hours
  const doseHours = medication.doses.map(dose => ({
    hour: parseInt(dose.time.split(':')[0]),
    status: dose.status,
  }));

  return (
    <div className="bg-card rounded-2xl p-6 shadow-soft border border-border">
      <h3 className="text-lg font-semibold text-foreground mb-4">24-Hour Schedule</h3>
      
      <div className="relative">
        {/* Clock face */}
        <div className="grid grid-cols-12 gap-1">
          {hours.map((hour) => {
            const dose = doseHours.find(d => d.hour === hour);
            const isCurrentHour = new Date().getHours() === hour;
            
            return (
              <div
                key={hour}
                className={cn(
                  "aspect-square rounded-full flex items-center justify-center text-xs font-medium transition-all",
                  dose?.status === 'taken' && "bg-success text-success-foreground",
                  dose?.status === 'pending' && "bg-accent text-accent-foreground animate-gentle-pulse",
                  dose?.status === 'skipped' && "bg-muted text-muted-foreground",
                  dose?.status === 'snoozed' && "bg-warning text-warning-foreground",
                  !dose && "bg-muted/50 text-muted-foreground/50",
                  isCurrentHour && !dose && "ring-2 ring-primary"
                )}
                title={`${hour}:00${dose ? ` - ${dose.status}` : ''}`}
              >
                {dose ? (dose.status === 'taken' ? '✓' : '•') : ''}
              </div>
            );
          })}
        </div>

        {/* Time labels */}
        <div className="flex justify-between mt-2 text-xs text-muted-foreground">
          <span>12 AM</span>
          <span>6 AM</span>
          <span>12 PM</span>
          <span>6 PM</span>
          <span>12 AM</span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mt-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-success" />
          <span className="text-muted-foreground">Taken</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-accent" />
          <span className="text-muted-foreground">Pending</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-warning" />
          <span className="text-muted-foreground">Snoozed</span>
        </div>
      </div>
    </div>
  );
}
