import { useState } from 'react';
import { Medication } from '@/types/medication';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { DoseClockWidget } from './DoseClockWidget';
import { 
  Pill, 
  AlertTriangle, 
  Info, 
  Phone, 
  PlayCircle, 
  RefreshCw,
  Heart,
  AlertCircle,
  BookOpen,
  ExternalLink
} from 'lucide-react';
import { cn } from '@/lib/utils';

// YouTube educational video search URLs mapped by common medication keywords
const getYouTubeSearchUrl = (medicationName: string) =>
  `https://www.youtube.com/results?search_query=${encodeURIComponent(medicationName + ' medication how it works patient education')}`;

const EDUCATIONAL_VIDEOS: Record<string, { title: string; videoId: string }[]> = {
  metformin: [
    { title: 'How Metformin Works', videoId: 'F1E2xbh1GHg' },
    { title: 'Metformin Side Effects & Tips', videoId: 'VGpkd0-WAMI' },
  ],
  lisinopril: [
    { title: 'How ACE Inhibitors Work', videoId: 'rYHnVaoiSGQ' },
    { title: 'Lisinopril Patient Guide', videoId: 'qfM-MhRU1Po' },
  ],
  atorvastatin: [
    { title: 'How Statins Lower Cholesterol', videoId: 'jUGIbXEHZYM' },
    { title: 'Atorvastatin Tips', videoId: 'dCIjXy26bsc' },
  ],
  omeprazole: [
    { title: 'How PPIs Work', videoId: 'YPNAnqxP6JY' },
    { title: 'Omeprazole Patient Guide', videoId: '4bH3svLkF3k' },
  ],
};

const getVideosForMedication = (name: string) => {
  const key = name.toLowerCase();
  for (const [med, videos] of Object.entries(EDUCATIONAL_VIDEOS)) {
    if (key.includes(med)) return videos;
  }
  return null;
};

interface MedicationDetailSheetProps {
  medication: Medication | null;
  open: boolean;
  onClose: () => void;
}

const formIcons: Record<string, string> = {
  pill: '💊',
  capsule: '💊',
  liquid: '🧴',
  injection: '💉',
  patch: '🩹',
  inhaler: '🌬️',
  drops: '💧',
};

export function MedicationDetailSheet({ medication, open, onClose }: MedicationDetailSheetProps) {
  const [showVideos, setShowVideos] = useState(false);
  if (!medication) return null;

  const videos = getVideosForMedication(medication.name);
  const sideEffects = medication.sideEffects ?? [];
  const importantWarnings = medication.importantWarnings ?? [];

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-[90vh] overflow-y-auto rounded-t-3xl">
        <SheetHeader className="pb-4 border-b border-border">
          <div className="flex items-center gap-4">
            <div className="text-5xl">{formIcons[medication.form] || '💊'}</div>
            <div>
              <SheetTitle className="text-elder-xl text-left">{medication.name}</SheetTitle>
              {medication.genericName && (
                <p className="text-muted-foreground text-lg">{medication.genericName}</p>
              )}
              <p className="text-primary font-semibold text-xl">{medication.strength}</p>
            </div>
          </div>
        </SheetHeader>

        <div className="py-6 space-y-6">
          {/* 24-Hour Clock */}
          <DoseClockWidget medication={medication} />

          {/* What it's for */}
          <section className="bg-primary/5 rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <Heart className="w-6 h-6 text-primary" />
              <h3 className="text-elder-lg text-foreground">What It's For</h3>
            </div>
            <p className="text-elder text-foreground">{medication.purpose}</p>
          </section>

          {/* How it works */}
          <section className="bg-card rounded-2xl p-5 border border-border shadow-soft">
            <div className="flex items-center gap-3 mb-3">
              <Info className="w-6 h-6 text-primary" />
              <h3 className="text-elder-lg text-foreground">How It Works</h3>
            </div>
            <p className="text-elder text-muted-foreground">{medication.howItWorks}</p>
            <Button variant="link" className="mt-2 p-0 h-auto text-primary">
              <BookOpen className="w-5 h-5 mr-2" />
              Learn More
            </Button>
          </section>

          {/* How to take it */}
          <section className="bg-secondary rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <Pill className="w-6 h-6 text-secondary-foreground" />
              <h3 className="text-elder-lg text-foreground">How to Take It</h3>
            </div>
            <p className="text-elder text-foreground">{medication.instructions}</p>
          </section>

          {/* Important Warnings */}
          {importantWarnings.length > 0 && (
            <section className="bg-destructive/10 rounded-2xl p-5 border-2 border-destructive/30">
              <div className="flex items-center gap-3 mb-3">
                <AlertCircle className="w-6 h-6 text-destructive" />
                <h3 className="text-elder-lg text-destructive">Important Warnings</h3>
              </div>
              <ul className="space-y-2">
                {importantWarnings.map((warning, index) => (
                  <li key={index} className="flex items-start gap-3 text-elder text-foreground">
                    <span className="text-destructive">⚠️</span>
                    {warning}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {sideEffects.length > 0 && (
            <section className="bg-warning/10 rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <AlertTriangle className="w-6 h-6 text-warning" />
                <h3 className="text-elder-lg text-foreground">Possible Side Effects</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {sideEffects.map((effect, index) => (
                  <span 
                    key={index} 
                    className="bg-card px-4 py-2 rounded-full text-foreground border border-border"
                  >
                    {effect}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* Refill Info */}
          {medication.refillDate && (
            <section className="bg-muted rounded-2xl p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <RefreshCw className="w-6 h-6 text-muted-foreground" />
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">Refill Reminder</h3>
                    <p className="text-muted-foreground">Next refill: {medication.refillDate}</p>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Educational Videos */}
          <div className="space-y-3 pt-4">
            <Button 
              variant="outline" 
              size="xl" 
              className="w-full justify-start gap-4"
              onClick={() => {
                if (videos) {
                  setShowVideos(!showVideos);
                } else {
                  window.open(getYouTubeSearchUrl(medication.name), '_blank', 'noopener');
                }
              }}
            >
              <PlayCircle className="w-7 h-7" />
              {showVideos ? 'Hide Videos' : 'Watch Educational Videos'}
            </Button>

            {showVideos && videos && (
              <div className="space-y-3 pl-2">
                {videos.map((video) => (
                  <a
                    key={video.videoId}
                    href={`https://www.youtube.com/watch?v=${video.videoId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border hover:border-primary/50 transition-colors"
                  >
                    <img
                      src={`https://img.youtube.com/vi/${video.videoId}/mqdefault.jpg`}
                      alt={video.title}
                      className="w-28 h-16 rounded-lg object-cover"
                      loading="lazy"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-foreground truncate">{video.title}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <ExternalLink className="w-3 h-3" /> YouTube
                      </p>
                    </div>
                  </a>
                ))}
                <a
                  href={getYouTubeSearchUrl(medication.name)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-center text-sm text-primary hover:underline py-2"
                >
                  Search more videos on YouTube →
                </a>
              </div>
            )}
            
            <Button 
              variant="accent" 
              size="xl" 
              className="w-full justify-start gap-4"
              onClick={async () => {
                try {
                  const { supabase } = await import('@/integrations/supabase/client');
                  const { data } = await supabase
                    .from('medications')
                    .select('pharmacy_id, pharmacies(phone, name)')
                    .eq('id', medication.id)
                    .maybeSingle();
                  
                  const pharmacy = data?.pharmacies as { phone: string | null; name: string | null } | null;
                  if (pharmacy?.phone) {
                    window.location.href = `tel:${pharmacy.phone}`;
                  } else {
                    const { toast } = await import('sonner');
                    toast.info('No pharmacy phone number on file', {
                      description: 'Add a pharmacy in your medication settings.',
                    });
                  }
                } catch {
                  window.location.href = 'tel:';
                }
              }}
            >
              <Phone className="w-7 h-7" />
              Call Your Pharmacist
            </Button>
          </div>

          {/* Prescriber Info */}
          {(medication.prescriber || medication.pharmacy) && (
            <section className="bg-muted/50 rounded-2xl p-5 mt-4">
              <div className="space-y-2 text-muted-foreground">
                {medication.prescriber && (
                  <p><span className="font-medium">Prescribed by:</span> {medication.prescriber}</p>
                )}
                {medication.pharmacy && (
                  <p><span className="font-medium">Pharmacy:</span> {medication.pharmacy}</p>
                )}
              </div>
            </section>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
