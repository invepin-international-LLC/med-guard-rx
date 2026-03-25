import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    // Verify the user's JWT from the Authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Create a client with the user's JWT to identify who is calling
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = user.id;

    // Use service role client to delete user data and auth account
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Delete user data from all tables (order matters for foreign keys)
    const tables = [
      { table: "caregiver_notifications", column: "user_id" },
      { table: "dose_logs", column: "user_id" },
      { table: "scheduled_doses", column: "user_id" },
      { table: "drug_interactions", column: "medication_id_1", custom: true },
      { table: "medications", column: "user_id" },
      { table: "adherence_streaks", column: "user_id" },
      { table: "emergency_contacts", column: "user_id" },
      { table: "pharmacies", column: "user_id" },
      { table: "push_tokens", column: "user_id" },
      { table: "caregiver_invitations", column: "patient_id" },
      { table: "caregiver_relationships", column: "patient_id" },
      { table: "caregiver_relationships", column: "caregiver_id" },
      { table: "symptom_logs", column: "user_id" },
      { table: "hipaa_access_log", column: "user_id" },
      { table: "hipaa_records", column: "user_id" },
      { table: "user_badges", column: "user_id" },
      { table: "user_challenges", column: "user_id" },
      { table: "user_inventory", column: "user_id" },
      { table: "user_preferences", column: "user_id" },
      { table: "user_rewards", column: "user_id" },
      { table: "spin_history", column: "user_id" },
      { table: "profiles", column: "user_id" },
    ];

    for (const { table, column } of tables) {
      await adminClient.from(table).delete().eq(column, userId);
    }

    // Delete the auth user account entirely
    const { error: deleteError } =
      await adminClient.auth.admin.deleteUser(userId);

    if (deleteError) {
      console.error("Error deleting auth user:", deleteError);
      return new Response(
        JSON.stringify({ error: "Failed to delete auth account" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: "Account fully deleted" }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
