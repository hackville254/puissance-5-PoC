import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Modal, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { useColorScheme } from 'nativewind';

import { AppBar } from '../../../components/ui/AppBar';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { Chip } from '../../../components/ui/Chip';
import { Icon } from '../../../components/ui/Icon';
import { Screen } from '../../../components/ui/Screen';
import { SectionHeader } from '../../../components/ui/SectionHeader';
import type { Severity } from '../../../lib/models';
import { addDaysISODate, pad2, shortDateLabel, todayISODate } from '../../../lib/format';
import { ensureNotificationPermission } from '../../../lib/notifications';
import { useAppStore } from '../../../lib/store';

function isoToDate(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

function timeToMinutes(time: string) {
  const [h, m] = time.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

function minutesToTime(totalMinutes: number) {
  const clamped = ((totalMinutes % (24 * 60)) + 24 * 60) % (24 * 60);
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${pad2(h)}:${pad2(m)}`;
}

function timeToDate(isoDate: string, time: string) {
  const base = isoToDate(isoDate);
  const [h, m] = time.split(':').map(Number);
  base.setHours(h ?? 0, m ?? 0, 0, 0);
  return base;
}

function dateToTime(dt: Date) {
  return `${pad2(dt.getHours())}:${pad2(dt.getMinutes())}`;
}

function toISODateTime(isoDate: string, time: string) {
  return timeToDate(isoDate, time).toISOString();
}

const severities: Array<{ label: string; value: Severity; tone: 'danger' | 'warning' | 'neutral' }> = [
  { label: 'Critique', value: 'critique', tone: 'danger' },
  { label: 'Majeure', value: 'majeure', tone: 'warning' },
  { label: 'Mineure', value: 'mineure', tone: 'neutral' }
];

export default function NewIncidentScreen() {
  const router = useRouter();
  const { state, dispatch } = useAppStore();
  const { colorScheme } = useColorScheme();

  const [siteId, setSiteId] = useState(state.sites[0]?.id ?? '');
  const [severity, setSeverity] = useState<Severity>('majeure');
  const [siteQuery, setSiteQuery] = useState('');
  const [occurredDate, setOccurredDate] = useState(state.selectedDate || todayISODate());
  const [occurredTime, setOccurredTime] = useState(minutesToTime(timeToMinutes(new Date().toTimeString().slice(0, 5))));
  const [dueDate, setDueDate] = useState<string | null>(null);
  const [title, setTitle] = useState('Zone non nettoyée');
  const [description, setDescription] = useState('Décris le problème, la zone concernée, et l’action attendue.');
  const [assignedTo, setAssignedTo] = useState('Chef d’équipe');
  const [picker, setPicker] = useState<null | { kind: 'occurredDate' | 'occurredTime' | 'dueDate' }>(null);

  const DateTimePicker: any = Platform.OS === 'web' ? null : require('@react-native-community/datetimepicker').default;
  const Notifications: any = Platform.OS === 'web' ? null : require('expo-notifications');
  const isDark = colorScheme === 'dark';
  const overlay = isDark ? 'rgba(0,0,0,0.55)' : 'rgba(0,0,0,0.35)';
  const sheetBg = isDark ? '#0B141A' : '#FFFFFF';
  const sheetBorder = isDark ? '#1F2C34' : '#E5E7EB';
  const sheetText = isDark ? '#FFFFFF' : '#111827';
  const sheetTextMuted = isDark ? 'rgba(255,255,255,0.7)' : '#6B7280';

  const selectedSite = state.sites.find(s => s.id === siteId);

  const filteredSites = useMemo(() => {
    const q = siteQuery.trim().toLowerCase();
    if (!q) return state.sites;
    return state.sites.filter(s => `${s.name} ${s.city} ${s.address}`.toLowerCase().includes(q));
  }, [siteQuery, state.sites]);

  const canCreate = useMemo(() => {
    const baseOk = siteId && title.trim().length >= 4 && description.trim().length >= 8;
    const occurredOk = occurredDate.trim().length === 10 && occurredTime.trim().length >= 4;
    return Boolean(baseOk && occurredOk);
  }, [siteId, title, description, occurredDate, occurredTime]);
  const hasDraftChanges = useMemo(
    () =>
      siteId !== (state.sites[0]?.id ?? '') ||
      severity !== 'majeure' ||
      siteQuery.trim().length > 0 ||
      occurredDate !== (state.selectedDate || todayISODate()) ||
      dueDate !== null ||
      title !== 'Zone non nettoyée' ||
      description !== 'Décris le problème, la zone concernée, et l’action attendue.' ||
      assignedTo !== 'Chef d’équipe',
    [assignedTo, description, dueDate, occurredDate, severity, siteId, siteQuery, state.selectedDate, state.sites, title]
  );

  const openPicker = (kind: 'occurredDate' | 'occurredTime' | 'dueDate') => setPicker({ kind });
  const closePicker = () => setPicker(null);
  const confirmClose = () => {
    if (!hasDraftChanges) return router.back();
    Alert.alert('Quitter', 'Des modifications non enregistrées seront perdues.', [
      { text: 'Continuer la saisie', style: 'cancel' },
      { text: 'Quitter', style: 'destructive', onPress: () => router.back() }
    ]);
  };

  const applyPicked = (dt: Date) => {
    if (!picker) return;
    if (picker.kind === 'occurredDate') {
      const next = todayISODate(dt);
      setOccurredDate(next);
      dispatch({ type: 'setSelectedDate', date: next });
    }
    if (picker.kind === 'occurredTime') setOccurredTime(dateToTime(dt));
    if (picker.kind === 'dueDate') setDueDate(todayISODate(dt));
  };

  const create = async () => {
    const due = dueDate || undefined;
    dispatch({
      type: 'createIncident',
      siteId,
      severity,
      occurredAt: toISODateTime(occurredDate, occurredTime),
      dueDate: due,
      title: title.trim().slice(0, 80),
      description: description.trim().slice(0, 600),
      assignedTo: assignedTo.trim().slice(0, 64)
    });
    if (due && Platform.OS !== 'web' && Notifications) {
      try {
        const granted = await ensureNotificationPermission();
        if (granted) {
          const triggerAt = timeToDate(due, '09:00');
          if (triggerAt.getTime() > Date.now() + 10_000) {
            await Notifications.scheduleNotificationAsync({
              content: {
                title: 'Échéance incident',
                body: 'Une non-conformité arrive à échéance aujourd’hui.',
                sound: true
              },
              trigger: triggerAt
            });
          }
        } else {
          Alert.alert('Notifications désactivées', 'Le rappel local n’a pas pu être activé sans permission.');
        }
      } catch {}
    }
    router.back();
  };

  return (
    <Screen>
      <AppBar title="Nouvel incident" subtitle="Créer une non-conformité" left={{ icon: 'chevron-left', label: 'Retour', onPress: confirmClose }} />

      <SectionHeader title="Site" />
      <Card>
        <View className="flex-row items-center rounded-2xl bg-slate-50 dark:bg-slate-800 px-4 py-3">
          <Icon name="building" size={18} color={isDark ? 'rgba(255,255,255,0.8)' : '#64748B'} />
          <TextInput
            value={siteQuery}
            onChangeText={setSiteQuery}
            accessibilityLabel="Recherche de site"
            placeholder="Rechercher un site…"
            placeholderTextColor={isDark ? 'rgba(255,255,255,0.45)' : '#94A3B8'}
            className="ml-3 flex-1 text-[14px] text-slate-900 dark:text-white"
          />
          {siteQuery.trim().length > 0 ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Effacer la recherche"
              onPress={() => setSiteQuery('')}
              className="h-9 w-9 items-center justify-center rounded-full bg-white/70 dark:bg-white/10"
            >
              <Icon name="x" size={16} color={isDark ? '#FFFFFF' : '#0F172A'} />
            </Pressable>
          ) : null}
        </View>
        <View className="mt-3 flex-row flex-wrap gap-2">
          {filteredSites.map(s => {
            const selected = s.id === siteId;
            return (
              <Pressable
                key={s.id}
                onPress={() => setSiteId(s.id)}
                accessibilityRole="button"
                accessibilityLabel={`Sélectionner le site ${s.name}`}
                className={selected ? 'rounded-2xl bg-brand-600 px-3 py-2' : 'rounded-2xl bg-slate-100 dark:bg-slate-800 px-3 py-2'}
              >
                <Text className={selected ? 'text-[13px] font-semibold text-white' : 'text-[13px] font-semibold text-slate-800 dark:text-slate-100'}>
                  {s.name}
                </Text>
                <Text className={selected ? 'mt-0.5 text-[11px] text-white/80' : 'mt-0.5 text-[11px] text-slate-500 dark:text-slate-300'}>
                  {s.city}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Card>

      <SectionHeader title="Constat" />
      <Card>
        {Platform.OS === 'web' ? (
          <View className="flex-row gap-3">
            <View className="flex-1">
              <Text className="text-[12px] font-semibold text-slate-600 dark:text-slate-300">Date (YYYY-MM-DD)</Text>
              <TextInput value={occurredDate} onChangeText={setOccurredDate} className="mt-2 text-[15px] text-slate-900 dark:text-white" />
            </View>
            <View className="flex-1">
              <Text className="text-[12px] font-semibold text-slate-600 dark:text-slate-300">Heure (HH:MM)</Text>
              <TextInput value={occurredTime} onChangeText={setOccurredTime} className="mt-2 text-[15px] text-slate-900 dark:text-white" />
            </View>
          </View>
        ) : (
          <>
            <View className="flex-row gap-3">
              <View className="flex-1">
                <Text className="text-[12px] font-semibold text-slate-600 dark:text-slate-300">Date</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Choisir la date du constat"
                  onPress={() => openPicker('occurredDate')}
                  className="mt-2 flex-row items-center justify-between rounded-2xl bg-slate-50 dark:bg-slate-800 px-4 py-4"
                >
                  <View>
                    <Text className="text-[15px] font-semibold text-slate-900 dark:text-white">{shortDateLabel(occurredDate)}</Text>
                    <Text className="mt-0.5 text-[12px] text-slate-500 dark:text-slate-300">{occurredDate}</Text>
                  </View>
                  <Icon name="calendar" size={20} color={isDark ? '#FFFFFF' : '#111827'} />
                </Pressable>
              </View>
              <View className="flex-1">
                <Text className="text-[12px] font-semibold text-slate-600 dark:text-slate-300">Heure</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Choisir l’heure du constat"
                  onPress={() => openPicker('occurredTime')}
                  className="mt-2 flex-row items-center justify-between rounded-2xl bg-slate-50 dark:bg-slate-800 px-4 py-4"
                >
                  <Text className="text-[15px] font-semibold text-slate-900 dark:text-white">{occurredTime}</Text>
                  <Icon name="check" size={18} color={isDark ? 'rgba(255,255,255,0.75)' : '#6B7280'} />
                </Pressable>
              </View>
            </View>

            <View className="mt-4">
              <Text className="text-[12px] font-semibold text-slate-600 dark:text-slate-300">Échéance de correction (optionnel)</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Choisir une échéance"
                onPress={() => openPicker('dueDate')}
                className="mt-2 flex-row items-center justify-between rounded-2xl bg-slate-50 dark:bg-slate-800 px-4 py-4"
              >
                <View>
                  <Text className="text-[15px] font-semibold text-slate-900 dark:text-white">{dueDate ? shortDateLabel(dueDate) : 'Aucune'}</Text>
                  <Text className="mt-0.5 text-[12px] text-slate-500 dark:text-slate-300">{dueDate ?? 'Rappel et suivi exploitation'}</Text>
                </View>
                <Icon name="chevron-right" size={20} color={isDark ? '#FFFFFF' : '#111827'} />
              </Pressable>

              <View className="mt-3 flex-row gap-2">
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Retirer l’échéance"
                  onPress={() => setDueDate(null)}
                  className="flex-1 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3 py-3 active:opacity-90"
                >
                  <Text className="text-center text-[12px] font-semibold text-slate-700 dark:text-slate-200">Aucune</Text>
                </Pressable>
                {[0, 1, 2].map(d => (
                  <Pressable
                    key={d}
                    accessibilityRole="button"
                    accessibilityLabel={d === 0 ? 'Échéance aujourd’hui' : `Échéance dans ${d} jour${d > 1 ? 's' : ''}`}
                    onPress={() => setDueDate(addDaysISODate(occurredDate, d))}
                    className="flex-1 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3 py-3 active:opacity-90"
                  >
                    <Text className="text-center text-[12px] font-semibold text-slate-700 dark:text-slate-200">{d === 0 ? 'Aujourd’hui' : `+${d}j`}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </>
        )}
      </Card>

      <SectionHeader title="Sévérité" />
      <View className="flex-row gap-2">
        {severities.map(s => {
          const selected = s.value === severity;
          const icon = s.value === 'critique' ? 'triangle-alert' : s.value === 'majeure' ? 'circle-alert' : 'badge-check';
          return (
            <Card
              key={s.value}
              onPress={() => setSeverity(s.value)}
              className={selected ? 'flex-1 px-4 py-3 bg-brand-600 border-brand-600' : 'flex-1 px-4 py-3'}
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center">
                  <Icon name={icon} size={16} color={selected ? '#FFFFFF' : isDark ? '#FFFFFF' : '#0F172A'} />
                  <Text className={selected ? 'ml-2 text-[13px] font-semibold text-white' : 'ml-2 text-[13px] font-semibold text-slate-900 dark:text-white'}>
                    {s.label}
                  </Text>
                </View>
                <Chip label={s.value} tone={s.tone} />
              </View>
            </Card>
          );
        })}
      </View>

      <SectionHeader title="Détails" />
      <Card>
        <Text className="text-[12px] font-semibold text-slate-600 dark:text-slate-300">Titre</Text>
        <TextInput accessibilityLabel="Titre de l’incident" value={title} onChangeText={setTitle} className="mt-2 text-[15px] text-slate-900 dark:text-white" />

        <Text className="mt-4 text-[12px] font-semibold text-slate-600 dark:text-slate-300">Description</Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          accessibilityLabel="Description de l’incident"
          multiline
          className="mt-2 min-h-[96px] text-[14px] text-slate-900 dark:text-white"
        />

        <Text className="mt-4 text-[12px] font-semibold text-slate-600 dark:text-slate-300">Assigné à</Text>
        <TextInput accessibilityLabel="Responsable assigné" value={assignedTo} onChangeText={setAssignedTo} className="mt-2 text-[15px] text-slate-900 dark:text-white" />
      </Card>

      <SectionHeader title="Aperçu" />
      <Card>
        <Text className="text-[14px] font-semibold text-slate-900 dark:text-white">{title.trim() || 'Incident'}</Text>
        <Text className="mt-1 text-[13px] text-slate-500 dark:text-slate-300">{selectedSite ? `${selectedSite.name} • ${selectedSite.city}` : 'Sélectionne un site'}</Text>
        <View className="mt-3 flex-row flex-wrap gap-2">
          <Chip label={severity} tone={severity === 'critique' ? 'danger' : severity === 'majeure' ? 'warning' : 'neutral'} />
          <Chip label={`${occurredDate} • ${occurredTime}`} tone="brand" />
          {dueDate ? <Chip label={`Échéance: ${dueDate}`} tone="neutral" /> : null}
          {assignedTo.trim().length > 0 ? <Chip label={`Assigné: ${assignedTo.trim()}`} tone="neutral" /> : null}
        </View>
        <Text className="mt-3 text-[13px] text-slate-600 dark:text-slate-300">
          {description.trim().slice(0, 140) || 'Ajoute une description pour un suivi exploitable.'}
        </Text>
      </Card>

      <View className="mt-6 gap-3">
        <Button label="Créer l’incident" disabled={!canCreate} onPress={create} />
        <Button
          label="Annuler"
          variant="secondary"
          onPress={confirmClose}
        />
      </View>

      <Modal visible={Boolean(picker) && Platform.OS !== 'web'} transparent animationType="fade" onRequestClose={closePicker}>
        <Pressable onPress={closePicker} style={{ flex: 1, backgroundColor: overlay, justifyContent: 'flex-end' }}>
          <Pressable
            onPress={() => {}}
            style={{
              backgroundColor: sheetBg,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              borderTopWidth: 1,
              borderTopColor: sheetBorder,
              paddingHorizontal: 14,
              paddingTop: 12,
              paddingBottom: 18
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 6, paddingBottom: 10 }}>
              <View>
                <Text style={{ fontSize: 14, fontWeight: '800', color: sheetText }}>
                  {picker?.kind === 'occurredDate' ? 'Choisir une date' : picker?.kind === 'occurredTime' ? 'Choisir une heure' : 'Choisir une échéance'}
                </Text>
                <Text style={{ marginTop: 2, fontSize: 12, fontWeight: '600', color: sheetTextMuted }}>
                  {picker?.kind === 'occurredDate' ? occurredDate : picker?.kind === 'occurredTime' ? occurredTime : dueDate ?? 'Aucune'}
                </Text>
              </View>
              <Pressable onPress={closePicker} style={{ height: 36, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center', borderRadius: 999, backgroundColor: isDark ? '#111B21' : '#F3F4F6' }}>
                <Text style={{ fontSize: 13, fontWeight: '800', color: sheetText }}>OK</Text>
              </Pressable>
            </View>

            {picker && DateTimePicker ? (
              <DateTimePicker
                value={
                  picker.kind === 'occurredDate'
                    ? isoToDate(occurredDate)
                    : picker.kind === 'occurredTime'
                      ? timeToDate(occurredDate, occurredTime)
                      : isoToDate(dueDate ?? occurredDate)
                }
                mode={picker.kind === 'occurredTime' ? 'time' : 'date'}
                display={Platform.OS === 'ios' ? (picker.kind === 'occurredTime' ? 'spinner' : 'inline') : 'default'}
                onChange={(event: any, selected?: Date) => {
                  if (Platform.OS === 'android') {
                    if (event?.type === 'dismissed') return closePicker();
                    if (event?.type === 'set' && selected) {
                      applyPicked(selected);
                      return closePicker();
                    }
                    return;
                  }
                  if (!selected) return;
                  applyPicked(selected);
                }}
              />
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}
