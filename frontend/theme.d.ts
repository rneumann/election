// Injected at build time by vite.config.js — see config/theme.<profile>.json
declare const __THEME_CONFIG__: {
  institution: { name: string; fullName: string };
  colors: { primary: string; secondary: string; accent: string; dark: string; gray: string; lightGray: string };
  text: Record<string, string>;
  roles: Record<string, string>;
  placeholders: Record<string, string>;
};
