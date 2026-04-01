import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Appointment {
  id: string;
  title: string;
  doctor_name: string | null;
  appointment_date: string;
  status: string;
  raw_transcript: string | null;
  plain_summary: string | null;
  follow_up_flags: any[];
  medication_mentions: any[];
  created_at: string;
}

interface AppointmentQuestion {
  id: string;
  appointment_id: string | null;
  question: string;
  was_addressed: boolean;
}

export function useAppointments() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAppointments = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('appointments')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching appointments:', error);
    } else {
      setAppointments((data || []) as unknown as Appointment[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  const createAppointment = async (title: string, doctorName?: string, appointmentDate?: string): Promise<string | null> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const isFutureDate = appointmentDate && new Date(appointmentDate) > new Date();

    const { data, error } = await supabase
      .from('appointments')
      .insert({
        user_id: user.id,
        title,
        doctor_name: doctorName || null,
        appointment_date: appointmentDate || new Date().toISOString(),
        status: isFutureDate ? 'scheduled' : 'recording',
      } as any)
      .select()
      .single();

    if (error) {
      console.error('Error creating appointment:', error);
      toast.error('Failed to create appointment');
      return null;
    }

    await fetchAppointments();
    return (data as any).id;
  };

  const updateAppointment = async (id: string, updates: Partial<Appointment>) => {
    const { error } = await supabase
      .from('appointments')
      .update(updates as any)
      .eq('id', id);

    if (error) {
      console.error('Error updating appointment:', error);
      toast.error('Failed to update appointment');
    } else {
      await fetchAppointments();
    }
  };

  const deleteAppointment = async (id: string) => {
    const { error } = await supabase
      .from('appointments')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting appointment:', error);
      toast.error('Failed to delete appointment');
    } else {
      await fetchAppointments();
      toast.success('Appointment deleted');
    }
  };

  // Questions management
  const getQuestions = async (appointmentId: string): Promise<AppointmentQuestion[]> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('appointment_questions')
      .select('*')
      .eq('user_id', user.id)
      .eq('appointment_id', appointmentId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching questions:', error);
      return [];
    }
    return (data || []) as unknown as AppointmentQuestion[];
  };

  const addQuestion = async (appointmentId: string, question: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('appointment_questions')
      .insert({
        user_id: user.id,
        appointment_id: appointmentId,
        question,
      } as any);

    if (error) {
      console.error('Error adding question:', error);
      toast.error('Failed to add question');
    }
  };

  const removeQuestion = async (questionId: string) => {
    const { error } = await supabase
      .from('appointment_questions')
      .delete()
      .eq('id', questionId);

    if (error) {
      console.error('Error removing question:', error);
    }
  };

  const updateQuestionStatus = async (questionId: string, addressed: boolean) => {
    const { error } = await supabase
      .from('appointment_questions')
      .update({ was_addressed: addressed } as any)
      .eq('id', questionId);

    if (error) {
      console.error('Error updating question:', error);
    }
  };

  return {
    appointments,
    loading,
    createAppointment,
    updateAppointment,
    deleteAppointment,
    getQuestions,
    addQuestion,
    removeQuestion,
    updateQuestionStatus,
    refetch: fetchAppointments,
  };
}
