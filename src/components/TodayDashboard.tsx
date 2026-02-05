import { useState, useMemo, useEffect } from 'react';
import { ElderHeader } from '@/components/ElderHeader';
import { ElderBottomNav } from '@/components/ElderBottomNav';
import { TimeOfDayHeader } from '@/components/TimeOfDayHeader';
import { ElderMedicationCard } from '@/components/ElderMedicationCard';
import { AdherenceWidget } from '@/components/AdherenceWidget';
import { EmergencyCardElder } from '@/components/EmergencyCardElder';
import { EmergencyContactsManager } from '@/components/EmergencyContactsManager';
import { NotificationSettings } from '@/components/NotificationSettings';
import { SoundSettings } from '@/components/SoundSettings';
import { AppleHealthSettings } from '@/components/AppleHealthSettings';
import { QuickActionsElder } from '@/components/QuickActionsElder';
import { InteractiveDoseClock } from '@/components/InteractiveDoseClock';
import { PrescriptionScanner } from '@/components/PrescriptionScanner';
import { MedicationsList } from '@/components/MedicationsList';
import { RefillAlertsWidget } from '@/components/RefillAlertsWidget';
import { RewardsWidget } from '@/components/RewardsWidget';
import { CoinEarnAnimation } from '@/components/CoinEarnAnimation';
import { ConfettiAnimation } from '@/components/ConfettiAnimation';
import { CoinMilestoneAnimation } from '@/components/CoinMilestoneAnimation';
import { HipaaSection } from '@/components/HipaaSection';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Heart, Info, AlertTriangle, Phone, PlayCircle, BookOpen, Clock, RefreshCw, Settings, ChevronRight, User, Shield, Loader2, Smartphone, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { CaregiverInviteManager } from '@/components/CaregiverInviteManager';
import { useCaregiver } from '@/hooks/useCaregiver';
import { useMedications, Medication, MedicationDose, TimeOfDay } from '@/hooks/useMedications';
import { useRewards } from '@/hooks/useRewards';
import { useChallenges } from '@/hooks/useChallenges';
import { useShop } from '@/hooks/useShop';
import { useMedicationReminders } from '@/hooks/useMedicationReminders';
import { AddMedicationSheet, NewMedicationData } from '@/components/AddMedicationSheet';
import { NavigationDrawer } from '@/components/NavigationDrawer';

type NavItem = 'today' | 'medications' | 'scan' | 'stats' | 'profile';

const timeOrder: TimeOfDay[] = ['morning', 'afternoon', 'evening', 'bedtime'];

// Profile Menu Item Component
function ProfileMenuItem({ 
  icon: Icon, 
  label, 
  description, 
  onClick, 
  highlight = false 
}: { 
  icon: typeof Phone; 
  label: string; 
  description: string; 
  onClick: () => void;
  highlight?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-4 p-5 rounded-2xl border-2 transition-all haptic-tap text-left ${
        highlight 
          ? 'bg-accent/10 border-accent/30 hover:bg-accent/20' 
          : 'bg-card border-border hover:bg-secondary'
      }`}
    >
      <div className={`w-14 h-14 rounded-full flex items-center justify-center ${
        highlight ? 'bg-accent/20' : 'bg-secondary'
      }`}>
        <Icon className={`w-7 h-7 ${highlight ? 'text-accent' : 'text-muted-foreground'}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-elder-lg text-foreground">{label}</p>
        <p className="text-muted-foreground truncate">{description}</p>
      </div>
      <ChevronRight className="w-6 h-6 text-muted-foreground flex-shrink-0" />
    </button>
  );
}

export function TodayDashboard() {
  const navigate = useNavigate();
  const [activeNav, setActiveNav] = useState<NavItem>('today');
  const [selectedMedication, setSelectedMedication] = useState<Medication | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [showContactsManager, setShowContactsManager] = useState(false);
  const [showHipaaSection, setShowHipaaSection] = useState(false);
  const [coinAnimation, setCoinAnimation] = useState<{ show: boolean; amount: number }>({ show: false, amount: 0 });
  const [showConfetti, setShowConfetti] = useState(false);
  const [showAddMedication, setShowAddMedication] = useState(false);
  const [showNavigationDrawer, setShowNavigationDrawer] = useState(false);
  
  const { isCaregiver, patientsICareFor } = useCaregiver();

  const showCoinAnimation = (amount: number) => {
    setCoinAnimation({ show: true, amount });
  };

  const hideCoinAnimation = () => {
    setCoinAnimation({ show: false, amount: 0 });
  };

  const triggerConfetti = () => {
    setShowConfetti(true);
  };

  const hideConfetti = () => {
    setShowConfetti(false);
  };
  const {
    medications,
    doses,
    profile,
    stats,
    loading,
    takeDose,
    skipDose,
    snoozeDose,
    addMedication,
  } = useMedications();

  const {
    rewards,
    badges,
    spinning,
    spin,
    awardSpinForDose,
    awardPerfectDayBonus,
    awardBadge,
    pendingMilestone,
    clearMilestone,
    refetch: refetchRewards,
  } = useRewards();

  const {
    userChallenges,
    updateChallengeProgress,
    claimChallengeReward,
  } = useChallenges();

  const {
    shopItems,
    purchaseItem,
    equipItem,
    ownsItem,
    isEquipped,
    getItemsByCategory,
    refetch: refetchShop,
  } = useShop();

  // Medication reminders - chime and vibrate when dose time arrives
  const dosesWithNames = useMemo(() => {
    return doses.map(dose => {
      const medication = medications.find(m => m.id === dose.medicationId);
      return {
        ...dose,
        medicationName: medication?.name || 'Medication',
      };
    });
  }, [doses, medications]);

  const { triggerReminder } = useMedicationReminders({ 
    doses: dosesWithNames, 
    enabled: true 
  });
  const groupedDoses = useMemo(() => {
    const groups: Record<TimeOfDay, { medication: Medication; dose: MedicationDose }[]> = {
      morning: [],
      afternoon: [],
      evening: [],
      bedtime: [],
    };

    doses.forEach(dose => {
      const medication = medications.find(m => m.id === dose.medicationId);
      if (medication) {
        groups[dose.timeOfDay].push({ medication, dose });
      }
    });

    // Sort by time
    Object.keys(groups).forEach(key => {
      groups[key as TimeOfDay].sort((a, b) => 
        a.dose.time.localeCompare(b.dose.time)
      );
    });

    return groups;
  }, [doses, medications]);

  // Clock doses
  const clockDoses = useMemo(() => {
    return doses.map(d => ({
      hour: parseInt(d.time.split(':')[0]),
      status: d.status === 'taken' ? 'taken' as const : 
              d.status === 'missed' ? 'missed' as const :
              d.status === 'pending' || d.status === 'snoozed' ? 'upcoming' as const : 
              'pending' as const,
    }));
  }, [doses]);

  const handleTake = async (dose: MedicationDose) => {
    await takeDose(dose);
    
    // Award a spin for taking dose on time
    await awardSpinForDose();
    
    // Show coin animation for taking dose (base coins for dose)
    showCoinAnimation(5);
    
    // Determine if dose was taken on time and early
    const scheduledTime = new Date();
    const [hours, minutes] = dose.time.split(':').map(Number);
    scheduledTime.setHours(hours, minutes, 0, 0);
    const now = new Date();
    const timeDiff = (now.getTime() - scheduledTime.getTime()) / 1000 / 60; // minutes
    const wasOnTime = timeDiff <= 30; // Within 30 min of scheduled time
    const wasEarly = timeDiff <= 5 && timeDiff >= -5; // Within 5 min
    const wasSnoozed = dose.status === 'snoozed';
    
    // Update challenge progress
    await updateChallengeProgress(dose.timeOfDay, wasOnTime, wasEarly, wasSnoozed);
    
    // Check if this was the first dose ever
    const previousTakenCount = doses.filter(d => d.status === 'taken').length;
    if (previousTakenCount === 0) {
      await awardBadge('first_dose');
    }
    
    // Check for perfect day (all doses taken)
    const updatedDoses = doses.map(d => 
      d.scheduledDoseId === dose.scheduledDoseId ? { ...d, status: 'taken' as const } : d
    );
    const allTaken = updatedDoses.every(d => d.status === 'taken');
    if (allTaken && doses.length > 0) {
      await awardPerfectDayBonus();
      // Trigger confetti celebration for perfect day!
      triggerConfetti();
      toast.success('🎉 Perfect Day!', {
        description: 'You took all your medications today!',
        duration: 4000,
      });
    }
  };

  const handleSkip = (dose: MedicationDose) => {
    skipDose(dose);
  };

  const handleSnooze = (dose: MedicationDose) => {
    snoozeDose(dose);
  };

  const handleViewDetails = (medication: Medication) => {
    setSelectedMedication(medication);
    setDetailsOpen(true);
  };

  const handleVoiceRead = (medication: Medication) => {
    if ('speechSynthesis' in window) {
      const text = `It's time for ${medication.name}, ${medication.strength}. ${medication.instructions || ''}`;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1;
      speechSynthesis.speak(utterance);
      toast.info('Reading aloud...', { duration: 2000 });
    } else {
      toast.error('Voice not available on this device');
    }
  };

  const handleOpenScanner = () => {
    setShowScanner(true);
    setActiveNav('scan');
  };

  const handleCloseScanner = () => {
    setShowScanner(false);
    setActiveNav('today');
  };

  const handleMedicationScanned = async (scannedMed: { 
    ndcCode: string; 
    name: string; 
    genericName?: string; 
    strength: string; 
    form: string; 
    manufacturer?: string;
  }) => {
    const result = await addMedication(scannedMed);
    if (result) {
      toast.success(`${scannedMed.name} ${scannedMed.strength} has been added to your medications!`, {
        duration: 4000,
      });
    }
    setShowScanner(false);
    setActiveNav('today');
  };

  const handleAddMedicationManually = async (newMed: NewMedicationData) => {
    const result = await addMedication({
      name: newMed.name,
      genericName: newMed.genericName,
      strength: newMed.strength,
      form: newMed.form,
      purpose: newMed.purpose,
      instructions: newMed.instructions,
      prescriber: newMed.prescriber,
      schedules: newMed.schedules,
    });
    if (result) {
      toast.success(`${newMed.name} ${newMed.strength} has been added!`, {
        duration: 4000,
      });
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-16 h-16 text-accent animate-spin mx-auto mb-4" />
          <p className="text-elder text-muted-foreground">Loading your medications...</p>
        </div>
      </div>
    );
  }

  // Show scanner when 'scan' nav is active
  if (showScanner || activeNav === 'scan') {
    return (
      <PrescriptionScanner 
        onMedicationScanned={handleMedicationScanned}
        onClose={handleCloseScanner}
      />
    );
  }

  const userName = profile?.name || 'User';
  const userInfo = {
    name: userName,
    dateOfBirth: profile?.dateOfBirth || '',
    allergies: profile?.allergies || [],
    conditions: profile?.conditions || [],
    emergencyContact: {
      name: 'Emergency Contact',
      phone: '911',
      relationship: 'Emergency',
    },
  };

  // Show profile page
  if (activeNav === 'profile') {
    return (
      <div className="min-h-screen bg-background pb-32">
        <ElderHeader 
          userName={userName}
          notificationCount={0}
          onMenuClick={() => setShowNavigationDrawer(true)}
        />
        
        <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
          {/* Profile Header */}
          <div className="bg-card rounded-3xl p-6 shadow-elder-lg border-2 border-border">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-10 h-10 text-primary" />
              </div>
              <div>
                <h1 className="text-elder-2xl text-foreground">{userName}</h1>
                {profile?.dateOfBirth && (
                  <p className="text-muted-foreground">
                    {new Date(profile.dateOfBirth).toLocaleDateString('en-US', { 
                      month: 'long', 
                      day: 'numeric', 
                      year: 'numeric' 
                    })}
                  </p>
                )}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-success/10 rounded-xl p-4 text-center">
                <p className="text-3xl font-bold text-success">{stats.currentStreak}</p>
                <p className="text-muted-foreground">Day Streak</p>
              </div>
              <div className="bg-primary/10 rounded-xl p-4 text-center">
                <p className="text-3xl font-bold text-primary">{stats.weeklyAdherence}%</p>
                <p className="text-muted-foreground">Weekly</p>
              </div>
            </div>
          </div>

          {/* Push Notification Settings */}
          <NotificationSettings />

          {/* Sound Settings */}
          <SoundSettings />

          {/* Apple Health & Siri */}
          <AppleHealthSettings />

          {/* Family & Caregivers */}
          <CaregiverInviteManager />

          {/* Caregiver Dashboard Link (if user is a caregiver) */}
          {isCaregiver && (
            <div 
              className="bg-gradient-to-r from-primary/10 to-accent/10 rounded-2xl p-4 border-2 border-primary/20 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => navigate('/caregiver')}
            >
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">Caregiver Dashboard</h3>
                  <p className="text-sm text-muted-foreground">
                    View {patientsICareFor.length} {patientsICareFor.length === 1 ? 'person' : 'people'} you care for
                  </p>
                </div>
                <ChevronRight className="h-6 w-6 text-muted-foreground" />
              </div>
            </div>
          )}

          {/* Profile Menu Items */}
          <div className="space-y-3">
            <ProfileMenuItem 
              icon={Phone}
              label="Emergency Contacts"
              description="Manage caregivers & alerts"
              onClick={() => setShowContactsManager(true)}
              highlight
            />
            <ProfileMenuItem 
              icon={Shield}
              label="HIPAA Health Records"
              description="Secure medical info & insurance"
              onClick={() => setShowHipaaSection(true)}
              highlight
            />
            <ProfileMenuItem 
              icon={Settings}
              label="App Settings"
              description="Notifications, display, voice"
              onClick={() => toast.info('Settings coming soon!')}
            />
          </div>

          {/* Emergency Card */}
          <EmergencyCardElder info={userInfo} />
        </main>

        <ElderBottomNav activeItem={activeNav} onNavigate={setActiveNav} />

        {/* Emergency Contacts Manager Sheet */}
        <Sheet open={showContactsManager} onOpenChange={setShowContactsManager}>
          <SheetContent side="bottom" className="h-[90vh] overflow-y-auto rounded-t-3xl">
            <EmergencyContactsManager onClose={() => setShowContactsManager(false)} />
          </SheetContent>
        </Sheet>

        {/* HIPAA Section Sheet */}
        <Sheet open={showHipaaSection} onOpenChange={setShowHipaaSection}>
          <SheetContent side="bottom" className="h-[90vh] overflow-y-auto rounded-t-3xl">
            <SheetHeader className="pb-4">
              <SheetTitle className="flex items-center gap-2 text-2xl">
                <Shield className="w-6 h-6 text-success" />
                Health Records Vault
              </SheetTitle>
            </SheetHeader>
            <HipaaSection onClose={() => setShowHipaaSection(false)} />
          </SheetContent>
        </Sheet>

        {/* Navigation Drawer for Profile */}
        <NavigationDrawer
          open={showNavigationDrawer}
          onClose={() => setShowNavigationDrawer(false)}
          onNavigate={setActiveNav}
          activeItem={activeNav}
          isCaregiver={isCaregiver}
          onCaregiverDashboard={() => navigate('/caregiver')}
        />
      </div>
    );
  }

  // Show medications list page
  if (activeNav === 'medications') {
    return (
      <MedicationsList
        onNavigate={setActiveNav}
        onScan={handleOpenScanner}
        userName={userName}
      />
    );
  }

  // Check if there are no medications
  const hasMedications = medications.length > 0;
  const hasDoses = doses.length > 0;

  return (
    <>
    <CoinEarnAnimation 
      amount={coinAnimation.amount}
      isVisible={coinAnimation.show}
      onComplete={hideCoinAnimation}
    />
    <ConfettiAnimation 
      isVisible={showConfetti}
      onComplete={hideConfetti}
      variant="celebration"
    />
    <CoinMilestoneAnimation 
      milestone={pendingMilestone?.milestone || 500}
      isVisible={!!pendingMilestone}
      onComplete={clearMilestone}
    />
    <div className="min-h-screen bg-background pb-32">
      <ElderHeader 
        userName={userName}
        notificationCount={doses.filter(d => d.status === 'pending').length}
        onMenuClick={() => setShowNavigationDrawer(true)}
      />
      
      <main className="max-w-2xl mx-auto px-4 py-6 space-y-8">
        {/* Quick Actions */}
        <QuickActionsElder 
          onAddMedication={() => setShowAddMedication(true)}
          onScan={handleOpenScanner}
          pharmacyPhone="(555) 123-4567"
        />

        {/* Today's Progress - Compact */}
        <AdherenceWidget stats={stats} size="compact" />

        {/* Daily Rewards Slot Machine */}
        <RewardsWidget 
          rewards={rewards}
          badges={badges}
          userChallenges={userChallenges}
          shopItems={{
            themes: getItemsByCategory('theme'),
            avatars: getItemsByCategory('avatar'),
            powerups: getItemsByCategory('powerup'),
          }}
          onSpin={spin}
          onClaimChallengeReward={async (id) => {
            // Find the challenge to get its reward amount
            const challenge = userChallenges.find(uc => uc.id === id);
            const success = await claimChallengeReward(id);
            if (success) {
              refetchRewards();
              // Show coin animation with the actual reward amount
              if (challenge) {
                showCoinAnimation(challenge.challenge.rewardCoins);
              }
            }
            return success;
          }}
          onPurchaseItem={async (item) => {
            if (!rewards) return false;
            const success = await purchaseItem(item, rewards.coins);
            if (success) {
              refetchRewards();
              refetchShop();
            }
            return success;
          }}
          onEquipItem={equipItem}
          ownsItem={ownsItem}
          isEquipped={isEquipped}
          spinning={spinning}
          onRefreshRewards={() => {
            refetchRewards();
            refetchShop();
          }}
        />

        {/* Refill Alerts */}
        <RefillAlertsWidget 
          medications={medications.map(med => {
            const daysUntilRefill = med.refillDate 
              ? Math.ceil((new Date(med.refillDate).getTime() - Date.now()) / (24 * 60 * 60 * 1000))
              : undefined;
            return {
              id: med.id,
              name: med.name,
              strength: med.strength,
              refillDate: med.refillDate,
              quantityRemaining: med.quantityRemaining,
              daysUntilRefill: daysUntilRefill !== undefined && daysUntilRefill >= 0 ? daysUntilRefill : undefined,
            };
          })}
          onViewMedication={(id) => {
            const med = medications.find(m => m.id === id);
            if (med) handleViewDetails(med);
          }}
          onCallPharmacy={() => {
            window.location.href = 'tel:+15551234567';
          }}
        />
        {!hasMedications && (
          <div className="bg-card rounded-3xl p-8 shadow-elder-lg border-2 border-border text-center">
            <div className="w-24 h-24 bg-accent/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <img src="/favicon.png" alt="Med Guard Rx" className="w-16 h-16" />
            </div>
            <h2 className="text-elder-xl text-foreground mb-4">No Medications Yet</h2>
            <p className="text-elder text-muted-foreground mb-6">
              Scan a prescription label or add your first medication to get started.
            </p>
            <Button 
              variant="accent" 
              size="xl" 
              className="w-full"
              onClick={handleOpenScanner}
            >
              Scan Prescription
            </Button>
          </div>
        )}

        {/* 24-Hour Clock */}
        {hasDoses && (
          <div className="bg-card rounded-3xl p-6 shadow-elder-lg border-2 border-border">
            <h2 className="text-elder-xl text-foreground mb-6 text-center">Today's Schedule</h2>
            <InteractiveDoseClock doses={clockDoses} size="md" />
          </div>
        )}

        {/* Timeline by Time of Day */}
        {hasDoses && (
          <div>
            <h2 className="text-elder-2xl text-foreground mb-6">Medications</h2>
            
            {timeOrder.map(timeOfDay => {
              const items = groupedDoses[timeOfDay];
              if (items.length === 0) return null;
              
              const completedCount = items.filter(
                i => i.dose.status === 'taken' || i.dose.status === 'skipped'
              ).length;

              return (
                <section key={timeOfDay} className="mb-8">
                  <TimeOfDayHeader 
                    timeOfDay={timeOfDay}
                    medicationCount={items.length}
                    completedCount={completedCount}
                  />
                  
                  <div className="space-y-4 mt-4">
                    {items.map(({ medication, dose }) => (
                      <ElderMedicationCard
                        key={dose.id}
                        medication={medication}
                        dose={dose}
                        onTake={() => handleTake(dose)}
                        onSkip={() => handleSkip(dose)}
                        onSnooze={() => handleSnooze(dose)}
                        onViewDetails={() => handleViewDetails(medication)}
                        onVoiceRead={() => handleVoiceRead(medication)}
                      />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}

        {/* Emergency Info */}
        <EmergencyCardElder info={userInfo} />
      </main>

      <ElderBottomNav activeItem={activeNav} onNavigate={setActiveNav} />

      {/* Medication Details Sheet */}
      <Sheet open={detailsOpen} onOpenChange={setDetailsOpen}>
        <SheetContent side="bottom" className="h-[90vh] overflow-y-auto rounded-t-3xl">
          {selectedMedication && (
            <>
              <SheetHeader className="pb-4 border-b-2 border-border">
                <div className="flex items-center gap-4">
                  <div className="text-5xl">💊</div>
                  <div>
                    <SheetTitle className="text-elder-2xl text-left">
                      {selectedMedication.name}
                    </SheetTitle>
                    {selectedMedication.genericName && (
                      <p className="text-muted-foreground text-lg">
                        {selectedMedication.genericName}
                      </p>
                    )}
                    <p className="text-primary font-bold text-elder-lg">
                      {selectedMedication.strength}
                    </p>
                  </div>
                </div>
              </SheetHeader>

              <div className="py-6 space-y-6">
                {/* Purpose */}
                {selectedMedication.purpose && (
                  <section className="bg-primary/10 rounded-2xl p-6 border-2 border-primary/20">
                    <div className="flex items-center gap-3 mb-3">
                      <Heart className="w-8 h-8 text-primary" />
                      <h3 className="text-elder-xl text-foreground">What It's For</h3>
                    </div>
                    <p className="text-elder text-foreground">{selectedMedication.purpose}</p>
                  </section>
                )}

                {/* How it works */}
                {selectedMedication.howItWorks && (
                  <section className="bg-card rounded-2xl p-6 border-2 border-border shadow-elder">
                    <div className="flex items-center gap-3 mb-3">
                      <Info className="w-8 h-8 text-info" />
                      <h3 className="text-elder-xl text-foreground">How It Works</h3>
                    </div>
                    <p className="text-elder text-muted-foreground">
                      {selectedMedication.howItWorks}
                    </p>
                    <Button variant="link" className="mt-2 p-0 h-auto text-info text-lg">
                      <BookOpen className="w-5 h-5 mr-2" />
                      Learn More
                    </Button>
                  </section>
                )}

                {/* Instructions */}
                {selectedMedication.instructions && (
                  <section className="bg-secondary rounded-2xl p-6 border-2 border-border">
                    <div className="flex items-center gap-3 mb-3">
                      <Clock className="w-8 h-8 text-secondary-foreground" />
                      <h3 className="text-elder-xl text-foreground">How to Take</h3>
                    </div>
                    <p className="text-elder text-foreground">{selectedMedication.instructions}</p>
                  </section>
                )}

                {/* Warnings */}
                {selectedMedication.importantWarnings && selectedMedication.importantWarnings.length > 0 && (
                  <section className="bg-destructive/10 rounded-2xl p-6 border-3 border-destructive/40">
                    <div className="flex items-center gap-3 mb-3">
                      <AlertTriangle className="w-8 h-8 text-destructive" />
                      <h3 className="text-elder-xl text-destructive">Important Warnings</h3>
                    </div>
                    <ul className="space-y-3">
                      {selectedMedication.importantWarnings.map((warning, index) => (
                        <li key={index} className="flex items-start gap-3 text-elder text-foreground">
                          <span className="text-destructive text-2xl">⚠️</span>
                          {warning}
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                {/* Side Effects */}
                {selectedMedication.sideEffects && selectedMedication.sideEffects.length > 0 && (
                  <section className="bg-warning/10 rounded-2xl p-6 border-2 border-warning/30">
                    <div className="flex items-center gap-3 mb-3">
                      <Info className="w-8 h-8 text-warning" />
                      <h3 className="text-elder-xl text-foreground">Possible Side Effects</h3>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      {selectedMedication.sideEffects.map((effect, index) => (
                        <span 
                          key={index} 
                          className="bg-card px-4 py-2 rounded-full text-lg font-medium border-2 border-border"
                        >
                          {effect}
                        </span>
                      ))}
                    </div>
                  </section>
                )}

                {/* Refill */}
                {selectedMedication.refillDate && (
                  <section className="bg-muted rounded-2xl p-5 border-2 border-border">
                    <div className="flex items-center gap-3">
                      <RefreshCw className="w-7 h-7 text-muted-foreground" />
                      <div>
                        <p className="text-lg font-semibold">Next Refill</p>
                        <p className="text-muted-foreground">{selectedMedication.refillDate}</p>
                      </div>
                    </div>
                  </section>
                )}

                {/* Actions */}
                <div className="space-y-4 pt-4">
                  <Button variant="outline" size="xl" className="w-full justify-start gap-4">
                    <PlayCircle className="w-8 h-8" />
                    Watch Educational Videos
                  </Button>
                  
                  <Button variant="accent" size="xl" className="w-full justify-start gap-4">
                    <Phone className="w-8 h-8" />
                    Call Your Pharmacist
                  </Button>
                </div>

                {/* Prescriber */}
                {selectedMedication.prescriber && (
                  <section className="bg-muted/50 rounded-2xl p-5 border-2 border-border">
                    <p className="text-muted-foreground">
                      <span className="font-semibold">Prescribed by:</span> {selectedMedication.prescriber}
                    </p>
                  </section>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Add Medication Sheet */}
      <AddMedicationSheet
        open={showAddMedication}
        onClose={() => setShowAddMedication(false)}
        onSave={handleAddMedicationManually}
      />

      {/* Navigation Drawer */}
      <NavigationDrawer
        open={showNavigationDrawer}
        onClose={() => setShowNavigationDrawer(false)}
        onNavigate={setActiveNav}
        activeItem={activeNav}
        isCaregiver={isCaregiver}
        onCaregiverDashboard={() => navigate('/caregiver')}
      />
    </div>
    </>
  );
}
