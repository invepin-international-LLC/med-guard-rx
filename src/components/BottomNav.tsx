import { Home, Pill, Camera, User, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

type NavItem = 'today' | 'medications' | 'scan' | 'calendar' | 'profile';

interface BottomNavProps {
  activeItem: NavItem;
  onNavigate: (item: NavItem) => void;
}

const navItems: { id: NavItem; icon: typeof Home; label: string }[] = [
  { id: 'today', icon: Home, label: 'Today' },
  { id: 'medications', icon: Pill, label: 'Meds' },
  { id: 'scan', icon: Camera, label: 'Scan' },
  { id: 'calendar', icon: Calendar, label: 'Calendar' },
  { id: 'profile', icon: User, label: 'Profile' },
];

export function BottomNav({ activeItem, onNavigate }: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border px-4 py-2 pb-safe z-50">
      <div className="flex items-center justify-around max-w-2xl mx-auto">
        {navItems.map(({ id, icon: Icon, label }) => {
          const isActive = activeItem === id;
          const isScan = id === 'scan';

          return (
            <button
              key={id}
              onClick={() => onNavigate(id)}
              className={cn(
                "flex flex-col items-center gap-1 py-2 px-4 rounded-xl transition-all",
                isScan && "relative -mt-6",
                isActive && !isScan && "text-primary",
                !isActive && !isScan && "text-muted-foreground hover:text-foreground"
              )}
            >
              {isScan ? (
                <div className={cn(
                  "w-16 h-16 rounded-full flex items-center justify-center shadow-soft-lg transition-all",
                  isActive ? "bg-primary" : "bg-accent"
                )}>
                  <Icon className={cn(
                    "w-8 h-8",
                    isActive ? "text-primary-foreground" : "text-accent-foreground"
                  )} />
                </div>
              ) : (
                <>
                  <Icon className={cn(
                    "w-6 h-6 transition-all",
                    isActive && "scale-110"
                  )} />
                  <span className={cn(
                    "text-xs font-medium",
                    isActive && "font-semibold"
                  )}>
                    {label}
                  </span>
                </>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
