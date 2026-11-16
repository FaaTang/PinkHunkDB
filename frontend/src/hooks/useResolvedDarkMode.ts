import { useEffect, useState } from 'react';
import { useStore } from '../store';
import {
  readSystemPrefersDark,
  resolveDarkMode,
  type ThemeMode,
} from '../utils/themeAccent';

/**
 * Resolve effective light/dark for UI and Monaco.
 * Supports theme mode `system` by following prefers-color-scheme.
 */
export function useResolvedDarkMode(): boolean {
  const themeMode = useStore((state) => state.theme) as ThemeMode;
  const [systemDark, setSystemDark] = useState(() => readSystemPrefersDark());

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => setSystemDark(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return resolveDarkMode(themeMode, systemDark);
}
