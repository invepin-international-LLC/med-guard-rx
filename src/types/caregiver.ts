export interface CaregiverRelationship {
  id: string;
  patient_id: string;
  caregiver_id: string;
  relationship: string;
  nickname: string | null;
  can_view_medications: boolean;
  can_view_schedule: boolean;
  can_view_adherence: boolean;
  can_receive_alerts: boolean;
  created_at: string;
  updated_at: string;
  // Joined data
  patient_profile?: {
    name: string;
  };
  caregiver_profile?: {
    name: string;
  };
}

export interface CaregiverInvitation {
  id: string;
  patient_id: string;
  invite_code: string;
  invitee_email: string | null;
  relationship: string;
  status: 'pending' | 'accepted' | 'expired' | 'cancelled';
  expires_at: string;
  created_at: string;
  accepted_at: string | null;
  accepted_by: string | null;
}

export interface PatientOverview {
  patient_id: string;
  patient_name: string;
  relationship: string;
  nickname: string | null;
  medications_count: number;
  today_doses_taken: number;
  today_doses_total: number;
  current_streak: number;
  last_activity: string | null;
  adherence_percentage: number;
}
