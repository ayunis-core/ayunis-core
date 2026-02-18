import { useState, useEffect } from 'react';
import { getTheme } from './getTheme';
import { setTheme as setThemeUtil } from './setTheme';

export function useTheme() {
  const [theme, setThemeState] = useState<'light' | 'dark'>(() => getTheme());

  const setTheme = (newTheme: 'light' | 'dark') => {
    setThemeUtil(newTheme);
    setThemeState(newTheme);
  };

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
  };

  // Listen for theme changes from localStorage (in case it's changed elsewhere)
  useEffect(() => {
    const handleStorageChange = () => {
      const currentTheme = getTheme();
      setThemeState(currentTheme);
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return {
    theme,
    setTheme,
    toggleTheme,
  };
}
