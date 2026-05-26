import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, Text, View } from 'react-native';

import { AppBar } from '../../../components/ui/AppBar';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { Chip } from '../../../components/ui/Chip';
import { Screen } from '../../../components/ui/Screen';
import { SectionHeader } from '../../../components/ui/SectionHeader';
import type { IncidentStatus, Severity } from '../../../lib/models';
import { canPerform } from '../../../lib/models';
import { routes } from '../../../lib/routes';
import { useAppStore } from '../../../lib/store';

function toneForSeverity(severity: Severity) {
  switch (severity) {
    case 'critique':
      return 'danger' as const;
    case 'majeure':
      return 'warning' as const;
    case 'mineure':
      return 'neutral' as const;
  }
}

function labelForStatus(status: IncidentStatus) {
  switch (status) {
    case 'ouvert':
      return 'Ouvert';
    case 'en_cours':
      return 'En cours';
    case 'clos':
      return 'Clos';
  }
}

export default function IncidentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { state, dispatch } = useAppStore();

  const incident = state.incidents.find(i => i.id === id);
  const site = incident ? state.sites.find(s => s.id === incident.siteId) : undefined;
  const canEdit = canPerform(state.role, 'manage_incidents');

  if (!incident) {
    return (
      <Screen>
        <AppBar title="Incident" subtitle="Détails" left={{ icon: 'chevron-left', label: 'Retour', onPress: () => router.back() }} />
        <Card className="mt-6">
          <Text className="text-[14px] font-semibold text-slate-900 dark:text-white">Introuvable</Text>
          <Text className="mt-1 text-[13px] text-slate-500 dark:text-slate-300">Cet incident est introuvable.</Text>
        </Card>
      </Screen>
    );
  }

  return (
    <Screen>
      <AppBar
        title="Incident"
        subtitle={site?.name ?? 'Site'}
        left={{ icon: 'chevron-left', label: 'Retour', onPress: () => router.back() }}
        right={
          canEdit
            ? [
                { icon: 'pencil', label: 'Modifier', onPress: () => router.push(routes.editIncident(incident.id)) },
                {
                  icon: 'trash',
                  label: 'Supprimer',
                  onPress: () =>
                    Alert.alert('Supprimer', 'Supprimer cet incident ?', [
                      { text: 'Annuler', style: 'cancel' },
                      { text: 'Supprimer', style: 'destructive', onPress: () => dispatch({ type: 'deleteIncident', incidentId: incident.id }) }
                    ])
                }
              ]
            : undefined
        }
      />
      <View className="mt-4 flex-row">
        <Chip label={labelForStatus(incident.status)} tone={incident.status === 'clos' ? 'success' : 'brand'} />
        <View className="w-2" />
        <Chip label={incident.severity} tone={toneForSeverity(incident.severity)} />
      </View>

      <Card className="mt-6">
        <View className="flex-row items-center justify-between">
          <Text className="text-[16px] font-semibold text-slate-900 dark:text-white">{incident.title}</Text>
        </View>
        <Text className="mt-2 text-[13px] text-slate-600 dark:text-slate-300">{incident.description}</Text>
        <View className="mt-4 flex-row flex-wrap gap-2">
          <Chip label={`Constaté: ${(incident.occurredAt || incident.createdAt).slice(0, 16).replace('T', ' ')}`} tone="neutral" />
          <Chip label={`Créé: ${incident.createdAt.slice(0, 10)}`} tone="neutral" />
          {incident.dueDate ? <Chip label={`Échéance: ${incident.dueDate}`} tone="warning" /> : null}
          {incident.assignedTo ? <Chip label={`Assigné: ${incident.assignedTo}`} tone="brand" /> : null}
        </View>
      </Card>

      <SectionHeader title="Actions" />
      {canEdit ? (
        <View className="gap-3">
          <Button label="Passer en cours" variant="secondary" onPress={() => dispatch({ type: 'setIncidentStatus', incidentId: incident.id, status: 'en_cours' })} />
          <Button label="Clôturer" onPress={() => dispatch({ type: 'setIncidentStatus', incidentId: incident.id, status: 'clos' })} />
          <Button label="Réouvrir" variant="ghost" onPress={() => dispatch({ type: 'setIncidentStatus', incidentId: incident.id, status: 'ouvert' })} />
        </View>
      ) : (
        <Card>
          <Text className="text-[14px] font-semibold text-slate-900 dark:text-white">Lecture seule</Text>
          <Text className="mt-1 text-[13px] text-slate-500 dark:text-slate-300">
            La modification et la clôture d’incidents sont réservées aux rôles opérationnels.
          </Text>
        </Card>
      )}

      <SectionHeader title="Conformité & Preuves (à venir)" />
      <Card>
        <Text className="text-[14px] font-semibold text-slate-900 dark:text-white">Liens avec contrôles</Text>
        <Text className="mt-1 text-[13px] text-slate-500 dark:text-slate-300">
          Liaison avec checklists, géolocalisation, photos signées, et validation correction — prévu dans l’itération suivante.
        </Text>
      </Card>
    </Screen>
  );
}
