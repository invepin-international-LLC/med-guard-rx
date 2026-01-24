import { Bell, Menu, User, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ElderHeaderProps {
  userName: string;
  onMenuClick?: () => void;
  onNotificationsClick?: () => void;
  onProfileClick?: () => void;
  notificationCount?: number;
}

export function ElderHeader({ 
  userName, 
  onMenuClick, 
  onNotificationsClick, 
  onProfileClick,
  notificationCount = 0
}: ElderHeaderProps) {
  const greeting = getGreeting();
  const firstName = userName.split(' ')[0];

  return (
    <header className="sticky top-0 z-50 bg-card/98 backdrop-blur-sm border-b-4 border-border px-4 py-4 shadow-elder">
      <div className="flex items-center justify-between max-w-2xl mx-auto">
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onMenuClick} 
            className="w-14 h-14 rounded-xl"
          >
            <Menu className="w-8 h-8" />
          </Button>
          <div>
            <p className="text-muted-foreground text-lg">{greeting}</p>
            <h1 className="text-elder-xl text-foreground">{firstName} 👋</h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onNotificationsClick}
            className="relative w-14 h-14 rounded-xl"
          >
            <Bell className="w-8 h-8" />
            {notificationCount > 0 && (
              <span className="absolute top-2 right-2 w-5 h-5 bg-accent rounded-full text-xs font-bold text-accent-foreground flex items-center justify-center">
                {notificationCount > 9 ? '9+' : notificationCount}
              </span>
            )}
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onProfileClick}
            className="w-14 h-14 rounded-xl bg-primary/10"
          >
            <User className="w-8 h-8 text-primary" />
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
