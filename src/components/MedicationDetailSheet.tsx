import { Medication } from '@/types/medication';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { DoseClockWidget } from './DoseClockWidget';
import { 
  Pill, 
  AlertTriangle, 
  Info, 
  Phone, 
  PlayCircle, 
  RefreshCw,
  Heart,
  AlertCircle,
  BookOpen
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface MedicationDetailSheetProps {
  medication: Medication | null;
  open: boolean;
  onClose: () => void;
}

const formIcons: Record<string, string> = {
  pill: '💊',
  capsule: '💊',
  liquid: '🧴',
  injection: '💉',
  patch: '🩹',
  inhaler: '🌬️',
  drops: '💧',
};

export function MedicationDetailSheet({ medication, open, onClose }: MedicationDetailSheetProps) {
  if (!medication) return null;

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-[90vh] overflow-y-auto rounded-t-3xl">
        <SheetHeader className="pb-4 border-b border-border">
          <div className="flex items-center gap-4">
            <div className="text-5xl">{formIcons[medication.form] || '💊'}</div>
            <div>
              <SheetTitle className="text-elder-xl text-left">{medication.name}</SheetTitle>
              {medication.genericName && (
                <p className="text-muted-foreground text-lg">{medication.genericName}</p>
              )}
              <p className="text-primary font-semibold text-xl">{medication.strength}</p>
            </div>
          </div>
        </SheetHeader>

        <div className="py-6 space-y-6">
          {/* 24-Hour Clock */}
          <DoseClockWidget medication={medication} />

          {/* What it's for */}
          <section className="bg-primary/5 rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <Heart className="w-6 h-6 text-primary" />
              <h3 className="text-elder-lg text-foreground">What It's For</h3>
            </div>
            <p className="text-elder text-foreground">{medication.purpose}</p>
          </section>

          {/* How it works */}
          <section className="bg-card rounded-2xl p-5 border border-border shadow-soft">
            <div className="flex items-center gap-3 mb-3">
              <Info className="w-6 h-6 text-primary" />
              <h3 className="text-elder-lg text-foreground">How It Works</h3>
            </div>
            <p className="text-elder text-muted-foreground">{medication.howItWorks}</p>
            <Button variant="link" className="mt-2 p-0 h-auto text-primary">
              <BookOpen className="w-5 h-5 mr-2" />
              Learn More
            </Button>
          </section>

          {/* How to take it */}
          <section className="bg-secondary rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <Pill className="w-6 h-6 text-secondary-foreground" />
              <h3 className="text-elder-lg text-foreground">How to Take It</h3>
            </div>
            <p className="text-elder text-foreground">{medication.instructions}</p>
          </section>

          {/* Important Warnings */}
          {medication.importantWarnings.length > 0 && (
            <section className="bg-destructive/10 rounded-2xl p-5 border-2 border-destructive/30">
              <div className="flex items-center gap-3 mb-3">
                <AlertCircle className="w-6 h-6 text-destructive" />
                <h3 className="text-elder-lg text-destructive">Important Warnings</h3>
              </div>
              <ul className="space-y-2">
                {medication.importantWarnings.map((warning, index) => (
                  <li key={index} className="flex items-start gap-3 text-elder text-foreground">
                    <span className="text-destructive">⚠️</span>
                    {warning}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Possible Side Effects */}
          <section className="bg-warning/10 rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <AlertTriangle className="w-6 h-6 text-warning" />
              <h3 className="text-elder-lg text-foreground">Possible Side Effects</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {medication.sideEffects.map((effect, index) => (
                <span 
                  key={index} 
                  className="bg-card px-4 py-2 rounded-full text-foreground border border-border"
                >
                  {effect}
                </span>
              ))}
            </div>
          </section>

          {/* Refill Info */}
          {medication.refillDate && (
            <section className="bg-muted rounded-2xl p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <RefreshCw className="w-6 h-6 text-muted-foreground" />
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">Refill Reminder</h3>
                    <p className="text-muted-foreground">Next refill: {medication.refillDate}</p>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Action Buttons */}
          <div className="space-y-3 pt-4">
            <Button variant="outline" size="xl" className="w-full justify-start gap-4">
              <PlayCircle className="w-7 h-7" />
              Watch Educational Videos
            </Button>
            
            <Button variant="accent" size="xl" className="w-full justify-start gap-4">
              <Phone className="w-7 h-7" />
              Call Your Pharmacist
            </Button>
          </div>

          {/* Prescriber Info */}
          {(medication.prescriber || medication.pharmacy) && (
            <section className="bg-muted/50 rounded-2xl p-5 mt-4">
              <div className="space-y-2 text-muted-foreground">
                {medication.prescriber && (
                  <p><span className="font-medium">Prescribed by:</span> {medication.prescriber}</p>
                )}
                {medication.pharmacy && (
                  <p><span className="font-medium">Pharmacy:</span> {medication.pharmacy}</p>
                )}
              </div>
            </section>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
