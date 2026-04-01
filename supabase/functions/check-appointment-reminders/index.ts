import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const now = new Date();

    // Find appointments in the next 24-25 hours that haven't had 24h reminder sent
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const in25h = new Date(now.getTime() + 25 * 60 * 60 * 1000);

    const { data: upcoming24h, error: err24 } = await supabase
      .from("appointments")
      .select("id, user_id, title, doctor_name, appointment_date")
      .eq("reminder_24h_sent", false)
      .in("status", ["scheduled", "recording"])
      .gte("appointment_date", in24h.toISOString())
      .lte("appointment_date", in25h.toISOString());

    if (err24) console.error("24h query error:", err24);

    // Find appointments in the next 55-65 minutes that haven't had 1h reminder sent
    const in55m = new Date(now.getTime() + 55 * 60 * 1000);
    const in65m = new Date(now.getTime() + 65 * 60 * 1000);

    const { data: upcoming1h, error: err1 } = await supabase
      .from("appointments")
      .select("id, user_id, title, doctor_name, appointment_date")
      .eq("reminder_1h_sent", false)
      .in("status", ["scheduled", "recording"])
      .gte("appointment_date", in55m.toISOString())
      .lte("appointment_date", in65m.toISOString());

    if (err1) console.error("1h query error:", err1);

    let sent24 = 0;
    let sent1 = 0;

    // Send 24-hour reminders
    for (const apt of upcoming24h || []) {
      try {
        // Get user's push tokens
        const { data: tokens } = await supabase
          .from("push_tokens")
          .select("token, platform")
          .eq("user_id", apt.user_id)
          .eq("is_active", true);

        if (tokens && tokens.length > 0) {
          const doctorText = apt.doctor_name ? ` with Dr. ${apt.doctor_name}` : "";
          const aptDate = new Date(apt.appointment_date);
          const timeStr = aptDate.toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
          });

          await supabase.functions.invoke("send-push-notification", {
            body: {
              tokens: tokens.map((t: any) => ({
                token: t.token,
                platform: t.platform,
              })),
              title: "📅 Appointment Tomorrow",
              body: `${apt.title}${doctorText} at ${timeStr}. Tap to pre-load your questions!`,
              data: {
                type: "appointment_reminder",
                appointmentId: apt.id,
              },
            },
          });
        }

        // Mark reminder as sent
        await supabase
          .from("appointments")
          .update({ reminder_24h_sent: true })
          .eq("id", apt.id);

        sent24++;
      } catch (e) {
        console.error(`Failed to send 24h reminder for ${apt.id}:`, e);
      }
    }

    // Send 1-hour reminders
    for (const apt of upcoming1h || []) {
      try {
        const { data: tokens } = await supabase
          .from("push_tokens")
          .select("token, platform")
          .eq("user_id", apt.user_id)
          .eq("is_active", true);

        if (tokens && tokens.length > 0) {
          const doctorText = apt.doctor_name ? ` with Dr. ${apt.doctor_name}` : "";

          // Count pre-loaded questions
          const { count } = await supabase
            .from("appointment_questions")
            .select("id", { count: "exact", head: true })
            .eq("appointment_id", apt.id);

          const questionText =
            count && count > 0
              ? ` You have ${count} question${count > 1 ? "s" : ""} ready.`
              : " Don't forget to add questions you want to ask!";

          await supabase.functions.invoke("send-push-notification", {
            body: {
              tokens: tokens.map((t: any) => ({
                token: t.token,
                platform: t.platform,
              })),
              title: "⏰ Appointment in 1 Hour",
              body: `${apt.title}${doctorText} starts soon!${questionText}`,
              data: {
                type: "appointment_reminder",
                appointmentId: apt.id,
              },
            },
          });
        }

        await supabase
          .from("appointments")
          .update({ reminder_1h_sent: true })
          .eq("id", apt.id);

        sent1++;
      } catch (e) {
        console.error(`Failed to send 1h reminder for ${apt.id}:`, e);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        reminders_24h_sent: sent24,
        reminders_1h_sent: sent1,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Appointment reminder check error:", error);
    return new Response(
      JSON.stringify({ error: "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
