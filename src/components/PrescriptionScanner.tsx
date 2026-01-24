import { useState, useEffect, useRef, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { 
  Camera, 
  X, 
  Flashlight, 
  RotateCcw, 
  Check, 
  Loader2,
  Pill,
  AlertTriangle,
  ScanLine,
  Keyboard,
  ArrowLeft
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface ScannedMedication {
  ndcCode: string;
  name: string;
  genericName?: string;
  strength: string;
  form: string;
  manufacturer?: string;
  route?: string;
  productType?: string;
}

interface PrescriptionScannerProps {
  onMedicationScanned: (medication: ScannedMedication) => void;
  onClose: () => void;
}

// Demo NDC codes for testing (verified working with OpenFDA)
const demoNdcCodes = [
  '0777-3105-02', // Prozac 20mg
  '16714-613-01', // Sertraline 100mg
  '59762-3304-1', // Nitroglycerin 0.4mg
];

type ScannerMode = 'camera' | 'manual';

export function PrescriptionScanner({ onMedicationScanned, onClose }: PrescriptionScannerProps) {
  const [mode, setMode] = useState<ScannerMode>('camera');
  const [isScanning, setIsScanning] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [scannedResult, setScannedResult] = useState<ScannedMedication | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [torchOn, setTorchOn] = useState(false);
  const [manualNdc, setManualNdc] = useState('');
  
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = 'ndc-scanner';

  const lookupNdc = useCallback(async (ndcCode: string): Promise<ScannedMedication | null> => {
    try {
      console.log(`Looking up NDC: ${ndcCode}`);
      
      const { data, error } = await supabase.functions.invoke('ndc-lookup', {
        body: { ndc: ndcCode }
      });
      
      if (error) {
        console.error('Edge function error:', error);
        throw new Error(error.message || 'Failed to lookup medication');
      }
      
      if (data?.success && data?.medication) {
        console.log('Found medication:', data.medication);
        return data.medication as ScannedMedication;
      }
      
      // Not found in FDA database
      console.log('Medication not found in FDA database');
      return null;
    } catch (err) {
      console.error('NDC lookup error:', err);
      throw err;
    }
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
    
    toast.info('Barcode detected! Looking up medication in FDA database...');
    
    try {
      const medication = await lookupNdc(decodedText);
      
      if (medication) {
        setScannedResult(medication);
        toast.success(`Found: ${medication.name} ${medication.strength}`);
      } else {
        setError('Medication not found in FDA database. Try entering the NDC manually.');
      }
    } catch (err) {
      console.error('Scan lookup error:', err);
      setError('Error looking up medication. Please try again.');
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
    if (mode === 'camera') {
      startScanner();
    }
  }, [startScanner, mode]);

  const switchToManualMode = useCallback(async () => {
    await stopScanner();
    setMode('manual');
    setError(null);
    setScannedResult(null);
  }, [stopScanner]);

  const switchToCameraMode = useCallback(() => {
    setMode('camera');
    setError(null);
    setScannedResult(null);
    setManualNdc('');
    startScanner();
  }, [startScanner]);

  const formatNdcInput = (value: string): string => {
    // Remove all non-numeric characters
    const numbers = value.replace(/\D/g, '');
    
    // Format as 5-4-2 (FDA standard NDC format)
    if (numbers.length <= 5) {
      return numbers;
    } else if (numbers.length <= 9) {
      return `${numbers.slice(0, 5)}-${numbers.slice(5)}`;
    } else {
      return `${numbers.slice(0, 5)}-${numbers.slice(5, 9)}-${numbers.slice(9, 11)}`;
    }
  };

  const handleManualNdcChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatNdcInput(e.target.value);
    setManualNdc(formatted);
  };

  const handleManualLookup = async () => {
    if (manualNdc.replace(/-/g, '').length < 10) {
      setError('Please enter a valid 10-11 digit NDC code');
      return;
    }

    setIsLoading(true);
    setError(null);

    // Haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }

    try {
      const medication = await lookupNdc(manualNdc);
      
      if (medication) {
        setScannedResult(medication);
        toast.success(`Found: ${medication.name} ${medication.strength}`);
      } else {
        setError('Medication not found in FDA database. Please verify the NDC code.');
      }
    } catch (err) {
      console.error('Manual lookup error:', err);
      setError('Error looking up medication. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, [stopScanner]);

  // Auto-start scanner when component mounts (only in camera mode)
  useEffect(() => {
    if (mode === 'camera') {
      startScanner();
    }
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
        <h1 className="text-elder-xl font-bold">
          {mode === 'camera' ? 'Scan Prescription' : 'Enter NDC Code'}
        </h1>
        <div className="w-24" /> {/* Spacer for centering */}
      </header>

      {/* Scanner Area */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 bg-muted overflow-auto">
        {/* Camera Mode */}
        {mode === 'camera' && !scannedResult && !error && (
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

        {/* Manual Entry Mode */}
        {mode === 'manual' && !scannedResult && (
          <Card className="w-full max-w-md p-8 space-y-6 bg-card border-2 border-border shadow-elder-lg">
            <div className="text-center space-y-2">
              <div className="w-20 h-20 bg-primary/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Keyboard className="w-12 h-12 text-primary" />
              </div>
              <h2 className="text-elder-xl font-bold text-foreground">Enter NDC Code</h2>
              <p className="text-muted-foreground text-lg">
                Find the 10 or 11 digit NDC code on your prescription label
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-lg font-medium text-foreground">NDC Code</label>
                <Input
                  type="text"
                  placeholder="00000-0000-00"
                  value={manualNdc}
                  onChange={handleManualNdcChange}
                  className="text-center text-elder-xl font-mono tracking-wider h-16 border-2"
                  maxLength={13}
                  inputMode="numeric"
                  autoFocus
                />
                <p className="text-sm text-muted-foreground text-center">
                  Format: 5-4-2 digits (e.g., 00071-0155-23)
                </p>
              </div>

              {error && (
                <div className="bg-destructive/10 border-2 border-destructive/30 rounded-xl p-4">
                  <p className="text-destructive text-center">{error}</p>
                </div>
              )}

              <Button 
                variant="default" 
                size="xl" 
                onClick={handleManualLookup}
                disabled={isLoading || manualNdc.replace(/-/g, '').length < 10}
                className="w-full gap-3"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin" />
                    Looking Up...
                  </>
                ) : (
                  <>
                    <Check className="w-6 h-6" />
                    Look Up Medication
                  </>
                )}
              </Button>
            </div>

            {/* Example NDC codes for demo */}
            <div className="pt-4 border-t border-border">
              <p className="text-sm text-muted-foreground text-center mb-3">
                Try these demo codes (real FDA data):
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {demoNdcCodes.map((ndc) => (
                  <Button
                    key={ndc}
                    variant="outline"
                    size="sm"
                    onClick={() => setManualNdc(ndc)}
                    className="font-mono text-sm"
                  >
                    {ndc}
                  </Button>
                ))}
              </div>
            </div>
          </Card>
        )}

        {/* Error State */}
        {error && mode === 'camera' && (
          <Card className="w-full max-w-md p-8 text-center space-y-6 bg-destructive/10 border-2 border-destructive/30">
            <AlertTriangle className="w-16 h-16 text-destructive mx-auto" />
            <div>
              <h2 className="text-elder-xl text-destructive mb-2">Scan Failed</h2>
              <p className="text-elder text-foreground">{error}</p>
            </div>
            <div className="flex flex-col gap-3">
              <Button variant="default" size="xl" onClick={handleRetry} className="w-full gap-3">
                <RotateCcw className="w-6 h-6" />
                Try Again
              </Button>
              <Button variant="outline" size="xl" onClick={switchToManualMode} className="w-full gap-3">
                <Keyboard className="w-6 h-6" />
                Enter Code Manually
              </Button>
            </div>
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

            {scannedResult.route && (
              <div className="bg-muted rounded-xl p-4">
                <p className="text-sm text-muted-foreground uppercase tracking-wide">Route</p>
                <p className="text-elder text-foreground">{scannedResult.route}</p>
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
                {mode === 'camera' ? 'Scan Again' : 'Try Another'}
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

      {/* Footer / Mode Toggle */}
      <div className="p-4 bg-card border-t-2 border-border">
        {mode === 'camera' && !scannedResult && (
          <p className="text-center text-muted-foreground text-lg">
            Can't scan?{' '}
            <Button 
              variant="link" 
              className="text-lg p-0 h-auto text-primary font-semibold"
              onClick={switchToManualMode}
            >
              Enter NDC code manually
            </Button>
          </p>
        )}
        {mode === 'manual' && !scannedResult && (
          <Button 
            variant="ghost" 
            size="lg" 
            className="w-full gap-3 text-muted-foreground"
            onClick={switchToCameraMode}
          >
            <Camera className="w-6 h-6" />
            Switch to Camera Scanner
          </Button>
        )}
      </div>
    </div>
  );
}