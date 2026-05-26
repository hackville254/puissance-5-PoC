import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { useColorScheme } from 'nativewind';

import { AppBar } from '../../components/ui/AppBar';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Chip } from '../../components/ui/Chip';
import { ChoiceCard, FormField, TextField } from '../../components/ui/FormControls';
import { Icon } from '../../components/ui/Icon';
import { Screen } from '../../components/ui/Screen';
import { SectionHeader } from '../../components/ui/SectionHeader';
import type { ChecklistItem, ChecklistTemplate } from '../../lib/models';
import { useAppStore } from '../../lib/store';

function uuid(prefix: string) {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

export default function NewTemplateScreen() {
  const router = useRouter();
  const { dispatch } = useAppStore();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [name, setName] = useState('Checklist — Nouveau');
  const [itemLabel, setItemLabel] = useState('Sol propre');
  const [critical, setCritical] = useState(true);
  const [items, setItems] = useState<ChecklistItem[]>([
    { id: uuid('it'), label: 'Sol propre', critical: true },
    { id: uuid('it'), label: 'Sanitaires conformes', critical: true },
    { id: uuid('it'), label: 'Déchets évacués', critical: true }
  ]);

  const canSave = useMemo(() => name.trim().length >= 4 && items.length >= 1, [name, items.length]);
  const hasDraftChanges = useMemo(
    () =>
      name !== 'Checklist — Nouveau' ||
      itemLabel !== 'Sol propre' ||
      critical !== true ||
      items.length !== 3 ||
      items.some((item, index) => item.label !== ['Sol propre', 'Sanitaires conformes', 'Déchets évacués'][index]),
    [critical, itemLabel, items, name]
  );
  const confirmClose = () => {
    if (!hasDraftChanges) return router.back();
    Alert.alert('Quitter', 'Des modifications non enregistrées seront perdues.', [
      { text: 'Continuer la saisie', style: 'cancel' },
      { text: 'Quitter', style: 'destructive', onPress: () => router.back() }
    ]);
  };

  const addItem = () => {
    const label = itemLabel.trim();
    if (label.length < 3) return;
    if (items.length >= 24) return;
    setItems(prev => [{ id: uuid('it'), label: label.slice(0, 80), critical }, ...prev]);
    setItemLabel('');
    setCritical(false);
  };

  const moveItem = (id: string, dir: -1 | 1) => {
    setItems(prev => {
      const index = prev.findIndex(x => x.id === id);
      const nextIndex = index + dir;
      if (index < 0 || nextIndex < 0 || nextIndex >= prev.length) return prev;
      const next = prev.slice();
      const tmp = next[index];
      next[index] = next[nextIndex];
      next[nextIndex] = tmp;
      return next;
    });
  };

  const toggleCritical = (id: string) => setItems(prev => prev.map(x => (x.id === id ? { ...x, critical: !x.critical } : x)));

  const removeItem = (id: string) => setItems(prev => prev.filter(x => x.id !== id));

  const save = () => {
    const tpl: ChecklistTemplate = {
      id: uuid('tpl'),
      name: name.trim().slice(0, 64),
      items
    };
    dispatch({ type: 'upsertTemplate', template: tpl });
    router.back();
  };

  return (
    <Screen>
      <AppBar title="Nouveau modèle" subtitle="Liste de contrôle" left={{ icon: 'chevron-left', label: 'Retour', onPress: confirmClose }} />

      <SectionHeader title="Nom" />
      <Card>
        <FormField label="Nom du modèle">
          <TextField accessibilityLabel="Nom du modèle" value={name} onChangeText={setName} autoCapitalize="sentences" />
        </FormField>
      </Card>

      <SectionHeader title="Ajouter un critère" />
      <Card>
        <FormField label="Libellé" hint="Nom du critère de controle.">
          <TextField
            value={itemLabel}
            onChangeText={setItemLabel}
            onSubmitEditing={addItem}
            returnKeyType="done"
            placeholder="Ex: Vitrerie, Odeur, Consommables"
            autoCapitalize="sentences"
          />
        </FormField>
        <View className="mt-3 flex-row flex-wrap gap-2">
          {['Sol propre', 'Sanitaires conformes', 'Vitrerie', 'Consommables', 'Déchets évacués', 'Désinfection effectuée'].map(p => (
            <Pressable
              key={p}
              onPress={() => {
                setItemLabel(p);
                setCritical(p !== 'Vitrerie');
              }}
              className="rounded-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2 active:opacity-90"
            >
              <Text className="text-[12px] font-semibold text-slate-700 dark:text-slate-200">{p}</Text>
            </Pressable>
          ))}
        </View>
        <View className="mt-4 flex-row gap-2">
          <ChoiceCard title="Critique" description="Bloquant pour la conformite" selected={critical} onPress={() => setCritical(true)} className="flex-1" />
          <ChoiceCard title="Optionnel" description="Point de controle secondaire" selected={!critical} onPress={() => setCritical(false)} className="flex-1" />
        </View>
        <View className="mt-4 flex-row items-center justify-between">
          <Button
            label="Ajouter"
            onPress={addItem}
            variant="secondary"
            className="h-10 px-3 rounded-xl"
            left={<Icon name="plus" size={16} color={isDark ? '#FFFFFF' : '#0F172A'} />}
          />
        </View>
        <Text className="mt-3 text-[12px] text-slate-500 dark:text-slate-300">{items.length}/24 critères</Text>
      </Card>

      <SectionHeader title="Critères" right={<Chip label={`${items.length}`} tone="neutral" />} />
      <View className="gap-3">
        {items.map((it, idx) => (
          <Card key={it.id}>
            <View className="flex-row items-center justify-between">
              <View className="flex-1 pr-4">
                <Text className="text-[14px] font-semibold text-slate-900 dark:text-white">{it.label}</Text>
                <View className="mt-2 flex-row items-center gap-2">
                  <Chip label={it.critical ? 'Critique' : 'Optionnel'} tone={it.critical ? 'danger' : 'neutral'} />
                  <Text className="text-[12px] text-slate-500 dark:text-slate-300">Position {idx + 1}</Text>
                </View>
              </View>
              <View className="flex-row items-center gap-2">
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Monter"
                  onPress={() => moveItem(it.id, -1)}
                  disabled={idx === 0}
                  className={idx === 0 ? 'h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800 opacity-40' : 'h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800 active:opacity-80'}
                >
                  <Icon
                    name="chevron-up"
                    size={18}
                    color={idx === 0 ? (isDark ? 'rgba(255,255,255,0.35)' : '#94A3B8') : isDark ? '#FFFFFF' : '#0F172A'}
                  />
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Descendre"
                  onPress={() => moveItem(it.id, 1)}
                  disabled={idx === items.length - 1}
                  className={idx === items.length - 1 ? 'h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800 opacity-40' : 'h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800 active:opacity-80'}
                >
                  <Icon
                    name="chevron-down"
                    size={18}
                    color={
                      idx === items.length - 1 ? (isDark ? 'rgba(255,255,255,0.35)' : '#94A3B8') : isDark ? '#FFFFFF' : '#0F172A'
                    }
                  />
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Basculer critique"
                  onPress={() => toggleCritical(it.id)}
                  className="h-11 w-11 items-center justify-center rounded-2xl bg-brand-50 dark:bg-brand-900 active:opacity-80"
                >
                  <Icon name={it.critical ? 'triangle-alert' : 'badge-check'} size={18} color={isDark ? '#93C5FD' : '#2c5df5'} />
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Supprimer"
                  onPress={() => removeItem(it.id)}
                  className="h-11 w-11 items-center justify-center rounded-2xl bg-rose-50 dark:bg-rose-950 active:opacity-80"
                >
                  <Icon name="x" size={18} color={isDark ? '#FB7185' : '#E11D48'} />
                </Pressable>
              </View>
            </View>
          </Card>
        ))}
      </View>

      <View className="mt-6 gap-3">
        <Button label="Créer le modèle" disabled={!canSave} onPress={save} />
        <Button label="Annuler" variant="secondary" onPress={confirmClose} />
      </View>
    </Screen>
  );
}
