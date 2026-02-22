import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface InteractionResult {
  severity: string;
  description: string;
  drug1: string;
  drug2: string;
}

// Known high-severity interaction pairs (common dangerous combinations)
const KNOWN_INTERACTIONS: Record<string, { severity: string; description: string }> = {
  'warfarin+aspirin': {
    severity: 'high',
    description: 'Aspirin may increase the anticoagulant effect of Warfarin, significantly raising the risk of bleeding. This combination should be used with extreme caution and medical supervision.',
  },
  'warfarin+ibuprofen': {
    severity: 'high',
    description: 'Ibuprofen can increase the risk of bleeding when taken with Warfarin by inhibiting platelet function and potentially increasing Warfarin levels.',
  },
  'warfarin+naproxen': {
    severity: 'high',
    description: 'Naproxen may enhance the anticoagulant effect of Warfarin, increasing bleeding risk.',
  },
  'lisinopril+potassium': {
    severity: 'moderate',
    description: 'ACE inhibitors like Lisinopril can increase potassium levels. Taking additional potassium supplements may lead to dangerously high potassium (hyperkalemia).',
  },
  'lisinopril+spironolactone': {
    severity: 'moderate',
    description: 'Both Lisinopril and Spironolactone can raise potassium levels, increasing the risk of hyperkalemia.',
  },
  'metformin+alcohol': {
    severity: 'high',
    description: 'Alcohol can increase the risk of lactic acidosis when taken with Metformin, a potentially life-threatening condition.',
  },
  'simvastatin+amiodarone': {
    severity: 'high',
    description: 'Amiodarone increases simvastatin levels significantly, raising the risk of severe muscle damage (rhabdomyolysis).',
  },
  'methotrexate+ibuprofen': {
    severity: 'high',
    description: 'NSAIDs like Ibuprofen can decrease methotrexate elimination, leading to toxic levels.',
  },
  'ssri+maoi': {
    severity: 'high',
    description: 'Combining SSRIs with MAOIs can cause serotonin syndrome, a potentially fatal condition.',
  },
};

function normalizedrugName(name: string): string {
  return name.toLowerCase().trim()
    .replace(/\s*(sodium|hydrochloride|hcl|tablets?|capsules?|pills?)\s*/gi, '')
    .trim();
}

function checkKnownInteraction(drug1: string, drug2: string): { severity: string; description: string } | null {
  const d1 = normalizedrugName(drug1);
  const d2 = normalizedrugName(drug2);
  
  const key1 = `${d1}+${d2}`;
  const key2 = `${d2}+${d1}`;
  
  return KNOWN_INTERACTIONS[key1] || KNOWN_INTERACTIONS[key2] || null;
}

async function checkOpenFdaInteraction(drug1: string, drug2: string): Promise<string | null> {
  try {
    const d1 = encodeURIComponent(normalizedrugName(drug1));
    const d2 = encodeURIComponent(normalizedrugName(drug2));
    
    const url = `https://api.fda.gov/drug/label.json?search=openfda.generic_name:"${d1}"+AND+drug_interactions:"${d2}"&limit=1`;
    console.log(`OpenFDA check: ${url}`);
    
    const response = await fetch(url);
    if (!response.ok) {
      await response.text();
      return null;
    }
    
    const data = await response.json();
    const results = data?.results;
    
    if (results && results.length > 0 && results[0].drug_interactions) {
      const interactionText = results[0].drug_interactions.join(' ');
      // Find the relevant sentence about drug2
      const sentences = interactionText.split(/\.\s+/);
      const relevant = sentences.find((s: string) => 
        s.toLowerCase().includes(normalizedrugName(drug2))
      );
      if (relevant) {
        return relevant.trim().substring(0, 300) + (relevant.length > 300 ? '...' : '');
      }
      // Return first 300 chars of interaction section
      return interactionText.substring(0, 300) + '...';
    }
    return null;
  } catch (error) {
    console.error('OpenFDA interaction check error:', error);
    return null;
  }
}

function classifySeverity(description: string): string {
  const lowerDesc = description.toLowerCase();
  const highKeywords = ['fatal', 'death', 'life-threatening', 'contraindicated', 'severe bleeding', 'do not use', 'never', 'rhabdomyolysis', 'serotonin syndrome', 'significantly'];
  const moderateKeywords = ['caution', 'monitor', 'may increase', 'may decrease', 'risk of', 'elevated'];
  
  if (highKeywords.some(k => lowerDesc.includes(k))) return 'high';
  if (moderateKeywords.some(k => lowerDesc.includes(k))) return 'moderate';
  return 'low';
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { medications } = await req.json();
    
    if (!medications || !Array.isArray(medications) || medications.length < 2) {
      return new Response(
        JSON.stringify({ interactions: [], message: 'Need at least 2 medications to check interactions' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const interactions: InteractionResult[] = [];
    
    // Check all pairs
    for (let i = 0; i < medications.length; i++) {
      for (let j = i + 1; j < medications.length; j++) {
        const med1 = medications[i];
        const med2 = medications[j];
        const name1 = med1.genericName || med1.name;
        const name2 = med2.genericName || med2.name;
        
        // First check known interactions (instant, reliable)
        const known = checkKnownInteraction(name1, name2);
        if (known) {
          interactions.push({
            severity: known.severity,
            description: known.description,
            drug1: med1.name,
            drug2: med2.name,
          });
          continue;
        }
        
        // Fall back to OpenFDA API
        const fdaResult = await checkOpenFdaInteraction(name1, name2);
        if (fdaResult) {
          interactions.push({
            severity: classifySeverity(fdaResult),
            description: fdaResult,
            drug1: med1.name,
            drug2: med2.name,
          });
        }
      }
    }

    console.log(`Found ${interactions.length} interactions for ${medications.length} medications`);

    return new Response(
      JSON.stringify({ success: true, interactions, checkedCount: medications.length }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in drug-interaction-check:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
