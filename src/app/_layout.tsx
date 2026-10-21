import { Stack } from 'expo-router';
import { type SQLiteDatabase, SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { type ReactNode, useCallback } from 'react';

import { DATABASE_NAME, migrateDbIfNeeded } from '@/db/schema';
import { getAppearance } from '@/db/settings';
// Setzt beim Import, wie Erinnerungen bei offener App angezeigt werden.
import '@/features/reminders/reminders';
import { useReminderTaps } from '@/features/reminders/useReminderTaps';
import { useTheme } from '@/theme';
import { AppearanceProvider, useAppearance, useResolvedScheme } from '@/theme/appearance';

export default function RootLayout() {
  return (
    <AppearanceProvider>
      <Database>
        <AppStack />
      </Database>
    </AppearanceProvider>
  );
}

/**
 * Öffnet die Datenbank. Läuft, bevor der erste Bildschirm erscheint:
 * Schema auf den neuesten Stand bringen und die gewählte Darstellung setzen,
 * damit nichts aufblitzt.
 */
function Database({ children }: { children: ReactNode }) {
  const { setAppearance } = useAppearance();
  const initApp = useCallback(
    async (db: SQLiteDatabase) => {
      await migrateDbIfNeeded(db);
      setAppearance(await getAppearance(db));
    },
    [setAppearance],
  );

  return (
    <SQLiteProvider databaseName={DATABASE_NAME} onInit={initApp}>
      {children}
    </SQLiteProvider>
  );
}

/**
 * Die Navigation mit Farben aus der Darstellung. Muss ein eigener Baustein
 * innerhalb von SQLiteProvider sein: Der zeichnet seine Kinder nur neu, wenn
 * sich die Datenbank ändert, sonst blieben Kopfleisten in der alten Farbe.
 */
function AppStack() {
  const theme = useTheme();
  const scheme = useResolvedScheme();
  useReminderTaps();

  return (
    <>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: theme.background },
          headerTintColor: theme.accent,
          headerTitleStyle: { color: theme.ink },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: theme.background },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="bewerbung/neu"
          options={{ title: 'Neue Bewerbung', presentation: 'modal' }}
        />
        <Stack.Screen name="bewerbung/[id]" options={{ title: '' }} />
        <Stack.Screen
          name="bewerbung/bearbeiten/[id]"
          options={{ title: 'Bewerbung bearbeiten', presentation: 'modal' }}
        />
        <Stack.Screen name="profil" options={{ title: 'Deine Angaben', presentation: 'modal' }} />
        <Stack.Screen
          name="empfaenger/neu"
          options={{ title: 'Neue Stelle', presentation: 'modal' }}
        />
        <Stack.Screen
          name="empfaenger/[id]"
          options={{ title: 'Stelle bearbeiten', presentation: 'modal' }}
        />
      </Stack>
    </>
  );
}
