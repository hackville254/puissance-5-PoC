import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, Pressable, Text, View } from 'react-native';
import { useColorScheme } from 'nativewind';
import { useState } from 'react';

import { AppBar } from '../../../components/ui/AppBar';
import { Button } from '../../../components/ui/Button';
import { CameraCaptureModal } from '../../../components/ui/CameraCaptureModal';
import { Card } from '../../../components/ui/Card';
import { Chip } from '../../../components/ui/Chip';
import { Icon } from '../../../components/ui/Icon';
import { Screen } from '../../../components/ui/Screen';
import { SectionHeader } from '../../../components/ui/SectionHeader';
import { WatermarkedThumbnail } from '../../../components/ui/WatermarkedThumbnail';
import { createSignedEvidence, readFieldEvidenceContext } from '../../../lib/evidence';
import { nowISODateTime } from '../../../lib/format';
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
  const { colorScheme } = useColorScheme();
  const [cameraOpen, setCameraOpen] = useState(false);

  const incident = state.incidents.find(i => i.id === id);
  const site = incident ? state.sites.find(s => s.id === incident.siteId) : undefined;
  const canEdit = canPerform(state.role, 'manage_incidents');
  const hasProof = Boolean(incident && incident.photos.length > 0);
  const isDark = colorScheme === 'dark';
  const overlay = isDark ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.35)';

  const captureIncidentPhoto = async (photoUri: string) => {
    if (!incident) return;
    const capturedAt = nowISODateTime();
    const context = await readFieldEvidenceContext();
    const signed = await createSignedEvidence(photoUri, [capturedAt, incident.id, context.lat, context.lng, context.networkType]);
    dispatch({
      type: 'addIncidentPhoto',
      incidentId: incident.id,
      photo: {
        id: `inc_ph_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`,
        uri: photoUri,
        capturedAt,
        lat: context.lat,
        lng: context.lng,
        fileHash: signed.fileHash,
        signature: signed.signature,
        certified: signed.certified
      }
    });
    setCameraOpen(false);
  };

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
          {incident.status === 'ouvert' ? (
            <Button label="Passer en cours" onPress={() => dispatch({ type: 'setIncidentStatus', incidentId: incident.id, status: 'en_cours' })} />
          ) : null}
          {incident.status === 'en_cours' ? (
            <>
              <Button
                label={hasProof ? 'Clôturer' : 'Clôturer (preuve requise)'}
                disabled={!hasProof}
                onPress={() => {
                  if (!hasProof) {
                    Alert.alert('Preuve requise', 'Ajoute au moins une photo avant de clôturer l’incident.');
                    return;
                  }
                  dispatch({ type: 'setIncidentStatus', incidentId: incident.id, status: 'clos' });
                }}
              />
              <Button label="Repasser en ouvert" variant="secondary" onPress={() => dispatch({ type: 'setIncidentStatus', incidentId: incident.id, status: 'ouvert' })} />
            </>
          ) : null}
          {incident.status === 'clos' ? (
            <Button label="Réouvrir" variant="secondary" onPress={() => dispatch({ type: 'setIncidentStatus', incidentId: incident.id, status: 'ouvert' })} />
          ) : null}
        </View>
      ) : (
        <Card>
          <Text className="text-[14px] font-semibold text-slate-900 dark:text-white">Lecture seule</Text>
          <Text className="mt-1 text-[13px] text-slate-500 dark:text-slate-300">
            La modification et la clôture d’incidents sont réservées aux rôles opérationnels.
          </Text>
        </Card>
      )}

      <SectionHeader title="Preuves photo" />
      <Card>
        <Text className="text-[14px] font-semibold text-slate-900 dark:text-white">Constat visuel</Text>
        <Text className="mt-1 text-[13px] text-slate-500 dark:text-slate-300">
          Ajoute des photos prises sur place pour documenter l’incident et sa resolution.
        </Text>
        <View className="mt-4 flex-row flex-wrap gap-2">
          <Chip label={`${incident.photos.length} photo${incident.photos.length > 1 ? 's' : ''}`} tone="brand" />
          <Chip label={incident.photos.every(photo => photo.certified) && incident.photos.length > 0 ? 'Photos signées' : 'Photos en cours'} tone={incident.photos.every(photo => photo.certified) && incident.photos.length > 0 ? 'success' : 'warning'} />
        </View>
        {canEdit ? (
          <Button
            label={incident.photos.length > 0 ? 'Ajouter une photo' : 'Prendre une photo'}
            left={<Icon name="camera" size={16} color="#FFFFFF" />}
            onPress={() => setCameraOpen(true)}
            className="mt-4"
          />
        ) : null}
        {incident.photos.length > 0 ? (
          <View className="mt-4 gap-3">
            {incident.photos.map(photo => (
              <Pressable
                key={photo.id}
                onLongPress={() => {
                  if (!canEdit) return;
                  Alert.alert('Supprimer', 'Supprimer cette photo ?', [
                    { text: 'Annuler', style: 'cancel' },
                    { text: 'Supprimer', style: 'destructive', onPress: () => dispatch({ type: 'deleteIncidentPhoto', incidentId: incident.id, photoId: photo.id }) }
                  ]);
                }}
                className="flex-row items-center justify-between rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3"
              >
                <View className="flex-row items-center flex-1 pr-3">
                  <WatermarkedThumbnail uri={photo.uri} capturedAt={photo.capturedAt} size={52} radius={14} />
                  <View className="ml-3 flex-1">
                    <Text className="text-[13px] font-semibold text-slate-900 dark:text-white">Photo terrain</Text>
                    <Text className="mt-0.5 text-[12px] text-slate-500 dark:text-slate-300">
                      {photo.capturedAt.slice(0, 16).replace('T', ' ')} • {photo.certified ? 'signée' : 'non signée'}
                    </Text>
                    {typeof photo.lat === 'number' && typeof photo.lng === 'number' ? (
                      <Text className="mt-0.5 text-[11px] text-slate-400 dark:text-slate-500">
                        GPS: {photo.lat.toFixed(5)}, {photo.lng.toFixed(5)}
                      </Text>
                    ) : null}
                  </View>
                </View>
                <Chip label={photo.certified ? 'OK' : '!'} tone={photo.certified ? 'success' : 'warning'} />
              </Pressable>
            ))}
          </View>
        ) : (
          <View className="mt-4 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 px-4 py-5">
            <Text className="text-[13px] font-semibold text-slate-900 dark:text-white">Aucune photo pour le moment</Text>
            <Text className="mt-1 text-[12px] text-slate-500 dark:text-slate-300">
              {canEdit ? 'Prends au moins une photo pour documenter le constat.' : 'Aucune preuve photo n a encore ete ajoutée.'}
            </Text>
          </View>
        )}
      </Card>

      <CameraCaptureModal
        visible={cameraOpen}
        title="Photo incident"
        mode="photo"
        overlay={overlay}
        onClose={() => setCameraOpen(false)}
        onPhotoCaptured={captureIncidentPhoto}
      />
    </Screen>
  );
}
