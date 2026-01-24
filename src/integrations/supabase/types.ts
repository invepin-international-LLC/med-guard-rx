export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      adherence_streaks: {
        Row: {
          current_streak: number | null
          id: string
          last_taken_date: string | null
          longest_streak: number | null
          monthly_adherence: number | null
          updated_at: string
          user_id: string
          weekly_adherence: number | null
        }
        Insert: {
          current_streak?: number | null
          id?: string
          last_taken_date?: string | null
          longest_streak?: number | null
          monthly_adherence?: number | null
          updated_at?: string
          user_id: string
          weekly_adherence?: number | null
        }
        Update: {
          current_streak?: number | null
          id?: string
          last_taken_date?: string | null
          longest_streak?: number | null
          monthly_adherence?: number | null
          updated_at?: string
          user_id?: string
          weekly_adherence?: number | null
        }
        Relationships: []
      }
      caregiver_notifications: {
        Row: {
          channel: string
          contact_id: string
          created_at: string
          dose_log_id: string | null
          id: string
          notification_type: string
          sent_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          channel: string
          contact_id: string
          created_at?: string
          dose_log_id?: string | null
          id?: string
          notification_type: string
          sent_at?: string | null
          status?: string
          user_id: string
        }
        Update: {
          channel?: string
          contact_id?: string
          created_at?: string
          dose_log_id?: string | null
          id?: string
          notification_type?: string
          sent_at?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "caregiver_notifications_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "emergency_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "caregiver_notifications_dose_log_id_fkey"
            columns: ["dose_log_id"]
            isOneToOne: false
            referencedRelation: "dose_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      dose_logs: {
        Row: {
          action_at: string | null
          created_at: string
          id: string
          medication_id: string
          notes: string | null
          scheduled_dose_id: string
          scheduled_for: string
          snoozed_until: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          action_at?: string | null
          created_at?: string
          id?: string
          medication_id: string
          notes?: string | null
          scheduled_dose_id: string
          scheduled_for: string
          snoozed_until?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          action_at?: string | null
          created_at?: string
          id?: string
          medication_id?: string
          notes?: string | null
          scheduled_dose_id?: string
          scheduled_for?: string
          snoozed_until?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dose_logs_medication_id_fkey"
            columns: ["medication_id"]
            isOneToOne: false
            referencedRelation: "medications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dose_logs_scheduled_dose_id_fkey"
            columns: ["scheduled_dose_id"]
            isOneToOne: false
            referencedRelation: "scheduled_doses"
            referencedColumns: ["id"]
          },
        ]
      }
      drug_interactions: {
        Row: {
          created_at: string
          description: string | null
          id: string
          medication_id_1: string
          medication_id_2: string
          severity: string
          source: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          medication_id_1: string
          medication_id_2: string
          severity: string
          source?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          medication_id_1?: string
          medication_id_2?: string
          severity?: string
          source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "drug_interactions_medication_id_1_fkey"
            columns: ["medication_id_1"]
            isOneToOne: false
            referencedRelation: "medications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drug_interactions_medication_id_2_fkey"
            columns: ["medication_id_2"]
            isOneToOne: false
            referencedRelation: "medications"
            referencedColumns: ["id"]
          },
        ]
      }
      emergency_contacts: {
        Row: {
          created_at: string
          id: string
          is_caregiver: boolean | null
          name: string
          notify_on_missed_dose: boolean | null
          phone: string
          relationship: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_caregiver?: boolean | null
          name: string
          notify_on_missed_dose?: boolean | null
          phone: string
          relationship?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_caregiver?: boolean | null
          name?: string
          notify_on_missed_dose?: boolean | null
          phone?: string
          relationship?: string | null
          user_id?: string
        }
        Relationships: []
      }
      medications: {
        Row: {
          color: string | null
          created_at: string
          drug_class: string | null
          form: string
          generic_name: string | null
          how_it_works: string | null
          id: string
          image_url: string | null
          important_warnings: string[] | null
          imprint: string | null
          instructions: string | null
          is_active: boolean | null
          name: string
          ndc_code: string | null
          pharmacy_id: string | null
          prescriber: string | null
          purpose: string | null
          quantity_remaining: number | null
          refill_date: string | null
          rxcui: string | null
          shape: string | null
          side_effects: string[] | null
          strength: string
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          drug_class?: string | null
          form: string
          generic_name?: string | null
          how_it_works?: string | null
          id?: string
          image_url?: string | null
          important_warnings?: string[] | null
          imprint?: string | null
          instructions?: string | null
          is_active?: boolean | null
          name: string
          ndc_code?: string | null
          pharmacy_id?: string | null
          prescriber?: string | null
          purpose?: string | null
          quantity_remaining?: number | null
          refill_date?: string | null
          rxcui?: string | null
          shape?: string | null
          side_effects?: string[] | null
          strength: string
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          drug_class?: string | null
          form?: string
          generic_name?: string | null
          how_it_works?: string | null
          id?: string
          image_url?: string | null
          important_warnings?: string[] | null
          imprint?: string | null
          instructions?: string | null
          is_active?: boolean | null
          name?: string
          ndc_code?: string | null
          pharmacy_id?: string | null
          prescriber?: string | null
          purpose?: string | null
          quantity_remaining?: number | null
          refill_date?: string | null
          rxcui?: string | null
          shape?: string | null
          side_effects?: string[] | null
          strength?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "medications_pharmacy_id_fkey"
            columns: ["pharmacy_id"]
            isOneToOne: false
            referencedRelation: "pharmacies"
            referencedColumns: ["id"]
          },
        ]
      }
      pharmacies: {
        Row: {
          address: string | null
          created_at: string
          id: string
          is_primary: boolean | null
          latitude: number | null
          longitude: number | null
          name: string
          phone: string | null
          place_id: string | null
          user_id: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          id?: string
          is_primary?: boolean | null
          latitude?: number | null
          longitude?: number | null
          name: string
          phone?: string | null
          place_id?: string | null
          user_id: string
        }
        Update: {
          address?: string | null
          created_at?: string
          id?: string
          is_primary?: boolean | null
          latitude?: number | null
          longitude?: number | null
          name?: string
          phone?: string | null
          place_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          allergies: string[] | null
          biometric_enabled: boolean | null
          conditions: string[] | null
          created_at: string
          date_of_birth: string | null
          font_size: string | null
          high_contrast_mode: boolean | null
          id: string
          name: string
          pin_hash: string | null
          updated_at: string
          user_id: string
          voice_enabled: boolean | null
        }
        Insert: {
          allergies?: string[] | null
          biometric_enabled?: boolean | null
          conditions?: string[] | null
          created_at?: string
          date_of_birth?: string | null
          font_size?: string | null
          high_contrast_mode?: boolean | null
          id?: string
          name: string
          pin_hash?: string | null
          updated_at?: string
          user_id: string
          voice_enabled?: boolean | null
        }
        Update: {
          allergies?: string[] | null
          biometric_enabled?: boolean | null
          conditions?: string[] | null
          created_at?: string
          date_of_birth?: string | null
          font_size?: string | null
          high_contrast_mode?: boolean | null
          id?: string
          name?: string
          pin_hash?: string | null
          updated_at?: string
          user_id?: string
          voice_enabled?: boolean | null
        }
        Relationships: []
      }
      scheduled_doses: {
        Row: {
          created_at: string
          days_of_week: number[] | null
          id: string
          is_active: boolean | null
          medication_id: string
          scheduled_time: string
          time_of_day: string
          user_id: string
        }
        Insert: {
          created_at?: string
          days_of_week?: number[] | null
          id?: string
          is_active?: boolean | null
          medication_id: string
          scheduled_time: string
          time_of_day: string
          user_id: string
        }
        Update: {
          created_at?: string
          days_of_week?: number[] | null
          id?: string
          is_active?: boolean | null
          medication_id?: string
          scheduled_time?: string
          time_of_day?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_doses_medication_id_fkey"
            columns: ["medication_id"]
            isOneToOne: false
            referencedRelation: "medications"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
