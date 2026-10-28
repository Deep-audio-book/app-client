/**
 * "deep audiobooks" theme, taken from the sign-in screen:
 * teal glow fading to black, yellow brand colour, white pill buttons.
 * Import anywhere:  import { theme } from "../theme";
 */
export const theme = {
  colors: {
    background: "#000000",
    backgroundTop: "#3B6B62", // teal glow at the top of every screen
    surface: "#161616",
    surfaceRaised: "#2A2A2A", // gray pill buttons ("Create account")
    tileA: "#14211F",
    tileB: "#1A2B28",
    tileC: "#203632",
    textPrimary: "#FFFFFF",
    textSecondary: "#A8A8A8",
    accent: "#FAEF3E", // logo yellow
    accentAlt: "#EE6A3B", // logo orange
    onAccent: "#000000",
    border: "#2E2E2E",
    error: "#FF6B6B",
  },
  font: {
    regular: "Poppins_400Regular",
    medium: "Poppins_500Medium",
    semibold: "Poppins_600SemiBold",
    bold: "Poppins_700Bold",
  },
};