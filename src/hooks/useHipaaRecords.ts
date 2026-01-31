import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Diagnosis {
  id: string;
  name: string;
  diagnosedDate: string;
  provider: string;
  notes?: string;
  icdCode?: string;
}

export interface LabResult {
  id: string;
  testName: string;
  date: string;
  result: string;
  normalRange?: string;
  provider: string;
  notes?: string;
}

export interface Procedure {
  id: string;
  name: string;
  date: string;
  provider: string;
  facility?: string;
  notes?: string;
}

export interface Immunization {
  id: string;
  name: string;
  date: string;
  provider?: string;
  lotNumber?: string;
  nextDueDate?: string;
}

export interface ProviderInfo {
  name: string;
  specialty?: string;
  phone?: string;
  address?: string;
  fax?: string;
  email?: string;
  npi?: string;
}

export interface InsuranceInfo {
  provider: string;
  planName?: string;
  memberId: string;
  groupNumber?: string;
  phone?: string;
  policyHolder?: string;
  effectiveDate?: string;
  expirationDate?: string;
}

export interface MedicalPowerOfAttorney {
  name: string;
  phone: string;
  relationship?: string;
  address?: string;
}

export interface HipaaRecord {
  id: string;
  userId: string;
  diagnoses: Diagnosis[];
  labResults: LabResult[];
  procedures: Procedure[];
  immunizations: Immunization[];
  primaryCareProvider: ProviderInfo | null;
  specialists: ProviderInfo[];
  insuranceInfo: InsuranceInfo | null;
  bloodType: string | null;
  organDonor: boolean;
  advanceDirectives: string | null;
  medicalPowerOfAttorney: MedicalPowerOfAttorney | null;
  lastAccessedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export function useHipaaRecords() {
  const [record, setRecord] = useState<HipaaRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  // Get current user
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
    };
    getUser();
  }, []);

  // Log access for HIPAA compliance
  const logAccess = useCallback(async (action: string, section?: string) => {
    if (!userId) return;

    try {
      await supabase.from('hipaa_access_log').insert({
        user_id: userId,
        action,
        record_section: section,
        user_agent: navigator.userAgent,
      });
    } catch (error) {
      console.error('Error logging HIPAA access:', error);
    }
  }, [userId]);

  // Fetch HIPAA record
  const fetchRecord = useCallback(async () => {
    if (!userId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('hipaa_records')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setRecord({
          id: data.id,
          userId: data.user_id,
          diagnoses: (data.diagnoses as unknown as Diagnosis[]) || [],
          labResults: (data.lab_results as unknown as LabResult[]) || [],
          procedures: (data.procedures as unknown as Procedure[]) || [],
          immunizations: (data.immunizations as unknown as Immunization[]) || [],
          primaryCareProvider: data.primary_care_provider as unknown as ProviderInfo | null,
          specialists: (data.specialists as unknown as ProviderInfo[]) || [],
          insuranceInfo: data.insurance_info as unknown as InsuranceInfo | null,
          bloodType: data.blood_type,
          organDonor: data.organ_donor || false,
          advanceDirectives: data.advance_directives,
          medicalPowerOfAttorney: data.medical_power_of_attorney as unknown as MedicalPowerOfAttorney | null,
          lastAccessedAt: data.last_accessed_at,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        });

        // Log the access
        await logAccess('view');

        // Update last accessed timestamp
        await supabase
          .from('hipaa_records')
          .update({ last_accessed_at: new Date().toISOString() })
          .eq('user_id', userId);
      }
    } catch (error) {
      console.error('Error fetching HIPAA record:', error);
      toast.error('Failed to load health records');
    } finally {
      setLoading(false);
    }
  }, [userId, logAccess]);

  // Create initial record
  const createRecord = useCallback(async () => {
    if (!userId) return null;

    try {
      const { data, error } = await supabase
        .from('hipaa_records')
        .insert({
          user_id: userId,
        })
        .select()
        .single();

      if (error) throw error;

      await logAccess('create');

      const newRecord: HipaaRecord = {
        id: data.id,
        userId: data.user_id,
        diagnoses: [],
        labResults: [],
        procedures: [],
        immunizations: [],
        primaryCareProvider: null,
        specialists: [],
        insuranceInfo: null,
        bloodType: null,
        organDonor: false,
        advanceDirectives: null,
        medicalPowerOfAttorney: null,
        lastAccessedAt: null,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };

      setRecord(newRecord);
      return newRecord;
    } catch (error) {
      console.error('Error creating HIPAA record:', error);
      toast.error('Failed to initialize health records');
      return null;
    }
  }, [userId, logAccess]);

  // Update a specific section
  const updateSection = useCallback(async <T extends keyof HipaaRecord>(
    section: T,
    value: HipaaRecord[T]
  ) => {
    if (!userId || !record) return false;

    const dbFieldMap: Record<string, string> = {
      diagnoses: 'diagnoses',
      labResults: 'lab_results',
      procedures: 'procedures',
      immunizations: 'immunizations',
      primaryCareProvider: 'primary_care_provider',
      specialists: 'specialists',
      insuranceInfo: 'insurance_info',
      bloodType: 'blood_type',
      organDonor: 'organ_donor',
      advanceDirectives: 'advance_directives',
      medicalPowerOfAttorney: 'medical_power_of_attorney',
    };

    const dbField = dbFieldMap[section];
    if (!dbField) return false;

    try {
      const { error } = await supabase
        .from('hipaa_records')
        .update({ [dbField]: value })
        .eq('user_id', userId);

      if (error) throw error;

      await logAccess('update', section);

      setRecord(prev => prev ? { ...prev, [section]: value } : null);
      toast.success('Health information updated');
      return true;
    } catch (error) {
      console.error('Error updating HIPAA record:', error);
      toast.error('Failed to update health information');
      return false;
    }
  }, [userId, record, logAccess]);

  // Initialize on mount
  useEffect(() => {
    if (userId) {
      fetchRecord();
    }
  }, [userId, fetchRecord]);

  return {
    record,
    loading,
    fetchRecord,
    createRecord,
    updateSection,
    logAccess,
  };
}
