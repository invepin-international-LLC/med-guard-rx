import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AlertPayload {
  userId: string;
  medicationName: string;
  scheduledTime: string;
  doseLogId: string;
}

async function sendTwilioSMS(to: string, body: string): Promise<{ success: boolean; error?: string; sid?: string }> {
  const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
  const fromNumber = Deno.env.get('TWILIO_PHONE_NUMBER');

  if (!accountSid || !authToken || !fromNumber) {
    console.error('Missing Twilio credentials');
    return { success: false, error: 'Missing Twilio credentials' };
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  
  const formData = new URLSearchParams();
  formData.append('To', to);
  formData.append('From', fromNumber);
  formData.append('Body', body);

  try {
    console.log(`Sending SMS to ${to}`);
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    const result = await response.json();
    
    if (!response.ok) {
      console.error('Twilio API error:', result);
      return { success: false, error: result.message || 'Failed to send SMS' };
    }

    console.log('SMS sent successfully:', result.sid);
    return { success: true, sid: result.sid };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error sending SMS:', error);
    return { success: false, error: errorMessage };
  }
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { userId, medicationName, scheduledTime, doseLogId } = await req.json() as AlertPayload;

    console.log(`Processing caregiver alert for user ${userId}, medication: ${medicationName}`);

    // Get user's profile name
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('name')
      .eq('user_id', userId)
      .single();

    if (profileError) {
      console.error('Error fetching profile:', profileError);
    }

    const patientName = profile?.name || 'Your patient';

    // Get emergency contacts who should be notified on missed doses
    const { data: contacts, error: contactsError } = await supabase
      .from('emergency_contacts')
      .select('id, name, phone, relationship')
      .eq('user_id', userId)
      .eq('notify_on_missed_dose', true);

    if (contactsError) {
      console.error('Error fetching contacts:', contactsError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to fetch emergency contacts' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!contacts || contacts.length === 0) {
      console.log('No contacts configured for missed dose notifications');
      return new Response(
        JSON.stringify({ success: true, message: 'No contacts to notify', notificationsSent: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const formattedTime = new Date(scheduledTime).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });

    const results = [];

    for (const contact of contacts) {
      const message = `⚠️ MedMinder Alert: ${patientName} missed their ${medicationName} dose scheduled for ${formattedTime}. Please check on them.`;

      // Send SMS
      const smsResult = await sendTwilioSMS(contact.phone, message);

      // Log the notification
      const { error: logError } = await supabase
        .from('caregiver_notifications')
        .insert({
          user_id: userId,
          contact_id: contact.id,
          dose_log_id: doseLogId,
          notification_type: 'missed_dose',
          channel: 'sms',
          status: smsResult.success ? 'sent' : 'failed',
          sent_at: smsResult.success ? new Date().toISOString() : null,
        });

      if (logError) {
        console.error('Error logging notification:', logError);
      }

      results.push({
        contactId: contact.id,
        contactName: contact.name,
        success: smsResult.success,
        error: smsResult.error,
      });
    }

    const successCount = results.filter(r => r.success).length;
    console.log(`Sent ${successCount}/${results.length} notifications successfully`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        notificationsSent: successCount,
        totalContacts: results.length,
        results 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in send-caregiver-alert:', error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
