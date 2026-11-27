import { useSyncExternalStore } from 'react';

function isDarkTheme() {
  return document.documentElement.classList.contains('dark');
}

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class'],
  });
  return () => observer.disconnect();
}

/** Follows the `dark` class the theme tokens in `styles.css` key off. */
export function useDarkTheme(): boolean {
  return useSyncExternalStore(subscribe, isDarkTheme, () => false);
}
