import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface AvatarData {
  icon: string;
  name: string;
  itemType: string;
}

interface EquippedAvatarContextType {
  equippedAvatar: AvatarData;
  refreshAvatar: () => void;
}

const defaultAvatar: AvatarData = {
  icon: '👤',
  name: 'Default',
  itemType: 'default',
};

const EquippedAvatarContext = createContext<EquippedAvatarContextType>({
  equippedAvatar: defaultAvatar,
  refreshAvatar: () => {},
});

export function EquippedAvatarProvider({ children }: { children: ReactNode }) {
  const [equippedAvatar, setEquippedAvatar] = useState<AvatarData>(defaultAvatar);
  const [userId, setUserId] = useState<string | null>(null);

  // Get current user
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
    };
    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUserId(session?.user?.id || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchEquippedAvatar = useCallback(async () => {
    if (!userId) return;

    try {
      // Get user preferences to find equipped avatar type
      const { data: prefs, error: prefsError } = await supabase
        .from('user_preferences')
        .select('equipped_avatar')
        .eq('user_id', userId)
        .maybeSingle();

      if (prefsError) throw prefsError;

      if (!prefs || !prefs.equipped_avatar || prefs.equipped_avatar === 'default') {
        setEquippedAvatar(defaultAvatar);
        return;
      }

      // Find the shop item for this avatar
      const { data: shopItem, error: shopError } = await supabase
        .from('shop_items')
        .select('icon, name, item_type')
        .eq('item_type', prefs.equipped_avatar)
        .eq('category', 'avatar')
        .maybeSingle();

      if (shopError) throw shopError;

      if (shopItem) {
        setEquippedAvatar({
          icon: shopItem.icon || '👤',
          name: shopItem.name,
          itemType: shopItem.item_type,
        });
      } else {
        setEquippedAvatar(defaultAvatar);
      }
    } catch (error) {
      console.error('Error fetching equipped avatar:', error);
      setEquippedAvatar(defaultAvatar);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) {
      fetchEquippedAvatar();
    }
  }, [userId, fetchEquippedAvatar]);

  // Listen for realtime updates to user_preferences
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel('avatar-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'user_preferences',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          fetchEquippedAvatar();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, fetchEquippedAvatar]);

  return (
    <EquippedAvatarContext.Provider value={{ equippedAvatar, refreshAvatar: fetchEquippedAvatar }}>
      {children}
    </EquippedAvatarContext.Provider>
  );
}

export function useEquippedAvatar() {
  return useContext(EquippedAvatarContext);
}
