import { StyleSheet, Text, View } from 'react-native';

import { radius, space, type, useTheme } from '@/theme';
import { STATUS_LABELS, type Status } from '@/types/application';

/** `label` ersetzt den Standardtext, z. B. „Gespräch 05.11.“ */
export function StatusBadge({ status, label }: { status: Status; label?: string }) {
  const theme = useTheme();
  const colors = theme.status[status];

  return (
    <View style={[styles.badge, { backgroundColor: colors.bg }]}>
      <Text style={[styles.text, { color: colors.fg }]}>{label ?? STATUS_LABELS[status]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: space.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  text: type.label,
});
