import { UserProfile } from '@/types/medication';
import { Bell, Menu, User } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface HeaderProps {
  user: UserProfile;
  onMenuClick?: () => void;
  onProfileClick?: () => void;
}

export function Header({ user, onMenuClick, onProfileClick }: HeaderProps) {
  const greeting = getGreeting();
  const firstName = user.name.split(' ')[0];

  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-4">
      <div className="flex items-center justify-between max-w-2xl mx-auto">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onMenuClick} className="lg:hidden">
            <Menu className="w-6 h-6" />
          </Button>
          <div>
            <p className="text-muted-foreground text-sm">{greeting}</p>
            <h1 className="text-elder-lg text-foreground">{firstName} 👋</h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="w-6 h-6" />
            <span className="absolute top-1 right-1 w-3 h-3 bg-accent rounded-full" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onProfileClick}
            className="rounded-full bg-primary/10"
          >
            <User className="w-6 h-6 text-primary" />
          </Button>
        </div>
      </div>
    </header>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}
