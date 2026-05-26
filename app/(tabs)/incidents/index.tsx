import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';

import { AppBar } from '../../../components/ui/AppBar';
import { Card } from '../../../components/ui/Card';
import { Chip } from '../../../components/ui/Chip';
import { ListScreen } from '../../../components/ui/ListScreen';
import { SectionHeader } from '../../../components/ui/SectionHeader';
import type { Severity } from '../../../lib/models';
import { canPerform } from '../../../lib/models';
import { routes } from '../../../lib/routes';
import { useAppStore } from '../../../lib/store';

const filters: Array<{ label: string; value: Severity | 'all' }> = [
  { label: 'Tout', value: 'all' },
  { label: 'Critique', value: 'critique' },
  { label: 'Majeure', value: 'majeure' },
  { label: 'Mineure', value: 'mineure' }
];

function toneFor(severity: Severity) {
  switch (severity) {
    case 'critique':
      return 'danger' as const;
    case 'majeure':
      return 'warning' as const;
    case 'mineure':
      return 'neutral' as const;
  }
}

export default function IncidentsScreen() {
  const router = useRouter();
  const { state } = useAppStore();
  const [filter, setFilter] = useState<Severity | 'all'>('all');

  const incidents = useMemo(() => {
    const list = state.incidents.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    if (filter === 'all') return list;
    return list.filter(i => i.severity === filter);
  }, [state.incidents, filter]);

  const activeCount = state.incidents.filter(i => i.status !== 'clos').length;

  return (
    <ListScreen
      data={incidents}
      keyExtractor={item => item.id}
      ListHeaderComponent={
        <>
      <AppBar
        title="Incidents"
        subtitle={`${activeCount} actif${activeCount > 1 ? 's' : ''} • workflow de correction`}
        right={
          canPerform(state.role, 'manage_incidents')
            ? [{ icon: 'plus', label: 'Nouvel incident', onPress: () => router.push(routes.newIncident) }]
            : undefined
        }
      />

      <View className="mt-5 flex-row flex-wrap gap-2">
        {filters.map(f => (
          <Card
            key={f.value}
            onPress={() => setFilter(f.value)}
            className={filter === f.value ? 'px-4 py-3 bg-brand-600 border-brand-600' : 'px-4 py-3'}
          >
            <Text
              className={
                filter === f.value
                  ? 'text-[13px] font-semibold text-white'
                  : 'text-[13px] font-semibold text-slate-900 dark:text-white'
              }
            >
              {f.label}
            </Text>
          </Card>
        ))}
      </View>

      <SectionHeader title="Liste" />
        </>
      }
      ListEmptyComponent={
        <Card>
          <Text className="text-[14px] font-semibold text-slate-900 dark:text-white">Aucun incident</Text>
          <Text className="mt-1 text-[13px] text-slate-500 dark:text-slate-300">Tout est conforme pour ce filtre.</Text>
        </Card>
      }
      renderItem={({ item: inc }) => {
        const site = state.sites.find(s => s.id === inc.siteId);
        return (
          <View className="mb-3">
            <Card onPress={() => router.push(routes.incidentDetail(inc.id))}>
              <View className="flex-row items-center justify-between">
                <View className="flex-1 pr-4">
                  <Text className="text-[15px] font-semibold text-slate-900 dark:text-white">{inc.title}</Text>
                  <Text className="mt-1 text-[13px] text-slate-500 dark:text-slate-300">{site?.name ?? 'Site'}</Text>
                  <Text className="mt-1 text-[12px] text-slate-400 dark:text-slate-500">{inc.status.replace('_', ' ')}</Text>
                  <Text className="mt-1 text-[12px] text-slate-400 dark:text-slate-500">
                    {inc.photos.length} photo{inc.photos.length > 1 ? 's' : ''} de preuve
                  </Text>
                </View>
                <Chip label={inc.severity} tone={toneFor(inc.severity)} />
              </View>
            </Card>
          </View>
        );
      }}
    />
  );
}
