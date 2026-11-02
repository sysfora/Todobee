export type Theme = "light" | "dark" | "system";
export const THEME_KEY = "todobee:theme";

/** Whether the workspace plan unlocks dark themes; set by AppShell from the plan. */
let darkAllowed = true;

export function getTheme(): Theme {
  const t = typeof localStorage !== "undefined" ? localStorage.getItem(THEME_KEY) : null;
  return t === "dark" || t === "system" ? t : "light";
}

/** Plans without dark mode always look light, whatever was saved before. */
export const effectiveTheme = (t: Theme, allowDark: boolean): Theme => (allowDark ? t : "light");

export function setDarkAllowed(allowed: boolean) {
  darkAllowed = allowed;
  applyTheme();
}

export function applyTheme(t: Theme = getTheme()) {
  const e = effectiveTheme(t, darkAllowed);
  const dark =
    e === "dark" || (e === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
}

export function setTheme(t: Theme) {
  localStorage.setItem(THEME_KEY, t);
  applyTheme(t);
}
