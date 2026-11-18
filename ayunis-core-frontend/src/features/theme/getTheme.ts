import { THEME_KEY } from './themeKey';

export function getTheme() {
  // Storage throws when the browser blocks it, as in the Outlook pane's
  // third-party iframe; the theme then stays light.
  try {
    return localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}
