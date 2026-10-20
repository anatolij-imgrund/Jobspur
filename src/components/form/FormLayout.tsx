import { useHeaderHeight } from 'expo-router/react-navigation';
import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { radius, space, type, useTheme } from '@/theme';

type Props = {
  children: ReactNode;
  submitLabel: string;
  onSubmit: () => void;
  submitting: boolean;
  /** Meldung über dem Knopf, z. B. wenn das Speichern fehlschlug. */
  error?: string;
  /** Zusätzlicher Inhalt unter dem Formular, z. B. ein Löschen-Knopf. */
  footerExtra?: ReactNode;
};

/**
 * Gemeinsamer Rahmen aller Formulare: scrollbarer Inhalt, darunter der
 * Speichern-Knopf, der mit der Tastatur nach oben wandert.
 */
export function FormLayout({
  children,
  submitLabel,
  onSubmit,
  submitting,
  error,
  footerExtra,
}: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();

  return (
    <KeyboardAvoidingView style={styles.flex} behavior="padding" keyboardVerticalOffset={headerHeight}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {children}
        {footerExtra}
      </ScrollView>

      <View
        style={[
          styles.footer,
          {
            backgroundColor: theme.background,
            borderTopColor: theme.line,
            paddingBottom: Math.max(insets.bottom, space.md),
          },
        ]}
      >
        {error && (
          <Text style={[styles.error, { color: theme.danger }]} accessibilityLiveRegion="assertive">
            {error}
          </Text>
        )}
        <Pressable
          onPress={onSubmit}
          disabled={submitting}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.submit,
            { backgroundColor: theme.accent, opacity: pressed || submitting ? 0.85 : 1 },
          ]}
        >
          {submitting ? (
            <ActivityIndicator color={theme.accentInk} />
          ) : (
            <Text style={[styles.submitText, { color: theme.accentInk }]}>{submitLabel}</Text>
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

/** Zwischenüberschrift für eine Gruppe von Feldern. */
export function FormGroupTitle({ children }: { children: string }) {
  const theme = useTheme();
  return <Text style={[styles.groupTitle, { color: theme.muted }]}>{children}</Text>;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: space.lg, gap: space.xl, paddingBottom: space.xxl },
  groupTitle: { ...type.label, marginTop: space.sm, marginBottom: -space.sm },
  footer: {
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  submit: {
    minHeight: 52,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitText: { ...type.body, fontWeight: '600' },
  error: { ...type.small, marginBottom: space.sm },
});
