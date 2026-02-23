import { Bell, Menu, ShoppingBag, Coins } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEquippedAvatar } from '@/contexts/EquippedAvatarContext';

interface ElderHeaderProps {
  userName: string;
  onMenuClick?: () => void;
  onNotificationsClick?: () => void;
  onProfileClick?: () => void;
  onShopClick?: () => void;
  coinBalance?: number;
  notificationCount?: number;
}

export function ElderHeader({ 
  userName, 
  onMenuClick, 
  onNotificationsClick, 
  onProfileClick,
  onShopClick,
  coinBalance,
  notificationCount = 0
}: ElderHeaderProps) {
  const greeting = getGreeting();
  const firstName = userName.split(' ')[0];
  const { equippedAvatar } = useEquippedAvatar();

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
          <div className="flex items-center gap-4">
            <img 
              src="/favicon.png" 
              alt="Med Guard Rx" 
              className="w-14 h-14 rounded-xl shadow-md"
            />
            <div>
              <p className="text-muted-foreground text-lg">{greeting}, {firstName} 👋</p>
              <h1 className="text-elder-lg font-bold text-primary">Med Guard Rx</h1>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={onShopClick}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-accent/10 hover:bg-accent/20 transition-colors"
            title="Coin Shop"
          >
            <Coins className="w-5 h-5 text-accent" />
            <span className="text-sm font-bold text-accent">{coinBalance ?? 0}</span>
          </button>
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
            className="w-14 h-14 rounded-xl bg-primary/10 text-3xl"
            title={equippedAvatar.name}
          >
            {equippedAvatar.icon}
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
