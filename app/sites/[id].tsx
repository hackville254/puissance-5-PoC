import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Text, TextInput, View } from 'react-native';

import { AppBar } from '../../components/ui/AppBar';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Screen } from '../../components/ui/Screen';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { canPerform } from '../../lib/models';
import type { Site } from '../../lib/models';
import { useAppStore } from '../../lib/store';

function toNumber(value: string, fallback: number) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export default function SiteDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { state, dispatch } = useAppStore();

  const site = state.sites.find(s => s.id === id);

  const [name, setName] = useState(site?.name ?? '');
  const [address, setAddress] = useState(site?.address ?? '');
  const [city, setCity] = useState(site?.city ?? '');
  const [tags, setTags] = useState((site?.tags ?? []).join(', '));
  const [lat, setLat] = useState(site ? String(site.lat) : '0');
  const [lng, setLng] = useState(site ? String(site.lng) : '0');
  const [radius, setRadius] = useState(site ? String(site.geofenceRadiusM) : '120');

  const canSave = useMemo(() => name.trim().length >= 2 && address.trim().length >= 4, [name, address]);
  const canManage = canPerform(state.role, 'manage_sites');
  const hasDraftChanges = useMemo(
    () =>
      Boolean(
        site &&
          (name !== site.name ||
            address !== site.address ||
            city !== site.city ||
            tags !== (site.tags ?? []).join(', ') ||
            lat !== String(site.lat) ||
            lng !== String(site.lng) ||
            radius !== String(site.geofenceRadiusM))
      ),
    [address, city, lat, lng, name, radius, site, tags]
  );

  if (!site) {
    return (
      <Screen>
        <AppBar title="Site" subtitle="Introuvable" left={{ icon: 'chevron-left', label: 'Retour', onPress: () => router.back() }} />
        <Card className="mt-6">
          <Text className="text-[14px] font-semibold text-slate-900 dark:text-white">Introuvable</Text>
          <Text className="mt-1 text-[13px] text-slate-500 dark:text-slate-300">Ce site n’existe pas dans le cache.</Text>
        </Card>
      </Screen>
    );
  }

  const save = () => {
    const next: Site = {
      ...site,
      name: name.trim().slice(0, 64),
      address: address.trim().slice(0, 128),
      city: city.trim().slice(0, 64),
      tags: tags
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)
        .slice(0, 8),
      lat: toNumber(lat, site.lat),
      lng: toNumber(lng, site.lng),
      geofenceRadiusM: Math.max(10, Math.min(2000, Math.round(toNumber(radius, site.geofenceRadiusM))))
    };
    dispatch({ type: 'upsertSite', site: next });
    router.back();
  };
  const confirmClose = () => {
    if (!hasDraftChanges) return router.back();
    Alert.alert('Quitter', 'Des modifications non enregistrées seront perdues.', [
      { text: 'Continuer la saisie', style: 'cancel' },
      { text: 'Quitter', style: 'destructive', onPress: () => router.back() }
    ]);
  };

  return (
    <Screen>
      <AppBar
        title="Site"
        subtitle={site.name}
        left={{ icon: 'chevron-left', label: 'Retour', onPress: confirmClose }}
        right={
          canManage
            ? [
                {
                  icon: 'trash',
                  label: 'Supprimer',
                  onPress: () =>
                    Alert.alert('Supprimer', `Supprimer “${site.name}” ? (supprime aussi contrôles/incidents liés)`, [
                      { text: 'Annuler', style: 'cancel' },
                      { text: 'Supprimer', style: 'destructive', onPress: () => dispatch({ type: 'deleteSite', siteId: site.id }) }
                    ])
                }
              ]
            : undefined
        }
      />

      <SectionHeader title="Informations" />
      <Card>
        <Text className="text-[12px] font-semibold text-slate-600 dark:text-slate-300">Nom</Text>
        <TextInput value={name} onChangeText={setName} className="mt-2 text-[15px] text-slate-900 dark:text-white" />

        <Text className="mt-4 text-[12px] font-semibold text-slate-600 dark:text-slate-300">Adresse</Text>
        <TextInput value={address} onChangeText={setAddress} className="mt-2 text-[15px] text-slate-900 dark:text-white" />

        <Text className="mt-4 text-[12px] font-semibold text-slate-600 dark:text-slate-300">Ville</Text>
        <TextInput value={city} onChangeText={setCity} className="mt-2 text-[15px] text-slate-900 dark:text-white" />

        <Text className="mt-4 text-[12px] font-semibold text-slate-600 dark:text-slate-300">Tags</Text>
        <TextInput value={tags} onChangeText={setTags} className="mt-2 text-[15px] text-slate-900 dark:text-white" />
      </Card>

      <SectionHeader title="Géofence" />
      <Card>
        <View className="flex-row gap-3">
          <View className="flex-1">
            <Text className="text-[12px] font-semibold text-slate-600 dark:text-slate-300">Lat</Text>
            <TextInput value={lat} onChangeText={setLat} keyboardType="numbers-and-punctuation" className="mt-2 text-[15px] text-slate-900 dark:text-white" />
          </View>
          <View className="flex-1">
            <Text className="text-[12px] font-semibold text-slate-600 dark:text-slate-300">Lng</Text>
            <TextInput value={lng} onChangeText={setLng} keyboardType="numbers-and-punctuation" className="mt-2 text-[15px] text-slate-900 dark:text-white" />
          </View>
        </View>
        <Text className="mt-4 text-[12px] font-semibold text-slate-600 dark:text-slate-300">Rayon (m)</Text>
        <TextInput value={radius} onChangeText={setRadius} keyboardType="number-pad" className="mt-2 text-[15px] text-slate-900 dark:text-white" />
      </Card>

      <View className="mt-6 gap-3">
        <Button label="Enregistrer" disabled={!canManage || !canSave} onPress={save} />
        <Button label="Annuler" variant="secondary" onPress={confirmClose} />
      </View>
    </Screen>
  );
}
