import { useRouter } from 'expo-router';
import { useColorScheme } from 'nativewind';
import { useMemo, useState } from 'react';
import { Animated, Modal, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { canPerform, canAccessPathname } from '../../lib/models';
import { routes } from '../../lib/routes';
import { useAppStore } from '../../lib/store';
import type { IconName } from '../ui/Icon';
import { Icon } from '../ui/Icon';

type TabBarProps = {
  state: { index: number; routes: Array<{ key: string; name: string }> };
  navigation: { emit: (e: any) => any; navigate: (name: string, params?: any) => void };
};

type Action = {
  label: string;
  icon: IconName;
  onPress: () => void;
};

export function WhatsAppTabBar(props: TabBarProps) {
  const { colorScheme } = useColorScheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { state } = useAppStore();
  const [open, setOpen] = useState(false);
  const [anim] = useState(() => new Animated.Value(0));

  const isDark = colorScheme === 'dark';
  const bg = isDark ? '#111B21' : '#FFFFFF';
  const border = isDark ? '#1F2C34' : '#E5E7EB';
  const active = '#25D366';
  const inactive = isDark ? '#A3B3BC' : '#6B7280';
  const labelActive = isDark ? '#FFFFFF' : '#111827';
  const labelInactive = isDark ? '#A3B3BC' : '#6B7280';

  const tabs = useMemo(
    () => [
      { name: 'index', label: 'Accueil', icon: 'house' as const },
      { name: 'controls', label: 'Contrôles', icon: 'clipboard-check' as const },
      { name: 'incidents', label: 'Incidents', icon: 'circle-alert' as const },
      { name: 'profile', label: 'Profil', icon: 'user' as const }
    ],
    []
  );
  const routePathForTab = (tabName: string) => {
    switch (tabName) {
      case 'index':
        return routes.home;
      case 'controls':
        return routes.controls;
      case 'incidents':
        return routes.incidents;
      case 'profile':
        return routes.profile;
      default:
        return routes.home;
    }
  };
  const visibleTabs = useMemo(() => tabs.filter(tab => canAccessPathname(state.role, routePathForTab(tab.name))), [state.role, tabs]);
  const splitIndex = Math.ceil(visibleTabs.length / 2);
  const leftTabs = visibleTabs.slice(0, splitIndex);
  const rightTabs = visibleTabs.slice(splitIndex);

  const actions: Action[] = useMemo(() => {
    const list: Array<Action & { visible: boolean }> = [
      { label: 'Nouveau contrôle', icon: 'plus-circle', onPress: () => router.push(routes.newControl), visible: canPerform(state.role, 'plan_controls') },
      { label: 'Nouvel incident', icon: 'triangle-alert', onPress: () => router.push(routes.newIncident), visible: canPerform(state.role, 'manage_incidents') },
      { label: 'Planning', icon: 'calendar', onPress: () => router.push(routes.planning), visible: canAccessPathname(state.role, routes.planning) },
      { label: 'Sites', icon: 'building', onPress: () => router.push(routes.sites), visible: canAccessPathname(state.role, routes.sites) },
      { label: 'Listes de contrôle', icon: 'clipboard-list', onPress: () => router.push(routes.templates), visible: canAccessPathname(state.role, routes.templates) },
      { label: 'Rapports', icon: 'file-text', onPress: () => router.push(routes.reports), visible: canAccessPathname(state.role, routes.reports) }
    ];
    return list.filter(a => a.visible).map(({ visible: _visible, ...a }) => a);
  }, [router, state.role]);

  const openSheet = () => {
    setOpen(true);
    anim.setValue(0);
    Animated.timing(anim, { toValue: 1, duration: 180, useNativeDriver: false }).start();
  };

  const closeSheet = () => {
    Animated.timing(anim, { toValue: 0, duration: 140, useNativeDriver: false }).start(({ finished }) => {
      if (finished) setOpen(false);
    });
  };

  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [360, 0] });
  const overlayOpacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.35] });

  const bottomPad = Math.max(10, insets.bottom);

  const matchesTab = (routeName: string, tabName: string) =>
    routeName === tabName || routeName === `${tabName}/index` || routeName.startsWith(`${tabName}/`);

  const fallbackRouteForTab = (tabName: string) => routePathForTab(tabName);
  const navigateToTab = (tabName: string) => {
    if (!canAccessPathname(state.role, fallbackRouteForTab(tabName))) return router.replace(routes.profile);
    const routeIndex = props.state.routes.findIndex(r => matchesTab(r.name, tabName));
    if (routeIndex < 0) return router.replace(fallbackRouteForTab(tabName));
    const route = props.state.routes[routeIndex];
    const event = props.navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
    if (!event?.defaultPrevented) props.navigation.navigate(route.name);
  };

  return (
    <>
      <View style={{ backgroundColor: bg, borderTopColor: border, borderTopWidth: 1, paddingBottom: bottomPad, paddingTop: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 6 }}>
          {leftTabs.map(tab => {
            const routeIndex = props.state.routes.findIndex(r => matchesTab(r.name, tab.name));
            const focused = routeIndex === props.state.index;
            return (
              <Pressable
                key={tab.name}
                onPress={() => navigateToTab(tab.name)}
                style={({ pressed }) => ({
                  flex: 1,
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingVertical: 8,
                  opacity: pressed ? 0.85 : 1
                })}
              >
                <Icon name={tab.icon} size={26} color={focused ? active : inactive} strokeWidth={2.4} />
                <Text style={{ marginTop: 4, fontSize: 11, fontWeight: focused ? '700' : '600', color: focused ? labelActive : labelInactive }}>
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}

          <Pressable
            onPress={openSheet}
            style={{
              width: 64,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: -6
            }}
          >
            <View
              style={{
                width: 54,
                height: 54,
                borderRadius: 27,
                backgroundColor: active,
                alignItems: 'center',
                justifyContent: 'center',
                shadowColor: '#000',
                shadowOpacity: isDark ? 0.35 : 0.18,
                shadowRadius: 10,
                shadowOffset: { width: 0, height: 8 },
                elevation: 8,
                transform: [{ translateY: -10 }]
              }}
            >
              <Icon name="plus" size={28} color="#FFFFFF" strokeWidth={2.6} />
            </View>
            <Text style={{ marginTop: -4, fontSize: 11, fontWeight: '700', color: labelInactive }}>Plus</Text>
          </Pressable>

          {rightTabs.map(tab => {
            const routeIndex = props.state.routes.findIndex(r => matchesTab(r.name, tab.name));
            const focused = routeIndex === props.state.index;
            return (
              <Pressable
                key={tab.name}
                onPress={() => navigateToTab(tab.name)}
                style={({ pressed }) => ({
                  flex: 1,
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingVertical: 8,
                  opacity: pressed ? 0.85 : 1
                })}
              >
                <Icon name={tab.icon} size={26} color={focused ? active : inactive} strokeWidth={2.4} />
                <Text style={{ marginTop: 4, fontSize: 11, fontWeight: focused ? '700' : '600', color: focused ? labelActive : labelInactive }}>
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <Modal visible={open} transparent animationType="none" onRequestClose={closeSheet}>
        <View style={{ flex: 1 }}>
          <Pressable onPress={closeSheet} style={{ flex: 1 }}>
            <Animated.View style={{ flex: 1, backgroundColor: '#000', opacity: overlayOpacity }} />
          </Pressable>

          <Animated.View
            style={{
              transform: [{ translateY }],
              backgroundColor: isDark ? '#0B141A' : '#FFFFFF',
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              paddingBottom: bottomPad,
              borderTopWidth: 1,
              borderTopColor: border
            }}
          >
            <View style={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 14, fontWeight: '800', color: isDark ? '#FFFFFF' : '#111827' }}>Menu</Text>
              <Pressable onPress={closeSheet} style={{ height: 36, width: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 18, backgroundColor: isDark ? '#111B21' : '#F3F4F6' }}>
                <Icon name="x" size={18} color={isDark ? '#FFFFFF' : '#111827'} strokeWidth={2.4} />
              </Pressable>
            </View>

            <View style={{ paddingHorizontal: 10, paddingBottom: 6 }}>
              {actions.map(a => (
                <Pressable
                  key={a.label}
                  onPress={() => {
                    closeSheet();
                    a.onPress();
                  }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: 14,
                    paddingHorizontal: 12,
                    borderRadius: 16
                  }}
                >
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      backgroundColor: isDark ? '#111B21' : '#F3F4F6',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: 12
                    }}
                  >
                    <Icon name={a.icon} size={18} color={active} strokeWidth={2.4} />
                  </View>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: isDark ? '#FFFFFF' : '#111827' }}>{a.label}</Text>
                </Pressable>
              ))}
            </View>
          </Animated.View>
        </View>
      </Modal>
    </>
  );
}
