import { useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MedicalDisclaimer } from '@/components/MedicalDisclaimer';

/**
 * Public page listing the medical disclaimer and authoritative sources used
 * throughout Med Guard Rx. Required so users (and Apple App Review) can
 * easily find citations for any medical content surfaced by the app.
 * (Apple App Store Guideline 1.4.1 — Safety / Physical Harm.)
 */
export default function MedicalSources() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-card border-b border-border px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-xl">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-bold text-foreground">Sources & Medical Disclaimer</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4 space-y-6">
        <section className="space-y-2">
          <h2 className="text-xl font-bold text-foreground">About the information in this app</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Med Guard Rx surfaces medication, dosage, side-effect, interaction, and general
            health information drawn from public, authoritative U.S. health-data sources. It
            is a reference and reminder tool — <strong>not</strong> a substitute for the
            professional judgment of your physician or pharmacist. Every screen that shows
            medical content includes links so you can verify what you read.
          </p>
        </section>

        <MedicalDisclaimer
          variant="full"
          extraSources={[
            { label: 'OpenFDA Drug Label API', url: 'https://open.fda.gov/apis/drug/label/' },
            { label: 'NIH RxNorm / RxNav APIs', url: 'https://lhncbc.nlm.nih.gov/RxNav/' },
            { label: 'NIH Pillbox (visual pill ID)', url: 'https://pillbox.nlm.nih.gov/' },
            { label: 'CDC — Centers for Disease Control', url: 'https://www.cdc.gov/' },
            { label: 'Mayo Clinic — Drugs & Supplements', url: 'https://www.mayoclinic.org/drugs-supplements' },
            { label: 'DEA — One Pill Can Kill (counterfeit pills)', url: 'https://www.dea.gov/onepill' },
          ]}
        />

        <section className="bg-card border border-border rounded-2xl p-4 space-y-2">
          <h2 className="text-base font-bold text-foreground">Where citations appear in the app</h2>
          <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
            <li>Dr. Bombay AI chat — every medical answer ends with a "Sources" list of links.</li>
            <li>Medication Dictionary — drug detail pages link to MedlinePlus, DailyMed, and Drugs.com for the specific drug.</li>
            <li>Drug Interaction Warnings — link to the OpenFDA and NIH RxNav data sources used to generate the result.</li>
            <li>AI Pill Identifier — links to NIH Pillbox, DailyMed, and DEA fentanyl-warning resources.</li>
            <li>Appointment Summaries — every plain-language summary ends with "Learn more" links.</li>
          </ul>
        </section>

        <section className="bg-destructive/10 border-2 border-destructive/30 rounded-2xl p-4">
          <p className="font-bold text-foreground mb-1">In an emergency</p>
          <p className="text-sm text-foreground/80">
            Call <a className="text-primary underline" href="tel:911">911</a> immediately for life-threatening symptoms,
            or <a className="text-primary underline" href="tel:18002221222">Poison Control at 1-800-222-1222</a> for
            suspected overdose or accidental ingestion.
          </p>
        </section>
      </main>
    </div>
  );
}