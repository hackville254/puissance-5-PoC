import { useRouter } from 'expo-router';
import { useColorScheme } from 'nativewind';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Chip } from '../../components/ui/Chip';
import { Icon } from '../../components/ui/Icon';
import { Screen } from '../../components/ui/Screen';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { todayISODate } from '../../lib/format';
import { canAccessPathname, ROLE_LABELS } from '../../lib/models';
import { routes } from '../../lib/routes';
import { getItem, setItem } from '../../lib/storage';
import { useAppStore } from '../../lib/store';

const HOME_ONBOARDING_KEY = 'p5_home_onboarding_sessions_v1';
const HOME_BACKGROUND = '#F0F4FF';
const SURFACE = '#FFFFFF';
const PRIMARY = '#2563EB';
const PRIMARY_DARK = '#1D4ED8';
const ACCENT = '#10B981';
const TEXT_PRIMARY = '#0F172A';
const TEXT_SECONDARY = '#64748B';
const BORDER = '#E2E8F0';

function initialsForName(name: string) {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);
  if (parts.length === 0) return 'U';
  return (
    parts
      .map(part => part[0]?.toUpperCase() ?? '')
      .join('')
      .slice(0, 2) || 'U'
  );
}

function OnboardingTooltip({
  visible,
  onClose,
  bullets
}: {
  visible: boolean;
  onClose: () => void;
  bullets: string[];
}) {
  if (!visible || bullets.length === 0) return null;

  return (
    <View
      style={{
        marginTop: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: BORDER,
        backgroundColor: SURFACE,
        padding: 16,
        gap: 12
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 11, fontWeight: '600', letterSpacing: 1.5, color: TEXT_SECONDARY, opacity: 0.7 }}>PRISE EN MAIN</Text>
          <Text style={{ marginTop: 6, fontSize: 15, lineHeight: 22, fontWeight: '700', color: TEXT_PRIMARY }}>
            {`L'accueil se concentre sur tes actions prioritaires.`}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Fermer l'aide d'accueil"
          onPress={onClose}
          style={{
            height: 36,
            width: 36,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 12,
            backgroundColor: '#EFF6FF'
          }}
        >
          <Icon name="x" size={18} color={PRIMARY} />
        </Pressable>
      </View>
      <View style={{ gap: 10 }}>
        {bullets.slice(0, 3).map(item => (
          <View key={item} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
            <View style={{ marginTop: 7, height: 8, width: 8, borderRadius: 999, backgroundColor: ACCENT }} />
            <Text style={{ flex: 1, fontSize: 15, lineHeight: 22, color: TEXT_SECONDARY }}>{item}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const { state, ready } = useAppStore();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [showOnboarding, setShowOnboarding] = useState(false);

  const date = state.selectedDate || todayISODate();
  const plannedToday = state.plannedControls.filter(c => c.date === date);
  const openIncidents = state.incidents.filter(i => i.status !== 'clos');
  const completedReports = state.inspections.filter(i => Boolean(i.completedAt));
  const doneToday = plannedToday.filter(c => c.status === 'done').length;
  const canSeeControls = canAccessPathname(state.role, routes.controls);
  const canSeeIncidents = canAccessPathname(state.role, routes.incidents);
  const canSeePlanning = canAccessPathname(state.role, routes.planning);
  const canSeeReports = canAccessPathname(state.role, routes.reports);
  const initials = initialsForName(state.session.userName || ROLE_LABELS[state.role]);
  const primaryMetric = canSeeControls ? `${plannedToday.length} contrôles` : `${completedReports.length} rapports`;
  const secondaryMetric = canSeeControls
    ? `${doneToday} terminé${doneToday > 1 ? 's' : ''} · ${openIncidents.length} incidents actifs`
    : `${completedReports.length} rapport${completedReports.length > 1 ? 's' : ''} disponible${completedReports.length > 1 ? 's' : ''}`;

  const onboardingBullets = useMemo(
    () =>
      [
        canSeeControls ? 'Démarre un contrôle depuis la carte principale.' : null,
        canSeeReports ? "Ouvre rapidement les rapports de la journée." : null,
        canSeePlanning ? 'Utilise le planning pour préparer la tournée.' : null,
        canSeeIncidents ? 'Surveille les incidents actifs sans changer d’écran.' : null
      ].filter(Boolean) as string[],
    [canSeeControls, canSeeReports, canSeePlanning, canSeeIncidents]
  );

  const quickStats = useMemo(
    () => [
      {
        label: canSeeControls ? 'PRÉVUS' : 'VALIDÉS',
        value: canSeeControls ? `${plannedToday.length}` : `${completedReports.length}`
      },
      {
        label: canSeeControls ? 'INCIDENTS' : 'ACCÈS',
        value: canSeeControls ? `${openIncidents.length}` : 'Lecture'
      }
    ],
    [canSeeControls, completedReports.length, openIncidents.length, plannedToday.length]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await getItem(HOME_ONBOARDING_KEY);
        const count = Math.max(0, Number.parseInt(raw ?? '0', 10) || 0);
        if (cancelled) return;
        setShowOnboarding(count < 3);
        if (count < 3) await setItem(HOME_ONBOARDING_KEY, String(count + 1));
      } catch {
        if (!cancelled) setShowOnboarding(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Screen className={isDark ? 'bg-slate-950' : 'bg-[#F0F4FF]'}>
      <View
        style={{
          marginTop: 8,
          borderRadius: 16,
          backgroundColor: isDark ? '#020817' : HOME_BACKGROUND,
          paddingHorizontal: 20,
          paddingTop: 20,
          paddingBottom: 16
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ fontSize: 32, lineHeight: 36, fontWeight: '800', color: isDark ? '#FFFFFF' : TEXT_PRIMARY }}>Accueil</Text>
            <Text style={{ marginTop: 6, fontSize: 15, lineHeight: 22, color: isDark ? '#CBD5E1' : TEXT_SECONDARY }} numberOfLines={1}>
              Connecté : {state.session.userName || 'Utilisateur'}
            </Text>
            <View style={{ marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ height: 10, width: 10, borderRadius: 999, backgroundColor: ACCENT }} />
              <Text style={{ fontSize: 15, lineHeight: 22, color: isDark ? '#E2E8F0' : TEXT_SECONDARY }} numberOfLines={1}>
                Rôle actif : {ROLE_LABELS[state.role]}
              </Text>
            </View>
          </View>

          <View
            style={{
              height: 40,
              width: 40,
              borderRadius: 999,
              backgroundColor: '#1E40AF',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Text style={{ fontSize: 15, fontWeight: '800', color: '#FFFFFF' }}>{initials}</Text>
          </View>
        </View>

        <OnboardingTooltip visible={showOnboarding} onClose={() => setShowOnboarding(false)} bullets={onboardingBullets} />
      </View>

      <View
        style={{
          marginTop: 20,
          borderRadius: 16,
          backgroundColor: PRIMARY,
          padding: 20,
          shadowColor: PRIMARY,
          shadowOpacity: 0.16,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 6 },
          elevation: 4
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Ouvrir le profil"
          onPress={() => router.push(routes.profile)}
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            height: 40,
            width: 40,
            borderRadius: 12,
            backgroundColor: 'rgba(255,255,255,0.18)',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <Icon name="settings" size={18} color="#FFFFFF" />
        </Pressable>

        <View style={{ paddingRight: 56 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
            <Chip label={ROLE_LABELS[state.role]} tone="brand" className="self-start border-white/25 bg-white/16" />
          </View>
          <Text style={{ marginTop: 8, fontSize: 11, fontWeight: '600', letterSpacing: 1.5, color: 'rgba(255,255,255,0.7)' }}>{"AUJOURD'HUI"}</Text>
          <Text style={{ marginTop: 8, fontSize: 40, lineHeight: 44, fontWeight: '800', color: '#FFFFFF' }} numberOfLines={1}>
            {primaryMetric}
          </Text>
          <Text style={{ marginTop: 8, fontSize: 14, lineHeight: 20, color: 'rgba(255,255,255,0.82)' }} numberOfLines={2}>
            {secondaryMetric}
          </Text>
        </View>

        <View style={{ marginTop: 16, flexDirection: 'row', gap: 10 }}>
          {quickStats.map(stat => (
            <View
              key={stat.label}
              style={{
                flex: 1,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.25)',
                backgroundColor: 'rgba(255,255,255,0.15)',
                paddingHorizontal: 14,
                paddingVertical: 12
              }}
            >
              <Text style={{ fontSize: 11, fontWeight: '600', letterSpacing: 1.5, color: 'rgba(255,255,255,0.68)' }}>{stat.label}</Text>
              <Text style={{ marginTop: 6, fontSize: 15, lineHeight: 22, fontWeight: '700', color: '#FFFFFF' }} numberOfLines={1}>
                {stat.value}
              </Text>
            </View>
          ))}
        </View>

        <View style={{ marginTop: 16, flexDirection: 'row', gap: 10 }}>
          <Button
            label={canSeeControls ? 'Démarrer un contrôle' : 'Voir les rapports'}
            variant="secondary"
            onPress={() => router.push(canSeeControls ? routes.controls : routes.reports)}
            className="flex-1 rounded-2xl border-white bg-white"
            textClassName="text-[15px] font-semibold text-brand-700"
          />
          <Button
            label={canSeeReports ? 'Rapports' : 'Profil'}
            variant="glass"
            onPress={() => router.push(canSeeReports ? routes.reports : routes.profile)}
            className="flex-1 rounded-2xl border-white/25 bg-white/20"
            textClassName="text-[15px] font-semibold text-white"
          />
        </View>
      </View>

      {canSeeControls ? (
        <>
          <SectionHeader title="Sites du jour" />
          {plannedToday.length === 0 ? (
            <Card className="rounded-2xl border-slate-200 px-4 py-4">
              <Text className="text-[15px] font-semibold text-slate-900 dark:text-white">Aucun contrôle planifié</Text>
              <Text className="mt-1 text-[15px] leading-[22px] text-slate-500 dark:text-slate-300">
                {canSeePlanning ? 'Utilise le planning pour organiser ta journée.' : 'Aucun contrôle disponible sur cette période.'}
              </Text>
            </Card>
          ) : (
            <View className="gap-3">
              {plannedToday.slice(0, 3).map((ctrl, index) => {
                const site = state.sites.find(s => s.id === ctrl.siteId);
                return (
                  <Card key={ctrl.id} onPress={() => router.push(routes.controlDetail(ctrl.id))} className="rounded-2xl border-slate-200 px-4 py-4">
                    <View className="flex-row items-start justify-between">
                      <View className="flex-row flex-1 items-start pr-4">
                        <View
                          style={{
                            marginRight: 12,
                            height: 40,
                            width: 40,
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: 12,
                            backgroundColor: isDark ? '#172554' : '#DBEAFE',
                            borderWidth: 1,
                            borderColor: isDark ? '#1D4ED8' : '#BFDBFE'
                          }}
                        >
                          <Text style={{ fontSize: 13, fontWeight: '700', color: isDark ? '#DBEAFE' : PRIMARY_DARK }}>{index + 1}</Text>
                        </View>
                        <View className="flex-1">
                          <Text className="text-[15px] font-semibold text-slate-900 dark:text-white">{site?.name ?? 'Site'}</Text>
                          <Text className="mt-1 text-[15px] leading-[22px] text-slate-500 dark:text-slate-300" numberOfLines={1}>
                            {site?.city ?? 'Ville non renseignée'}
                          </Text>
                        </View>
                      </View>
                      <Chip label={ctrl.status === 'done' ? 'Terminé' : ctrl.status === 'inProgress' ? 'En cours' : 'Planifié'} tone={ctrl.status === 'done' ? 'success' : ctrl.status === 'inProgress' ? 'brand' : 'neutral'} />
                    </View>
                    <View
                      style={{
                        marginTop: 14,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        borderRadius: 12,
                        backgroundColor: isDark ? 'rgba(30,41,59,0.7)' : '#F8FAFC',
                        paddingHorizontal: 14,
                        paddingVertical: 12
                      }}
                    >
                      <View>
                        <Text style={{ fontSize: 11, fontWeight: '600', letterSpacing: 1.5, color: TEXT_SECONDARY, opacity: 0.75 }}>HORAIRE</Text>
                        <Text className="mt-1 text-[15px] font-semibold text-slate-900 dark:text-white">{ctrl.startTime}–{ctrl.endTime}</Text>
                      </View>
                      <View className="items-end">
                        <Text style={{ fontSize: 11, fontWeight: '600', letterSpacing: 1.5, color: TEXT_SECONDARY, opacity: 0.75 }}>TYPE</Text>
                        <Text className="mt-1 text-[15px] font-semibold text-slate-900 dark:text-white" numberOfLines={1}>
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
            <Card className="rounded-2xl border-slate-200 px-4 py-4">
              <Text className="text-[15px] font-semibold text-slate-900 dark:text-white">Aucun rapport disponible</Text>
              <Text className="mt-1 text-[15px] leading-[22px] text-slate-500 dark:text-slate-300">Les rapports validés apparaissent ici dès qu’un contrôle est clôturé.</Text>
            </Card>
          ) : (
            <View className="gap-3">
              {completedReports.slice(0, 3).map(report => {
                const control = state.plannedControls.find(c => c.id === report.plannedControlId);
                const site = control ? state.sites.find(s => s.id === control.siteId) : undefined;
                return (
                  <Card key={report.id} onPress={() => router.push(routes.reports)} className="rounded-2xl border-slate-200 px-4 py-4">
                    <View className="flex-row items-start justify-between">
                      <View className="flex-1 pr-4">
                        <Text className="text-[15px] font-semibold text-slate-900 dark:text-white">{site?.name ?? 'Site'}</Text>
                        <Text className="mt-1 text-[15px] leading-[22px] text-slate-500 dark:text-slate-300" numberOfLines={1}>
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
          <Card onPress={() => router.push(routes.incidents)} className="rounded-2xl border-slate-200 px-4 py-4">
            <View className="flex-row items-center justify-between">
              <View className="flex-1 pr-4">
                <Text className="text-[15px] font-semibold text-slate-900 dark:text-white">Incidents actifs</Text>
                <Text className="mt-1 text-[15px] leading-[22px] text-slate-500 dark:text-slate-300" numberOfLines={2}>
                  Critiques, majeurs et mineurs suivis en temps réel.
                </Text>
              </View>
              <View className="h-10 min-w-10 items-center justify-center rounded-2xl bg-emerald-50 px-3 dark:bg-emerald-950">
                <Text className="text-[15px] font-bold text-emerald-700 dark:text-emerald-200">{openIncidents.length}</Text>
              </View>
            </View>
          </Card>
        </>
      ) : null}

      <SectionHeader title="Raccourcis" />
      <View className="flex-row gap-3">
        {canSeePlanning ? (
          <Card className="flex-1 rounded-2xl border-slate-200" onPress={() => router.push(routes.planning)}>
            <Text className="text-[15px] font-semibold text-slate-900 dark:text-white">Planning</Text>
            <Text className="mt-1 text-[15px] leading-[22px] text-slate-500 dark:text-slate-300">Tournées et contrôles surprise</Text>
          </Card>
        ) : canSeeReports ? (
          <Card className="flex-1 rounded-2xl border-slate-200" onPress={() => router.push(routes.reports)}>
            <Text className="text-[15px] font-semibold text-slate-900 dark:text-white">Rapports</Text>
            <Text className="mt-1 text-[15px] leading-[22px] text-slate-500 dark:text-slate-300">Historique et partage</Text>
          </Card>
        ) : null}
        <Card className="flex-1 rounded-2xl border-slate-200" onPress={() => router.push(routes.profile)}>
          <Text className="text-[15px] font-semibold text-slate-900 dark:text-white">Profil</Text>
          <Text className="mt-1 text-[15px] leading-[22px] text-slate-500 dark:text-slate-300">Rôle et données locales</Text>
        </Card>
      </View>

      {!ready ? <Text className="mt-6 text-center text-[12px] text-slate-400 dark:text-slate-500">Chargement du cache…</Text> : null}
    </Screen>
  );
}
