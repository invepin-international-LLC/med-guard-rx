import { useState } from 'react';
import { 
  Shield, Eye, Wind, TestTube, Phone, AlertTriangle, 
  ChevronDown, ChevronUp, ExternalLink, Heart, ScanSearch, Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { PillComparisonTool } from './PillComparisonTool';
import { AIPillIdentifier } from './AIPillIdentifier';

type Section = 'visual' | 'smell' | 'teststrip' | 'emergency' | 'compare' | 'ai-identify';

interface AccordionItemProps {
  title: string;
  icon: typeof Eye;
  iconColor: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

function AccordionItem({ title, icon: Icon, iconColor, open, onToggle, children }: AccordionItemProps) {
  return (
    <div className="bg-card rounded-2xl border-2 border-border overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 gap-3 text-left"
      >
        <div className="flex items-center gap-3">
          <div className={cn("w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0", iconColor)}>
            <Icon className="w-6 h-6 text-white" />
          </div>
          <span className="text-lg font-bold text-foreground">{title}</span>
        </div>
        {open ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
      </button>
      {open && (
        <div className="px-4 pb-5 space-y-3">
          {children}
        </div>
      )}
    </div>
  );
}

function WarningCard({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-3 bg-destructive/10 rounded-xl p-3">
      <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
      <p className="text-sm text-foreground">{text}</p>
    </div>
  );
}

function Tip({ emoji, text }: { emoji: string; text: string }) {
  return (
    <div className="flex items-start gap-3 bg-muted/50 rounded-xl p-3">
      <span className="text-lg flex-shrink-0">{emoji}</span>
      <p className="text-sm text-foreground">{text}</p>
    </div>
  );
}

export function FentanylSafetyGuide() {
  const [openSection, setOpenSection] = useState<Section | null>('visual');
  const [comparePhoto, setComparePhoto] = useState<string | null>(null);
  const [compareDrugName, setCompareDrugName] = useState<string | null>(null);

  const toggle = (s: Section) => setOpenSection(prev => prev === s ? null : s);

  const handleCompareFromAI = (photo: string, drugName: string) => {
    setComparePhoto(photo);
    setCompareDrugName(drugName);
    setOpenSection('compare');
  };

  return (
    <div className="space-y-4">
      {/* Disclaimer Banner */}
      <div className="bg-destructive/10 border-2 border-destructive/30 rounded-2xl p-4">
        <div className="flex items-start gap-3">
          <Shield className="w-6 h-6 text-destructive flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-foreground text-sm">Important Disclaimer</p>
            <p className="text-xs text-muted-foreground mt-1">
              No visual or smell test can reliably detect fentanyl. <strong>Only lab-grade fentanyl test strips provide detection.</strong> This guide is for awareness only. When in doubt, assume any unknown pill is dangerous.
            </p>
          </div>
        </div>
      </div>

      {/* AI Pill Identifier */}
      <AccordionItem
        title="AI Pill Identifier"
        icon={Sparkles}
        iconColor="bg-violet-500"
        open={openSection === 'ai-identify'}
        onToggle={() => toggle('ai-identify')}
      >
        <AIPillIdentifier />
      </AccordionItem>

      {/* Pill Photo Comparison */}
      <AccordionItem
        title="Pill Photo Compare"
        icon={ScanSearch}
        iconColor="bg-emerald-500"
        open={openSection === 'compare'}
        onToggle={() => toggle('compare')}
      >
        <PillComparisonTool />
      </AccordionItem>

      {/* Visual ID Guide */}
      <AccordionItem
        title="Visual Warning Signs"
        icon={Eye}
        iconColor="bg-amber-500"
        open={openSection === 'visual'}
        onToggle={() => toggle('visual')}
      >
        <p className="text-sm text-muted-foreground mb-3">
          Counterfeit pills containing fentanyl often have subtle but visible differences from legitimate medications:
        </p>

        <WarningCard text="Uneven coloring — look for spots, speckles, or inconsistent shading across the pill's surface." />
        <WarningCard text="Rough or crumbling edges — real pharmaceutical pills have clean, crisp edges from industrial presses." />
        <WarningCard text="Off-center or blurry imprint — legitimate pills have sharp, perfectly centered logos and numbers." />
        <WarningCard text="Size or thickness variation — if two pills of the 'same' drug don't match exactly, one may be counterfeit." />
        <WarningCard text="Unusual color — even slight color differences from what you're prescribed can be a red flag." />

        <Tip emoji="🔍" text="Compare any pill to its verified image on DailyMed.nlm.nih.gov or use the Pill Identifier in this app." />
        <Tip emoji="💊" text="Only take medications dispensed by a licensed pharmacy. Street or online pills are the #1 source of fentanyl-laced counterfeits." />
      </AccordionItem>

      {/* Smell & Texture */}
      <AccordionItem
        title="Smell & Texture Clues"
        icon={Wind}
        iconColor="bg-purple-500"
        open={openSection === 'smell'}
        onToggle={() => toggle('smell')}
      >
        <p className="text-sm text-muted-foreground mb-3">
          While unreliable as a standalone test, sensory clues can raise suspicion:
        </p>

        <Tip emoji="👃" text="Unusual chemical or bitter smell — legitimate pills are typically odorless or have a faint, consistent smell." />
        <Tip emoji="✋" text="Chalky or powdery feel — counterfeit pills often crumble more easily than pharmaceutical-grade pills." />
        <Tip emoji="💧" text="Dissolves too quickly — if a pill disintegrates rapidly in your fingers or in water, it may be a pressed counterfeit." />
        <Tip emoji="⚖️" text="Wrong weight — fentanyl-laced pills may feel noticeably lighter or heavier than the real version." />

        <WarningCard text="NEVER taste-test a suspected pill. A lethal dose of fentanyl is as small as a few grains of salt (2mg)." />
      </AccordionItem>

      {/* Test Strip Guide */}
      <AccordionItem
        title="Fentanyl Test Strips"
        icon={TestTube}
        iconColor="bg-blue-500"
        open={openSection === 'teststrip'}
        onToggle={() => toggle('teststrip')}
      >
        <p className="text-sm text-muted-foreground mb-3">
          Fentanyl test strips (FTS) are the most reliable way to check for fentanyl outside a lab:
        </p>

        <div className="bg-muted/50 rounded-xl p-4 space-y-3">
          <p className="font-bold text-foreground text-sm">How to use:</p>
          <ol className="list-decimal list-inside space-y-2 text-sm text-foreground">
            <li>Dissolve a small amount of the substance in water (crush pill first)</li>
            <li>Dip the test strip into the solution for 15 seconds</li>
            <li>Lay the strip flat for 2–5 minutes</li>
            <li><strong>ONE line = POSITIVE</strong> (fentanyl detected) ⚠️</li>
            <li><strong>TWO lines = NEGATIVE</strong> (no fentanyl detected)</li>
          </ol>
        </div>

        <WarningCard text="A negative test doesn't guarantee safety — fentanyl may be unevenly distributed ('hot spots') in a pill." />

        <div className="space-y-2 mt-2">
          <p className="font-bold text-sm text-foreground">Where to get test strips:</p>
          <Tip emoji="🏥" text="Many pharmacies now carry FTS — ask your pharmacist." />
          <Tip emoji="🏛️" text="Local health departments and harm reduction organizations often provide free FTS." />
          <Tip emoji="🌐" text="Available online from harm reduction suppliers like DanceSafe.org and NEXT Distro." />
        </div>

        <Button
          variant="outline"
          className="w-full mt-2 gap-2"
          onClick={() => window.open('https://dancesafe.org/fentanyl-test-strips/', '_blank')}
        >
          <ExternalLink className="w-4 h-4" />
          Learn more at DanceSafe.org
        </Button>
      </AccordionItem>

      {/* Emergency Resources */}
      <AccordionItem
        title="Emergency Resources"
        icon={Heart}
        iconColor="bg-destructive"
        open={openSection === 'emergency'}
        onToggle={() => toggle('emergency')}
      >
        <div className="space-y-3">
          {/* Overdose Signs */}
          <div className="bg-destructive/10 rounded-xl p-4">
            <p className="font-bold text-foreground text-sm mb-2">Signs of Opioid Overdose:</p>
            <ul className="space-y-1 text-sm text-foreground">
              <li>• Extremely small, pinpoint pupils</li>
              <li>• Unconscious or unresponsive</li>
              <li>• Slow, shallow, or stopped breathing</li>
              <li>• Choking or gurgling sounds</li>
              <li>• Blue/gray lips, fingertips, or skin</li>
              <li>• Limp body</li>
            </ul>
          </div>

          {/* Naloxone */}
          <div className="bg-primary/10 rounded-xl p-4">
            <p className="font-bold text-foreground text-sm mb-2">💉 Naloxone (Narcan) Saves Lives</p>
            <p className="text-sm text-muted-foreground">
              Narcan nasal spray reverses opioid overdoses. It's available OTC at most pharmacies without a prescription. Keep it accessible if you or someone you know is at risk.
            </p>
          </div>

          {/* Emergency Contacts */}
          <div className="space-y-2">
            <Button
              className="w-full gap-2 bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              onClick={() => window.open('tel:911')}
            >
              <Phone className="w-5 h-5" />
              Call 911
            </Button>

            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={() => window.open('tel:1-800-222-1222')}
            >
              <Phone className="w-4 h-4" />
              Poison Control: 1-800-222-1222
            </Button>

            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={() => window.open('tel:988')}
            >
              <Phone className="w-4 h-4" />
              988 Suicide & Crisis Lifeline
            </Button>

            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={() => window.open('https://www.samhsa.gov/find-help/national-helpline', '_blank')}
            >
              <ExternalLink className="w-4 h-4" />
              SAMHSA Helpline: 1-800-662-4357
            </Button>
          </div>
        </div>
      </AccordionItem>

      {/* Footer */}
      <p className="text-xs text-muted-foreground text-center px-4 pb-4">
        Information sourced from CDC, DEA, and harm reduction organizations. This is not medical advice. Always consult a healthcare professional.
      </p>
    </div>
  );
}
