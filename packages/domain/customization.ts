export type ThemeMode = "light" | "dark" | "system";
export type Density = "compact" | "comfortable";

export interface UserPreferences {
  userId: string;
  theme: ThemeMode;
  density: Density;
  accent?: string;
  reducedMotion: boolean;
  sidebarCollapsed: boolean;
  locale: string;
  timezone: string;
}

export function isValidLocale(locale: string): boolean {
  return /^[a-z]{2}(?:-[A-Z]{2})?$/.test(locale);
}

export function isValidTimezone(timezone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format();
    return true;
  } catch {
    return false;
  }
}
