import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are Dr. Rx, a friendly and knowledgeable AI medication assistant within the Med Guard Rx app. You are represented by a shield avatar with an Rx symbol.

Your expertise includes:
- Drug information: uses, dosages, side effects, contraindications
- Drug interactions and safety warnings
- General medication guidance and adherence tips
- Over-the-counter vs prescription medication questions
- How medications work (mechanisms of action)
- Storage, expiration, and disposal of medications
- Understanding prescription labels

Important guidelines:
- Always be warm, clear, and reassuring in your tone
- Use simple language — many users are elderly
- When discussing serious interactions or side effects, advise the user to consult their doctor or pharmacist
- NEVER diagnose conditions or recommend starting/stopping medications — always defer to their healthcare provider
- If asked about emergencies (overdose, severe reactions), immediately recommend calling 911 or Poison Control (1-800-222-1222)
- Keep responses concise but thorough — use bullet points for lists
- You can reference common drug classes, generic/brand names, and FDA-approved information
- Always add a brief disclaimer when giving medical information

Format your responses in clean markdown with headers, bullet points, and bold text for emphasis.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, medications } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    // Build personalized context from the user's medication list
    let medContext = '';
    if (medications && Array.isArray(medications) && medications.length > 0) {
      medContext = `\n\nThe user currently takes these medications:\n${medications.map((m: any) =>
        `- ${m.name}${m.strength ? ' ' + m.strength : ''}${m.form ? ' (' + m.form + ')' : ''}${m.purpose ? ' — for: ' + m.purpose : ''}${m.instructions ? ' | Instructions: ' + m.instructions : ''}`
      ).join('\n')}\n\nUse this medication list to give personalized, relevant answers. Proactively flag potential interactions between their medications when relevant. Reference their specific medications by name when applicable.`;
    }
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT + medContext },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Dr. Rx is getting a lot of questions right now. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits have been exhausted. Please contact support." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Dr. Rx is temporarily unavailable. Please try again." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("dr-rx-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
