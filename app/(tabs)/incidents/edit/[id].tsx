import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Modal, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { useColorScheme } from 'nativewind';

import { AppBar } from '../../../../components/ui/AppBar';
import { Button } from '../../../../components/ui/Button';
import { Card } from '../../../../components/ui/Card';
import { Chip } from '../../../../components/ui/Chip';
import { Icon } from '../../../../components/ui/Icon';
import { Screen } from '../../../../components/ui/Screen';
import { SectionHeader } from '../../../../components/ui/SectionHeader';
import type { IncidentStatus, Severity } from '../../../../lib/models';
import { pad2, shortDateLabel, todayISODate } from '../../../../lib/format';
import { useAppStore } from '../../../../lib/store';

function isoToDate(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
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

function fromISODateTime(isoDateTime: string) {
  const dt = new Date(isoDateTime);
  const date = todayISODate(dt);
  const time = dateToTime(dt);
  return { date, time };
}

const severities: Array<{ label: string; value: Severity; tone: 'danger' | 'warning' | 'neutral' }> = [
  { label: 'Critique', value: 'critique', tone: 'danger' },
  { label: 'Majeure', value: 'majeure', tone: 'warning' },
  { label: 'Mineure', value: 'mineure', tone: 'neutral' }
];

const statuses: Array<{ label: string; value: IncidentStatus; tone: 'neutral' | 'brand' | 'success' }> = [
  { label: 'Ouvert', value: 'ouvert', tone: 'neutral' },
  { label: 'En cours', value: 'en_cours', tone: 'brand' },
  { label: 'Clos', value: 'clos', tone: 'success' }
];

export default function EditIncidentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { state, dispatch } = useAppStore();
  const { colorScheme } = useColorScheme();

  const incident = state.incidents.find(i => i.id === id);

  const rawOccurredAt = incident?.occurredAt || incident?.createdAt || new Date().toISOString();
  const initialOccurred = fromISODateTime(rawOccurredAt);

  const [severity, setSeverity] = useState<Severity>(incident?.severity ?? 'majeure');
  const [status, setStatus] = useState<IncidentStatus>(incident?.status ?? 'ouvert');
  const [occurredDate, setOccurredDate] = useState(initialOccurred.date);
  const [occurredTime, setOccurredTime] = useState(initialOccurred.time);
  const [dueDate, setDueDate] = useState<string | null>(incident?.dueDate ?? null);
  const [title, setTitle] = useState(incident?.title ?? '');
  const [description, setDescription] = useState(incident?.description ?? '');
  const [assignedTo, setAssignedTo] = useState(incident?.assignedTo ?? '');
  const [picker, setPicker] = useState<null | { kind: 'occurredDate' | 'occurredTime' | 'dueDate' }>(null);

  const canSave = useMemo(() => Boolean(incident && title.trim().length >= 4 && description.trim().length >= 8), [incident, title, description]);
  const hasDraftChanges = useMemo(
    () =>
      Boolean(
        incident &&
          (severity !== incident.severity ||
            status !== incident.status ||
            occurredDate !== initialOccurred.date ||
            occurredTime !== initialOccurred.time ||
            dueDate !== (incident.dueDate ?? null) ||
            title !== incident.title ||
            description !== incident.description ||
            assignedTo !== (incident.assignedTo ?? ''))
      ),
    [assignedTo, description, dueDate, incident, initialOccurred.date, initialOccurred.time, occurredDate, occurredTime, severity, status, title]
  );

  const DateTimePicker: any = Platform.OS === 'web' ? null : require('@react-native-community/datetimepicker').default;
  const isDark = colorScheme === 'dark';
  const overlay = isDark ? 'rgba(0,0,0,0.55)' : 'rgba(0,0,0,0.35)';
  const sheetBg = isDark ? '#0B141A' : '#FFFFFF';
  const sheetBorder = isDark ? '#1F2C34' : '#E5E7EB';
  const sheetText = isDark ? '#FFFFFF' : '#111827';
  const sheetTextMuted = isDark ? 'rgba(255,255,255,0.7)' : '#6B7280';

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
    if (picker.kind === 'occurredDate') setOccurredDate(todayISODate(dt));
    if (picker.kind === 'occurredTime') setOccurredTime(dateToTime(dt));
    if (picker.kind === 'dueDate') setDueDate(todayISODate(dt));
  };

  if (!incident) {
    return (
      <Screen>
        <AppBar title="Modifier" subtitle="Incident introuvable" left={{ icon: 'chevron-left', label: 'Retour', onPress: () => router.back() }} />
        <Card className="mt-6">
          <Text className="text-[14px] font-semibold text-slate-900 dark:text-white">Introuvable</Text>
          <Text className="mt-1 text-[13px] text-slate-500 dark:text-slate-300">Cet incident est introuvable.</Text>
        </Card>
      </Screen>
    );
  }

  const save = () => {
    dispatch({
      type: 'updateIncident',
      incidentId: incident.id,
      patch: {
        severity,
        occurredAt: toISODateTime(occurredDate, occurredTime),
        dueDate: dueDate || undefined,
        title: title.trim().slice(0, 80),
        description: description.trim().slice(0, 600),
        assignedTo: assignedTo.trim().slice(0, 64) || undefined
      }
    });
    dispatch({ type: 'setIncidentStatus', incidentId: incident.id, status });
    router.back();
  };

  return (
    <Screen>
      <AppBar
        title="Modifier incident"
        subtitle={incident.id}
        left={{ icon: 'chevron-left', label: 'Retour', onPress: confirmClose }}
        right={[
          {
            icon: 'trash',
            label: 'Supprimer',
            onPress: () =>
              Alert.alert('Supprimer', 'Supprimer cet incident ?', [
                { text: 'Annuler', style: 'cancel' },
                { text: 'Supprimer', style: 'destructive', onPress: () => dispatch({ type: 'deleteIncident', incidentId: incident.id }) }
              ])
          }
        ]}
      />

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
                <Pressable onPress={() => openPicker('occurredDate')} className="mt-2 flex-row items-center justify-between rounded-2xl bg-slate-50 dark:bg-slate-800 px-4 py-4">
                  <View>
                    <Text className="text-[15px] font-semibold text-slate-900 dark:text-white">{shortDateLabel(occurredDate)}</Text>
                    <Text className="mt-0.5 text-[12px] text-slate-500 dark:text-slate-300">{occurredDate}</Text>
                  </View>
                  <Icon name="calendar" size={20} color={isDark ? '#FFFFFF' : '#111827'} />
                </Pressable>
              </View>
              <View className="flex-1">
                <Text className="text-[12px] font-semibold text-slate-600 dark:text-slate-300">Heure</Text>
                <Pressable onPress={() => openPicker('occurredTime')} className="mt-2 flex-row items-center justify-between rounded-2xl bg-slate-50 dark:bg-slate-800 px-4 py-4">
                  <Text className="text-[15px] font-semibold text-slate-900 dark:text-white">{occurredTime}</Text>
                  <Icon name="check" size={18} color={isDark ? 'rgba(255,255,255,0.75)' : '#6B7280'} />
                </Pressable>
              </View>
            </View>
            <View className="mt-4">
              <Text className="text-[12px] font-semibold text-slate-600 dark:text-slate-300">Échéance (optionnel)</Text>
              <Pressable onPress={() => openPicker('dueDate')} className="mt-2 flex-row items-center justify-between rounded-2xl bg-slate-50 dark:bg-slate-800 px-4 py-4">
                <View>
                  <Text className="text-[15px] font-semibold text-slate-900 dark:text-white">{dueDate ? shortDateLabel(dueDate) : 'Aucune'}</Text>
                  <Text className="mt-0.5 text-[12px] text-slate-500 dark:text-slate-300">{dueDate ?? 'Suivi exploitation'}</Text>
                </View>
                <Icon name="chevron-right" size={20} color={isDark ? '#FFFFFF' : '#111827'} />
              </Pressable>
              <Pressable onPress={() => setDueDate(null)} className="mt-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3 py-3 active:opacity-90">
                <Text className="text-center text-[12px] font-semibold text-slate-700 dark:text-slate-200">Retirer l’échéance</Text>
              </Pressable>
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
            <Card key={s.value} onPress={() => setSeverity(s.value)} className={selected ? 'flex-1 px-4 py-3 bg-brand-600 border-brand-600' : 'flex-1 px-4 py-3'}>
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center">
                  <Icon name={icon} size={16} color={selected ? '#FFFFFF' : isDark ? '#FFFFFF' : '#0F172A'} />
                  <Text className={selected ? 'ml-2 text-[13px] font-semibold text-white' : 'ml-2 text-[13px] font-semibold text-slate-900 dark:text-white'}>{s.label}</Text>
                </View>
                <Chip label={s.value} tone={s.tone} />
              </View>
            </Card>
          );
        })}
      </View>

      <SectionHeader title="Statut" />
      <View className="flex-row gap-2">
        {statuses.map(s => {
          const selected = s.value === status;
          return (
            <Card key={s.value} onPress={() => setStatus(s.value)} className={selected ? 'flex-1 px-4 py-3 bg-brand-600 border-brand-600' : 'flex-1 px-4 py-3'}>
              <View className="flex-row items-center justify-between">
                <Text className={selected ? 'text-[13px] font-semibold text-white' : 'text-[13px] font-semibold text-slate-900 dark:text-white'}>{s.label}</Text>
                <Chip label={s.value === 'ouvert' ? '!' : s.value === 'en_cours' ? '↻' : '✓'} tone={s.tone} />
              </View>
            </Card>
          );
        })}
      </View>

      <SectionHeader title="Détails" />
      <Card>
        <Text className="text-[12px] font-semibold text-slate-600 dark:text-slate-300">Titre</Text>
        <TextInput value={title} onChangeText={setTitle} className="mt-2 text-[15px] text-slate-900 dark:text-white" />

        <Text className="mt-4 text-[12px] font-semibold text-slate-600 dark:text-slate-300">Description</Text>
        <TextInput value={description} onChangeText={setDescription} multiline className="mt-2 min-h-[96px] text-[14px] text-slate-900 dark:text-white" />

        <Text className="mt-4 text-[12px] font-semibold text-slate-600 dark:text-slate-300">Assigné à</Text>
        <TextInput value={assignedTo} onChangeText={setAssignedTo} className="mt-2 text-[15px] text-slate-900 dark:text-white" />
      </Card>

      <View className="mt-6 gap-3">
        <Button label="Enregistrer" disabled={!canSave} onPress={save} />
        <Button label="Annuler" variant="secondary" onPress={confirmClose} />
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
