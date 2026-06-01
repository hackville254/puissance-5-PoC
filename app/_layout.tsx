import '../global.css';

import { Stack, usePathname, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'nativewind';
import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';

import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { canAccessPathname, defaultRouteForRole, ROLE_LABELS } from '../lib/models';
import type { Role } from '../lib/models';
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
  const [introVisible, setIntroVisible] = useState(false);
  const [introTokenSeen, setIntroTokenSeen] = useState<string | null>(null);

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
    if (!isLoggedIn) {
      setIntroVisible(false);
      setIntroTokenSeen(null);
      return;
    }
    const token = state.session.token;
    if (!token) return;
    if (introTokenSeen === token) return;
    setIntroTokenSeen(token);
    setIntroVisible(true);
  }, [ready, isLoggedIn, state.session.token, introTokenSeen]);

  useEffect(() => {
    if (!ready) return;
    if (!isLoggedIn && pathname !== '/sign-in') {
      router.replace('/sign-in');
      return;
    }
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
        <Text className="mt-2 text-[13px] text-white/70">Préparation de votre espace</Text>
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
          <Stack.Screen name="sites/index" />
          <Stack.Screen name="sites/new" />
          <Stack.Screen name="sites/[id]" />
          <Stack.Screen name="templates/index" />
          <Stack.Screen name="templates/new" />
          <Stack.Screen name="templates/[id]" />
        </Stack.Protected>
      </Stack>
      <RoleIntroModal
        visible={introVisible && isLoggedIn}
        role={state.role}
        userName={state.session.userName}
        onClose={() => setIntroVisible(false)}
        onGoToSpace={() => {
          setIntroVisible(false);
          router.replace(defaultRouteForRole(state.role));
        }}
      />
    </>
  );
}

function RoleIntroModal({
  visible,
  role,
  userName,
  onClose,
  onGoToSpace
}: {
  visible: boolean;
  role: Role;
  userName: string;
  onClose: () => void;
  onGoToSpace: () => void;
}) {
  const title = useMemo(() => `Bienvenue${userName ? `, ${userName}` : ''}`, [userName]);
  const content = useMemo(() => {
    switch (role) {
      case 'agent':
        return {
          headline: 'Espace Agent',
          summary: 'Tu exécutes les contrôles sur site : checklist, preuves photo, validation et clôture.',
          bullets: ['Accès aux contrôles et incidents', 'Planning en consultation', 'Pas de création de sites / templates']
        };
      case 'controller':
        return {
          headline: 'Espace Contrôleur',
          summary: 'Tu planifies et évalues la qualité : audits, notation, conformité et rapports.',
          bullets: ['Planification des contrôles', 'Gestion des listes de contrôle', 'Accès aux rapports et suppression si nécessaire']
        };
      case 'ops':
        return {
          headline: 'Espace Exploitation',
          summary: 'Tu pilotes l’activité : supervision, référentiels, incidents et priorités terrain.',
          bullets: ['Administration des sites', 'Planification + incidents', 'Peut changer de rôle (mode PoC)']
        };
      case 'client':
        return {
          headline: 'Espace Client',
          summary: 'Tu consultes les résultats : rapports, historique et partage.',
          bullets: ['Accès aux rapports (lecture)', 'Pas d’accès aux contrôles / incidents', 'Partage PDF sur mobile']
        };
      default:
        return {
          headline: 'Espace',
          summary: 'Interface adaptée à ton accès.',
          bullets: []
        };
    }
  }, [role]);

  const roleLabel = ROLE_LABELS[role];

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: 'rgba(2,6,23,0.5)', padding: 18, justifyContent: 'center' }}>
        <Pressable onPress={() => {}} style={{ width: '100%' }}>
          <Card className="border-slate-200 dark:border-slate-800">
            <Text className="text-[12px] font-semibold text-slate-500 dark:text-slate-300">CONNEXION</Text>
            <Text className="mt-2 text-[20px] font-extrabold text-slate-900 dark:text-white">{title}</Text>
            <Text className="mt-1 text-[14px] font-semibold text-brand-700 dark:text-brand-300">{roleLabel}</Text>

            <View className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950">
              <Text className="text-[15px] font-semibold text-slate-900 dark:text-white">{content.headline}</Text>
              <Text className="mt-1 text-[13px] leading-5 text-slate-600 dark:text-slate-300">{content.summary}</Text>
            </View>

            {content.bullets.length ? (
              <View className="mt-4 gap-2">
                {content.bullets.slice(0, 4).map(b => (
                  <View key={b} className="flex-row items-start">
                    <Text className="mr-2 text-[14px] text-brand-700 dark:text-brand-300">•</Text>
                    <Text className="flex-1 text-[14px] leading-6 text-slate-700 dark:text-slate-200">{b}</Text>
                  </View>
                ))}
              </View>
            ) : null}

            <View className="mt-6 flex-row gap-3">
              <Button label="Compris" variant="secondary" onPress={onClose} className="flex-1" />
              <Button label="Accéder à mon espace" onPress={onGoToSpace} className="flex-1" />
            </View>
          </Card>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
