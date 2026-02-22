import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DrugInfo {
  name: string;
  genericName?: string;
  brandNames: string[];
  drugClass?: string;
  purpose?: string;
  warnings: string[];
  sideEffects: string[];
  doseForms: string[];
  route: string[];
  activeIngredients: { name: string; strength: string }[];
  manufacturer?: string;
  rxcui?: string;
  description?: string;
  interactions?: string;
  pregnancyCategory?: string;
  imageUrl?: string;
}

async function searchDrugs(query: string): Promise<any[]> {
  try {
    // Search OpenFDA drug labels
    const url = `https://api.fda.gov/drug/label.json?search=(openfda.brand_name:"${encodeURIComponent(query)}"+openfda.generic_name:"${encodeURIComponent(query)}")&limit=10`;
    console.log(`Drug search: ${url}`);
    const response = await fetch(url);
    
    if (!response.ok) {
      // Try a more flexible search
      const flexUrl = `https://api.fda.gov/drug/label.json?search=${encodeURIComponent(query)}&limit=10`;
      const flexResponse = await fetch(flexUrl);
      if (!flexResponse.ok) return [];
      const flexData = await flexResponse.json();
      return flexData?.results || [];
    }
    
    const data = await response.json();
    return data?.results || [];
  } catch (error) {
    console.error('Drug search error:', error);
    return [];
  }
}

function extractDrugInfo(result: any): DrugInfo {
  const openfda = result.openfda || {};
  
  // Extract warnings
  const warnings: string[] = [];
  if (result.warnings) warnings.push(...result.warnings.slice(0, 3));
  if (result.boxed_warning) warnings.push(...result.boxed_warning.slice(0, 2));
  
  // Extract side effects from adverse_reactions
  const sideEffects: string[] = [];
  if (result.adverse_reactions) {
    const text = result.adverse_reactions[0] || '';
    // Extract common side effect words
    const commonEffects = text.match(/(?:nausea|headache|dizziness|fatigue|diarrhea|constipation|vomiting|rash|insomnia|drowsiness|dry mouth|stomach pain|muscle pain|cough|fever|weight gain|weight loss|anxiety|depression)/gi);
    if (commonEffects) {
      const unique = [...new Set(commonEffects.map((e: string) => e.charAt(0).toUpperCase() + e.slice(1).toLowerCase()))];
      sideEffects.push(...unique.slice(0, 8));
    }
  }

  // Extract active ingredients
  const activeIngredients: { name: string; strength: string }[] = [];
  if (openfda.substance_name) {
    openfda.substance_name.forEach((name: string) => {
      activeIngredients.push({ name, strength: '' });
    });
  }

  return {
    name: openfda.brand_name?.[0] || 'Unknown',
    genericName: openfda.generic_name?.[0],
    brandNames: openfda.brand_name || [],
    drugClass: openfda.pharm_class_epc?.[0] || openfda.pharm_class_moa?.[0],
    purpose: result.indications_and_usage?.[0]?.substring(0, 500) || result.purpose?.[0],
    warnings: warnings.map(w => w.substring(0, 300)),
    sideEffects,
    doseForms: openfda.dosage_form || [],
    route: openfda.route || [],
    activeIngredients,
    manufacturer: openfda.manufacturer_name?.[0],
    rxcui: openfda.rxcui?.[0],
    description: result.description?.[0]?.substring(0, 500),
    interactions: result.drug_interactions?.[0]?.substring(0, 500),
    pregnancyCategory: openfda.pregnancy_category?.[0] || 
      (result.pregnancy?.[0]?.substring(0, 200)),
  };
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, action } = await req.json();
    
    if (!query) {
      return new Response(
        JSON.stringify({ error: 'Search query is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'search') {
      // Quick search - return list of matches
      const results = await searchDrugs(query);
      const drugs = results.map(extractDrugInfo);
      
      // Deduplicate by generic name
      const seen = new Set<string>();
      const unique = drugs.filter(d => {
        const key = (d.genericName || d.name).toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      return new Response(
        JSON.stringify({ success: true, results: unique }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'detail') {
      // Detailed lookup for a specific drug
      const results = await searchDrugs(query);
      
      if (results.length === 0) {
        return new Response(
          JSON.stringify({ success: false, error: 'Drug not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const drug = extractDrugInfo(results[0]);

      // Try to get image
      if (drug.rxcui) {
        try {
          const imgUrl = `https://rximage.nlm.nih.gov/api/rximage/1/rxbase?rxcui=${drug.rxcui}&resolution=600`;
          const imgResponse = await fetch(imgUrl);
          if (imgResponse.ok) {
            const imgData = await imgResponse.json();
            const images = imgData?.nlmRxImages || [];
            if (images.length > 0) {
              drug.imageUrl = images[0].imageUrl;
            }
          }
        } catch {
          // Image lookup is optional
        }
      }

      return new Response(
        JSON.stringify({ success: true, drug }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action. Use "search" or "detail"' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in medication-dictionary:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
