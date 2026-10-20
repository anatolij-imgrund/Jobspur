import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { space, type, useTheme } from '@/theme';

export type Fact = {
  label: string;
  value: string;
  /** Wenn gesetzt, ist der Wert antippbar (Link, E-Mail). */
  href?: string;
};

/** Zweispaltige Liste: Bezeichnung links, Wert rechts. */
export function FactList({ facts }: { facts: Fact[] }) {
  const theme = useTheme();

  return (
    <View style={[styles.list, { backgroundColor: theme.surface, borderColor: theme.line }]}>
      {facts.map((fact, index) => (
        <View
          key={fact.label}
          style={[
            styles.row,
            index > 0 && { borderTopColor: theme.line, borderTopWidth: StyleSheet.hairlineWidth },
          ]}
        >
          <Text style={[styles.label, { color: theme.muted }]}>{fact.label}</Text>
          {fact.href ? (
            <Pressable
              onPress={() => Linking.openURL(fact.href!)}
              accessibilityRole="link"
              style={styles.valueWrap}
            >
              <Text style={[styles.value, { color: theme.accent }]} numberOfLines={2}>
                {fact.value}
              </Text>
            </Pressable>
          ) : (
            <View style={styles.valueWrap}>
              <Text style={[styles.value, { color: theme.ink }]} selectable>
                {fact.value}
              </Text>
            </View>
          )}
        </View>
      ))}
    </View>
  );
}

/** Ergänzt ein fehlendes https://, damit „muster.de/jobs“ auch öffnet. */
export function toHref(url: string): string {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

const styles = StyleSheet.create({
  list: { borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  row: {
    flexDirection: 'row',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
  },
  label: { ...type.small, width: 108, paddingTop: 2 },
  valueWrap: { flex: 1 },
  value: { ...type.body, lineHeight: 21 },
});
