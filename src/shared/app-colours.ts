/**
 * Literal colours for places that cannot read CSS variables: the generated app icons
 * and the web app manifest and browser theme colours. They are the light theme's values in
 * src/ui/tokens.css (surfaceDark is the dark theme's surface); app-colours.test.ts fails if the two drift apart.
 */
export const APP_COLOURS = {
  primary: "#4648d4",
  onPrimary: "#ffffff",
  surface: "#f8f9ff",
  surfaceDark: "#0b1326",
} as const;
