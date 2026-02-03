import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { CaregiverRelationship, CaregiverInvitation, PatientOverview } from '@/types/caregiver';

export function useCaregiver() {
  const [relationships, setRelationships] = useState<CaregiverRelationship[]>([]);
  const [patientsICareFor, setPatientsICareFor] = useState<CaregiverRelationship[]>([]);
  const [invitations, setInvitations] = useState<CaregiverInvitation[]>([]);
  const [patientOverviews, setPatientOverviews] = useState<PatientOverview[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCaregiver, setIsCaregiver] = useState(false);

  // Fetch relationships where current user is the patient (my caregivers)
  const fetchMyCaregivers = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('caregiver_relationships')
      .select('*')
      .eq('patient_id', user.id);

    if (error) {
      console.error('Error fetching caregivers:', error);
      return;
    }

    // Fetch caregiver profiles
    if (data && data.length > 0) {
      const caregiverIds = data.map(r => r.caregiver_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, name')
        .in('user_id', caregiverIds);

      const enrichedData = data.map(rel => ({
        ...rel,
        caregiver_profile: profiles?.find(p => p.user_id === rel.caregiver_id)
      }));

      setRelationships(enrichedData as CaregiverRelationship[]);
    } else {
      setRelationships([]);
    }
  }, []);

  // Fetch relationships where current user is caregiver
  const fetchPatientsICareFor = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('caregiver_relationships')
      .select('*')
      .eq('caregiver_id', user.id);

    if (error) {
      console.error('Error fetching patients:', error);
      return;
    }

    if (data && data.length > 0) {
      setIsCaregiver(true);
      
      // Fetch patient profiles
      const patientIds = data.map(r => r.patient_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, name')
        .in('user_id', patientIds);

      const enrichedData = data.map(rel => ({
        ...rel,
        patient_profile: profiles?.find(p => p.user_id === rel.patient_id)
      }));

      setPatientsICareFor(enrichedData as CaregiverRelationship[]);
      
      // Build patient overviews
      await buildPatientOverviews(enrichedData as CaregiverRelationship[]);
    } else {
      setPatientsICareFor([]);
      setIsCaregiver(false);
    }
  }, []);

  // Build overview data for each patient
  const buildPatientOverviews = async (relations: CaregiverRelationship[]) => {
    const overviews: PatientOverview[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    for (const rel of relations) {
      // Get medications count
      const { count: medsCount } = await supabase
        .from('medications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', rel.patient_id)
        .eq('is_active', true);

      // Get today's dose stats
      const { data: todayDoses } = await supabase
        .from('dose_logs')
        .select('status')
        .eq('user_id', rel.patient_id)
        .gte('scheduled_for', today.toISOString())
        .lt('scheduled_for', tomorrow.toISOString());

      const takenToday = todayDoses?.filter(d => d.status === 'taken').length || 0;
      const totalToday = todayDoses?.length || 0;

      // Get adherence streak
      const { data: streak } = await supabase
        .from('adherence_streaks')
        .select('current_streak, weekly_adherence')
        .eq('user_id', rel.patient_id)
        .single();

      // Get last activity
      const { data: lastDose } = await supabase
        .from('dose_logs')
        .select('action_at')
        .eq('user_id', rel.patient_id)
        .eq('status', 'taken')
        .order('action_at', { ascending: false })
        .limit(1)
        .single();

      overviews.push({
        patient_id: rel.patient_id,
        patient_name: rel.patient_profile?.name || rel.nickname || 'Patient',
        relationship: rel.relationship,
        nickname: rel.nickname,
        medications_count: medsCount || 0,
        today_doses_taken: takenToday,
        today_doses_total: totalToday,
        current_streak: streak?.current_streak || 0,
        last_activity: lastDose?.action_at || null,
        adherence_percentage: Number(streak?.weekly_adherence) || 0,
      });
    }

    setPatientOverviews(overviews);
  };

  // Fetch pending invitations
  const fetchInvitations = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('caregiver_invitations')
      .select('*')
      .eq('patient_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching invitations:', error);
      return;
    }

    setInvitations((data || []) as CaregiverInvitation[]);
  }, []);

  // Create a new invitation
  const createInvitation = async (email?: string, relationship: string = 'family') => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error('Please sign in to invite caregivers');
      return null;
    }

    const { data, error } = await supabase
      .from('caregiver_invitations')
      .insert({
        patient_id: user.id,
        invitee_email: email || null,
        relationship,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating invitation:', error);
      toast.error('Failed to create invitation');
      return null;
    }

    toast.success('Invitation created! Share the code with your caregiver.');
    await fetchInvitations();
    return data as CaregiverInvitation;
  };

  // Accept an invitation by code
  const acceptInvitation = async (inviteCode: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error('Please sign in to accept invitation');
      return false;
    }

    // Find the invitation
    const { data: invitation, error: findError } = await supabase
      .from('caregiver_invitations')
      .select('*')
      .eq('invite_code', inviteCode.toLowerCase())
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .single();

    if (findError || !invitation) {
      toast.error('Invalid or expired invitation code');
      return false;
    }

    // Check if it's not self-invite
    if (invitation.patient_id === user.id) {
      toast.error("You can't be your own caregiver");
      return false;
    }

    // Check if relationship already exists
    const { data: existing } = await supabase
      .from('caregiver_relationships')
      .select('id')
      .eq('patient_id', invitation.patient_id)
      .eq('caregiver_id', user.id)
      .single();

    if (existing) {
      toast.error("You're already a caregiver for this person");
      return false;
    }

    // Create the relationship
    const { error: relError } = await supabase
      .from('caregiver_relationships')
      .insert({
        patient_id: invitation.patient_id,
        caregiver_id: user.id,
        relationship: invitation.relationship,
      });

    if (relError) {
      console.error('Error creating relationship:', relError);
      toast.error('Failed to accept invitation');
      return false;
    }

    // Update invitation status
    await supabase
      .from('caregiver_invitations')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString(),
        accepted_by: user.id,
      })
      .eq('id', invitation.id);

    toast.success("You're now a caregiver! You can view their medication schedule.");
    await fetchPatientsICareFor();
    return true;
  };

  // Cancel an invitation
  const cancelInvitation = async (invitationId: string) => {
    const { error } = await supabase
      .from('caregiver_invitations')
      .update({ status: 'cancelled' })
      .eq('id', invitationId);

    if (error) {
      toast.error('Failed to cancel invitation');
      return false;
    }

    toast.success('Invitation cancelled');
    await fetchInvitations();
    return true;
  };

  // Remove a caregiver relationship
  const removeCaregiver = async (relationshipId: string) => {
    const { error } = await supabase
      .from('caregiver_relationships')
      .delete()
      .eq('id', relationshipId);

    if (error) {
      toast.error('Failed to remove caregiver');
      return false;
    }

    toast.success('Caregiver removed');
    await fetchMyCaregivers();
    return true;
  };

  // Leave as caregiver
  const leaveAsCaregiver = async (relationshipId: string) => {
    const { error } = await supabase
      .from('caregiver_relationships')
      .delete()
      .eq('id', relationshipId);

    if (error) {
      toast.error('Failed to leave');
      return false;
    }

    toast.success('You are no longer a caregiver for this person');
    await fetchPatientsICareFor();
    return true;
  };

  // Get detailed patient data for caregiver view
  const getPatientDetails = async (patientId: string) => {
    // Get medications
    const { data: medications } = await supabase
      .from('medications')
      .select('*')
      .eq('user_id', patientId)
      .eq('is_active', true);

    // Get scheduled doses
    const { data: scheduledDoses } = await supabase
      .from('scheduled_doses')
      .select('*, medications(*)')
      .eq('user_id', patientId)
      .eq('is_active', true);

    // Get today's dose logs
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const { data: todayLogs } = await supabase
      .from('dose_logs')
      .select('*, medications(*), scheduled_doses(*)')
      .eq('user_id', patientId)
      .gte('scheduled_for', today.toISOString())
      .lt('scheduled_for', tomorrow.toISOString())
      .order('scheduled_for', { ascending: true });

    // Get adherence data
    const { data: adherence } = await supabase
      .from('adherence_streaks')
      .select('*')
      .eq('user_id', patientId)
      .single();

    return {
      medications: medications || [],
      scheduledDoses: scheduledDoses || [],
      todayLogs: todayLogs || [],
      adherence,
    };
  };

  // Initial fetch
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        fetchMyCaregivers(),
        fetchPatientsICareFor(),
        fetchInvitations(),
      ]);
      setLoading(false);
    };

    loadData();
  }, [fetchMyCaregivers, fetchPatientsICareFor, fetchInvitations]);

  return {
    // State
    relationships,
    patientsICareFor,
    invitations,
    patientOverviews,
    loading,
    isCaregiver,
    
    // Actions
    createInvitation,
    acceptInvitation,
    cancelInvitation,
    removeCaregiver,
    leaveAsCaregiver,
    getPatientDetails,
    refresh: () => Promise.all([
      fetchMyCaregivers(),
      fetchPatientsICareFor(),
      fetchInvitations(),
    ]),
  };
}
