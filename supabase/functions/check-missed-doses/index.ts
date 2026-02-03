import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date();
    const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

    console.log(`Checking for missed doses between ${twoHoursAgo.toISOString()} and ${thirtyMinutesAgo.toISOString()}`);

    // Find dose_logs that are:
    // 1. Still pending
    // 2. Scheduled between 2 hours ago and 30 minutes ago (giving grace period)
    // 3. Haven't already triggered an alert
    const { data: missedDoses, error: queryError } = await supabase
      .from('dose_logs')
      .select(`
        id,
        user_id,
        medication_id,
        scheduled_for,
        status
      `)
      .eq('status', 'pending')
      .gte('scheduled_for', twoHoursAgo.toISOString())
      .lte('scheduled_for', thirtyMinutesAgo.toISOString());

    if (queryError) {
      console.error('Error querying missed doses:', queryError);
      return new Response(
        JSON.stringify({ success: false, error: queryError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!missedDoses || missedDoses.length === 0) {
      console.log('No missed doses found');
      return new Response(
        JSON.stringify({ success: true, message: 'No missed doses', alertsSent: 0, pushNotificationsSent: 0, caregiverPushSent: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${missedDoses.length} missed doses`);

    // Check which doses haven't had alerts sent yet
    const doseLogIds = missedDoses.map(d => d.id);
    const { data: existingAlerts } = await supabase
      .from('caregiver_notifications')
      .select('dose_log_id')
      .in('dose_log_id', doseLogIds);

    const alertedDoseIds = new Set(existingAlerts?.map(a => a.dose_log_id) || []);
    const dosesToAlert = missedDoses.filter(d => !alertedDoseIds.has(d.id));

    console.log(`${dosesToAlert.length} doses need alerts (${alertedDoseIds.size} already alerted)`);

    let alertsSent = 0;
    let pushNotificationsSent = 0;
    let caregiverPushSent = 0;

    for (const dose of dosesToAlert) {
      // Get medication name
      const { data: medication } = await supabase
        .from('medications')
        .select('name')
        .eq('id', dose.medication_id)
        .single();

      if (!medication) {
        console.log(`Medication not found for dose ${dose.id}`);
        continue;
      }

      // Get patient's profile name for caregiver notifications
      const { data: patientProfile } = await supabase
        .from('profiles')
        .select('name')
        .eq('user_id', dose.user_id)
        .single();

      const patientName = patientProfile?.name || 'Your patient';

      // Format scheduled time for display
      const scheduledDate = new Date(dose.scheduled_for);
      const timeString = scheduledDate.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });

      // Send push notification to the user
      try {
        const pushResponse = await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({
            userId: dose.user_id,
            title: `⚠️ Missed Dose: ${medication.name}`,
            body: `You missed your ${timeString} dose. Tap to take it now or skip.`,
            data: { 
              type: 'missed_dose',
              doseLogId: dose.id,
              medicationId: dose.medication_id,
              medicationName: medication.name
            }
          }),
        });

        const pushResult = await pushResponse.json();
        
        if (pushResult.notificationsSent && pushResult.notificationsSent > 0) {
          pushNotificationsSent += pushResult.notificationsSent;
          console.log(`Sent ${pushResult.notificationsSent} push notification(s) for missed dose ${dose.id}`);
        }
      } catch (pushError) {
        console.error(`Error sending push notification for dose ${dose.id}:`, pushError);
      }

      // Get caregivers who have can_receive_alerts enabled for this patient
      const { data: caregivers, error: caregiversError } = await supabase
        .from('caregiver_relationships')
        .select('caregiver_id')
        .eq('patient_id', dose.user_id)
        .eq('can_receive_alerts', true);

      if (caregiversError) {
        console.error(`Error fetching caregivers for user ${dose.user_id}:`, caregiversError);
      } else if (caregivers && caregivers.length > 0) {
        console.log(`Found ${caregivers.length} caregiver(s) to notify for user ${dose.user_id}`);

        // Send push notifications to each caregiver
        for (const caregiver of caregivers) {
          try {
            const caregiverPushResponse = await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${supabaseServiceKey}`,
              },
              body: JSON.stringify({
                userId: caregiver.caregiver_id,
                title: `🚨 ${patientName} Missed a Dose`,
                body: `${patientName} missed their ${timeString} dose of ${medication.name}.`,
                data: { 
                  type: 'caregiver_missed_dose_alert',
                  patientId: dose.user_id,
                  patientName: patientName,
                  doseLogId: dose.id,
                  medicationId: dose.medication_id,
                  medicationName: medication.name,
                  scheduledTime: dose.scheduled_for
                }
              }),
            });

            const caregiverPushResult = await caregiverPushResponse.json();
            
            if (caregiverPushResult.notificationsSent && caregiverPushResult.notificationsSent > 0) {
              caregiverPushSent += caregiverPushResult.notificationsSent;
              console.log(`Sent push notification to caregiver ${caregiver.caregiver_id} for patient ${dose.user_id}`);
            }
          } catch (caregiverPushError) {
            console.error(`Error sending push to caregiver ${caregiver.caregiver_id}:`, caregiverPushError);
          }
        }
      }

      // Call the send-caregiver-alert function for SMS to emergency contacts (legacy)
      try {
        const alertResponse = await fetch(`${supabaseUrl}/functions/v1/send-caregiver-alert`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({
            userId: dose.user_id,
            medicationName: medication.name,
            scheduledTime: dose.scheduled_for,
            doseLogId: dose.id,
          }),
        });

        const alertResult = await alertResponse.json();
        
        if (alertResult.success && alertResult.notificationsSent > 0) {
          alertsSent += alertResult.notificationsSent;
          console.log(`Sent ${alertResult.notificationsSent} SMS caregiver alerts for dose ${dose.id}`);
        }
      } catch (alertError) {
        console.error(`Error sending caregiver SMS alert for dose ${dose.id}:`, alertError);
      }
    }

    console.log(`Total: SMS alerts=${alertsSent}, patient push=${pushNotificationsSent}, caregiver push=${caregiverPushSent}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        missedDosesFound: missedDoses.length,
        dosesNeedingAlerts: dosesToAlert.length,
        alertsSent,
        pushNotificationsSent,
        caregiverPushSent
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in check-missed-doses:', error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
