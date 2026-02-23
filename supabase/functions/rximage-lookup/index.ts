import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { decode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface ImageResult {
  imageUrl: string | null;
  imageUrls: string[];
  name?: string;
  source?: 'dailymed' | 'ai-generated';
}

async function lookupViaDailyMed(name: string): Promise<ImageResult> {
  try {
    const searchUrl = `https://dailymed.nlm.nih.gov/dailymed/services/v2/spls.json?drug_name=${encodeURIComponent(name)}&pagesize=1`;
    console.log(`DailyMed search: ${searchUrl}`);
    const searchRes = await fetch(searchUrl);
    if (!searchRes.ok) return { imageUrl: null, imageUrls: [] };

    const searchData = await searchRes.json();
    const spls = searchData?.data || [];
    if (spls.length === 0) return { imageUrl: null, imageUrls: [] };

    const setId = spls[0]?.setid;
    if (!setId) return { imageUrl: null, imageUrls: [] };

    const mediaUrl = `https://dailymed.nlm.nih.gov/dailymed/services/v2/spls/${setId}/media.json`;
    console.log(`DailyMed media: ${mediaUrl}`);
    const mediaRes = await fetch(mediaUrl);
    if (!mediaRes.ok) return { imageUrl: null, imageUrls: [] };

    const mediaData = await mediaRes.json();

    let mediaItems: any[] = [];
    if (Array.isArray(mediaData?.data)) {
      mediaItems = mediaData.data;
    } else if (Array.isArray(mediaData)) {
      mediaItems = mediaData;
    }

    // Only use actual image files with direct URLs
    const images = mediaItems
      .filter((m: any) => (m.mime_type?.startsWith('image/') || m.name?.match(/\.(jpg|jpeg|png|gif)$/i)) && m.url)
      .map((m: any) => m.url);

    if (images.length === 0) return { imageUrl: null, imageUrls: [] };

    // Verify the first image URL actually returns an image
    try {
      const testRes = await fetch(images[0], { method: 'HEAD' });
      const contentType = testRes.headers.get('content-type') || '';
      if (!contentType.startsWith('image/')) {
        console.log(`DailyMed image URL returned non-image content-type: ${contentType}`);
        return { imageUrl: null, imageUrls: [] };
      }
    } catch {
      return { imageUrl: null, imageUrls: [] };
    }

    return {
      imageUrl: images[0],
      imageUrls: images,
      name: spls[0]?.title,
      source: 'dailymed',
    };
  } catch (error) {
    console.error('DailyMed lookup error:', error);
    return { imageUrl: null, imageUrls: [] };
  }
}

async function generatePillImage(name: string, form?: string, color?: string, strength?: string): Promise<ImageResult> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    console.error("LOVABLE_API_KEY not configured");
    return { imageUrl: null, imageUrls: [] };
  }

  try {
    const formDesc = form || 'tablet';
    const colorDesc = color || 'white';
    const strengthDesc = strength ? ` with "${strength}" imprinted on it` : '';
    
    const prompt = `A single photorealistic ${colorDesc} pharmaceutical ${formDesc} of "${name}"${strengthDesc}. The pill is placed on a light gray surface with soft studio lighting and a subtle shadow. Close-up macro photography style. No text, no watermarks, no background clutter. The pill should be clearly visible and well-lit.`;

    console.log(`Generating AI pill image for: ${name}`);
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [{ role: "user", content: prompt }],
        modalities: ["image", "text"],
      }),
    });

    if (!response.ok) {
      console.error("AI image generation failed:", response.status, await response.text());
      return { imageUrl: null, imageUrls: [] };
    }

    const data = await response.json();
    const imageDataUrl = data?.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    
    if (!imageDataUrl) {
      console.error("No image in AI response");
      return { imageUrl: null, imageUrls: [] };
    }

    // Extract base64 data and upload to storage
    const base64Match = imageDataUrl.match(/^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/);
    if (!base64Match) {
      console.error("Invalid image data URL format");
      return { imageUrl: null, imageUrls: [] };
    }

    const ext = base64Match[1] === 'jpeg' ? 'jpg' : base64Match[1];
    const base64Data = base64Match[2];
    const imageBytes = decode(base64Data);

    // Upload to Supabase storage
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const fileName = `${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from('pill-images')
      .upload(fileName, imageBytes, {
        contentType: `image/${base64Match[1]}`,
        upsert: true,
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      return { imageUrl: null, imageUrls: [] };
    }

    const { data: publicUrlData } = supabase.storage
      .from('pill-images')
      .getPublicUrl(fileName);

    const publicUrl = publicUrlData.publicUrl;
    console.log(`AI pill image uploaded: ${publicUrl}`);

    return {
      imageUrl: publicUrl,
      imageUrls: [publicUrl],
      name,
      source: 'ai-generated',
    };
  } catch (error) {
    console.error("AI image generation error:", error);
    return { imageUrl: null, imageUrls: [] };
  }
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { ndc, rxcui, name, form, color, strength } = await req.json();
    
    const searchName = name || '';
    let result: ImageResult = { imageUrl: null, imageUrls: [] };

    // Try DailyMed first
    if (searchName) {
      result = await lookupViaDailyMed(searchName);
    }

    // Fallback: generate AI image
    if (!result.imageUrl && searchName) {
      result = await generatePillImage(searchName, form, color, strength);
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
