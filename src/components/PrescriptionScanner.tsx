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
  ScanLine,
  Keyboard,
  ArrowLeft,
  Search
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


type ScannerMode = 'camera' | 'manual' | 'name';

// Check if running in native Capacitor
const isNativeApp = () => {
  return typeof window !== 'undefined' && !!(window as any).Capacitor?.isNativePlatform?.();
};

// Dynamic import of ML Kit barcode scanner
const getNativeScanner = async () => {
  if (!isNativeApp()) return null;
  try {
    const { BarcodeScanner, BarcodeFormat } = await import('@capacitor-mlkit/barcode-scanning');
    return { BarcodeScanner, BarcodeFormat };
  } catch (e) {
    console.log('Native barcode scanner not available:', e);
    return null;
  }
};

export function PrescriptionScanner({ onMedicationScanned, onClose }: PrescriptionScannerProps) {
  const [mode, setMode] = useState<ScannerMode>('camera');
  const [isScanning, setIsScanning] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [scannedResult, setScannedResult] = useState<ScannedMedication | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [debugError, setDebugError] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [torchOn, setTorchOn] = useState(false);
  const [manualNdc, setManualNdc] = useState('');
  const [drugNameQuery, setDrugNameQuery] = useState('');
  const [nameSearchResults, setNameSearchResults] = useState<ScannedMedication[]>([]);
  const [isNameSearching, setIsNameSearching] = useState(false);
  const nameSearchAbortRef = useRef<AbortController | null>(null);
  const [usingNativeScanner, setUsingNativeScanner] = useState(false);
  
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
      
      console.log('Medication not found in FDA database');
      return null;
    } catch (err) {
      console.error('NDC lookup error:', err);
      throw err;
    }
  }, []);

  const processBarcode = useCallback(async (decodedText: string) => {
    setIsScanning(false);
    setIsLoading(true);
    
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

  // Native scanner using ML Kit
  const startNativeScanner = useCallback(async () => {
    setError(null);
    setDebugError(null);
    setScannedResult(null);

    const isNative = isNativeApp();
    console.log(`[Scanner] isNativeApp=${isNative}, platform=${(window as any).Capacitor?.getPlatform?.()}`);

    let nativeScanner;
    try {
      nativeScanner = await getNativeScanner();
      console.log(`[Scanner] getNativeScanner returned: ${nativeScanner ? 'module loaded' : 'null'}`);
    } catch (e: any) {
      console.error('Failed to load native scanner module:', e);
      setError('Barcode scanner not available. Try entering the code manually.');
      setDebugError(`Module load failed: ${e?.message || String(e)}`);
      return;
    }

    if (!nativeScanner) {
      setError('Barcode scanner not available. Try entering the code manually.');
      setDebugError(`getNativeScanner() returned null. isNative=${isNative}`);
      return;
    }

    const { BarcodeScanner, BarcodeFormat } = nativeScanner;

    try {
      // Check/request permissions
      const permResult = await BarcodeScanner.checkPermissions();
      if (permResult.camera !== 'granted') {
        const requestResult = await BarcodeScanner.requestPermissions();
        if (requestResult.camera !== 'granted') {
          setHasPermission(false);
          setError('Camera permission is required to scan barcodes. Please allow access when prompted, or enter the code manually.');
          return;
        }
      }
      setHasPermission(true);
      setUsingNativeScanner(true);
      setIsScanning(true);

      // Use the scan() method which provides a ready-to-use UI
      const result = await BarcodeScanner.scan({
        formats: [BarcodeFormat.Code128, BarcodeFormat.Code39, BarcodeFormat.Ean13, BarcodeFormat.Ean8, BarcodeFormat.UpcA, BarcodeFormat.UpcE, BarcodeFormat.Itf, BarcodeFormat.DataMatrix],
      });

      setIsScanning(false);
      setUsingNativeScanner(false);

      if (result.barcodes.length > 0) {
        const barcodeValue = result.barcodes[0].rawValue;
        if (barcodeValue) {
          await processBarcode(barcodeValue);
        }
      } else {
        setError('No barcode detected. Try again or enter the code manually.');
      }
    } catch (err: any) {
      console.error('Native scanner error:', err);
      setIsScanning(false);
      setUsingNativeScanner(false);
      
      if (err?.message?.includes('canceled') || err?.message?.includes('cancelled')) {
        // User cancelled - no error
        return;
      }
      // Catch permission-related errors that may come from scan() itself
      if (err?.message?.includes('permission') || err?.message?.includes('denied') || err?.message?.includes('not authorized')) {
        setHasPermission(false);
        return;
      }
      const errMsg = err?.message || err?.code || String(err);
      console.error('[Scanner] Native error details:', JSON.stringify(err, Object.getOwnPropertyNames(err || {})));
      setError('Scanner encountered an issue. Try entering the code manually.');
      setDebugError(`Native error: ${errMsg} | type: ${err?.constructor?.name} | code: ${err?.code || 'none'}`);
    }
  }, [processBarcode]);

  // Web scanner fallback using html5-qrcode (only works in browser, NOT in native WKWebView)
  const startWebScanner = useCallback(async () => {
    setError(null);
    setScannedResult(null);
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      stream.getTracks().forEach(track => track.stop());
      setHasPermission(true);
      
      scannerRef.current = new Html5Qrcode(scannerContainerId);
      
      setIsScanning(true);
      
      await scannerRef.current.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 280, height: 120 },
          aspectRatio: 1.5,
        },
        async (decodedText) => {
          // Stop scanning immediately
          if (scannerRef.current) {
            try { await scannerRef.current.stop(); } catch (e) {}
          }
          await processBarcode(decodedText);
        },
        () => {} // Ignore scan errors
      );
    } catch (err: any) {
      console.error('Scanner error:', err);
      setIsScanning(false);
      setHasPermission(false);
      const errMsg = err?.message || err?.name || String(err);
      setError('Camera access is needed to scan barcodes. Please allow camera access in your device settings, or enter the code manually.');
      setDebugError(`Web scanner error: ${errMsg} | name: ${err?.name}`);
    }
  }, [processBarcode]);

  // Start scanner - picks native or web
  const startScanner = useCallback(async () => {
    if (isNativeApp()) {
      await startNativeScanner();
    } else {
      await startWebScanner();
    }
  }, [startNativeScanner, startWebScanner]);

  const stopScanner = useCallback(async () => {
    if (usingNativeScanner) {
      try {
        const nativeScanner = await getNativeScanner();
        if (nativeScanner) {
          await nativeScanner.BarcodeScanner.stopScan();
        }
      } catch (e) {
        console.error('Error stopping native scanner:', e);
      }
      setUsingNativeScanner(false);
    }
    if (scannerRef.current && isScanning) {
      try {
        await scannerRef.current.stop();
        scannerRef.current = null;
      } catch (e) {
        console.error('Error stopping scanner:', e);
      }
    }
    setIsScanning(false);
  }, [isScanning, usingNativeScanner]);

  const toggleTorch = useCallback(async () => {
    if (usingNativeScanner) {
      try {
        const nativeScanner = await getNativeScanner();
        if (nativeScanner) {
          if (torchOn) {
            await nativeScanner.BarcodeScanner.disableTorch();
          } else {
            await nativeScanner.BarcodeScanner.enableTorch();
          }
          setTorchOn(!torchOn);
        }
      } catch (e) {
        toast.info('Flashlight not available');
      }
      return;
    }

    if (scannerRef.current) {
      try {
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
  }, [torchOn, usingNativeScanner]);

  const handleConfirmMedication = useCallback(() => {
    if (scannedResult) {
      onMedicationScanned(scannedResult);
      toast.success(`${scannedResult.name} added successfully!`);
    }
  }, [scannedResult, onMedicationScanned]);

  const handleRetry = useCallback(() => {
    setScannedResult(null);
    setError(null);
    setHasPermission(null);
    setScannerStarted(false);
  }, []);

  const switchToManualMode = useCallback(async () => {
    await stopScanner();
    setMode('manual');
    setError(null);
    setScannedResult(null);
  }, [stopScanner]);

  const switchToNameSearch = useCallback(async () => {
    await stopScanner();
    setMode('name');
    setError(null);
    setScannedResult(null);
    setNameSearchResults([]);
    setDrugNameQuery('');
  }, [stopScanner]);

  const switchToCameraMode = useCallback(() => {
    setMode('camera');
    setError(null);
    setScannedResult(null);
    setManualNdc('');
    setDrugNameQuery('');
    setNameSearchResults([]);
    setScannerStarted(false);
  }, []);

  const formatNdcInput = (value: string): string => {
    const numbers = value.replace(/\D/g, '');
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
    if (manualNdc.replace(/-/g, '').length < 7) {
      setError('Please enter a valid NDC code (at least 7 digits)');
      return;
    }

    setIsLoading(true);
    setError(null);

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
  // Debounced typeahead search for drug name
  useEffect(() => {
    if (mode !== 'name') return;
    const query = drugNameQuery.trim();
    if (query.length < 2) {
      setNameSearchResults([]);
      setIsNameSearching(false);
      setError(null);
      return;
    }

    setIsNameSearching(true);
    setError(null);

    // Cancel previous in-flight request
    if (nameSearchAbortRef.current) {
      nameSearchAbortRef.current.abort();
    }

    const abortController = new AbortController();
    nameSearchAbortRef.current = abortController;

    const timer = setTimeout(async () => {
      try {
        const { data, error } = await supabase.functions.invoke('ndc-lookup', {
          body: { name: query }
        });

        if (abortController.signal.aborted) return;

        if (error) throw error;

        if (data?.success && data?.medications?.length) {
          setNameSearchResults(data.medications);
        } else {
          setNameSearchResults([]);
          setError('No medications found. Try a different spelling.');
        }
      } catch (err: any) {
        if (abortController.signal.aborted) return;
        console.error('Name search error:', err);
        setError('Error searching medications. Please try again.');
      } finally {
        if (!abortController.signal.aborted) {
          setIsNameSearching(false);
        }
      }
    }, 400);

    return () => {
      clearTimeout(timer);
      abortController.abort();
    };
  }, [drugNameQuery, mode]);


  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, [stopScanner]);

  // Track if scanner has been started by user gesture
  const [scannerStarted, setScannerStarted] = useState(false);

  // Start scanner only via explicit user tap (iOS requires user gesture for camera)
  const handleUserStartScanner = useCallback(async () => {
    setScannerStarted(true);
    await startScanner();
  }, [startScanner]);

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
          {mode === 'camera' ? 'Scan Prescription' : mode === 'manual' ? 'Enter NDC Code' : 'Search Drug'}
        </h1>
        <div className="w-24" />
      </header>

      {/* Scanner Area */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 bg-muted overflow-auto">
        {/* Camera Mode */}
        {mode === 'camera' && !scannedResult && !error && (
          <>
            {/* Show start button if scanner hasn't been started by user gesture */}
            {!scannerStarted && !isScanning && !usingNativeScanner && (
              <div className="text-center space-y-6">
                <div className="w-24 h-24 bg-primary/20 rounded-3xl flex items-center justify-center mx-auto">
                  <Camera className="w-14 h-14 text-primary" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-elder-xl font-bold text-foreground">Scan Prescription Barcode</h2>
                  <p className="text-muted-foreground text-lg">
                    Point your camera at the barcode on your prescription label to look up medication details.
                  </p>
                </div>
                <Button 
                  variant="default" 
                  size="xl" 
                  onClick={handleUserStartScanner}
                  className="w-full max-w-xs mx-auto gap-3"
                >
                  <Camera className="w-6 h-6" />
                  Open Camera
                </Button>
              </div>
            )}

            {/* Scanner viewport - only shown after user taps to start */}
            {scannerStarted && !usingNativeScanner && (
              <div className="relative w-full max-w-md aspect-[4/3] bg-black rounded-3xl overflow-hidden shadow-elder-lg">
                <div id={scannerContainerId} className="w-full h-full" />
                
                {isScanning && (
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-8 left-8 w-12 h-12 border-t-4 border-l-4 border-primary rounded-tl-lg" />
                    <div className="absolute top-8 right-8 w-12 h-12 border-t-4 border-r-4 border-primary rounded-tr-lg" />
                    <div className="absolute bottom-8 left-8 w-12 h-12 border-b-4 border-l-4 border-primary rounded-bl-lg" />
                    <div className="absolute bottom-8 right-8 w-12 h-12 border-b-4 border-r-4 border-primary rounded-br-lg" />
                    <div className="absolute top-1/2 left-8 right-8 h-1 bg-primary/50 animate-pulse" />
                  </div>
                )}
                
                {isLoading && (
                  <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-4">
                    <Loader2 className="w-16 h-16 text-primary animate-spin" />
                    <p className="text-white text-elder-lg">Looking up medication...</p>
                  </div>
                )}
              </div>
            )}

            {/* Native scanner shows its own UI, show a loading state */}
            {usingNativeScanner && isScanning && (
              <div className="text-center space-y-4">
                <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto" />
                <p className="text-elder-lg text-foreground">Scanner is open...</p>
                <p className="text-muted-foreground">Point your camera at the barcode</p>
              </div>
            )}

            {/* Instructions */}
            {scannerStarted && !usingNativeScanner && (
              <div className="mt-8 text-center space-y-4">
                <div className="flex items-center justify-center gap-3 text-foreground">
                  <ScanLine className="w-8 h-8 text-primary" />
                  <p className="text-elder-lg">Point camera at barcode on prescription label</p>
                </div>
                <p className="text-muted-foreground text-lg">
                  The barcode contains the NDC number for your medication
                </p>
              </div>
            )}

            {/* Controls */}
            {isScanning && !usingNativeScanner && (
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
                disabled={isLoading || manualNdc.replace(/-/g, '').length < 7}
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

            <div className="pt-2">
              <Button 
                variant="outline" 
                size="lg" 
                onClick={switchToNameSearch}
                className="w-full gap-3"
              >
                <Search className="w-5 h-5" />
                Search by Drug Name Instead
              </Button>
            </div>
          </Card>
        )}

        {/* Name Search Mode */}
        {mode === 'name' && !scannedResult && (
          <Card className="w-full max-w-md p-8 space-y-6 bg-card border-2 border-border shadow-elder-lg">
            <div className="text-center space-y-2">
              <div className="w-20 h-20 bg-primary/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Search className="w-12 h-12 text-primary" />
              </div>
              <h2 className="text-elder-xl font-bold text-foreground">Search by Drug Name</h2>
              <p className="text-muted-foreground text-lg">
                Enter the brand or generic name of your medication
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-lg font-medium text-foreground">Drug Name</label>
                <Input
                  type="text"
                  placeholder="e.g. Tylenol, Lisinopril, Metformin"
                  value={drugNameQuery}
                  onChange={(e) => setDrugNameQuery(e.target.value)}
                  className="text-center text-elder-lg h-16 border-2"
                  autoFocus
                />
              </div>

              {/* Quick-select common medications */}
              {!drugNameQuery && nameSearchResults.length === 0 && (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground font-medium">Common medications:</p>
                  <div className="flex flex-wrap gap-2">
                    {['Tylenol', 'Ibuprofen', 'Metformin', 'Lisinopril', 'Atorvastatin', 'Amlodipine', 'Omeprazole', 'Levothyroxine', 'Metoprolol', 'Losartan'].map((name) => (
                      <button
                        key={name}
                        onClick={() => setDrugNameQuery(name)}
                        className="px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium border border-primary/20 hover:bg-primary/20 transition-colors"
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {isNameSearching && (
                <div className="flex items-center justify-center gap-2 py-2">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  <span className="text-muted-foreground">Searching...</span>
                </div>
              )}

              {error && (
                <div className="bg-destructive/10 border-2 border-destructive/30 rounded-xl p-4">
                  <p className="text-destructive text-center">{error}</p>
                </div>
              )}
            </div>

            {/* Name Search Results */}
            {nameSearchResults.length > 0 && (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                <p className="text-sm text-muted-foreground font-medium">
                  {nameSearchResults.length} result(s) found — tap to select:
                </p>
                {nameSearchResults.map((med, i) => (
                  <button
                    key={`${med.ndcCode}-${i}`}
                    onClick={() => {
                      setScannedResult(med);
                      setNameSearchResults([]);
                    }}
                    className="w-full text-left bg-muted hover:bg-muted/80 rounded-xl p-4 space-y-1 transition-colors border-2 border-transparent hover:border-primary"
                  >
                    <p className="font-bold text-foreground text-lg">{med.name}</p>
                    {med.genericName && med.genericName !== med.name && (
                      <p className="text-sm text-muted-foreground">{med.genericName}</p>
                    )}
                    <div className="flex gap-3 text-sm text-muted-foreground">
                      <span>{med.strength}</span>
                      <span>•</span>
                      <span>{med.form}</span>
                    </div>
                    {med.manufacturer && (
                      <p className="text-xs text-muted-foreground">{med.manufacturer}</p>
                    )}
                  </button>
                ))}
              </div>
            )}
          </Card>
        )}

        {/* Error State */}
        {error && mode === 'camera' && (
          <Card className="w-full max-w-md p-8 text-center space-y-6 bg-card border-2 border-border shadow-elder-lg">
            <div className="w-24 h-24 bg-destructive/20 rounded-3xl flex items-center justify-center mx-auto">
              <Camera className="w-14 h-14 text-destructive" />
            </div>
            <div className="space-y-2">
              <h2 className="text-elder-xl font-bold text-foreground">Camera Issue</h2>
              <p className="text-muted-foreground text-lg">{error}</p>
            </div>
            <div className="flex flex-col gap-3">
              <Button variant="default" size="xl" onClick={handleRetry} className="w-full gap-3">
                <RotateCcw className="w-6 h-6" />
                Try Again
              </Button>
              <Button variant="outline" size="xl" onClick={switchToManualMode} className="w-full gap-3">
                <Keyboard className="w-6 h-6" />
                Enter NDC Code
              </Button>
              <Button variant="outline" size="xl" onClick={switchToNameSearch} className="w-full gap-3">
                <Search className="w-6 h-6" />
                Search by Drug Name
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
      <div className="p-4 bg-card border-t-2 border-border space-y-2">
        {mode === 'camera' && !scannedResult && (
          <div className="flex flex-col items-center gap-2">
            <p className="text-center text-muted-foreground text-lg">
              Can't scan?{' '}
              <Button 
                variant="link" 
                className="text-lg p-0 h-auto text-primary font-semibold"
                onClick={switchToManualMode}
              >
                Enter NDC code
              </Button>
              {' or '}
              <Button 
                variant="link" 
                className="text-lg p-0 h-auto text-primary font-semibold"
                onClick={switchToNameSearch}
              >
                search by name
              </Button>
            </p>
          </div>
        )}
        {mode === 'manual' && !scannedResult && (
          <div className="flex gap-2">
            <Button 
              variant="ghost" 
              size="lg" 
              className="flex-1 gap-2 text-muted-foreground"
              onClick={switchToCameraMode}
            >
              <Camera className="w-5 h-5" />
              Camera
            </Button>
            <Button 
              variant="ghost" 
              size="lg" 
              className="flex-1 gap-2 text-muted-foreground"
              onClick={switchToNameSearch}
            >
              <Search className="w-5 h-5" />
              Search by Name
            </Button>
          </div>
        )}
        {mode === 'name' && !scannedResult && (
          <div className="flex gap-2">
            <Button 
              variant="ghost" 
              size="lg" 
              className="flex-1 gap-2 text-muted-foreground"
              onClick={switchToCameraMode}
            >
              <Camera className="w-5 h-5" />
              Camera
            </Button>
            <Button 
              variant="ghost" 
              size="lg" 
              className="flex-1 gap-2 text-muted-foreground"
              onClick={switchToManualMode}
            >
              <Keyboard className="w-5 h-5" />
              NDC Code
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
