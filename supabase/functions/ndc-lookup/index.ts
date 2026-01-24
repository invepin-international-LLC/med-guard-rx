import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OpenFDAProduct {
  product_ndc: string;
  brand_name?: string;
  generic_name?: string;
  dosage_form?: string;
  active_ingredients?: Array<{
    name: string;
    strength: string;
  }>;
  labeler_name?: string;
  product_type?: string;
  route?: string[];
  packaging?: Array<{
    package_ndc: string;
    description?: string;
  }>;
}

interface OpenFDAResponse {
  results?: OpenFDAProduct[];
  error?: {
    code: string;
    message: string;
  };
}

interface MedicationResult {
  ndcCode: string;
  name: string;
  genericName?: string;
  strength: string;
  form: string;
  manufacturer?: string;
  route?: string;
  productType?: string;
}

// Generate NDC format variations for lookup
function generateNdcVariants(ndc: string): string[] {
  // Remove all non-numeric characters
  const clean = ndc.replace(/\D/g, '');
  const variants: string[] = [];
  
  // OpenFDA uses 4-4-2, 5-3-2, or 5-4-1 formats in product_ndc
  // Package NDC uses 10 or 11 digit formats
  
  if (clean.length === 10) {
    // Standard 10 digit - format as various possibilities
    // 4-4-2
    variants.push(`${clean.slice(0, 4)}-${clean.slice(4, 8)}-${clean.slice(8, 10)}`);
    // 5-3-2
    variants.push(`${clean.slice(0, 5)}-${clean.slice(5, 8)}-${clean.slice(8, 10)}`);
    // 5-4-1
    variants.push(`${clean.slice(0, 5)}-${clean.slice(5, 9)}-${clean.slice(9, 10)}`);
    // Also search raw
    variants.push(clean);
  } else if (clean.length === 11) {
    // 11 digit format - try 5-4-2 and variations
    variants.push(`${clean.slice(0, 5)}-${clean.slice(5, 9)}-${clean.slice(9, 11)}`);
    variants.push(`${clean.slice(1, 5)}-${clean.slice(5, 9)}-${clean.slice(9, 11)}`);
    variants.push(clean);
    // Also try dropping leading zero
    variants.push(clean.slice(1));
  }
  
  // Add the original input as-is
  variants.push(ndc);
  
  return [...new Set(variants)];
}

async function searchOpenFDA(searchQuery: string): Promise<OpenFDAResponse | null> {
  try {
    const url = `https://api.fda.gov/drug/ndc.json?${searchQuery}&limit=5`;
    console.log(`OpenFDA request: ${url}`);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      console.log(`OpenFDA returned status ${response.status}`);
      return null;
    }
    
    return await response.json();
  } catch (error) {
    console.error(`OpenFDA search error:`, error);
    return null;
  }
}

async function lookupNdcInOpenFDA(ndc: string): Promise<MedicationResult | null> {
  const variants = generateNdcVariants(ndc);
  console.log(`Looking up NDC: ${ndc}, variants: ${variants.join(', ')}`);
  
  // Try exact product_ndc matches first
  for (const variant of variants) {
    const data = await searchOpenFDA(`search=product_ndc:"${variant}"`);
    if (data?.results?.length) {
      const product = data.results[0];
      return formatProduct(product, ndc);
    }
  }
  
  // Try package_ndc search
  for (const variant of variants) {
    const data = await searchOpenFDA(`search=packaging.package_ndc:"${variant}"`);
    if (data?.results?.length) {
      const product = data.results[0];
      return formatProduct(product, ndc);
    }
  }
  
  // Try generic search (more flexible)
  const cleanNdc = ndc.replace(/\D/g, '');
  if (cleanNdc.length >= 9) {
    // Try a wildcard-style search with just numbers
    const data = await searchOpenFDA(`search=product_ndc:*${cleanNdc.slice(0, 9)}*`);
    if (data?.results?.length) {
      const product = data.results[0];
      return formatProduct(product, ndc);
    }
  }
  
  return null;
}

function formatProduct(product: OpenFDAProduct, originalNdc: string): MedicationResult {
  // Extract strength from active ingredients
  let strength = 'See label';
  if (product.active_ingredients && product.active_ingredients.length > 0) {
    const strengths = product.active_ingredients
      .map(ing => ing.strength)
      .filter(s => s);
    if (strengths.length > 0) {
      strength = strengths.join(', ');
    }
  }
  
  return {
    ndcCode: product.product_ndc || originalNdc,
    name: product.brand_name || product.generic_name || 'Unknown Medication',
    genericName: product.generic_name,
    strength,
    form: product.dosage_form || 'Unknown',
    manufacturer: product.labeler_name,
    route: product.route?.join(', '),
    productType: product.product_type,
  };
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { ndc } = await req.json();
    
    if (!ndc) {
      return new Response(
        JSON.stringify({ error: 'NDC code is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`Received NDC lookup request for: ${ndc}`);
    
    const result = await lookupNdcInOpenFDA(ndc);
    
    if (result) {
      console.log(`Successfully found medication: ${result.name}`);
      return new Response(
        JSON.stringify({ success: true, medication: result }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    } else {
      console.log(`No medication found for NDC: ${ndc}`);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Medication not found in FDA database',
          ndc 
        }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
  } catch (error) {
    console.error('Error processing NDC lookup:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: String(error) }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
