import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { radius, space, type, useTheme } from '@/theme';
import { STATUS_LABELS, STATUSES, type Status } from '@/types/application';

import { Icon } from './Icon';

type Props = {
  search: string;
  onSearchChange: (value: string) => void;
  status: Status | null;
  onStatusChange: (value: Status | null) => void;
};

export function FilterBar({ search, onSearchChange, status, onStatusChange }: Props) {
  const theme = useTheme();
  const options: (Status | null)[] = [null, ...STATUSES];

  return (
    <View style={styles.wrap}>
      <View style={[styles.search, { backgroundColor: theme.surface, borderColor: theme.line }]}>
        <Icon name="search" size={18} color={theme.muted} />
        <TextInput
          value={search}
          onChangeText={onSearchChange}
          placeholder="Firma, Stelle oder Ort suchen"
          placeholderTextColor={theme.muted}
          style={[styles.input, { color: theme.ink }]}
          returnKeyType="search"
          autoCorrect={false}
          accessibilityLabel="Bewerbungen durchsuchen"
        />
        {search.length > 0 && (
          <Pressable
            onPress={() => onSearchChange('')}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Suche leeren"
          >
            <Icon name="close" size={18} color={theme.muted} />
          </Pressable>
        )}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
      >
        {options.map((option) => {
          const selected = option === status;
          return (
            <Pressable
              key={option ?? 'all'}
              onPress={() => onStatusChange(option)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              style={[
                styles.chip,
                selected
                  ? { backgroundColor: theme.accent, borderColor: theme.accent }
                  : { backgroundColor: 'transparent', borderColor: theme.line },
              ]}
            >
              <Text style={[styles.chipText, { color: selected ? theme.accentInk : theme.ink }]}>
                {option ? STATUS_LABELS[option] : 'Alle'}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.md, paddingBottom: space.md },
  search: {
    marginHorizontal: space.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    minHeight: 44,
  },
  input: { flex: 1, ...type.body, paddingVertical: space.sm },
  chips: { paddingHorizontal: space.lg, gap: space.sm },
  chip: {
    paddingHorizontal: space.md,
    paddingVertical: 7,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  chipText: { ...type.small, fontWeight: '500' },
});
