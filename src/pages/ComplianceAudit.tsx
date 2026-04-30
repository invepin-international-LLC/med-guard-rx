import { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, Shield, ArrowLeft, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface AuditItem {
  screen: string;
  component: string;
  hasDisclaimer: boolean;
  hasSources: boolean;
  sourceCount: number;
  notes?: string;
}

/**
 * Static registry of every screen that displays medical / health / drug info.
 * Marked as compliant once the MedicalDisclaimer component is present.
 * Update this list whenever a new medical-info screen is added.
 */
const AUDIT_REGISTRY: AuditItem[] = [
  { screen: 'Dr. Bombay AI Chat', component: 'DrRxChat', hasDisclaimer: true, hasSources: true, sourceCount: 4, notes: 'Fallback sources auto-appended if AI omits them' },
  { screen: 'Drug Interaction Warnings', component: 'DrugInteractionWarnings', hasDisclaimer: true, hasSources: true, sourceCount: 6, notes: 'OpenFDA & RxNav citations' },
  { screen: 'Medication Dictionary', component: 'MedicationDictionary', hasDisclaimer: true, hasSources: true, sourceCount: 5, notes: 'Deep-links to drug-specific pages' },
  { screen: 'AI Pill Identifier', component: 'AIPillIdentifier', hasDisclaimer: true, hasSources: true, sourceCount: 5, notes: 'NIH Pillbox citation' },
  { screen: 'Appointment Summary', component: 'AppointmentSummary', hasDisclaimer: true, hasSources: true, sourceCount: 4 },
  { screen: 'Fentanyl Safety Guide', component: 'FentanylSafetyGuide', hasDisclaimer: true, hasSources: true, sourceCount: 7, notes: 'CDC, DEA, SAMHSA citations' },
  { screen: 'Medication Detail Sheet', component: 'MedicationDetailSheet', hasDisclaimer: true, hasSources: true, sourceCount: 4 },
  { screen: 'Pill Comparison Tool', component: 'PillComparisonTool', hasDisclaimer: true, hasSources: true, sourceCount: 5, notes: 'NIH Pillbox citation' },
  { screen: 'Symptom Journal', component: 'SymptomJournal', hasDisclaimer: true, hasSources: true, sourceCount: 4 },
  { screen: 'Emergency Card', component: 'EmergencyCard', hasDisclaimer: true, hasSources: true, sourceCount: 4 },
  { screen: 'Emergency Card (Elder)', component: 'EmergencyCardElder', hasDisclaimer: true, hasSources: true, sourceCount: 4 },
  { screen: 'Prescription Scanner', component: 'PrescriptionScanner', hasDisclaimer: false, hasSources: false, sourceCount: 0, notes: 'Input-only screen – no medical info displayed' },
  { screen: 'Medical Sources Page', component: 'MedicalSources', hasDisclaimer: true, hasSources: true, sourceCount: 8, notes: 'Dedicated citations hub' },
];

export default function ComplianceAudit() {
  const navigate = useNavigate();
  const [items] = useState<AuditItem[]>(AUDIT_REGISTRY);

  const totalScreens = items.filter(i => i.notes !== 'Input-only screen – no medical info displayed').length;
  const compliant = items.filter(i => i.hasDisclaimer && i.hasSources).length;
  const nonCompliant = items.filter(i => (!i.hasDisclaimer || !i.hasSources) && i.notes !== 'Input-only screen – no medical info displayed');
  const score = totalScreens > 0 ? Math.round((compliant / totalScreens) * 100) : 0;

  return (
    <div className="min-h-screen bg-background p-4 pb-32">
      <div className="max-w-lg mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="min-h-[44px] min-w-[44px]">
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Compliance Audit</h1>
            <p className="text-sm text-muted-foreground">Apple Guideline 1.4.1 — Citations & Disclaimers</p>
          </div>
        </div>

        {/* Score card */}
        <div className={cn(
          'rounded-2xl p-5 border-2 text-center',
          score === 100 ? 'bg-success/10 border-success/40' : 'bg-warning/10 border-warning/40'
        )}>
          <Shield className={cn('w-10 h-10 mx-auto mb-2', score === 100 ? 'text-success' : 'text-warning')} />
          <p className="text-4xl font-black text-foreground">{score}%</p>
          <p className="text-muted-foreground text-sm mt-1">
            {compliant} of {totalScreens} medical screens fully compliant
          </p>
        </div>

        {/* Checklist */}
        <div className="space-y-2">
          <h2 className="text-lg font-bold text-foreground">Screen-by-Screen Audit</h2>
          {items.map((item) => {
            const isExempt = item.notes === 'Input-only screen – no medical info displayed';
            const pass = item.hasDisclaimer && item.hasSources;
            return (
              <div
                key={item.component}
                className={cn(
                  'rounded-xl p-4 border-2',
                  isExempt
                    ? 'bg-muted/30 border-border'
                    : pass
                    ? 'bg-success/5 border-success/30'
                    : 'bg-destructive/5 border-destructive/30'
                )}
              >
                <div className="flex items-center gap-2">
                  {isExempt ? (
                    <span className="text-muted-foreground text-lg">➖</span>
                  ) : pass ? (
                    <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0" />
                  ) : (
                    <XCircle className="w-5 h-5 text-destructive flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground truncate">{item.screen}</p>
                    <div className="flex flex-wrap gap-2 mt-1 text-xs text-muted-foreground">
                      <span>{item.hasDisclaimer ? '✅ Disclaimer' : '❌ No disclaimer'}</span>
                      <span>{item.hasSources ? `✅ ${item.sourceCount} sources` : '❌ No sources'}</span>
                    </div>
                    {item.notes && (
                      <p className="text-xs text-muted-foreground mt-1 italic">{item.notes}</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Non-compliant summary */}
        {nonCompliant.length > 0 && (
          <div className="bg-destructive/10 border-2 border-destructive/30 rounded-2xl p-4">
            <p className="font-bold text-destructive mb-2">⚠️ Action Required</p>
            <ul className="text-sm text-foreground/80 space-y-1">
              {nonCompliant.map(i => (
                <li key={i.component}>• <strong>{i.screen}</strong> — missing {!i.hasDisclaimer ? 'disclaimer' : ''}{!i.hasDisclaimer && !i.hasSources ? ' & ' : ''}{!i.hasSources ? 'source links' : ''}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Link to full sources page */}
        <Button
          variant="outline"
          className="w-full gap-2"
          onClick={() => navigate('/medical-sources')}
        >
          <ExternalLink className="w-4 h-4" />
          View All Medical Sources
        </Button>
      </div>
    </div>
  );
}