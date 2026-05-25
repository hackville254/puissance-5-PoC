import { Alert, Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { AppBar } from '../../components/ui/AppBar';
import { Card } from '../../components/ui/Card';
import { Chip } from '../../components/ui/Chip';
import { Icon } from '../../components/ui/Icon';
import { ListScreen } from '../../components/ui/ListScreen';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { canAccessPathname, canPerform } from '../../lib/models';
import { routes } from '../../lib/routes';
import { useAppStore } from '../../lib/store';

export default function SitesScreen() {
  const router = useRouter();
  const { state, dispatch } = useAppStore();

  return (
    <ListScreen
      data={state.sites}
      keyExtractor={item => item.id}
      ListHeaderComponent={
        <>
      <AppBar
        title="Sites"
        subtitle="Gestion (cache local)"
        left={{ icon: 'chevron-left', label: 'Retour', onPress: () => router.back() }}
        right={[
          ...(canPerform(state.role, 'manage_sites')
            ? [{ icon: 'plus' as const, label: 'Nouveau site', onPress: () => router.push(routes.newSite) }]
            : []),
          ...(canAccessPathname(state.role, '/templates')
            ? [{ icon: 'list' as const, label: 'Listes de contrôle', onPress: () => router.push(routes.templates) }]
            : [])
        ]}
      />

      <SectionHeader title="Liste" right={<Chip label={`${state.sites.length}`} tone="neutral" />} />
        </>
      }
      renderItem={({ item: site }) => (
        <View className="mb-3">
          <Card>
            <Pressable
              onPress={() => router.push(routes.siteDetail(site.id))}
              className="active:opacity-90"
            >
              <View className="flex-row items-start justify-between">
                <View className="flex-1 pr-4">
                  <Text className="text-[15px] font-semibold text-slate-900 dark:text-white">{site.name}</Text>
                  <Text className="mt-1 text-[13px] text-slate-500 dark:text-slate-300">
                    {site.address} • {site.city}
                  </Text>
                  <View className="mt-3 flex-row flex-wrap gap-2">
                    {site.tags.slice(0, 4).map(t => (
                      <Chip key={t} label={t} tone="neutral" />
                    ))}
                    <Chip label={`${site.geofenceRadiusM}m`} tone="brand" />
                  </View>
                </View>
                {canPerform(state.role, 'manage_sites') ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Supprimer"
                    onPress={() =>
                      Alert.alert('Supprimer', `Supprimer “${site.name}” ?`, [
                        { text: 'Annuler', style: 'cancel' },
                        { text: 'Supprimer', style: 'destructive', onPress: () => dispatch({ type: 'deleteSite', siteId: site.id }) }
                      ])
                    }
                    className="h-11 w-11 items-center justify-center rounded-2xl bg-rose-50 dark:bg-rose-950"
                  >
                    <Icon name="trash" size={18} color="#E11D48" />
                  </Pressable>
                ) : null}
              </View>
            </Pressable>
          </Card>
        </View>
      )}
    />
  );
}
