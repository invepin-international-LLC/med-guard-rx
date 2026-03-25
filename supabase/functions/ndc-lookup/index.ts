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
function stripLeadingZeros(segment: string): string {
  const stripped = segment.replace(/^0+/, '');
  return stripped || '0';
}

function addWithZeroVariants(candidates: string[], labeler: string, product: string) {
  // Add the exact format
  candidates.push(`${labeler}-${product}`);
  // Strip leading zeros from each segment (FDA stores without padding)
  candidates.push(`${stripLeadingZeros(labeler)}-${stripLeadingZeros(product)}`);
  candidates.push(`${labeler}-${stripLeadingZeros(product)}`);
  candidates.push(`${stripLeadingZeros(labeler)}-${product}`);
}

function getProductNdcCandidates(ndc: string): string[] {
  const clean = ndc.replace(/\D/g, '');
  const candidates: string[] = [];

  if (clean.length === 11) {
    // 11 digits = full package NDC. Try all 3 splits:
    addWithZeroVariants(candidates, clean.slice(0, 4), clean.slice(4, 8)); // 4-4-2
    addWithZeroVariants(candidates, clean.slice(0, 5), clean.slice(5, 8)); // 5-3-2
    addWithZeroVariants(candidates, clean.slice(0, 5), clean.slice(5, 9)); // 5-4-1
  } else if (clean.length === 10) {
    addWithZeroVariants(candidates, clean.slice(0, 4), clean.slice(4, 8));
    addWithZeroVariants(candidates, clean.slice(0, 5), clean.slice(5, 8));
    addWithZeroVariants(candidates, clean.slice(0, 5), clean.slice(5, 9));
    // Also try as 11-digit with leading zero
    const padded = '0' + clean;
    addWithZeroVariants(candidates, padded.slice(0, 4), padded.slice(4, 8));
    addWithZeroVariants(candidates, padded.slice(0, 5), padded.slice(5, 8));
    addWithZeroVariants(candidates, padded.slice(0, 5), padded.slice(5, 9));
  } else if (clean.length >= 7 && clean.length <= 9) {
    if (clean.length === 8) {
      addWithZeroVariants(candidates, clean.slice(0, 4), clean.slice(4));
      addWithZeroVariants(candidates, clean.slice(0, 5), clean.slice(5));
    } else if (clean.length === 9) {
      addWithZeroVariants(candidates, clean.slice(0, 5), clean.slice(5));
      addWithZeroVariants(candidates, clean.slice(0, 4), clean.slice(4));
    }
  }

  // If input already has dashes, extract the product portion (first two segments)
  const parts = ndc.split('-');
  if (parts.length === 3) {
    addWithZeroVariants(candidates, parts[0], parts[1]);
  } else if (parts.length === 2) {
    addWithZeroVariants(candidates, parts[0], parts[1]);
  }

  return [...new Set(candidates)];
}

// Get package NDC format candidates for searching packaging.package_ndc
function addPackageWithZeroVariants(candidates: string[], lab: string, prod: string, pkg: string) {
  candidates.push(`${lab}-${prod}-${pkg}`);
  candidates.push(`${stripLeadingZeros(lab)}-${stripLeadingZeros(prod)}-${stripLeadingZeros(pkg)}`);
  candidates.push(`${lab}-${stripLeadingZeros(prod)}-${pkg}`);
  candidates.push(`${stripLeadingZeros(lab)}-${prod}-${pkg}`);
}

function getPackageNdcCandidates(ndc: string): string[] {
  const clean = ndc.replace(/\D/g, '');
  const candidates: string[] = [];

  if (clean.length === 11) {
    addPackageWithZeroVariants(candidates, clean.slice(0, 4), clean.slice(4, 8), clean.slice(8));
    addPackageWithZeroVariants(candidates, clean.slice(0, 5), clean.slice(5, 8), clean.slice(8));
    addPackageWithZeroVariants(candidates, clean.slice(0, 5), clean.slice(5, 9), clean.slice(9));
  } else if (clean.length === 10) {
    addPackageWithZeroVariants(candidates, clean.slice(0, 4), clean.slice(4, 8), clean.slice(8));
    addPackageWithZeroVariants(candidates, clean.slice(0, 5), clean.slice(5, 8), clean.slice(8));
    addPackageWithZeroVariants(candidates, clean.slice(0, 5), clean.slice(5, 9), clean.slice(9));
    const padded = '0' + clean;
    addPackageWithZeroVariants(candidates, padded.slice(0, 4), padded.slice(4, 8), padded.slice(8));
    addPackageWithZeroVariants(candidates, padded.slice(0, 5), padded.slice(5, 8), padded.slice(8));
    addPackageWithZeroVariants(candidates, padded.slice(0, 5), padded.slice(5, 9), padded.slice(9));
  }

  // If already formatted with dashes
  const parts = ndc.split('-');
  if (parts.length === 3) {
    addPackageWithZeroVariants(candidates, parts[0], parts[1], parts[2]);
  }

  return [...new Set(candidates)];
}

async function searchOpenFDA(searchQuery: string, limit = 5): Promise<OpenFDAProduct[] | null> {
  try {
    const url = `https://api.fda.gov/drug/ndc.json?${searchQuery}&limit=${limit}`;
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

  // Strategy 1: Batch search product_ndc with OR query
  const productCandidates = getProductNdcCandidates(ndc);
  console.log(`Product NDC candidates: ${productCandidates.join(', ')}`);

  // Try batching up to 8 candidates in a single OR query
  const batchSize = 8;
  for (let i = 0; i < productCandidates.length; i += batchSize) {
    const batch = productCandidates.slice(i, i + batchSize);
    const orQuery = batch.map(c => `product_ndc:"${c}"`).join('+OR+');
    const results = await searchOpenFDA(`search=${orQuery}`);
    if (results?.length) return formatProduct(results[0], ndc);
  }

  // Strategy 2: Batch search packaging.package_ndc
  const packageCandidates = getPackageNdcCandidates(ndc);
  console.log(`Package NDC candidates: ${packageCandidates.join(', ')}`);

  for (let i = 0; i < packageCandidates.length; i += batchSize) {
    const batch = packageCandidates.slice(i, i + batchSize);
    const orQuery = batch.map(c => `packaging.package_ndc:"${c}"`).join('+OR+');
    const results = await searchOpenFDA(`search=${orQuery}`);
    if (results?.length) return formatProduct(results[0], ndc);
  }

  // Strategy 3: Wildcard search with core digits
  const clean = ndc.replace(/\D/g, '');
  if (clean.length >= 8) {
    const core = clean.length >= 10 ? clean.slice(1, 9) : clean.slice(0, 8);
    const results = await searchOpenFDA(`search=product_ndc:*${core}*`);
    if (results?.length) return formatProduct(results[0], ndc);
  }

  return null;
}

async function searchByName(name: string): Promise<MedicationResult[]> {
  console.log(`Searching by drug name: ${name}`);
  const sanitized = name.replace(/[^a-zA-Z0-9 ]/g, '').trim();
  if (!sanitized) return [];

  const results: MedicationResult[] = [];

  // Search by brand_name and generic_name
  const brandResults = await searchOpenFDA(`search=brand_name:"${sanitized}"`, 10);
  const genericResults = await searchOpenFDA(`search=generic_name:"${sanitized}"`, 10);

  const allProducts = [...(brandResults || []), ...(genericResults || [])];
  
  // Deduplicate by product_ndc
  const seen = new Set<string>();
  for (const product of allProducts) {
    const key = product.product_ndc;
    if (key && !seen.has(key)) {
      seen.add(key);
      results.push(formatProduct(product, key));
    }
  }

  return results.slice(0, 10);
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { ndc, name } = body;

    // Name search mode
    if (name) {
      console.log(`Received name search request for: ${name}`);
      const results = await searchByName(name);

      if (results.length > 0) {
        console.log(`Found ${results.length} medications for name: ${name}`);
        return new Response(
          JSON.stringify({ success: true, medications: results }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: false, error: 'No medications found matching that name', name }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // NDC lookup mode
    if (!ndc) {
      return new Response(
        JSON.stringify({ error: 'NDC code or drug name is required' }),
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
    console.error('Error processing lookup:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
