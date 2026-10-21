import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { UpcomingInterview } from '@/db/applications';
import { formatWeekdayDate, toIsoDate } from '@/lib/dates';
import { radius, space, type, useTheme } from '@/theme';
import { INTERVIEW_MODE_LABELS } from '@/types/application';

/** Höchstens so viele Termine, damit die Liste darunter sichtbar bleibt. */
const MAX_ITEMS = 3;

function dayLabel(iso: string): string {
  const today = new Date();
  if (iso === toIsoDate(today)) return 'Heute';
  today.setDate(today.getDate() + 1);
  if (iso === toIsoDate(today)) return 'Morgen';
  return formatWeekdayDate(iso);
}

/** Die nächsten Vorstellungsgespräche oben in der Übersicht. */
export function UpcomingInterviews({ items }: { items: UpcomingInterview[] }) {
  const theme = useTheme();
  const colors = theme.status.interview;

  return (
    <View style={styles.wrap}>
      <Text style={[styles.title, { color: theme.ink }]}>
        {items.length === 1 ? 'Nächster Termin' : 'Nächste Termine'}
      </Text>
      <View style={[styles.card, { backgroundColor: colors.bg }]}>
        {items.slice(0, MAX_ITEMS).map((item, i) => {
          const { event } = item;
          const when = [dayLabel(event.date), event.time && `${event.time} Uhr`]
            .filter(Boolean)
            .join(', ');
          return (
            <Pressable
              key={event.id}
              onPress={() =>
                router.push({
                  pathname: '/bewerbung/[id]',
                  params: { id: String(item.applicationId) },
                })
              }
              accessibilityRole="button"
              accessibilityLabel={`Gespräch ${when} bei ${item.company}`}
              style={({ pressed }) => [
                styles.row,
                i > 0 && { borderTopColor: colors.fg, borderTopWidth: StyleSheet.hairlineWidth },
                pressed && { opacity: 0.7 },
              ]}
            >
              <View style={styles.when}>
                <Text style={[styles.whenText, { color: colors.fg }]}>{when}</Text>
                {event.mode && (
                  <Text style={[styles.mode, { color: colors.fg }]}>
                    {INTERVIEW_MODE_LABELS[event.mode]}
                  </Text>
                )}
              </View>
              <Text style={[styles.company, { color: theme.ink }]} numberOfLines={1}>
                {item.company}
              </Text>
              <Text style={[styles.position, { color: theme.muted }]} numberOfLines={1}>
                {item.position}
              </Text>
            </Pressable>
          );
        })}
        {items.length > MAX_ITEMS && (
          <Text style={[styles.more, { color: colors.fg }]}>
            und {items.length - MAX_ITEMS} weitere
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: space.lg, paddingTop: space.lg, gap: space.sm },
  title: type.heading,
  card: { borderRadius: radius.md, paddingHorizontal: space.lg },
  row: { paddingVertical: space.md, gap: 2 },
  when: { flexDirection: 'row', alignItems: 'baseline', gap: space.sm },
  whenText: { ...type.body, fontWeight: '700' },
  mode: type.small,
  company: { ...type.body, fontWeight: '600' },
  position: type.small,
  more: { ...type.small, fontWeight: '600', paddingBottom: space.md },
});
