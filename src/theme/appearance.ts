import { Appearance as RNAppearance } from 'react-native';

import type { Appearance } from '@/db/settings';

/**
 * Stellt die App auf hell, dunkel oder „wie das Handy“.
 *
 * React Native ändert damit, was useColorScheme() liefert; useTheme() und
 * alle Bildschirme folgen automatisch, ohne Neustart.
 */
export function applyAppearance(appearance: Appearance): void {
  RNAppearance.setColorScheme(appearance === 'system' ? 'unspecified' : appearance);
}
