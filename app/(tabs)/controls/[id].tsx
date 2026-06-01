import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, Image, Modal, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { useColorScheme } from 'nativewind';
import { useEffect, useMemo, useState } from 'react';

import { AppBar } from '../../../components/ui/AppBar';
import { Button } from '../../../components/ui/Button';
import { CameraCaptureModal } from '../../../components/ui/CameraCaptureModal';
import { Card } from '../../../components/ui/Card';
import { Chip } from '../../../components/ui/Chip';
import { Icon } from '../../../components/ui/Icon';
import { Rating } from '../../../components/ui/Rating';
import { Screen } from '../../../components/ui/Screen';
import { SectionHeader } from '../../../components/ui/SectionHeader';
import { createSignedEvidence } from '../../../lib/evidence';
import { haversineDistanceMeters, nowISODateTime } from '../../../lib/format';
import { canAccessPathname, canPerform } from '../../../lib/models';
import { routes } from '../../../lib/routes';
import { useAppStore } from '../../../lib/store';

export default function ControlDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { state, dispatch } = useAppStore();
  const { colorScheme } = useColorScheme();
  const Location: any = Platform.OS === 'web' ? null : require('expo-location');
  const Network: any = Platform.OS === 'web' ? null : require('expo-network');
  const [cameraMode, setCameraMode] = useState<null | { kind: 'before' | 'after' | 'qr' }>(null);
  const [pendingCaptureKind, setPendingCaptureKind] = useState<null | 'before' | 'after'>(null);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [qrValue, setQrValue] = useState('');

  const control = state.plannedControls.find(c => c.id === id);
  const site = control ? state.sites.find(s => s.id === control.siteId) : undefined;
  const template = state.templates[0];
  const inspection = control ? state.inspections.find(i => i.plannedControlId === control.id) : undefined;
  const [peopleDraft, setPeopleDraft] = useState(() => ({
    evaluator: inspection?.evaluatorName ?? '',
    agent: inspection?.evaluatedAgentName ?? ''
  }));

  const criticalIds = (template?.items ?? []).filter(i => i.critical).map(i => i.id);
  const criticalOk = inspection ? criticalIds.every(id0 => inspection.checklist[id0]) : false;
  const beforeCount = inspection ? inspection.photos.filter(p => p.kind === 'before').length : 0;
  const afterCount = inspection ? inspection.photos.filter(p => p.kind === 'after').length : 0;
  const photosOk = control?.type === 'beforeAfter' ? beforeCount > 0 && afterCount > 0 : (inspection?.photos.length ?? 0) > 0;
  const certsOk = Boolean(
    inspection?.certifications.gpsVerified &&
      inspection?.certifications.networkVerified &&
      inspection?.certifications.qrScanned &&
      inspection?.certifications.photoCertified
  );
  const canComplete = Boolean(inspection && inspection.rating > 0 && criticalOk && photosOk && certsOk);

  const isDark = colorScheme === 'dark';
  const overlay = isDark ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.35)';

  const ensureCertPrereqs = async () => {
    if (!inspection || !site) return null;
    if (Platform.OS === 'web') return null;

    const locPerm = await Location.requestForegroundPermissionsAsync();
    if (locPerm.status !== 'granted') {
      dispatch({ type: 'setInspectionCertifications', inspectionId: inspection.id, patch: { gpsVerified: false } });
      Alert.alert('Localisation refusée', 'La vérification GPS nécessite l’autorisation de localisation.');
      return null;
    }

    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    const lat = pos?.coords?.latitude;
    const lng = pos?.coords?.longitude;

    const distance = typeof lat === 'number' && typeof lng === 'number' ? haversineDistanceMeters(lat, lng, site.lat, site.lng) : undefined;
    const gpsVerified = typeof distance === 'number' ? distance <= site.geofenceRadiusM : false;

    const net = await Network.getNetworkStateAsync();
    const networkVerified = Boolean(net?.isConnected);
    const networkType = net?.type ? String(net.type) : undefined;

    dispatch({
      type: 'setInspectionCertifications',
      inspectionId: inspection.id,
      patch: {
        gpsVerified,
        networkVerified,
        lastDistanceMeters: distance ? Math.round(distance) : undefined,
        lastNetworkType: networkType
      }
    });
    return {
      lat: typeof lat === 'number' ? lat : undefined,
      lng: typeof lng === 'number' ? lng : undefined,
      distanceMeters: typeof distance === 'number' ? Math.round(distance) : undefined,
      gpsVerified,
      networkVerified,
      networkType
    };
  };

  const savePhoto = async (kind: 'before' | 'after', photoUri: string) => {
    if (!inspection || !site) return;
    if (Platform.OS === 'web') return;

    const prereq = await ensureCertPrereqs();

    const capturedAt = nowISODateTime();
    const lat = prereq?.lat;
    const lng = prereq?.lng;
    const distanceMeters = prereq?.distanceMeters;
    const sig = await createSignedEvidence(photoUri, [capturedAt, site.id, lat, lng, distanceMeters]);
    const certified = Boolean(sig.signature && (prereq ? prereq.gpsVerified : inspection.certifications.gpsVerified) && (prereq ? prereq.networkVerified : inspection.certifications.networkVerified) && inspection.certifications.qrScanned);

    dispatch({
      type: 'addInspectionPhoto',
      inspectionId: inspection.id,
      photo: {
        id: `ph_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`,
        kind,
        uri: photoUri,
        capturedAt,
        lat,
        lng,
        distanceMeters: typeof distanceMeters === 'number' ? distanceMeters : undefined,
        fileHash: sig.fileHash,
        signature: sig.signature,
        certified
      }
    });
    setCameraMode(null);
  };

  const setQr = (value: string) => {
    if (!inspection || !site) return;
    const v = value.trim();
    const ok = v.length > 0 && (v === site.id || v.endsWith(site.id));
    dispatch({
      type: 'setInspectionCertifications',
      inspectionId: inspection.id,
      patch: {
        qrScanned: ok,
        lastQrValue: ok ? v : undefined
      }
    });
    if (!ok) Alert.alert('QR invalide', 'Le code ne correspond pas au site sélectionné.');
  };

  const allPhotosCertified = useMemo(() => (inspection ? inspection.photos.every(photo => photo.certified) : false), [inspection]);

  useEffect(() => {
    if (!inspection) return;
    if (inspection.certifications.photoCertified === allPhotosCertified) return;
    dispatch({ type: 'setInspectionCertifications', inspectionId: inspection.id, patch: { photoCertified: allPhotosCertified } });
  }, [allPhotosCertified, dispatch, inspection]);

  useEffect(() => {
    if (!inspection || !pendingCaptureKind) return;
    setCameraMode({ kind: pendingCaptureKind });
    setPendingCaptureKind(null);
  }, [inspection, pendingCaptureKind]);

  const startInspection = (openKind?: 'before' | 'after') => {
    if (!control) return;
    dispatch({ type: 'startInspection', plannedControlId: control.id });
    if (openKind) setPendingCaptureKind(openKind);
  };

  if (!control || !template) {
    return (
      <Screen>
        <AppBar title="Contrôle" subtitle="Détails" left={{ icon: 'chevron-left', label: 'Retour', onPress: () => router.back() }} />
        <Card className="mt-6">
          <Text className="text-[14px] font-semibold text-slate-900 dark:text-white">Introuvable</Text>
          <Text className="mt-1 text-[13px] text-slate-500 dark:text-slate-300">Ce contrôle est introuvable.</Text>
        </Card>
      </Screen>
    );
  }

  if (state.role === 'client') {
    return (
      <Screen>
        <AppBar title="Contrôle" subtitle={site?.name ?? 'Site'} left={{ icon: 'chevron-left', label: 'Retour', onPress: () => router.back() }} />

        <Card className="mt-6">
          <Text className="text-[15px] font-semibold text-slate-900 dark:text-white">Lecture seule</Text>
          <Text className="mt-1 text-[13px] text-slate-500 dark:text-slate-300">
            La réalisation terrain (checklist, preuves, clôture) est réservée aux rôles opérationnels.
          </Text>
          <View className="mt-4 flex-row flex-wrap gap-2">
            <Chip label={`${control.startTime}–${control.endTime}`} tone="brand" />
            <Chip label={control.type === 'beforeAfter' ? 'Avant/Après' : 'Qualité'} tone="neutral" />
            <Chip label={control.status === 'done' ? 'Terminé' : control.status === 'inProgress' ? 'En cours' : 'Planifié'} tone="neutral" />
          </View>
        </Card>

        <SectionHeader title="Synthèse" />
        <Card>
          <Text className="text-[13px] text-slate-500 dark:text-slate-300">Note: {inspection?.rating ? `${inspection.rating}/5` : '—'}</Text>
          <Text className="mt-2 text-[13px] text-slate-500 dark:text-slate-300">Photos: {inspection?.photos.length ?? 0}</Text>
          <Text className="mt-2 text-[13px] text-slate-500 dark:text-slate-300">
            Certifications: {certsOk ? 'OK' : 'incomplètes'}
          </Text>
        </Card>

        {canAccessPathname(state.role, '/reports') ? (
          <Button label="Ouvrir les rapports" variant="secondary" onPress={() => router.push(routes.reports)} className="mt-4" />
        ) : null}
      </Screen>
    );
  }

  return (
    <Screen>
      <AppBar
        title={site?.name ?? 'Contrôle'}
        subtitle={`${control.startTime}–${control.endTime} • ${site?.city ?? ''}`}
        left={{ icon: 'chevron-left', label: 'Retour', onPress: () => router.back() }}
        right={canPerform(state.role, 'plan_controls') ? [{ icon: 'pencil', label: 'Modifier', onPress: () => router.push(routes.editControl(control.id)) }] : undefined}
      />
      <View className="mt-4 flex-row">
        <Chip
          label={control.status === 'done' ? 'Terminé' : control.status === 'inProgress' ? 'En cours' : 'Planifié'}
          tone={control.status === 'done' ? 'success' : control.status === 'inProgress' ? 'brand' : 'neutral'}
        />
        <View className="w-2" />
        <Chip label={control.type === 'beforeAfter' ? 'Avant/Après' : 'Qualité'} tone="neutral" />
      </View>

      {!inspection ? (
        <Card className="mt-6">
          <Text className="text-[15px] font-semibold text-slate-900 dark:text-white">Prêt à démarrer</Text>
          <Text className="mt-1 text-[13px] text-slate-500 dark:text-slate-300">
            {control.type === 'beforeAfter'
              ? 'Ce contrôle demande une photo avant et une photo après, en plus de la checklist et des certifications.'
              : 'Ce contrôle demande au moins une photo de preuve, la checklist, la note et les certifications.'}
          </Text>
          <View className="mt-4 flex-row flex-wrap gap-2">
            <Chip label={control.type === 'beforeAfter' ? '2 photos minimum' : '1 photo minimum'} tone="warning" />
            <Chip label="QR requis" tone="neutral" />
            <Chip label="GPS + réseau requis" tone="neutral" />
          </View>
          <Button
            label="Démarrer le contrôle"
            onPress={() => startInspection()}
            className="mt-4"
          />
          <Button
            label={control.type === 'beforeAfter' ? 'Démarrer et ouvrir la photo avant' : 'Démarrer et ouvrir la caméra'}
            variant="secondary"
            onPress={() => startInspection(control.type === 'beforeAfter' ? 'before' : 'after')}
            className="mt-3"
          />
        </Card>
      ) : (
        <View>
          <SectionHeader title="Certifications" />
          <View className="flex-row flex-wrap gap-2">
            <Chip label={inspection.certifications.timeStamped ? 'Horodaté' : 'Horodatage'} tone={inspection.certifications.timeStamped ? 'success' : 'neutral'} />
            <Chip label={inspection.certifications.gpsVerified ? 'GPS vérifié' : 'GPS requis'} tone={inspection.certifications.gpsVerified ? 'success' : 'warning'} />
            <Chip label={inspection.certifications.qrScanned ? 'QR scanné' : 'QR requis'} tone={inspection.certifications.qrScanned ? 'success' : 'warning'} />
            <Chip label={inspection.certifications.networkVerified ? 'Réseau OK' : 'Réseau à vérifier'} tone={inspection.certifications.networkVerified ? 'success' : 'neutral'} />
            <Chip label={inspection.certifications.photoCertified ? 'Photos certifiées' : 'Photos à certifier'} tone={inspection.certifications.photoCertified ? 'success' : 'warning'} />
          </View>
          <View className="mt-4 flex-row gap-3">
            <Button
              label="Vérifier GPS/Réseau"
              variant="secondary"
              onPress={async () => {
                await ensureCertPrereqs();
              }}
              className="flex-1 h-11 rounded-2xl"
            />
            <Button
              label="Scanner QR"
              variant="secondary"
              onPress={() => (Platform.OS === 'web' ? setQrModalOpen(true) : setCameraMode({ kind: 'qr' }))}
              className="flex-1 h-11 rounded-2xl"
            />
          </View>
          <Pressable
            onPress={() => {
              setQrValue('');
              setQrModalOpen(true);
            }}
            className="mt-3 h-12 flex-row items-center justify-between rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 active:opacity-90"
          >
            <Text className="text-[14px] font-semibold text-slate-900 dark:text-white">Saisir un code QR</Text>
            <Icon name="chevron-right" size={18} color={isDark ? '#FFFFFF' : '#0F172A'} />
          </Pressable>

          <SectionHeader title="Accès rapide" />
          <View className="gap-3">
            {control.type === 'beforeAfter' ? (
              <View className="flex-row gap-3">
                <Button label={`Photo avant (${beforeCount})`} left={<Icon name="camera" size={16} color="#FFFFFF" />} onPress={() => setCameraMode({ kind: 'before' })} className="flex-1" />
                <Button label={`Photo après (${afterCount})`} variant="secondary" left={<Icon name="camera" size={16} color={isDark ? '#FFFFFF' : '#0F172A'} />} onPress={() => setCameraMode({ kind: 'after' })} className="flex-1" />
              </View>
            ) : (
              <Button
                label={`Prendre une photo de preuve (${inspection.photos.length})`}
                left={<Icon name="camera" size={16} color="#FFFFFF" />}
                onPress={() => setCameraMode({ kind: beforeCount > afterCount ? 'after' : 'before' })}
              />
            )}
          </View>

          <SectionHeader title="Évaluation nominative" />
          <Card>
            <View className="flex-row gap-3">
              <View className="flex-1">
                <Text className="text-[12px] font-semibold text-slate-600 dark:text-slate-300">Évaluateur</Text>
                <TextInput
                  value={peopleDraft.evaluator}
                  onChangeText={t => setPeopleDraft(p => ({ ...p, evaluator: t }))}
                  onEndEditing={() =>
                    dispatch({
                      type: 'setInspectionPeople',
                      inspectionId: inspection.id,
                      evaluatorName: peopleDraft.evaluator,
                      evaluatedAgentName: peopleDraft.agent
                    })
                  }
                  placeholder="Ex: Contrôleur"
                  placeholderTextColor={isDark ? 'rgba(255,255,255,0.45)' : '#94A3B8'}
                  className="mt-2 text-[14px] text-slate-900 dark:text-white"
                />
              </View>
              <View className="flex-1">
                <Text className="text-[12px] font-semibold text-slate-600 dark:text-slate-300">Agent évalué</Text>
                <TextInput
                  value={peopleDraft.agent}
                  onChangeText={t => setPeopleDraft(p => ({ ...p, agent: t }))}
                  onEndEditing={() =>
                    dispatch({
                      type: 'setInspectionPeople',
                      inspectionId: inspection.id,
                      evaluatorName: peopleDraft.evaluator,
                      evaluatedAgentName: peopleDraft.agent
                    })
                  }
                  placeholder="Ex: Agent"
                  placeholderTextColor={isDark ? 'rgba(255,255,255,0.45)' : '#94A3B8'}
                  className="mt-2 text-[14px] text-slate-900 dark:text-white"
                />
              </View>
            </View>
          </Card>

          <SectionHeader title="Notation" />
          <Card>
            <Text className="text-[14px] font-semibold text-slate-900 dark:text-white">Score qualité</Text>
            <Text className="mt-1 text-[13px] text-slate-500 dark:text-slate-300">Requis pour clôturer le contrôle.</Text>
            <Rating value={inspection.rating} onChange={v => dispatch({ type: 'setInspectionRating', inspectionId: inspection.id, rating: v })} className="mt-3" />
          </Card>

          <SectionHeader title="Checklist" />
          <View className="gap-3">
            {template.items.map(item => {
              const checked = Boolean(inspection.checklist[item.id]);
              return (
                <Card key={item.id} onPress={() => dispatch({ type: 'toggleChecklist', inspectionId: inspection.id, itemId: item.id })}>
                  <View className="flex-row items-center justify-between">
                    <View className="flex-1 pr-4">
                      <Text className="text-[14px] font-semibold text-slate-900 dark:text-white">{item.label}</Text>
                      {item.critical ? (
                        <Text className="mt-1 text-[12px] text-rose-600 dark:text-rose-300">Critique</Text>
                      ) : (
                        <Text className="mt-1 text-[12px] text-slate-500 dark:text-slate-300">Optionnel</Text>
                      )}
                    </View>
                    <View
                      className={
                        checked
                          ? 'h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-950'
                          : 'h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800'
                      }
                    >
                      <Icon name={checked ? 'check' : 'circle'} size={20} color={checked ? '#047857' : '#94A3B8'} strokeWidth={2.4} />
                    </View>
                  </View>
                </Card>
              );
            })}
          </View>

          <SectionHeader title={control.type === 'beforeAfter' ? 'Photos avant / après' : 'Preuves photo'} />
          <Card>
            <Text className="text-[14px] font-semibold text-slate-900 dark:text-white">Preuves</Text>
            <Text className="mt-1 text-[13px] text-slate-500 dark:text-slate-300">
              {control.type === 'beforeAfter'
                ? 'Ajoute les photos avant et après pour documenter l intervention.'
                : 'Ajoute au moins une photo prise sur place pour justifier le contrôle.'}
            </Text>
            {control.type === 'beforeAfter' ? (
              <View className="mt-4 flex-row gap-3">
                <Pressable onPress={() => setCameraMode({ kind: 'before' })} className="flex-1 rounded-2xl bg-slate-100 dark:bg-slate-800 p-4 active:opacity-90">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-[13px] font-semibold text-slate-800 dark:text-slate-100">Avant</Text>
                    <Icon name="plus" size={16} color={isDark ? '#FFFFFF' : '#0F172A'} />
                  </View>
                  <Text className="mt-1 text-[12px] text-slate-500 dark:text-slate-300">{beforeCount} photo{beforeCount > 1 ? 's' : ''}</Text>
                </Pressable>
                <Pressable onPress={() => setCameraMode({ kind: 'after' })} className="flex-1 rounded-2xl bg-slate-100 dark:bg-slate-800 p-4 active:opacity-90">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-[13px] font-semibold text-slate-800 dark:text-slate-100">Après</Text>
                    <Icon name="plus" size={16} color={isDark ? '#FFFFFF' : '#0F172A'} />
                  </View>
                  <Text className="mt-1 text-[12px] text-slate-500 dark:text-slate-300">{afterCount} photo{afterCount > 1 ? 's' : ''}</Text>
                </Pressable>
              </View>
            ) : (
              <Pressable onPress={() => setCameraMode({ kind: 'before' })} className="mt-4 rounded-2xl bg-slate-100 dark:bg-slate-800 p-4 active:opacity-90">
                <View className="flex-row items-center justify-between">
                  <Text className="text-[13px] font-semibold text-slate-800 dark:text-slate-100">Prendre une photo de preuve</Text>
                  <Icon name="camera" size={18} color={isDark ? '#FFFFFF' : '#0F172A'} />
                </View>
                <Text className="mt-1 text-[12px] text-slate-500 dark:text-slate-300">{inspection.photos.length} photo{inspection.photos.length > 1 ? 's' : ''}</Text>
              </Pressable>
            )}
            {inspection.photos.length > 0 ? (
              <View className="mt-4 gap-3">
                {inspection.photos.slice(0, 4).map(p => (
                  <Pressable
                    key={p.id}
                    onLongPress={() =>
                      Alert.alert('Supprimer', 'Supprimer cette photo ?', [
                        { text: 'Annuler', style: 'cancel' },
                        { text: 'Supprimer', style: 'destructive', onPress: () => dispatch({ type: 'deleteInspectionPhoto', inspectionId: inspection.id, photoId: p.id }) }
                      ])
                    }
                    className="flex-row items-center justify-between rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3"
                  >
                    <View className="flex-row items-center">
                      <Image source={{ uri: p.uri }} style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: isDark ? '#111B21' : '#E2E8F0' }} />
                      <View className="ml-3">
                        <Text className="text-[13px] font-semibold text-slate-900 dark:text-white">
                          {control.type === 'beforeAfter' ? (p.kind === 'before' ? 'Avant' : 'Après') : 'Preuve terrain'}
                        </Text>
                        <Text className="mt-0.5 text-[12px] text-slate-500 dark:text-slate-300">
                          {p.capturedAt.slice(0, 16).replace('T', ' ')} • {p.certified ? 'certifiée' : 'non certifiée'}
                        </Text>
                      </View>
                    </View>
                    <Chip label={p.certified ? 'OK' : '!' } tone={p.certified ? 'success' : 'warning'} />
                  </Pressable>
                ))}
              </View>
            ) : null}
          </Card>

          <SectionHeader title="Commentaire" />
          <Card>
            <TextInput
              value={inspection.notes}
              onChangeText={t => dispatch({ type: 'setInspectionNotes', inspectionId: inspection.id, notes: t })}
              placeholder="Ajoute un commentaire…"
              placeholderTextColor="#94A3B8"
              multiline
              className="min-h-[96px] text-[14px] text-slate-900 dark:text-white"
            />
          </Card>

          <View className="mt-6">
            <Button
              label={
                canComplete
                  ? 'Clôturer le contrôle'
                  : `Compléter (score + critiques + preuves${control.type === 'beforeAfter' ? ' avant/après' : ''} + certifs requis)`
              }
              onPress={() => {
                if (!canComplete) return;
                dispatch({ type: 'completeInspection', inspectionId: inspection.id });
              }}
              disabled={!canComplete}
            />
            {canAccessPathname(state.role, routes.reports) ? (
              <Pressable
                onPress={() => router.push(routes.reports)}
                className="mt-3 h-12 items-center justify-center rounded-2xl border border-slate-200 bg-white active:opacity-90"
              >
                <Text className="text-[15px] font-semibold text-slate-900">Voir les rapports</Text>
              </Pressable>
            ) : null}
          </View>

          <CameraCaptureModal
            visible={Boolean(cameraMode)}
            title={cameraMode?.kind === 'qr' ? 'Scanner QR' : cameraMode?.kind === 'before' ? 'Photo avant' : 'Photo après'}
            mode={cameraMode?.kind === 'qr' ? 'qr' : 'photo'}
            overlay={overlay}
            onClose={() => setCameraMode(null)}
            onBarcodeScanned={value => setQr(value)}
            onPhotoCaptured={async uri => {
              if (cameraMode?.kind === 'before' || cameraMode?.kind === 'after') {
                await savePhoto(cameraMode.kind, uri);
              }
            }}
          />

          <Modal visible={qrModalOpen} transparent animationType="fade" onRequestClose={() => setQrModalOpen(false)}>
            <Pressable onPress={() => setQrModalOpen(false)} style={{ flex: 1, backgroundColor: overlay, justifyContent: 'center', paddingHorizontal: 18 }}>
              <Pressable onPress={() => {}} style={{ backgroundColor: isDark ? '#0B141A' : '#FFFFFF', borderRadius: 24, padding: 16 }}>
                <Text className="text-[15px] font-extrabold text-slate-900 dark:text-white">Code QR</Text>
                <Text className="mt-1 text-[13px] text-slate-500 dark:text-slate-300">Saisis le code affiché sur site.</Text>
                <View className="mt-4 rounded-2xl bg-slate-50 dark:bg-slate-800 px-4 py-3">
                  <TextInput
                    value={qrValue}
                    onChangeText={setQrValue}
                    placeholder="Ex: site_xxx"
                    placeholderTextColor={isDark ? 'rgba(255,255,255,0.45)' : '#94A3B8'}
                    className="text-[14px] text-slate-900 dark:text-white"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
                <View className="mt-4 flex-row gap-3">
                  <Button label="Annuler" variant="secondary" onPress={() => setQrModalOpen(false)} className="flex-1 h-11 rounded-2xl" />
                  <Button
                    label="Valider"
                    onPress={() => {
                      setQrModalOpen(false);
                      setQr(qrValue);
                    }}
                    className="flex-1 h-11 rounded-2xl"
                  />
                </View>
              </Pressable>
            </Pressable>
          </Modal>
        </View>
      )}
    </Screen>
  );
}
