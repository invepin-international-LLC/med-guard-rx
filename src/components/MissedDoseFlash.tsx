import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';

interface MissedDoseFlashProps {
  isActive: boolean;
  medicationName?: string;
  onDismiss: () => void;
}

/**
 * Full-screen flash overlay for hearing-impaired users.
 * Flashes white/red to visually alert when a dose is missed.
 */
export function MissedDoseFlash({ isActive, medicationName, onDismiss }: MissedDoseFlashProps) {
  const [flashPhase, setFlashPhase] = useState(0);

  useEffect(() => {
    if (!isActive) {
      setFlashPhase(0);
      return;
    }

    // Flash 6 times then hold on alert screen
    let count = 0;
    const interval = setInterval(() => {
      count++;
      setFlashPhase(prev => (prev === 1 ? 2 : 1));
      if (count >= 12) {
        clearInterval(interval);
        setFlashPhase(3); // Hold on alert
      }
    }, 250);

    return () => clearInterval(interval);
  }, [isActive]);

  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center"
          onClick={onDismiss}
          style={{
            backgroundColor:
              flashPhase === 1
                ? 'rgba(255, 255, 255, 0.95)'
                : flashPhase === 2
                ? 'rgba(239, 68, 68, 0.9)'
                : 'rgba(0, 0, 0, 0.85)',
            transition: 'background-color 0.15s ease',
          }}
        >
          {flashPhase === 3 && (
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-center p-8 max-w-sm"
            >
              <motion.div
                animate={{ scale: [1, 1.15, 1] }}
                transition={{ repeat: Infinity, duration: 1.2 }}
                className="w-24 h-24 mx-auto mb-6 rounded-full bg-destructive flex items-center justify-center"
              >
                <AlertTriangle className="w-14 h-14 text-white" />
              </motion.div>
              <h2 className="text-3xl font-black text-white mb-3">
                MISSED DOSE
              </h2>
              {medicationName && (
                <p className="text-xl font-semibold text-white/90 mb-6">
                  {medicationName}
                </p>
              )}
              <p className="text-lg text-white/70">Tap anywhere to dismiss</p>
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}