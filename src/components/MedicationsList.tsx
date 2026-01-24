import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ElderHeader } from '@/components/ElderHeader';
import { ElderBottomNav } from '@/components/ElderBottomNav';
import { MedicationListCard } from '@/components/MedicationListCard';
import { MedicationEditSheet } from '@/components/MedicationEditSheet';
import { MedicationDetailSheet } from '@/components/MedicationDetailSheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Loader2, Search, Plus, Pill, Camera } from 'lucide-react';

type NavItem = 'today' | 'medications' | 'scan' | 'stats' | 'profile';

interface MedicationData {
  id: string;
  name: string;
  genericName?: string;
  strength: string;
  form: string;
  purpose?: string;
  howItWorks?: string;
  instructions?: string;
  sideEffects?: string[];
  importantWarnings?: string[];
  prescriber?: string;
  refillDate?: string;
  imageUrl?: string;
}

interface MedicationWithSchedule extends MedicationData {
  scheduleCount: number;
}

interface MedicationsListProps {
  onNavigate: (item: NavItem) => void;
  onScan: () => void;
  userName: string;
}

export function MedicationsList({ onNavigate, onScan, userName }: MedicationsListProps) {
  const [medications, setMedications] = useState<MedicationWithSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingMedication, setEditingMedication] = useState<MedicationData | null>(null);
  const [viewingMedication, setViewingMedication] = useState<MedicationData | null>(null);
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

  // Fetch medications with schedule counts
  const fetchMedications = useCallback(async () => {
    if (!userId) return;

    try {
      setLoading(true);

      // Fetch medications
      const { data: medsData, error: medsError } = await supabase
        .from('medications')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('name');

      if (medsError) throw medsError;

      // Fetch schedule counts
      const { data: schedulesData, error: schedulesError } = await supabase
        .from('scheduled_doses')
        .select('medication_id')
        .eq('user_id', userId)
        .eq('is_active', true);

      if (schedulesError) throw schedulesError;

      // Count schedules per medication
      const scheduleCounts: Record<string, number> = {};
      (schedulesData || []).forEach(schedule => {
        scheduleCounts[schedule.medication_id] = (scheduleCounts[schedule.medication_id] || 0) + 1;
      });

      // Map to component format
      const meds: MedicationWithSchedule[] = (medsData || []).map(med => ({
        id: med.id,
        name: med.name,
        genericName: med.generic_name || undefined,
        strength: med.strength,
        form: med.form,
        purpose: med.purpose || undefined,
        howItWorks: med.how_it_works || undefined,
        instructions: med.instructions || undefined,
        sideEffects: med.side_effects || [],
        importantWarnings: med.important_warnings || [],
        prescriber: med.prescriber || undefined,
        refillDate: med.refill_date || undefined,
        imageUrl: med.image_url || undefined,
        scheduleCount: scheduleCounts[med.id] || 0,
      }));

      setMedications(meds);
    } catch (error) {
      console.error('Error fetching medications:', error);
      toast.error('Failed to load medications');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) {
      fetchMedications();
    }
  }, [userId, fetchMedications]);

  // Filter medications by search
  const filteredMedications = medications.filter(med =>
    med.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (med.genericName?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Handle edit save
  const handleSaveEdit = async (data: MedicationData) => {
    if (!userId) return;

    const { error } = await supabase
      .from('medications')
      .update({
        name: data.name,
        generic_name: data.genericName || null,
        strength: data.strength,
        form: data.form,
        purpose: data.purpose || null,
        instructions: data.instructions || null,
        prescriber: data.prescriber || null,
        refill_date: data.refillDate || null,
      })
      .eq('id', data.id)
      .eq('user_id', userId);

    if (error) throw error;

    await fetchMedications();
    setEditingMedication(null);
  };

  // Handle delete
  const handleDelete = async (medicationId: string) => {
    if (!userId) return;

    try {
      // Soft delete by setting is_active to false
      const { error } = await supabase
        .from('medications')
        .update({ is_active: false })
        .eq('id', medicationId)
        .eq('user_id', userId);

      if (error) throw error;

      // Also deactivate associated schedules
      await supabase
        .from('scheduled_doses')
        .update({ is_active: false })
        .eq('medication_id', medicationId)
        .eq('user_id', userId);

      toast.success('Medication deleted');
      await fetchMedications();
    } catch (error) {
      console.error('Error deleting medication:', error);
      toast.error('Failed to delete medication');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-16 h-16 text-accent animate-spin mx-auto mb-4" />
          <p className="text-elder text-muted-foreground">Loading medications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-32">
      <ElderHeader userName={userName} notificationCount={0} />

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-elder-2xl text-foreground">My Medications</h1>
          <span className="bg-primary/10 text-primary font-bold px-4 py-2 rounded-full text-lg">
            {medications.length}
          </span>
        </div>

        {/* Search & Add */}
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Search medications..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-14 pl-12 text-lg rounded-xl"
            />
          </div>
          <Button
            variant="accent"
            size="icon"
            className="h-14 w-14 rounded-xl"
            onClick={onScan}
          >
            <Camera className="w-6 h-6" />
          </Button>
        </div>

        {/* Empty State */}
        {medications.length === 0 && (
          <div className="bg-card rounded-3xl p-8 shadow-elder-lg border-2 border-border text-center">
            <div className="w-24 h-24 bg-accent/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Pill className="w-12 h-12 text-accent" />
            </div>
            <h2 className="text-elder-xl text-foreground mb-4">No Medications Yet</h2>
            <p className="text-elder text-muted-foreground mb-6">
              Scan a prescription label or add your first medication to get started.
            </p>
            <Button variant="accent" size="xl" className="w-full" onClick={onScan}>
              <Camera className="w-5 h-5 mr-2" />
              Scan Prescription
            </Button>
          </div>
        )}

        {/* No Search Results */}
        {medications.length > 0 && filteredMedications.length === 0 && (
          <div className="bg-card rounded-3xl p-8 shadow-elder border-2 border-border text-center">
            <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-elder-lg text-foreground mb-2">No Results</h2>
            <p className="text-muted-foreground">
              No medications match "{searchQuery}"
            </p>
          </div>
        )}

        {/* Medications List */}
        <div className="space-y-4">
          {filteredMedications.map((medication) => (
            <MedicationListCard
              key={medication.id}
              medication={medication}
              scheduleCount={medication.scheduleCount}
              onEdit={() => setEditingMedication(medication)}
              onDelete={() => handleDelete(medication.id)}
              onViewDetails={() => setViewingMedication(medication)}
            />
          ))}
        </div>
      </main>

      <ElderBottomNav activeItem="medications" onNavigate={onNavigate} />

      {/* Edit Sheet */}
      <MedicationEditSheet
        medication={editingMedication}
        open={!!editingMedication}
        onClose={() => setEditingMedication(null)}
        onSave={handleSaveEdit}
      />

      {/* Details Sheet */}
      <MedicationDetailSheet
        medication={viewingMedication ? {
          ...viewingMedication,
          form: viewingMedication.form as 'pill' | 'capsule' | 'liquid' | 'injection' | 'patch' | 'inhaler' | 'drops',
          purpose: viewingMedication.purpose || 'Prescribed medication',
          howItWorks: viewingMedication.howItWorks || '',
          instructions: viewingMedication.instructions || '',
          sideEffects: viewingMedication.sideEffects || [],
          importantWarnings: viewingMedication.importantWarnings || [],
          doses: [],
        } : null}
        open={!!viewingMedication}
        onClose={() => setViewingMedication(null)}
      />
    </div>
  );
}
