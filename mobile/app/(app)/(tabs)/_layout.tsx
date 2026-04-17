import { Tabs } from 'expo-router';
import { useAuth } from '@/lib/auth';
import { theme } from '@/lib/theme';
import { Text } from 'react-native';

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  return (
    <Text
      style={{
        color: focused ? theme.color.gold : theme.color.textMuted,
        fontSize: 20,
      }}
    >
      {label}
    </Text>
  );
}

export default function AppLayout() {
  const { isAdmin } = useAuth();

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: theme.color.bgElevated },
        headerTintColor: theme.color.text,
        headerTitleStyle: { color: theme.color.gold, fontWeight: '700' },
        tabBarStyle: {
          backgroundColor: theme.color.bgElevated,
          borderTopColor: theme.color.border,
        },
        tabBarActiveTintColor: theme.color.gold,
        tabBarInactiveTintColor: theme.color.textMuted,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Products',
          tabBarIcon: ({ focused }) => <TabIcon label="◉" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="new"
        options={{
          title: 'New',
          tabBarIcon: ({ focused }) => <TabIcon label="+" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="team"
        options={{
          title: 'Team',
          href: isAdmin ? '/(app)/(tabs)/team' : null,
          tabBarIcon: ({ focused }) => <TabIcon label="◆" focused={focused} />,
        }}
      />
    </Tabs>
  );
}
