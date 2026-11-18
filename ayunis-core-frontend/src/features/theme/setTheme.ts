import { THEME_KEY } from './themeKey';

export function setTheme(theme: 'dark' | 'light') {
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // Blocked storage: the theme applies but is not remembered.
  }
  if (theme === 'dark') {
    document.documentElement.classList.add('dark');
    document.documentElement.classList.remove('light');
  } else {
    document.documentElement.classList.remove('dark');
    document.documentElement.classList.add('light');
  }
}
