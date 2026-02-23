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
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 rounded-xl bg-accent/10 hover:bg-accent/20 transition-all",
              isBouncing && "scale-110"
            )}
            style={{ transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
            title="Coin Shop"
          >
            <Coins className={cn("w-5 h-5 text-accent transition-transform", isBouncing && "animate-spin")} style={isBouncing ? { animationDuration: '0.4s', animationIterationCount: '1' } : {}} />
            <span className="text-sm font-bold text-accent tabular-nums">{displayBalance}</span>
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
