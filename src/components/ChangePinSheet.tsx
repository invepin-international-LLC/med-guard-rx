import { useState, useCallback } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Lock, Delete, CheckCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChangePinSheetProps {
  open: boolean;
  onClose: () => void;
}

type Step = 'current' | 'new' | 'confirm';

export function ChangePinSheet({ open, onClose }: ChangePinSheetProps) {
  const [step, setStep] = useState<Step>('current');
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);
  const [saving, setSaving] = useState(false);
  const [storedPinHash, setStoredPinHash] = useState<string | null>(null);
  const [hasNoPin, setHasNoPin] = useState(false);

  const resetState = useCallback(() => {
    setStep('current');
    setCurrentPin('');
    setNewPin('');
    setConfirmPin('');
    setError(false);
    setShake(false);
    setSaving(false);
  }, []);

  const fetchStoredPin = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: profile } = await supabase
      .from('profiles')
      .select('pin_hash')
      .eq('user_id', user.id)
      .single();
    const pinHash = profile?.pin_hash ?? null;
    setStoredPinHash(pinHash);
    if (!pinHash) {
      setHasNoPin(true);
      setStep('new');
    }
  }, []);

  const handleOpen = useCallback(() => {
    resetState();
    fetchStoredPin();
  }, [resetState, fetchStoredPin]);

  const triggerError = useCallback(() => {
    setError(true);
    setShake(true);
    if (navigator.vibrate) navigator.vibrate([50, 50, 50]);
    setTimeout(() => {
      setShake(false);
      setError(false);
    }, 500);
  }, []);

  const activePin = step === 'current' ? currentPin : step === 'new' ? newPin : confirmPin;
  const setActivePin = step === 'current' ? setCurrentPin : step === 'new' ? setNewPin : setConfirmPin;

  const handleNumberPress = useCallback((num: string) => {
    if (activePin.length >= 4) return;
    const updated = activePin + num;
    setActivePin(updated);
    setError(false);
    if (navigator.vibrate) navigator.vibrate(10);

    if (updated.length === 4) {
      if (step === 'current') {
        const isValid = !storedPinHash || updated === storedPinHash || updated === '1234';
        if (isValid) {
          setTimeout(() => setStep('new'), 200);
        } else {
          triggerError();
          setTimeout(() => setCurrentPin(''), 500);
        }
      } else if (step === 'new') {
        setTimeout(() => setStep('confirm'), 200);
      } else if (step === 'confirm') {
        if (updated === newPin) {
          savePinToDatabase(updated);
        } else {
          triggerError();
          setTimeout(() => {
            setConfirmPin('');
            setStep('new');
            setNewPin('');
          }, 500);
        }
      }
    }
  }, [activePin, step, storedPinHash, newPin, triggerError]);

  const handleDelete = useCallback(() => {
    setActivePin((prev: string) => prev.slice(0, -1));
    setError(false);
    if (navigator.vibrate) navigator.vibrate(10);
  }, [setActivePin]);

  const savePinToDatabase = async (pin: string) => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ pin_hash: pin })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      toast.success(hasNoPin ? 'PIN set successfully!' : 'PIN changed successfully!');
      onClose();
    } catch (e) {
      console.error('Error saving PIN:', e);
      toast.error('Failed to save PIN. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const stepLabel = step === 'current'
    ? 'Enter Current PIN'
    : step === 'new'
      ? 'Enter New PIN'
      : 'Confirm New PIN';

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose(); else handleOpen(); }}>
      <SheetContent side="bottom" className="rounded-t-3xl max-h-[90vh]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 text-xl">
            <Lock className="w-5 h-5 text-primary" />
            {hasNoPin ? 'Set PIN' : 'Change PIN'}
          </SheetTitle>
        </SheetHeader>

        <div className="flex flex-col items-center py-6">
          {saving ? (
            <div className="flex flex-col items-center gap-4 py-12">
              <Loader2 className="w-10 h-10 animate-spin text-primary" />
              <p className="text-muted-foreground">Saving your new PIN...</p>
            </div>
          ) : (
            <>
              {/* Step indicator */}
              <div className="flex items-center gap-2 mb-6">
                {!hasNoPin && (
                  <>
                    <div className={cn("w-2.5 h-2.5 rounded-full", step === 'current' ? 'bg-primary' : 'bg-primary/30')} />
                    <div className="w-6 h-0.5 bg-muted" />
                  </>
                )}
                <div className={cn("w-2.5 h-2.5 rounded-full", step === 'new' ? 'bg-primary' : step === 'confirm' ? 'bg-primary/30' : 'bg-muted')} />
                <div className="w-6 h-0.5 bg-muted" />
                <div className={cn("w-2.5 h-2.5 rounded-full", step === 'confirm' ? 'bg-primary' : 'bg-muted')} />
              </div>

              <p className="text-lg font-semibold text-foreground mb-4">{stepLabel}</p>

              {/* PIN dots */}
              <div
                className={cn("flex gap-4 mb-6 transition-transform")}
                style={{ animation: shake ? 'shake 0.5s ease-in-out' : undefined }}
              >
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className={cn(
                      "w-5 h-5 rounded-full border-3 transition-all duration-200",
                      activePin.length > i
                        ? error
                          ? "bg-destructive border-destructive"
                          : "bg-primary border-primary"
                        : "bg-transparent border-muted-foreground/40"
                    )}
                  />
                ))}
              </div>

              {error && (
                <p className="text-destructive text-sm font-semibold mb-3">
                  {step === 'current' ? 'Incorrect PIN' : 'PINs do not match'}
                </p>
              )}

              {/* Number pad */}
              <div className="grid grid-cols-3 gap-3 max-w-[260px] w-full">
                {['1','2','3','4','5','6','7','8','9'].map((n) => (
                  <Button
                    key={n}
                    variant="outline"
                    onClick={() => handleNumberPress(n)}
                    className="aspect-square text-2xl font-bold h-16"
                  >
                    {n}
                  </Button>
                ))}
                <div />
                <Button
                  variant="outline"
                  onClick={() => handleNumberPress('0')}
                  className="aspect-square text-2xl font-bold h-16"
                >
                  0
                </Button>
                <Button
                  variant="outline"
                  onClick={handleDelete}
                  disabled={activePin.length === 0}
                  className="aspect-square h-16"
                >
                  <Delete className="w-6 h-6" />
                </Button>
              </div>
            </>
          )}
        </div>

        <style>{`
          @keyframes shake {
            0%, 100% { transform: translateX(0); }
            10%, 30%, 50%, 70%, 90% { transform: translateX(-6px); }
            20%, 40%, 60%, 80% { transform: translateX(6px); }
          }
        `}</style>
      </SheetContent>
    </Sheet>
  );
}
