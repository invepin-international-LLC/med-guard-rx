import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Session, User } from '@supabase/supabase-js';
import { AuthForm } from '@/components/auth/AuthForm';
import { PinEntry } from '@/components/auth/PinEntry';
import { OnboardingFlow } from '@/components/onboarding/OnboardingFlow';
import { TodayDashboard } from '@/components/TodayDashboard';

type AuthState = 'loading' | 'unauthenticated' | 'onboarding' | 'pin' | 'authenticated';

const ONBOARDING_COMPLETE_KEY = 'medguard_onboarding_complete';

export default function Index() {
  const [authState, setAuthState] = useState<AuthState>('loading');
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isNewUser, setIsNewUser] = useState(false);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session) {
          // Check if this is a new signup
          if (event === 'SIGNED_IN') {
            // Check if onboarding was already completed
            const onboardingComplete = localStorage.getItem(ONBOARDING_COMPLETE_KEY);
            if (!onboardingComplete) {
              setIsNewUser(true);
              setAuthState('onboarding');
            } else {
              setAuthState('pin');
            }
          } else {
            // For other events (like initial load), go to PIN
            const onboardingComplete = localStorage.getItem(ONBOARDING_COMPLETE_KEY);
            if (!onboardingComplete) {
              setAuthState('onboarding');
            } else {
              setAuthState('pin');
            }
          }
        } else {
          setAuthState('unauthenticated');
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session) {
        const onboardingComplete = localStorage.getItem(ONBOARDING_COMPLETE_KEY);
        if (!onboardingComplete) {
          setAuthState('onboarding');
        } else {
          setAuthState('pin');
        }
      } else {
        setAuthState('unauthenticated');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleAuthSuccess = () => {
    // After auth success, check if onboarding is needed
    const onboardingComplete = localStorage.getItem(ONBOARDING_COMPLETE_KEY);
    if (!onboardingComplete) {
      setIsNewUser(true);
      setAuthState('onboarding');
    } else {
      setAuthState('pin');
    }
  };

  const handleOnboardingComplete = () => {
    // Mark onboarding as complete
    localStorage.setItem(ONBOARDING_COMPLETE_KEY, 'true');
    setAuthState('pin');
  };

  const handlePinSuccess = () => {
    setAuthState('authenticated');
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setAuthState('unauthenticated');
  };

  // Loading state
  if (authState === 'loading') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-24 h-24 bg-accent rounded-full flex items-center justify-center mx-auto mb-6 shadow-accent animate-gentle-pulse">
            <img src="/favicon.png" alt="Med Guard Rx" className="w-16 h-16" />
          </div>
          <h1 className="text-elder-2xl text-foreground">Med Guard Rx</h1>
          <p className="text-muted-foreground mt-2">Loading...</p>
        </div>
      </div>
    );
  }

  // Not authenticated - show login/signup
  if (authState === 'unauthenticated') {
    return <AuthForm onSuccess={handleAuthSuccess} />;
  }

  // Show onboarding for new users
  if (authState === 'onboarding') {
    return (
      <OnboardingFlow 
        onComplete={handleOnboardingComplete}
        userName={user?.user_metadata?.name || 'there'}
      />
    );
  }

  // Authenticated but needs PIN
  if (authState === 'pin') {
    return (
      <PinEntry 
        onSuccess={handlePinSuccess}
        userName={user?.user_metadata?.name || 'User'}
        correctPin="1234"
        biometricAvailable={true}
      />
    );
  }

  // Fully authenticated - show dashboard
  return <TodayDashboard />;
}
