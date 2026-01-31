-- Create HIPAA records table for storing sensitive health information
CREATE TABLE public.hipaa_records (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    
    -- Medical Records
    diagnoses JSONB DEFAULT '[]'::jsonb,
    lab_results JSONB DEFAULT '[]'::jsonb,
    procedures JSONB DEFAULT '[]'::jsonb,
    immunizations JSONB DEFAULT '[]'::jsonb,
    
    -- Provider Information
    primary_care_provider JSONB DEFAULT '{}'::jsonb,
    specialists JSONB DEFAULT '[]'::jsonb,
    insurance_info JSONB DEFAULT '{}'::jsonb,
    
    -- Personal Health Data
    blood_type TEXT,
    organ_donor BOOLEAN DEFAULT false,
    advance_directives TEXT,
    medical_power_of_attorney JSONB DEFAULT '{}'::jsonb,
    
    -- Security
    last_accessed_at TIMESTAMP WITH TIME ZONE,
    access_log JSONB DEFAULT '[]'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    
    -- Ensure one record per user
    UNIQUE(user_id)
);

-- Enable Row Level Security
ALTER TABLE public.hipaa_records ENABLE ROW LEVEL SECURITY;

-- Create strict RLS policies - users can ONLY access their own records
CREATE POLICY "Users can view their own HIPAA records"
ON public.hipaa_records
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own HIPAA records"
ON public.hipaa_records
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own HIPAA records"
ON public.hipaa_records
FOR UPDATE
USING (auth.uid() = user_id);

-- No delete policy - HIPAA records should be retained for compliance
-- Users cannot delete their own medical records

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_hipaa_records_updated_at
BEFORE UPDATE ON public.hipaa_records
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create HIPAA access log table to track all access attempts (audit trail)
CREATE TABLE public.hipaa_access_log (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    action TEXT NOT NULL, -- 'view', 'create', 'update'
    record_section TEXT, -- which part was accessed
    ip_address TEXT,
    user_agent TEXT,
    accessed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on access log
ALTER TABLE public.hipaa_access_log ENABLE ROW LEVEL SECURITY;

-- Users can view their own access history
CREATE POLICY "Users can view their own access log"
ON public.hipaa_access_log
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own access log entries
CREATE POLICY "Users can insert their own access log"
ON public.hipaa_access_log
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- No update or delete on audit logs - they are immutable for compliance