import { useState, useEffect, useRef, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { 
  Camera, 
  X, 
  Flashlight, 
  RotateCcw, 
  Check, 
  Loader2,
  Pill,
  AlertTriangle,
  ScanLine
} from 'lucide-react';
import { toast } from 'sonner';

interface ScannedMedication {
  ndcCode: string;
  name: string;
  genericName?: string;
  strength: string;
  form: string;
  manufacturer?: string;
}

interface PrescriptionScannerProps {
  onMedicationScanned: (medication: ScannedMedication) => void;
  onClose: () => void;
}

// Mock NDC database - in production this would be an API call
const mockNdcDatabase: Record<string, ScannedMedication> = {
  '00006-0749-31': {
    ndcCode: '00006-0749-31',
    name: 'Metformin HCl',
    genericName: 'Metformin Hydrochloride',
    strength: '500mg',
    form: 'Tablet',
    manufacturer: 'Merck',
  },
  '00071-0155-23': {
    ndcCode: '00071-0155-23',
    name: 'Lisinopril',
    genericName: 'Lisinopril',
    strength: '10mg',
    form: 'Tablet',
    manufacturer: 'Pfizer',
  },
  '00071-0157-23': {
    ndcCode: '00071-0157-23',
    name: 'Atorvastatin',
    genericName: 'Atorvastatin Calcium',
    strength: '20mg',
    form: 'Tablet',
    manufacturer: 'Pfizer',
  },
  '50580-0506-30': {
    ndcCode: '50580-0506-30',
    name: 'Omeprazole',
    genericName: 'Omeprazole',
    strength: '20mg',
    form: 'Capsule',
    manufacturer: 'Dr. Reddy\'s',
  },
};

export function PrescriptionScanner({ onMedicationScanned, onClose }: PrescriptionScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [scannedResult, setScannedResult] = useState<ScannedMedication | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [torchOn, setTorchOn] = useState(false);
  
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = 'ndc-scanner';

  const lookupNdc = useCallback(async (ndcCode: string): Promise<ScannedMedication | null> => {
    // Simulate API lookup delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Clean up NDC code (remove dashes for lookup)
    const cleanNdc = ndcCode.replace(/-/g, '');
    
    // Check mock database
    for (const [key, value] of Object.entries(mockNdcDatabase)) {
      if (key.replace(/-/g, '') === cleanNdc || key === ndcCode) {
        return value;
      }
    }
    
    // If not found in mock, create a generic entry (in production, would return null or use real API)
    if (ndcCode.length >= 10) {
      return {
        ndcCode,
        name: 'Unknown Medication',
        strength: 'Unknown',
        form: 'Unknown',
        manufacturer: 'Unknown',
      };
    }
    
    return null;
  }, []);

  const handleScanSuccess = useCallback(async (decodedText: string) => {
    // Stop scanning immediately to prevent duplicate scans
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
      } catch (e) {
        // Scanner may already be stopped
      }
    }
    
    setIsScanning(false);
    setIsLoading(true);
    
    // Haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate([100, 50, 100]);
    }
    
    toast.info('Barcode detected! Looking up medication...');
    
    try {
      const medication = await lookupNdc(decodedText);
      
      if (medication) {
        setScannedResult(medication);
        if (medication.name !== 'Unknown Medication') {
          toast.success(`Found: ${medication.name} ${medication.strength}`);
        } else {
          toast.warning('Medication not found in database');
        }
      } else {
        setError('Could not identify medication from barcode');
      }
    } catch (err) {
      setError('Error looking up medication');
    } finally {
      setIsLoading(false);
    }
  }, [lookupNdc]);

  const startScanner = useCallback(async () => {
    setError(null);
    setScannedResult(null);
    
    try {
      // Request camera permission
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      stream.getTracks().forEach(track => track.stop());
      setHasPermission(true);
      
      // Initialize scanner
      scannerRef.current = new Html5Qrcode(scannerContainerId);
      
      setIsScanning(true);
      
      await scannerRef.current.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 280, height: 120 },
          aspectRatio: 1.5,
        },
        handleScanSuccess,
        () => {} // Ignore scan errors (no QR found)
      );
    } catch (err: any) {
      console.error('Scanner error:', err);
      setHasPermission(false);
      setError(
        err.name === 'NotAllowedError' 
          ? 'Camera permission denied. Please allow camera access to scan medications.'
          : 'Could not start camera. Please try again.'
      );
      setIsScanning(false);
    }
  }, [handleScanSuccess]);

  const stopScanner = useCallback(async () => {
    if (scannerRef.current && isScanning) {
      try {
        await scannerRef.current.stop();
        scannerRef.current = null;
      } catch (e) {
        console.error('Error stopping scanner:', e);
      }
    }
    setIsScanning(false);
  }, [isScanning]);

  const toggleTorch = useCallback(async () => {
    if (scannerRef.current) {
      try {
        // Note: Torch may not be supported on all devices
        const capabilities = scannerRef.current.getRunningTrackCapabilities?.() as MediaTrackCapabilities & { torch?: boolean };
        if (capabilities?.torch) {
          await scannerRef.current.applyVideoConstraints({
            advanced: [{ torch: !torchOn } as MediaTrackConstraintSet],
          });
          setTorchOn(!torchOn);
        } else {
          toast.info('Flashlight not available on this device');
        }
      } catch (e) {
        toast.info('Flashlight not available');
      }
    }
  }, [torchOn]);

  const handleConfirmMedication = useCallback(() => {
    if (scannedResult) {
      onMedicationScanned(scannedResult);
      toast.success(`${scannedResult.name} added successfully!`);
    }
  }, [scannedResult, onMedicationScanned]);

  const handleRetry = useCallback(() => {
    setScannedResult(null);
    setError(null);
    startScanner();
  }, [startScanner]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, [stopScanner]);

  // Auto-start scanner when component mounts
  useEffect(() => {
    startScanner();
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between p-4 bg-card border-b-2 border-border">
        <Button 
          variant="ghost" 
          size="lg" 
          onClick={() => {
            stopScanner();
            onClose();
          }}
          className="gap-2"
        >
          <X className="w-6 h-6" />
          <span className="text-lg">Cancel</span>
        </Button>
        <h1 className="text-elder-xl font-bold">Scan Prescription</h1>
        <div className="w-24" /> {/* Spacer for centering */}
      </header>

      {/* Scanner Area */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 bg-muted">
        {!scannedResult && !error && (
          <>
            {/* Camera viewfinder */}
            <div className="relative w-full max-w-md aspect-[4/3] bg-black rounded-3xl overflow-hidden shadow-elder-lg">
              <div id={scannerContainerId} className="w-full h-full" />
              
              {/* Scanning overlay */}
              {isScanning && (
                <div className="absolute inset-0 pointer-events-none">
                  {/* Corner brackets */}
                  <div className="absolute top-8 left-8 w-12 h-12 border-t-4 border-l-4 border-primary rounded-tl-lg" />
                  <div className="absolute top-8 right-8 w-12 h-12 border-t-4 border-r-4 border-primary rounded-tr-lg" />
                  <div className="absolute bottom-8 left-8 w-12 h-12 border-b-4 border-l-4 border-primary rounded-bl-lg" />
                  <div className="absolute bottom-8 right-8 w-12 h-12 border-b-4 border-r-4 border-primary rounded-br-lg" />
                  
                  {/* Scanning line animation */}
                  <div className="absolute top-1/2 left-8 right-8 h-1 bg-primary/50 animate-pulse" />
                </div>
              )}
              
              {/* Loading overlay */}
              {isLoading && (
                <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-4">
                  <Loader2 className="w-16 h-16 text-primary animate-spin" />
                  <p className="text-white text-elder-lg">Looking up medication...</p>
                </div>
              )}
            </div>

            {/* Instructions */}
            <div className="mt-8 text-center space-y-4">
              <div className="flex items-center justify-center gap-3 text-foreground">
                <ScanLine className="w-8 h-8 text-primary" />
                <p className="text-elder-lg">Point camera at barcode on prescription label</p>
              </div>
              <p className="text-muted-foreground text-lg">
                The barcode contains the NDC number for your medication
              </p>
            </div>

            {/* Controls */}
            {isScanning && (
              <div className="mt-8 flex gap-4">
                <Button 
                  variant="outline" 
                  size="xl" 
                  onClick={toggleTorch}
                  className="gap-3"
                >
                  <Flashlight className={`w-6 h-6 ${torchOn ? 'text-primary' : ''}`} />
                  Light
                </Button>
              </div>
            )}
          </>
        )}

        {/* Error State */}
        {error && (
          <Card className="w-full max-w-md p-8 text-center space-y-6 bg-destructive/10 border-2 border-destructive/30">
            <AlertTriangle className="w-16 h-16 text-destructive mx-auto" />
            <div>
              <h2 className="text-elder-xl text-destructive mb-2">Scan Failed</h2>
              <p className="text-elder text-foreground">{error}</p>
            </div>
            <Button variant="default" size="xl" onClick={handleRetry} className="w-full gap-3">
              <RotateCcw className="w-6 h-6" />
              Try Again
            </Button>
          </Card>
        )}

        {/* Result State */}
        {scannedResult && (
          <Card className="w-full max-w-md p-8 space-y-6 bg-card border-3 border-success shadow-elder-lg">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 bg-success/20 rounded-2xl flex items-center justify-center">
                <Pill className="w-12 h-12 text-success" />
              </div>
              <div className="flex-1">
                <h2 className="text-elder-xl text-foreground">{scannedResult.name}</h2>
                {scannedResult.genericName && (
                  <p className="text-muted-foreground text-lg">{scannedResult.genericName}</p>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-muted rounded-xl p-4">
                <p className="text-sm text-muted-foreground uppercase tracking-wide">Strength</p>
                <p className="text-elder-lg font-bold text-foreground">{scannedResult.strength}</p>
              </div>
              <div className="bg-muted rounded-xl p-4">
                <p className="text-sm text-muted-foreground uppercase tracking-wide">Form</p>
                <p className="text-elder-lg font-bold text-foreground">{scannedResult.form}</p>
              </div>
            </div>

            <div className="bg-muted rounded-xl p-4">
              <p className="text-sm text-muted-foreground uppercase tracking-wide">NDC Code</p>
              <p className="text-lg font-mono text-foreground">{scannedResult.ndcCode}</p>
            </div>

            {scannedResult.manufacturer && (
              <div className="bg-muted rounded-xl p-4">
                <p className="text-sm text-muted-foreground uppercase tracking-wide">Manufacturer</p>
                <p className="text-elder text-foreground">{scannedResult.manufacturer}</p>
              </div>
            )}

            {scannedResult.name === 'Unknown Medication' && (
              <div className="bg-warning/20 rounded-xl p-4 border-2 border-warning/40">
                <p className="text-warning text-elder">
                  ⚠️ Medication not found in database. You can still add it manually.
                </p>
              </div>
            )}

            <div className="flex gap-4 pt-4">
              <Button 
                variant="outline" 
                size="xl" 
                onClick={handleRetry}
                className="flex-1 gap-3"
              >
                <RotateCcw className="w-6 h-6" />
                Scan Again
              </Button>
              <Button 
                variant="default" 
                size="xl" 
                onClick={handleConfirmMedication}
                className="flex-1 gap-3"
              >
                <Check className="w-6 h-6" />
                Add Medication
              </Button>
            </div>
          </Card>
        )}
      </div>

      {/* Help Text */}
      <div className="p-4 bg-card border-t-2 border-border">
        <p className="text-center text-muted-foreground text-lg">
          Can't scan? You can also <Button variant="link" className="text-lg p-0 h-auto text-primary">enter NDC code manually</Button>
        </p>
      </div>
    </div>
  );
}
