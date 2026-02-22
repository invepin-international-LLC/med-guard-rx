import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RxImageResult {
  imageUrl: string | null;
  imageUrls: string[];
  name?: string;
  ndc?: string;
}

async function lookupByRxcui(rxcui: string): Promise<RxImageResult> {
  try {
    const url = `https://rximage.nlm.nih.gov/api/rximage/1/rxbase?rxcui=${rxcui}&resolution=600`;
    console.log(`RxImage lookup by rxcui: ${url}`);
    const response = await fetch(url);
    if (!response.ok) return { imageUrl: null, imageUrls: [] };
    
    const data = await response.json();
    const results = data?.nlmRxImages || [];
    
    if (results.length === 0) return { imageUrl: null, imageUrls: [] };
    
    return {
      imageUrl: results[0]?.imageUrl || null,
      imageUrls: results.map((r: any) => r.imageUrl).filter(Boolean),
      name: results[0]?.name,
      ndc: results[0]?.ndc11,
    };
  } catch (error) {
    console.error('RxImage rxcui lookup error:', error);
    return { imageUrl: null, imageUrls: [] };
  }
}

async function lookupByNdc(ndc: string): Promise<RxImageResult> {
  try {
    const clean = ndc.replace(/\D/g, '');
    const url = `https://rximage.nlm.nih.gov/api/rximage/1/rxbase?ndc=${clean}&resolution=600`;
    console.log(`RxImage lookup by ndc: ${url}`);
    const response = await fetch(url);
    if (!response.ok) return { imageUrl: null, imageUrls: [] };
    
    const data = await response.json();
    const results = data?.nlmRxImages || [];
    
    if (results.length === 0) return { imageUrl: null, imageUrls: [] };
    
    return {
      imageUrl: results[0]?.imageUrl || null,
      imageUrls: results.map((r: any) => r.imageUrl).filter(Boolean),
      name: results[0]?.name,
      ndc: results[0]?.ndc11,
    };
  } catch (error) {
    console.error('RxImage ndc lookup error:', error);
    return { imageUrl: null, imageUrls: [] };
  }
}

async function lookupByName(name: string): Promise<RxImageResult> {
  try {
    // First get RxCUI from RxNorm
    const rxnormUrl = `https://rxnav.nlm.nih.gov/REST/rxcui.json?name=${encodeURIComponent(name)}&search=1`;
    console.log(`RxNorm lookup: ${rxnormUrl}`);
    const rxnormResponse = await fetch(rxnormUrl);
    
    if (rxnormResponse.ok) {
      const rxnormData = await rxnormResponse.json();
      const rxcui = rxnormData?.idGroup?.rxnormId?.[0];
      
      if (rxcui) {
        const result = await lookupByRxcui(rxcui);
        if (result.imageUrl) return result;
      }
    }

    // Try approximate match
    const approxUrl = `https://rxnav.nlm.nih.gov/REST/approximateTerm.json?term=${encodeURIComponent(name)}&maxEntries=3`;
    const approxResponse = await fetch(approxUrl);
    
    if (approxResponse.ok) {
      const approxData = await approxResponse.json();
      const candidates = approxData?.approximateGroup?.candidate || [];
      
      for (const candidate of candidates) {
        if (candidate.rxcui) {
          const result = await lookupByRxcui(candidate.rxcui);
          if (result.imageUrl) return result;
        }
      }
    }

    return { imageUrl: null, imageUrls: [] };
  } catch (error) {
    console.error('RxImage name lookup error:', error);
    return { imageUrl: null, imageUrls: [] };
  }
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { ndc, rxcui, name } = await req.json();
    
    let result: RxImageResult = { imageUrl: null, imageUrls: [] };

    // Try NDC first, then RxCUI, then name
    if (ndc) {
      result = await lookupByNdc(ndc);
    }
    
    if (!result.imageUrl && rxcui) {
      result = await lookupByRxcui(rxcui);
    }
    
    if (!result.imageUrl && name) {
      result = await lookupByName(name);
    }

    return new Response(
      JSON.stringify({ success: !!result.imageUrl, ...result }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in rximage-lookup:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
