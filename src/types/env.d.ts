// Type declarations for the `@env` virtual module produced by
// react-native-dotenv (see babel.config.js). All values arrive as strings (or
// undefined when the key is absent); coercion lives in src/config/env.ts.
declare module '@env' {
  export const PRIVACY_JS_ENABLED: string | undefined;
  export const CONTENT_BLOCKING_ENABLED: string | undefined;
  export const DEFAULT_DOH_PROVIDER: string | undefined;
}
