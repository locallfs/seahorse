import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import 'react-native-reanimated';

import { AuthProvider, useAuth } from '@/lib/auth';
import { theme } from '@/lib/theme';
import { KeyboardDoneButton } from '@/lib/KeyboardDoneButton';
import { IntroSplash } from '@/lib/IntroSplash';

// Keep the native splash up until the intro video's first frame is ready —
// IntroSplash hides it (with its own timeout failsafe).
SplashScreen.preventAutoHideAsync().catch(() => {});

const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: theme.color.bg,
    card: theme.color.bgElevated,
    text: theme.color.text,
    border: theme.color.border,
    primary: theme.color.gold,
  },
};

function RootGate() {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    const inAuthGroup = segments[0] === '(app)';
    if (!user && inAuthGroup) router.replace('/login');
    else if (user && !inAuthGroup) router.replace('/');
  }, [user, loading, segments]);

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator color={theme.color.gold} size="large" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="(app)" />
    </Stack>
  );
}

export default function RootLayout() {
  const [introDone, setIntroDone] = useState(false);
  return (
    <ThemeProvider value={navTheme}>
      <AuthProvider>
        <RootGate />
      </AuthProvider>
      <KeyboardDoneButton />
      <StatusBar style="light" />
      {!introDone && <IntroSplash onDone={() => setIntroDone(true)} />}
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.color.bg,
  },
});
