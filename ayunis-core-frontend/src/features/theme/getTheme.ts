import { THEME_KEY } from "./themeKey";

export function getTheme() {
  const theme = localStorage.getItem(THEME_KEY);

  if (theme === "dark") {
    return "dark";
  }
  return "light";
}
