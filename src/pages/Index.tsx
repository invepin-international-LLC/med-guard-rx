import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Session, User } from '@supabase/supabase-js';
import { AuthForm } from '@/components/auth/AuthForm';
import { PinEntry } from '@/components/auth/PinEntry';
import { TodayDashboard } from '@/components/TodayDashboard';

type AuthState = 'loading' | 'unauthenticated' | 'pin' | 'authenticated';

export default function Index() {
  const [authState, setAuthState] = useState<AuthState>('loading');
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session) {
          // User is authenticated, show PIN entry
          setAuthState('pin');
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
        setAuthState('pin');
      } else {
        setAuthState('unauthenticated');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleAuthSuccess = () => {
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
            <span className="text-5xl">💊</span>
          </div>
          <h1 className="text-elder-2xl text-foreground">MedRemind</h1>
          <p className="text-muted-foreground mt-2">Loading...</p>
        </div>
      </div>
    );
  }

  // Not authenticated - show login/signup
  if (authState === 'unauthenticated') {
    return <AuthForm onSuccess={handleAuthSuccess} />;
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
