import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Delete, Fingerprint } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PinEntryProps {
  onSuccess: () => void;
  correctPin?: string;
  userName?: string;
  onBiometricRequest?: () => void;
  biometricAvailable?: boolean;
}

export function PinEntry({ 
  onSuccess, 
  correctPin = '1234', 
  userName = 'User',
  onBiometricRequest,
  biometricAvailable = true
}: PinEntryProps) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);

  const handleNumberPress = useCallback((num: string) => {
    if (pin.length >= 4) return;
    
    const newPin = pin + num;
    setPin(newPin);
    setError(false);

    // Vibrate for haptic feedback if available
    if (navigator.vibrate) {
      navigator.vibrate(10);
    }

    // Check PIN when 4 digits entered
    if (newPin.length === 4) {
      if (newPin === correctPin) {
        setTimeout(() => {
          onSuccess();
        }, 200);
      } else {
        setError(true);
        setShake(true);
        if (navigator.vibrate) {
          navigator.vibrate([50, 50, 50]);
        }
        setTimeout(() => {
          setPin('');
          setShake(false);
        }, 500);
      }
    }
  }, [pin, correctPin, onSuccess]);

  const handleDelete = useCallback(() => {
    setPin(prev => prev.slice(0, -1));
    setError(false);
    if (navigator.vibrate) {
      navigator.vibrate(10);
    }
  }, []);

  const handleBiometric = useCallback(() => {
    if (onBiometricRequest) {
      onBiometricRequest();
    } else {
      // Simulate biometric success
      onSuccess();
    }
  }, [onBiometricRequest, onSuccess]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      {/* Welcome */}
      <div className="text-center mb-12">
        <div className="w-24 h-24 bg-accent rounded-full flex items-center justify-center mx-auto mb-6 shadow-accent">
          <span className="text-5xl">💊</span>
        </div>
        <h1 className="text-elder-2xl text-foreground mb-2">Welcome Back</h1>
        <p className="text-elder text-muted-foreground">{userName}</p>
      </div>

      {/* PIN Dots */}
      <div 
        className={cn(
          "flex gap-4 mb-8 transition-transform",
          shake && "animate-[shake_0.5s_ease-in-out]"
        )}
        style={{
          animation: shake ? 'shake 0.5s ease-in-out' : undefined
        }}
      >
        {[0, 1, 2, 3].map((index) => (
          <div
            key={index}
            className={cn(
              "w-6 h-6 rounded-full border-4 transition-all duration-200",
              pin.length > index 
                ? error 
                  ? "bg-destructive border-destructive" 
                  : "bg-primary border-primary animate-number-pop"
                : "bg-transparent border-muted-foreground/50"
            )}
          />
        ))}
      </div>

      {/* Error message */}
      {error && (
        <p className="text-destructive text-elder font-semibold mb-4 animate-fade-in">
          Incorrect PIN. Try again.
        </p>
      )}

      {/* PIN Pad */}
      <div className="grid grid-cols-3 gap-4 max-w-sm w-full">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
          <Button
            key={num}
            variant="pin"
            onClick={() => handleNumberPress(num)}
            className="aspect-square text-pin"
          >
            {num}
          </Button>
        ))}
        
        {/* Biometric */}
        <Button
          variant="pin"
          onClick={handleBiometric}
          disabled={!biometricAvailable}
          className="aspect-square"
        >
          <Fingerprint className="w-10 h-10" />
        </Button>
        
        {/* 0 */}
        <Button
          variant="pin"
          onClick={() => handleNumberPress('0')}
          className="aspect-square text-pin"
        >
          0
        </Button>
        
        {/* Delete */}
        <Button
          variant="pin"
          onClick={handleDelete}
          disabled={pin.length === 0}
          className="aspect-square"
        >
          <Delete className="w-10 h-10" />
        </Button>
      </div>

      {/* Alternative login */}
      <p className="mt-8 text-muted-foreground text-lg">
        {biometricAvailable ? 'Use Face ID or enter PIN' : 'Enter your 4-digit PIN'}
      </p>

      {/* Shake animation keyframes */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-8px); }
          20%, 40%, 60%, 80% { transform: translateX(8px); }
        }
      `}</style>
    </div>
  );
}
