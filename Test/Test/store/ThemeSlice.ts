import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface ThemeColors {
  background: string;
  onBackground: string;
  primary: string;
  primaryContainer: string;
  onPrimaryContainer: string;
  surfaceContainer: string;
  surfaceContainerHigh: string;
  surfaceVariant: string;
  onSurfaceVariant: string;
  outline: string;
  secondary: string;
  card: string;
  border: string;
  accent: string;
  foreground: string;
  mutedForeground: string;
  muted: string;
  success: string;
  destructive: string;
}

export type ThemeMode = "dark" | "light";

const darkColors: ThemeColors = {
  background: "#0f131d",
  onBackground: "#dfe2f1",
  primary: "#e9feff",
  primaryContainer: "#00f5ff",
  onPrimaryContainer: "#006c71",
  surfaceContainer: "#1c1f2a",
  surfaceContainerHigh: "#262a35",
  surfaceVariant: "#313540",
  onSurfaceVariant: "#b9caca",
  outline: "#849495",
  secondary: "#ffb3b0",
  card: "#1c1f2a",
  border: "rgba(255, 255, 255, 0.1)",
  accent: "#00f5ff",
  foreground: "#dfe2f1",
  mutedForeground: "#b9caca",
  muted: "#313540",
  success: "#16a34a",
  destructive: "#93000a", // aligned to HTML's error-container
};

const lightColors: ThemeColors = {
  background: "#f7f9fc",
  onBackground: "#0f131d",
  primary: "#006c71",
  primaryContainer: "#00f5ff",
  onPrimaryContainer: "#003f42",
  surfaceContainer: "#eceef3",
  surfaceContainerHigh: "#e1e4ea",
  surfaceVariant: "#dde1e6",
  onSurfaceVariant: "#41474d",
  outline: "#71787d",
  secondary: "#c94a45",
  card: "#ffffff",
  border: "rgba(0, 0, 0, 0.1)",
  accent: "#00838a",
  foreground: "#0f131d",
  mutedForeground: "#41474d",
  muted: "#dde1e6",
  success: "#15803d",
  destructive: "#b91c1c",
};

interface ThemeState {
  mode: ThemeMode;
  colors: ThemeColors;
}

const initialState: ThemeState = {
  mode: "dark",
  colors: darkColors,
};

const themeSlice = createSlice({
  name: "theme",
  initialState,
  reducers: {
    setColors: (state, action: PayloadAction<Partial<ThemeColors>>) => {
      state.colors = { ...state.colors, ...action.payload };
    },
    setMode: (state, action: PayloadAction<ThemeMode>) => {
      state.mode = action.payload;
      state.colors = action.payload === "dark" ? darkColors : lightColors;
    },
    toggleMode: (state) => {
      state.mode = state.mode === "dark" ? "light" : "dark";
      state.colors = state.mode === "dark" ? darkColors : lightColors;
    },
    resetColors: (state) => {
      state.colors = state.mode === "dark" ? darkColors : lightColors;
    },
  },
});

export const { setColors, setMode, toggleMode, resetColors } =
  themeSlice.actions;
export default themeSlice.reducer;
