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

async function getRxcuiForDrug(drugName: string): Promise<string | null> {
  try {
    const url = `https://rxnav.nlm.nih.gov/REST/rxcui.json?name=${encodeURIComponent(drugName)}&search=1`;
    const response = await fetch(url);
    if (!response.ok) return null;
    const data = await response.json();
    return data?.idGroup?.rxnormId?.[0] || null;
  } catch {
    return null;
  }
}

async function getInteractionsForRxcui(rxcui: string): Promise<any[]> {
  try {
    const url = `https://rxnav.nlm.nih.gov/REST/interaction/interaction.json?rxcui=${rxcui}&sources=DrugBank`;
    console.log(`Interaction check: ${url}`);
    const response = await fetch(url);
    if (!response.ok) return [];
    const data = await response.json();
    
    const groups = data?.interactionTypeGroup || [];
    const interactions: any[] = [];
    
    for (const group of groups) {
      for (const type of group.interactionType || []) {
        for (const pair of type.interactionPair || []) {
          interactions.push({
            severity: pair.severity || 'N/A',
            description: pair.description || '',
            drugs: pair.interactionConcept?.map((c: any) => ({
              name: c.minConceptItem?.name,
              rxcui: c.minConceptItem?.rxcui,
            })) || [],
          });
        }
      }
    }
    
    return interactions;
  } catch (error) {
    console.error('Interaction lookup error:', error);
    return [];
  }
}

async function checkPairInteraction(rxcui1: string, rxcui2: string): Promise<any[]> {
  try {
    const url = `https://rxnav.nlm.nih.gov/REST/interaction/list.json?rxcuis=${rxcui1}+${rxcui2}`;
    console.log(`Pair interaction check: ${url}`);
    const response = await fetch(url);
    if (!response.ok) return [];
    const data = await response.json();
    
    const results: any[] = [];
    const groups = data?.fullInteractionTypeGroup || [];
    
    for (const group of groups) {
      for (const type of group.fullInteractionType || []) {
        for (const pair of type.interactionPair || []) {
          results.push({
            severity: pair.severity || 'N/A',
            description: pair.description || '',
            drugs: pair.interactionConcept?.map((c: any) => ({
              name: c.minConceptItem?.name,
              rxcui: c.minConceptItem?.rxcui,
            })) || [],
          });
        }
      }
    }
    
    return results;
  } catch (error) {
    console.error('Pair interaction error:', error);
    return [];
  }
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

    // Get RxCUI for each medication
    const medsWithRxcui = await Promise.all(
      medications.map(async (med: { name: string; genericName?: string; rxcui?: string }) => {
        let rxcui = med.rxcui || null;
        if (!rxcui) {
          // Try generic name first (more reliable), then brand name
          if (med.genericName) {
            rxcui = await getRxcuiForDrug(med.genericName);
          }
          if (!rxcui) {
            rxcui = await getRxcuiForDrug(med.name);
          }
        }
        return { ...med, rxcui };
      })
    );

    const interactions: InteractionResult[] = [];
    
    // Check all pairs
    for (let i = 0; i < medsWithRxcui.length; i++) {
      for (let j = i + 1; j < medsWithRxcui.length; j++) {
        const med1 = medsWithRxcui[i];
        const med2 = medsWithRxcui[j];
        
        if (!med1.rxcui || !med2.rxcui) continue;
        
        const pairInteractions = await checkPairInteraction(med1.rxcui, med2.rxcui);
        
        for (const interaction of pairInteractions) {
          interactions.push({
            severity: interaction.severity,
            description: interaction.description,
            drug1: med1.name,
            drug2: med2.name,
          });
        }
      }
    }

    console.log(`Found ${interactions.length} interactions for ${medications.length} medications`);

    return new Response(
      JSON.stringify({ success: true, interactions, checkedCount: medsWithRxcui.filter(m => m.rxcui).length }),
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
