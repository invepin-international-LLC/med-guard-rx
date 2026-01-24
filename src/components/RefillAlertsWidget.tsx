import { RefreshCw, AlertTriangle, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface RefillAlertMedication {
  id: string;
  name: string;
  strength: string;
  refillDate?: string;
  quantityRemaining?: number;
  daysUntilRefill?: number;
}

interface RefillAlertsWidgetProps {
  medications: RefillAlertMedication[];
  onViewMedication?: (id: string) => void;
  onCallPharmacy?: () => void;
}

export function RefillAlertsWidget({ medications, onViewMedication, onCallPharmacy }: RefillAlertsWidgetProps) {
  // Filter to only medications that need refills
  const needsRefill = medications.filter(med => {
    const hasLowQuantity = med.quantityRemaining !== undefined && med.quantityRemaining <= 7;
    const hasUpcomingRefill = med.daysUntilRefill !== undefined && med.daysUntilRefill <= 7;
    return hasLowQuantity || hasUpcomingRefill;
  });

  if (needsRefill.length === 0) {
    return null;
  }

  // Sort by urgency (urgent first)
  const sortedMeds = [...needsRefill].sort((a, b) => {
    const aUrgent = (a.daysUntilRefill !== undefined && a.daysUntilRefill <= 3) || 
                    (a.quantityRemaining !== undefined && a.quantityRemaining <= 3);
    const bUrgent = (b.daysUntilRefill !== undefined && b.daysUntilRefill <= 3) || 
                    (b.quantityRemaining !== undefined && b.quantityRemaining <= 3);
    if (aUrgent && !bUrgent) return -1;
    if (!aUrgent && bUrgent) return 1;
    return (a.daysUntilRefill || 999) - (b.daysUntilRefill || 999);
  });

  const urgentCount = sortedMeds.filter(m => 
    (m.daysUntilRefill !== undefined && m.daysUntilRefill <= 3) || 
    (m.quantityRemaining !== undefined && m.quantityRemaining <= 3)
  ).length;

  return (
    <div className={cn(
      "rounded-3xl p-5 border-2 shadow-elder",
      urgentCount > 0 
        ? "bg-destructive/10 border-destructive/40" 
        : "bg-warning/10 border-warning/40"
    )}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        {urgentCount > 0 ? (
          <AlertTriangle className="w-8 h-8 text-destructive" />
        ) : (
          <RefreshCw className="w-8 h-8 text-warning" />
        )}
        <div>
          <h3 className="text-elder-lg text-foreground">
            {urgentCount > 0 ? 'Urgent Refills Needed' : 'Refill Reminders'}
          </h3>
          <p className="text-muted-foreground">
            {sortedMeds.length} medication{sortedMeds.length > 1 ? 's' : ''} need{sortedMeds.length === 1 ? 's' : ''} refilling
          </p>
        </div>
      </div>

      {/* Medication List */}
      <div className="space-y-3">
        {sortedMeds.slice(0, 3).map(med => {
          const isUrgent = (med.daysUntilRefill !== undefined && med.daysUntilRefill <= 3) || 
                          (med.quantityRemaining !== undefined && med.quantityRemaining <= 3);
          
          return (
            <button
              key={med.id}
              onClick={() => onViewMedication?.(med.id)}
              className={cn(
                "w-full flex items-center gap-3 p-4 rounded-2xl transition-all text-left",
                isUrgent 
                  ? "bg-destructive/20 hover:bg-destructive/30" 
                  : "bg-card hover:bg-secondary"
              )}
            >
              <div className="text-2xl">💊</div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground truncate">{med.name}</p>
                <p className="text-sm text-muted-foreground">{med.strength}</p>
              </div>
              <div className="text-right flex-shrink-0">
                {med.quantityRemaining !== undefined && med.quantityRemaining <= 7 && (
                  <div className="flex items-center gap-1.5 mb-1">
                    <Package className="w-4 h-4 text-muted-foreground" />
                    <span className={cn(
                      "text-sm font-medium",
                      med.quantityRemaining <= 3 ? "text-destructive" : "text-warning"
                    )}>
                      {med.quantityRemaining} left
                    </span>
                  </div>
                )}
                {med.daysUntilRefill !== undefined && med.daysUntilRefill <= 7 && (
                  <span className={cn(
                    "text-sm font-medium",
                    med.daysUntilRefill <= 3 ? "text-destructive" : "text-warning"
                  )}>
                    {med.daysUntilRefill === 0 
                      ? 'Due today' 
                      : med.daysUntilRefill === 1 
                        ? 'Due tomorrow'
                        : `${med.daysUntilRefill} days`}
                  </span>
                )}
              </div>
            </button>
          );
        })}

        {sortedMeds.length > 3 && (
          <p className="text-center text-muted-foreground text-sm py-2">
            +{sortedMeds.length - 3} more medication{sortedMeds.length - 3 > 1 ? 's' : ''}
          </p>
        )}
      </div>

      {/* Action Button */}
      {onCallPharmacy && (
        <Button
          variant={urgentCount > 0 ? "destructive" : "accent"}
          size="lg"
          className="w-full mt-4 h-14 text-lg rounded-xl"
          onClick={onCallPharmacy}
        >
          📞 Call Pharmacy for Refills
        </Button>
      )}
    </div>
  );
}
