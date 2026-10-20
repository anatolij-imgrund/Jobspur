import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { space, type, useTheme } from '@/theme';

type Props = {
  label: string;
  optional?: boolean;
  error?: string;
  hint?: string;
  children: ReactNode;
};

/** Beschriftung, Eingabe und Fehlermeldung eines Formularfelds. */
export function Field({ label, optional, error, hint, children }: Props) {
  const theme = useTheme();
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: theme.ink }]}>
        {label}
        {optional && <Text style={{ color: theme.muted, fontWeight: '400' }}> (optional)</Text>}
      </Text>
      {children}
      {error ? (
        <Text style={[styles.message, { color: theme.danger }]} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : hint ? (
        <Text style={[styles.message, { color: theme.muted }]}>{hint}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: space.sm },
  label: { ...type.small, fontWeight: '600' },
  message: type.small,
});
