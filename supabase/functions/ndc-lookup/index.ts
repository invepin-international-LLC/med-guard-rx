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
  active_ingredients?: Array<{ name: string; strength: string }>;
  labeler_name?: string;
  product_type?: string;
  route?: string[];
  packaging?: Array<{ package_ndc: string; description?: string }>;
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

/**
 * NDC codes come in 3 standard configurations (total 10 digits for product, 11 for package):
 *   4-4-2  (labeler-product-package)
 *   5-3-2
 *   5-4-1
 * 
 * OpenFDA stores product_ndc WITHOUT the package segment (labeler-product only).
 * Package NDCs in packaging[] include the package segment.
 * 
 * Users may enter 10-digit (product) or 11-digit (full package) NDCs.
 * We need to try all plausible splits.
 */

// Extract product_ndc candidates from a raw NDC string
function getProductNdcCandidates(ndc: string): string[] {
  const clean = ndc.replace(/\D/g, '');
  const candidates: string[] = [];

  if (clean.length === 11) {
    // 11 digits = full package NDC. Try all 3 splits to get product portion:
    // 4-4-2 → product = first 8 digits → format as XXXX-XXXX
    candidates.push(`${clean.slice(0, 4)}-${clean.slice(4, 8)}`);
    // 5-3-2 → product = first 8 digits → format as XXXXX-XXX
    candidates.push(`${clean.slice(0, 5)}-${clean.slice(5, 8)}`);
    // 5-4-1 → product = first 9 digits → format as XXXXX-XXXX
    candidates.push(`${clean.slice(0, 5)}-${clean.slice(5, 9)}`);
  } else if (clean.length === 10) {
    // 10 digits = could be product NDC or package NDC without leading zeros
    // As product: try all splits
    candidates.push(`${clean.slice(0, 4)}-${clean.slice(4, 8)}`);  // 4-4
    candidates.push(`${clean.slice(0, 5)}-${clean.slice(5, 8)}`);  // 5-3
    candidates.push(`${clean.slice(0, 5)}-${clean.slice(5, 9)}`);  // 5-4
    // Also try as 11-digit with leading zero
    const padded = '0' + clean;
    candidates.push(`${padded.slice(0, 4)}-${padded.slice(4, 8)}`);
    candidates.push(`${padded.slice(0, 5)}-${padded.slice(5, 8)}`);
    candidates.push(`${padded.slice(0, 5)}-${padded.slice(5, 9)}`);
  } else if (clean.length >= 7 && clean.length <= 9) {
    // Might already be a product NDC without dashes
    if (clean.length === 8) {
      candidates.push(`${clean.slice(0, 4)}-${clean.slice(4)}`);
      candidates.push(`${clean.slice(0, 5)}-${clean.slice(5)}`);
    } else if (clean.length === 9) {
      candidates.push(`${clean.slice(0, 5)}-${clean.slice(5)}`);
      candidates.push(`${clean.slice(0, 4)}-${clean.slice(4)}`);
    }
  }

  // If input already has dashes, extract the product portion (first two segments)
  const parts = ndc.split('-');
  if (parts.length === 3) {
    candidates.push(`${parts[0]}-${parts[1]}`);
    // Also try stripping leading zero from labeler
    if (parts[0].startsWith('0') && parts[0].length > 1) {
      candidates.push(`${parts[0].slice(1)}-${parts[1]}`);
    }
  } else if (parts.length === 2) {
    candidates.push(ndc);
  }

  // Deduplicate
  return [...new Set(candidates)];
}

// Get package NDC format candidates for searching packaging.package_ndc
function getPackageNdcCandidates(ndc: string): string[] {
  const clean = ndc.replace(/\D/g, '');
  const candidates: string[] = [];

  if (clean.length === 11) {
    // Try all 3 format splits
    candidates.push(`${clean.slice(0, 4)}-${clean.slice(4, 8)}-${clean.slice(8)}`);
    candidates.push(`${clean.slice(0, 5)}-${clean.slice(5, 8)}-${clean.slice(8)}`);
    candidates.push(`${clean.slice(0, 5)}-${clean.slice(5, 9)}-${clean.slice(9)}`);
  } else if (clean.length === 10) {
    // Might be missing a leading zero - try with and without
    candidates.push(`${clean.slice(0, 4)}-${clean.slice(4, 8)}-${clean.slice(8)}`);
    candidates.push(`${clean.slice(0, 5)}-${clean.slice(5, 8)}-${clean.slice(8)}`);
    candidates.push(`${clean.slice(0, 5)}-${clean.slice(5, 9)}-${clean.slice(9)}`);
    const padded = '0' + clean;
    candidates.push(`${padded.slice(0, 4)}-${padded.slice(4, 8)}-${padded.slice(8)}`);
    candidates.push(`${padded.slice(0, 5)}-${padded.slice(5, 8)}-${padded.slice(8)}`);
    candidates.push(`${padded.slice(0, 5)}-${padded.slice(5, 9)}-${padded.slice(9)}`);
  }

  // If already formatted with dashes, include as-is
  if (ndc.includes('-')) {
    candidates.push(ndc);
    // Strip leading zero variant
    const parts = ndc.split('-');
    if (parts.length === 3 && parts[0].startsWith('0') && parts[0].length > 1) {
      candidates.push(`${parts[0].slice(1)}-${parts[1]}-${parts[2]}`);
    }
  }

  return [...new Set(candidates)];
}

async function searchOpenFDA(searchQuery: string): Promise<OpenFDAProduct[] | null> {
  try {
    const url = `https://api.fda.gov/drug/ndc.json?${searchQuery}&limit=5`;
    console.log(`OpenFDA request: ${url}`);
    const response = await fetch(url);
    if (!response.ok) return null;
    const data = await response.json();
    return data?.results || null;
  } catch (error) {
    console.error('OpenFDA search error:', error);
    return null;
  }
}

function formatProduct(product: OpenFDAProduct, originalNdc: string): MedicationResult {
  let strength = 'See label';
  if (product.active_ingredients?.length) {
    const strengths = product.active_ingredients.map(i => i.strength).filter(Boolean);
    if (strengths.length) strength = strengths.join(', ');
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

async function lookupNdc(ndc: string): Promise<MedicationResult | null> {
  console.log(`Looking up NDC: ${ndc}`);

  // Strategy 1: Search by product_ndc (labeler-product, no package segment)
  const productCandidates = getProductNdcCandidates(ndc);
  console.log(`Product NDC candidates: ${productCandidates.join(', ')}`);

  for (const candidate of productCandidates) {
    const results = await searchOpenFDA(`search=product_ndc:"${candidate}"`);
    if (results?.length) return formatProduct(results[0], ndc);
  }

  // Strategy 2: Search by packaging.package_ndc (full NDC with package segment)
  const packageCandidates = getPackageNdcCandidates(ndc);
  console.log(`Package NDC candidates: ${packageCandidates.join(', ')}`);

  for (const candidate of packageCandidates) {
    const results = await searchOpenFDA(`search=packaging.package_ndc:"${candidate}"`);
    if (results?.length) return formatProduct(results[0], ndc);
  }

  // Strategy 3: Wildcard search with core digits (less precise but catches edge cases)
  const clean = ndc.replace(/\D/g, '');
  if (clean.length >= 8) {
    // Search with middle portion of the NDC to avoid leading/trailing zero issues
    const core = clean.length >= 10 ? clean.slice(1, 9) : clean.slice(0, 8);
    const results = await searchOpenFDA(`search=product_ndc:*${core}*`);
    if (results?.length) return formatProduct(results[0], ndc);
  }

  return null;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { ndc } = await req.json();

    if (!ndc) {
      return new Response(
        JSON.stringify({ error: 'NDC code is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Received NDC lookup request for: ${ndc}`);
    const result = await lookupNdc(ndc);

    if (result) {
      console.log(`Found medication: ${result.name}`);
      return new Response(
        JSON.stringify({ success: true, medication: result }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`No medication found for NDC: ${ndc}`);
    return new Response(
      JSON.stringify({ success: false, error: 'Medication not found in FDA database', ndc }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error processing NDC lookup:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
