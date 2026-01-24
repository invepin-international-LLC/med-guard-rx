import { useState, useMemo } from 'react';
import { Medication, Dose, TimeOfDay } from '@/types/medication';
import { mockMedications, mockUserProfile, mockStreak } from '@/data/mockMedications';
import { Header } from '@/components/Header';
import { TimeOfDaySection } from '@/components/TimeOfDaySection';
import { StreakWidget } from '@/components/StreakWidget';
import { EmergencyCard } from '@/components/EmergencyCard';
import { BottomNav } from '@/components/BottomNav';
import { QuickActionsBar } from '@/components/QuickActionsBar';
import { MedicationDetailSheet } from '@/components/MedicationDetailSheet';
import { toast } from 'sonner';

type NavItem = 'today' | 'medications' | 'scan' | 'calendar' | 'profile';

const timeOrder: TimeOfDay[] = ['morning', 'afternoon', 'evening', 'bedtime'];

export default function Index() {
  const [medications, setMedications] = useState<Medication[]>(mockMedications);
  const [activeNav, setActiveNav] = useState<NavItem>('today');
  const [selectedMedication, setSelectedMedication] = useState<Medication | null>(null);
  const [streak, setStreak] = useState(mockStreak);

  // Group medications by time of day
  const groupedMedications = useMemo(() => {
    const groups: Record<TimeOfDay, { medication: Medication; dose: Dose }[]> = {
      morning: [],
      afternoon: [],
      evening: [],
      bedtime: [],
    };

    medications.forEach(med => {
      med.doses.forEach(dose => {
        groups[dose.timeOfDay].push({ medication: med, dose });
      });
    });

    // Sort each group by time
    Object.keys(groups).forEach(key => {
      groups[key as TimeOfDay].sort((a, b) => 
        a.dose.time.localeCompare(b.dose.time)
      );
    });

    return groups;
  }, [medications]);

  const handleTake = (medicationId: string, doseId: string) => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });

    setMedications(prev => prev.map(med => {
      if (med.id === medicationId) {
        return {
          ...med,
          doses: med.doses.map(dose => 
            dose.id === doseId 
              ? { ...dose, status: 'taken' as const, takenAt: timeStr }
              : dose
          ),
        };
      }
      return med;
    }));

    // Update streak
    setStreak(prev => ({
      ...prev,
      currentStreak: prev.currentStreak + 1,
      weeklyAdherence: Math.min(100, prev.weeklyAdherence + 2),
    }));

    toast.success('Medication taken! Great job! 💪', {
      description: 'Keep up the excellent work!',
      duration: 3000,
    });
  };

  const handleSkip = (medicationId: string, doseId: string) => {
    setMedications(prev => prev.map(med => {
      if (med.id === medicationId) {
        return {
          ...med,
          doses: med.doses.map(dose => 
            dose.id === doseId 
              ? { ...dose, status: 'skipped' as const }
              : dose
          ),
        };
      }
      return med;
    }));

    toast.info('Dose skipped', {
      description: 'Remember to take your next dose on time.',
      duration: 3000,
    });
  };

  const handleSnooze = (medicationId: string, doseId: string) => {
    const snoozeUntil = new Date();
    snoozeUntil.setMinutes(snoozeUntil.getMinutes() + 10);
    const timeStr = snoozeUntil.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });

    setMedications(prev => prev.map(med => {
      if (med.id === medicationId) {
        return {
          ...med,
          doses: med.doses.map(dose => 
            dose.id === doseId 
              ? { ...dose, status: 'snoozed' as const, snoozeUntil: timeStr }
              : dose
          ),
        };
      }
      return med;
    }));

    toast('Snoozed for 10 minutes ⏰', {
      description: `We'll remind you at ${timeStr}`,
      duration: 3000,
    });
  };

  const handleViewDetails = (medication: Medication) => {
    setSelectedMedication(medication);
  };

  // Calculate today's progress
  const totalDoses = medications.reduce((sum, med) => sum + med.doses.length, 0);
  const takenDoses = medications.reduce(
    (sum, med) => sum + med.doses.filter(d => d.status === 'taken').length, 
    0
  );
  const progressPercent = totalDoses > 0 ? Math.round((takenDoses / totalDoses) * 100) : 0;

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header user={mockUserProfile} />
      
      <main className="max-w-2xl mx-auto px-4 py-6">
        {/* Today's Progress Summary */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-muted-foreground">Today's Progress</h2>
            <span className="text-elder-lg text-primary font-bold">{progressPercent}%</span>
          </div>
          <div className="h-3 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <p className="text-muted-foreground mt-2">
            {takenDoses} of {totalDoses} medications taken
          </p>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <QuickActionsBar 
            onAddMedication={() => toast.info('Add medication coming soon!')}
            onScan={() => toast.info('Scan feature coming soon!')}
            onCallPharmacy={() => {
              if (mockUserProfile.pharmacy?.phone) {
                window.location.href = `tel:${mockUserProfile.pharmacy.phone}`;
              }
            }}
          />
        </div>

        {/* Timeline by Time of Day */}
        <div className="mb-8">
          <h2 className="text-elder-xl text-foreground mb-6">Today's Medications</h2>
          
          {timeOrder.map(timeOfDay => (
            <TimeOfDaySection
              key={timeOfDay}
              timeOfDay={timeOfDay}
              medications={groupedMedications[timeOfDay]}
              onTake={handleTake}
              onSkip={handleSkip}
              onSnooze={handleSnooze}
              onViewDetails={handleViewDetails}
            />
          ))}
        </div>

        {/* Streak Widget */}
        <div className="mb-6">
          <StreakWidget streak={streak} />
        </div>

        {/* Emergency Info */}
        <div className="mb-6">
          <EmergencyCard user={mockUserProfile} />
        </div>
      </main>

      {/* Bottom Navigation */}
      <BottomNav activeItem={activeNav} onNavigate={setActiveNav} />

      {/* Medication Detail Sheet */}
      <MedicationDetailSheet
        medication={selectedMedication}
        open={!!selectedMedication}
        onClose={() => setSelectedMedication(null)}
      />
    </div>
  );
}
