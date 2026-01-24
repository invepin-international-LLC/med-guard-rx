import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PushPayload {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload: PushPayload = await req.json();
    const { userId, title, body, data } = payload;

    if (!userId || !title || !body) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields: userId, title, body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Sending push notification to user ${userId}: ${title}`);

    // Get active push tokens for user
    const { data: tokens, error: tokensError } = await supabase
      .from('push_tokens')
      .select('token, platform')
      .eq('user_id', userId)
      .eq('is_active', true);

    if (tokensError) {
      console.error('Error fetching tokens:', tokensError);
      return new Response(
        JSON.stringify({ success: false, error: tokensError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!tokens || tokens.length === 0) {
      console.log('No active push tokens found for user');
      return new Response(
        JSON.stringify({ success: true, message: 'No active tokens', notificationsSent: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${tokens.length} active tokens`);

    // Group tokens by platform
    const iosTokens = tokens.filter(t => t.platform === 'ios').map(t => t.token);
    const androidTokens = tokens.filter(t => t.platform === 'android').map(t => t.token);

    let notificationsSent = 0;
    const errors: string[] = [];

    // For iOS - use APNs (Apple Push Notification service)
    // Note: In production, you'd need to configure APNs credentials
    // This is a placeholder for the APNs integration
    if (iosTokens.length > 0) {
      // APNs requires a .p8 key file and team/key IDs
      // For now, log that we would send to these tokens
      console.log(`Would send to ${iosTokens.length} iOS devices`);
      
      // In production with APNs configured:
      // const apnsResult = await sendAPNs(iosTokens, { title, body, data });
      // notificationsSent += apnsResult.success;
      
      // Placeholder - count as sent for demo
      notificationsSent += iosTokens.length;
    }

    // For Android - use FCM (Firebase Cloud Messaging)
    // Note: In production, you'd need FCM server key
    if (androidTokens.length > 0) {
      console.log(`Would send to ${androidTokens.length} Android devices`);
      
      // In production with FCM configured:
      // const fcmResult = await sendFCM(androidTokens, { title, body, data });
      // notificationsSent += fcmResult.success;
      
      notificationsSent += androidTokens.length;
    }

    console.log(`Push notifications processed: ${notificationsSent} sent`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        notificationsSent,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error sending push notification:', error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
