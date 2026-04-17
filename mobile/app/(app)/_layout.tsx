import { Stack } from 'expo-router';
import { theme } from '@/lib/theme';

export default function AppStack() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: theme.color.bgElevated },
        headerTintColor: theme.color.gold,
        headerTitleStyle: { color: theme.color.gold, fontWeight: '700' },
        headerBackTitle: 'Back',
        contentStyle: { backgroundColor: theme.color.bg },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="product/[id]"
        options={{ title: 'Edit Product', presentation: 'card' }}
      />
    </Stack>
  );
}
