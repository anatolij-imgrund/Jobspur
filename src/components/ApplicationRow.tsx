import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { formatDate } from '@/lib/dates';
import { space, type, useTheme } from '@/theme';
import { CHANNEL_LABELS, type Application } from '@/types/application';

import { StatusBadge } from './StatusBadge';

type Props = { application: Application };

/** Eine Zeile in der Liste: Firma, Stelle, Datum und Weg, Status rechts. */
export function ApplicationRow({ application }: Props) {
  const theme = useTheme();
  const meta = [
    formatDate(application.appliedAt),
    CHANNEL_LABELS[application.channel],
    application.location,
    application.source === 'referral' ? 'Vermittlungsvorschlag' : null,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <Link
      href={{ pathname: '/bewerbung/[id]', params: { id: String(application.id) } }}
      asChild
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${application.company}, ${application.position}`}
        style={({ pressed }) => [
          styles.row,
          { backgroundColor: pressed ? theme.accentSoft : theme.surface },
        ]}
      >
        <View style={styles.main}>
          <Text style={[styles.company, { color: theme.ink }]} numberOfLines={1}>
            {application.company}
          </Text>
          <Text style={[styles.position, { color: theme.ink }]} numberOfLines={1}>
            {application.position}
          </Text>
          <Text style={[styles.meta, { color: theme.muted }]} numberOfLines={1}>
            {meta}
          </Text>
        </View>
        <StatusBadge status={application.status} />
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
  },
  main: { flex: 1, gap: 2 },
  company: type.heading,
  position: type.body,
  meta: { ...type.small, marginTop: 2 },
});
