// Local stand-in for the "grok/canvas" kit used by the original Page.
// Re-exports React hooks and provides a fixed dusty western-farm theme.
export { useState, useEffect, useRef, useCallback, useReducer, useMemo } from "react";
export type { ReactNode, CSSProperties, ChangeEvent, FocusEvent, PointerEvent as ReactPointerEvent, KeyboardEvent as ReactKeyboardEvent } from "react";

export interface GrokTheme {
  bg: { base: string; elevated: string; subtle: string };
  text: { primary: string; secondary: string; tertiary: string; danger: string; success: string; warning: string; accent: string; onPrimary: string };
  border: { default: string; focus: string; strong: string };
  fill: { primary: string; secondary: string; accentSubtle: string; dangerSubtle: string; successSubtle: string; warningSubtle: string };
  font: { family: string; mono: string };
}

const THEME: GrokTheme = {
  bg: { base: "#1c140c", elevated: "#2a1e12", subtle: "#23180f" },
  text: { primary: "#f3e6c8", secondary: "#c9b48a", tertiary: "#8a7458", danger: "#e85d4c", success: "#7bc96f", warning: "#f0c14b", accent: "#e8a03c", onPrimary: "#1c140c" },
  border: { default: "#5a4330", focus: "#e8a03c", strong: "#8a6238" },
  fill: { primary: "#c47a2c", secondary: "#3a2a18", accentSubtle: "#3d2c14", dangerSubtle: "#3a1612", successSubtle: "#1c2e16", warningSubtle: "#3a2e12" },
  font: {
    family: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Apple Color Emoji', 'Segoe UI Emoji', sans-serif",
    mono: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
  },
};

export function useGrokTheme(): GrokTheme {
  return THEME;
}
