import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, Image, Modal, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { useColorScheme } from 'nativewind';
import { useEffect, useMemo, useRef, useState } from 'react';

import { AppBar } from '../../../components/ui/AppBar';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { Chip } from '../../../components/ui/Chip';
import { Icon } from '../../../components/ui/Icon';
import { Rating } from '../../../components/ui/Rating';
import { Screen } from '../../../components/ui/Screen';
import { SectionHeader } from '../../../components/ui/SectionHeader';
import { haversineDistanceMeters, nowISODateTime } from '../../../lib/format';
import { canAccessPathname, canPerform } from '../../../lib/models';
import { routes } from '../../../lib/routes';
import { useAppStore } from '../../../lib/store';

export default function ControlDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { state, dispatch } = useAppStore();
  const { colorScheme } = useColorScheme();

  const CameraView: any = Platform.OS === 'web' ? null : require('expo-camera').CameraView;
  const cameraPermissionsHook =
    Platform.OS === 'web'
      ? (() => [null, async () => null] as const)
      : (require('expo-camera').useCameraPermissions as () => readonly [any, () => Promise<any>]);
  const Location: any = Platform.OS === 'web' ? null : require('expo-location');
  const Network: any = Platform.OS === 'web' ? null : require('expo-network');
  const Crypto: any = Platform.OS === 'web' ? null : require('expo-crypto');
  const SecureStore: any = Platform.OS === 'web' ? null : require('expo-secure-store');
  const FileSystemLegacy: any = Platform.OS === 'web' ? null : require('expo-file-system/legacy');
  const [cameraMode, setCameraMode] = useState<null | { kind: 'before' | 'after' | 'qr' }>(null);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [qrValue, setQrValue] = useState('');
  const [cameraPermission, requestCameraPermission] = cameraPermissionsHook();
  const cameraRef = useRef<any>(null);

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

  const ensureDeviceSecret = async () => {
    if (Platform.OS === 'web') return null;
    const key = 'p5_device_secret_v1';
    const existing = await SecureStore.getItemAsync(key);
    if (existing) return existing;
    const bytes = await Crypto.getRandomBytesAsync(32);
    const secret = Array.from(bytes as number[])
      .map(b => Number(b).toString(16).padStart(2, '0'))
      .join('');
    await SecureStore.setItemAsync(key, secret);
    return secret;
  };

  const signPhoto = async (
    fileUri: string,
    capturedAt: string,
    lat?: number,
    lng?: number,
    distanceMeters?: number,
    prereq?: { gpsVerified: boolean; networkVerified: boolean }
  ) => {
    if (!inspection || !site) return { fileHash: undefined, signature: undefined, certified: false };
    if (Platform.OS === 'web') return { fileHash: undefined, signature: undefined, certified: false };
    const secret = await ensureDeviceSecret();
    if (!secret) return { fileHash: undefined, signature: undefined, certified: false };
    const info = await FileSystemLegacy.getInfoAsync(fileUri, { md5: true });
    const fileHash = info?.md5
      ? await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, info.md5)
      : await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${fileUri}|${capturedAt}`);
    const payload = `${secret}|${fileHash}|${site.id}|${capturedAt}|${lat ?? ''}|${lng ?? ''}|${distanceMeters ?? ''}`;
    const signature = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, payload);
    const gpsOk = prereq ? prereq.gpsVerified : inspection.certifications.gpsVerified;
    const netOk = prereq ? prereq.networkVerified : inspection.certifications.networkVerified;
    const certified = Boolean(signature && gpsOk && netOk && inspection.certifications.qrScanned);
    return { fileHash, signature, certified };
  };

  const takePhoto = async (kind: 'before' | 'after') => {
    if (!inspection || !site) return;
    if (Platform.OS === 'web') return;

    const perm = cameraPermission?.granted ? cameraPermission : await requestCameraPermission();
    if (!perm?.granted) {
      Alert.alert('Caméra refusée', 'La capture photo nécessite l’autorisation caméra.');
      return;
    }

    const prereq = await ensureCertPrereqs();

    const capturedAt = nowISODateTime();
    const photo = await cameraRef.current?.takePictureAsync({ quality: 0.65, exif: false });
    if (!photo?.uri) return;

    const lat = prereq?.lat;
    const lng = prereq?.lng;
    const distanceMeters = prereq?.distanceMeters;
    const sig = await signPhoto(photo.uri, capturedAt, lat, lng, distanceMeters, prereq ? { gpsVerified: prereq.gpsVerified, networkVerified: prereq.networkVerified } : undefined);

    dispatch({
      type: 'addInspectionPhoto',
      inspectionId: inspection.id,
      photo: {
        id: `ph_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`,
        kind,
        uri: photo.uri,
        capturedAt,
        lat,
        lng,
        distanceMeters: typeof distanceMeters === 'number' ? distanceMeters : undefined,
        fileHash: sig.fileHash,
        signature: sig.signature,
        certified: sig.certified
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
            Checklist, notation, photos avant/après et suivi des preuves.
          </Text>
          <Button
            label="Démarrer le contrôle"
            onPress={() => dispatch({ type: 'startInspection', plannedControlId: control.id })}
            className="mt-4"
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

          <SectionHeader title="Photos avant / après" />
          <Card>
            <Text className="text-[14px] font-semibold text-slate-900 dark:text-white">Preuves</Text>
            <Text className="mt-1 text-[13px] text-slate-500 dark:text-slate-300">Ajoute les photos prises sur place pour documenter l’intervention.</Text>
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
                        <Text className="text-[13px] font-semibold text-slate-900 dark:text-white">{p.kind === 'before' ? 'Avant' : 'Après'}</Text>
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
            <Pressable onPress={() => router.push(routes.reports)} className="mt-3 h-12 items-center justify-center rounded-2xl border border-slate-200 bg-white active:opacity-90">
              <Text className="text-[15px] font-semibold text-slate-900">Voir les rapports</Text>
            </Pressable>
          </View>

          <Modal visible={Boolean(cameraMode)} transparent animationType="fade" onRequestClose={() => setCameraMode(null)}>
            <View style={{ flex: 1, backgroundColor: overlay }}>
              <View style={{ flex: 1 }}>
                <View style={{ paddingTop: 12, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Pressable onPress={() => setCameraMode(null)} style={{ height: 42, paddingHorizontal: 14, borderRadius: 999, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center' }}>
                    <Text style={{ color: '#FFFFFF', fontWeight: '800' }}>Fermer</Text>
                  </Pressable>
                  <Text style={{ color: '#FFFFFF', fontWeight: '900' }}>
                    {cameraMode?.kind === 'qr' ? 'Scanner QR' : cameraMode?.kind === 'before' ? 'Photo avant' : 'Photo après'}
                  </Text>
                  <View style={{ width: 72 }} />
                </View>

                {Platform.OS === 'web' ? (
                  <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 }}>
                    <Text style={{ color: '#FFFFFF', fontWeight: '700', textAlign: 'center' }}>Capture indisponible sur Web.</Text>
                  </View>
                ) : (
                  <>
                    {!cameraPermission?.granted ? (
                      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 18 }}>
                        <Text style={{ color: '#FFFFFF', fontWeight: '700', textAlign: 'center' }}>
                          Autorise la caméra pour prendre des preuves sur site.
                        </Text>
                        <Pressable
                          onPress={() => requestCameraPermission()}
                          style={{ marginTop: 16, height: 48, paddingHorizontal: 16, borderRadius: 16, backgroundColor: '#25D366', alignItems: 'center', justifyContent: 'center' }}
                        >
                          <Text style={{ color: '#0B141A', fontWeight: '900' }}>Autoriser la caméra</Text>
                        </Pressable>
                      </View>
                    ) : (
                      <CameraView
                        ref={cameraRef}
                        style={{ flex: 1, marginTop: 12, borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden' }}
                        facing="back"
                        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                        onBarcodeScanned={
                          cameraMode?.kind === 'qr'
                            ? (e: any) => {
                                if (!e?.data) return;
                                setCameraMode(null);
                                setQr(String(e.data));
                              }
                            : undefined
                        }
                      >
                        {cameraMode?.kind !== 'qr' ? (
                          <View style={{ position: 'absolute', left: 0, right: 0, bottom: 18, alignItems: 'center' }}>
                            <Pressable
                              onPress={() => {
                                if (cameraMode?.kind === 'before' || cameraMode?.kind === 'after') takePhoto(cameraMode.kind);
                              }}
                              style={{
                                height: 64,
                                width: 64,
                                borderRadius: 999,
                                backgroundColor: '#FFFFFF',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                            >
                              <View style={{ height: 54, width: 54, borderRadius: 999, backgroundColor: '#25D366' }} />
                            </Pressable>
                            <Text style={{ marginTop: 10, color: 'rgba(255,255,255,0.85)', fontWeight: '700' }}>
                              Appuyer pour capturer
                            </Text>
                          </View>
                        ) : (
                          <View style={{ position: 'absolute', left: 0, right: 0, bottom: 18, alignItems: 'center' }}>
                            <Text style={{ color: 'rgba(255,255,255,0.9)', fontWeight: '800' }}>Vise le QR du site</Text>
                          </View>
                        )}
                      </CameraView>
                    )}
                  </>
                )}
              </View>
            </View>
          </Modal>

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
