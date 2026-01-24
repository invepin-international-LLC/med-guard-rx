export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'bedtime';

export type DoseStatus = 'pending' | 'taken' | 'skipped' | 'snoozed' | 'missed';

export interface Dose {
  id: string;
  time: string; // 24h format "08:00"
  timeOfDay: TimeOfDay;
  status: DoseStatus;
  takenAt?: string;
  snoozeUntil?: string;
}

export interface Medication {
  id: string;
  name: string;
  genericName?: string;
  strength: string;
  form: 'pill' | 'capsule' | 'liquid' | 'injection' | 'patch' | 'inhaler' | 'drops';
  color?: string;
  purpose: string;
  howItWorks: string;
  instructions: string;
  sideEffects: string[];
  importantWarnings: string[];
  doses: Dose[];
  refillDate?: string;
  prescriber?: string;
  pharmacy?: string;
  imageUrl?: string;
  quantityRemaining?: number;
}

export interface DailySchedule {
  date: string;
  medications: {
    medication: Medication;
    doses: Dose[];
  }[];
}

export interface UserProfile {
  name: string;
  dateOfBirth?: string;
  allergies: string[];
  conditions: string[];
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
  };
  pharmacy?: {
    name: string;
    phone: string;
    address: string;
  };
}

export interface AdherenceStreak {
  currentStreak: number;
  longestStreak: number;
  lastTakenDate: string;
  weeklyAdherence: number; // percentage
}
