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
import { pad2, shortDateLabel, todayISODate } from '../../../../lib/format';
import type { ControlStatus, ControlType, PlannedControl } from '../../../../lib/models';
import { useAppStore } from '../../../../lib/store';

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

function addMinutesToTime(time: string, minutes: number) {
  return minutesToTime(timeToMinutes(time) + minutes);
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

const types: Array<{ label: string; value: ControlType }> = [
  { label: 'Qualité', value: 'quality' },
  { label: 'Avant/Après', value: 'beforeAfter' }
];

const statuses: Array<{ label: string; value: ControlStatus; tone: 'neutral' | 'brand' | 'success' }> = [
  { label: 'Planifié', value: 'planned', tone: 'neutral' },
  { label: 'En cours', value: 'inProgress', tone: 'brand' },
  { label: 'Terminé', value: 'done', tone: 'success' }
];

export default function EditControlScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { state, dispatch } = useAppStore();
  const { colorScheme } = useColorScheme();

  const control = state.plannedControls.find(c => c.id === id);

  const [siteId, setSiteId] = useState(control?.siteId ?? state.sites[0]?.id ?? '');
  const [siteQuery, setSiteQuery] = useState('');
  const [date, setDate] = useState(control?.date ?? state.selectedDate ?? todayISODate());
  const [startTime, setStartTime] = useState(control?.startTime ?? '09:00');
  const [endTime, setEndTime] = useState(control?.endTime ?? '09:45');
  const [type, setType] = useState<ControlType>(control?.type ?? 'quality');
  const [status, setStatus] = useState<ControlStatus>(control?.status ?? 'planned');
  const [assigneeName, setAssigneeName] = useState(control?.assigneeName ?? (state.session.userName || 'Agent'));
  const [picker, setPicker] = useState<null | { kind: 'date' | 'start' | 'end' }>(null);

  const selectedSite = state.sites.find(s => s.id === siteId);

  const filteredSites = useMemo(() => {
    const q = siteQuery.trim().toLowerCase();
    if (!q) return state.sites;
    return state.sites.filter(s => `${s.name} ${s.city} ${s.address}`.toLowerCase().includes(q));
  }, [siteQuery, state.sites]);

  const canSave = useMemo(() => Boolean(control && siteId && date && startTime && endTime), [control, siteId, date, startTime, endTime]);
  const hasDraftChanges = useMemo(
    () =>
      Boolean(
        control &&
          (siteId !== control.siteId ||
            siteQuery.trim().length > 0 ||
            date !== control.date ||
            startTime !== control.startTime ||
            endTime !== control.endTime ||
            type !== control.type ||
            status !== control.status ||
            assigneeName !== control.assigneeName)
      ),
    [assigneeName, control, date, endTime, siteId, siteQuery, startTime, status, type]
  );

  const DateTimePicker: any = Platform.OS === 'web' ? null : require('@react-native-community/datetimepicker').default;
  const isDark = colorScheme === 'dark';
  const overlay = isDark ? 'rgba(0,0,0,0.55)' : 'rgba(0,0,0,0.35)';
  const sheetBg = isDark ? '#0B141A' : '#FFFFFF';
  const sheetBorder = isDark ? '#1F2C34' : '#E5E7EB';
  const sheetText = isDark ? '#FFFFFF' : '#111827';
  const sheetTextMuted = isDark ? 'rgba(255,255,255,0.7)' : '#6B7280';

  const openPicker = (kind: 'date' | 'start' | 'end') => setPicker({ kind });
  const closePicker = () => setPicker(null);
  const confirmClose = () => {
    if (!hasDraftChanges) return router.back();
    Alert.alert('Quitter', 'Des modifications non enregistrées seront perdues.', [
      { text: 'Continuer la saisie', style: 'cancel' },
      { text: 'Quitter', style: 'destructive', onPress: () => router.back() }
    ]);
  };

  const onPickedDate = (dt: Date) => {
    const iso = todayISODate(dt);
    setDate(iso);
    dispatch({ type: 'setSelectedDate', date: iso });
  };

  const onPickedStart = (dt: Date) => {
    const next = dateToTime(dt);
    setStartTime(next);
    if (timeToMinutes(endTime) <= timeToMinutes(next)) setEndTime(addMinutesToTime(next, 45));
  };

  const onPickedEnd = (dt: Date) => {
    const next = dateToTime(dt);
    if (timeToMinutes(next) <= timeToMinutes(startTime)) {
      setEndTime(addMinutesToTime(startTime, 45));
      return;
    }
    setEndTime(next);
  };

  if (!control) {
    return (
      <Screen>
        <AppBar title="Modifier" subtitle="Contrôle introuvable" left={{ icon: 'chevron-left', label: 'Retour', onPress: () => router.back() }} />
        <Card className="mt-6">
          <Text className="text-[14px] font-semibold text-slate-900 dark:text-white">Introuvable</Text>
          <Text className="mt-1 text-[13px] text-slate-500 dark:text-slate-300">Ce contrôle est introuvable.</Text>
        </Card>
      </Screen>
    );
  }

  const save = () => {
    const next: PlannedControl = {
      ...control,
      siteId,
      date: date.trim().slice(0, 10),
      startTime: startTime.trim().slice(0, 5),
      endTime: endTime.trim().slice(0, 5),
      type,
      status,
      assigneeName: assigneeName.trim().slice(0, 64) || 'Agent'
    };
    dispatch({ type: 'upsertPlannedControl', control: next });
    router.back();
  };

  return (
    <Screen>
      <AppBar
        title="Modifier contrôle"
        subtitle={control.id}
        left={{ icon: 'chevron-left', label: 'Retour', onPress: confirmClose }}
        right={[
          {
            icon: 'trash',
            label: 'Supprimer',
            onPress: () =>
              Alert.alert('Supprimer', 'Supprimer ce contrôle (et l’inspection associée) ?', [
                { text: 'Annuler', style: 'cancel' },
                { text: 'Supprimer', style: 'destructive', onPress: () => dispatch({ type: 'deletePlannedControl', controlId: control.id }) }
              ])
          }
        ]}
      />

      <SectionHeader title="Site" />
      <Card>
        <View className="flex-row items-center rounded-2xl bg-slate-50 dark:bg-slate-800 px-4 py-3">
          <Icon name="building" size={18} color={isDark ? 'rgba(255,255,255,0.8)' : '#64748B'} />
          <TextInput
            value={siteQuery}
            onChangeText={setSiteQuery}
            placeholder="Rechercher un site…"
            placeholderTextColor={isDark ? 'rgba(255,255,255,0.45)' : '#94A3B8'}
            className="ml-3 flex-1 text-[14px] text-slate-900 dark:text-white"
          />
          {siteQuery.trim().length > 0 ? (
            <Pressable accessibilityRole="button" accessibilityLabel="Effacer la recherche" onPress={() => setSiteQuery('')} className="h-9 w-9 items-center justify-center rounded-full bg-white/70 dark:bg-white/10">
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

      <SectionHeader title="Planning" />
      <Card>
        {Platform.OS === 'web' ? (
          <>
            <Text className="text-[12px] font-semibold text-slate-600 dark:text-slate-300">Date (YYYY-MM-DD)</Text>
            <TextInput value={date} onChangeText={setDate} className="mt-2 text-[15px] text-slate-900 dark:text-white" />
            <View className="mt-4 flex-row gap-3">
              <View className="flex-1">
                <Text className="text-[12px] font-semibold text-slate-600 dark:text-slate-300">Début (HH:MM)</Text>
                <TextInput value={startTime} onChangeText={setStartTime} className="mt-2 text-[15px] text-slate-900 dark:text-white" />
              </View>
              <View className="flex-1">
                <Text className="text-[12px] font-semibold text-slate-600 dark:text-slate-300">Fin (HH:MM)</Text>
                <TextInput value={endTime} onChangeText={setEndTime} className="mt-2 text-[15px] text-slate-900 dark:text-white" />
              </View>
            </View>
          </>
        ) : (
          <>
            <Text className="text-[12px] font-semibold text-slate-600 dark:text-slate-300">Date</Text>
            <Pressable
              onPress={() => openPicker('date')}
              className="mt-2 flex-row items-center justify-between rounded-2xl bg-slate-50 dark:bg-slate-800 px-4 py-4"
            >
              <View>
                <Text className="text-[15px] font-semibold text-slate-900 dark:text-white">{shortDateLabel(date)}</Text>
                <Text className="mt-0.5 text-[12px] text-slate-500 dark:text-slate-300">{date}</Text>
              </View>
              <Icon name="calendar" size={20} color={isDark ? '#FFFFFF' : '#111827'} />
            </Pressable>

            <View className="mt-4 flex-row gap-3">
              <View className="flex-1">
                <Text className="text-[12px] font-semibold text-slate-600 dark:text-slate-300">Début</Text>
                <Pressable
                  onPress={() => openPicker('start')}
                  className="mt-2 flex-row items-center justify-between rounded-2xl bg-slate-50 dark:bg-slate-800 px-4 py-4"
                >
                  <Text className="text-[15px] font-semibold text-slate-900 dark:text-white">{startTime}</Text>
                  <Icon name="check" size={18} color={isDark ? 'rgba(255,255,255,0.75)' : '#6B7280'} />
                </Pressable>
              </View>
              <View className="flex-1">
                <Text className="text-[12px] font-semibold text-slate-600 dark:text-slate-300">Fin</Text>
                <Pressable
                  onPress={() => openPicker('end')}
                  className="mt-2 flex-row items-center justify-between rounded-2xl bg-slate-50 dark:bg-slate-800 px-4 py-4"
                >
                  <Text className="text-[15px] font-semibold text-slate-900 dark:text-white">{endTime}</Text>
                  <Icon name="check" size={18} color={isDark ? 'rgba(255,255,255,0.75)' : '#6B7280'} />
                </Pressable>
              </View>
            </View>

            <View className="mt-4 flex-row gap-2">
              {[30, 45, 60].map(m => (
                <Pressable
                  key={m}
                  onPress={() => setEndTime(addMinutesToTime(startTime, m))}
                  className="flex-1 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3 py-3 active:opacity-90"
                >
                  <Text className="text-center text-[12px] font-semibold text-slate-700 dark:text-slate-200">{m} min</Text>
                </Pressable>
              ))}
            </View>

            <Modal visible={Boolean(picker)} transparent animationType="fade" onRequestClose={closePicker}>
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
                        {picker?.kind === 'date' ? 'Choisir une date' : picker?.kind === 'start' ? 'Heure de début' : 'Heure de fin'}
                      </Text>
                      <Text style={{ marginTop: 2, fontSize: 12, fontWeight: '600', color: sheetTextMuted }}>
                        {picker?.kind === 'date' ? date : picker?.kind === 'start' ? startTime : endTime}
                      </Text>
                    </View>
                    <Pressable onPress={closePicker} style={{ height: 36, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center', borderRadius: 999, backgroundColor: isDark ? '#111B21' : '#F3F4F6' }}>
                      <Text style={{ fontSize: 13, fontWeight: '800', color: sheetText }}>OK</Text>
                    </Pressable>
                  </View>

                  {picker && DateTimePicker ? (
                    <DateTimePicker
                      value={
                        picker.kind === 'date'
                          ? isoToDate(date)
                          : picker.kind === 'start'
                            ? timeToDate(date, startTime)
                            : timeToDate(date, endTime)
                      }
                      mode={picker.kind === 'date' ? 'date' : 'time'}
                      display={Platform.OS === 'ios' ? (picker.kind === 'date' ? 'inline' : 'spinner') : 'default'}
                      onChange={(event: any, selected?: Date) => {
                        if (Platform.OS === 'android') {
                          if (event?.type === 'dismissed') return closePicker();
                          if (event?.type === 'set' && selected) {
                            if (picker.kind === 'date') onPickedDate(selected);
                            if (picker.kind === 'start') onPickedStart(selected);
                            if (picker.kind === 'end') onPickedEnd(selected);
                            return closePicker();
                          }
                          return;
                        }
                        if (!selected) return;
                        if (picker.kind === 'date') onPickedDate(selected);
                        if (picker.kind === 'start') onPickedStart(selected);
                        if (picker.kind === 'end') onPickedEnd(selected);
                      }}
                    />
                  ) : null}
                </Pressable>
              </Pressable>
            </Modal>
          </>
        )}
      </Card>

      <SectionHeader title="Type & Statut" />
      <View className="flex-row gap-2">
        {types.map(t => {
          const selected = t.value === type;
          return (
            <Card key={t.value} onPress={() => setType(t.value)} className={selected ? 'flex-1 px-4 py-3 bg-brand-600 border-brand-600' : 'flex-1 px-4 py-3'}>
              <Text className={selected ? 'text-[13px] font-semibold text-white' : 'text-[13px] font-semibold text-slate-900 dark:text-white'}>{t.label}</Text>
            </Card>
          );
        })}
      </View>
      <View className="mt-2 flex-row gap-2">
        {statuses.map(s => {
          const selected = s.value === status;
          return (
            <Card key={s.value} onPress={() => setStatus(s.value)} className={selected ? 'flex-1 px-4 py-3 bg-brand-600 border-brand-600' : 'flex-1 px-4 py-3'}>
              <View className="flex-row items-center justify-between">
                <Text className={selected ? 'text-[13px] font-semibold text-white' : 'text-[13px] font-semibold text-slate-900 dark:text-white'}>{s.label}</Text>
                <Chip label={s.value === 'planned' ? 'P' : s.value === 'inProgress' ? '↻' : '✓'} tone={s.tone} />
              </View>
            </Card>
          );
        })}
      </View>

      <SectionHeader title="Assignation" />
      <Card>
        <Text className="text-[12px] font-semibold text-slate-600 dark:text-slate-300">Assigné à</Text>
        <TextInput value={assigneeName} onChangeText={setAssigneeName} className="mt-2 text-[15px] text-slate-900 dark:text-white" />
      </Card>

      <SectionHeader title="Aperçu" />
      <Card>
        <Text className="text-[14px] font-semibold text-slate-900 dark:text-white">Contrôle {type === 'quality' ? 'Qualité' : 'Avant/Après'}</Text>
        <Text className="mt-1 text-[13px] text-slate-500 dark:text-slate-300">
          {selectedSite ? `${selectedSite.name} • ${selectedSite.city}` : 'Sélectionne un site'}
        </Text>
        <View className="mt-3 flex-row flex-wrap gap-2">
          <Chip label={`${date} • ${startTime}-${endTime}`} tone="brand" />
          <Chip label={status === 'planned' ? 'Planifié' : status === 'inProgress' ? 'En cours' : 'Terminé'} tone="neutral" />
          {assigneeName.trim().length > 0 ? <Chip label={`Assigné: ${assigneeName.trim()}`} tone="neutral" /> : null}
        </View>
      </Card>

      <View className="mt-6 gap-3">
        <Button label="Enregistrer" disabled={!canSave} onPress={save} />
        <Button label="Annuler" variant="secondary" onPress={confirmClose} />
      </View>
    </Screen>
  );
}
