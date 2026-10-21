import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { useNow } from '@/hooks/useNow';
import { formatDate, toLocalDateTime } from '@/lib/dates';
import { radius, space, type, useTheme } from '@/theme';
import { INTERVIEW_MODE_LABELS, STATUS_LABELS, type StatusEvent } from '@/types/application';

type Props = {
  /** Neuester Eintrag zuerst. */
  events: StatusEvent[];
  /** Dieser Eintrag („Beworben“) lässt sich nicht entfernen. */
  firstEventId: number | null;
  onDelete: (event: StatusEvent) => void;
};

/** Senkrechter Verlauf: Punkt, Status, Datum, Notiz. Der oberste ist der aktuelle. */
export function StatusTimeline({ events, firstEventId, onDelete }: Props) {
  const theme = useTheme();

  const now = useNow();
  const isPlanned = (e: StatusEvent) =>
    e.status === 'interview' && toLocalDateTime(e.date, e.time ?? '23:59').getTime() > now;

  const confirmDelete = (event: StatusEvent) => {
    Alert.alert(
      isPlanned(event) ? 'Termin entfernen?' : 'Eintrag entfernen?',
      isPlanned(event)
        ? `Das Gespräch am ${formatDate(event.date)} wird samt Erinnerung entfernt.`
        : `„${STATUS_LABELS[event.status]}“ vom ${formatDate(event.date)} wird aus dem Verlauf entfernt.`,
      [
        { text: 'Abbrechen', style: 'cancel' },
        { text: 'Entfernen', style: 'destructive', onPress: () => onDelete(event) },
      ],
    );
  };

  return (
    <View>
      {events.map((event, index) => {
        const current = index === 0;
        const last = index === events.length - 1;
        const colors = theme.status[event.status];
        const removable = event.id !== firstEventId;
        const planned = isPlanned(event);
        const details = [
          event.time && `${event.time} Uhr`,
          event.mode && INTERVIEW_MODE_LABELS[event.mode],
        ].filter(Boolean);

        return (
          <View key={event.id} style={styles.item}>
            <View style={styles.rail}>
              <View
                style={[
                  styles.dot,
                  current
                    ? { backgroundColor: colors.fg, borderColor: colors.fg }
                    : { backgroundColor: theme.background, borderColor: theme.muted },
                ]}
              />
              {!last && <View style={[styles.line, { backgroundColor: theme.line }]} />}
            </View>

            <View style={[styles.body, !last && styles.bodySpacing]}>
              <View style={styles.titleRow}>
                <Text
                  style={[
                    styles.status,
                    { color: current ? colors.fg : theme.ink },
                    current && { fontWeight: '600' },
                  ]}
                >
                  {STATUS_LABELS[event.status]}
                </Text>
                {planned && (
                  <View style={[styles.planned, { borderColor: colors.fg }]}>
                    <Text style={[styles.plannedText, { color: colors.fg }]}>geplant</Text>
                  </View>
                )}
                <Text style={[styles.date, { color: theme.muted }]}>{formatDate(event.date)}</Text>
                {removable && (
                  <Pressable
                    onPress={() => confirmDelete(event)}
                    hitSlop={12}
                    accessibilityRole="button"
                    accessibilityLabel={`Eintrag ${STATUS_LABELS[event.status]} vom ${formatDate(event.date)} entfernen`}
                    style={styles.remove}
                  >
                    <Icon name="close" size={16} color={theme.muted} />
                  </Pressable>
                )}
              </View>
              {details.length > 0 && (
                <Text style={[styles.note, { color: theme.ink }]}>{details.join(', ')}</Text>
              )}
              {event.note && (
                <Text style={[styles.note, { color: theme.muted }]}>{event.note}</Text>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const DOT = 12;

const styles = StyleSheet.create({
  item: { flexDirection: 'row', gap: space.md },
  rail: { width: DOT, alignItems: 'center' },
  dot: { width: DOT, height: DOT, borderRadius: DOT / 2, borderWidth: 2, marginTop: 5 },
  line: { flex: 1, width: 2, marginTop: space.xs },
  body: { flex: 1, gap: 2 },
  bodySpacing: { paddingBottom: space.lg },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  status: type.body,
  date: { ...type.small, flex: 1 },
  remove: { padding: 2 },
  planned: {
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  plannedText: { ...type.label, fontSize: 11 },
  note: { ...type.small, lineHeight: 19 },
});
