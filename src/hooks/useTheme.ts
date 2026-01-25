import { useEffect, useCallback } from 'react';
import { ShopItem } from './useShop';

// Theme color definitions for CSS variable updates
interface ThemeColors {
  primary: string;
  accent: string;
  background: string;
  // Extended colors derived from base
  primaryForeground?: string;
  accentForeground?: string;
  secondary?: string;
  muted?: string;
}

// Parse HSL string to get hue value for derived colors
const parseHSL = (hsl: string): { h: number; s: number; l: number } | null => {
  const match = hsl.match(/(\d+)\s+(\d+)%?\s+(\d+)%?/);
  if (match) {
    return { h: parseInt(match[1]), s: parseInt(match[2]), l: parseInt(match[3]) };
  }
  return null;
};

// Generate a full theme palette from base colors
const generateThemePalette = (colors: ThemeColors): Record<string, string> => {
  const palette: Record<string, string> = {};
  
  // Parse primary for derived colors
  const primary = parseHSL(colors.primary);
  const background = parseHSL(colors.background);
  const accent = parseHSL(colors.accent);
  
  // Core colors
  palette['--primary'] = colors.primary;
  palette['--accent'] = colors.accent;
  palette['--background'] = colors.background;
  
  // Foreground colors (ensure contrast)
  if (primary) {
    palette['--primary-foreground'] = primary.l > 50 ? '222 47% 11%' : '0 0% 100%';
  }
  if (accent) {
    palette['--accent-foreground'] = accent.l > 50 ? '222 47% 11%' : '0 0% 100%';
  }
  
  // Derived colors from background
  if (background) {
    const isDark = background.l < 50;
    
    // Foreground (text)
    palette['--foreground'] = isDark ? '210 40% 96%' : '222 47% 11%';
    
    // Card
    if (isDark) {
      palette['--card'] = `${background.h} ${Math.max(background.s - 5, 0)}% ${Math.min(background.l + 4, 20)}%`;
      palette['--card-foreground'] = '210 40% 96%';
    } else {
      palette['--card'] = '0 0% 100%';
      palette['--card-foreground'] = '222 47% 11%';
    }
    
    // Popover (same as card)
    palette['--popover'] = palette['--card'];
    palette['--popover-foreground'] = palette['--card-foreground'];
    
    // Secondary
    if (isDark) {
      palette['--secondary'] = `${background.h} ${Math.max(background.s - 10, 0)}% ${Math.min(background.l + 10, 25)}%`;
      palette['--secondary-foreground'] = '210 40% 96%';
    } else {
      palette['--secondary'] = `${background.h} ${Math.min(background.s + 5, 30)}% 92%`;
      palette['--secondary-foreground'] = '222 47% 15%';
    }
    
    // Muted
    if (isDark) {
      palette['--muted'] = `${background.h} ${Math.max(background.s - 10, 0)}% ${Math.min(background.l + 8, 22)}%`;
      palette['--muted-foreground'] = `${background.h} 15% 60%`;
    } else {
      palette['--muted'] = `${background.h} 20% 94%`;
      palette['--muted-foreground'] = `${background.h} 15% 40%`;
    }
    
    // Border and input
    if (isDark) {
      palette['--border'] = `${background.h} 30% 22%`;
      palette['--input'] = `${background.h} 30% 22%`;
    } else {
      palette['--border'] = `${background.h} 20% 82%`;
      palette['--input'] = `${background.h} 20% 82%`;
    }
    
    // Ring (use primary)
    palette['--ring'] = colors.primary;
    
    // Sidebar colors
    if (primary) {
      if (isDark) {
        palette['--sidebar-background'] = `${primary.h} ${Math.max(primary.s - 10, 30)}% 10%`;
        palette['--sidebar-foreground'] = '210 40% 96%';
        palette['--sidebar-primary'] = colors.accent;
        palette['--sidebar-primary-foreground'] = palette['--accent-foreground'] || '0 0% 100%';
        palette['--sidebar-accent'] = `${primary.h} ${Math.max(primary.s - 20, 20)}% 18%`;
        palette['--sidebar-accent-foreground'] = '210 40% 96%';
        palette['--sidebar-border'] = `${primary.h} 40% 18%`;
        palette['--sidebar-ring'] = colors.accent;
      } else {
        palette['--sidebar-background'] = `${primary.h} ${Math.max(primary.s - 5, 30)}% 15%`;
        palette['--sidebar-foreground'] = '0 0% 100%';
        palette['--sidebar-primary'] = colors.accent;
        palette['--sidebar-primary-foreground'] = '0 0% 100%';
        palette['--sidebar-accent'] = `${primary.h} 40% 25%`;
        palette['--sidebar-accent-foreground'] = '0 0% 100%';
        palette['--sidebar-border'] = `${primary.h} 40% 25%`;
        palette['--sidebar-ring'] = colors.accent;
      }
    }
  }
  
  return palette;
};

// Default theme (matches index.css :root)
const defaultTheme: ThemeColors = {
  primary: '222 47% 20%',
  accent: '25 95% 53%',
  background: '220 25% 97%',
};

export function useTheme() {
  // Apply theme colors to CSS variables
  const applyTheme = useCallback((themeItem: ShopItem | null) => {
    const root = document.documentElement;
    
    if (!themeItem || themeItem.itemType === 'default' || !themeItem.previewData) {
      // Reset to default theme
      const palette = generateThemePalette(defaultTheme);
      Object.entries(palette).forEach(([key, value]) => {
        root.style.setProperty(key, value);
      });
      return;
    }
    
    // Apply custom theme
    const colors: ThemeColors = {
      primary: themeItem.previewData.primary || defaultTheme.primary,
      accent: themeItem.previewData.accent || defaultTheme.accent,
      background: themeItem.previewData.background || defaultTheme.background,
    };
    
    const palette = generateThemePalette(colors);
    Object.entries(palette).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });
  }, []);
  
  // Reset theme to defaults
  const resetTheme = useCallback(() => {
    const root = document.documentElement;
    const palette = generateThemePalette(defaultTheme);
    Object.entries(palette).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });
  }, []);
  
  return {
    applyTheme,
    resetTheme,
  };
}
