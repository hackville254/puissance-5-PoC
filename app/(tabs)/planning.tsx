import { useRouter } from 'expo-router';
import { Text, View } from 'react-native';

import { AppBar } from '../../components/ui/AppBar';
import { Card } from '../../components/ui/Card';
import { Chip } from '../../components/ui/Chip';
import { ListScreen } from '../../components/ui/ListScreen';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { addDaysISODate, shortDateLabel, todayISODate } from '../../lib/format';
import { canPerform } from '../../lib/models';
import { routes } from '../../lib/routes';
import { useAppStore } from '../../lib/store';

export default function PlanningScreen() {
  const router = useRouter();
  const { state, dispatch } = useAppStore();

  const date = state.selectedDate || todayISODate();
  const windowDays = [-2, -1, 0, 1, 2].map(d => addDaysISODate(date, d));
  const controlsByDay = windowDays.map(d0 => ({
    date: d0,
    controls: state.plannedControls.filter(c => c.date === d0)
  }));

  return (
    <ListScreen
      data={controlsByDay}
      keyExtractor={item => item.date}
      ListHeaderComponent={
        <>
      <AppBar
        title="Planning"
        subtitle="Tournées, contrôles récurrents, contrôles surprise"
        right={
          canPerform(state.role, 'plan_controls')
            ? [{ icon: 'plus', label: 'Nouveau contrôle', onPress: () => router.push(routes.newControl) }]
            : undefined
        }
      />

      <View className="mt-5 flex-row flex-wrap gap-2">
        {windowDays.map(d0 => {
          const selected = d0 === date;
          return (
            <Card
              key={d0}
              onPress={() => dispatch({ type: 'setSelectedDate', date: d0 })}
              className={selected ? 'px-4 py-3 bg-brand-600 border-brand-600' : 'px-4 py-3'}
            >
              <Text
                className={
                  selected
                    ? 'text-[13px] font-semibold text-white'
                    : 'text-[13px] font-semibold text-slate-900 dark:text-white'
                }
              >
                {shortDateLabel(d0)}
              </Text>
            </Card>
          );
        })}
      </View>

      <SectionHeader title="Agenda (5 jours)" />
        </>
      }
      renderItem={({ item: block }) => (
        <View className="mb-4">
          <Card>
            <View className="flex-row items-center justify-between">
              <Text className="text-[14px] font-semibold text-slate-900 dark:text-white">{block.date}</Text>
              <Chip label={`${block.controls.length} contrôle${block.controls.length > 1 ? 's' : ''}`} tone="neutral" />
            </View>
            {block.controls.length === 0 ? (
              <Text className="mt-2 text-[13px] text-slate-500 dark:text-slate-300">Aucun contrôle planifié</Text>
            ) : (
              <View className="mt-3 gap-2">
                {block.controls.map(c => {
                  const site = state.sites.find(s => s.id === c.siteId);
                  return (
                    <View key={c.id} className="rounded-2xl bg-slate-50 dark:bg-slate-800 p-3">
                      <View className="flex-row items-center justify-between">
                        <Text className="text-[13px] font-semibold text-slate-900 dark:text-white">{site?.name ?? 'Site'}</Text>
                        <Chip label={`${c.startTime}–${c.endTime}`} tone="brand" />
                      </View>
                      <Text className="mt-1 text-[12px] text-slate-500 dark:text-slate-300">{site?.address}</Text>
                    </View>
                  );
                })}
              </View>
            )}
          </Card>
        </View>
      )}
    />
  );
}
