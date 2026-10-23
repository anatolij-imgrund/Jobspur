import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/Icon';
import { radius, space, type, useTheme } from '@/theme';

import type { SuggestionKey, SuggestionRow } from './suggestions';

type Props = {
  rows: SuggestionRow[];
  /** Mit den angehakten Feldern; leer heißt „nichts übernehmen“. */
  onDone: (keys: SuggestionKey[]) => void;
};

/**
 * Fenster von unten: „Auf dem Foto gefunden“. Jeder Fund mit Häkchen;
 * was nicht stimmt, hakt man ab. Nur gezeigt, solange `rows` etwas enthält.
 */
export function SuggestionSheet({ rows, onDone }: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [checked, setChecked] = useState<Set<SuggestionKey>>(
    () => new Set(rows.filter((r) => r.checked).map((r) => r.key)),
  );

  const toggle = (key: SuggestionKey) =>
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  return (
    <Modal transparent animationType="slide" visible onRequestClose={() => onDone([])}>
      <Pressable
        style={styles.backdrop}
        onPress={() => onDone([])}
        accessibilityLabel="Schließen, nichts übernehmen"
      />
      <View
        style={[
          styles.sheet,
          { backgroundColor: theme.surface, paddingBottom: Math.max(insets.bottom, space.lg) },
        ]}
      >
        <Text style={[styles.title, { color: theme.ink }]}>Auf dem Foto gefunden</Text>
        <Text style={[styles.hint, { color: theme.muted }]}>
          Nimm das Häkchen weg, wo etwas nicht stimmt. Korrigieren kannst du danach im Formular.
        </Text>

        <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
          {rows.map((row) => {
            const on = checked.has(row.key);
            return (
              <Pressable
                key={row.key}
                onPress={() => toggle(row.key)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: on }}
                accessibilityLabel={`${row.label}: ${row.value}`}
                style={({ pressed }) => [
                  styles.row,
                  { borderColor: on ? theme.accent : theme.line },
                  pressed && { backgroundColor: theme.accentSoft },
                ]}
              >
                <View
                  style={[
                    styles.box,
                    on
                      ? { backgroundColor: theme.accent, borderColor: theme.accent }
                      : { borderColor: theme.muted },
                  ]}
                >
                  {on && <Icon name="check" size={16} color={theme.accentInk} />}
                </View>
                <View style={styles.flex}>
                  <Text style={[styles.label, { color: theme.muted }]}>{row.label}</Text>
                  <Text style={[styles.value, { color: theme.ink }]}>{row.value}</Text>
                  {row.replaces && (
                    <Text style={[styles.replaces, { color: theme.muted }]} numberOfLines={1}>
                      ersetzt „{row.replaces}“
                    </Text>
                  )}
                </View>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.actions}>
          <Pressable onPress={() => onDone([])} accessibilityRole="button" hitSlop={8}>
            <Text style={[styles.cancel, { color: theme.muted }]}>Nichts übernehmen</Text>
          </Pressable>
          <Pressable
            onPress={() => onDone([...checked])}
            disabled={checked.size === 0}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.apply,
              { backgroundColor: theme.accent, opacity: checked.size === 0 ? 0.4 : pressed ? 0.85 : 1 },
            ]}
          >
            <Text style={[styles.applyText, { color: theme.accentInk }]}>
              {checked.size > 0 ? `${checked.size} übernehmen` : 'Übernehmen'}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: {
    maxHeight: '80%',
    paddingHorizontal: space.lg,
    paddingTop: space.lg,
    borderTopLeftRadius: radius.md * 1.5,
    borderTopRightRadius: radius.md * 1.5,
    gap: space.sm,
  },
  title: type.heading,
  hint: { ...type.small, lineHeight: 19 },
  list: { flexGrow: 0 },
  listContent: { gap: space.sm, paddingVertical: space.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.md,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  box: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: type.small,
  value: { ...type.body, fontWeight: '600' },
  replaces: type.small,
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: space.lg,
    paddingTop: space.sm,
  },
  cancel: { ...type.body, fontWeight: '500' },
  apply: {
    minHeight: 44,
    paddingHorizontal: space.lg,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyText: { ...type.body, fontWeight: '600' },
});
