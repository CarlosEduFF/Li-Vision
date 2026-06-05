import { Platform } from 'react-native';

// ─── Semantic token shape ────────────────────────────────────────────────────
export interface AppColorTokens {
  primary: string;
  background: string;
  backgroundAlt: string;
  surface: string;
  surfaceAlt: string;
  text: {
    primary: string;
    secondary: string;
    tertiary: string;
    alt: string;
    muted: string;
  };
  accent: {
    purple: string;
    gold: string;
    green: string;
    warning: string;
    error: string;
    danger: string;
  };
  border: {
    cyan: string;
    cyanMedium: string;
    cyanStrong: string;
    subtle: string;
    faint: string;
  };
  podium: {
    gold: string;
    goldDark: string;
    silver: string;
    silverDark: string;
    bronze: string;
    bronzeDark: string;
  };
}

// ─── Dark palette ─────────────────────────────────────────────────────────────
export const AppColorsDark: AppColorTokens = {
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
};

// ─── Light palette ────────────────────────────────────────────────────────────
export const AppColorsLight: AppColorTokens = {
  primary: "#0097a7",
  background: "#f0f4f8",
  backgroundAlt: "#e4eaf0",
  surface: "#ffffff",
  surfaceAlt: "#f7f9fc",
  text: {
    primary: "#0d1117",
    secondary: "#4a5568",
    tertiary: "#718096",
    alt: "#2d3748",
    muted: "#718096",
  },
  accent: {
    purple: "#7c3aed",
    gold: "#d97706",
    green: "#16a34a",
    warning: "#d97706",
    error: "#dc2626",
    danger: "#b91c1c",
  },
  border: {
    cyan: "rgba(0, 151, 167, 0.15)",
    cyanMedium: "rgba(0, 151, 167, 0.3)",
    cyanStrong: "rgba(0, 151, 167, 0.5)",
    subtle: "rgba(0, 0, 0, 0.06)",
    faint: "rgba(0, 0, 0, 0.03)",
  },
  podium: {
    gold: "#f59e0b",
    goldDark: "#b45309",
    silver: "#9ca3af",
    silverDark: "#6b7280",
    bronze: "#b45309",
    bronzeDark: "#78350f",
  },
};

// Default export kept as dark for backwards compatibility with static imports
export const AppColors: AppColorTokens = AppColorsDark;

// Legacy Colors object — kept for Expo UI template components (tabs/_layout, collapsible, use-theme-color)
export const Colors = {
  light: {
    text: "#0d1117",
    background: "#f0f4f8",
    tint: "#0097a7",
    icon: "#4a5568",
    tabIconDefault: "#4a5568",
    tabIconSelected: "#0097a7",
  },
  dark: {
    text: "#ffffff",
    background: "#10141a",
    tint: "#00e5ff",
    icon: "#888888",
    tabIconDefault: "#888888",
    tabIconSelected: "#00e5ff",
  },
};

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
