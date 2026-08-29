export const USER_PREFERENCE_EVENT = "uhpab:user-preferences-changed";

export const FONT_SIZE_KEY = "uhpab-font-size";
export const DEFAULT_PROJECT_TYPE_KEY = "uhpab-default-project-type";
export const REDUCE_MOTION_KEY = "uhpab-reduce-motion";
export const PRIVACY_MODE_KEY = "uhpab-privacy-mode";
export const SIDEBAR_DEFAULT_KEY = "uhpab-sidebar-default";

export type FontSize = "small" | "medium" | "large";
export type PreferredProjectType = "proposal" | "report";
export type SidebarDefault = "compact" | "expanded";

export const fontSizePixels: Record<FontSize, string> = {
  small: "15px",
  medium: "16px",
  large: "18px",
};

const readStoredValue = (key: string) => {
  if (typeof window === "undefined") return null;

  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
};

const writeStoredValue = (key: string, value: string) => {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Preference changes should not break the page if browser storage is unavailable.
  }
};

export const emitUserPreferenceChange = (key: string) => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(USER_PREFERENCE_EVENT, { detail: { key } }));
};

export const getFontSizePreference = (): FontSize => {
  const stored = readStoredValue(FONT_SIZE_KEY);
  return stored === "small" || stored === "large" ? stored : "medium";
};

export const setFontSizePreference = (value: FontSize) => {
  writeStoredValue(FONT_SIZE_KEY, value);
  applyFontSizePreference(value);
  emitUserPreferenceChange(FONT_SIZE_KEY);
};

export const applyFontSizePreference = (value = getFontSizePreference()) => {
  if (typeof document === "undefined") return;
  document.documentElement.style.fontSize = fontSizePixels[value];
};

export const getPreferredProjectType = (): PreferredProjectType => {
  const stored = readStoredValue(DEFAULT_PROJECT_TYPE_KEY);
  return stored === "report" ? "report" : "proposal";
};

export const setPreferredProjectType = (value: PreferredProjectType) => {
  writeStoredValue(DEFAULT_PROJECT_TYPE_KEY, value);
  emitUserPreferenceChange(DEFAULT_PROJECT_TYPE_KEY);
};

export const getReduceMotionPreference = () => readStoredValue(REDUCE_MOTION_KEY) === "true";

export const setReduceMotionPreference = (enabled: boolean) => {
  writeStoredValue(REDUCE_MOTION_KEY, String(enabled));
  applyReduceMotionPreference(enabled);
  emitUserPreferenceChange(REDUCE_MOTION_KEY);
};

export const applyReduceMotionPreference = (enabled = getReduceMotionPreference()) => {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("uhpab-reduce-motion", enabled);
};

export const getPrivacyModePreference = () => readStoredValue(PRIVACY_MODE_KEY) === "true";

export const setPrivacyModePreference = (enabled: boolean) => {
  writeStoredValue(PRIVACY_MODE_KEY, String(enabled));
  emitUserPreferenceChange(PRIVACY_MODE_KEY);
};

export const getSidebarDefaultPreference = (): SidebarDefault => {
  const stored = readStoredValue(SIDEBAR_DEFAULT_KEY);
  return stored === "expanded" ? "expanded" : "compact";
};

export const setSidebarDefaultPreference = (value: SidebarDefault) => {
  writeStoredValue(SIDEBAR_DEFAULT_KEY, value);
  emitUserPreferenceChange(SIDEBAR_DEFAULT_KEY);
};
