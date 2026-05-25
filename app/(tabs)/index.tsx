import { useRouter } from 'expo-router';
import { useColorScheme } from 'nativewind';
import { Text, View } from 'react-native';

import { AppBar } from '../../components/ui/AppBar';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Chip } from '../../components/ui/Chip';
import { Screen } from '../../components/ui/Screen';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { todayISODate } from '../../lib/format';
import { canAccessPathname, ROLE_LABELS } from '../../lib/models';
import { routes } from '../../lib/routes';
import { useAppStore } from '../../lib/store';

export default function HomeScreen() {
  const router = useRouter();
  const { state, ready } = useAppStore();
  const { colorScheme } = useColorScheme();

  const date = state.selectedDate || todayISODate();
  const plannedToday = state.plannedControls.filter(c => c.date === date);
  const openIncidents = state.incidents.filter(i => i.status !== 'clos');
  const completedReports = state.inspections.filter(i => Boolean(i.completedAt));
  const doneToday = plannedToday.filter(c => c.status === 'done').length;
  const canSeeControls = canAccessPathname(state.role, routes.controls);
  const canSeeIncidents = canAccessPathname(state.role, routes.incidents);
  const canSeePlanning = canAccessPathname(state.role, routes.planning);
  const canSeeReports = canAccessPathname(state.role, routes.reports);

  return (
    <Screen>
      <AppBar
        title="Accueil"
        subtitle={`Connecté: ${state.session.userName || '—'} • ${ROLE_LABELS[state.role]}`}
        right={[
          ...(canSeeReports
            ? [{ icon: 'file-text' as const, label: 'Rapports', onPress: () => router.push(routes.reports) }]
            : []),
          ...(canSeeIncidents
            ? [{ icon: 'circle-alert' as const, label: 'Incidents', onPress: () => router.push(routes.incidents) }]
            : [])
        ]}
      />

      <View
        className={colorScheme === 'dark' ? 'mt-6 rounded-3xl border border-slate-800 bg-brand-950' : 'mt-6 rounded-3xl border border-brand-200 bg-brand-600'}
      >
        <View className="p-5">
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-[14px] font-semibold text-white/80">Aujourd’hui</Text>
                <Text className="mt-1 text-[32px] font-extrabold text-white">
                  {canSeeControls ? `${plannedToday.length} contrôles` : `${completedReports.length} rapports`}
                </Text>
                <Text className="mt-2 text-[13px] text-white/80">
                  {canSeeControls
                    ? `${doneToday} terminé${doneToday > 1 ? 's' : ''} • ${openIncidents.length} incident${openIncidents.length > 1 ? 's' : ''} actif`
                    : `${completedReports.length} export${completedReports.length > 1 ? 's' : ''} disponible${completedReports.length > 1 ? 's' : ''} • accès lecture sécurisée`}
                </Text>
              </View>
              <Chip label={ROLE_LABELS[state.role]} tone="brand" className="bg-white/15 border-white/20" />
            </View>
            <View className="mt-5 flex-row">
              <Button
                label={canSeeControls ? 'Démarrer un contrôle' : 'Voir les rapports'}
                variant="secondary"
                onPress={() => router.push(canSeeControls ? routes.controls : routes.reports)}
                className="flex-1 bg-white border-white"
              />
              <View className="w-3" />
              <Button
                label={canSeeControls ? 'Rapports' : 'Profil'}
                variant="glass"
                onPress={() => router.push(canSeeControls ? routes.reports : routes.profile)}
                className={colorScheme === 'dark' ? 'flex-1 bg-brand-900 border-brand-800' : 'flex-1 bg-brand-500 border-brand-400'}
              />
            </View>
        </View>
      </View>

      {canSeeControls ? (
        <>
          <SectionHeader title="Sites du jour" />
          {plannedToday.length === 0 ? (
            <Card>
              <Text className="text-[14px] font-semibold text-slate-900 dark:text-white">Aucun contrôle planifié</Text>
              <Text className="mt-1 text-[13px] text-slate-500 dark:text-slate-300">
                {canSeePlanning ? 'Utilise Planning pour préparer la tournée.' : 'Aucun contrôle disponible sur cette période.'}
              </Text>
            </Card>
          ) : (
            <View className="gap-3">
              {plannedToday.slice(0, 3).map(ctrl => {
                const site = state.sites.find(s => s.id === ctrl.siteId);
                return (
                  <Card key={ctrl.id} onPress={() => router.push(routes.controlDetail(ctrl.id))}>
                    <View className="flex-row items-center justify-between">
                      <View className="flex-1 pr-4">
                        <Text className="text-[15px] font-semibold text-slate-900 dark:text-white">{site?.name ?? 'Site'}</Text>
                        <Text className="mt-1 text-[13px] text-slate-500 dark:text-slate-300">
                          {ctrl.startTime}–{ctrl.endTime} • {site?.city}
                        </Text>
                      </View>
                      <Chip
                        label={ctrl.status === 'done' ? 'Terminé' : ctrl.status === 'inProgress' ? 'En cours' : 'Planifié'}
                        tone={ctrl.status === 'done' ? 'success' : ctrl.status === 'inProgress' ? 'brand' : 'neutral'}
                      />
                    </View>
                  </Card>
                );
              })}
            </View>
          )}
        </>
      ) : (
        <>
          <SectionHeader title="Rapports récents" />
          {completedReports.length === 0 ? (
            <Card>
              <Text className="text-[14px] font-semibold text-slate-900 dark:text-white">Aucun rapport disponible</Text>
              <Text className="mt-1 text-[13px] text-slate-500 dark:text-slate-300">Les rapports validés apparaissent ici dès qu’un contrôle est clôturé.</Text>
            </Card>
          ) : (
            <View className="gap-3">
              {completedReports.slice(0, 3).map(report => {
                const control = state.plannedControls.find(c => c.id === report.plannedControlId);
                const site = control ? state.sites.find(s => s.id === control.siteId) : undefined;
                return (
                  <Card key={report.id} onPress={() => router.push(routes.reports)}>
                    <View className="flex-row items-center justify-between">
                      <View className="flex-1 pr-4">
                        <Text className="text-[15px] font-semibold text-slate-900 dark:text-white">{site?.name ?? 'Site'}</Text>
                        <Text className="mt-1 text-[13px] text-slate-500 dark:text-slate-300">
                          {report.completedAt?.slice(0, 16).replace('T', ' ') ?? 'Rapport disponible'}
                        </Text>
                      </View>
                      <Chip label={`${report.rating}/5`} tone={report.rating >= 4 ? 'success' : 'neutral'} />
                    </View>
                  </Card>
                );
              })}
            </View>
          )}
        </>
      )}

      {canSeeIncidents ? (
        <>
          <SectionHeader title="Alertes & Non-conformités" />
          <Card onPress={() => router.push(routes.incidents)}>
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-[15px] font-semibold text-slate-900 dark:text-white">Incidents actifs</Text>
                <Text className="mt-1 text-[13px] text-slate-500 dark:text-slate-300">Critiques, majeurs, mineurs — suivi en temps réel</Text>
              </View>
              <View className="h-9 min-w-9 items-center justify-center rounded-2xl bg-rose-50 dark:bg-rose-950 px-3">
                <Text className="text-[13px] font-bold text-rose-700 dark:text-rose-200">{openIncidents.length}</Text>
              </View>
            </View>
          </Card>
        </>
      ) : null}

      <SectionHeader title="Raccourcis" />
      <View className="flex-row gap-3">
        {canSeePlanning ? (
          <Card className="flex-1" onPress={() => router.push(routes.planning)}>
            <Text className="text-[14px] font-semibold text-slate-900 dark:text-white">Planning</Text>
            <Text className="mt-1 text-[13px] text-slate-500 dark:text-slate-300">Tournées, contrôles surprise</Text>
          </Card>
        ) : canSeeReports ? (
          <Card className="flex-1" onPress={() => router.push(routes.reports)}>
            <Text className="text-[14px] font-semibold text-slate-900 dark:text-white">Rapports</Text>
            <Text className="mt-1 text-[13px] text-slate-500 dark:text-slate-300">Historique, export, partage</Text>
          </Card>
        ) : null}
        <Card className="flex-1" onPress={() => router.push(routes.profile)}>
          <Text className="text-[14px] font-semibold text-slate-900 dark:text-white">Profil</Text>
          <Text className="mt-1 text-[13px] text-slate-500 dark:text-slate-300">Rôle, stats, cache local</Text>
        </Card>
      </View>

      {!ready ? <Text className="mt-6 text-center text-[12px] text-slate-400 dark:text-slate-500">Chargement du cache…</Text> : null}
    </Screen>
  );
}
