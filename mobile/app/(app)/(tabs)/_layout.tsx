import { Tabs, useRouter } from 'expo-router';
import { useAuth } from '@/lib/auth';
import { theme } from '@/lib/theme';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

function HeaderLogo() {
  return (
    <Image
      source={require('../../../assets/images/ReefNerds.png')}
      style={titleStyles.logo}
      resizeMode="contain"
    />
  );
}

const titleStyles = StyleSheet.create({
  logo: { width: 48, height: 48, borderRadius: 8, marginLeft: 12 },
});

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
  const router = useRouter();

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
          headerLeft: () => <HeaderLogo />,
          tabBarIcon: ({ focused }) => <TabIcon label="◉" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="new"
        options={{
          title: 'New Product',
          tabBarLabel: 'New',
          tabBarIcon: ({ focused }) => <TabIcon label="+" focused={focused} />,
          headerLeft: () => (
            <Pressable
              onPress={() => router.navigate('/')}
              style={{ paddingLeft: 12, paddingRight: 6 }}
              hitSlop={12}
            >
              <Text style={{ color: theme.color.gold, fontSize: 24, fontWeight: '700' }}>
                ‹
              </Text>
            </Pressable>
          ),
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
