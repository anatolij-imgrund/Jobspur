import { Stack } from 'expo-router';
import { type SQLiteDatabase, SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';

import { DATABASE_NAME, migrateDbIfNeeded } from '@/db/schema';
import { getAppearance } from '@/db/settings';
// Setzt beim Import, wie Erinnerungen bei offener App angezeigt werden.
import '@/features/reminders/reminders';
import { useReminderTaps } from '@/features/reminders/useReminderTaps';
import { useTheme } from '@/theme';
import { applyAppearance } from '@/theme/appearance';

/**
 * Läuft, bevor der erste Bildschirm erscheint: Datenbank auf den neuesten
 * Stand bringen und die gewählte Darstellung setzen, damit nichts aufblitzt.
 */
async function initApp(db: SQLiteDatabase): Promise<void> {
  await migrateDbIfNeeded(db);
  applyAppearance(await getAppearance(db));
}

export default function RootLayout() {
  const theme = useTheme();
  useReminderTaps();

  return (
    <SQLiteProvider databaseName={DATABASE_NAME} onInit={initApp}>
      <StatusBar style="auto" />
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
    </SQLiteProvider>
  );
}
