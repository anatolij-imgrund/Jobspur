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
} from '@/db/applications';
import { type Fact, FactList, toHref } from '@/features/application-detail/FactList';
import { StatusChanger } from '@/features/application-detail/StatusChanger';
import { StatusTimeline } from '@/features/application-detail/StatusTimeline';
import { daysSince, formatDate, formatDaysAgo } from '@/lib/dates';
import { space, type, useTheme } from '@/theme';
import {
  type Application,
  CHANNEL_LABELS,
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
      load();
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
            await deleteApplication(db, id);
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
            <Text style={[styles.statusSince, { color: theme.muted }]}>
              {waiting && days >= 14
                ? `seit ${days} Tagen ohne Antwort`
                : `seit ${formatDate(lastEvent.date)}`}
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
          <Text style={[styles.sectionTitle, { color: theme.ink }]}>Status ändern</Text>
          <StatusChanger
            current={app.status}
            appliedAt={app.appliedAt}
            onSave={async (event) => {
              await addStatusEvent(db, id, event);
              await load();
            }}
          />
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.ink }]}>Verlauf</Text>
          <StatusTimeline
            events={events}
            firstEventId={firstEventId}
            onDelete={async (event) => {
              await deleteStatusEvent(db, id, event.id);
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
