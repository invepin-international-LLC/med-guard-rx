import { useState, useMemo, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
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
import { DisplaySettings } from '@/components/DisplaySettings';
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
import { Heart, Info, AlertTriangle, Phone, PlayCircle, BookOpen, Clock, RefreshCw, Settings, ChevronRight, User, Shield, Loader2, Smartphone, Users, Trash2, FileText, Scale } from 'lucide-react';
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
import { DrugInteractionWarnings } from '@/components/DrugInteractionWarnings';
import { MedicationDictionary } from '@/components/MedicationDictionary';
import { DrRxChat } from '@/components/DrRxChat';
import { AdherenceHistory } from '@/components/AdherenceHistory';
import { MissedDoseFlash } from '@/components/MissedDoseFlash';
import { PersistentAlarm } from '@/components/PersistentAlarm';
import { FentanylSafetyGuide } from '@/components/FentanylSafetyGuide';
import { AdherenceReportPDF } from '@/components/AdherenceReportPDF';
import { SymptomJournal } from '@/components/SymptomJournal';
import { LanguageSelector } from '@/components/LanguageSelector';
import { useTranslation } from 'react-i18next';

type NavItem = 'today' | 'medications' | 'scan' | 'stats' | 'safety' | 'profile';

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
  const { t } = useTranslation();
  const [activeNav, setActiveNav] = useState<NavItem>('today');
  const [selectedMedication, setSelectedMedication] = useState<Medication | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [showContactsManager, setShowContactsManager] = useState(false);
  const [showHipaaSection, setShowHipaaSection] = useState(false);
  const [coinAnimation, setCoinAnimation] = useState<{ show: boolean; amount: number }>({ show: false, amount: 0 });
  const [showConfetti, setShowConfetti] = useState(false);
  const [showAddMedication, setShowAddMedication] = useState(false);
  const [prefillMedData, setPrefillMedData] = useState<Partial<import('@/components/AddMedicationSheet').NewMedicationData> | undefined>(undefined);
  const [showNavigationDrawer, setShowNavigationDrawer] = useState(false);
  const [showDictionary, setShowDictionary] = useState(false);
  const [showDrRx, setShowDrRx] = useState(false);
  const [openShop, setOpenShop] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showChangePin, setShowChangePin] = useState(false);
  
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

  const { triggerReminder, missedDoseAlert, dismissFlash } = useMedicationReminders({ 
    doses: dosesWithNames, 
    enabled: true 
  });

  // Persistent alarm state
  const [persistentAlarmDose, setPersistentAlarmDose] = useState<{
    active: boolean;
    medicationName?: string;
    doseTime?: string;
    doseId?: string;
  }>({ active: false });

  // Check for doses that are 15+ min overdue and trigger persistent alarm
  useEffect(() => {
    if (persistentAlarmDose.active) return; // Don't override active alarm
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    
    for (const dose of dosesWithNames) {
      if (dose.status !== 'pending') continue;
      const [h, m] = dose.time.split(':').map(Number);
      const scheduledMinutes = h * 60 + m;
      const minutesPast = currentMinutes - scheduledMinutes;
      
      if (minutesPast >= 15 && minutesPast > 0) {
        setPersistentAlarmDose({
          active: true,
          medicationName: dose.medicationName,
          doseTime: dose.time,
          doseId: dose.id,
        });
        break; // Only show one alarm at a time
      }
    }
  }, [dosesWithNames, persistentAlarmDose.active]);
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
      toast.success(`🎉 ${t('dashboard.perfectDay')}`, {
        description: t('dashboard.perfectDayDesc'),
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
      toast.info(t('dashboard.readingAloud'), { duration: 2000 });
    } else {
      toast.error(t('dashboard.voiceNotAvailable'));
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

  const handleAddFromDictionary = (drug: any) => {
    // Map dictionary drug to AddMedicationSheet format
    const formMap: Record<string, string> = {
      'oral': 'pill', 'tablet': 'pill', 'capsule': 'capsule',
      'liquid': 'liquid', 'injection': 'injection', 'patch': 'patch',
      'inhaler': 'inhaler', 'drops': 'drops', 'cream': 'cream',
    };
    const doseForm = (drug.doseForms?.[0] || '').toLowerCase();
    const mappedForm = Object.entries(formMap).find(([key]) => doseForm.includes(key))?.[1] || 'pill';
    
    const strength = drug.activeIngredients?.[0]?.strength || '';
    
    setPrefillMedData({
      name: drug.name,
      genericName: drug.genericName || undefined,
      strength,
      form: mappedForm,
      purpose: drug.purpose?.substring(0, 200) || drug.description?.substring(0, 200) || undefined,
    });
    setShowDictionary(false);
    setShowAddMedication(true);
  };

  // Show Dr. Rx Chat
  if (showDrRx) {
    return <DrRxChat onBack={() => setShowDrRx(false)} />;
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-16 h-16 text-accent animate-spin mx-auto mb-4" />
          <p className="text-elder text-muted-foreground">{t('common.loadingMedications')}</p>
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
          onNotificationsClick={() => setActiveNav('profile')}
          onProfileClick={() => setShowDrRx(true)}
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
                <p className="text-muted-foreground">{t('adherence.dayStreak')}</p>
              </div>
              <div className="bg-primary/10 rounded-xl p-4 text-center">
                <p className="text-3xl font-bold text-primary">{stats.weeklyAdherence}%</p>
                <p className="text-muted-foreground">{t('profile.weekly')}</p>
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
                  <h3 className="font-semibold text-lg">{t('profile.caregiverDashboard')}</h3>
                  <p className="text-sm text-muted-foreground">
                    {patientsICareFor.length === 1 
                      ? t('profile.viewPeopleYouCareFor', { count: patientsICareFor.length })
                      : t('profile.viewPeopleYouCareFor_plural', { count: patientsICareFor.length })
                    }
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
              label={t('profile.emergencyContacts')}
              description={t('profile.manageCaregiversAlerts')}
              onClick={() => setShowContactsManager(true)}
              highlight
            />
            <ProfileMenuItem 
              icon={Shield}
              label={t('profile.hipaaHealthRecords')}
              description={t('profile.secureMedicalInfo')}
              onClick={() => setShowHipaaSection(true)}
              highlight
            />
            <ProfileMenuItem 
              icon={Settings}
              label={t('profile.appSettings')}
              description={t('profile.settingsDesc')}
              onClick={() => setShowSettings(true)}
            />
          </div>

          {/* Legal Links */}
          <div className="flex items-center justify-center gap-4 pt-2">
            <button onClick={() => navigate('/privacy')} className="text-xs text-muted-foreground hover:text-foreground underline transition-colors">
              Privacy Policy
            </button>
            <span className="text-xs text-muted-foreground">·</span>
            <button onClick={() => navigate('/terms')} className="text-xs text-muted-foreground hover:text-foreground underline transition-colors">
              Terms of Service
            </button>
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
                {t('profile.healthRecordsVault')}
              </SheetTitle>
            </SheetHeader>
            <HipaaSection onClose={() => setShowHipaaSection(false)} />
          </SheetContent>
        </Sheet>

        {/* App Settings Sheet */}
        <Sheet open={showSettings} onOpenChange={setShowSettings}>
          <SheetContent side="bottom" className="h-[90vh] rounded-t-3xl">
            <SheetHeader className="pb-4">
              <SheetTitle className="flex items-center gap-2 text-2xl">
                <Settings className="w-6 h-6 text-primary" />
                {t('profile.appSettings')}
              </SheetTitle>
            </SheetHeader>
            <div className="space-y-6 pb-8">
              <DisplaySettings />
              <NotificationSettings />
              <SoundSettings />
              <AppleHealthSettings />
              <div className="bg-card rounded-2xl p-4 border-2 border-border">
                <h3 className="text-lg font-semibold text-foreground mb-3">{t('profile.languageIdioma')}</h3>
                <LanguageSelector />
              </div>

              {/* Legal Links in Settings */}
              <div className="bg-card rounded-2xl p-4 border-2 border-border space-y-3">
                <h3 className="text-lg font-semibold text-foreground">Legal</h3>
                <button
                  onClick={() => navigate('/privacy')}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-secondary transition-colors text-left"
                >
                  <FileText className="w-5 h-5 text-muted-foreground" />
                  <span className="text-sm font-medium">Privacy Policy</span>
                  <ChevronRight className="w-4 h-4 ml-auto text-muted-foreground" />
                </button>
                <button
                  onClick={() => navigate('/terms')}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-secondary transition-colors text-left"
                >
                  <Scale className="w-5 h-5 text-muted-foreground" />
                  <span className="text-sm font-medium">Terms of Service</span>
                  <ChevronRight className="w-4 h-4 ml-auto text-muted-foreground" />
                </button>
              </div>

              {/* Delete Account */}
              <div className="bg-destructive/5 rounded-2xl p-4 border-2 border-destructive/20 space-y-3">
                <h3 className="text-lg font-semibold text-destructive">Delete Account</h3>
                <p className="text-sm text-muted-foreground">
                  Permanently delete your account and all associated data including medications, health records, and adherence history. This action cannot be undone.
                </p>
                <Button
                  variant="destructive"
                  className="w-full"
                  onClick={async () => {
                    const confirmed = window.confirm(
                      'Are you sure you want to permanently delete your account? All your medications, health records, adherence history, and rewards will be permanently removed. This cannot be undone.'
                    );
                    if (!confirmed) return;

                    const doubleConfirmed = window.confirm(
                      'This is your final warning. Type OK to confirm you want to delete everything.'
                    );
                    if (!doubleConfirmed) return;

                    try {
                      const { error } = await supabase.functions.invoke('delete-account');
                      if (error) throw error;

                      // Sign out and clear local state
                      await supabase.auth.signOut();
                      localStorage.clear();
                      toast.success('Account deleted successfully');
                      navigate('/');
                    } catch (error) {
                      console.error('Error deleting account:', error);
                      toast.error('Failed to delete account. Please try again.');
                    }
                  }}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete My Account
                </Button>
              </div>
            </div>
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
          onDrBombayClick={() => setShowDrRx(true)}
        />
      </div>
    );
  }

  // Show medications list page
  if (activeNav === 'medications') {
    if (showDictionary) {
      return (
        <div className="min-h-screen bg-background pb-32">
          <ElderHeader
            userName={userName}
            notificationCount={0}
            onNotificationsClick={() => setActiveNav('profile')}
            onProfileClick={() => setShowDrRx(true)}
          />
          <main className="max-w-2xl mx-auto px-4 py-6">
            <MedicationDictionary onBack={() => setShowDictionary(false)} onAddMedication={handleAddFromDictionary} />
          </main>
          <ElderBottomNav activeItem={activeNav} onNavigate={(item) => { setShowDictionary(false); setActiveNav(item); }} />
        </div>
      );
    }
    return (
      <MedicationsList
        onNavigate={(item) => { setShowDictionary(false); setActiveNav(item); }}
        onScan={handleOpenScanner}
        userName={userName}
        onOpenDictionary={() => setShowDictionary(true)}
      />
    );
  }

  // Show stats/history page
  if (activeNav === 'stats') {
    return (
      <div className="min-h-screen bg-background pb-32">
        <ElderHeader 
          userName={userName} 
          notificationCount={0}
          onMenuClick={() => setShowNavigationDrawer(true)}
          onNotificationsClick={() => setActiveNav('profile')}
          onProfileClick={() => setShowDrRx(true)}
          onShopClick={() => setOpenShop(true)}
          coinBalance={rewards?.coins}
        />
        <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
          <h2 className="text-2xl font-bold text-foreground mb-4">{t('dashboard.medicationHistory')}</h2>
          <AdherenceReportPDF className="w-full" />
          <AdherenceHistory />
          <SymptomJournal />
        </main>
        <ElderBottomNav activeItem={activeNav} onNavigate={setActiveNav} />
        <NavigationDrawer
          open={showNavigationDrawer}
          onClose={() => setShowNavigationDrawer(false)}
          onNavigate={setActiveNav}
          activeItem={activeNav}
          isCaregiver={isCaregiver}
          onCaregiverDashboard={() => navigate('/caregiver')}
          onDrBombayClick={() => setShowDrRx(true)}
        />
      </div>
    );
  }

  // Show safety guide
  if (activeNav === 'safety') {
    return (
      <div className="min-h-screen bg-background pb-32">
        <ElderHeader 
          userName={userName} 
          notificationCount={0}
          onMenuClick={() => setShowNavigationDrawer(true)}
          onNotificationsClick={() => setActiveNav('profile')}
          onProfileClick={() => setShowDrRx(true)}
          onShopClick={() => setOpenShop(true)}
          coinBalance={rewards?.coins}
        />
        <main className="max-w-2xl mx-auto px-4 py-6">
          <h2 className="text-2xl font-bold text-foreground mb-4">{t('dashboard.fentanylSafetyGuide')}</h2>
          <p className="text-muted-foreground mb-4 text-sm">
            {t('dashboard.fentanylSafetyDesc')}
          </p>
          <FentanylSafetyGuide />
        </main>
        <ElderBottomNav activeItem={activeNav} onNavigate={setActiveNav} />
        <NavigationDrawer
          open={showNavigationDrawer}
          onClose={() => setShowNavigationDrawer(false)}
          onNavigate={setActiveNav}
          activeItem={activeNav}
          isCaregiver={isCaregiver}
          onCaregiverDashboard={() => navigate('/caregiver')}
          onDrBombayClick={() => setShowDrRx(true)}
        />
      </div>
    );
  }

  const hasMedications = medications.length > 0;
  const hasDoses = doses.length > 0;

  return (
    <>
    <MissedDoseFlash
      isActive={missedDoseAlert.active}
      medicationName={missedDoseAlert.medicationName}
      onDismiss={dismissFlash}
    />
    <PersistentAlarm
      isActive={persistentAlarmDose.active}
      medicationName={persistentAlarmDose.medicationName}
      doseTime={persistentAlarmDose.doseTime}
      onTakeNow={async () => {
        if (persistentAlarmDose.doseId) {
          const dose = doses.find(d => d.id === persistentAlarmDose.doseId);
          if (dose) await handleTake(dose);
        }
        setPersistentAlarmDose({ active: false });
      }}
      onSnooze={async () => {
        if (persistentAlarmDose.doseId) {
          const dose = doses.find(d => d.id === persistentAlarmDose.doseId);
          if (dose) await handleSnooze(dose);
        }
        setPersistentAlarmDose({ active: false });
      }}
      onSkip={async () => {
        if (persistentAlarmDose.doseId) {
          const dose = doses.find(d => d.id === persistentAlarmDose.doseId);
          if (dose) await handleSkip(dose);
        }
        setPersistentAlarmDose({ active: false });
      }}
    />
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
        onNotificationsClick={() => setActiveNav('profile')}
        onProfileClick={() => setShowDrRx(true)}
        onShopClick={() => setOpenShop(true)}
        coinBalance={rewards?.coins}
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
          openToShop={openShop}
          onOpenToShopHandled={() => setOpenShop(false)}
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
          onCallPharmacy={async () => {
            try {
              const { data: { user } } = await supabase.auth.getUser();
              if (user) {
                const { data: pharmacies } = await supabase
                  .from('pharmacies')
                  .select('phone, name')
                  .eq('user_id', user.id)
                  .eq('is_primary', true)
                  .limit(1);
                const pharmacy = pharmacies?.[0];
                if (pharmacy?.phone) {
                  window.location.href = `tel:${pharmacy.phone}`;
                } else {
                  toast.info('No pharmacy phone number saved. Add one in your medication details.');
                }
              }
            } catch {
              toast.info('No pharmacy phone number saved. Add one in your medication details.');
            }
          }}
        />

        {/* Drug Interaction Warnings */}
        {medications.length >= 2 && (
          <DrugInteractionWarnings
            medications={medications.map(m => ({
              name: m.name,
              genericName: m.genericName,
            }))}
          />
        )}

        {!hasMedications && (
          <div className="bg-card rounded-3xl p-8 shadow-elder-lg border-2 border-border text-center">
            <div className="w-24 h-24 bg-accent/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <img src="/favicon.png" alt="Med Guard Rx" className="w-16 h-16" />
            </div>
            <h2 className="text-elder-xl text-foreground mb-4">{t('dashboard.noMedicationsYet')}</h2>
            <p className="text-elder text-muted-foreground mb-6">
              {t('dashboard.noMedicationsDesc')}
            </p>
            <Button 
              variant="accent" 
              size="xl" 
              className="w-full"
              onClick={handleOpenScanner}
            >
              {t('dashboard.scanPrescription')}
            </Button>
          </div>
        )}

        {/* 24-Hour Clock */}
        {hasDoses && (
          <div className="bg-card rounded-3xl p-6 shadow-elder-lg border-2 border-border">
            <h2 className="text-elder-xl text-foreground mb-6 text-center">{t('dashboard.todaySchedule')}</h2>
            <InteractiveDoseClock doses={clockDoses} size="md" />
          </div>
        )}

        {/* Timeline by Time of Day */}
        {hasDoses && (
          <div>
            <h2 className="text-elder-2xl text-foreground mb-6">{t('common.medications')}</h2>
            
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
                      <h3 className="text-elder-xl text-foreground">{t('medications.whatItsFor')}</h3>
                    </div>
                    <p className="text-elder text-foreground">{selectedMedication.purpose}</p>
                  </section>
                )}

                {/* How it works */}
                {selectedMedication.howItWorks && (
                  <section className="bg-card rounded-2xl p-6 border-2 border-border shadow-elder">
                    <div className="flex items-center gap-3 mb-3">
                      <Info className="w-8 h-8 text-info" />
                      <h3 className="text-elder-xl text-foreground">{t('medications.howItWorks')}</h3>
                    </div>
                    <p className="text-elder text-muted-foreground">
                      {selectedMedication.howItWorks}
                    </p>
                    <Button variant="link" className="mt-2 p-0 h-auto text-info text-lg">
                      <BookOpen className="w-5 h-5 mr-2" />
                      {t('medications.learnMore')}
                    </Button>
                  </section>
                )}

                {/* Instructions */}
                {selectedMedication.instructions && (
                  <section className="bg-secondary rounded-2xl p-6 border-2 border-border">
                    <div className="flex items-center gap-3 mb-3">
                      <Clock className="w-8 h-8 text-secondary-foreground" />
                      <h3 className="text-elder-xl text-foreground">{t('medications.howToTake')}</h3>
                    </div>
                    <p className="text-elder text-foreground">{selectedMedication.instructions}</p>
                  </section>
                )}

                {/* Warnings */}
                {selectedMedication.importantWarnings && selectedMedication.importantWarnings.length > 0 && (
                  <section className="bg-destructive/10 rounded-2xl p-6 border-3 border-destructive/40">
                    <div className="flex items-center gap-3 mb-3">
                      <AlertTriangle className="w-8 h-8 text-destructive" />
                      <h3 className="text-elder-xl text-destructive">{t('medications.warnings')}</h3>
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
                      <h3 className="text-elder-xl text-foreground">{t('medications.possibleSideEffects')}</h3>
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
                        <p className="text-lg font-semibold">{t('medications.nextRefill')}</p>
                        <p className="text-muted-foreground">{selectedMedication.refillDate}</p>
                      </div>
                    </div>
                  </section>
                )}

                {/* Actions */}
                <div className="space-y-4 pt-4">
                  <Button variant="outline" size="xl" className="w-full justify-start gap-4">
                    <PlayCircle className="w-8 h-8" />
                    {t('medications.watchVideos')}
                  </Button>
                  
                  <Button variant="accent" size="xl" className="w-full justify-start gap-4">
                    <Phone className="w-8 h-8" />
                    {t('medications.callPharmacist')}
                  </Button>
                </div>

                {/* Prescriber */}
                {selectedMedication.prescriber && (
                  <section className="bg-muted/50 rounded-2xl p-5 border-2 border-border">
                    <p className="text-muted-foreground">
                      <span className="font-semibold">{t('medications.prescribedBy')}</span> {selectedMedication.prescriber}
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
        onClose={() => { setShowAddMedication(false); setPrefillMedData(undefined); }}
        onSave={handleAddMedicationManually}
        initialData={prefillMedData}
      />

      {/* Navigation Drawer */}
      <NavigationDrawer
        open={showNavigationDrawer}
        onClose={() => setShowNavigationDrawer(false)}
        onNavigate={setActiveNav}
        activeItem={activeNav}
        isCaregiver={isCaregiver}
        onCaregiverDashboard={() => navigate('/caregiver')}
        onDrBombayClick={() => setShowDrRx(true)}
      />

    </div>
    </>
  );
}
