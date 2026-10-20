import { Pressable, StyleSheet, Text, View } from 'react-native';

import { radius, space, type, useTheme } from '@/theme';

type Props<T extends string> = {
  options: readonly T[];
  labels: Record<T, string>;
  value: T;
  onChange: (value: T) => void;
  accessibilityLabel: string;
};

/** Einfachauswahl als umbrechende Reihe von Chips. */
export function ChoiceGroup<T extends string>({
  options,
  labels,
  value,
  onChange,
  accessibilityLabel,
}: Props<T>) {
  const theme = useTheme();

  return (
    <View style={styles.group} accessibilityRole="radiogroup" accessibilityLabel={accessibilityLabel}>
      {options.map((option) => {
        const selected = option === value;
        return (
          <Pressable
            key={option}
            onPress={() => onChange(option)}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            style={[
              styles.chip,
              selected
                ? { backgroundColor: theme.accentSoft, borderColor: theme.accent }
                : { backgroundColor: theme.surface, borderColor: theme.line },
            ]}
          >
            <Text
              style={[
                styles.text,
                { color: selected ? theme.accent : theme.ink, fontWeight: selected ? '600' : '400' },
              ]}
            >
              {labels[option]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  chip: {
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  text: type.body,
});
