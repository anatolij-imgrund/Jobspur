import { createContext, type ReactNode, use, useCallback, useState } from 'react';
import { Appearance as RNAppearance, useColorScheme } from 'react-native';

import type { Appearance } from '@/db/settings';

type AppearanceState = {
  appearance: Appearance;
  setAppearance: (appearance: Appearance) => void;
};

const AppearanceContext = createContext<AppearanceState>({
  appearance: 'system',
  setAppearance: () => undefined,
});

/**
 * Hält die gewählte Darstellung als React-Zustand. Alle Farben hängen daran,
 * deshalb schalten Kopfleisten, Formulare und Tabs gemeinsam um.
 * Zusätzlich bekommt Android die Wahl, damit auch Datums- und Uhrzeitauswahl
 * sowie Dialoge passen.
 */
export function AppearanceProvider({ children }: { children: ReactNode }) {
  const [appearance, setState] = useState<Appearance>('system');

  const setAppearance = useCallback((value: Appearance) => {
    setState(value);
    RNAppearance.setColorScheme(value === 'system' ? 'unspecified' : value);
  }, []);

  return <AppearanceContext value={{ appearance, setAppearance }}>{children}</AppearanceContext>;
}

export function useAppearance(): AppearanceState {
  return use(AppearanceContext);
}

/** „hell“ oder „dunkel“, wie es gerade gilt. */
export function useResolvedScheme(): 'light' | 'dark' {
  const { appearance } = useAppearance();
  const system = useColorScheme();
  if (appearance !== 'system') return appearance;
  return system === 'dark' ? 'dark' : 'light';
}
