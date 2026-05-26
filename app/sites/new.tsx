import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { useColorScheme } from 'nativewind';

import { AppBar } from '../../components/ui/AppBar';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { FormField, TextField } from '../../components/ui/FormControls';
import { Icon } from '../../components/ui/Icon';
import { Screen } from '../../components/ui/Screen';
import { SectionHeader } from '../../components/ui/SectionHeader';
import type { Site } from '../../lib/models';
import { useAppStore } from '../../lib/store';

function toNumber(value: string, fallback: number) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function uuid() {
  return `site_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

export default function NewSiteScreen() {
  const router = useRouter();
  const { dispatch } = useAppStore();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [name, setName] = useState('Nouveau site');
  const [address, setAddress] = useState('1 Rue Exemple');
  const [city, setCity] = useState('Paris');
  const [tags, setTags] = useState<string[]>(['Bureaux']);
  const [tagInput, setTagInput] = useState('');
  const [lat, setLat] = useState('48.8566');
  const [lng, setLng] = useState('2.3522');
  const [radius, setRadius] = useState('120');

  const canSave = useMemo(() => name.trim().length >= 2 && address.trim().length >= 4, [name, address]);
  const hasDraftChanges = useMemo(
    () =>
      name !== 'Nouveau site' ||
      address !== '1 Rue Exemple' ||
      city !== 'Paris' ||
      tagInput.trim().length > 0 ||
      tags.join('|') !== ['Bureaux'].join('|') ||
      lat !== '48.8566' ||
      lng !== '2.3522' ||
      radius !== '120',
    [address, city, lat, lng, name, radius, tagInput, tags]
  );
  const confirmClose = () => {
    if (!hasDraftChanges) return router.back();
    Alert.alert('Quitter', 'Des modifications non enregistrées seront perdues.', [
      { text: 'Continuer la saisie', style: 'cancel' },
      { text: 'Quitter', style: 'destructive', onPress: () => router.back() }
    ]);
  };

  const save = () => {
    const site: Site = {
      id: uuid(),
      name: name.trim().slice(0, 64),
      address: address.trim().slice(0, 128),
      city: city.trim().slice(0, 64),
      tags: tags.slice(0, 8),
      lat: toNumber(lat, 0),
      lng: toNumber(lng, 0),
      geofenceRadiusM: Math.max(10, Math.min(2000, Math.round(toNumber(radius, 120))))
    };
    dispatch({ type: 'upsertSite', site });
    router.back();
  };

  const addTag = (raw: string) => {
    const next = raw.trim().slice(0, 18);
    if (!next) return;
    setTags(prev => (prev.some(t => t.toLowerCase() === next.toLowerCase()) ? prev : [...prev, next].slice(0, 8)));
    setTagInput('');
  };

  const removeTag = (tag: string) => setTags(prev => prev.filter(t => t !== tag));

  const bumpRadius = (delta: number) => {
    const n = Math.round(toNumber(radius, 120));
    const next = Math.max(10, Math.min(2000, n + delta));
    setRadius(String(next));
  };

  return (
    <Screen>
      <AppBar title="Nouveau site" subtitle="Créer un site" left={{ icon: 'chevron-left', label: 'Retour', onPress: confirmClose }} />

      <SectionHeader title="Informations" />
      <Card>
        <FormField label="Nom">
          <TextField accessibilityLabel="Nom du site" value={name} onChangeText={setName} autoCapitalize="words" />
        </FormField>

        <FormField label="Adresse" className="mt-4">
          <TextField accessibilityLabel="Adresse du site" value={address} onChangeText={setAddress} autoCapitalize="words" />
        </FormField>

        <FormField label="Ville" className="mt-4">
          <TextField accessibilityLabel="Ville du site" value={city} onChangeText={setCity} autoCapitalize="words" />
        </FormField>

        <FormField label="Tags" hint="Utilise des tags pour typer le site ou ses zones." className="mt-4">
        <View className="mt-2 flex-row flex-wrap gap-2">
          {tags.length === 0 ? (
            <Text className="text-[13px] text-slate-500 dark:text-slate-300">Ajoute des tags (type de site, zone, etc.).</Text>
          ) : (
            tags.map(t => (
              <Pressable
                key={t}
                accessibilityRole="button"
                accessibilityLabel={`Retirer le tag ${t}`}
                onPress={() => removeTag(t)}
                className="flex-row items-center rounded-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2 active:opacity-90"
              >
                <Text className="text-[12px] font-semibold text-slate-700 dark:text-slate-200">{t}</Text>
                <View className="w-1.5" />
                <Icon name="x" size={14} color={isDark ? 'rgba(255,255,255,0.75)' : '#64748B'} />
              </Pressable>
            ))
          )}
        </View>
        <View className="mt-3 flex-row items-center gap-2">
          <View className="flex-1">
            <TextField
              value={tagInput}
              onChangeText={setTagInput}
              onSubmitEditing={() => addTag(tagInput)}
              returnKeyType="done"
              placeholder="Ex: Sanitaires, Hall, Open space"
              autoCapitalize="words"
              autoCorrect={false}
              inputClassName="text-[14px]"
            />
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Ajouter un tag"
            onPress={() => addTag(tagInput)}
            className="h-12 w-12 items-center justify-center rounded-2xl bg-brand-600 active:opacity-90"
          >
            <Icon name="plus" size={18} color="#FFFFFF" />
          </Pressable>
        </View>
        <View className="mt-3 flex-row flex-wrap gap-2">
          {['Bureaux', 'Immeuble', 'École', 'Sanitaires', 'Open space', 'Halls'].map(s => (
            <Pressable
              key={s}
              onPress={() => addTag(s)}
              className="rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3 py-2 active:opacity-90"
            >
              <Text className="text-[12px] font-semibold text-slate-700 dark:text-slate-200">{s}</Text>
            </Pressable>
          ))}
        </View>
        </FormField>
      </Card>

      <SectionHeader title="Géofence" />
      <Card>
        <View className="flex-row gap-3">
          <View className="flex-1">
            <FormField label="Latitude">
              <TextField value={lat} onChangeText={setLat} keyboardType="numbers-and-punctuation" autoCapitalize="none" autoCorrect={false} />
            </FormField>
          </View>
          <View className="flex-1">
            <FormField label="Longitude">
              <TextField value={lng} onChangeText={setLng} keyboardType="numbers-and-punctuation" autoCapitalize="none" autoCorrect={false} />
            </FormField>
          </View>
        </View>
        <FormField label="Rayon" hint="Distance en metres autour du site." className="mt-4">
        <View className="mt-2 flex-row items-center gap-2">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Diminuer le rayon"
            onPress={() => bumpRadius(-10)}
            className="h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800 active:opacity-80"
          >
            <Icon name="minus" size={18} color={isDark ? '#FFFFFF' : '#0F172A'} />
          </Pressable>
          <View className="flex-1">
            <TextField value={radius} onChangeText={setRadius} keyboardType="number-pad" autoCapitalize="none" autoCorrect={false} />
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Augmenter le rayon"
            onPress={() => bumpRadius(10)}
            className="h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800 active:opacity-80"
          >
            <Icon name="plus" size={18} color={isDark ? '#FFFFFF' : '#0F172A'} />
          </Pressable>
        </View>
        <View className="mt-3 flex-row gap-2">
          {[50, 120, 250].map(v => (
            <Pressable
              key={v}
              onPress={() => setRadius(String(v))}
              className="flex-1 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3 py-3 active:opacity-90"
            >
              <Text className="text-center text-[12px] font-semibold text-slate-700 dark:text-slate-200">{v} m</Text>
            </Pressable>
          ))}
        </View>
        </FormField>
      </Card>

      <SectionHeader title="Aperçu" />
      <Card>
        <Text className="text-[15px] font-semibold text-slate-900 dark:text-white">{name.trim() || 'Site'}</Text>
        <Text className="mt-1 text-[13px] text-slate-500 dark:text-slate-300">{`${address.trim() || 'Adresse'} • ${city.trim() || 'Ville'}`}</Text>
        <View className="mt-3 flex-row flex-wrap gap-2">
          {tags.slice(0, 5).map(t => (
            <View key={t} className="rounded-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2">
              <Text className="text-[12px] font-semibold text-slate-700 dark:text-slate-200">{t}</Text>
            </View>
          ))}
          <View className="rounded-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2">
            <Text className="text-[12px] font-semibold text-slate-700 dark:text-slate-200">{`Géofence: ${radius} m`}</Text>
          </View>
        </View>
      </Card>

      <View className="mt-6 gap-3">
        <Button label="Créer" disabled={!canSave} onPress={save} />
        <Button label="Annuler" variant="secondary" onPress={confirmClose} />
      </View>
    </Screen>
  );
}
