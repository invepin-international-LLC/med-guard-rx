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
    const today = now.toISOString().split('T')[0];
    
    // Check for refills due within 7 days
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const sevenDaysDate = sevenDaysFromNow.toISOString().split('T')[0];
    
    // Also check for medications with low quantity (less than 7 doses remaining)
    const lowQuantityThreshold = 7;

    console.log(`Checking for refill reminders - dates between ${today} and ${sevenDaysDate}`);

    // Find medications that need refills based on date
    const { data: medicationsNeedingRefillByDate, error: dateError } = await supabase
      .from('medications')
      .select(`
        id,
        user_id,
        name,
        strength,
        refill_date,
        quantity_remaining
      `)
      .eq('is_active', true)
      .not('refill_date', 'is', null)
      .gte('refill_date', today)
      .lte('refill_date', sevenDaysDate);

    if (dateError) {
      console.error('Error querying medications by date:', dateError);
      return new Response(
        JSON.stringify({ success: false, error: dateError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find medications with low quantity
    const { data: medicationsLowQuantity, error: quantityError } = await supabase
      .from('medications')
      .select(`
        id,
        user_id,
        name,
        strength,
        refill_date,
        quantity_remaining
      `)
      .eq('is_active', true)
      .not('quantity_remaining', 'is', null)
      .lte('quantity_remaining', lowQuantityThreshold)
      .gt('quantity_remaining', 0);

    if (quantityError) {
      console.error('Error querying medications by quantity:', quantityError);
    }

    // Combine and deduplicate
    const allMedications = [...(medicationsNeedingRefillByDate || [])];
    const seenIds = new Set(allMedications.map(m => m.id));
    
    (medicationsLowQuantity || []).forEach(med => {
      if (!seenIds.has(med.id)) {
        allMedications.push(med);
        seenIds.add(med.id);
      }
    });

    if (allMedications.length === 0) {
      console.log('No medications need refill reminders');
      return new Response(
        JSON.stringify({ success: true, message: 'No refill reminders needed', remindersSent: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${allMedications.length} medications needing refill reminders`);

    let remindersSent = 0;
    const processedUsers = new Set<string>();

    // Group medications by user for batched notifications
    const medicationsByUser: Record<string, typeof allMedications> = {};
    allMedications.forEach(med => {
      if (!medicationsByUser[med.user_id]) {
        medicationsByUser[med.user_id] = [];
      }
      medicationsByUser[med.user_id].push(med);
    });

    for (const [userId, userMeds] of Object.entries(medicationsByUser)) {
      // Only send one reminder per user per day
      if (processedUsers.has(userId)) continue;
      processedUsers.add(userId);

      // Create a summary message
      const medNames = userMeds.map(m => m.name).join(', ');
      const isMultiple = userMeds.length > 1;
      
      let notificationBody: string;
      let notificationTitle: string;

      if (userMeds.length === 1) {
        const med = userMeds[0];
        const daysUntilRefill = med.refill_date 
          ? Math.ceil((new Date(med.refill_date).getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
          : null;
        
        if (daysUntilRefill !== null && daysUntilRefill <= 3) {
          notificationTitle = `🔴 Refill Due Soon: ${med.name}`;
          notificationBody = daysUntilRefill === 0 
            ? `Your ${med.name} refill is due today!`
            : daysUntilRefill === 1
              ? `Your ${med.name} refill is due tomorrow!`
              : `Your ${med.name} refill is due in ${daysUntilRefill} days.`;
        } else if (med.quantity_remaining !== null && med.quantity_remaining <= 3) {
          notificationTitle = `🔴 Running Low: ${med.name}`;
          notificationBody = `Only ${med.quantity_remaining} ${med.quantity_remaining === 1 ? 'dose' : 'doses'} of ${med.name} remaining!`;
        } else if (med.quantity_remaining !== null) {
          notificationTitle = `💊 Refill Reminder: ${med.name}`;
          notificationBody = `You have ${med.quantity_remaining} doses of ${med.name} remaining.`;
        } else {
          notificationTitle = `💊 Refill Reminder: ${med.name}`;
          notificationBody = `Your ${med.name} refill is coming up in ${daysUntilRefill} days.`;
        }
      } else {
        // Multiple medications
        const urgentCount = userMeds.filter(m => {
          const daysUntil = m.refill_date 
            ? Math.ceil((new Date(m.refill_date).getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
            : 999;
          return daysUntil <= 3 || (m.quantity_remaining !== null && m.quantity_remaining <= 3);
        }).length;

        if (urgentCount > 0) {
          notificationTitle = `🔴 ${urgentCount} Medication${urgentCount > 1 ? 's' : ''} Need Refills Soon`;
        } else {
          notificationTitle = `💊 ${userMeds.length} Refill Reminders`;
        }
        notificationBody = `Time to refill: ${medNames}`;
      }

      // Send push notification
      try {
        const pushResponse = await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({
            userId: userId,
            title: notificationTitle,
            body: notificationBody,
            data: { 
              type: 'refill_reminder',
              medicationIds: userMeds.map(m => m.id),
              medicationNames: userMeds.map(m => m.name)
            }
          }),
        });

        const pushResult = await pushResponse.json();
        
        if (pushResult.results && pushResult.results.length > 0) {
          const successCount = pushResult.results.filter((r: { success: boolean }) => r.success).length;
          if (successCount > 0) {
            remindersSent++;
            console.log(`Sent refill reminder to user ${userId} for ${userMeds.length} medication(s)`);
          }
        }
      } catch (pushError) {
        console.error(`Error sending refill push notification to user ${userId}:`, pushError);
      }

      // Also notify caregivers for urgent refills
      const urgentMeds = userMeds.filter(m => {
        const daysUntil = m.refill_date 
          ? Math.ceil((new Date(m.refill_date).getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
          : 999;
        return daysUntil <= 1 || (m.quantity_remaining !== null && m.quantity_remaining <= 3);
      });

      if (urgentMeds.length > 0) {
        // Get caregivers who want to be notified
        const { data: caregivers } = await supabase
          .from('emergency_contacts')
          .select('phone, name')
          .eq('user_id', userId)
          .eq('is_caregiver', true)
          .eq('notify_on_missed_dose', true);

        if (caregivers && caregivers.length > 0) {
          // Get user's name for the message
          const { data: profile } = await supabase
            .from('profiles')
            .select('name')
            .eq('user_id', userId)
            .single();

          const userName = profile?.name || 'Your patient';
          const urgentMedNames = urgentMeds.map(m => m.name).join(', ');

          const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
          const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');
          const twilioPhoneNumber = Deno.env.get('TWILIO_PHONE_NUMBER');

          if (twilioAccountSid && twilioAuthToken && twilioPhoneNumber) {
            for (const caregiver of caregivers) {
              try {
                const message = `Med Guard Rx Alert: ${userName} needs to refill their medication(s): ${urgentMedNames}. Please help ensure they get their refill soon.`;

                const response = await fetch(
                  `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`,
                  {
                    method: 'POST',
                    headers: {
                      'Authorization': `Basic ${btoa(`${twilioAccountSid}:${twilioAuthToken}`)}`,
                      'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: new URLSearchParams({
                      To: caregiver.phone,
                      From: twilioPhoneNumber,
                      Body: message,
                    }),
                  }
                );

                if (response.ok) {
                  console.log(`Sent refill caregiver SMS to ${caregiver.name} for user ${userId}`);
                }
              } catch (smsError) {
                console.error(`Error sending SMS to caregiver ${caregiver.name}:`, smsError);
              }
            }
          }
        }
      }
    }

    console.log(`Total refill reminders sent: ${remindersSent}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        medicationsNeedingRefill: allMedications.length,
        usersNotified: processedUsers.size,
        remindersSent
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in check-refill-reminders:', error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
