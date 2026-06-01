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

function TabItem({
  label,
  icon,
  focused,
  active,
  inactive,
  labelActive,
  labelInactive,
  onPress,
  compact
}: {
  label: string;
  icon: IconName;
  focused: boolean;
  active: string;
  inactive: string;
  labelActive: string;
  labelInactive: string;
  onPress: () => void;
  compact: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityLabel={label}
      accessibilityState={{ selected: focused }}
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        minWidth: 0,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: compact ? 6 : 8,
        opacity: pressed ? 0.85 : 1
      })}
    >
      <View
        style={{
          minWidth: compact ? 56 : 62,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 18,
          paddingVertical: compact ? 4 : 6,
          paddingHorizontal: 4,
          backgroundColor: focused ? 'rgba(37, 99, 235, 0.12)' : 'transparent'
        }}
      >
        <Icon name={icon} size={compact ? 22 : 24} color={focused ? active : inactive} strokeWidth={2.35} />
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.82}
          style={{
            marginTop: 4,
            fontSize: compact ? 10 : 11,
            lineHeight: compact ? 12 : 13,
            fontWeight: focused ? '700' : '600',
            color: focused ? labelActive : labelInactive,
            textAlign: 'center',
            maxWidth: compact ? 58 : 64
          }}
        >
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

export function WhatsAppTabBar(props: TabBarProps) {
  const { colorScheme } = useColorScheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { state } = useAppStore();
  const [open, setOpen] = useState(false);
  const [anim] = useState(() => new Animated.Value(0));

  const isDark = colorScheme === 'dark';
  const bg = isDark ? '#0F172A' : '#FFFFFF';
  const border = isDark ? '#1E293B' : '#E2E8F0';
  const active = '#2563EB';
  const inactive = isDark ? '#94A3B8' : '#64748B';
  const labelActive = active;
  const labelInactive = inactive;

  const tabs = useMemo(
    () => [
      { name: 'index', label: 'Accueil', icon: 'house' as const },
      { name: 'controls', label: 'Contrôles', icon: 'clipboard-check' as const },
      { name: 'incidents', label: 'Incidents', icon: 'circle-alert' as const },
      { name: 'reports', label: 'Rapports', icon: 'file-text' as const },
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
      case 'reports':
        return routes.reports;
      case 'profile':
        return routes.profile;
      default:
        return routes.home;
    }
  };
  const visibleTabs = useMemo(() => tabs.filter(tab => canAccessPathname(state.role, routePathForTab(tab.name))), [state.role, tabs]);
  const compact = visibleTabs.length >= 4;
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
      <View
        style={{
          backgroundColor: 'transparent',
          paddingBottom: bottomPad,
          paddingTop: 8,
          paddingHorizontal: 12
        }}
      >
        <View
          style={{
            backgroundColor: bg,
            borderColor: border,
            borderWidth: 1,
            borderRadius: 24,
            paddingVertical: 8,
            paddingHorizontal: 8,
            shadowColor: active,
            shadowOpacity: isDark ? 0.2 : 0.1,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 4 },
            elevation: 6
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            {leftTabs.map(tab => {
              const routeIndex = props.state.routes.findIndex(r => matchesTab(r.name, tab.name));
              const focused = routeIndex === props.state.index;
              return (
                <TabItem
                  key={tab.name}
                  label={tab.label}
                  icon={tab.icon}
                  focused={focused}
                  active={active}
                  inactive={inactive}
                  labelActive={labelActive}
                  labelInactive={labelInactive}
                  onPress={() => navigateToTab(tab.name)}
                  compact={compact}
                />
              );
            })}

            <Pressable
              onPress={openSheet}
              accessibilityRole="button"
              accessibilityLabel="Plus d’actions"
              style={({ pressed }) => ({
                flex: 1,
                minWidth: 0,
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: compact ? 6 : 8,
                opacity: pressed ? 0.85 : 1
              })}
            >
              <View
                style={{
                  minWidth: compact ? 56 : 62,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 18,
                  paddingVertical: compact ? 4 : 6,
                  paddingHorizontal: 4
                }}
              >
                <View
                  style={{
                    width: compact ? 38 : 42,
                    height: compact ? 38 : 42,
                    borderRadius: compact ? 19 : 21,
                    backgroundColor: active,
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Icon name="plus" size={compact ? 20 : 22} color="#FFFFFF" strokeWidth={2.6} />
                </View>
                <Text
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.82}
                  style={{
                    marginTop: 4,
                    fontSize: compact ? 10 : 11,
                    lineHeight: compact ? 12 : 13,
                    fontWeight: '700',
                    color: labelInactive,
                    textAlign: 'center',
                    maxWidth: compact ? 58 : 64
                  }}
                >
                  Plus
                </Text>
              </View>
            </Pressable>

            {rightTabs.map(tab => {
              const routeIndex = props.state.routes.findIndex(r => matchesTab(r.name, tab.name));
              const focused = routeIndex === props.state.index;
              return (
                <TabItem
                  key={tab.name}
                  label={tab.label}
                  icon={tab.icon}
                  focused={focused}
                  active={active}
                  inactive={inactive}
                  labelActive={labelActive}
                  labelInactive={labelInactive}
                  onPress={() => navigateToTab(tab.name)}
                  compact={compact}
                />
              );
            })}
          </View>
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
              backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              paddingBottom: bottomPad + 6,
              borderTopWidth: 1,
              borderTopColor: border
            }}
          >
            <View style={{ alignItems: 'center', paddingTop: 10 }}>
              <View
                style={{
                  width: 40,
                  height: 4,
                  borderRadius: 999,
                  backgroundColor: isDark ? '#334155' : '#CBD5E1'
                }}
              />
            </View>

            <View style={{ paddingHorizontal: 12, paddingTop: 14, flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {actions.map(a => (
                <Pressable
                  key={a.label}
                  onPress={() => {
                    closeSheet();
                    a.onPress();
                  }}
                  style={({ pressed }) => ({
                    width: '48%',
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingVertical: 16,
                    paddingHorizontal: 12,
                    borderRadius: 16,
                    opacity: pressed ? 0.88 : 1,
                    borderWidth: 1,
                    borderColor: isDark ? '#1E293B' : '#E2E8F0',
                    backgroundColor: pressed ? (isDark ? '#111827' : '#F8FAFC') : isDark ? '#0B1220' : '#FFFFFF'
                  })}
                >
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 14,
                      backgroundColor: isDark ? '#111827' : '#F1F5F9',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: 8
                    }}
                  >
                    <Icon name={a.icon} size={18} color={active} strokeWidth={2.4} />
                  </View>
                  <Text
                    style={{
                      fontSize: 13,
                      lineHeight: 18,
                      fontWeight: '700',
                      color: isDark ? '#FFFFFF' : '#111827',
                      textAlign: 'center'
                    }}
                  >
                    {a.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </Animated.View>
        </View>
      </Modal>
    </>
  );
}
