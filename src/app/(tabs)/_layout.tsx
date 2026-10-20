import { Tabs } from 'expo-router';

import { Icon } from '@/components/Icon';
import { useTheme } from '@/theme';

export default function TabLayout() {
  const theme = useTheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.accent,
        tabBarInactiveTintColor: theme.muted,
        tabBarStyle: { backgroundColor: theme.surface, borderTopColor: theme.line },
        headerStyle: { backgroundColor: theme.background },
        headerTitleStyle: { color: theme.ink },
        headerShadowVisible: false,
        sceneStyle: { backgroundColor: theme.background },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Bewerbungen',
          tabBarIcon: ({ color, size }) => <Icon name="list" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="nachweis"
        options={{
          title: 'Nachweis',
          tabBarIcon: ({ color, size }) => <Icon name="document" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="einstellungen"
        options={{
          title: 'Einstellungen',
          tabBarIcon: ({ color, size }) => <Icon name="settings" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
