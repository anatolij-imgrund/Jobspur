import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ChoiceGroup } from '@/components/form/ChoiceGroup';
import { DateField } from '@/components/form/DateField';
import { Field } from '@/components/form/Field';
import { listRecipients } from '@/db/recipients';
import { getReportData, type ReportData } from '@/db/report';
import { getProfile } from '@/db/settings';
import { createPdf, printHtml, sharePdf } from '@/features/report/exportReport';
import {
  renderReport,
  reportFileName,
  reportStats,
  reportTitle,
} from '@/features/report/renderReport';
import { type DateRange, formatDate, presetRange, toIsoDate } from '@/lib/dates';
import { radius, space, type, useTheme } from '@/theme';
import { hasPostalAddress, type Profile, type Recipient } from '@/types/profile';

const PRESETS = ['thisMonth', 'lastMonth', 'last4Weeks', 'custom'] as const;
type Preset = (typeof PRESETS)[number];
const PRESET_LABELS: Record<Preset, string> = {
  thisMonth: 'Dieser Monat',
  lastMonth: 'Letzter Monat',
  last4Weeks: 'Letzte 4 Wochen',
  custom: 'Eigener Zeitraum',
};

/** „Für mich“ bekommt die Id 0, gespeicherte Stellen ihre echte Id. */
const FOR_ME = '0';

export default function NachweisScreen() {
  const db = useSQLiteContext();
  const theme = useTheme();

  const [preset, setPreset] = useState<Preset>('thisMonth');
  const [custom, setCustom] = useState<DateRange>(() => presetRange('thisMonth'));
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [recipientKey, setRecipientKey] = useState(FOR_ME);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [data, setData] = useState<ReportData | null>(null);
  const [busy, setBusy] = useState<'share' | 'print' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const range = preset === 'custom' ? custom : presetRange(preset);
  const rangeInvalid = range.from > range.to;
  const recipient = recipients.find((r) => String(r.id) === recipientKey) ?? null;

  // Empfänger und Profil neu laden, wenn man aus den Einstellungen zurückkommt.
  useFocusEffect(
    useCallback(() => {
      Promise.all([listRecipients(db), getProfile(db)]).then(([r, p]) => {
        setRecipients(r);
        setProfile(p);
        // Gelöschte Stelle nicht ausgewählt lassen.
        setRecipientKey((key) => (key === FOR_ME || r.some((x) => String(x.id) === key) ? key : FOR_ME));
      });
    }, [db]),
  );

  // Daten für die Vorschau neu holen, wenn sich der Zeitraum ändert oder der Tab wieder sichtbar wird.
  const { from, to } = range;
  const loadData = useCallback(() => {
    if (from > to) return;
    getReportData(db, from, to).then(setData);
  }, [db, from, to]);
  useFocusEffect(loadData);
  useEffect(() => setError(null), [from, to, recipientKey]);

  const stats = data && !rangeInvalid ? reportStats(data) : null;
  const missingName = recipient !== null && !profile?.name;

  const buildHtml = async () => {
    // Frisch laden, damit gerade Eingetragenes sicher drin ist.
    const fresh = await getReportData(db, from, to);
    return renderReport({
      data: fresh,
      profile: profile ?? (await getProfile(db)),
      recipient,
      createdAt: toIsoDate(new Date()),
    });
  };

  const share = async () => {
    setBusy('share');
    setError(null);
    try {
      const uri = await createPdf(await buildHtml(), reportFileName(recipient, from, to));
      await sharePdf(uri, reportTitle(recipient));
    } catch (e) {
      console.error(e);
      setError('Das PDF konnte nicht erstellt werden. Bitte versuche es noch einmal.');
    } finally {
      setBusy(null);
    }
  };

  const print = async () => {
    setBusy('print');
    setError(null);
    try {
      await printHtml(await buildHtml());
    } catch (e) {
      // Abbrechen im Druckdialog meldet Android ebenfalls als Fehler; das ist kein Problem.
      console.warn(e);
    } finally {
      setBusy(null);
    }
  };

  const recipientOptions = [FOR_ME, ...recipients.map((r) => String(r.id))];
  const recipientLabels = Object.fromEntries([
    [FOR_ME, 'Für mich'],
    ...recipients.map((r) => [String(r.id), r.name]),
  ]) as Record<string, string>;

  const card = [styles.card, { backgroundColor: theme.surface, borderColor: theme.line }];

  return (
    <ScrollView style={{ backgroundColor: theme.background }} contentContainerStyle={styles.content}>
      <Field label="Zeitraum">
        <ChoiceGroup
          options={PRESETS}
          labels={PRESET_LABELS}
          value={preset}
          onChange={(next) => {
            if (next === 'custom' && preset !== 'custom') setCustom(range);
            setPreset(next);
          }}
          accessibilityLabel="Zeitraum"
        />
      </Field>

      {preset === 'custom' ? (
        <View style={styles.customRange}>
          <Field label="Von">
            <DateField
              value={custom.from}
              onChange={(iso) => setCustom((c) => ({ ...c, from: iso }))}
              accessibilityLabel="Von"
            />
          </Field>
          <Field
            label="Bis"
            error={rangeInvalid ? '„Bis“ liegt vor „Von“.' : undefined}
          >
            <DateField
              value={custom.to}
              onChange={(iso) => setCustom((c) => ({ ...c, to: iso }))}
              minimumDate={custom.from}
              invalid={rangeInvalid}
              accessibilityLabel="Bis"
            />
          </Field>
        </View>
      ) : (
        <Text style={[styles.rangeText, { color: theme.muted }]}>
          {formatDate(range.from)} bis {formatDate(range.to)}
        </Text>
      )}

      <Field
        label="Für wen?"
        hint={
          recipient
            ? hasPostalAddress(recipient)
              ? 'Als Brief mit Anschrift für einen Fensterumschlag, mit Kundennummer und Unterschriftszeile.'
              : 'Mit Kundennummer und Unterschriftszeile.'
            : 'Nur die Übersicht, ohne Nummern und Unterschrift.'
        }
      >
        <ChoiceGroup
          options={recipientOptions}
          labels={recipientLabels}
          value={recipientKey}
          onChange={setRecipientKey}
          accessibilityLabel="Empfänger"
        />
      </Field>
      {recipients.length === 0 && (
        <Pressable onPress={() => router.push('/empfaenger/neu')} accessibilityRole="button" hitSlop={8}>
          <Text style={[styles.link, { color: theme.accent }]}>
            Agentur für Arbeit oder Jobcenter hinzufügen
          </Text>
        </Pressable>
      )}

      <View style={card}>
        {stats === null ? (
          <ActivityIndicator color={theme.muted} />
        ) : (
          <>
            <Text style={[styles.bigNumber, { color: theme.ink }]}>
              {stats.applications === 0
                ? 'Keine Bewerbungen im Zeitraum'
                : `${stats.applications} ${stats.applications === 1 ? 'Bewerbung' : 'Bewerbungen'}`}
            </Text>
            {[
              stats.referrals > 0 &&
                `davon ${stats.referrals} auf ${stats.referrals === 1 ? 'einen Vermittlungsvorschlag' : 'Vermittlungsvorschläge'}`,
              stats.interviews > 0 &&
                `${stats.interviews} ${stats.interviews === 1 ? 'Vorstellungsgespräch' : 'Vorstellungsgespräche'}`,
              stats.followUps > 0 &&
                `${stats.followUps} ${stats.followUps === 1 ? 'Rückmeldung' : 'Rückmeldungen'} zu früheren Bewerbungen`,
            ]
              .filter(Boolean)
              .map((line) => (
                <Text key={line as string} style={[styles.statLine, { color: theme.muted }]}>
                  {line}
                </Text>
              ))}
          </>
        )}
      </View>

      {missingName && (
        <View style={[styles.notice, { backgroundColor: theme.status.interview.bg }]}>
          <Text style={[styles.noticeText, { color: theme.status.interview.fg }]}>
            Im Nachweis fehlt noch dein Name.
          </Text>
          <Pressable onPress={() => router.push('/profil')} accessibilityRole="button" hitSlop={8}>
            <Text style={[styles.noticeLink, { color: theme.status.interview.fg }]}>Eintragen</Text>
          </Pressable>
        </View>
      )}

      {error && <Text style={[styles.error, { color: theme.danger }]}>{error}</Text>}

      <View style={styles.actions}>
        <Pressable
          onPress={share}
          disabled={busy !== null || rangeInvalid}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.primary,
            { backgroundColor: theme.accent, opacity: pressed || busy || rangeInvalid ? 0.7 : 1 },
          ]}
        >
          {busy === 'share' ? (
            <ActivityIndicator color={theme.accentInk} />
          ) : (
            <Text style={[styles.primaryText, { color: theme.accentInk }]}>PDF erstellen und teilen</Text>
          )}
        </Pressable>
        <Pressable
          onPress={print}
          disabled={busy !== null || rangeInvalid}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.secondary,
            { borderColor: theme.line, opacity: pressed || busy || rangeInvalid ? 0.7 : 1 },
          ]}
        >
          {busy === 'print' ? (
            <ActivityIndicator color={theme.accent} />
          ) : (
            <Text style={[styles.secondaryText, { color: theme.accent }]}>Vorschau und Drucken</Text>
          )}
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, gap: space.xl, paddingBottom: space.xxl * 2 },
  customRange: { gap: space.lg },
  rangeText: { ...type.body, marginTop: -space.md },
  link: { ...type.body, fontWeight: '600', marginTop: -space.sm },
  card: {
    padding: space.lg,
    gap: space.xs,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 72,
    justifyContent: 'center',
  },
  bigNumber: { ...type.title, fontSize: 22 },
  statLine: type.body,
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.md,
    padding: space.md,
    borderRadius: radius.md,
  },
  noticeText: { ...type.body, flex: 1 },
  noticeLink: { ...type.body, fontWeight: '700' },
  error: type.small,
  actions: { gap: space.md },
  primary: {
    minHeight: 52,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: { ...type.body, fontWeight: '600' },
  secondary: {
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: { ...type.body, fontWeight: '600' },
});
