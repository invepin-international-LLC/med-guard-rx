import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useTheme } from './useTheme';

export interface ShopItem {
  id: string;
  name: string;
  description: string;
  category: 'theme' | 'avatar' | 'powerup';
  itemType: string;
  price: number;
  icon: string;
  previewData: Record<string, string> | null;
  durationHours: number | null;
}

export interface InventoryItem {
  id: string;
  itemId: string;
  purchasedAt: string;
  expiresAt: string | null;
  isEquipped: boolean;
  item: ShopItem;
}

export interface UserPreferences {
  equippedTheme: string;
  equippedAvatar: string;
}

export function useShop() {
  const [shopItems, setShopItems] = useState<ShopItem[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [preferences, setPreferences] = useState<UserPreferences>({ equippedTheme: 'default', equippedAvatar: 'default' });
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const { applyTheme } = useTheme();

  // Get current user
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
    };
    getUser();
  }, []);

  // Fetch shop items
  const fetchShopItems = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('shop_items')
        .select('*')
        .eq('is_active', true)
        .order('category')
        .order('price');

      if (error) throw error;

      setShopItems((data || []).map(item => ({
        id: item.id,
        name: item.name,
        description: item.description,
        category: item.category as 'theme' | 'avatar' | 'powerup',
        itemType: item.item_type,
        price: item.price,
        icon: item.icon || '🎁',
        previewData: item.preview_data as Record<string, string> | null,
        durationHours: item.duration_hours,
      })));
    } catch (error) {
      console.error('Error fetching shop items:', error);
    }
  }, []);

  // Fetch user inventory
  const fetchInventory = useCallback(async () => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from('user_inventory')
        .select(`
          *,
          shop_items (*)
        `)
        .eq('user_id', userId)
        .order('purchased_at', { ascending: false });

      if (error) throw error;

      setInventory((data || []).map(inv => ({
        id: inv.id,
        itemId: inv.item_id,
        purchasedAt: inv.purchased_at,
        expiresAt: inv.expires_at,
        isEquipped: inv.is_equipped,
        item: {
          id: inv.shop_items.id,
          name: inv.shop_items.name,
          description: inv.shop_items.description,
          category: inv.shop_items.category as 'theme' | 'avatar' | 'powerup',
          itemType: inv.shop_items.item_type,
          price: inv.shop_items.price,
          icon: inv.shop_items.icon || '🎁',
          previewData: inv.shop_items.preview_data as Record<string, string> | null,
          durationHours: inv.shop_items.duration_hours,
        },
      })));
    } catch (error) {
      console.error('Error fetching inventory:', error);
    }
  }, [userId]);

  // Fetch user preferences
  const fetchPreferences = useCallback(async () => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setPreferences({
          equippedTheme: data.equipped_theme || 'default',
          equippedAvatar: data.equipped_avatar || 'default',
        });
      } else {
        // Initialize preferences
        await supabase.from('user_preferences').insert({
          user_id: userId,
          equipped_theme: 'default',
          equipped_avatar: 'default',
        });
      }
    } catch (error) {
      console.error('Error fetching preferences:', error);
    }
  }, [userId]);

  // Purchase an item
  const purchaseItem = useCallback(async (item: ShopItem, currentCoins: number): Promise<boolean> => {
    if (!userId) return false;

    if (currentCoins < item.price) {
      toast.error('Not enough coins!', {
        description: `You need ${item.price - currentCoins} more coins.`,
      });
      return false;
    }

    try {
      // Check if user already owns this permanent item
      if (!item.durationHours) {
        const existing = inventory.find(inv => 
          inv.item.itemType === item.itemType && 
          (!inv.expiresAt || new Date(inv.expiresAt) > new Date())
        );
        if (existing) {
          toast.error('Already owned!', {
            description: 'You already have this item.',
          });
          return false;
        }
      }

      // Deduct coins
      const { error: coinsError } = await supabase
        .from('user_rewards')
        .update({ coins: currentCoins - item.price })
        .eq('user_id', userId);

      if (coinsError) throw coinsError;

      // Calculate expiration for temporary items
      let expiresAt = null;
      if (item.durationHours) {
        const expires = new Date();
        expires.setHours(expires.getHours() + item.durationHours);
        expiresAt = expires.toISOString();
      }

      // Add to inventory
      const { error: inventoryError } = await supabase
        .from('user_inventory')
        .insert({
          user_id: userId,
          item_id: item.id,
          expires_at: expiresAt,
        });

      if (inventoryError) throw inventoryError;

      // Handle special power-ups
      if (item.category === 'powerup') {
        await handlePowerupPurchase(item);
      }

      toast.success(`Purchased ${item.name}!`, {
        description: item.durationHours 
          ? `Active for ${item.durationHours} hours` 
          : 'Added to your collection',
      });

      await fetchInventory();
      return true;
    } catch (error) {
      console.error('Error purchasing item:', error);
      toast.error('Purchase failed');
      return false;
    }
  }, [userId, inventory, fetchInventory]);

  // Handle power-up purchases
  const handlePowerupPurchase = async (item: ShopItem) => {
    if (!userId) return;

    if (item.itemType.startsWith('shield_')) {
      // Activate streak shield
      const hours = item.durationHours || 24;
      const expires = new Date();
      expires.setHours(expires.getHours() + hours);

      await supabase
        .from('user_rewards')
        .update({
          streak_shield_active: true,
          streak_shield_expires_at: expires.toISOString(),
        })
        .eq('user_id', userId);
    } else if (item.itemType === 'triple_spins') {
      // Add 3 spins
      const { data: rewards } = await supabase
        .from('user_rewards')
        .select('available_spins')
        .eq('user_id', userId)
        .single();

      if (rewards) {
        await supabase
          .from('user_rewards')
          .update({ available_spins: rewards.available_spins + 3 })
          .eq('user_id', userId);
      }
    } else if (item.itemType === 'double_coins_24h') {
      // This would need to be checked elsewhere when awarding coins
      // For now, we just store it in inventory with expiration
    }
  };

  // Equip an item
  const equipItem = useCallback(async (item: ShopItem) => {
    if (!userId) return false;

    try {
      const updateField = item.category === 'theme' ? 'equipped_theme' : 'equipped_avatar';
      
      const { error } = await supabase
        .from('user_preferences')
        .update({ [updateField]: item.itemType })
        .eq('user_id', userId);

      if (error) throw error;

      setPreferences(prev => ({
        ...prev,
        [item.category === 'theme' ? 'equippedTheme' : 'equippedAvatar']: item.itemType,
      }));

      // Apply theme dynamically if it's a theme item
      if (item.category === 'theme') {
        applyTheme(item);
      }

      toast.success(`${item.name} equipped!`);
      return true;
    } catch (error) {
      console.error('Error equipping item:', error);
      toast.error('Failed to equip item');
      return false;
    }
  }, [userId, applyTheme]);

  // Check if user owns an item
  const ownsItem = useCallback((item: ShopItem): boolean => {
    return inventory.some(inv => 
      inv.item.itemType === item.itemType && 
      (!inv.expiresAt || new Date(inv.expiresAt) > new Date())
    );
  }, [inventory]);

  // Check if item is equipped
  const isEquipped = useCallback((item: ShopItem): boolean => {
    if (item.category === 'theme') {
      return preferences.equippedTheme === item.itemType;
    } else if (item.category === 'avatar') {
      return preferences.equippedAvatar === item.itemType;
    }
    return false;
  }, [preferences]);

  // Get items by category
  const getItemsByCategory = useCallback((category: 'theme' | 'avatar' | 'powerup') => {
    return shopItems.filter(item => item.category === category);
  }, [shopItems]);

  // Initial fetch
  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      await fetchShopItems();
      setLoading(false);
    };
    fetchAll();
  }, [fetchShopItems]);

  useEffect(() => {
    if (userId) {
      fetchInventory();
      fetchPreferences();
    }
  }, [userId, fetchInventory, fetchPreferences]);

  // Apply theme when preferences or shop items change (for initial load)
  useEffect(() => {
    if (preferences.equippedTheme && preferences.equippedTheme !== 'default' && shopItems.length > 0) {
      const themeItem = shopItems.find(item => 
        item.category === 'theme' && item.itemType === preferences.equippedTheme
      );
      if (themeItem) {
        applyTheme(themeItem);
      }
    }
  }, [preferences.equippedTheme, shopItems, applyTheme]);

  return {
    shopItems,
    inventory,
    preferences,
    loading,
    purchaseItem,
    equipItem,
    ownsItem,
    isEquipped,
    getItemsByCategory,
    refetch: () => {
      fetchShopItems();
      fetchInventory();
      fetchPreferences();
    },
  };
}
