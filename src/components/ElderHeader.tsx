import { useState, useEffect, useRef } from 'react';
import { Bell, Menu, Coins } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEquippedAvatar } from '@/contexts/EquippedAvatarContext';
import { cn } from '@/lib/utils';

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
  
  const targetBalance = coinBalance ?? 0;
  const [displayBalance, setDisplayBalance] = useState(targetBalance);
  const [isBouncing, setIsBouncing] = useState(false);
  const prevBalance = useRef(targetBalance);

  useEffect(() => {
    if (targetBalance === prevBalance.current) return;
    const diff = targetBalance - prevBalance.current;
    const start = prevBalance.current;
    prevBalance.current = targetBalance;
    
    if (diff === 0) return;
    
    setIsBouncing(true);
    const steps = Math.min(Math.abs(diff), 20);
    const stepDuration = Math.max(30, 400 / steps);
    let step = 0;

    const interval = setInterval(() => {
      step++;
      const progress = step / steps;
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayBalance(Math.round(start + diff * eased));
      if (step >= steps) {
        clearInterval(interval);
        setDisplayBalance(targetBalance);
        setTimeout(() => setIsBouncing(false), 300);
      }
    }, stepDuration);

    return () => clearInterval(interval);
  }, [targetBalance]);

  return (
    <header className="sticky top-0 z-50 bg-card/98 backdrop-blur-sm border-b-2 sm:border-b-4 border-border px-2 sm:px-4 py-2 sm:py-4 shadow-elder">
      <div className="flex items-center justify-between max-w-2xl mx-auto gap-1">
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onMenuClick} 
            className="w-9 h-9 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl shrink-0"
          >
            <Menu className="w-5 h-5 sm:w-7 sm:h-7" />
          </Button>
          <img 
            src="/favicon.png" 
            alt="Med Guard Rx" 
            className="w-8 h-8 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl shadow-md shrink-0"
          />
          <div className="min-w-0">
            <p className="text-muted-foreground text-xs sm:text-sm leading-tight truncate">{greeting}, {firstName} 👋</p>
            <h1 className="text-sm sm:text-base font-bold text-primary leading-tight">Med Guard Rx</h1>
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          <button 
            onClick={onShopClick}
            className={cn(
              "flex items-center gap-1 px-2 py-1.5 sm:px-3 sm:py-2 rounded-lg sm:rounded-xl bg-accent/10 hover:bg-accent/20 transition-all",
              isBouncing && "scale-110"
            )}
            style={{ transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
            title="Coin Shop"
          >
            <Coins className={cn("w-4 h-4 sm:w-5 sm:h-5 text-accent transition-transform", isBouncing && "animate-spin")} style={isBouncing ? { animationDuration: '0.4s', animationIterationCount: '1' } : {}} />
            <span className="text-xs sm:text-sm font-bold text-accent tabular-nums">{displayBalance}</span>
          </button>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onNotificationsClick}
            className="relative w-9 h-9 sm:w-14 sm:h-14 rounded-lg sm:rounded-xl"
          >
            <Bell className="w-5 h-5 sm:w-8 sm:h-8" />
            {notificationCount > 0 && (
              <span className="absolute top-1 right-1 sm:top-2 sm:right-2 w-4 h-4 sm:w-5 sm:h-5 bg-accent rounded-full text-[10px] sm:text-xs font-bold text-accent-foreground flex items-center justify-center">
                {notificationCount > 9 ? '9+' : notificationCount}
              </span>
            )}
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onProfileClick}
            className="w-9 h-9 sm:w-14 sm:h-14 rounded-lg sm:rounded-xl bg-primary/10 text-xl sm:text-3xl overflow-hidden"
            title={equippedAvatar.name}
          >
            {equippedAvatar.imageUrl ? (
              <img src={equippedAvatar.imageUrl} alt={equippedAvatar.name} className="w-full h-full object-cover" />
            ) : (
              equippedAvatar.icon
            )}
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
