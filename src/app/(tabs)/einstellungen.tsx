import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ChoiceGroup } from '@/components/form/ChoiceGroup';
import { Icon } from '@/components/Icon';
import { listRecipients } from '@/db/recipients';
import {
  type Appearance,
  APPEARANCES,
  getProfile,
  saveAppearance,
} from '@/db/settings';
import { BackupSection } from '@/features/backup/BackupSection';
import { background } from '@/lib/background';
import { radius, space, type, useTheme } from '@/theme';
import { useAppearance } from '@/theme/appearance';
import {
  hasPostalAddress,
  type Profile,
  type Recipient,
  RECIPIENT_KIND_LABELS,
} from '@/types/profile';

const APPEARANCE_LABELS: Record<Appearance, string> = {
  system: 'Wie das Handy',
  light: 'Hell',
  dark: 'Dunkel',
};

export default function EinstellungenScreen() {
  const db = useSQLiteContext();
  const theme = useTheme();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const { appearance, setAppearance } = useAppearance();

  const load = useCallback(() => {
    background(
      Promise.all([getProfile(db), listRecipients(db)]).then(([p, r]) => {
        setProfile(p);
        setRecipients(r);
      }),
      'Laden der Einstellungen',
    );
  }, [db]);
  useFocusEffect(load);

  // Sofort umschalten, gespeichert wird im Hintergrund.
  const changeAppearance = (value: Appearance) => {
    setAppearance(value);
    background(saveAppearance(db, value), 'Speichern der Darstellung');
  };

  if (!profile) return null;

  const address = [profile.street, [profile.zip, profile.city].filter(Boolean).join(' ')]
    .filter(Boolean)
    .join(', ');

  const card = [styles.card, { backgroundColor: theme.surface, borderColor: theme.line }];

  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.content}
    >
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.ink }]}>Deine Angaben</Text>
        <Pressable
          onPress={() => router.push('/profil')}
          accessibilityRole="button"
          accessibilityLabel="Deine Angaben bearbeiten"
          style={({ pressed }) => [card, styles.rowCard, pressed && { backgroundColor: theme.accentSoft }]}
        >
          <View style={styles.flex}>
            {profile.name ? (
              <>
                <Text style={[styles.primary, { color: theme.ink }]}>{profile.name}</Text>
                {address !== '' && (
                  <Text style={[styles.secondary, { color: theme.muted }]}>{address}</Text>
                )}
              </>
            ) : (
              <>
                <Text style={[styles.primary, { color: theme.ink }]}>Name und Anschrift eintragen</Text>
                <Text style={[styles.secondary, { color: theme.muted }]}>
                  Erscheinen oben im Nachweis und unter der Unterschrift.
                </Text>
              </>
            )}
          </View>
          <Text style={[styles.action, { color: theme.accent }]}>
            {profile.name ? 'Ändern' : 'Eintragen'}
          </Text>
        </Pressable>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.ink }]}>Empfänger der Nachweise</Text>
        <Text style={[styles.intro, { color: theme.muted }]}>
          Agentur für Arbeit, Jobcenter oder eine andere Stelle, mit Kundennummer und auf Wunsch
          mit Anschrift für den Postweg.
        </Text>

        {recipients.length > 0 && (
          <View style={card}>
            {recipients.map((r, i) => (
              <Pressable
                key={r.id}
                onPress={() =>
                  router.push({ pathname: '/empfaenger/[id]', params: { id: String(r.id) } })
                }
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.listRow,
                  i > 0 && { borderTopColor: theme.line, borderTopWidth: StyleSheet.hairlineWidth },
                  pressed && { backgroundColor: theme.accentSoft },
                ]}
              >
                <Text style={[styles.primary, { color: theme.ink }]}>{r.name}</Text>
                <Text style={[styles.secondary, { color: theme.muted }]}>
                  {[
                    r.name === RECIPIENT_KIND_LABELS[r.kind] ? null : RECIPIENT_KIND_LABELS[r.kind],
                    r.customerNumber && `Kundennr. ${r.customerNumber}`,
                    hasPostalAddress(r) ? 'mit Anschrift' : null,
                  ]
                    .filter(Boolean)
                    .join(', ') || 'Ohne Kundennummer'}
                </Text>
              </Pressable>
            ))}
          </View>
        )}

        <Pressable
          onPress={() => router.push('/empfaenger/neu')}
          accessibilityRole="button"
          style={({ pressed }) => [styles.addButton, { borderColor: theme.line }, pressed && { backgroundColor: theme.accentSoft }]}
        >
          <Icon name="add" size={20} color={theme.accent} />
          <Text style={[styles.addText, { color: theme.accent }]}>Stelle hinzufügen</Text>
        </Pressable>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.ink }]}>Darstellung</Text>
        <ChoiceGroup
          options={APPEARANCES}
          labels={APPEARANCE_LABELS}
          value={appearance}
          onChange={changeAppearance}
          accessibilityLabel="Darstellung"
        />
      </View>

      <BackupSection onRestored={load} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: space.lg, gap: space.xxl, paddingBottom: space.xxl * 2 },
  section: { gap: space.md },
  sectionTitle: type.heading,
  intro: { ...type.small, lineHeight: 19, marginTop: -space.xs },
  card: { borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  rowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.lg,
  },
  listRow: { paddingHorizontal: space.lg, paddingVertical: space.md, gap: 2 },
  primary: { ...type.body, fontWeight: '600' },
  secondary: { ...type.small, lineHeight: 19 },
  action: { ...type.body, fontWeight: '600' },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  addText: { ...type.body, fontWeight: '600' },
});
