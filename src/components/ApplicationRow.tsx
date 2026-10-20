import { router } from 'expo-router';
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

  // Bewusst kein <Link asChild>: Link reicht einen Stil als Funktion
  // auf Android nicht an die Pressable weiter, dann fehlen Padding und Layout.
  return (
    <Pressable
      onPress={() =>
        router.push({ pathname: '/bewerbung/[id]', params: { id: String(application.id) } })
      }
      accessibilityRole="button"
      accessibilityLabel={`${application.company}, ${application.position}`}
      style={({ pressed }) => ({
        backgroundColor: pressed ? theme.accentSoft : 'transparent',
      })}
    >
      <View style={styles.row}>
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
      </View>
    </Pressable>
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
