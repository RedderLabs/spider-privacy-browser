// Single source of truth for the spoofed device identity. The user-agent string
// and the navigator.* overrides MUST describe the SAME device, otherwise the
// mismatch (e.g. a desktop platform under a mobile UA) is a strong bot signal
// that triggers CAPTCHAs. Both this UA and navigator.ts describe a Pixel 7,
// Android 14, Chrome 124 — keep them in sync if you change one.
export const USER_AGENT =
  'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36';

// Coherent navigator values for the UA above (a real Pixel 7 / Chrome Android).
export const DEVICE = {
  platform: 'Linux armv8l', // Chrome on Android reports this
  vendor: 'Google Inc.',
  hardwareConcurrency: 8, // Pixel 7 (Tensor G2) exposes 8
  deviceMemory: 8, // 8 GB
  maxTouchPoints: 5, // it's a touchscreen — 0 would contradict the mobile UA
} as const;
