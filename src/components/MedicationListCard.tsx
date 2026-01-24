import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Pencil, Trash2, ChevronRight, Calendar, User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MedicationListCardProps {
  medication: {
    id: string;
    name: string;
    genericName?: string;
    strength: string;
    form: string;
    purpose?: string;
    refillDate?: string;
    prescriber?: string;
  };
  scheduleCount: number;
  onEdit: () => void;
  onDelete: () => void;
  onViewDetails: () => void;
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

export function MedicationListCard({
  medication,
  scheduleCount,
  onEdit,
  onDelete,
  onViewDetails,
}: MedicationListCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleDelete = () => {
    setShowDeleteDialog(false);
    onDelete();
  };

  const refillSoon = medication.refillDate 
    ? new Date(medication.refillDate) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    : false;

  return (
    <>
      <div className="bg-card rounded-3xl border-2 border-border p-5 shadow-elder transition-all hover:shadow-elder-lg">
        {/* Main Card Content - Clickable */}
        <button
          onClick={onViewDetails}
          className="w-full text-left focus:outline-none"
        >
          <div className="flex items-start gap-4">
            {/* Medication Icon */}
            <div className="text-4xl flex-shrink-0">
              {formEmojis[medication.form] || '💊'}
            </div>

            {/* Medication Info */}
            <div className="flex-1 min-w-0">
              <h3 className="text-elder-lg text-foreground truncate">
                {medication.name}
              </h3>
              {medication.genericName && (
                <p className="text-muted-foreground text-sm truncate">
                  {medication.genericName}
                </p>
              )}
              <p className="text-primary font-semibold text-lg mt-1">
                {medication.strength}
              </p>

              {/* Purpose */}
              {medication.purpose && (
                <p className="text-muted-foreground text-sm mt-2 line-clamp-2">
                  {medication.purpose}
                </p>
              )}

              {/* Meta Info */}
              <div className="flex flex-wrap gap-3 mt-3">
                {scheduleCount > 0 && (
                  <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground bg-secondary rounded-full px-3 py-1">
                    <span className="font-medium text-foreground">{scheduleCount}x</span>
                    daily
                  </span>
                )}

                {medication.prescriber && (
                  <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                    <User className="w-3.5 h-3.5" />
                    Dr. {medication.prescriber.replace(/^Dr\.?\s*/i, '')}
                  </span>
                )}

                {medication.refillDate && (
                  <span className={cn(
                    "inline-flex items-center gap-1.5 text-sm rounded-full px-3 py-1",
                    refillSoon 
                      ? "bg-warning/20 text-warning" 
                      : "text-muted-foreground"
                  )}>
                    <Calendar className="w-3.5 h-3.5" />
                    Refill: {new Date(medication.refillDate).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                )}
              </div>
            </div>

            {/* Chevron */}
            <ChevronRight className="w-6 h-6 text-muted-foreground flex-shrink-0 mt-2" />
          </div>
        </button>

        {/* Action Buttons */}
        <div className="flex gap-3 mt-5 pt-5 border-t border-border">
          <Button
            variant="outline"
            size="lg"
            className="flex-1 h-14 text-lg rounded-xl gap-2"
            onClick={onEdit}
          >
            <Pencil className="w-5 h-5" />
            Edit
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="flex-1 h-14 text-lg rounded-xl gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/30"
            onClick={() => setShowDeleteDialog(true)}
          >
            <Trash2 className="w-5 h-5" />
            Delete
          </Button>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="rounded-3xl max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-elder-xl text-center">
              Delete {medication.name}?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-elder text-center">
              This will remove the medication and all its scheduled doses. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-3 sm:flex-col">
            <AlertDialogCancel className="h-14 text-lg rounded-xl w-full">
              Keep Medication
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="h-14 text-lg rounded-xl w-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Yes, Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
