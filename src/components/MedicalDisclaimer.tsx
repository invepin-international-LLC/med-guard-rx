import { Info, ExternalLink } from 'lucide-react';

interface MedicalDisclaimerProps {
  /** Compact variant for use inside cards/sheets. Default is full. */
  variant?: 'full' | 'compact';
  /** Optional extra source links beyond the defaults. */
  extraSources?: { label: string; url: string }[];
  className?: string;
}

/**
 * Reusable medical disclaimer + citation block. Required on every screen
 * that surfaces medical, drug, or health information so users can verify
 * sources and understand the app is not a substitute for professional care.
 * Apple App Store Guideline 1.4.1 compliance.
 */
const DEFAULT_SOURCES = [
  { label: 'U.S. FDA — Drug Information', url: 'https://www.fda.gov/drugs' },
  { label: 'NIH MedlinePlus — Drugs & Supplements', url: 'https://medlineplus.gov/druginformation.html' },
  { label: 'DailyMed — Official FDA Labels', url: 'https://dailymed.nlm.nih.gov/dailymed/' },
  { label: 'Poison Control (1-800-222-1222)', url: 'https://www.poison.org/' },
];

export function MedicalDisclaimer({
  variant = 'full',
  extraSources = [],
  className = '',
}: MedicalDisclaimerProps) {
  const sources = [...extraSources, ...DEFAULT_SOURCES];

  if (variant === 'compact') {
    return (
      <div className={`text-xs text-muted-foreground bg-muted/50 border border-border rounded-lg p-3 ${className}`}>
        <p className="mb-1">
          <span className="font-semibold text-foreground">Not medical advice.</span>{' '}
          Information in Med Guard Rx is for general reference only — always consult your doctor or pharmacist before making medication decisions. In an emergency call 911.
        </p>
        <p className="font-semibold text-foreground mt-2 mb-1">Verify with these sources:</p>
        <ul className="space-y-0.5">
          {sources.map((s) => (
            <li key={s.url}>
              <a
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-primary underline underline-offset-2 hover:opacity-80"
              >
                {s.label}
                <ExternalLink className="w-3 h-3" />
              </a>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className={`bg-info/10 border-2 border-info/30 rounded-2xl p-4 ${className}`}>
      <div className="flex items-start gap-2 mb-3">
        <Info className="w-5 h-5 text-info flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-bold text-foreground mb-1">Not Medical Advice</p>
          <p className="text-sm text-foreground/80 leading-relaxed">
            Med Guard Rx is an information and reminder tool — not a substitute for professional medical advice, diagnosis, or treatment. Always seek the guidance of your physician or pharmacist with any questions about a medication or health condition. In an emergency, call 911 or Poison Control at 1-800-222-1222.
          </p>
        </div>
      </div>
      <div>
        <p className="text-xs font-semibold text-foreground uppercase tracking-wide mb-2">Verify with trusted sources</p>
        <ul className="space-y-1.5">
          {sources.map((s) => (
            <li key={s.url}>
              <a
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-primary underline underline-offset-2 hover:opacity-80"
              >
                {s.label}
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}