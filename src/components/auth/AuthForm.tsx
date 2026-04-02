import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable/index';
import { toast } from 'sonner';
import { Mail, Lock, User, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { z } from 'zod';

const authSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters').optional(),
});

interface AuthFormProps {
  onSuccess: () => void;
}

export function AuthForm({ onSuccess }: AuthFormProps) {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleAppleSignIn = async () => {
    setAppleLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("apple", {
        redirect_uri: window.location.origin,
      });

      if (result.error) {
        toast.error('Apple Sign In failed. Please try again.');
        return;
      }

      if (result.redirected) {
        return; // Browser redirecting to Apple
      }

      // Session set — user is authenticated
      toast.success('Welcome!');
      onSuccess();
    } catch {
      toast.error('Apple Sign In failed. Please try again.');
    } finally {
      setAppleLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });

      if (result.error) {
        toast.error('Google Sign In failed. Please try again.');
        return;
      }

      if (result.redirected) {
        return;
      }

      toast.success('Welcome!');
      onSuccess();
    } catch {
      toast.error('Google Sign In failed. Please try again.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setLoading(true);

    try {
      // Validate form
      const validation = authSchema.safeParse({
        ...formData,
        name: isLogin ? undefined : formData.name,
      });

      if (!validation.success) {
        const fieldErrors: Record<string, string> = {};
        validation.error.errors.forEach((err) => {
          if (err.path[0]) {
            fieldErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(fieldErrors);
        setLoading(false);
        return;
      }

      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });

        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            toast.error('Invalid email or password');
          } else {
            toast.error(error.message);
          }
          setLoading(false);
          return;
        }

        toast.success('Welcome back!');
        onSuccess();
      } else {
        const { error } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: {
              name: formData.name,
            },
          },
        });

        if (error) {
          if (error.message.includes('already registered')) {
            toast.error('This email is already registered. Try logging in.');
          } else {
            toast.error(error.message);
          }
          setLoading(false);
          return;
        }

        toast.success('Account created successfully!');
        onSuccess();
      }
    } catch (error) {
      toast.error('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      {/* Logo */}
      <div className="text-center mb-10">
        <div className="w-24 h-24 bg-accent rounded-full flex items-center justify-center mx-auto mb-6 shadow-accent">
          <img src="/favicon.png" alt="Med Guard Rx" className="w-16 h-16" />
        </div>
        <h1 className="text-elder-2xl text-foreground mb-2">Med Guard Rx</h1>
        <p className="text-elder text-muted-foreground">
          {isLogin ? 'Sign in to continue' : 'Create your account'}
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="w-full max-w-md space-y-6">
        {!isLogin && (
          <div className="space-y-2">
            <Label htmlFor="name" className="text-elder font-semibold">
              Your Name
            </Label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-muted-foreground" />
              <Input
                id="name"
                type="text"
                placeholder="Enter your name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="h-16 pl-14 text-xl rounded-xl border-2"
              />
            </div>
            {errors.name && (
              <p className="text-destructive text-lg">{errors.name}</p>
            )}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="email" className="text-elder font-semibold">
            Email Address
          </Label>
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              placeholder="your@email.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="h-16 pl-14 text-xl rounded-xl border-2"
            />
          </div>
          {errors.email && (
            <p className="text-destructive text-lg">{errors.email}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password" className="text-elder font-semibold">
            Password
          </Label>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-muted-foreground" />
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="h-16 pl-14 pr-14 text-xl rounded-xl border-2"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPassword ? <EyeOff className="w-6 h-6" /> : <Eye className="w-6 h-6" />}
            </button>
          </div>
          {errors.password && (
            <p className="text-destructive text-lg">{errors.password}</p>
          )}
        </div>

        <Button
          type="submit"
          variant="accent"
          size="xl"
          className="w-full"
          disabled={loading}
        >
          {loading ? (
            'Please wait...'
          ) : (
            <>
              {isLogin ? 'Sign In' : 'Create Account'}
              <ArrowRight className="w-6 h-6" />
            </>
          )}
        </Button>

        {/* Divider */}
        <div className="relative flex items-center justify-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <span className="relative bg-background px-4 text-muted-foreground text-lg">or</span>
        </div>

        {/* Apple Sign In */}
        <Button
          type="button"
          variant="outline"
          size="xl"
          className="w-full gap-3 border-2"
          onClick={handleAppleSignIn}
          disabled={appleLoading}
        >
          {appleLoading ? (
            'Connecting...'
          ) : (
            <>
              <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current" aria-hidden="true">
                <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
              </svg>
              Continue with Apple
            </>
          )}
        </Button>

        {/* Google Sign In */}
        <Button
          type="button"
          variant="outline"
          size="xl"
          className="w-full gap-3 border-2"
          onClick={handleGoogleSignIn}
          disabled={googleLoading}
        >
          {googleLoading ? (
            'Connecting...'
          ) : (
            <>
              <svg viewBox="0 0 24 24" className="w-6 h-6" aria-hidden="true">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </>
          )}
        </Button>
      </form>

      {/* Toggle */}
      <div className="mt-8 text-center">
        <p className="text-muted-foreground text-lg mb-2">
          {isLogin ? "Don't have an account?" : 'Already have an account?'}
        </p>
        <Button
          variant="link"
          type="button"
          onClick={() => setIsLogin(!isLogin)}
          className="text-xl font-semibold"
        >
          {isLogin ? 'Create Account' : 'Sign In'}
        </Button>
      </div>

      {/* Legal links - required by App Store Guideline 5.1.1 */}
      <div className="mt-6 flex items-center justify-center gap-3 text-sm text-muted-foreground">
        <button onClick={() => navigate('/privacy')} className="underline hover:text-foreground transition-colors">
          Privacy Policy
        </button>
        <span>·</span>
        <button onClick={() => navigate('/terms')} className="underline hover:text-foreground transition-colors">
          Terms of Service
        </button>
      </div>
    </div>
  );
}
