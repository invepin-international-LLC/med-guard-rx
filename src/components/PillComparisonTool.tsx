import { useState, useRef, useCallback } from 'react';
import { Camera, Search, Loader2, RotateCcw, AlertTriangle, ArrowLeft, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { supabase } from '@/integrations/supabase/client';
import { MedicalDisclaimer } from './MedicalDisclaimer';
import { toast } from 'sonner';

interface PillComparisonToolProps {
  onClose?: () => void;
  initialPhoto?: string | null;
  initialDrugName?: string | null;
}

export function PillComparisonTool({ onClose, initialPhoto, initialDrugName }: PillComparisonToolProps) {
  const [userPhoto, setUserPhoto] = useState<string | null>(initialPhoto || null);
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [referenceSource, setReferenceSource] = useState<'dailymed' | 'ai-generated' | null>(null);
  const [drugName, setDrugName] = useState(initialDrugName || '');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'capture' | 'search' | 'compare'>(initialPhoto ? 'search' : 'capture');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCapture = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      setUserPhoto(ev.target?.result as string);
      setStep('search');
    };
    reader.readAsDataURL(file);
  }, []);

  const handleSearch = useCallback(async () => {
    if (!drugName.trim()) {
      toast.error('Please enter a medication name');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('rximage-lookup', {
        body: { name: drugName.trim() },
      });

      if (error) throw error;

      if (data?.imageUrl) {
        setReferenceImage(data.imageUrl);
        setReferenceSource(data.source || 'dailymed');
        setStep('compare');
      } else {
        toast.error('No verified image found for this medication. Try the generic name.');
      }
    } catch (err) {
      console.error('Image lookup error:', err);
      toast.error('Failed to look up medication image. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [drugName]);

  const handleReset = useCallback(() => {
    setUserPhoto(null);
    setReferenceImage(null);
    setReferenceSource(null);
    setDrugName('');
    setStep('capture');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        {step !== 'capture' && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setStep(step === 'compare' ? 'search' : 'capture')}
            className="gap-1"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
        )}
        {onClose && (
          <Button variant="ghost" size="sm" onClick={onClose} className="ml-auto">
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Step 1: Capture Photo */}
      {step === 'capture' && (
        <Card className="p-6 space-y-4 border-2 border-border bg-card">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 bg-primary/20 rounded-2xl flex items-center justify-center mx-auto">
              <Camera className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-lg font-bold text-foreground">Take a Photo of Your Pill</h3>
            <p className="text-sm text-muted-foreground">
              Place the pill on a flat, well-lit surface and snap a clear photo.
            </p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleCapture}
            className="hidden"
          />

          <Button
            className="w-full gap-2"
            size="lg"
            onClick={() => fileInputRef.current?.click()}
          >
            <Camera className="w-5 h-5" />
            Open Camera
          </Button>

          <Button
            variant="outline"
            className="w-full gap-2"
            size="lg"
            onClick={() => {
              // Remove capture attr so user can pick from gallery
              if (fileInputRef.current) {
                fileInputRef.current.removeAttribute('capture');
                fileInputRef.current.click();
                // Restore capture attr after
                setTimeout(() => fileInputRef.current?.setAttribute('capture', 'environment'), 500);
              }
            }}
          >
            Upload from Gallery
          </Button>
        </Card>
      )}

      {/* Step 2: Search for medication */}
      {step === 'search' && (
        <Card className="p-6 space-y-4 border-2 border-border bg-card">
          {/* Thumbnail of user photo */}
          {userPhoto && (
            <div className="w-24 h-24 mx-auto rounded-xl overflow-hidden border-2 border-border">
              <img src={userPhoto} alt="Your pill" className="w-full h-full object-cover" />
            </div>
          )}

          <div className="text-center space-y-1">
            <h3 className="text-lg font-bold text-foreground">What medication is this?</h3>
            <p className="text-sm text-muted-foreground">
              Enter the name printed on the label or bottle to find the verified image.
            </p>
          </div>

          <div className="flex gap-2">
            <Input
              placeholder="e.g. Lisinopril, Metformin..."
              value={drugName}
              onChange={(e) => setDrugName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="flex-1"
              autoFocus
            />
            <Button onClick={handleSearch} disabled={loading || !drugName.trim()}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Tip: Try the generic name for better results (e.g. "atorvastatin" instead of "Lipitor")
          </p>
        </Card>
      )}

      {/* Step 3: Side-by-side comparison */}
      {step === 'compare' && userPhoto && referenceImage && (
        <div className="space-y-4">
          {/* Warning banner */}
          <div className="flex items-start gap-2 bg-destructive/10 border border-destructive/30 rounded-xl p-3">
            <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
            <p className="text-xs text-foreground">
              Visual comparison alone <strong>cannot confirm</strong> a pill is genuine. Use fentanyl test strips for reliable detection. When in doubt, do not take the pill.
            </p>
          </div>

          {/* Side-by-side */}
          <div className="grid grid-cols-2 gap-3">
            {/* User photo */}
            <div className="space-y-2">
              <p className="text-xs font-bold text-center text-muted-foreground uppercase tracking-wide">
                Your Pill
              </p>
              <div className="rounded-xl overflow-hidden border-2 border-border bg-muted">
                <AspectRatio ratio={1}>
                  <img src={userPhoto} alt="Your pill photo" className="w-full h-full object-cover" />
                </AspectRatio>
              </div>
            </div>

            {/* Reference image */}
            <div className="space-y-2">
              <p className="text-xs font-bold text-center text-muted-foreground uppercase tracking-wide">
                Verified Image
              </p>
              <div className="rounded-xl overflow-hidden border-2 border-primary/50 bg-muted">
                <AspectRatio ratio={1}>
                  <img src={referenceImage} alt="Verified medication image" className="w-full h-full object-contain" />
                </AspectRatio>
              </div>
            </div>
          </div>

          {/* Source badge */}
          <p className="text-xs text-muted-foreground text-center">
            Reference image source: {referenceSource === 'dailymed' ? '✅ DailyMed (NIH/NLM)' : '🤖 AI-generated (illustrative only)'}
          </p>

          {/* Checklist */}
          <Card className="p-4 space-y-3 border-2 border-border bg-card">
            <p className="font-bold text-sm text-foreground">Compare these features:</p>
            <ul className="space-y-2 text-sm text-foreground">
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span><strong>Color</strong> — Does the color match exactly?</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span><strong>Shape</strong> — Same shape (round, oval, oblong)?</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span><strong>Imprint</strong> — Same letters, numbers, or logos?</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span><strong>Size</strong> — Roughly the same size?</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span><strong>Edges</strong> — Clean and crisp, or rough/crumbling?</span>
              </li>
            </ul>
          </Card>

          {/* Actions */}
          <Button variant="outline" className="w-full gap-2" onClick={handleReset}>
            <RotateCcw className="w-4 h-4" />
            Compare Another Pill
          </Button>

          {/* Citations & disclaimer (Apple Guideline 1.4.1) */}
          <div className="mt-4">
            <MedicalDisclaimer
              variant="compact"
              extraSources={[
                { label: 'NIH Pillbox — Pill Identifier', url: 'https://pillbox.nlm.nih.gov/' },
              ]}
            />
          </div>
        </div>
      )}
    </div>
  );
}
