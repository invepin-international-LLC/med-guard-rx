import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Pill, Bell, Users, Brain, Trophy, ChevronRight, ChevronLeft, ArrowRight, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence, useScroll, useSpring } from 'framer-motion';
import demoDashboard from '@/assets/demo-dashboard.png';
import demoDrRx from '@/assets/demo-dr-rx.png';
import demoRewards from '@/assets/demo-rewards.png';

const APP_SCREENS = [
  { image: demoDashboard, label: 'Track Your Meds', description: 'Organized by time of day with one-tap dose logging', route: '/app' },
  { image: demoDrRx, label: 'Ask Dr. Bombay', description: 'AI pharmacist answers your medication questions instantly', route: '/app?tab=dr-rx' },
  { image: demoRewards, label: 'Earn Rewards', description: 'Spin the Lucky Dose slot machine and collect badges', route: '/app?tab=rewards' },
];

const FEATURES = [
  {
    icon: Pill,
    title: 'Smart Medication Tracking',
    description: 'Never miss a dose. Organize all your medications with scheduled reminders and dose logging.',
    scrollTo: 'showcase',
  },
  {
    icon: Bell,
    title: 'Intelligent Reminders',
    description: 'Time-of-day reminders, snooze options, and missed-dose alerts keep you on track.',
    scrollTo: 'showcase',
  },
  {
    icon: Brain,
    title: 'Dr. Bombay AI Assistant',
    description: 'Ask our AI-powered pharmacist about side effects, interactions, and medication questions.',
    scrollTo: 'showcase',
  },
  {
    icon: Users,
    title: 'Caregiver Support',
    description: 'Invite family members to monitor adherence and receive alerts when doses are missed.',
    scrollTo: 'cta',
  },
  {
    icon: Trophy,
    title: 'Rewards & Gamification',
    description: 'Earn coins, spin the Lucky Dose slot machine, unlock avatars, themes, and badges.',
    scrollTo: 'showcase',
  },
  {
    icon: Shield,
    title: 'HIPAA-Ready Health Vault',
    description: 'Store medical records, allergies, emergency contacts, and insurance info securely.',
    scrollTo: 'cta',
  },
];

const TUTORIAL_SLIDES = [
  {
    emoji: '💊',
    title: 'Add Your Medications',
    description: 'Tap the + button or scan a prescription label to add your meds. We\'ll auto-fill dosage, form, and schedule info.',
    tip: 'Use the Medication Dictionary to look up any drug and add it in one tap!',
  },
  {
    emoji: '⏰',
    title: 'Set Your Schedule',
    description: 'Assign each medication to morning, afternoon, evening, or bedtime. We\'ll remind you at the right time.',
    tip: 'Snooze a dose for 15 minutes if you\'re busy — we\'ll ping you again.',
  },
  {
    emoji: '✅',
    title: 'Log Every Dose',
    description: 'Tap "Take" when you\'ve taken your medication. Your adherence streak grows with every on-time dose.',
    tip: 'A perfect day earns you a free spin on the Lucky Dose slot machine!',
  },
  {
    emoji: '🤖',
    title: 'Ask Dr. Bombay Anything',
    description: 'Our AI pharmacist can answer questions about side effects, drug interactions, and safe storage.',
    tip: 'Try asking: "Can I take ibuprofen with my blood thinner?"',
  },
  {
    emoji: '👨‍👩‍👧',
    title: 'Invite a Caregiver',
    description: 'Family members can monitor your medication adherence and get alerted if you miss a dose.',
    tip: 'Go to Settings → Caregivers to send an invite link.',
  },
  {
    emoji: '🎰',
    title: 'Earn Rewards',
    description: 'Collect coins for every dose, streak, and challenge completed. Spend them in the Coin Shop on avatars and themes!',
    tip: 'Complete weekly challenges for bonus coins and spins.',
  },
];

export default function Landing() {
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [showTutorial, setShowTutorial] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 200, damping: 30 });

  useEffect(() => {
    const onScroll = () => setShowBackToTop(window.scrollY > 400);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const nextSlide = () => setCurrentSlide((p) => Math.min(p + 1, TUTORIAL_SLIDES.length - 1));
  const prevSlide = () => setCurrentSlide((p) => Math.max(p - 1, 0));

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Scroll Progress Bar */}
      <motion.div
        style={{ scaleX }}
        className="fixed top-0 left-0 right-0 h-1 bg-accent origin-left z-50"
      />
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-accent/10" />
        <div className="relative max-w-lg mx-auto px-6 pt-16 pb-12 text-center">
          <motion.div
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 3 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
            className="w-24 h-24 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg hover:rotate-0 transition-transform"
          >
            <img src="/favicon.png" alt="Med Guard Rx" className="w-16 h-16" />
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="text-4xl font-extrabold tracking-tight mb-3"
          >
            Med Guard <span className="text-accent">Rx</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.45 }}
            className="text-lg text-muted-foreground leading-relaxed mb-8"
          >
            Your personal medication guardian. Track doses, get AI-powered drug info, earn rewards, and keep your family in the loop — all in one app.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="flex flex-col sm:flex-row gap-3 justify-center"
          >
            <Button
              size="lg"
              className="bg-accent text-accent-foreground hover:bg-accent/90 text-lg px-8 font-bold shadow-md"
              onClick={() => navigate('/app')}
            >
              Get Started <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="text-lg px-8 border-primary/30"
              onClick={() => setShowTutorial(true)}
            >
              How It Works
            </Button>
          </motion.div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.8 }}
            className="flex gap-6 justify-center mt-6 text-sm text-muted-foreground"
          >
            <button
              onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              className="hover:text-accent transition-colors underline underline-offset-4 decoration-accent/40"
            >
              Explore Features ↓
            </button>
            <button
              onClick={() => document.getElementById('showcase')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              className="hover:text-accent transition-colors underline underline-offset-4 decoration-accent/40"
            >
              See It in Action ↓
            </button>
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="max-w-lg mx-auto px-6 py-12">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.5 }}
          className="text-2xl font-bold text-center mb-8"
        >
          Everything You Need
        </motion.h2>
        <div className="grid grid-cols-1 gap-4">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, x: i % 2 === 0 ? -30 : 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-30px' }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              whileHover={{ scale: 1.02, y: -2 }}
              onClick={() => document.getElementById(f.scrollTo)?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
              className="flex items-start gap-4 p-4 rounded-xl bg-card border border-border/50 shadow-sm cursor-pointer"
            >
              <div className="w-12 h-12 rounded-xl bg-accent/15 flex items-center justify-center shrink-0">
                <f.icon className="h-6 w-6 text-accent" />
              </div>
              <div>
                <h3 className="font-bold text-foreground">{f.title}</h3>
                <p className="text-sm text-muted-foreground mt-0.5">{f.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* App Showcase */}
      <section id="showcase" className="max-w-2xl mx-auto px-6 py-16 overflow-hidden">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.5 }}
          className="text-2xl font-bold text-center mb-3"
        >
          See It in Action
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-30px' }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-muted-foreground text-center mb-10 text-sm"
        >
          A quick look at what Med Guard Rx can do for you
        </motion.p>
        <div className="grid grid-cols-3 gap-4 md:gap-6">
          {APP_SCREENS.map((screen, i) => (
            <motion.div
              key={screen.label}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-30px' }}
              transition={{ duration: 0.5, delay: i * 0.15 }}
              whileHover={{ y: -8, scale: 1.03 }}
              className="flex flex-col items-center cursor-pointer group"
              onClick={() => navigate(screen.route)}
            >
              <div className="rounded-2xl overflow-hidden shadow-lg border border-border/50 bg-card mb-3 group-hover:ring-2 group-hover:ring-accent transition-all relative">
                <img
                  src={screen.image}
                  alt={screen.label}
                  className="w-full h-auto object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-accent/0 group-hover:bg-accent/20 transition-all duration-300 flex items-center justify-center">
                  <span className="text-sm font-bold text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-accent/80 px-3 py-1.5 rounded-full backdrop-blur-sm shadow-md">
                    Try it →
                  </span>
                </div>
              </div>
              <h3 className="font-bold text-sm text-foreground group-hover:text-accent transition-colors">{screen.label}</h3>
              <p className="text-xs text-muted-foreground text-center mt-0.5 leading-snug">{screen.description}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Trust / CTA */}
      <section id="cta" className="max-w-lg mx-auto px-6 py-12 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.5, type: 'spring', stiffness: 150 }}
          className="bg-primary rounded-2xl p-8 text-primary-foreground shadow-xl"
        >
          <motion.div
            initial={{ scale: 0 }}
            whileInView={{ scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          >
            <Shield className="h-10 w-10 mx-auto mb-4 opacity-80" />
          </motion.div>
          <h2 className="text-2xl font-bold mb-2">Your Health, Protected</h2>
          <p className="text-primary-foreground/80 mb-6 text-sm">
            Built with elder-friendly design, HIPAA-grade security, and accessibility at its core. Your data never leaves your control.
          </p>
          <Button
            size="lg"
            className="bg-accent text-accent-foreground hover:bg-accent/90 font-bold px-8"
            onClick={() => navigate('/app')}
          >
            Create Free Account
          </Button>
        </motion.div>
      </section>

      <motion.footer
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="text-center py-8 space-y-3"
      >
        <div className="flex items-center justify-center gap-4 text-xs">
          <button onClick={() => navigate('/privacy')} className="text-muted-foreground hover:text-foreground underline transition-colors">
            Privacy Policy
          </button>
          <span className="text-muted-foreground">·</span>
          <button onClick={() => navigate('/terms')} className="text-muted-foreground hover:text-foreground underline transition-colors">
            Terms of Service
          </button>
        </div>
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} Med Guard Rx. All rights reserved.
        </p>
      </motion.footer>

      {/* Tutorial Overlay */}
      <AnimatePresence>
        {showTutorial && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col"
          >
            <div className="flex items-center justify-between px-6 pt-6">
              <h2 className="text-xl font-bold">How to Use Med Guard Rx</h2>
              <Button variant="ghost" size="sm" onClick={() => { setShowTutorial(false); setCurrentSlide(0); }}>
                Close
              </Button>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center px-6 max-w-lg mx-auto w-full">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentSlide}
                  initial={{ opacity: 0, x: 40 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -40 }}
                  transition={{ duration: 0.25 }}
                  className="flex flex-col items-center w-full"
                >
                  <div className="text-7xl mb-6">{TUTORIAL_SLIDES[currentSlide].emoji}</div>
                  <div className="text-sm font-semibold text-accent mb-1">
                    Step {currentSlide + 1} of {TUTORIAL_SLIDES.length}
                  </div>
                  <h3 className="text-2xl font-bold mb-3 text-center">{TUTORIAL_SLIDES[currentSlide].title}</h3>
                  <p className="text-muted-foreground text-center mb-4 leading-relaxed">
                    {TUTORIAL_SLIDES[currentSlide].description}
                  </p>
                  <div className="bg-accent/10 border border-accent/20 rounded-xl p-4 w-full">
                    <p className="text-sm text-accent font-medium">
                      💡 Tip: {TUTORIAL_SLIDES[currentSlide].tip}
                    </p>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="px-6 pb-8 max-w-lg mx-auto w-full">
              <div className="flex justify-center gap-2 mb-6">
                {TUTORIAL_SLIDES.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentSlide(i)}
                    className={`h-2.5 rounded-full transition-all ${
                      i === currentSlide ? 'bg-accent w-8' : 'bg-border w-2.5'
                    }`}
                  />
                ))}
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={prevSlide}
                  disabled={currentSlide === 0}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" /> Back
                </Button>
                {currentSlide < TUTORIAL_SLIDES.length - 1 ? (
                  <Button className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90" onClick={nextSlide}>
                    Next <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                ) : (
                  <Button
                    className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90"
                    onClick={() => { setShowTutorial(false); navigate('/app'); }}
                  >
                    Get Started <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Back to Top */}
      <AnimatePresence>
        {showBackToTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.2 }}
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="fixed bottom-6 right-6 z-50 w-11 h-11 rounded-full bg-accent text-accent-foreground shadow-lg flex items-center justify-center hover:bg-accent/90 transition-colors"
            aria-label="Back to top"
          >
            <ChevronUp className="h-5 w-5" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
