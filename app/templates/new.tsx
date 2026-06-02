import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Modal, Pressable, Text, View } from 'react-native';
import { useColorScheme } from 'nativewind';

import { AppBar } from '../../components/ui/AppBar';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Chip } from '../../components/ui/Chip';
import { Icon } from '../../components/ui/Icon';
import { Screen } from '../../components/ui/Screen';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { FormField, TextField } from '../../components/ui/FormControls';
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
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [items, setItems] = useState<ChecklistItem[]>([
    { id: uuid('it'), label: 'Sol propre', critical: true },
    { id: uuid('it'), label: 'Sanitaires conformes', critical: true },
    { id: uuid('it'), label: 'Déchets évacués', critical: true }
  ]);

  const canSave = useMemo(() => {
    if (name.trim().length < 4) return false;
    if (items.length < 1) return false;
    const normalized = items.map(i => i.label.trim().toLowerCase()).filter(Boolean);
    if (normalized.some(v => v.length < 3)) return false;
    return new Set(normalized).size === normalized.length;
  }, [items, name]);
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
    const exists = items.some(it => it.label.trim().toLowerCase() === label.toLowerCase());
    if (exists) {
      Alert.alert('Doublon', 'Ce critère existe déjà dans la checklist.');
      return;
    }
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

  const activeIndex = activeItemId ? items.findIndex(i => i.id === activeItemId) : -1;
  const activeItem = activeIndex >= 0 ? items[activeIndex] : null;
  const criticalMode = critical ? 'critique' : 'optionnel';
  const [activeLabelDraft, setActiveLabelDraft] = useState('');
  const lastActiveIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!activeItemId) {
      lastActiveIdRef.current = null;
      setActiveLabelDraft('');
      return;
    }
    if (lastActiveIdRef.current === activeItemId) return;
    lastActiveIdRef.current = activeItemId;
    const it = items.find(i => i.id === activeItemId);
    setActiveLabelDraft(it?.label ?? '');
  }, [activeItemId, items]);

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
    <Screen
      footer={
        <View className="gap-3">
          <Button label="Créer le modèle" disabled={!canSave} onPress={save} />
          <Button label="Annuler" variant="secondary" onPress={confirmClose} />
        </View>
      }
    >
      <AppBar title="Nouveau modèle" subtitle="Liste de contrôle" left={{ icon: 'chevron-left', label: 'Retour', onPress: confirmClose }} />

      <Card>
        <FormField label="Nom du modèle" icon="clipboard-list">
          <TextField leftIcon="clipboard-list" accessibilityLabel="Nom du modèle" value={name} onChangeText={setName} autoCapitalize="sentences" />
        </FormField>
      </Card>

      <Card>
        <FormField label="Libellé" icon="pencil" hint="Nom du critère de controle.">
          <TextField
            leftIcon="pencil"
            value={itemLabel}
            onChangeText={setItemLabel}
            onSubmitEditing={addItem}
            returnKeyType="done"
            placeholder="Ex: Vitrerie, Odeur, Consommables"
            autoCapitalize="sentences"
          />
        </FormField>
        <View className="mt-3 flex-row flex-wrap gap-2">
          {['Sol propre', 'Sanitaires conformes', 'Consommables', 'Déchets évacués'].map(p => (
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
        <View className="mt-4">
          <SegmentedControl
            value={criticalMode}
            onChange={v => setCritical(v === 'critique')}
            items={[
              { label: 'Critique', value: 'critique', icon: 'triangle-alert', tone: 'danger' },
              { label: 'Optionnel', value: 'optionnel', icon: 'badge-check', tone: 'neutral' }
            ]}
          />
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
          <Card key={it.id} onPress={() => setActiveItemId(it.id)}>
            <View className="flex-row items-center justify-between">
              <View className="flex-1 min-w-0 pr-4">
                <Text numberOfLines={1} className="text-[14px] font-semibold text-slate-900 dark:text-white">
                  {it.label}
                </Text>
                <View className="mt-2 flex-row items-center gap-2">
                  <Chip label={it.critical ? 'Critique' : 'Optionnel'} tone={it.critical ? 'danger' : 'neutral'} />
                  <Text className="text-[12px] text-slate-500 dark:text-slate-300">#{idx + 1}</Text>
                </View>
              </View>
              <Icon name="chevron-right" size={18} color={isDark ? '#FFFFFF' : '#0F172A'} />
            </View>
          </Card>
        ))}
      </View>

      <Modal visible={Boolean(activeItem)} transparent animationType="fade" onRequestClose={() => setActiveItemId(null)}>
        <Pressable onPress={() => setActiveItemId(null)} style={{ flex: 1, backgroundColor: isDark ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' }}>
          <Pressable
            onPress={() => {}}
            style={{
              backgroundColor: isDark ? '#0B141A' : '#FFFFFF',
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              borderTopWidth: 1,
              borderTopColor: isDark ? '#1F2C34' : '#E5E7EB',
              paddingHorizontal: 16,
              paddingTop: 14,
              paddingBottom: 18
            }}
          >
            <View className="flex-row items-start justify-between">
              <View className="flex-1 min-w-0 pr-4">
                <Text numberOfLines={2} className="text-[16px] font-extrabold text-slate-900 dark:text-white">
                  {activeItem?.label ?? 'Critère'}
                </Text>
                <Text className="mt-1 text-[12px] text-slate-500 dark:text-slate-300">
                  Position {activeIndex >= 0 ? activeIndex + 1 : '—'} • {activeItem?.critical ? 'Critique' : 'Optionnel'}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Fermer"
                onPress={() => setActiveItemId(null)}
                className="h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800"
              >
                <Icon name="x" size={18} color={isDark ? '#FFFFFF' : '#0F172A'} />
              </Pressable>
            </View>

            <View className="mt-5 gap-3">
              <Card>
                <FormField label="Libellé" icon="pencil" hint="Nom court, visible sur mobile.">
                  <TextField
                    leftIcon="pencil"
                    value={activeLabelDraft}
                    onChangeText={t => {
                      setActiveLabelDraft(t);
                      if (!activeItem) return;
                      const next = t.trimStart().slice(0, 80);
                      setItems(prev => prev.map(x => (x.id === activeItem.id ? { ...x, label: next } : x)));
                    }}
                    autoCapitalize="sentences"
                  />
                </FormField>
              </Card>
              <View className="flex-row gap-3">
                <Button
                  label="Monter"
                  variant="secondary"
                  disabled={activeIndex <= 0}
                  onPress={() => {
                    if (!activeItem) return;
                    moveItem(activeItem.id, -1);
                  }}
                  className="flex-1 h-11 rounded-2xl"
                />
                <Button
                  label="Descendre"
                  variant="secondary"
                  disabled={activeIndex < 0 || activeIndex >= items.length - 1}
                  onPress={() => {
                    if (!activeItem) return;
                    moveItem(activeItem.id, 1);
                  }}
                  className="flex-1 h-11 rounded-2xl"
                />
              </View>
              <Button
                label={activeItem?.critical ? 'Passer en optionnel' : 'Marquer critique'}
                variant="secondary"
                onPress={() => {
                  if (!activeItem) return;
                  toggleCritical(activeItem.id);
                }}
                className="h-11 rounded-2xl"
              />
              <Button
                label="Supprimer"
                variant="danger"
                onPress={() => {
                  if (!activeItem) return;
                  const id = activeItem.id;
                  Alert.alert('Supprimer', `Supprimer “${activeItem.label}” ?`, [
                    { text: 'Annuler', style: 'cancel' },
                    {
                      text: 'Supprimer',
                      style: 'destructive',
                      onPress: () => {
                        removeItem(id);
                        setActiveItemId(null);
                      }
                    }
                  ]);
                }}
                className="h-11 rounded-2xl"
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}
