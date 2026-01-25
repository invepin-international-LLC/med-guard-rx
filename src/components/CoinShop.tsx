import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Coins, Check, ShoppingBag, Palette, User, Zap, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ShopItem } from '@/hooks/useShop';

interface CoinShopProps {
  coins: number;
  themes: ShopItem[];
  avatars: ShopItem[];
  powerups: ShopItem[];
  onPurchase: (item: ShopItem) => Promise<boolean>;
  onEquip: (item: ShopItem) => Promise<boolean>;
  ownsItem: (item: ShopItem) => boolean;
  isEquipped: (item: ShopItem) => boolean;
  onCoinsUpdated: () => void;
}

export function CoinShop({
  coins,
  themes,
  avatars,
  powerups,
  onPurchase,
  onEquip,
  ownsItem,
  isEquipped,
  onCoinsUpdated,
}: CoinShopProps) {
  const [purchasing, setPurchasing] = useState<string | null>(null);

  const handlePurchase = async (item: ShopItem) => {
    setPurchasing(item.id);
    const success = await onPurchase(item);
    if (success) {
      onCoinsUpdated();
    }
    setPurchasing(null);
  };

  const handleEquip = async (item: ShopItem) => {
    await onEquip(item);
  };

  const renderItem = (item: ShopItem) => {
    const owned = ownsItem(item);
    const equipped = isEquipped(item);
    const canAfford = coins >= item.price;
    const isPurchasing = purchasing === item.id;

    return (
      <Card
        key={item.id}
        className={cn(
          "transition-all duration-200",
          equipped && "ring-2 ring-primary",
          !owned && !canAfford && "opacity-60"
        )}
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            {/* Icon */}
            <div className={cn(
              "w-14 h-14 rounded-xl flex items-center justify-center text-2xl shrink-0",
              owned ? "bg-primary/10" : "bg-muted"
            )}>
              {item.icon}
            </div>

            {/* Details */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-semibold truncate">{item.name}</h4>
                {equipped && (
                  <Badge variant="default" className="shrink-0">
                    <Check className="w-3 h-3 mr-1" />
                    Active
                  </Badge>
                )}
                {owned && !equipped && item.category !== 'powerup' && (
                  <Badge variant="secondary" className="shrink-0">Owned</Badge>
                )}
              </div>
              
              <p className="text-sm text-muted-foreground line-clamp-1 mb-2">
                {item.description}
              </p>

              {/* Price or Actions */}
              <div className="flex items-center gap-2">
                {!owned ? (
                  <Button
                    size="sm"
                    disabled={!canAfford || isPurchasing}
                    onClick={() => handlePurchase(item)}
                    className={cn(
                      "gap-1",
                      canAfford 
                        ? "bg-gradient-to-r from-warning to-accent text-accent-foreground" 
                        : ""
                    )}
                  >
                    {isPurchasing ? (
                      'Buying...'
                    ) : canAfford ? (
                      <>
                        <Coins className="w-3 h-3" />
                        {item.price}
                      </>
                    ) : (
                      <>
                        <Lock className="w-3 h-3" />
                        {item.price}
                      </>
                    )}
                  </Button>
                ) : item.category !== 'powerup' && !equipped ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEquip(item)}
                  >
                    Equip
                  </Button>
                ) : item.category === 'powerup' && item.durationHours ? (
                  <Button
                    size="sm"
                    disabled={!canAfford || isPurchasing}
                    onClick={() => handlePurchase(item)}
                    className="gap-1"
                  >
                    {isPurchasing ? (
                      'Buying...'
                    ) : (
                      <>
                        <Coins className="w-3 h-3" />
                        {item.price}
                      </>
                    )}
                  </Button>
                ) : null}

                {item.durationHours && (
                  <span className="text-xs text-muted-foreground">
                    {item.durationHours >= 24 
                      ? `${Math.floor(item.durationHours / 24)} day${item.durationHours >= 48 ? 's' : ''}`
                      : `${item.durationHours}h`
                    }
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Theme Preview */}
          {item.category === 'theme' && item.previewData && (
            <div className="mt-3 flex gap-2">
              <div 
                className="w-6 h-6 rounded-full border-2 border-border"
                style={{ backgroundColor: `hsl(${item.previewData.primary})` }}
                title="Primary"
              />
              <div 
                className="w-6 h-6 rounded-full border-2 border-border"
                style={{ backgroundColor: `hsl(${item.previewData.accent})` }}
                title="Accent"
              />
              <div 
                className="w-6 h-6 rounded-full border-2 border-border"
                style={{ backgroundColor: `hsl(${item.previewData.background})` }}
                title="Background"
              />
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-4">
      {/* Coin Balance */}
      <Card className="bg-gradient-to-r from-warning/20 to-accent/20">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-warning/30 flex items-center justify-center">
                <Coins className="w-6 h-6 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Your Balance</p>
                <p className="text-2xl font-bold">{coins} Coins</p>
              </div>
            </div>
            <ShoppingBag className="w-8 h-8 text-muted-foreground" />
          </div>
        </CardContent>
      </Card>

      {/* Shop Tabs */}
      <Tabs defaultValue="themes" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="themes" className="gap-1">
            <Palette className="w-4 h-4" />
            Themes
          </TabsTrigger>
          <TabsTrigger value="avatars" className="gap-1">
            <User className="w-4 h-4" />
            Avatars
          </TabsTrigger>
          <TabsTrigger value="powerups" className="gap-1">
            <Zap className="w-4 h-4" />
            Power-ups
          </TabsTrigger>
        </TabsList>

        <TabsContent value="themes" className="mt-4 space-y-3">
          {themes.length > 0 ? (
            themes.map(renderItem)
          ) : (
            <p className="text-center text-muted-foreground py-8">No themes available</p>
          )}
        </TabsContent>

        <TabsContent value="avatars" className="mt-4 space-y-3">
          {avatars.length > 0 ? (
            avatars.map(renderItem)
          ) : (
            <p className="text-center text-muted-foreground py-8">No avatars available</p>
          )}
        </TabsContent>

        <TabsContent value="powerups" className="mt-4 space-y-3">
          {powerups.length > 0 ? (
            powerups.map(renderItem)
          ) : (
            <p className="text-center text-muted-foreground py-8">No power-ups available</p>
          )}
        </TabsContent>
      </Tabs>

      {/* Tips */}
      <Card className="bg-muted/50">
        <CardContent className="p-3">
          <p className="text-xs text-muted-foreground text-center">
            💡 Earn coins by taking medications on time, completing challenges, and spinning the slot machine!
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
