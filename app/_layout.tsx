import '../global.css';

import { Stack, usePathname, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'nativewind';
import { useEffect } from 'react';
import { Text, View } from 'react-native';

import { canAccessPathname, defaultRouteForRole } from '../lib/models';
import { configureNotifications } from '../lib/notifications';
import { AppStoreProvider, useAppStore } from '../lib/store';

export default function RootLayout() {
  return (
    <AppStoreProvider>
      <RootNavigator />
    </AppStoreProvider>
  );
}

function RootNavigator() {
  const router = useRouter();
  const pathname = usePathname();
  const { state, ready } = useAppStore();
  const { colorScheme, setColorScheme } = useColorScheme();
  const desired = state.themeMode;

  useEffect(() => {
    if (!ready) return;
    if (desired === 'system') return;
    if (desired === colorScheme) return;
    try {
      setColorScheme(desired);
    } catch {}
  }, [ready, desired, colorScheme, setColorScheme]);

  const isLoggedIn = Boolean(state.session.token);

  useEffect(() => {
    if (!ready) return;
    if (!isLoggedIn) return;
    if (!canAccessPathname(state.role, pathname)) router.replace(defaultRouteForRole(state.role));
  }, [ready, isLoggedIn, state.role, pathname, router]);

  useEffect(() => {
    void configureNotifications();
  }, []);

  if (!ready) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-950">
        <Text className="text-[16px] font-semibold text-white">Chargement…</Text>
        <Text className="mt-2 text-[13px] text-white/70">Initialisation du cache local</Text>
      </View>
    );
  }

  return (
    <>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Protected guard={!isLoggedIn}>
          <Stack.Screen name="sign-in" />
        </Stack.Protected>

        <Stack.Protected guard={isLoggedIn}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="reports/index" options={{ presentation: 'modal' }} />
        </Stack.Protected>
      </Stack>
    </>
  );
}
