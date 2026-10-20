import { StyleSheet, Text, View } from 'react-native';

import { space, type, useTheme } from '@/theme';

/** Vorübergehender Inhalt für Seiten, die in einem späteren Schritt gebaut werden. */
export function Placeholder({ title, text }: { title: string; text: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.wrap, { backgroundColor: theme.background }]}>
      <Text style={[styles.title, { color: theme.ink }]}>{title}</Text>
      <Text style={[styles.text, { color: theme.muted }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: space.xl, gap: space.sm },
  title: type.heading,
  text: { ...type.body, lineHeight: 22 },
});
