import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, SectionList, StyleSheet, Text, View } from 'react-native';

import { ApplicationRow } from '@/components/ApplicationRow';
import { FilterBar } from '@/components/FilterBar';
import { Icon } from '@/components/Icon';
import { MonthStrip } from '@/components/MonthStrip';
import {
  countApplications,
  getApplicationDatesInMonth,
  listApplications,
  listUpcomingInterviews,
  type UpcomingInterview,
} from '@/db/applications';
import { insertSampleData } from '@/db/seed';
import { UpcomingInterviews } from '@/features/overview/UpcomingInterviews';
import { background } from '@/lib/background';
import { formatMonthKey, monthKey, toIsoDate } from '@/lib/dates';
import { radius, space, type, useTheme } from '@/theme';
import { type Application, isSaved, type Status } from '@/types/application';

type Section = { key: string; title: string; data: Application[] };

/**
 * Gruppiert die (bereits sortierte) Liste nach Monat. Vorgemerkte Stellen
 * stehen obenan: Die warten darauf, dass man sich bewirbt.
 */
function groupByMonth(items: Application[]): Section[] {
  const sections: Section[] = [];
  const saved = items.filter((a) => isSaved(a.status));
  if (saved.length > 0) {
    sections.push({ key: 'saved', title: 'Vorgemerkt, noch nicht abgeschickt', data: saved });
  }
  for (const item of items) {
    if (isSaved(item.status)) continue;
    const key = monthKey(item.appliedAt);
    const last = sections.at(-1);
    if (last?.key === key) {
      last.data.push(item);
    } else {
      sections.push({ key, title: formatMonthKey(key), data: [item] });
    }
  }
  return sections;
}

export default function OverviewScreen() {
  const db = useSQLiteContext();
  const theme = useTheme();

  const [items, setItems] = useState<Application[]>([]);
  const [total, setTotal] = useState(0);
  const [monthDates, setMonthDates] = useState<string[]>([]);
  const [upcoming, setUpcoming] = useState<UpcomingInterview[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<Status | null>(null);

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const today = now.getDate();

  const load = useCallback(async () => {
    const today = toIsoDate(new Date());
    const [list, count, dates, interviews] = await Promise.all([
      listApplications(db, { search, status, today }),
      countApplications(db),
      getApplicationDatesInMonth(db, year, month),
      listUpcomingInterviews(db, today),
    ]);
    setItems(list);
    setTotal(count);
    setMonthDates(dates);
    setUpcoming(interviews);
  }, [db, search, status, year, month]);

  // Lädt beim Öffnen des Tabs, nach Rückkehr von anderen Seiten
  // und wenn sich Suche oder Filter ändern.
  useFocusEffect(
    useCallback(() => {
      background(load(), 'Laden der Bewerbungen');
    }, [load]),
  );

  const sections = useMemo(() => groupByMonth(items), [items]);
  const isFiltered = search.trim().length > 0 || status !== null;

  const addSamples = async () => {
    await insertSampleData(db);
    await load();
  };

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <SectionList
        sections={sections}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => <ApplicationRow application={item} />}
        renderSectionHeader={({ section }) => (
          <Text
            style={[
              styles.sectionHeader,
              { color: theme.muted, backgroundColor: theme.background },
            ]}
          >
            {section.title}
          </Text>
        )}
        ItemSeparatorComponent={() => (
          <View style={[styles.separator, { backgroundColor: theme.line }]} />
        )}
        ListHeaderComponent={
          <>
            {upcoming.length > 0 && <UpcomingInterviews items={upcoming} />}
            <MonthStrip year={year} month={month} today={today} dates={monthDates} />
            {total > 0 && (
              <FilterBar
                search={search}
                onSearchChange={setSearch}
                status={status}
                onStatusChange={setStatus}
              />
            )}
          </>
        }
        ListEmptyComponent={
          total === 0 ? (
            <View style={styles.empty}>
              <Text style={[styles.emptyTitle, { color: theme.ink }]}>
                Noch keine Bewerbungen eingetragen
              </Text>
              <Text style={[styles.emptyText, { color: theme.muted }]}>
                Trag jede Bewerbung direkt nach dem Abschicken ein oder merk dir Stellen vor, bei
                denen du dich noch bewerben willst. Vor dem Termin bei der Agentur oder dem
                Jobcenter erstellst du daraus den Nachweis.
              </Text>
              <Pressable
                onPress={() => router.push('/bewerbung/neu')}
                accessibilityRole="button"
                style={[styles.primaryButton, { backgroundColor: theme.accent }]}
              >
                <Text style={[styles.primaryButtonText, { color: theme.accentInk }]}>
                  Erste Bewerbung eintragen
                </Text>
              </Pressable>
              {__DEV__ && (
                <Pressable onPress={addSamples} accessibilityRole="button" hitSlop={8}>
                  <Text style={[styles.devLink, { color: theme.accent }]}>
                    Beispieldaten einfügen (nur in der Entwicklung)
                  </Text>
                </Pressable>
              )}
            </View>
          ) : isFiltered ? (
            <View style={styles.empty}>
              <Text style={[styles.emptyText, { color: theme.muted }]}>
                Keine Bewerbung passt zu dieser Suche.
              </Text>
              <Pressable
                onPress={() => {
                  setSearch('');
                  setStatus(null);
                }}
                accessibilityRole="button"
                hitSlop={8}
              >
                <Text style={[styles.devLink, { color: theme.accent }]}>Filter zurücksetzen</Text>
              </Pressable>
            </View>
          ) : null
        }
        contentContainerStyle={styles.listContent}
        stickySectionHeadersEnabled
        keyboardShouldPersistTaps="handled"
      />

      {total > 0 && (
        <Pressable
          onPress={() => router.push('/bewerbung/neu')}
          accessibilityRole="button"
          accessibilityLabel="Neue Bewerbung eintragen"
          style={({ pressed }) => [
            styles.fab,
            { backgroundColor: theme.accent, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <Icon name="add" size={28} color={theme.accentInk} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  listContent: { paddingBottom: 96 },
  sectionHeader: {
    ...type.label,
    paddingHorizontal: space.lg,
    paddingTop: space.lg,
    paddingBottom: space.sm,
  },
  separator: { height: StyleSheet.hairlineWidth, marginLeft: space.lg },
  empty: {
    paddingHorizontal: space.xl,
    paddingTop: space.xl,
    gap: space.lg,
    alignItems: 'flex-start',
  },
  emptyTitle: type.heading,
  emptyText: { ...type.body, lineHeight: 22 },
  primaryButton: {
    paddingHorizontal: space.xl,
    paddingVertical: space.md,
    borderRadius: radius.md,
  },
  primaryButtonText: { ...type.body, fontWeight: '600' },
  devLink: { ...type.small, fontWeight: '500' },
  fab: {
    position: 'absolute',
    right: space.lg,
    bottom: space.lg,
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
});
