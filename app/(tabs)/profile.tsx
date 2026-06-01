import { Alert, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { AppBar } from '../../components/ui/AppBar';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Chip } from '../../components/ui/Chip';
import { Screen } from '../../components/ui/Screen';
import { SectionHeader } from '../../components/ui/SectionHeader';
import type { Role, ThemeMode } from '../../lib/models';
import { canPerform, ROLE_LABELS } from '../../lib/models';
import { routes } from '../../lib/routes';
import { useAppStore } from '../../lib/store';

const roles: Array<{ role: Role; title: string; desc: string }> = [
  { role: 'agent', title: 'Agent', desc: 'Listes de contrôle, photos, validation tâches' },
  { role: 'controller', title: 'Contrôleur', desc: 'Audits terrain, notation, conformité' },
  { role: 'ops', title: 'Exploitation', desc: 'KPI, suivi sites, pilotage temps réel' },
  { role: 'client', title: 'Client', desc: 'Rapports, historique, validation prestations' }
];

export default function ProfileScreen() {
  const router = useRouter();
  const { state, dispatch, ready, clearCache, reset } = useAppStore();

  const doneControls = state.plannedControls.filter(c => c.status === 'done').length;
  const inProgressControls = state.plannedControls.filter(c => c.status === 'inProgress').length;
  const avgRating =
    state.inspections.length === 0
      ? 0
      : Math.round((state.inspections.reduce((sum, i) => sum + (i.rating || 0), 0) / state.inspections.length) * 10) / 10;

  return (
    <Screen>
      <AppBar
        title="Profil"
        subtitle="Préférences et accès"
        right={
          canPerform(state.role, 'manage_templates') || canPerform(state.role, 'manage_sites')
            ? [
                {
                  icon: 'settings',
                  label: 'Administration',
                  onPress: () => router.push(canPerform(state.role, 'manage_sites') ? routes.sites : routes.templates)
                }
              ]
            : undefined
        }
      />

      <SectionHeader title="Compte" />
      <Card>
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-[14px] font-semibold text-slate-900 dark:text-white">{state.session.userName || 'Utilisateur'}</Text>
            <Text className="mt-1 text-[13px] text-slate-500 dark:text-slate-300">Session active</Text>
          </View>
          <Button label="Déconnexion" variant="secondary" onPress={() => dispatch({ type: 'signOut' })} className="h-10 px-3 rounded-xl" />
        </View>
      </Card>

      <SectionHeader title="Apparence" right={<Chip label={state.themeMode === 'system' ? 'Système' : state.themeMode} tone="neutral" />} />
      <View className="flex-row gap-3">
        {(['system', 'light', 'dark'] as ThemeMode[]).map(mode => {
          const selected = state.themeMode === mode;
          return (
            <Card
              key={mode}
              onPress={() => dispatch({ type: 'setThemeMode', mode })}
              className={selected ? 'flex-1 px-4 py-3 bg-brand-600 border-brand-600' : 'flex-1 px-4 py-3'}
            >
              <Text className={selected ? 'text-[13px] font-semibold text-white' : 'text-[13px] font-semibold text-slate-900 dark:text-white'}>
                {mode === 'system' ? 'Système' : mode === 'light' ? 'Clair' : 'Sombre'}
              </Text>
            </Card>
          );
        })}
      </View>

      <SectionHeader title="Rôle" right={<Chip label={ready ? 'Prêt' : 'Chargement…'} tone={ready ? 'success' : 'warning'} />} />
      {canPerform(state.role, 'switch_roles') ? (
        <View className="gap-3">
          {roles.map(r => {
            const selected = state.role === r.role;
            return (
              <Card
                key={r.role}
                onPress={() => dispatch({ type: 'setRole', role: r.role })}
                className={selected ? 'border-brand-200 bg-brand-50' : undefined}
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-1 pr-4">
                    <Text className="text-[15px] font-semibold text-slate-900 dark:text-white">{r.title}</Text>
                    <Text className="mt-1 text-[13px] text-slate-500 dark:text-slate-300">{r.desc}</Text>
                  </View>
                  <View
                    className={
                      selected
                        ? 'h-10 w-10 items-center justify-center rounded-2xl bg-brand-600'
                        : 'h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800'
                    }
                  >
                    <Text className={selected ? 'text-white font-bold' : 'text-slate-400 dark:text-slate-500 font-bold'}>{selected ? '✓' : ''}</Text>
                  </View>
                </View>
              </Card>
            );
          })}
        </View>
      ) : (
        <Card>
          <Text className="text-[14px] font-semibold text-slate-900 dark:text-white">Rôle actuel : {ROLE_LABELS[state.role]}</Text>
          <Text className="mt-1 text-[13px] text-slate-500 dark:text-slate-300">
            Le changement de rôle est réservé à l’Exploitation.
          </Text>
        </Card>
      )}

      <SectionHeader title="Statistiques" />
      <View className="flex-row gap-3">
        <Card className="flex-1">
          <Text className="text-[12px] font-semibold text-slate-500">Terminés</Text>
          <Text className="mt-1 text-[22px] font-extrabold text-slate-900 dark:text-white">{doneControls}</Text>
        </Card>
        <Card className="flex-1">
          <Text className="text-[12px] font-semibold text-slate-500">En cours</Text>
          <Text className="mt-1 text-[22px] font-extrabold text-slate-900 dark:text-white">{inProgressControls}</Text>
        </Card>
        <Card className="flex-1">
          <Text className="text-[12px] font-semibold text-slate-500">Note</Text>
          <Text className="mt-1 text-[22px] font-extrabold text-slate-900 dark:text-white">{avgRating || '—'}</Text>
        </Card>
      </View>

      <SectionHeader title="Données de l’application" />
      <Card>
        <Text className="text-[14px] font-semibold text-slate-900 dark:text-white">Gestion des données</Text>
        <Text className="mt-1 text-[13px] text-slate-500 dark:text-slate-300">
          Gère les informations enregistrées sur cet appareil et remets l’application à zéro si nécessaire.
        </Text>
        <View className="mt-4 gap-3">
          <Button
            label="Réinitialiser les données"
            variant="secondary"
            onPress={() =>
              Alert.alert('Réinitialiser', 'Revenir aux données initiales de l’application ?', [
                { text: 'Annuler', style: 'cancel' },
                { text: 'OK', style: 'default', onPress: reset }
              ])
            }
          />
          <Button
            label="Effacer les données de l’app"
            variant="danger"
            onPress={() =>
              Alert.alert('Effacer les données', 'Supprimer les données enregistrées sur cet appareil ?', [
                { text: 'Annuler', style: 'cancel' },
                { text: 'Supprimer', style: 'destructive', onPress: () => void clearCache() }
              ])
            }
          />
        </View>
      </Card>
    </Screen>
  );
}
