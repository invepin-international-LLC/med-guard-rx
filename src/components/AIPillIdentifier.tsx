import { useState, useRef, useCallback } from 'react';
import { Camera, Loader2, RotateCcw, AlertTriangle, Sparkles, ShieldAlert, X, ScanSearch } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PillCharacteristics {
  imprint: string;
  color: string;
  shape: string;
  size: string;
  scoring?: string;
  coating?: string;
  additional_notes?: string;
}

interface PillMatch {
  name: string;
  strength: string;
  manufacturer?: string;
  confidence: 'high' | 'medium' | 'low';
  reason: string;
}

interface IdentifyResult {
  characteristics: PillCharacteristics;
  matches: PillMatch[];
  warnings: string[];
}

interface AIPillIdentifierProps {
  onClose?: () => void;
  onCompare?: (photo: string, drugName: string) => void;
}

const confidenceColors: Record<string, string> = {
  high: 'bg-emerald-500/20 text-emerald-700 border-emerald-500/30',
  medium: 'bg-amber-500/20 text-amber-700 border-amber-500/30',
  low: 'bg-muted text-muted-foreground border-border',
};

export function AIPillIdentifier({ onClose, onCompare }: AIPillIdentifierProps) {
  const [photo, setPhoto] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<IdentifyResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCapture = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setPhoto(ev.target?.result as string);
      setResult(null);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleIdentify = useCallback(async () => {
    if (!photo) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('identify-pill', {
        body: { imageBase64: photo },
      });

      if (error) throw error;
      if (data?.error) {
        toast.error(data.error);
        return;
      }
      if (data?.success) {
        setResult({
          characteristics: data.characteristics,
          matches: data.matches,
          warnings: data.warnings,
        });
      } else {
        toast.error('Could not identify the pill. Try a clearer photo.');
      }
    } catch (err) {
      console.error('Pill identification error:', err);
      toast.error('Failed to analyze pill. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [photo]);

  const handleReset = useCallback(() => {
    setPhoto(null);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div />
        {onClose && (
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* No photo yet */}
      {!photo && (
        <Card className="p-6 space-y-4 border-2 border-border bg-card">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 bg-primary/20 rounded-2xl flex items-center justify-center mx-auto">
              <Sparkles className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-lg font-bold text-foreground">AI Pill Identifier</h3>
            <p className="text-sm text-muted-foreground">
              Snap a photo and our AI will detect the imprint, color, shape, and suggest possible medications.
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

          <Button className="w-full gap-2" size="lg" onClick={() => fileInputRef.current?.click()}>
            <Camera className="w-5 h-5" />
            Take Photo
          </Button>

          <Button
            variant="outline"
            className="w-full gap-2"
            size="lg"
            onClick={() => {
              if (fileInputRef.current) {
                fileInputRef.current.removeAttribute('capture');
                fileInputRef.current.click();
                setTimeout(() => fileInputRef.current?.setAttribute('capture', 'environment'), 500);
              }
            }}
          >
            Upload from Gallery
          </Button>
        </Card>
      )}

      {/* Photo taken, show preview + identify button */}
      {photo && !result && (
        <div className="space-y-4">
          <div className="rounded-xl overflow-hidden border-2 border-border bg-muted max-w-[240px] mx-auto">
            <AspectRatio ratio={1}>
              <img src={photo} alt="Pill photo" className="w-full h-full object-cover" />
            </AspectRatio>
          </div>

          <Button
            className="w-full gap-2"
            size="lg"
            onClick={handleIdentify}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Analyzing…
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Identify This Pill
              </>
            )}
          </Button>

          <Button variant="outline" className="w-full gap-2" onClick={handleReset}>
            <RotateCcw className="w-4 h-4" />
            Retake Photo
          </Button>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-4">
          {/* Photo thumbnail */}
          {photo && (
            <div className="w-20 h-20 mx-auto rounded-xl overflow-hidden border-2 border-border">
              <img src={photo} alt="Analyzed pill" className="w-full h-full object-cover" />
            </div>
          )}

          {/* Characteristics */}
          <Card className="p-4 space-y-3 border-2 border-border bg-card">
            <p className="font-bold text-sm text-foreground">Detected Characteristics</p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="bg-muted/50 rounded-lg p-2">
                <p className="text-xs text-muted-foreground">Imprint</p>
                <p className="font-semibold text-foreground">{result.characteristics.imprint || 'None visible'}</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-2">
                <p className="text-xs text-muted-foreground">Color</p>
                <p className="font-semibold text-foreground">{result.characteristics.color}</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-2">
                <p className="text-xs text-muted-foreground">Shape</p>
                <p className="font-semibold text-foreground">{result.characteristics.shape}</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-2">
                <p className="text-xs text-muted-foreground">Size</p>
                <p className="font-semibold text-foreground capitalize">{result.characteristics.size}</p>
              </div>
              {result.characteristics.scoring && result.characteristics.scoring !== 'none' && (
                <div className="bg-muted/50 rounded-lg p-2">
                  <p className="text-xs text-muted-foreground">Scoring</p>
                  <p className="font-semibold text-foreground">{result.characteristics.scoring}</p>
                </div>
              )}
              {result.characteristics.coating && (
                <div className="bg-muted/50 rounded-lg p-2">
                  <p className="text-xs text-muted-foreground">Coating</p>
                  <p className="font-semibold text-foreground">{result.characteristics.coating}</p>
                </div>
              )}
            </div>
            {result.characteristics.additional_notes && (
              <p className="text-xs text-muted-foreground">{result.characteristics.additional_notes}</p>
            )}
          </Card>

          {/* Matches */}
          {result.matches.length > 0 && (
            <Card className="p-4 space-y-3 border-2 border-border bg-card">
              <p className="font-bold text-sm text-foreground">Possible Matches</p>
              <div className="space-y-3">
                {result.matches.map((match, i) => (
                  <div key={i} className="bg-muted/50 rounded-xl p-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-foreground">{match.name}</p>
                      <Badge variant="outline" className={confidenceColors[match.confidence]}>
                        {match.confidence}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{match.strength}</p>
                    {match.manufacturer && (
                      <p className="text-xs text-muted-foreground">Mfr: {match.manufacturer}</p>
                    )}
                    <p className="text-xs text-muted-foreground italic">{match.reason}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Warnings */}
          <div className="space-y-2">
            {result.warnings.map((w, i) => (
              <div key={i} className="flex items-start gap-2 bg-destructive/10 border border-destructive/30 rounded-xl p-3">
                <ShieldAlert className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                <p className="text-xs text-foreground">{w}</p>
              </div>
            ))}
          </div>

          {/* Reset */}
          <Button variant="outline" className="w-full gap-2" onClick={handleReset}>
            <RotateCcw className="w-4 h-4" />
            Identify Another Pill
          </Button>
        </div>
      )}
    </div>
  );
}
