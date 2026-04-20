import { useState, useEffect, useRef, useCallback, type ChangeEvent } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
  Search,
  ZoomIn,
  ZoomOut,
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
  instructions?: string;
  purpose?: string;
  prescriber?: string;
  confidence?: 'high' | 'medium' | 'low';
  source?: 'barcode' | 'label';
}

interface PrescriptionScannerProps {
  onMedicationScanned: (medication: ScannedMedication) => void;
  onClose: () => void;
}

type ScannerMode = 'camera' | 'manual' | 'name' | 'label';

const isNativeApp = () => {
  return typeof window !== 'undefined' && !!(window as any).Capacitor?.isNativePlatform?.();
};

const getNativePlatform = () => {
  if (typeof window === 'undefined') return null;
  return (window as any).Capacitor?.getPlatform?.() ?? null;
};

const getNativeScanner = async () => {
  if (!isNativeApp()) return null;
  try {
    const { BarcodeScanner, BarcodeFormat, Resolution } = await import('@capacitor-mlkit/barcode-scanning');
    return { BarcodeScanner, BarcodeFormat, Resolution };
  } catch (e) {
    console.log('Native barcode scanner not available:', e);
    return null;
  }
};

const labelConfidenceStyles: Record<'high' | 'medium' | 'low', string> = {
  high: 'border-border bg-success/10 text-success',
  medium: 'border-border bg-primary/10 text-primary',
  low: 'border-border bg-muted text-muted-foreground',
};

export function PrescriptionScanner({ onMedicationScanned, onClose }: PrescriptionScannerProps) {
  const [mode, setMode] = useState<ScannerMode>('camera');
  const [isScanning, setIsScanning] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [scannedResult, setScannedResult] = useState<ScannedMedication | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [debugError, setDebugError] = useState<string | null>(null);
  const [, setHasPermission] = useState<boolean | null>(null);
  const [torchOn, setTorchOn] = useState(false);
  const [manualNdc, setManualNdc] = useState('');
  const [drugNameQuery, setDrugNameQuery] = useState('');
  const [nameSearchResults, setNameSearchResults] = useState<ScannedMedication[]>([]);
  const [isNameSearching, setIsNameSearching] = useState(false);
  const [usingNativeScanner, setUsingNativeScanner] = useState(false);
  const [scannerStarted, setScannerStarted] = useState(false);
  const [labelPhoto, setLabelPhoto] = useState<string | null>(null);
  const [labelNotes, setLabelNotes] = useState<string[]>([]);
  const [zoomRatio, setZoomRatio] = useState<number>(1);
  const [zoomLimits, setZoomLimits] = useState<{ min: number; max: number }>({ min: 1, max: 5 });
  const [focusPoint, setFocusPoint] = useState<{ x: number; y: number; key: number } | null>(null);
  const focusBusyRef = useRef(false);

  const nameSearchAbortRef = useRef<AbortController | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const labelFileInputRef = useRef<HTMLInputElement | null>(null);
  const nativeBarcodesListenerRef = useRef<{ remove: () => Promise<void> } | null>(null);
  const nativeSingleBarcodeListenerRef = useRef<{ remove: () => Promise<void> } | null>(null);
  const nativeScanErrorListenerRef = useRef<{ remove: () => Promise<void> } | null>(null);
  const nativeScanHandledRef = useRef(false);
  const scannerContainerId = 'ndc-scanner';
  const nativePlatform = getNativePlatform();

  const clearNativeListeners = useCallback(async () => {
    const listeners = [nativeBarcodesListenerRef.current, nativeSingleBarcodeListenerRef.current, nativeScanErrorListenerRef.current].filter(Boolean) as {
      remove: () => Promise<void>;
    }[];

    nativeBarcodesListenerRef.current = null;
    nativeSingleBarcodeListenerRef.current = null;
    nativeScanErrorListenerRef.current = null;

    if (listeners.length === 0) return;

    await Promise.allSettled(listeners.map((listener) => listener.remove()));
  }, []);

  const debugScanner = useCallback((message: string, details?: unknown) => {
    if (typeof details === 'undefined') {
      console.log(`[ScannerDebug] ${message}`);
      return;
    }

    console.log(`[ScannerDebug] ${message}`, details);
  }, []);

  const lookupNdc = useCallback(async (ndcCode: string): Promise<ScannedMedication | null> => {
    try {
      console.log(`Looking up NDC: ${ndcCode}`);
      debugScanner('Lookup started', { ndcCode });

      const { data, error } = await supabase.functions.invoke('ndc-lookup', {
        body: { ndc: ndcCode },
      });

      const status = (error as any)?.context?.status ?? (error as any)?.status;
      if (error) {
        if (status === 404 || error.message?.includes('404')) {
          console.log('Medication not found in FDA database');
          debugScanner('Lookup returned 404/not found', { ndcCode, status, message: error.message });
          return null;
        }

        console.error('Edge function error:', error);
        debugScanner('Lookup edge function error', {
          ndcCode,
          status,
          message: error.message,
          context: (error as any)?.context,
        });
        throw new Error(error.message || 'Failed to lookup medication');
      }

      if (data?.success && data?.medication) {
        console.log('Found medication:', data.medication);
        debugScanner('Lookup success', {
          ndcCode,
          name: data.medication.name,
          strength: data.medication.strength,
          form: data.medication.form,
        });
        return {
          ...data.medication,
          source: 'barcode',
        } as ScannedMedication;
      }

      console.log('Medication not found in FDA database');
      debugScanner('Lookup returned empty result', { ndcCode, data });
      return null;
    } catch (err) {
      console.error('NDC lookup error:', err);
      debugScanner('Lookup threw exception', err);
      throw err;
    }
  }, [debugScanner]);

  const readPrescriptionLabel = useCallback(async (imageBase64: string) => {
    setError(null);
    setDebugError(null);
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('scan-prescription-label', {
        body: { imageBase64 },
      });

      if (error) {
        throw error;
      }

      if (data?.success && data?.medication) {
        setLabelNotes(Array.isArray(data.notes) ? data.notes : []);
        setScannedResult(data.medication as ScannedMedication);
        toast.success(`Found: ${data.medication.name} ${data.medication.strength}`);
        return;
      }

      setLabelNotes(Array.isArray(data?.notes) ? data.notes : []);
      setError(data?.error || 'Could not read the bottle label. Try a closer, brighter photo.');
    } catch (err: any) {
      console.error('Prescription label read error:', err);
      setError('Could not read the bottle label. Try a closer, brighter photo or search by name.');
      setDebugError(`Label scan error: ${err?.message || String(err)}`);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const processBarcode = useCallback(async (decodedText: string) => {
    setIsScanning(false);
    setIsLoading(true);
    setError(null);
    setDebugError(null);
    debugScanner('Processing decoded barcode', { decodedText });

    if (navigator.vibrate) {
      navigator.vibrate([100, 50, 100]);
    }

    toast.info('Barcode detected! Looking up medication in FDA database...');

    try {
      const medication = await lookupNdc(decodedText);

      if (medication) {
        setScannedResult(medication);
        debugScanner('Decoded barcode matched medication', {
          decodedText,
          name: medication.name,
          strength: medication.strength,
        });
        toast.success(`Found: ${medication.name} ${medication.strength}`);
      } else {
        debugScanner('Decoded barcode did not match FDA medication', { decodedText });
        setError('That barcode was scanned, but it looks like a pharmacy or prescription code instead of an FDA medication code. Try Scan Bottle Label instead.');
        setDebugError(`Scanned barcode: ${decodedText}`);
      }
    } catch (err) {
      console.error('Scan lookup error:', err);
      debugScanner('Barcode processing failed', err);
      setError('We scanned the barcode, but could not look up the medication. Try Scan Bottle Label instead.');
      setDebugError(`Barcode lookup failed for: ${decodedText}`);
    } finally {
      setIsLoading(false);
    }
  }, [debugScanner, lookupNdc]);

  const startNativeScanner = useCallback(async () => {
    setError(null);
    setDebugError(null);
    setScannedResult(null);
    nativeScanHandledRef.current = false;

    const isNative = isNativeApp();
    const platform = (window as any).Capacitor?.getPlatform?.();
    console.log(`[Scanner] isNativeApp=${isNative}, platform=${platform}`);
    debugScanner('Starting native scanner', { isNative, platform });

    let nativeScanner;
    try {
      nativeScanner = await getNativeScanner();
      console.log(`[Scanner] getNativeScanner returned: ${nativeScanner ? 'module loaded' : 'null'}`);
      debugScanner('Native scanner module load result', nativeScanner ? 'module loaded' : 'null');
    } catch (e: any) {
      console.error('Failed to load native scanner module:', e);
      debugScanner('Native scanner module load failed', e);
      setError('Barcode scanner not available. Try scanning the bottle label instead.');
      setDebugError(`Module load failed: ${e?.message || String(e)}`);
      return;
    }

    if (!nativeScanner) {
      debugScanner('Native scanner module missing after load');
      setError('Barcode scanner not available. Try scanning the bottle label instead.');
      setDebugError(`getNativeScanner() returned null. isNative=${isNative}`);
      return;
    }

    const { BarcodeScanner, BarcodeFormat, Resolution } = nativeScanner;

    try {
      const { supported } = await BarcodeScanner.isSupported();
      debugScanner('Native support check', { supported });
      if (!supported) {
        setHasPermission(false);
        setError('Camera is not available on this device.');
        setDebugError('BarcodeScanner.isSupported() returned false.');
        return;
      }

      const permResult = await BarcodeScanner.checkPermissions();
      debugScanner('Native permissions before request', permResult);
      if (permResult.camera !== 'granted') {
        const requestResult = await BarcodeScanner.requestPermissions();
        debugScanner('Native permissions after request', requestResult);
        if (requestResult.camera !== 'granted') {
          setHasPermission(false);
          setError('Camera permission is required to scan barcodes. Please allow access when prompted, or scan the bottle label instead.');
          setDebugError(`Permission not granted. check=${permResult.camera} request=${requestResult.camera}`);
          return;
        }
      }

      const scanOptions = {
        lensFacing: 'BACK',
        resolution: Resolution['1920x1080'],
        formats: [
          BarcodeFormat.Pdf417,
          BarcodeFormat.Code128,
          BarcodeFormat.Code39,
          BarcodeFormat.Code93,
          BarcodeFormat.Codabar,
          BarcodeFormat.Itf,
          BarcodeFormat.DataMatrix,
          BarcodeFormat.Ean13,
          BarcodeFormat.Ean8,
          BarcodeFormat.UpcA,
          BarcodeFormat.UpcE,
          BarcodeFormat.QrCode,
          BarcodeFormat.Aztec,
        ],
      } as const;

      setHasPermission(true);
      setUsingNativeScanner(true);
      setIsScanning(true);

      if (platform === 'ios' && typeof BarcodeScanner.scan === 'function') {
        debugScanner('Using native scan() UI on iPhone with autoZoom', { formats: scanOptions.formats });

        try {
          const result = await BarcodeScanner.scan({
            formats: scanOptions.formats,
            autoZoom: true,
          } as any);

          const firstBarcode = Array.isArray(result?.barcodes)
            ? result.barcodes.find((barcode: any) => typeof barcode?.rawValue === 'string' && barcode.rawValue.trim().length > 0)
            : null;

          debugScanner('iPhone native scan() resolved', {
            count: Array.isArray(result?.barcodes) ? result.barcodes.length : 0,
            barcodes: Array.isArray(result?.barcodes)
              ? result.barcodes.map((barcode: any) => ({
                  format: barcode?.format,
                  rawValue: barcode?.rawValue,
                  displayValue: barcode?.displayValue,
                }))
              : [],
          });

          setUsingNativeScanner(false);
          setIsScanning(false);

          if (firstBarcode?.rawValue) {
            await processBarcode(firstBarcode.rawValue);
            return;
          }

          setScannerStarted(false);
          debugScanner('iPhone native scan() completed without a usable barcode');
          return;
        } catch (scanErr: any) {
          setUsingNativeScanner(false);
          setIsScanning(false);

          if (scanErr?.message?.includes('canceled') || scanErr?.message?.includes('cancelled')) {
            setScannerStarted(false);
            debugScanner('iPhone native scan() canceled by user');
            return;
          }

          throw scanErr;
        }
      }

      debugScanner('Native scan options', scanOptions);
      await clearNativeListeners();
      debugScanner('Cleared old native listeners');

      const handleNativeBarcode = async (barcode: any, sourceEvent: string) => {
        if (!barcode || typeof barcode?.rawValue !== 'string' || barcode.rawValue.trim().length === 0) {
          console.log('[Scanner] Native scan event fired without a usable rawValue.', { sourceEvent, barcode });
          debugScanner('Native event had no usable rawValue', { sourceEvent, barcode });
          return;
        }

        if (nativeScanHandledRef.current) {
          debugScanner('Ignored duplicate native barcode event', { sourceEvent });
          return;
        }
        nativeScanHandledRef.current = true;

        console.log('[Scanner] Native barcode detected:', {
          sourceEvent,
          format: barcode.format,
          rawValue: barcode.rawValue,
          displayValue: barcode.displayValue,
        });
        debugScanner('Native barcode selected for processing', {
          sourceEvent,
          format: barcode.format,
          rawValue: barcode.rawValue,
          displayValue: barcode.displayValue,
        });

        try {
          await BarcodeScanner.stopScan();
          debugScanner('Native stopScan succeeded after detection');
        } catch (stopError) {
          console.error('Error stopping native scanner after detection:', stopError);
          debugScanner('Native stopScan failed after detection', stopError);
        }

        await clearNativeListeners();
        setUsingNativeScanner(false);
        setIsScanning(false);
        await processBarcode(barcode.rawValue);
      };

      nativeSingleBarcodeListenerRef.current = await BarcodeScanner.addListener('barcodeScanned' as any, async (event: any) => {
        debugScanner('Native barcodeScanned event', {
          barcode: event?.barcode
            ? {
                format: event.barcode?.format,
                rawValue: event.barcode?.rawValue,
                displayValue: event.barcode?.displayValue,
              }
            : null,
        });

        await handleNativeBarcode(event?.barcode, 'barcodeScanned');
      });

      nativeBarcodesListenerRef.current = await BarcodeScanner.addListener('barcodesScanned', async (event: any) => {
        debugScanner('Native barcodesScanned event', {
          count: Array.isArray(event?.barcodes) ? event.barcodes.length : 0,
          barcodes: Array.isArray(event?.barcodes)
            ? event.barcodes.map((barcode: any) => ({
                format: barcode?.format,
                rawValue: barcode?.rawValue,
                displayValue: barcode?.displayValue,
              }))
            : [],
        });

        const firstBarcode = Array.isArray(event?.barcodes)
          ? event.barcodes.find((barcode: any) => typeof barcode?.rawValue === 'string' && barcode.rawValue.trim().length > 0)
          : null;

        await handleNativeBarcode(firstBarcode, 'barcodesScanned');
      });

      nativeScanErrorListenerRef.current = await BarcodeScanner.addListener('scanError', async (event: any) => {
        console.error('[Scanner] Native scanError event:', event);
        debugScanner('Native scanError event', event);
        setDebugError(`Native scan error: ${event?.message || 'unknown error'}`);
      });

      debugScanner('Native listeners attached');
      console.log('[Scanner] Starting native live scan with options:', scanOptions);
      await BarcodeScanner.startScan(scanOptions as any);
      debugScanner('Native startScan resolved');

      // Initialize zoom limits + start at modest zoom to help focus on small bottle barcodes.
      try {
        const [minRes, maxRes] = await Promise.all([
          BarcodeScanner.getMinZoomRatio?.(),
          BarcodeScanner.getMaxZoomRatio?.(),
        ]);
        const min = typeof minRes?.zoomRatio === 'number' ? minRes.zoomRatio : 1;
        const max = typeof maxRes?.zoomRatio === 'number' ? maxRes.zoomRatio : 5;
        const safeMax = Math.max(min, Math.min(max, 8));
        setZoomLimits({ min, max: safeMax });
        const initial = Math.min(Math.max(1.5, min), safeMax);
        try {
          await BarcodeScanner.setZoomRatio?.({ zoomRatio: initial });
          setZoomRatio(initial);
          debugScanner('Native zoom initialized', { min, max: safeMax, initial });
        } catch (zoomErr) {
          debugScanner('Native setZoomRatio failed on init', zoomErr);
        }
      } catch (limitErr) {
        debugScanner('Native zoom limits unavailable', limitErr);
      }
    } catch (err: any) {
      console.error('Native scanner error:', err);
      debugScanner('Native scanner threw error', {
        message: err?.message,
        code: err?.code,
        name: err?.constructor?.name,
        raw: err,
      });
      await clearNativeListeners();
      nativeScanHandledRef.current = false;
      setIsScanning(false);
      setUsingNativeScanner(false);

      if (err?.message?.includes('canceled') || err?.message?.includes('cancelled')) {
        return;
      }
      if (err?.message?.includes('permission') || err?.message?.includes('denied') || err?.message?.includes('not authorized')) {
        setHasPermission(false);
        setError('Camera permission is required to scan barcodes. Please allow access and try again.');
        setDebugError(`Native permission error: ${err?.message || String(err)}`);
        return;
      }
      const errMsg = err?.message || err?.code || String(err);
      console.error('[Scanner] Native error details:', JSON.stringify(err, Object.getOwnPropertyNames(err || {})));
      setError('Scanner encountered an issue. Try Scan Bottle Label instead.');
      setDebugError(`Native error: ${errMsg} | type: ${err?.constructor?.name} | code: ${err?.code || 'none'}`);
    }
  }, [clearNativeListeners, debugScanner, processBarcode]);

  const startWebScanner = useCallback(async () => {
    setError(null);
    setDebugError(null);
    setScannedResult(null);
    debugScanner('Starting web scanner');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      debugScanner('Web camera permission granted');
      stream.getTracks().forEach((track) => track.stop());
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
          debugScanner('Web scanner decoded barcode', { decodedText });
          if (scannerRef.current) {
            try {
              await scannerRef.current.stop();
            } catch (e) {
              console.error('Error stopping scanner after decode:', e);
              debugScanner('Web scanner stop after decode failed', e);
            }
          }
          await processBarcode(decodedText);
        },
        (decodeError) => {
          if (decodeError) {
            console.debug('[ScannerDebug] Web frame decode miss', decodeError);
          }
        }
      );
      debugScanner('Web scanner start resolved');
    } catch (err: any) {
      console.error('Scanner error:', err);
      debugScanner('Web scanner error', {
        message: err?.message,
        name: err?.name,
        raw: err,
      });
      setIsScanning(false);
      setHasPermission(false);
      const errMsg = err?.message || err?.name || String(err);
      setError('Camera access is needed to scan barcodes. Please allow camera access or scan the bottle label instead.');
      setDebugError(`Web scanner error: ${errMsg} | name: ${err?.name}`);
    }
  }, [debugScanner, processBarcode]);

  const startScanner = useCallback(async () => {
    const nativePlatform = getNativePlatform();

    if (isNativeApp()) {
      console.log(`[Scanner] Using native MLKit auto-scanner. platform=${nativePlatform}`);
      await startNativeScanner();
    } else {
      console.log(`[Scanner] Using web scanner. nativePlatform=${nativePlatform ?? 'web'}`);
      await startWebScanner();
    }
  }, [startNativeScanner, startWebScanner]);

  const stopScanner = useCallback(async () => {
    debugScanner('Stopping scanner', { usingNativeScanner, isScanning });
    nativeScanHandledRef.current = false;

    if (usingNativeScanner) {
      try {
        const nativeScanner = await getNativeScanner();
        if (nativeScanner) {
          await nativeScanner.BarcodeScanner.stopScan();
          debugScanner('Native stopScan succeeded from stopScanner');
        }
      } catch (e) {
        console.error('Error stopping native scanner:', e);
        debugScanner('Native stopScan failed from stopScanner', e);
      }
      await clearNativeListeners();
      setUsingNativeScanner(false);
    }

    if (scannerRef.current && isScanning) {
      try {
        await scannerRef.current.stop();
        debugScanner('Web scanner stop succeeded');
      } catch (e) {
        console.error('Error stopping scanner:', e);
        debugScanner('Web scanner stop failed', e);
      }
    }

    scannerRef.current = null;
    setTorchOn(false);
    setZoomRatio(1);
    setFocusPoint(null);
    setIsScanning(false);
    debugScanner('Scanner stopped');
  }, [clearNativeListeners, debugScanner, isScanning, usingNativeScanner]);

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
      } catch {
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
      } catch {
        toast.info('Flashlight not available');
      }
    }
  }, [torchOn, usingNativeScanner]);

  const setNativeZoom = useCallback(async (target: number) => {
    if (!usingNativeScanner) return;
    const clamped = Math.max(zoomLimits.min, Math.min(zoomLimits.max, Number(target.toFixed(2))));
    try {
      const nativeScanner = await getNativeScanner();
      if (!nativeScanner) return;
      await nativeScanner.BarcodeScanner.setZoomRatio?.({ zoomRatio: clamped });
      setZoomRatio(clamped);
      debugScanner('Native zoom changed', { requested: target, applied: clamped });
    } catch (err) {
      debugScanner('Native setZoomRatio failed', err);
      toast.info('Zoom not available on this device');
    }
  }, [debugScanner, usingNativeScanner, zoomLimits.max, zoomLimits.min]);

  // Tap-to-focus: the @capacitor-mlkit plugin doesn't expose setFocusPoint,
  // so we trigger a tiny zoom nudge which forces iOS AVCaptureDevice to
  // re-run continuous autofocus, while showing a focus ring at the tap point.
  const handleTapToFocus = useCallback(async (e: React.PointerEvent<HTMLDivElement>) => {
    if (!usingNativeScanner) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setFocusPoint({ x, y, key: Date.now() });
    debugScanner('Tap-to-focus', { x: Math.round(x), y: Math.round(y) });

    if (focusBusyRef.current) return;
    focusBusyRef.current = true;
    try {
      const nativeScanner = await getNativeScanner();
      if (!nativeScanner?.BarcodeScanner?.setZoomRatio) return;
      const current = zoomRatio;
      const nudge = current + (current >= zoomLimits.max - 0.05 ? -0.05 : 0.05);
      const clampedNudge = Math.max(zoomLimits.min, Math.min(zoomLimits.max, nudge));
      await nativeScanner.BarcodeScanner.setZoomRatio({ zoomRatio: clampedNudge });
      await new Promise((r) => setTimeout(r, 120));
      await nativeScanner.BarcodeScanner.setZoomRatio({ zoomRatio: current });
    } catch (err) {
      debugScanner('Tap-to-focus nudge failed', err);
    } finally {
      focusBusyRef.current = false;
    }
  }, [debugScanner, usingNativeScanner, zoomLimits.max, zoomLimits.min, zoomRatio]);

  const handleConfirmMedication = useCallback(() => {
    if (scannedResult) {
      onMedicationScanned(scannedResult);
      toast.success(`${scannedResult.name} added successfully!`);
    }
  }, [scannedResult, onMedicationScanned]);

  const handleRetry = useCallback(async () => {
    await stopScanner();
    setScannedResult(null);
    setError(null);
    setDebugError(null);
    setLabelPhoto(null);
    setLabelNotes([]);
    setScannerStarted(false);
    if (labelFileInputRef.current) {
      labelFileInputRef.current.value = '';
    }
  }, [stopScanner]);

  const switchToManualMode = useCallback(async () => {
    await stopScanner();
    setMode('manual');
    setError(null);
    setDebugError(null);
    setScannedResult(null);
    setScannerStarted(false);
    setLabelPhoto(null);
    setLabelNotes([]);
  }, [stopScanner]);

  const switchToNameSearch = useCallback(async () => {
    await stopScanner();
    setMode('name');
    setError(null);
    setDebugError(null);
    setScannedResult(null);
    setNameSearchResults([]);
    setDrugNameQuery('');
    setScannerStarted(false);
    setLabelPhoto(null);
    setLabelNotes([]);
  }, [stopScanner]);

  const switchToLabelMode = useCallback(async () => {
    await stopScanner();
    setMode('label');
    setError(null);
    setDebugError(null);
    setScannedResult(null);
    setScannerStarted(false);
    setLabelNotes([]);
  }, [stopScanner]);

  const switchToCameraMode = useCallback(async () => {
    await stopScanner();
    setMode('camera');
    setError(null);
    setDebugError(null);
    setScannedResult(null);
    setManualNdc('');
    setDrugNameQuery('');
    setNameSearchResults([]);
    setLabelPhoto(null);
    setLabelNotes([]);
    setScannerStarted(false);
    if (labelFileInputRef.current) {
      labelFileInputRef.current.value = '';
    }
  }, [stopScanner]);

  const formatNdcInput = (value: string): string => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 5) {
      return numbers;
    }
    if (numbers.length <= 9) {
      return `${numbers.slice(0, 5)}-${numbers.slice(5)}`;
    }
    return `${numbers.slice(0, 5)}-${numbers.slice(5, 9)}-${numbers.slice(9, 11)}`;
  };

  const handleManualNdcChange = (e: ChangeEvent<HTMLInputElement>) => {
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
        setError('Medication not found in FDA database. This may be a pharmacy-only code from the bottle label.');
      }
    } catch (err) {
      console.error('Manual lookup error:', err);
      setError('Error looking up medication. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLabelCapture = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setLabelPhoto(event.target?.result as string);
      setLabelNotes([]);
      setError(null);
      setDebugError(null);
      setScannedResult(null);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleAnalyzeLabel = useCallback(async () => {
    if (!labelPhoto) return;
    await readPrescriptionLabel(labelPhoto);
  }, [labelPhoto, readPrescriptionLabel]);

  const handleRetakeLabel = useCallback(() => {
    setLabelPhoto(null);
    setLabelNotes([]);
    setError(null);
    setDebugError(null);
    if (labelFileInputRef.current) {
      labelFileInputRef.current.value = '';
    }
  }, []);

  const handleUserStartScanner = useCallback(async () => {
    setScannerStarted(true);
    await startScanner();
  }, [startScanner]);

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

    if (nameSearchAbortRef.current) {
      nameSearchAbortRef.current.abort();
    }

    const abortController = new AbortController();
    nameSearchAbortRef.current = abortController;

    const timer = window.setTimeout(async () => {
      try {
        const { data, error } = await supabase.functions.invoke('ndc-lookup', {
          body: { name: query },
        });

        if (abortController.signal.aborted) return;

        const status = (error as any)?.context?.status ?? (error as any)?.status;
        if (error) {
          if (status === 404 || error.message?.includes('404')) {
            setNameSearchResults([]);
            setError('No medications found. Try a different spelling.');
            return;
          }
          throw error;
        }

        if (data?.success && data?.medications?.length) {
          setNameSearchResults(data.medications.map((med: ScannedMedication) => ({ ...med, source: 'label' })));
        } else {
          setNameSearchResults([]);
          setError('No medications found. Try a different spelling.');
        }
      } catch (err) {
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
      window.clearTimeout(timer);
      abortController.abort();
    };
  }, [drugNameQuery, mode]);

  useEffect(() => {
    return () => {
      if (nameSearchAbortRef.current) {
        nameSearchAbortRef.current.abort();
      }
      void stopScanner();
    };
  }, [stopScanner]);

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col ${usingNativeScanner && isScanning && mode === 'camera' ? 'bg-transparent' : 'bg-background'}`}
    >
      <header className="flex items-center gap-3 p-4 bg-card border-b border-border">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            void stopScanner();
            onClose();
          }}
          aria-label="Cancel"
          className="shrink-0 h-11 w-11 rounded-full"
        >
          <X className="w-6 h-6" />
        </Button>
        <h1 className="flex-1 text-xl font-bold text-center truncate">
          {mode === 'camera'
            ? 'Scan Prescription'
            : mode === 'manual'
              ? 'Enter NDC Code'
              : mode === 'name'
                ? 'Search Drug'
                : 'Scan Bottle Label'}
        </h1>
        <div className="w-11 shrink-0" />
      </header>

      <div
        className={`flex-1 flex flex-col items-center justify-center p-6 overflow-auto ${usingNativeScanner && isScanning && mode === 'camera' ? 'bg-transparent' : 'bg-muted'}`}
      >
        {mode === 'camera' && !scannedResult && !error && (
          <>
            {!scannerStarted && !isScanning && !usingNativeScanner && (
              <div className="text-center space-y-6 w-full max-w-md">
                <div className="w-24 h-24 bg-primary/20 rounded-3xl flex items-center justify-center mx-auto">
                  <Camera className="w-14 h-14 text-primary" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-elder-xl font-bold text-foreground">Scan Prescription Barcode</h2>
                  <p className="text-muted-foreground text-lg">
                    Use barcode scan for a real NDC code, or scan the printed bottle label directly if the bottle uses a pharmacy barcode.
                  </p>
                </div>
                <div className="space-y-3">
                  <Button variant="default" size="xl" onClick={handleUserStartScanner} className="w-full gap-3">
                    <Camera className="w-6 h-6" />
                    Open Barcode Scanner
                  </Button>
                  <Button variant="outline" size="xl" onClick={() => void switchToLabelMode()} className="w-full gap-3">
                    <ScanLine className="w-6 h-6" />
                    Scan Bottle Label Instead
                  </Button>
                </div>
              </div>
            )}

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

            {usingNativeScanner && isScanning && nativePlatform !== 'ios' && (
              <>
                {/* Tap-to-focus overlay over the native camera feed */}
                <div
                  className="fixed inset-0 z-10"
                  onPointerDown={handleTapToFocus}
                  role="button"
                  aria-label="Tap to focus camera"
                >
                  {/* Centered framing guide */}
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <div className="relative w-[78vw] max-w-md aspect-[2/1]">
                      <div className="absolute -top-1 -left-1 w-12 h-12 border-t-4 border-l-4 border-primary rounded-tl-xl" />
                      <div className="absolute -top-1 -right-1 w-12 h-12 border-t-4 border-r-4 border-primary rounded-tr-xl" />
                      <div className="absolute -bottom-1 -left-1 w-12 h-12 border-b-4 border-l-4 border-primary rounded-bl-xl" />
                      <div className="absolute -bottom-1 -right-1 w-12 h-12 border-b-4 border-r-4 border-primary rounded-br-xl" />
                      <div className="absolute top-1/2 left-2 right-2 h-0.5 bg-primary/70 animate-pulse" />
                    </div>
                  </div>

                  {/* Focus ring at tap point */}
                  {focusPoint && (
                    <div
                      key={focusPoint.key}
                      className="pointer-events-none absolute w-20 h-20 -ml-10 -mt-10 rounded-full border-4 border-primary animate-ping-once"
                      style={{ left: focusPoint.x, top: focusPoint.y, animation: 'focus-ring 700ms ease-out forwards' }}
                      onAnimationEnd={() => setFocusPoint(null)}
                    />
                  )}
                </div>

                <div className="w-full max-w-md mt-auto relative z-20">
                  <Card className="border-border bg-card/95 shadow-elder-lg backdrop-blur supports-[backdrop-filter]:bg-card/85">
                    <div className="p-5 text-center space-y-4">
                      <div className="flex items-center justify-center gap-3 text-foreground">
                        <ScanLine className="w-7 h-7 text-primary" />
                        <p className="text-elder-lg font-semibold">Hold steady — center the barcode</p>
                      </div>
                      <p className="text-muted-foreground">
                        Move closer (about 4–6 inches), keep the bottle steady, and use zoom if the code is small.
                      </p>

                      {/* Zoom assist controls */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm font-semibold text-foreground">
                          <span>Zoom</span>
                          <span className="text-primary">{zoomRatio.toFixed(1)}×</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="lg"
                            onClick={() => void setNativeZoom(zoomRatio - 0.5)}
                            disabled={zoomRatio <= zoomLimits.min + 0.01}
                            aria-label="Zoom out"
                            className="h-12 w-12 p-0"
                          >
                            <ZoomOut className="w-5 h-5" />
                          </Button>
                          <div className="flex-1 grid grid-cols-3 gap-2">
                            {[1, 2, 3].map((preset) => {
                              const disabled = preset < zoomLimits.min || preset > zoomLimits.max;
                              const active = Math.abs(zoomRatio - preset) < 0.05;
                              return (
                                <Button
                                  key={preset}
                                  variant={active ? 'default' : 'outline'}
                                  size="lg"
                                  disabled={disabled}
                                  onClick={() => void setNativeZoom(preset)}
                                  className="h-12"
                                >
                                  {preset}×
                                </Button>
                              );
                            })}
                          </div>
                          <Button
                            variant="outline"
                            size="lg"
                            onClick={() => void setNativeZoom(zoomRatio + 0.5)}
                            disabled={zoomRatio >= zoomLimits.max - 0.01}
                            aria-label="Zoom in"
                            className="h-12 w-12 p-0"
                          >
                            <ZoomIn className="w-5 h-5" />
                          </Button>
                        </div>
                      </div>

                      <div className="flex gap-3 pt-1">
                        <Button variant="outline" size="lg" onClick={toggleTorch} className="flex-1 gap-2">
                          <Flashlight className={`w-5 h-5 ${torchOn ? 'text-primary' : ''}`} />
                          Light
                        </Button>
                        <Button variant="outline" size="lg" onClick={() => void switchToLabelMode()} className="flex-1 gap-2">
                          <ScanLine className="w-5 h-5" />
                          Bottle Label
                        </Button>
                      </div>
                    </div>
                  </Card>
                </div>
              </>
            )}

            {scannerStarted && !usingNativeScanner && (
              <div className="mt-8 text-center space-y-4 max-w-md">
                <div className="flex items-center justify-center gap-3 text-foreground">
                  <ScanLine className="w-8 h-8 text-primary" />
                  <p className="text-elder-lg">Point camera at barcode on prescription label</p>
                </div>
                <p className="text-muted-foreground text-lg">
                  If this bottle uses a pharmacy barcode instead of an FDA NDC, switch to Scan Bottle Label.
                </p>
              </div>
            )}

            {isScanning && !usingNativeScanner && (
              <div className="mt-8 flex gap-4">
                <Button variant="outline" size="xl" onClick={toggleTorch} className="gap-3">
                  <Flashlight className={`w-6 h-6 ${torchOn ? 'text-primary' : ''}`} />
                  Light
                </Button>
                <Button variant="outline" size="xl" onClick={() => void switchToLabelMode()} className="gap-3">
                  <ScanLine className="w-6 h-6" />
                  Bottle Label
                </Button>
              </div>
            )}
          </>
        )}

        {mode === 'manual' && !scannedResult && (
          <Card className="w-full max-w-md p-8 space-y-6 bg-card border-2 border-border shadow-elder-lg">
            <div className="text-center space-y-2">
              <div className="w-20 h-20 bg-primary/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Keyboard className="w-12 h-12 text-primary" />
              </div>
              <h2 className="text-elder-xl font-bold text-foreground">Enter NDC Code</h2>
              <p className="text-muted-foreground text-lg">
                Find the 10 or 11 digit NDC code on your prescription label.
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
          </Card>
        )}

        {mode === 'name' && !scannedResult && (
          <Card className="w-full max-w-md p-8 space-y-6 bg-card border-2 border-border shadow-elder-lg">
            <div className="text-center space-y-2">
              <div className="w-20 h-20 bg-primary/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Search className="w-12 h-12 text-primary" />
              </div>
              <h2 className="text-elder-xl font-bold text-foreground">Search by Drug Name</h2>
              <p className="text-muted-foreground text-lg">
                Enter the brand or generic name of your medication.
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

            {nameSearchResults.length > 0 && (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                <p className="text-sm text-muted-foreground font-medium">
                  {nameSearchResults.length} result(s) found — tap to select:
                </p>
                {nameSearchResults.map((med, index) => (
                  <button
                    key={`${med.ndcCode || med.name}-${index}`}
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

        {mode === 'label' && !scannedResult && (
          <Card className="w-full max-w-md p-8 space-y-6 bg-card border-2 border-border shadow-elder-lg">
            <div className="text-center space-y-2">
              <div className="w-20 h-20 bg-primary/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <ScanLine className="w-12 h-12 text-primary" />
              </div>
              <h2 className="text-elder-xl font-bold text-foreground">Scan Bottle Label</h2>
              <p className="text-muted-foreground text-lg">
                Take a clear photo of the printed prescription label on the bottle and we’ll read the medication details for you.
              </p>
            </div>

            <input
              ref={labelFileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleLabelCapture}
              className="hidden"
            />

            {!labelPhoto ? (
              <div className="space-y-3">
                <Button variant="default" size="xl" onClick={() => labelFileInputRef.current?.click()} className="w-full gap-3">
                  <Camera className="w-6 h-6" />
                  Open Camera
                </Button>
                <Button
                  variant="outline"
                  size="xl"
                  onClick={() => {
                    if (labelFileInputRef.current) {
                      labelFileInputRef.current.removeAttribute('capture');
                      labelFileInputRef.current.click();
                      window.setTimeout(() => labelFileInputRef.current?.setAttribute('capture', 'environment'), 500);
                    }
                  }}
                  className="w-full gap-3"
                >
                  <Search className="w-6 h-6" />
                  Upload Photo
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-2xl overflow-hidden border-2 border-border bg-muted">
                  <img src={labelPhoto} alt="Prescription bottle label" className="w-full h-64 object-cover" />
                </div>

                {labelNotes.length > 0 && !error && (
                  <div className="bg-muted rounded-xl p-4 space-y-2">
                    <p className="text-sm font-semibold text-foreground">Tips from the label read</p>
                    <ul className="space-y-1 text-sm text-muted-foreground list-disc pl-4">
                      {labelNotes.map((note, index) => (
                        <li key={`${note}-${index}`}>{note}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {error && (
                  <div className="bg-destructive/10 border-2 border-destructive/30 rounded-xl p-4">
                    <p className="text-destructive text-center">{error}</p>
                    {debugError && (
                      <p className="text-xs font-mono text-muted-foreground mt-2 break-all">{debugError}</p>
                    )}
                  </div>
                )}

                <Button variant="default" size="xl" onClick={handleAnalyzeLabel} disabled={isLoading} className="w-full gap-3">
                  {isLoading ? (
                    <>
                      <Loader2 className="w-6 h-6 animate-spin" />
                      Reading Label...
                    </>
                  ) : (
                    <>
                      <ScanLine className="w-6 h-6" />
                      Read Bottle Label
                    </>
                  )}
                </Button>
                <Button variant="outline" size="xl" onClick={handleRetakeLabel} className="w-full gap-3">
                  <RotateCcw className="w-6 h-6" />
                  Retake Photo
                </Button>
              </div>
            )}
          </Card>
        )}

        {error && mode === 'camera' && (
          <Card className="w-full max-w-md p-8 text-center space-y-6 bg-card border-2 border-border shadow-elder-lg">
            <div className="w-24 h-24 bg-destructive/20 rounded-3xl flex items-center justify-center mx-auto">
              <Camera className="w-14 h-14 text-destructive" />
            </div>
            <div className="space-y-2">
              <h2 className="text-elder-xl font-bold text-foreground">Camera Issue</h2>
              <p className="text-muted-foreground text-lg">{error}</p>
              {debugError && (
                <div className="mt-3 p-3 bg-muted rounded-lg text-left">
                  <p className="text-xs font-mono text-muted-foreground break-all">
                    <span className="font-bold">Debug:</span> {debugError}
                  </p>
                </div>
              )}
            </div>
            <div className="flex flex-col gap-3">
              <Button variant="default" size="xl" onClick={() => void handleRetry()} className="w-full gap-3">
                <RotateCcw className="w-6 h-6" />
                Try Again
              </Button>
              <Button variant="outline" size="xl" onClick={() => void switchToLabelMode()} className="w-full gap-3">
                <ScanLine className="w-6 h-6" />
                Scan Bottle Label
              </Button>
              <Button variant="outline" size="xl" onClick={() => void switchToManualMode()} className="w-full gap-3">
                <Keyboard className="w-6 h-6" />
                Enter NDC Code
              </Button>
              <Button variant="outline" size="xl" onClick={() => void switchToNameSearch()} className="w-full gap-3">
                <Search className="w-6 h-6" />
                Search by Drug Name
              </Button>
            </div>
          </Card>
        )}

        {scannedResult && (
          <Card className="w-full max-w-md p-8 space-y-6 bg-card border-3 border-success shadow-elder-lg">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 bg-success/20 rounded-2xl flex items-center justify-center">
                <Pill className="w-12 h-12 text-success" />
              </div>
              <div className="flex-1 space-y-2">
                <h2 className="text-elder-xl text-foreground">{scannedResult.name}</h2>
                {scannedResult.genericName && (
                  <p className="text-muted-foreground text-lg">{scannedResult.genericName}</p>
                )}
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">
                    {scannedResult.source === 'label' ? 'Bottle label match' : 'Barcode match'}
                  </Badge>
                  {scannedResult.source === 'label' && scannedResult.confidence && (
                    <Badge variant="outline" className={labelConfidenceStyles[scannedResult.confidence]}>
                      {scannedResult.confidence} confidence
                    </Badge>
                  )}
                </div>
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

            {scannedResult.ndcCode && (
              <div className="bg-muted rounded-xl p-4">
                <p className="text-sm text-muted-foreground uppercase tracking-wide">NDC Code</p>
                <p className="text-lg font-mono text-foreground">{scannedResult.ndcCode}</p>
              </div>
            )}

            {scannedResult.manufacturer && (
              <div className="bg-muted rounded-xl p-4">
                <p className="text-sm text-muted-foreground uppercase tracking-wide">Manufacturer</p>
                <p className="text-elder text-foreground">{scannedResult.manufacturer}</p>
              </div>
            )}

            {scannedResult.prescriber && (
              <div className="bg-muted rounded-xl p-4">
                <p className="text-sm text-muted-foreground uppercase tracking-wide">Prescriber</p>
                <p className="text-elder text-foreground">{scannedResult.prescriber}</p>
              </div>
            )}

            {scannedResult.route && (
              <div className="bg-muted rounded-xl p-4">
                <p className="text-sm text-muted-foreground uppercase tracking-wide">Route</p>
                <p className="text-elder text-foreground">{scannedResult.route}</p>
              </div>
            )}

            {scannedResult.instructions && (
              <div className="bg-muted rounded-xl p-4">
                <p className="text-sm text-muted-foreground uppercase tracking-wide">Instructions</p>
                <p className="text-elder text-foreground">{scannedResult.instructions}</p>
              </div>
            )}

            {scannedResult.purpose && (
              <div className="bg-muted rounded-xl p-4">
                <p className="text-sm text-muted-foreground uppercase tracking-wide">Purpose</p>
                <p className="text-elder text-foreground">{scannedResult.purpose}</p>
              </div>
            )}

            {labelNotes.length > 0 && scannedResult.source === 'label' && (
              <div className="bg-muted rounded-xl p-4 space-y-2">
                <p className="text-sm text-muted-foreground uppercase tracking-wide">Label Notes</p>
                <ul className="space-y-1 text-sm text-foreground list-disc pl-4">
                  {labelNotes.map((note, index) => (
                    <li key={`${note}-${index}`}>{note}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex gap-4 pt-4">
              <Button variant="outline" size="xl" onClick={() => void handleRetry()} className="flex-1 gap-3">
                <RotateCcw className="w-6 h-6" />
                {mode === 'camera' ? 'Scan Again' : 'Try Another'}
              </Button>
              <Button variant="default" size="xl" onClick={handleConfirmMedication} className="flex-1 gap-3">
                <Check className="w-6 h-6" />
                Add Medication
              </Button>
            </div>
          </Card>
        )}
      </div>

      <div className="p-4 bg-card border-t-2 border-border space-y-2">
        {mode === 'camera' && !scannedResult && (
          <div className="flex flex-col items-center gap-2">
            <p className="text-center text-muted-foreground text-lg">
              Can&apos;t scan?{' '}
              <Button variant="link" className="text-lg p-0 h-auto text-primary font-semibold" onClick={() => void switchToLabelMode()}>
                Scan bottle label
              </Button>
              ,{' '}
              <Button variant="link" className="text-lg p-0 h-auto text-primary font-semibold" onClick={() => void switchToManualMode()}>
                enter NDC code
              </Button>
              {' '}or{' '}
              <Button variant="link" className="text-lg p-0 h-auto text-primary font-semibold" onClick={() => void switchToNameSearch()}>
                search by name
              </Button>
            </p>
          </div>
        )}

        {mode === 'manual' && !scannedResult && (
          <ModeSwitcher
            current="manual"
            onCamera={() => void switchToCameraMode()}
            onLabel={() => void switchToLabelMode()}
            onManual={() => void switchToManualMode()}
            onSearch={() => void switchToNameSearch()}
          />
        )}

        {mode === 'name' && !scannedResult && (
          <ModeSwitcher
            current="name"
            onCamera={() => void switchToCameraMode()}
            onLabel={() => void switchToLabelMode()}
            onManual={() => void switchToManualMode()}
            onSearch={() => void switchToNameSearch()}
          />
        )}

        {mode === 'label' && !scannedResult && (
          <ModeSwitcher
            current="label"
            onCamera={() => void switchToCameraMode()}
            onLabel={() => void switchToLabelMode()}
            onManual={() => void switchToManualMode()}
            onSearch={() => void switchToNameSearch()}
          />
        )}
      </div>
    </div>
  );
}

type ModeSwitcherProps = {
  current: 'camera' | 'manual' | 'name' | 'label';
  onCamera: () => void;
  onLabel: () => void;
  onManual: () => void;
  onSearch: () => void;
};

function ModeSwitcher({ current, onCamera, onLabel, onManual, onSearch }: ModeSwitcherProps) {
  const allItems: { key: ModeSwitcherProps['current']; label: string; Icon: typeof Camera; onClick: () => void }[] = [
    { key: 'camera', label: 'Barcode', Icon: Camera, onClick: onCamera },
    { key: 'label', label: 'Label', Icon: ScanLine, onClick: onLabel },
    { key: 'manual', label: 'NDC', Icon: Keyboard, onClick: onManual },
    { key: 'name', label: 'Search', Icon: Search, onClick: onSearch },
  ];
  const items = allItems.filter((i) => i.key !== current);

  return (
    <div className="w-full max-w-md mt-6">
      <p className="text-xs uppercase tracking-wider text-muted-foreground text-center mb-3">
        Try another way
      </p>
      <div className="grid grid-cols-3 gap-3">
        {items.map(({ key, label, Icon, onClick }) => (
          <button
            key={key}
            type="button"
            onClick={onClick}
            className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-card border border-border hover:bg-accent hover:border-primary/40 transition-colors min-h-[88px]"
          >
            <Icon className="w-6 h-6 text-primary" />
            <span className="text-sm font-medium text-foreground">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
