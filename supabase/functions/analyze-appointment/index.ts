import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are a medical appointment translator. You receive a transcript from a doctor's appointment plus the patient's medication list and pre-loaded questions.

Your job is to produce a JSON response with these fields:

1. "plain_summary" - A plain English summary of the appointment. Replace ALL medical jargon with simple language. Use bullet points. Be thorough but clear. Format as markdown.

2. "follow_up_flags" - An array of objects with { "flag": string, "urgency": "high" | "medium" | "low", "detail": string }. Flag anything the patient should follow up on: tests to schedule, symptoms to watch, lifestyle changes mentioned, referrals, etc.

3. "medication_mentions" - An array of objects with { "name": string, "context": string, "action": "continue" | "new" | "stop" | "adjust" | "discussed" }. Extract every medication mentioned and what was said about it.

4. "questions_addressed" - An array of strings representing which of the patient's pre-loaded questions were addressed in the conversation (match by semantic similarity, not exact text).

5. "missed_questions" - An array of strings representing questions that were NOT addressed. Suggest how to bring them up next time.

Respond ONLY with valid JSON. No markdown code fences.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { transcript, medications, questions } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    if (!transcript || transcript.trim().length < 20) {
      return new Response(JSON.stringify({ error: "Transcript too short to analyze" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let medContext = '';
    if (medications && Array.isArray(medications) && medications.length > 0) {
      medContext = `\n\nPatient's current medications:\n${medications.map((m: any) =>
        `- ${m.name}${m.strength ? ' ' + m.strength : ''}${m.form ? ' (' + m.form + ')' : ''}${m.purpose ? ' — for: ' + m.purpose : ''}`
      ).join('\n')}`;
    }

    let questionsContext = '';
    if (questions && Array.isArray(questions) && questions.length > 0) {
      questionsContext = `\n\nPatient's pre-loaded questions:\n${questions.map((q: string, i: number) => `${i + 1}. ${q}`).join('\n')}`;
    }

    const userPrompt = `Here is the appointment transcript:\n\n${transcript}${medContext}${questionsContext}\n\nAnalyze this appointment and return the JSON response.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "AI is busy. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please contact support." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI analysis failed");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) throw new Error("No response from AI");

    // Parse the JSON response - strip markdown fences if present
    let cleaned = content.trim();
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }

    const analysis = JSON.parse(cleaned);

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-appointment error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
