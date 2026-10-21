import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Placeholder } from '@/components/Placeholder';
import { StatusBadge } from '@/components/StatusBadge';
import {
  addStatusEvent,
  deleteApplication,
  deleteStatusEvent,
  getApplication,
  getFirstStatusEventId,
  listStatusEvents,
  setReminderIds,
} from '@/db/applications';
import { type Fact, FactList, toHref } from '@/features/application-detail/FactList';
import { StatusChanger } from '@/features/application-detail/StatusChanger';
import { StatusTimeline } from '@/features/application-detail/StatusTimeline';
import { cancelReminders, setUpInterviewReminders } from '@/features/reminders/reminders';
import { background } from '@/lib/background';
import { daysSince, formatDate, formatDaysAgo, formatWeekdayDate, toIsoDate } from '@/lib/dates';
import { space, type, useTheme } from '@/theme';
import {
  type Application,
  CHANNEL_LABELS,
  INTERVIEW_MODE_LABELS,
  isFinal,
  SOURCE_LABELS,
  type StatusEvent,
} from '@/types/application';

type Loaded =
  | { state: 'loading' }
  | { state: 'missing' }
  | {
      state: 'ready';
      application: Application;
      events: StatusEvent[];
      firstEventId: number | null;
    };

export default function BewerbungDetailScreen() {
  const { id: idParam } = useLocalSearchParams<{ id: string }>();
  const id = Number(idParam);
  const db = useSQLiteContext();
  const theme = useTheme();
  const [data, setData] = useState<Loaded>({ state: 'loading' });

  const load = useCallback(async () => {
    const application = await getApplication(db, id);
    if (!application) {
      setData({ state: 'missing' });
      return;
    }
    const [events, firstEventId] = await Promise.all([
      listStatusEvents(db, id),
      getFirstStatusEventId(db, id),
    ]);
    setData({ state: 'ready', application, events, firstEventId });
  }, [db, id]);

  // Auch nach dem Zurückkommen vom Bearbeiten neu laden.
  useFocusEffect(
    useCallback(() => {
      background(load(), 'Laden der Bewerbung');
    }, [load]),
  );

  if (data.state === 'loading') {
    return <Stack.Screen options={{ title: '' }} />;
  }
  if (data.state === 'missing') {
    return (
      <>
        <Stack.Screen options={{ title: 'Nicht gefunden' }} />
        <Placeholder
          title="Diese Bewerbung gibt es nicht mehr"
          text="Sie wurde vermutlich gelöscht. Geh zurück zur Liste."
        />
      </>
    );
  }

  const { application: app, events, firstEventId } = data;
  const days = daysSince(app.appliedAt);
  const lastEvent = events[0];
  // Nur „Beworben“ heißt wirklich: noch gar keine Rückmeldung.
  const waiting = app.status === 'applied';

  const today = toIsoDate(new Date());
  // Einträge sind neueste zuerst sortiert.
  const floorDate = events.find((e) => e.date <= today)?.date ?? app.appliedAt;
  const upcomingInterview = isFinal(app.status)
    ? null
    : (events.filter((e) => e.status === 'interview' && e.date >= today).at(-1) ?? null);

  const statusLine = (() => {
    if (upcomingInterview) {
      const parts = [
        formatWeekdayDate(upcomingInterview.date),
        upcomingInterview.time && `${upcomingInterview.time} Uhr`,
        upcomingInterview.mode && INTERVIEW_MODE_LABELS[upcomingInterview.mode],
      ].filter(Boolean);
      return `am ${parts.join(', ')}`;
    }
    if (waiting && days >= 14) return `seit ${days} Tagen ohne Antwort`;
    return `${isFinal(app.status) ? 'am' : 'seit'} ${formatDate(lastEvent.date)}`;
  })();

  const facts: Fact[] = [
    { label: 'Beworben am', value: `${formatDate(app.appliedAt)}, ${formatDaysAgo(days)}` },
    { label: 'Weg', value: CHANNEL_LABELS[app.channel] },
    { label: 'Gefunden über', value: SOURCE_LABELS[app.source] },
  ];
  if (app.location) facts.push({ label: 'Ort', value: app.location });
  if (app.contactName) facts.push({ label: 'Ansprechperson', value: app.contactName });
  if (app.contactEmail) {
    facts.push({ label: 'E-Mail', value: app.contactEmail, href: `mailto:${app.contactEmail}` });
  }
  if (app.jobUrl) facts.push({ label: 'Anzeige', value: app.jobUrl, href: toHref(app.jobUrl) });

  const confirmDelete = () => {
    Alert.alert(
      'Bewerbung löschen?',
      `${app.company}, ${app.position} wird mit dem ganzen Verlauf gelöscht. Im Nachweis fehlt sie dann.`,
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Löschen',
          style: 'destructive',
          onPress: async () => {
            const reminders = await deleteApplication(db, id);
            await cancelReminders(reminders);
            router.back();
          },
        },
      ],
    );
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: '',
          headerRight: () => (
            <Pressable
              onPress={() =>
                router.push({ pathname: '/bewerbung/bearbeiten/[id]', params: { id: String(id) } })
              }
              accessibilityRole="button"
              hitSlop={12}
            >
              <Text style={[styles.headerAction, { color: theme.accent }]}>Bearbeiten</Text>
            </Pressable>
          ),
        }}
      />
      <ScrollView
        style={{ backgroundColor: theme.background }}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.head}>
          <Text style={[styles.company, { color: theme.muted }]} selectable>
            {app.company}
          </Text>
          <Text style={[styles.position, { color: theme.ink }]} selectable>
            {app.position}
          </Text>
          <View style={styles.statusRow}>
            <StatusBadge status={app.status} />
            <Text
              style={[
                styles.statusSince,
                { color: upcomingInterview ? theme.status.interview.fg : theme.muted },
                upcomingInterview && { fontWeight: '600' },
              ]}
            >
              {statusLine}
            </Text>
          </View>
        </View>

        <FactList facts={facts} />

        {app.notes && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.ink }]}>Notizen</Text>
            <Text style={[styles.notes, { color: theme.ink }]} selectable>
              {app.notes}
            </Text>
          </View>
        )}

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.ink }]}>
            {isFinal(app.status) ? 'Status' : 'Status ändern'}
          </Text>
          <StatusChanger
            current={app.status}
            floorDate={floorDate}
            upcomingInterview={upcomingInterview}
            onSave={async (event, options) => {
              const { eventId, cancelledReminderIds } = await addStatusEvent(db, id, event, {
                dropLaterInterviews: options.dropLaterInterviews,
              });
              await cancelReminders(cancelledReminderIds);

              // Ab hier ist der Termin gespeichert. Erinnerungen sind ein Zusatz:
              // Klappt das nicht, sagen wir es, aber der Eintrag bleibt.
              await load();
              if (options.remind) {
                const result = await setUpInterviewReminders({
                  applicationId: id,
                  company: app.company,
                  position: app.position,
                  date: event.date,
                  time: event.time ?? null,
                  mode: event.mode ?? null,
                });
                if (result.ids.length) await setReminderIds(db, eventId, result.ids);
                if (!result.ok) {
                  Alert.alert(
                    'Termin gespeichert, ohne Erinnerung',
                    result.reason === 'denied'
                      ? 'Damit die App erinnern kann, erlaube Benachrichtigungen in den Android-Einstellungen unter Apps.'
                      : 'Die Erinnerung ließ sich hier nicht einrichten. In Expo Go auf Android klappt das nicht zuverlässig, in der fertigen App schon.',
                  );
                }
              }
            }}
          />
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.ink }]}>Verlauf</Text>
          <StatusTimeline
            events={events}
            firstEventId={firstEventId}
            onDelete={async (event) => {
              const reminders = await deleteStatusEvent(db, id, event.id);
              await cancelReminders(reminders);
              await load();
            }}
          />
        </View>

        <Pressable
          onPress={confirmDelete}
          accessibilityRole="button"
          style={({ pressed }) => [styles.delete, { opacity: pressed ? 0.6 : 1 }]}
        >
          <Text style={[styles.deleteText, { color: theme.danger }]}>Bewerbung löschen</Text>
        </Pressable>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, gap: space.xl, paddingBottom: space.xxl * 2 },
  headerAction: { ...type.body, fontWeight: '600' },
  head: { gap: space.xs },
  company: { ...type.body, fontWeight: '500' },
  position: { ...type.title, fontSize: 24, lineHeight: 30 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.sm },
  statusSince: type.small,
  section: { gap: space.md },
  sectionTitle: type.heading,
  notes: { ...type.body, lineHeight: 22 },
  delete: { alignSelf: 'flex-start', paddingVertical: space.sm },
  deleteText: { ...type.body, fontWeight: '500' },
});
