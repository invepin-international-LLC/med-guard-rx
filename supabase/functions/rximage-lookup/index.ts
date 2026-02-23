import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ImageResult {
  imageUrl: string | null;
  imageUrls: string[];
  name?: string;
}

async function lookupViaDailyMed(name: string): Promise<ImageResult> {
  try {
    // Step 1: Search for the drug by name to get SPL set ID
    const searchUrl = `https://dailymed.nlm.nih.gov/dailymed/services/v2/spls.json?drug_name=${encodeURIComponent(name)}&pagesize=1`;
    console.log(`DailyMed search: ${searchUrl}`);
    const searchRes = await fetch(searchUrl);
    if (!searchRes.ok) return { imageUrl: null, imageUrls: [] };

    const searchData = await searchRes.json();
    const spls = searchData?.data || [];
    if (spls.length === 0) return { imageUrl: null, imageUrls: [] };

    const setId = spls[0]?.setid;
    if (!setId) return { imageUrl: null, imageUrls: [] };

    // Step 2: Get media (images) for that SPL
    const mediaUrl = `https://dailymed.nlm.nih.gov/dailymed/services/v2/spls/${setId}/media.json`;
    console.log(`DailyMed media: ${mediaUrl}`);
    const mediaRes = await fetch(mediaUrl);
    if (!mediaRes.ok) return { imageUrl: null, imageUrls: [] };

    const mediaData = await mediaRes.json();
    console.log('DailyMed media response keys:', JSON.stringify(Object.keys(mediaData)));
    
    // The media endpoint may return data as an array or nested differently
    let mediaItems: any[] = [];
    if (Array.isArray(mediaData?.data)) {
      mediaItems = mediaData.data;
    } else if (Array.isArray(mediaData)) {
      mediaItems = mediaData;
    }

    // Filter for image files
    const images = mediaItems
      .filter((m: any) => m.mime_type?.startsWith('image/') || m.name?.match(/\.(jpg|jpeg|png|gif)$/i))
      .map((m: any) => `https://dailymed.nlm.nih.gov/dailymed/image.cfm?setid=${setId}&name=${m.name}`);

    if (images.length === 0) {
      // Fallback: try direct image URL pattern
      const directUrl = `https://dailymed.nlm.nih.gov/dailymed/image.cfm?setid=${setId}&type=img`;
      return { imageUrl: directUrl, imageUrls: [directUrl], name: spls[0]?.title };
    }

    return {
      imageUrl: images[0],
      imageUrls: images,
      name: spls[0]?.title,
    };
  } catch (error) {
    console.error('DailyMed lookup error:', error);
    return { imageUrl: null, imageUrls: [] };
  }
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { ndc, rxcui, name } = await req.json();
    
    // Use the drug name for DailyMed lookup
    const searchName = name || '';
    let result: ImageResult = { imageUrl: null, imageUrls: [] };

    if (searchName) {
      result = await lookupViaDailyMed(searchName);
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
