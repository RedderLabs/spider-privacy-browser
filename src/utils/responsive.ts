// Lightweight, dependency-free responsive scaling so the UI reads well from small
// phones (~320–360dp) through large phones up to tablets (Android sw600dp+).
//
// Two ways to consume it:
//   • Static helpers (isTablet / contentMaxWidth / scale / moderateScale / font),
//     computed once at module load — safe to use inside StyleSheet.create for
//     values that don't need to react to rotation.
//   • useResponsive() — a hook backed by useWindowDimensions() for components that
//     must re-layout on rotation / split-screen / foldables (the tabs grid, the
//     home hero, tablet content centering).
//
// The app's existing dp values were designed against an iPhone-X-class device
// (375 × 812), so that's the guideline baseline everything scales relative to.
import { useMemo } from 'react';
import { Dimensions, useWindowDimensions } from 'react-native';

const GUIDE_W = 375;
// Android's canonical tablet breakpoint: smallest side >= 600dp.
const TABLET_MIN_DP = 600;

const clamp = (v: number, lo: number, hi: number): number => Math.min(Math.max(v, lo), hi);

export interface Responsive {
  width: number;
  height: number;
  isTablet: boolean;
  /** Column count for the tabs grid: 2 on phones, 3–4 on tablets. */
  columns: number;
  /** Cap for single-column content so it doesn't stretch edge-to-edge on tablets. */
  contentMaxWidth: number;
  /** Linear width scale, clamped so phones don't shrink and tablets don't balloon. */
  scale: (size: number) => number;
  /** Partial scale — grows/shrinks gently around the base size (factor 0..1). */
  moderateScale: (size: number, factor?: number) => number;
  /** Gentle font scale — stays legible on small screens, not huge on tablets. */
  font: (size: number) => number;
}

export function computeResponsive(width: number, height: number): Responsive {
  const shortest = Math.min(width, height);
  const isTablet = shortest >= TABLET_MIN_DP;

  const wRatio = clamp(width / GUIDE_W, 0.84, isTablet ? 1.4 : 1.15);
  const scale = (size: number): number => Math.round(size * wRatio);
  const moderateScale = (size: number, factor = 0.5): number =>
    Math.round(size + (size * wRatio - size) * factor);

  const fRatio = clamp(shortest / GUIDE_W, 0.9, isTablet ? 1.15 : 1.05);
  const font = (size: number): number => Math.round(size * fRatio);

  const columns = isTablet ? (shortest >= 840 ? 4 : 3) : 2;
  const contentMaxWidth = isTablet ? 560 : width;

  return { width, height, isTablet, columns, contentMaxWidth, scale, moderateScale, font };
}

const initial = Dimensions.get('window');
const base = computeResponsive(initial.width, initial.height);

export const isTablet = base.isTablet;
export const contentMaxWidth = base.contentMaxWidth;
export const scale = base.scale;
export const moderateScale = base.moderateScale;
export const font = base.font;

/** Reactive variant — re-renders on rotation / window-size changes. */
export function useResponsive(): Responsive {
  const { width, height } = useWindowDimensions();
  return useMemo(() => computeResponsive(width, height), [width, height]);
}
