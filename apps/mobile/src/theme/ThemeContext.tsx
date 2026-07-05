// Runtime theme resolution. `themeMode` (persisted in settingsStore) is one of
// 'system' | 'light' | 'dark'; combined with the OS colour scheme it yields the
// active palette. Components read it via `useTheme()` and build their StyleSheets
// from the returned tokens so switching mode restyles the whole app live.
//
// Dark-first: when the mode is 'system' and the OS reports no preference (null),
// we default to dark — the app's Obsidian Stealth identity.
import React from 'react';
import { useColorScheme } from 'react-native';
import { useSettingsStore } from '../store/settingsStore';
import {
  darkColors,
  lightColors,
  darkSurfaces,
  lightSurfaces,
  type Palette,
  type Surfaces,
} from './theme';

export interface ActiveTheme {
  colors: Palette;
  surfaces: Surfaces;
  isDark: boolean;
}

const DARK_THEME: ActiveTheme = { colors: darkColors, surfaces: darkSurfaces, isDark: true };
const LIGHT_THEME: ActiveTheme = { colors: lightColors, surfaces: lightSurfaces, isDark: false };

const ThemeContext = React.createContext<ActiveTheme>(DARK_THEME);

export function ThemeProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const mode = useSettingsStore(s => s.themeMode);
  const system = useColorScheme(); // 'light' | 'dark' | null

  const isDark = mode === 'system' ? system !== 'light' : mode === 'dark';
  const value = isDark ? DARK_THEME : LIGHT_THEME;

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = (): ActiveTheme => React.useContext(ThemeContext);
