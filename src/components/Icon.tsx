import { SymbolView } from 'expo-symbols';
import type { ColorValue } from 'react-native';

/**
 * Ein Name pro Bedeutung, darunter das passende Symbol je Plattform:
 * Material Symbols auf Android und Web, SF Symbols auf iOS.
 */
const ICONS = {
  list: { android: 'work', web: 'work', ios: 'briefcase' },
  document: { android: 'description', web: 'description', ios: 'doc.text' },
  settings: { android: 'settings', web: 'settings', ios: 'gearshape' },
  add: { android: 'add', web: 'add', ios: 'plus' },
  search: { android: 'search', web: 'search', ios: 'magnifyingglass' },
  close: { android: 'close', web: 'close', ios: 'xmark' },
  camera: { android: 'photo_camera', web: 'photo_camera', ios: 'camera' },
  gallery: { android: 'photo_library', web: 'photo_library', ios: 'photo.on.rectangle' },
} as const;

export type IconName = keyof typeof ICONS;

type Props = {
  name: IconName;
  size?: number;
  color: ColorValue;
};

export function Icon({ name, size = 24, color }: Props) {
  return <SymbolView name={ICONS[name]} size={size} tintColor={color} />;
}
