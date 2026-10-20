import { StyleSheet, Text, View } from 'react-native';

import { daysInMonth, monthName } from '@/lib/dates';
import { space, type, useTheme } from '@/theme';

type Props = {
  year: number;
  /** 1–12 */
  month: number;
  /** Heutiger Tag im Monat; Tage danach werden blass gezeichnet. */
  today: number;
  /** ISO-Daten der Bewerbungen in diesem Monat. */
  dates: string[];
};

/**
 * Ein Strich pro Tag des Monats. Je mehr Bewerbungen an einem Tag,
 * desto höher der Strich. Beantwortet auf einen Blick die Frage,
 * die beim Termin in der Agentur zuerst kommt.
 */
export function MonthStrip({ year, month, today, dates }: Props) {
  const theme = useTheme();
  const total = daysInMonth(year, month);

  const perDay = new Array<number>(total + 1).fill(0);
  for (const iso of dates) {
    const day = Number(iso.slice(8, 10));
    if (day >= 1 && day <= total) perDay[day] += 1;
  }
  const activeDays = perDay.filter((n) => n > 0).length;
  const count = dates.length;

  const summary =
    count === 0
      ? `Im ${monthName(month)} noch keine Bewerbung`
      : `${count} ${count === 1 ? 'Bewerbung' : 'Bewerbungen'} im ${monthName(month)}`;

  return (
    <View
      style={styles.wrap}
      accessible
      accessibilityLabel={`${summary}, an ${activeDays} von ${today} Tagen`}
    >
      <Text style={[styles.summary, { color: theme.ink }]}>{summary}</Text>
      <View style={styles.bars}>
        {perDay.slice(1).map((n, i) => {
          const day = i + 1;
          const future = day > today;
          return (
            <View key={day} style={styles.slot}>
              <View
                style={[
                  styles.bar,
                  n > 0
                    ? { height: 10 + Math.min(n, 3) * 8, backgroundColor: theme.accent }
                    : {
                        height: 4,
                        backgroundColor: theme.line,
                        opacity: future ? 0.45 : 1,
                      },
                  day === today && n === 0 && { backgroundColor: theme.muted },
                ]}
              />
            </View>
          );
        })}
      </View>
      <View style={styles.axis}>
        <Text style={[styles.axisText, { color: theme.muted }]}>1.</Text>
        <Text style={[styles.axisText, { color: theme.muted }]}>
          an {activeDays} von {today} Tagen
        </Text>
        <Text style={[styles.axisText, { color: theme.muted }]}>{total}.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: space.lg, paddingTop: space.lg, paddingBottom: space.md },
  summary: { ...type.title, marginBottom: space.lg },
  bars: { flexDirection: 'row', alignItems: 'flex-end', height: 36, gap: 2 },
  slot: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  bar: { width: '100%', maxWidth: 8, borderRadius: 2 },
  axis: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: space.sm,
  },
  axisText: type.small,
});
