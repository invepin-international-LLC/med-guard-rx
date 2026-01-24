import { Home, Pill, Camera, BarChart3, User, Phone } from 'lucide-react';
import { cn } from '@/lib/utils';

type NavItem = 'today' | 'medications' | 'scan' | 'stats' | 'profile';

interface ElderBottomNavProps {
  activeItem: NavItem;
  onNavigate: (item: NavItem) => void;
}

const navItems: { id: NavItem; icon: typeof Home; label: string }[] = [
  { id: 'today', icon: Home, label: 'Today' },
  { id: 'medications', icon: Pill, label: 'Meds' },
  { id: 'scan', icon: Camera, label: 'Scan' },
  { id: 'stats', icon: BarChart3, label: 'Stats' },
  { id: 'profile', icon: User, label: 'Profile' },
];

export function ElderBottomNav({ activeItem, onNavigate }: ElderBottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t-4 border-border px-2 py-3 pb-safe z-50 shadow-elder-lg">
      <div className="flex items-center justify-around max-w-2xl mx-auto">
        {navItems.map(({ id, icon: Icon, label }) => {
          const isActive = activeItem === id;
          const isScan = id === 'scan';

          return (
            <button
              key={id}
              onClick={() => onNavigate(id)}
              className={cn(
                "flex flex-col items-center gap-1 py-2 px-3 rounded-2xl transition-all haptic-tap min-w-[70px]",
                isScan && "relative -mt-8",
                isActive && !isScan && "bg-primary/10",
                !isActive && !isScan && "text-muted-foreground hover:text-foreground"
              )}
            >
              {isScan ? (
                <div className={cn(
                  "w-20 h-20 rounded-full flex items-center justify-center shadow-elder-lg transition-all border-4 border-background",
                  isActive ? "bg-primary" : "bg-accent"
                )}>
                  <Icon className={cn(
                    "w-10 h-10",
                    isActive ? "text-primary-foreground" : "text-accent-foreground"
                  )} />
                </div>
              ) : (
                <>
                  <Icon className={cn(
                    "w-8 h-8 transition-all",
                    isActive ? "text-primary scale-110" : ""
                  )} />
                  <span className={cn(
                    "text-sm font-bold",
                    isActive ? "text-primary" : ""
                  )}>
                    {label}
                  </span>
                </>
              )}
              {isScan && <span className="text-sm font-bold text-foreground mt-1">{label}</span>}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
