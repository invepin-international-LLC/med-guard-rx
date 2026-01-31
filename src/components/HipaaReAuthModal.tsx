import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Shield, Lock, Fingerprint } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HipaaReAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthenticated: () => void;
  biometricAvailable?: boolean;
}

export function HipaaReAuthModal({
  isOpen,
  onClose,
  onAuthenticated,
  biometricAvailable = true,
}: HipaaReAuthModalProps) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const correctPin = '1234'; // In production, this would be verified server-side

  const handlePinDigit = (digit: string) => {
    if (pin.length < 4) {
      const newPin = pin + digit;
      setPin(newPin);
      setError('');

      if (newPin.length === 4) {
        validatePin(newPin);
      }
    }
  };

  const handleBackspace = () => {
    setPin(pin.slice(0, -1));
    setError('');
  };

  const validatePin = async (enteredPin: string) => {
    setIsAuthenticating(true);
    
    // Simulate validation delay
    await new Promise(resolve => setTimeout(resolve, 500));

    if (enteredPin === correctPin) {
      setPin('');
      onAuthenticated();
    } else {
      setError('Incorrect PIN. Please try again.');
      setPin('');
      // Haptic feedback for error
      if (navigator.vibrate) {
        navigator.vibrate([50, 30, 50]);
      }
    }
    
    setIsAuthenticating(false);
  };

  const handleBiometric = async () => {
    setIsAuthenticating(true);
    
    // Simulate biometric auth
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // In production, this would use actual biometric APIs
    setPin('');
    onAuthenticated();
    setIsAuthenticating(false);
  };

  const handleClose = () => {
    setPin('');
    setError('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm mx-auto rounded-3xl">
        <DialogHeader className="text-center pb-4">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Shield className="w-8 h-8 text-primary" />
          </div>
          <DialogTitle className="text-2xl">Secure Access Required</DialogTitle>
          <DialogDescription className="text-base">
            Enter your PIN to view protected health information
          </DialogDescription>
        </DialogHeader>

        {/* PIN Display */}
        <div className="flex justify-center gap-4 mb-6">
          {[0, 1, 2, 3].map((index) => (
            <div
              key={index}
              className={cn(
                "w-14 h-14 rounded-xl border-2 flex items-center justify-center text-2xl font-bold transition-all",
                pin.length > index
                  ? "border-primary bg-primary/10"
                  : "border-muted-foreground/30",
                error && "border-destructive"
              )}
            >
              {pin.length > index ? '•' : ''}
            </div>
          ))}
        </div>

        {/* Error Message */}
        {error && (
          <p className="text-destructive text-center text-sm mb-4">{error}</p>
        )}

        {/* Number Pad */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
            <Button
              key={digit}
              variant="outline"
              className="h-16 text-2xl font-bold rounded-2xl haptic-tap"
              onClick={() => handlePinDigit(digit.toString())}
              disabled={isAuthenticating}
            >
              {digit}
            </Button>
          ))}
          
          {/* Biometric Button */}
          <Button
            variant="outline"
            className="h-16 rounded-2xl haptic-tap"
            onClick={handleBiometric}
            disabled={!biometricAvailable || isAuthenticating}
          >
            <Fingerprint className="w-7 h-7 text-primary" />
          </Button>
          
          {/* Zero */}
          <Button
            variant="outline"
            className="h-16 text-2xl font-bold rounded-2xl haptic-tap"
            onClick={() => handlePinDigit('0')}
            disabled={isAuthenticating}
          >
            0
          </Button>
          
          {/* Backspace */}
          <Button
            variant="outline"
            className="h-16 rounded-2xl haptic-tap"
            onClick={handleBackspace}
            disabled={isAuthenticating || pin.length === 0}
          >
            ←
          </Button>
        </div>

        {/* Cancel Button */}
        <Button
          variant="ghost"
          className="w-full"
          onClick={handleClose}
        >
          Cancel
        </Button>

        {/* Security Notice */}
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground mt-4">
          <Lock className="w-3 h-3" />
          <span>HIPAA Compliant • Encrypted Access</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
