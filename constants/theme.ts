/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

const tintColorLight = '#0a7ea4';
const tintColorDark = '#fff';

export const Colors = {
  light: {
    text: '#11181C',
    background: '#fff',
    tint: tintColorLight,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
  },
};

export const AppColors = {
  primary: "#00e5ff",
  background: "#10141a",
  backgroundAlt: "#0b0e14",
  surface: "#1c2026",
  surfaceAlt: "#262a31",
  text: {
    primary: "#ffffff",
    secondary: "#888888",
    tertiary: "#aaaaaa",
    alt: "#dfe2eb",
    muted: "#a0aab5",
  },
  accent: {
    purple: "#b388ff",
    gold: "#ffdf00",
    green: "#4caf50",
    warning: "#ffab00",
    error: "#ff6b6b",
    danger: "#ff4444",
  },
  border: {
    cyan: "rgba(0, 229, 255, 0.1)",
    cyanMedium: "rgba(0, 229, 255, 0.2)",
    cyanStrong: "rgba(0, 229, 255, 0.3)",
    subtle: "rgba(255, 255, 255, 0.05)",
    faint: "rgba(255, 255, 255, 0.03)",
  },
  podium: {
    gold: "#ffd700",
    goldDark: "#b8860b",
    silver: "#c0c0c0",
    silverDark: "#8e8e8e",
    bronze: "#cd7f32",
    bronzeDark: "#8b4513",
  },
} as const;

export const AppSpacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 30,
} as const;

export const AppRadius = {
  xs: 8,
  sm: 10,
  md: 12,
  lg: 14,
  xl: 16,
  xxl: 20,
  xxxl: 24,
} as const;

export const AppShadow = {
  cyan: {
    shadowColor: "#00e5ff",
    shadowOpacity: 0.4,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  cyanLarge: {
    shadowColor: "#00e5ff",
    shadowOpacity: 0.3,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 10 },
  },
  cyanSubtle: {
    shadowColor: "#00e5ff",
    shadowOpacity: 0.15,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  subtle: {
    shadowColor: "#000000",
    shadowOpacity: 0.2,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
} as const;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
