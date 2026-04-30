import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are Dr. Bombay, a friendly and knowledgeable AI medication assistant within the Med Guard Rx app. You are represented by a shield avatar with an Rx symbol.

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

CITATIONS — MANDATORY WITHOUT EXCEPTION (Apple App Store Guideline 1.4.1):
- You MUST ALWAYS include a "Sources & further reading" section at the end of EVERY response — no exceptions, even for simple or short answers. The ONLY exception is a pure greeting like "hello" or "thank you" with zero medical content.
- Even if you are unsure which specific page to link, you MUST still include the general source links below.
- Prefer these primary sources and link directly to the relevant page when possible:
  • U.S. FDA Drug Information — https://www.fda.gov/drugs
  • DailyMed (official FDA drug labels) — https://dailymed.nlm.nih.gov/dailymed/
  • NIH MedlinePlus Drug Information — https://medlineplus.gov/druginformation.html
  • RxList — https://www.rxlist.com/
  • Drugs.com — https://www.drugs.com/
  • CDC — https://www.cdc.gov/
  • Poison Control — https://www.poison.org/ (1-800-222-1222)
- For specific drugs, link to the MedlinePlus or DailyMed page for that drug (e.g. https://medlineplus.gov/druginfo/meds/a696005.html for Metformin). If you don't know the exact deep link, link to the search/landing page above and tell the user to search the drug name there.
- Format Sources as a markdown bullet list of links, e.g.:
  **Sources & further reading:**
  - [FDA: Metformin label (DailyMed)](https://dailymed.nlm.nih.gov/dailymed/search.cfm?query=metformin)
  - [MedlinePlus: Metformin](https://medlineplus.gov/druginfo/meds/a696005.html)
- ALWAYS end with this exact disclaimer line on its own:
  > ⚠️ This is general information, not medical advice. Always confirm with your doctor or pharmacist before changing how you take any medication.
- The ONLY responses that may omit citations are pure social exchanges with absolutely zero health/drug/medication content (e.g. "Hello!", "You're welcome!"). If in doubt, INCLUDE citations.

Format your responses in clean markdown with headers, bullet points, bold text for emphasis, and the Sources + disclaimer block at the end. Remember: citations are MANDATORY on virtually every response.`;

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
        return new Response(JSON.stringify({ error: "Dr. Bombay is getting a lot of questions right now. Please try again in a moment." }), {
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
      return new Response(JSON.stringify({ error: "Dr. Bombay is temporarily unavailable. Please try again." }), {
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
