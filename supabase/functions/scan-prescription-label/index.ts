import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { imageBase64 } = await req.json();
    if (!imageBase64) {
      return new Response(JSON.stringify({ error: "No image provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `You extract medication details from U.S. prescription bottle labels.

Rules:
- Focus on the medication name, generic name, strength, dosage form, directions, prescriber, manufacturer or pharmacy, and any clearly visible NDC.
- Many large barcodes on pharmacy bottle labels are internal prescription numbers or store IDs, NOT FDA NDC codes. Only return ndcCode if the image clearly shows an NDC or a medication code that is obviously the NDC.
- Only use information visible in the image. Do not invent missing fields.
- Normalize form to exactly one of: pill, capsule, liquid, injection, patch, inhaler, drops, cream.
- If the label is partially readable, return the best visible medication details and lower the confidence.
- If the label is unreadable, set readable to false.
- Keep instructions short and verbatim when possible.`;

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
              { type: "text", text: "Extract the medication details from this prescription bottle label photo." },
              { type: "image_url", image_url: { url: imageBase64 } },
            ],
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_prescription_label",
              description: "Return structured medication details extracted from a prescription bottle label image",
              parameters: {
                type: "object",
                properties: {
                  readable: {
                    type: "boolean",
                    description: "Whether enough of the prescription label is readable to identify the medication",
                  },
                  medication: {
                    type: "object",
                    properties: {
                      ndcCode: { type: "string" },
                      name: { type: "string" },
                      genericName: { type: "string" },
                      strength: { type: "string" },
                      form: {
                        type: "string",
                        enum: ["pill", "capsule", "liquid", "injection", "patch", "inhaler", "drops", "cream"],
                      },
                      manufacturer: { type: "string" },
                      route: { type: "string" },
                      productType: { type: "string" },
                      instructions: { type: "string" },
                      purpose: { type: "string" },
                      prescriber: { type: "string" },
                      confidence: {
                        type: "string",
                        enum: ["high", "medium", "low"],
                      },
                    },
                    required: ["name", "strength", "form", "confidence"],
                  },
                  notes: {
                    type: "array",
                    items: { type: "string" },
                  },
                },
                required: ["readable", "medication"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_prescription_label" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Service is busy. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI service quota exceeded." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      return new Response(JSON.stringify({ error: "Failed to read prescription label" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const toolCall = data?.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      return new Response(JSON.stringify({ error: "Could not read the prescription label. Try a clearer photo." }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = typeof toolCall.function.arguments === "string"
      ? JSON.parse(toolCall.function.arguments)
      : toolCall.function.arguments;

    if (!result?.readable || !result?.medication?.name || !result?.medication?.strength) {
      return new Response(JSON.stringify({
        success: false,
        error: "Could not read the medication details from this bottle. Try a closer, brighter photo of the label.",
        notes: result?.notes ?? [],
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      success: true,
      medication: {
        ndcCode: result.medication.ndcCode ?? "",
        name: result.medication.name,
        genericName: result.medication.genericName ?? "",
        strength: result.medication.strength,
        form: result.medication.form,
        manufacturer: result.medication.manufacturer ?? "",
        route: result.medication.route ?? "",
        productType: result.medication.productType ?? "",
        instructions: result.medication.instructions ?? "",
        purpose: result.medication.purpose ?? "",
        prescriber: result.medication.prescriber ?? "",
        confidence: result.medication.confidence ?? "medium",
        source: "label",
      },
      notes: result.notes ?? [],
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in scan-prescription-label:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});