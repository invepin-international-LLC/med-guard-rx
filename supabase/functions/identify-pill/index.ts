import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI service not configured" }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { imageBase64, expectedMedication } = await req.json();
    if (!imageBase64) {
      return new Response(JSON.stringify({ error: "No image provided" }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const expectedBlock = expectedMedication
      ? `\n\nThe user has scanned their prescription bottle label. The pill in the photo SHOULD be this medication:
- Name: ${expectedMedication.name ?? "(unknown)"}
- Generic: ${expectedMedication.genericName ?? "(unknown)"}
- Strength: ${expectedMedication.strength ?? "(unknown)"}
- Form: ${expectedMedication.form ?? "(unknown)"}
- Manufacturer: ${expectedMedication.manufacturer ?? "(unknown)"}
- NDC: ${expectedMedication.ndcCode ?? "(unknown)"}

Your job is to compare the pill in the photo to this specific prescription and return a verdict:
- "match" if the imprint/color/shape/size are consistent with this medication and strength
- "mismatch" if the pill clearly does NOT look like this medication (different imprint, wrong color, wrong shape)
- "uncertain" if the photo is unclear or characteristics are ambiguous
Explain your reasoning. If mismatch, warn strongly about counterfeits and potential fentanyl contamination.`
      : "";

    const systemPrompt = `You are a pharmaceutical pill identification expert. Analyze the pill image and extract:
1. Imprint text (letters, numbers, logos on the pill)
2. Color (primary and any secondary colors)
3. Shape (round, oval, oblong, capsule, diamond, triangle, etc.)
4. Size estimate (small, medium, large)
5. Scoring (any break lines)
6. Any other distinguishing features

Then suggest up to 3 possible medication matches based on these characteristics. For each match provide the drug name, strength, and your confidence level (high/medium/low).

IMPORTANT: Always include a safety disclaimer that visual identification is not definitive and pills should be verified by a pharmacist. Warn about counterfeit pills potentially containing fentanyl.${expectedBlock}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: "Identify this pill. Provide the physical characteristics and possible medication matches." },
              { type: "image_url", image_url: { url: imageBase64 } },
            ],
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "identify_pill",
              description: "Return structured pill identification results",
              parameters: {
                type: "object",
                properties: {
                  characteristics: {
                    type: "object",
                    properties: {
                      imprint: { type: "string", description: "Text/numbers/logos imprinted on the pill" },
                      color: { type: "string", description: "Primary color of the pill" },
                      shape: { type: "string", description: "Shape of the pill" },
                      size: { type: "string", enum: ["small", "medium", "large"] },
                      scoring: { type: "string", description: "Break line description or 'none'" },
                      coating: { type: "string", description: "Coating type: coated, uncoated, gel cap, etc." },
                      additional_notes: { type: "string", description: "Any other distinguishing features" },
                    },
                    required: ["imprint", "color", "shape", "size"],
                  },
                  matches: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string", description: "Drug name (brand or generic)" },
                        strength: { type: "string", description: "Dosage strength" },
                        manufacturer: { type: "string", description: "Manufacturer if known" },
                        confidence: { type: "string", enum: ["high", "medium", "low"] },
                        reason: { type: "string", description: "Why this is a match" },
                      },
                      required: ["name", "strength", "confidence", "reason"],
                    },
                  },
                  warnings: {
                    type: "array",
                    items: { type: "string" },
                    description: "Safety warnings about this identification",
                  },
                  prescription_match: {
                    type: "object",
                    description: "Verdict comparing the pill to the user's scanned prescription. Only include when an expected medication was provided.",
                    properties: {
                      verdict: { type: "string", enum: ["match", "mismatch", "uncertain"] },
                      explanation: { type: "string" },
                      expected_name: { type: "string" },
                      expected_strength: { type: "string" },
                    },
                    required: ["verdict", "explanation"],
                  },
                },
                required: ["characteristics", "matches", "warnings"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "identify_pill" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Service is busy. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI service quota exceeded." }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      return new Response(JSON.stringify({ error: "Failed to analyze pill image" }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    const toolCall = data?.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall?.function?.arguments) {
      console.error("No structured response from AI");
      return new Response(JSON.stringify({ error: "Could not identify the pill. Try a clearer photo." }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let result;
    try {
      result = typeof toolCall.function.arguments === 'string' 
        ? JSON.parse(toolCall.function.arguments) 
        : toolCall.function.arguments;
    } catch {
      return new Response(JSON.stringify({ error: "Failed to parse identification results" }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Always inject safety warning
    if (!result.warnings || result.warnings.length === 0) {
      result.warnings = [
        "Visual identification is NOT definitive. Always verify with a pharmacist.",
        "Counterfeit pills may look identical to real medications but contain deadly fentanyl.",
        "Use fentanyl test strips for reliable detection.",
      ];
    }

    return new Response(JSON.stringify({ success: true, ...result }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in identify-pill:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
