import { Stack } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';

import { DATABASE_NAME, migrateDbIfNeeded } from '@/db/schema';
import { useTheme } from '@/theme';

export default function RootLayout() {
  const theme = useTheme();

  return (
    <SQLiteProvider databaseName={DATABASE_NAME} onInit={migrateDbIfNeeded}>
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
      </Stack>
    </SQLiteProvider>
  );
}
