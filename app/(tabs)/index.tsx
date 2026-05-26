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
  const primaryMetric = canSeeControls ? `${plannedToday.length} contrôles` : `${completedReports.length} rapports`;
  const secondaryMetric = canSeeControls
    ? `${doneToday} terminé${doneToday > 1 ? 's' : ''} • ${openIncidents.length} incident${openIncidents.length > 1 ? 's' : ''} actif`
    : `${completedReports.length} export${completedReports.length > 1 ? 's' : ''} disponible${completedReports.length > 1 ? 's' : ''}`;

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
          <View className="flex-row items-start justify-between">
            <View className="flex-1 pr-4">
              <Text className="text-[13px] font-semibold uppercase tracking-[0.6px] text-white/75">Aujourd’hui</Text>
              <Text className="mt-2 text-[34px] font-extrabold leading-[38px] text-white">{primaryMetric}</Text>
              <Text className="mt-2 text-[13px] leading-5 text-white/78">{secondaryMetric}</Text>
            </View>
            <Chip
              label={ROLE_LABELS[state.role]}
              tone="brand"
              className="bg-white/12 border-white/20 self-start"
            />
          </View>

          <View className="mt-5 flex-row gap-3">
            <View className="flex-1 rounded-2xl border border-white/14 bg-white/10 px-4 py-3">
              <Text className="text-[11px] font-semibold uppercase tracking-[0.5px] text-white/65">Vue rapide</Text>
              <Text className="mt-1 text-[16px] font-bold text-white">{canSeeControls ? `${plannedToday.length} prévus` : `${completedReports.length} validés`}</Text>
            </View>
            <View className="flex-1 rounded-2xl border border-white/14 bg-white/10 px-4 py-3">
              <Text className="text-[11px] font-semibold uppercase tracking-[0.5px] text-white/65">
                {canSeeControls ? 'Suivi' : 'Accès'}
              </Text>
              <Text className="mt-1 text-[16px] font-bold text-white">
                {canSeeControls ? `${openIncidents.length} incident${openIncidents.length > 1 ? 's' : ''}` : 'Lecture sécurisée'}
              </Text>
            </View>
          </View>

          <View className="mt-5 flex-row">
            <Button
              label={canSeeControls ? 'Démarrer un contrôle' : 'Voir les rapports'}
              variant="secondary"
              onPress={() => router.push(canSeeControls ? routes.controls : routes.reports)}
              className="flex-1 bg-white border-white"
              textClassName="text-[14px]"
            />
            <View className="w-3" />
            <Button
              label={canSeeControls ? 'Rapports' : 'Profil'}
              variant="glass"
              onPress={() => router.push(canSeeControls ? routes.reports : routes.profile)}
              className={colorScheme === 'dark' ? 'flex-1 bg-brand-900 border-brand-800' : 'flex-1 bg-brand-500 border-brand-400'}
              textClassName="text-[14px]"
            />
          </View>

          <View className="mt-4 rounded-2xl border border-white/14 bg-white/8 px-4 py-3">
            <Text className="text-[12px] leading-5 text-white/72">
              {canSeeControls
                ? 'Prépare ta tournée, ouvre un contrôle en un geste et retrouve les points sensibles sans te disperser.'
                : 'Consulte les comptes rendus disponibles et retrouve rapidement les derniers résultats validés.'}
            </Text>
          </View>
        </View>
      </View>

      {canSeeControls ? (
        <>
          <SectionHeader title="Sites du jour" />
          {plannedToday.length === 0 ? (
            <Card>
              <Text className="text-[14px] font-semibold text-slate-900 dark:text-white">Aucun contrôle planifié</Text>
              <Text className="mt-1 text-[13px] leading-5 text-slate-500 dark:text-slate-300">
                {canSeePlanning ? 'Utilise le planning pour organiser ta journée.' : 'Aucun contrôle disponible sur cette période.'}
              </Text>
            </Card>
          ) : (
            <View className="gap-3">
              {plannedToday.slice(0, 3).map((ctrl, index) => {
                const site = state.sites.find(s => s.id === ctrl.siteId);
                return (
                  <Card key={ctrl.id} onPress={() => router.push(routes.controlDetail(ctrl.id))} className="px-4 py-4">
                    <View className="flex-row items-start justify-between">
                      <View className="flex-row items-start flex-1 pr-4">
                        <View className="mr-3 mt-0.5 h-10 w-10 items-center justify-center rounded-2xl bg-brand-50 dark:bg-brand-950 border border-brand-100 dark:border-brand-900">
                          <Text className="text-[13px] font-bold text-brand-700 dark:text-brand-200">{index + 1}</Text>
                        </View>
                        <View className="flex-1">
                          <Text className="text-[15px] font-semibold text-slate-900 dark:text-white">{site?.name ?? 'Site'}</Text>
                          <Text className="mt-1 text-[13px] text-slate-500 dark:text-slate-300">
                            {site?.city ?? 'Ville non renseignée'}
                          </Text>
                        </View>
                      </View>
                      <Chip
                        label={ctrl.status === 'done' ? 'Terminé' : ctrl.status === 'inProgress' ? 'En cours' : 'Planifié'}
                        tone={ctrl.status === 'done' ? 'success' : ctrl.status === 'inProgress' ? 'brand' : 'neutral'}
                      />
                    </View>
                    <View className="mt-4 flex-row items-center justify-between rounded-2xl bg-slate-50 dark:bg-slate-800/60 px-3 py-3">
                      <View>
                        <Text className="text-[11px] font-semibold uppercase tracking-[0.5px] text-slate-500 dark:text-slate-400">Horaire</Text>
                        <Text className="mt-1 text-[14px] font-semibold text-slate-900 dark:text-white">
                          {ctrl.startTime}–{ctrl.endTime}
                        </Text>
                      </View>
                      <View className="items-end">
                        <Text className="text-[11px] font-semibold uppercase tracking-[0.5px] text-slate-500 dark:text-slate-400">Type</Text>
                        <Text className="mt-1 text-[14px] font-semibold text-slate-900 dark:text-white">
                          {ctrl.type === 'beforeAfter' ? 'Avant / après' : 'Qualité'}
                        </Text>
                      </View>
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
                  <Card key={report.id} onPress={() => router.push(routes.reports)} className="px-4 py-4">
                    <View className="flex-row items-start justify-between">
                      <View className="flex-1 pr-4">
                        <Text className="text-[15px] font-semibold text-slate-900 dark:text-white">{site?.name ?? 'Site'}</Text>
                        <Text className="mt-1 text-[13px] text-slate-500 dark:text-slate-300">
                          {report.completedAt?.slice(0, 16).replace('T', ' ') ?? 'Rapport disponible'}
                        </Text>
                      </View>
                      <Chip label={`${report.rating}/5`} tone={report.rating >= 4 ? 'success' : 'neutral'} />
                    </View>
                    <View className="mt-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 px-3 py-3">
                      <Text className="text-[12px] leading-5 text-slate-600 dark:text-slate-300">
                        Rapport prêt à consulter avec note, checklist et éléments de preuve.
                      </Text>
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
