import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronRight, ChevronLeft, Check, Bell, Shield, Clock, Users, Pill, Camera } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OnboardingStep {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
}

const onboardingSteps: OnboardingStep[] = [
  {
    id: 'welcome',
    icon: <Pill className="w-16 h-16" />,
    title: 'Welcome to Med Guard Rx',
    description: 'Your personal medication companion designed to help you stay on track with your health.',
    color: 'bg-primary text-primary-foreground',
  },
  {
    id: 'reminders',
    icon: <Bell className="w-16 h-16" />,
    title: 'Never Miss a Dose',
    description: 'Get timely reminders for each medication. Easy-to-use buttons to mark doses as taken, skipped, or snoozed.',
    color: 'bg-accent text-accent-foreground',
  },
  {
    id: 'schedule',
    icon: <Clock className="w-16 h-16" />,
    title: 'Visual Dose Clock',
    description: 'See all your medications organized by time of day — morning, afternoon, evening, and bedtime.',
    color: 'bg-info text-info-foreground',
  },
  {
    id: 'scanner',
    icon: <Camera className="w-16 h-16" />,
    title: 'Scan Prescriptions',
    description: 'Add new medications by scanning prescription labels or pill bottles. Fast and accurate.',
    color: 'bg-success text-success-foreground',
  },
  {
    id: 'caregivers',
    icon: <Users className="w-16 h-16" />,
    title: 'Connect Caregivers',
    description: 'Add family members or caregivers who will be notified if you miss a dose.',
    color: 'bg-warning text-warning-foreground',
  },
  {
    id: 'security',
    icon: <Shield className="w-16 h-16" />,
    title: 'Your Data is Secure',
    description: 'Protected with PIN and biometric authentication. Your health information stays private.',
    color: 'bg-primary text-primary-foreground',
  },
];

interface OnboardingFlowProps {
  onComplete: () => void;
  userName?: string;
}

export function OnboardingFlow({ onComplete, userName = 'there' }: OnboardingFlowProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState<'next' | 'prev'>('next');

  const step = onboardingSteps[currentStep];
  const isLastStep = currentStep === onboardingSteps.length - 1;
  const isFirstStep = currentStep === 0;

  const handleNext = useCallback(() => {
    if (isLastStep) {
      onComplete();
    } else {
      setDirection('next');
      setCurrentStep((prev) => prev + 1);
    }
  }, [isLastStep, onComplete]);

  const handlePrev = useCallback(() => {
    if (!isFirstStep) {
      setDirection('prev');
      setCurrentStep((prev) => prev - 1);
    }
  }, [isFirstStep]);

  const handleSkip = useCallback(() => {
    onComplete();
  }, [onComplete]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Skip button */}
      <div className="flex justify-end p-4 pt-safe">
        <Button
          variant="ghost"
          onClick={handleSkip}
          className="text-muted-foreground text-lg"
        >
          Skip
        </Button>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-8">
        {/* Icon container */}
        <div
          key={step.id}
          className={cn(
            'w-32 h-32 rounded-full flex items-center justify-center mb-8 shadow-elder-lg transition-all duration-300',
            step.color,
            direction === 'next' ? 'animate-slide-up' : 'animate-fade-in'
          )}
        >
          {step.icon}
        </div>

        {/* Title */}
        <h1
          key={`title-${step.id}`}
          className={cn(
            'text-elder-2xl text-foreground text-center mb-4 transition-all duration-300',
            direction === 'next' ? 'animate-slide-up' : 'animate-fade-in'
          )}
          style={{ animationDelay: '50ms' }}
        >
          {currentStep === 0 ? `Hi ${userName}!` : step.title}
        </h1>

        {/* Description */}
        <p
          key={`desc-${step.id}`}
          className={cn(
            'text-elder text-muted-foreground text-center max-w-sm transition-all duration-300',
            direction === 'next' ? 'animate-slide-up' : 'animate-fade-in'
          )}
          style={{ animationDelay: '100ms' }}
        >
          {currentStep === 0 ? step.description : step.description}
        </p>
      </div>

      {/* Progress dots */}
      <div className="flex justify-center gap-3 mb-6">
        {onboardingSteps.map((_, index) => (
          <button
            key={index}
            onClick={() => {
              setDirection(index > currentStep ? 'next' : 'prev');
              setCurrentStep(index);
            }}
            className={cn(
              'w-3 h-3 rounded-full transition-all duration-300',
              index === currentStep
                ? 'bg-accent w-8'
                : index < currentStep
                ? 'bg-primary'
                : 'bg-muted-foreground/30'
            )}
            aria-label={`Go to step ${index + 1}`}
          />
        ))}
      </div>

      {/* Navigation buttons */}
      <div className="flex gap-4 px-6 pb-safe mb-4">
        {!isFirstStep && (
          <Button
            variant="outline"
            size="xl"
            onClick={handlePrev}
            className="flex-1 text-elder-lg"
          >
            <ChevronLeft className="w-6 h-6 mr-2" />
            Back
          </Button>
        )}
        <Button
          variant="accent"
          size="xl"
          onClick={handleNext}
          className={cn(
            'text-elder-lg',
            isFirstStep ? 'w-full' : 'flex-1'
          )}
        >
          {isLastStep ? (
            <>
              Get Started
              <Check className="w-6 h-6 ml-2" />
            </>
          ) : (
            <>
              Next
              <ChevronRight className="w-6 h-6 ml-2" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
