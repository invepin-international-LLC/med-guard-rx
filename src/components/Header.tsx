import { UserProfile } from '@/types/medication';
import { Bell, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEquippedAvatar } from '@/contexts/EquippedAvatarContext';
import { useTranslation } from 'react-i18next';

interface HeaderProps {
  user: UserProfile;
  onMenuClick?: () => void;
  onProfileClick?: () => void;
}

export function Header({ user, onMenuClick, onProfileClick }: HeaderProps) {
  const { t } = useTranslation();
  const greeting = getGreeting(t);
  const firstName = user.name.split(' ')[0];
  const { equippedAvatar } = useEquippedAvatar();

  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-4">
      <div className="flex items-center justify-between max-w-2xl mx-auto">
        <div className="flex items-center gap-2 min-w-0">
          <Button variant="ghost" size="icon" onClick={onMenuClick} className="lg:hidden shrink-0">
            <Menu className="w-6 h-6" />
          </Button>
          <img 
            src="/favicon.png" 
            alt="Med Guard Rx" 
            className="w-10 h-10 rounded-lg shrink-0"
          />
          <div className="min-w-0">
            <p className="text-muted-foreground text-sm leading-tight truncate">{greeting}, {firstName} 👋</p>
            <h1 className="text-base font-semibold text-primary leading-tight">Med Guard Rx</h1>
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
            className="rounded-full bg-primary/10 text-2xl"
            title={equippedAvatar.name}
          >
            {equippedAvatar.icon}
          </Button>
        </div>
      </div>
    </header>
  );
}

function getGreeting(t: (key: string) => string): string {
  const hour = new Date().getHours();
  if (hour < 12) return t('dashboard.goodMorning');
  if (hour < 17) return t('dashboard.goodAfternoon');
  return t('dashboard.goodEvening');
}