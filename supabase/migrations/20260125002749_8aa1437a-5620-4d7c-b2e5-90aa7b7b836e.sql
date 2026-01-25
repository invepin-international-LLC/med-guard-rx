-- Create shop items table
CREATE TABLE public.shop_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL, -- 'theme', 'avatar', 'powerup'
  item_type TEXT NOT NULL, -- specific item type like 'theme_ocean', 'avatar_robot', 'streak_shield_24h'
  price INTEGER NOT NULL,
  icon TEXT, -- emoji or icon name
  preview_data JSONB, -- for themes: color values; for avatars: image path
  duration_hours INTEGER, -- null for permanent items, hours for temporary power-ups
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user purchases/inventory table
CREATE TABLE public.user_inventory (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  item_id UUID NOT NULL REFERENCES public.shop_items(id) ON DELETE CASCADE,
  purchased_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE, -- null for permanent items
  is_equipped BOOLEAN NOT NULL DEFAULT false,
  UNIQUE(user_id, item_id, purchased_at)
);

-- Create user preferences for equipped items
CREATE TABLE public.user_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  equipped_theme TEXT DEFAULT 'default',
  equipped_avatar TEXT DEFAULT 'default',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.shop_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- RLS for shop_items (public read)
CREATE POLICY "Anyone can view shop items"
ON public.shop_items
FOR SELECT
USING (is_active = true);

-- RLS for user_inventory
CREATE POLICY "Users can view their own inventory"
ON public.user_inventory
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own inventory"
ON public.user_inventory
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own inventory"
ON public.user_inventory
FOR UPDATE
USING (auth.uid() = user_id);

-- RLS for user_preferences
CREATE POLICY "Users can view their own preferences"
ON public.user_preferences
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preferences"
ON public.user_preferences
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences"
ON public.user_preferences
FOR UPDATE
USING (auth.uid() = user_id);

-- Insert default shop items
INSERT INTO public.shop_items (name, description, category, item_type, price, icon, preview_data, duration_hours) VALUES
-- Themes
('Ocean Breeze', 'A calm blue theme inspired by the sea', 'theme', 'theme_ocean', 150, '🌊', '{"primary": "195 80% 45%", "accent": "180 70% 50%", "background": "200 30% 98%"}', null),
('Sunset Glow', 'Warm orange and pink sunset colors', 'theme', 'theme_sunset', 150, '🌅', '{"primary": "25 95% 55%", "accent": "340 80% 55%", "background": "30 30% 98%"}', null),
('Forest Green', 'Natural green tones from the forest', 'theme', 'theme_forest', 150, '🌲', '{"primary": "140 60% 40%", "accent": "100 50% 45%", "background": "120 20% 98%"}', null),
('Royal Purple', 'Elegant purple and gold accents', 'theme', 'theme_royal', 200, '👑', '{"primary": "270 60% 50%", "accent": "45 90% 55%", "background": "270 20% 98%"}', null),
('Cherry Blossom', 'Soft pink Japanese-inspired theme', 'theme', 'theme_sakura', 200, '🌸', '{"primary": "330 70% 65%", "accent": "350 60% 55%", "background": "330 30% 98%"}', null),
('Midnight Mode', 'Dark mode with neon accents', 'theme', 'theme_midnight', 250, '🌙', '{"primary": "220 80% 60%", "accent": "280 80% 60%", "background": "220 30% 10%"}', null),

-- Avatars
('Happy Pill', 'A cheerful pill character', 'avatar', 'avatar_pill', 50, '💊', '{"emoji": "💊"}', null),
('Heart Hero', 'Show you care about health', 'avatar', 'avatar_heart', 50, '❤️', '{"emoji": "❤️"}', null),
('Star Patient', 'You are a star!', 'avatar', 'avatar_star', 75, '⭐', '{"emoji": "⭐"}', null),
('Robot Helper', 'Your friendly med reminder bot', 'avatar', 'avatar_robot', 100, '🤖', '{"emoji": "🤖"}', null),
('Zen Master', 'Calm and collected', 'avatar', 'avatar_zen', 100, '🧘', '{"emoji": "🧘"}', null),
('Super Champion', 'The ultimate health hero', 'avatar', 'avatar_champion', 150, '🦸', '{"emoji": "🦸"}', null),
('Lucky Cat', 'Brings good fortune to your health', 'avatar', 'avatar_cat', 125, '🐱', '{"emoji": "🐱"}', null),
('Wise Owl', 'Smart medication management', 'avatar', 'avatar_owl', 125, '🦉', '{"emoji": "🦉"}', null),

-- Power-ups
('Streak Shield (24h)', 'Protect your streak for 24 hours', 'powerup', 'shield_24h', 100, '🛡️', null, 24),
('Streak Shield (48h)', 'Protect your streak for 48 hours', 'powerup', 'shield_48h', 175, '🛡️', null, 48),
('Streak Shield (7 days)', 'Ultimate protection for a whole week', 'powerup', 'shield_7d', 500, '🛡️', null, 168),
('Double Coins (24h)', 'Earn 2x coins for 24 hours', 'powerup', 'double_coins_24h', 150, '💰', null, 24),
('Triple Spins', 'Get 3 bonus spins right now!', 'powerup', 'triple_spins', 75, '🎰', null, null);

-- Add trigger for updated_at on user_preferences
CREATE TRIGGER update_user_preferences_updated_at
BEFORE UPDATE ON public.user_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();