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
import { pad2, shortDateLabel, todayISODate } from '../../../lib/format';
import { ensureNotificationPermission } from '../../../lib/notifications';
import type { ControlType, PlannedControl } from '../../../lib/models';
import { useAppStore } from '../../../lib/store';

function uuid() {
  return `ctrl_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

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

export default function NewControlScreen() {
  const router = useRouter();
  const { state, dispatch } = useAppStore();
  const { colorScheme } = useColorScheme();

  const [siteId, setSiteId] = useState(state.sites[0]?.id ?? '');
  const [siteQuery, setSiteQuery] = useState('');
  const [date, setDate] = useState(state.selectedDate || todayISODate());
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('09:45');
  const [type, setType] = useState<ControlType>('quality');
  const [assigneeName, setAssigneeName] = useState(state.session.userName || 'Agent');
  const [picker, setPicker] = useState<null | { kind: 'date' | 'start' | 'end' }>(null);

  const selectedSite = state.sites.find(s => s.id === siteId);

  const filteredSites = useMemo(() => {
    const q = siteQuery.trim().toLowerCase();
    if (!q) return state.sites;
    return state.sites.filter(s => `${s.name} ${s.city} ${s.address}`.toLowerCase().includes(q));
  }, [siteQuery, state.sites]);

  const canCreate = useMemo(() => siteId && date.trim().length === 10 && startTime.trim().length >= 4 && endTime.trim().length >= 4, [siteId, date, startTime, endTime]);
  const hasDraftChanges = useMemo(
    () =>
      siteId !== (state.sites[0]?.id ?? '') ||
      siteQuery.trim().length > 0 ||
      date !== (state.selectedDate || todayISODate()) ||
      startTime !== '09:00' ||
      endTime !== '09:45' ||
      type !== 'quality' ||
      assigneeName !== (state.session.userName || 'Agent'),
    [assigneeName, date, endTime, siteId, siteQuery, startTime, state.selectedDate, state.session.userName, state.sites, type]
  );

  const DateTimePicker: any = Platform.OS === 'web' ? null : require('@react-native-community/datetimepicker').default;
  const Notifications: any = Platform.OS === 'web' ? null : require('expo-notifications');
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

  const create = async () => {
    const control: PlannedControl = {
      id: uuid(),
      siteId,
      date: date.trim(),
      startTime: startTime.trim().slice(0, 5),
      endTime: endTime.trim().slice(0, 5),
      type,
      status: 'planned',
      assigneeName: assigneeName.trim().slice(0, 64) || 'Agent'
    };
    dispatch({ type: 'upsertPlannedControl', control });
    if (Platform.OS !== 'web' && Notifications) {
      try {
        const granted = await ensureNotificationPermission();
        if (granted) {
          const start = timeToDate(control.date, control.startTime);
          const triggerAt = new Date(start.getTime() - 15 * 60 * 1000);
          if (triggerAt.getTime() > Date.now() + 10_000) {
            await Notifications.scheduleNotificationAsync({
              content: {
                title: 'Contrôle à venir',
                body: `Contrôle planifié à ${control.startTime}.`,
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
      <AppBar title="Nouveau contrôle" subtitle="Planifier un contrôle" left={{ icon: 'chevron-left', label: 'Retour', onPress: confirmClose }} />

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

      <SectionHeader title="Planning" />
      <Card>
        {Platform.OS === 'web' ? (
          <>
            <View className="flex-row gap-3">
              <View className="flex-1">
                <Text className="text-[12px] font-semibold text-slate-600 dark:text-slate-300">Date (YYYY-MM-DD)</Text>
                <TextInput value={date} onChangeText={setDate} className="mt-2 text-[15px] text-slate-900 dark:text-white" />
              </View>
            </View>
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

      <SectionHeader title="Type" />
      <View className="flex-row gap-2">
        {types.map(t => {
          const selected = t.value === type;
          return (
            <Card key={t.value} onPress={() => setType(t.value)} className={selected ? 'flex-1 px-4 py-3 bg-brand-600 border-brand-600' : 'flex-1 px-4 py-3'}>
              <View className="flex-row items-center justify-between">
                <Text className={selected ? 'text-[13px] font-semibold text-white' : 'text-[13px] font-semibold text-slate-900 dark:text-white'}>{t.label}</Text>
                <Chip label={t.value === 'quality' ? 'QA' : 'A/A'} tone="neutral" />
              </View>
            </Card>
          );
        })}
      </View>

      <SectionHeader title="Assignation" />
      <Card>
        <Text className="text-[12px] font-semibold text-slate-600 dark:text-slate-300">Assigné à</Text>
        <TextInput accessibilityLabel="Nom de la personne assignée" value={assigneeName} onChangeText={setAssigneeName} className="mt-2 text-[15px] text-slate-900 dark:text-white" />
      </Card>

      <SectionHeader title="Aperçu" />
      <Card>
        <Text className="text-[14px] font-semibold text-slate-900 dark:text-white">Contrôle {type === 'quality' ? 'Qualité' : 'Avant/Après'}</Text>
        <Text className="mt-1 text-[13px] text-slate-500 dark:text-slate-300">
          {selectedSite ? `${selectedSite.name} • ${selectedSite.city}` : 'Sélectionne un site'}
        </Text>
        <View className="mt-3 flex-row flex-wrap gap-2">
          <Chip label={`${date} • ${startTime}-${endTime}`} tone="brand" />
          <Chip label={type === 'quality' ? 'Checklist + note' : 'Photos avant/après'} tone="neutral" />
          {assigneeName.trim().length > 0 ? <Chip label={`Assigné: ${assigneeName.trim()}`} tone="neutral" /> : null}
        </View>
      </Card>

      <View className="mt-6 gap-3">
        <Button label="Créer le contrôle" disabled={!canCreate} onPress={create} />
        <Button label="Annuler" variant="secondary" onPress={confirmClose} />
      </View>
    </Screen>
  );
}
