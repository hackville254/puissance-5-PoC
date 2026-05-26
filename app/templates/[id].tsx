import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Pressable, Text, TextInput, View } from 'react-native';

import { AppBar } from '../../components/ui/AppBar';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Chip } from '../../components/ui/Chip';
import { Screen } from '../../components/ui/Screen';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { canPerform } from '../../lib/models';
import type { ChecklistItem, ChecklistTemplate } from '../../lib/models';
import { useAppStore } from '../../lib/store';

function uuid(prefix: string) {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

export default function TemplateDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { state, dispatch } = useAppStore();

  const template = state.templates.find(t => t.id === id);

  const [name, setName] = useState(template?.name ?? '');
  const [itemLabel, setItemLabel] = useState('');
  const [critical, setCritical] = useState(false);
  const [items, setItems] = useState<ChecklistItem[]>(template?.items ?? []);

  const canSave = useMemo(() => Boolean(template && name.trim().length >= 4 && items.length >= 1), [template, name, items.length]);
  const canManage = canPerform(state.role, 'manage_templates');
  const hasDraftChanges = useMemo(
    () =>
      Boolean(
        template &&
          (name !== template.name ||
            JSON.stringify(items) !== JSON.stringify(template.items) ||
            itemLabel.trim().length > 0 ||
            critical)
      ),
    [critical, itemLabel, items, name, template]
  );

  if (!template) {
    return (
      <Screen>
        <AppBar title="Modèle" subtitle="Introuvable" left={{ icon: 'chevron-left', label: 'Retour', onPress: () => router.back() }} />
        <Card className="mt-6">
          <Text className="text-[14px] font-semibold text-slate-900 dark:text-white">Introuvable</Text>
          <Text className="mt-1 text-[13px] text-slate-500 dark:text-slate-300">Ce modèle est introuvable.</Text>
        </Card>
      </Screen>
    );
  }

  const addItem = () => {
    const label = itemLabel.trim();
    if (label.length < 3) return;
    setItems(prev => [{ id: uuid('it'), label: label.slice(0, 80), critical }, ...prev]);
    setItemLabel('');
    setCritical(false);
  };

  const save = () => {
    const next: ChecklistTemplate = {
      ...template,
      name: name.trim().slice(0, 64),
      items
    };
    dispatch({ type: 'upsertTemplate', template: next });
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
        title="Modèle"
        subtitle={template.name}
        left={{ icon: 'chevron-left', label: 'Retour', onPress: confirmClose }}
        right={
          canManage
            ? [
                {
                  icon: 'trash',
                  label: 'Supprimer',
                  onPress: () =>
                    Alert.alert('Supprimer', `Supprimer “${template.name}” ?`, [
                      { text: 'Annuler', style: 'cancel' },
                      { text: 'Supprimer', style: 'destructive', onPress: () => dispatch({ type: 'deleteTemplate', templateId: template.id }) }
                    ])
                }
              ]
            : undefined
        }
      />

      <SectionHeader title="Nom" />
      <Card>
        <TextInput value={name} onChangeText={setName} className="text-[15px] text-slate-900 dark:text-white" />
      </Card>

      <SectionHeader title="Ajouter un critère" />
      <Card>
        <Text className="text-[12px] font-semibold text-slate-600 dark:text-slate-300">Libellé</Text>
        <TextInput value={itemLabel} onChangeText={setItemLabel} className="mt-2 text-[15px] text-slate-900 dark:text-white" />
        <View className="mt-4 flex-row items-center justify-between">
          <Pressable onPress={() => setCritical(v => !v)} className="flex-row items-center">
            <Chip label={critical ? 'Critique' : 'Optionnel'} tone={critical ? 'danger' : 'neutral'} />
            <Text className="ml-3 text-[13px] text-slate-600 dark:text-slate-300">Appuyer pour basculer</Text>
          </Pressable>
          <Button label="Ajouter" disabled={!canManage} onPress={addItem} variant="secondary" className="h-10 px-3 rounded-xl" />
        </View>
      </Card>

      <SectionHeader title="Critères" right={<Chip label={`${items.length}`} tone="neutral" />} />
      <View className="gap-3">
        {items.map(it => (
          <Card key={it.id} onPress={canManage ? () => setItems(prev => prev.map(x => (x.id === it.id ? { ...x, critical: !x.critical } : x))) : undefined}>
            <View className="flex-row items-center justify-between">
              <View className="flex-1 pr-4">
                <Text className="text-[14px] font-semibold text-slate-900 dark:text-white">{it.label}</Text>
                <Text className="mt-1 text-[12px] text-slate-500 dark:text-slate-300">
                  Appuyer pour basculer • {it.critical ? 'Critique' : 'Optionnel'}
                </Text>
              </View>
              <Pressable disabled={!canManage} onPress={() => setItems(prev => prev.filter(x => x.id !== it.id))} className="h-11 w-11 items-center justify-center rounded-2xl bg-rose-50 dark:bg-rose-950">
                <Text className="text-[16px] font-bold text-rose-600 dark:text-rose-200">×</Text>
              </Pressable>
            </View>
          </Card>
        ))}
      </View>

      <View className="mt-6 gap-3">
        <Button label="Enregistrer" disabled={!canManage || !canSave} onPress={save} />
        <Button label="Annuler" variant="secondary" onPress={confirmClose} />
      </View>
    </Screen>
  );
}
