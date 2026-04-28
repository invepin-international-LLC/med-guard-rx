import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AlertTriangle, Shield, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { MedicalDisclaimer } from '@/components/MedicalDisclaimer';

interface Interaction {
  severity: string;
  description: string;
  drug1: string;
  drug2: string;
}

interface DrugInteractionWarningsProps {
  medications: { name: string; genericName?: string; rxcui?: string }[];
}

const severityColors: Record<string, string> = {
  high: 'bg-destructive/15 border-destructive/40 text-destructive',
  moderate: 'bg-warning/15 border-warning/40 text-warning',
  low: 'bg-info/15 border-info/40 text-info',
  'N/A': 'bg-muted border-border text-muted-foreground',
};

const severityIcons: Record<string, string> = {
  high: '🔴',
  moderate: '🟡',
  low: '🔵',
  'N/A': '⚪',
};

export function DrugInteractionWarnings({ medications }: DrugInteractionWarningsProps) {
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [checkedCount, setCheckedCount] = useState(0);

  useEffect(() => {
    if (medications.length < 2) return;

    const checkInteractions = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke('drug-interaction-check', {
          body: { medications },
        });

        if (error) throw error;
        
        setInteractions(data.interactions || []);
        setCheckedCount(data.checkedCount || 0);
      } catch (error) {
        console.error('Error checking interactions:', error);
      } finally {
        setLoading(false);
      }
    };

    checkInteractions();
  }, [medications.length]);

  if (medications.length < 2) return null;

  if (loading) {
    return (
      <div className="bg-card rounded-2xl p-5 border-2 border-border">
        <div className="flex items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <p className="text-foreground font-medium">Checking drug interactions...</p>
        </div>
      </div>
    );
  }

  const hasInteractions = interactions.length > 0;
  const highSeverity = interactions.filter(i => i.severity?.toLowerCase() === 'high');
  const displayInteractions = expanded ? interactions : interactions.slice(0, 3);

  return (
    <div className={cn(
      "rounded-2xl p-5 border-2",
      hasInteractions 
        ? "bg-destructive/5 border-destructive/30" 
        : "bg-success/5 border-success/30"
    )}>
      <div className="flex items-center gap-3 mb-3">
        {hasInteractions ? (
          <AlertTriangle className="w-7 h-7 text-destructive" />
        ) : (
          <Shield className="w-7 h-7 text-success" />
        )}
        <div>
          <h3 className="text-lg font-bold text-foreground">
            {hasInteractions 
              ? `⚠️ ${interactions.length} Interaction${interactions.length !== 1 ? 's' : ''} Found`
              : '✅ No Interactions Detected'}
          </h3>
          <p className="text-sm text-muted-foreground">
            {checkedCount} of {medications.length} medications checked
          </p>
        </div>
      </div>

      {hasInteractions && (
        <div className="space-y-3 mt-4">
          {highSeverity.length > 0 && (
            <div className="bg-destructive/10 rounded-xl p-3 border border-destructive/30">
              <p className="text-destructive font-bold text-sm">
                🔴 {highSeverity.length} HIGH severity interaction{highSeverity.length !== 1 ? 's' : ''} — consult your doctor
              </p>
            </div>
          )}

          {displayInteractions.map((interaction, idx) => {
            const sev = interaction.severity?.toLowerCase() || 'n/a';
            return (
              <div
                key={idx}
                className={cn("rounded-xl p-4 border-2", severityColors[sev] || severityColors['N/A'])}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span>{severityIcons[sev] || '⚪'}</span>
                  <span className="font-bold text-sm uppercase">{interaction.severity}</span>
                  <span className="text-foreground font-medium">
                    {interaction.drug1} ↔ {interaction.drug2}
                  </span>
                </div>
                <p className="text-sm text-foreground/80 leading-relaxed">
                  {interaction.description.length > 200 
                    ? interaction.description.substring(0, 200) + '...' 
                    : interaction.description}
                </p>
              </div>
            );
          })}

          {interactions.length > 3 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(!expanded)}
              className="w-full"
            >
              {expanded ? (
                <>Show Less <ChevronUp className="w-4 h-4 ml-1" /></>
              ) : (
                <>Show {interactions.length - 3} More <ChevronDown className="w-4 h-4 ml-1" /></>
              )}
            </Button>
          )}
        </div>
      )}

      {/* Citations & disclaimer (Apple Guideline 1.4.1) */}
      <div className="mt-4">
        <MedicalDisclaimer
          variant="compact"
          extraSources={[
            { label: 'OpenFDA Drug Label API (data source)', url: 'https://open.fda.gov/apis/drug/label/' },
            { label: 'NIH RxNav Interaction API', url: 'https://lhncbc.nlm.nih.gov/RxNav/APIs/InteractionAPIs.html' },
          ]}
        />
      </div>
    </div>
  );
}
