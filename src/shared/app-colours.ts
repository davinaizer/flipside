/**
 * Literal colours for places that cannot read CSS variables: the generated app icons
 * and, later, the web app manifest. They are the light theme's values in
 * src/ui/tokens.css; app-colours.test.ts fails if the two drift apart.
 */
export const APP_COLOURS = {
  primary: "#4648d4",
  onPrimary: "#ffffff",
} as const;
