import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * This function checks for upcoming doses and sends reminder push notifications.
 * It runs on a schedule (every 5 minutes via pg_cron) and:
 * 1. Finds doses scheduled in the next 5-15 minutes
 * 2. Sends push notifications to remind users
 * 3. Logs sent reminders to prevent duplicates
 */

interface ScheduledDose {
  id: string;
  user_id: string;
  medication_id: string;
  scheduled_time: string;
  time_of_day: string;
  medication: {
    name: string;
    form: string;
    strength: string;
  };
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date();
    const today = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const currentDayOfWeek = now.getDay(); // 0-6 (Sunday-Saturday)
    
    // Get current time in HH:MM format for comparison
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    // Look for doses scheduled in the next 5-15 minutes
    const reminderWindowStart = new Date(now.getTime() + 5 * 60 * 1000);
    const reminderWindowEnd = new Date(now.getTime() + 15 * 60 * 1000);
    
    const startTime = `${String(reminderWindowStart.getHours()).padStart(2, '0')}:${String(reminderWindowStart.getMinutes()).padStart(2, '0')}:00`;
    const endTime = `${String(reminderWindowEnd.getHours()).padStart(2, '0')}:${String(reminderWindowEnd.getMinutes()).padStart(2, '0')}:00`;

    console.log(`Checking for doses between ${startTime} and ${endTime} on day ${currentDayOfWeek}`);

    // Get all active scheduled doses that fall within our reminder window
    const { data: upcomingDoses, error: queryError } = await supabase
      .from('scheduled_doses')
      .select(`
        id,
        user_id,
        medication_id,
        scheduled_time,
        time_of_day,
        days_of_week,
        medication:medications(name, form, strength)
      `)
      .eq('is_active', true)
      .gte('scheduled_time', startTime)
      .lte('scheduled_time', endTime);

    if (queryError) {
      console.error('Error querying scheduled doses:', queryError);
      return new Response(
        JSON.stringify({ success: false, error: queryError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!upcomingDoses || upcomingDoses.length === 0) {
      console.log('No upcoming doses found in reminder window');
      return new Response(
        JSON.stringify({ success: true, message: 'No upcoming doses', remindersSent: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Filter doses that are scheduled for today (checking days_of_week array)
    const todaysDoses = upcomingDoses.filter(dose => {
      const daysOfWeek = dose.days_of_week as number[] | null;
      // If days_of_week is null or empty, assume every day
      if (!daysOfWeek || daysOfWeek.length === 0) return true;
      return daysOfWeek.includes(currentDayOfWeek);
    });

    console.log(`Found ${todaysDoses.length} doses scheduled for today in reminder window`);

    // Check which reminders have already been sent today
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);

    const scheduledDoseIds = todaysDoses.map(d => d.id);
    
    // Check dose_logs for today to see which have already had reminders
    const { data: existingLogs } = await supabase
      .from('dose_logs')
      .select('scheduled_dose_id, notes')
      .in('scheduled_dose_id', scheduledDoseIds)
      .gte('created_at', startOfDay.toISOString())
      .like('notes', '%reminder_sent%');

    const remindedDoseIds = new Set(existingLogs?.map(l => l.scheduled_dose_id) || []);
    const dosesToRemind = todaysDoses.filter(d => !remindedDoseIds.has(d.id));

    console.log(`${dosesToRemind.length} doses need reminders (${remindedDoseIds.size} already reminded)`);

    let remindersSent = 0;
    const errors: string[] = [];

    for (const dose of dosesToRemind) {
      // Handle the medication relation (comes as array from Supabase join)
      const medicationData = dose.medication;
      const medication = Array.isArray(medicationData) ? medicationData[0] : medicationData;
      
      if (!medication) {
        console.log(`No medication found for scheduled dose ${dose.id}`);
        continue;
      }

      // Format the scheduled time nicely
      const [hours, minutes] = dose.scheduled_time.split(':');
      const hour = parseInt(hours, 10);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
      const timeString = `${displayHour}:${minutes} ${ampm}`;

      // Get time of day emoji
      const timeEmojis: Record<string, string> = {
        morning: '🌅',
        afternoon: '☀️',
        evening: '🌆',
        bedtime: '🌙',
      };
      const emoji = timeEmojis[dose.time_of_day] || '⏰';

      try {
        // Send push notification
        const response = await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({
            userId: dose.user_id,
            title: `${emoji} Time for ${medication.name}`,
            body: `Your ${timeString} ${dose.time_of_day} dose is coming up. ${medication.strength} ${medication.form}`,
            data: {
              type: 'dose_reminder',
              scheduledDoseId: dose.id,
              medicationId: dose.medication_id,
              medicationName: medication.name,
              scheduledTime: dose.scheduled_time,
            },
          }),
        });

        const result = await response.json();

        if (result.notificationsSent > 0) {
          remindersSent++;
          
          // Create a dose log entry to track that reminder was sent
          // This also creates the entry that users will mark as taken/skipped
          const scheduledFor = new Date(now);
          scheduledFor.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);

          await supabase.from('dose_logs').upsert({
            user_id: dose.user_id,
            medication_id: dose.medication_id,
            scheduled_dose_id: dose.id,
            scheduled_for: scheduledFor.toISOString(),
            status: 'pending',
            notes: 'reminder_sent',
          }, {
            onConflict: 'scheduled_dose_id,scheduled_for',
            ignoreDuplicates: true,
          });

          console.log(`Reminder sent for ${medication.name} to user ${dose.user_id}`);
        } else {
          console.log(`No active tokens for user ${dose.user_id}`);
        }
      } catch (error) {
        const errorMsg = `Failed to send reminder for dose ${dose.id}: ${error}`;
        console.error(errorMsg);
        errors.push(errorMsg);
      }
    }

    console.log(`Total reminders sent: ${remindersSent}`);

    return new Response(
      JSON.stringify({
        success: true,
        upcomingDosesFound: upcomingDoses.length,
        todaysDoses: todaysDoses.length,
        dosesNeedingReminders: dosesToRemind.length,
        remindersSent,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in schedule-dose-reminders:', error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
