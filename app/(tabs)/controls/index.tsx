import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { AppBar } from '../../../components/ui/AppBar';
import { Card } from '../../../components/ui/Card';
import { Chip } from '../../../components/ui/Chip';
import { ListScreen } from '../../../components/ui/ListScreen';
import { SectionHeader } from '../../../components/ui/SectionHeader';
import { addDaysISODate, shortDateLabel, todayISODate } from '../../../lib/format';
import { canAccessPathname, canPerform } from '../../../lib/models';
import { routes } from '../../../lib/routes';
import { useAppStore } from '../../../lib/store';

export default function ControlsScreen() {
  const router = useRouter();
  const { state, dispatch } = useAppStore();

  const date = state.selectedDate || todayISODate();
  const controls = state.plannedControls.filter(c => c.date === date);
  const doneCount = controls.filter(c => c.status === 'done').length;

  const dateChoices = [addDaysISODate(date, -1), date, addDaysISODate(date, 1)];

  return (
    <ListScreen
      data={controls}
      keyExtractor={item => item.id}
      ListHeaderComponent={
        <>
      <AppBar
        title="Contrôles"
        subtitle={`${controls.length} planifié${controls.length > 1 ? 's' : ''} • ${doneCount} terminé${doneCount > 1 ? 's' : ''}`}
        right={[
          ...(canPerform(state.role, 'plan_controls')
            ? [{ icon: 'plus' as const, label: 'Nouveau contrôle', onPress: () => router.push(routes.newControl) }]
            : []),
          ...(canAccessPathname(state.role, '/reports')
            ? [{ icon: 'file-text' as const, label: 'Rapports', onPress: () => router.push(routes.reports) }]
            : [])
        ]}
      />

      <View className="mt-5 flex-row items-center gap-2">
        {dateChoices.map(d => {
          const selected = d === date;
          return (
            <Pressable
              key={d}
              onPress={() => dispatch({ type: 'setSelectedDate', date: d })}
              className={
                selected
                  ? 'rounded-full bg-brand-600 px-4 py-2'
                  : 'rounded-full bg-white dark:bg-slate-900 px-4 py-2 border border-slate-200 dark:border-slate-700'
              }
            >
              <Text
                className={
                  selected ? 'text-[13px] font-semibold text-white' : 'text-[13px] font-semibold text-slate-700 dark:text-slate-200'
                }
              >
                {shortDateLabel(d)}
              </Text>
            </Pressable>
          );
        })}
        <Pressable
          onPress={() => dispatch({ type: 'setSelectedDate', date: todayISODate() })}
          className="ml-auto rounded-full bg-white dark:bg-slate-900 px-4 py-2 border border-slate-200 dark:border-slate-700"
        >
          <Text className="text-[13px] font-semibold text-slate-700 dark:text-slate-200">Aujourd’hui</Text>
        </Pressable>
      </View>

      <SectionHeader title="Liste" />
        </>
      }
      ListEmptyComponent={
        <Card>
          <Text className="text-[14px] font-semibold text-slate-900 dark:text-white">Rien à contrôler</Text>
          <Text className="mt-1 text-[13px] text-slate-500 dark:text-slate-300">Change la date ou utilise Planning.</Text>
        </Card>
      }
      renderItem={({ item: ctrl }) => {
        const site = state.sites.find(s => s.id === ctrl.siteId);
        const tone: 'success' | 'brand' | 'neutral' =
          ctrl.status === 'done' ? 'success' : ctrl.status === 'inProgress' ? 'brand' : 'neutral';
        const label = ctrl.status === 'done' ? 'Terminé' : ctrl.status === 'inProgress' ? 'En cours' : 'Planifié';
        return (
          <View className="mb-3">
            <Card onPress={() => router.push(routes.controlDetail(ctrl.id))}>
              <View className="flex-row items-center justify-between">
                <View className="flex-1 pr-4">
                  <Text className="text-[15px] font-semibold text-slate-900 dark:text-white">{site?.name ?? 'Site'}</Text>
                  <Text className="mt-1 text-[13px] text-slate-500 dark:text-slate-300">
                    {ctrl.startTime}–{ctrl.endTime} • {site?.address}
                  </Text>
                  <View className="mt-3 flex-row gap-2">
                    <Chip label={ctrl.type === 'beforeAfter' ? 'Avant/Après' : 'Qualité'} tone="neutral" />
                    <Chip label={ctrl.type === 'beforeAfter' ? 'Photos avant + après' : 'Photo de preuve requise'} tone="warning" />
                    <Chip label={`Assigné: ${ctrl.assigneeName}`} tone="brand" />
                  </View>
                </View>
                <Chip label={label} tone={tone} />
              </View>
            </Card>
          </View>
        );
      }}
    />
  );
}
