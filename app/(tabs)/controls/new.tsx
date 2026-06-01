import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Platform, Pressable, Text, View } from 'react-native';
import { AppBar } from '../../../components/ui/AppBar';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { FormField, PickerField, TextField } from '../../../components/ui/FormControls';
import { DateTimePickerSheet } from '../../../components/ui/DateTimePickerSheet';
import { SegmentedControl } from '../../../components/ui/SegmentedControl';
import { Screen } from '../../../components/ui/Screen';
import { SectionHeader } from '../../../components/ui/SectionHeader';
import { SitePickerModal } from '../../../components/ui/SitePickerModal';
import { pad2, shortDateLabel, todayISODate } from '../../../lib/format';
import { scheduleLocalNotification } from '../../../lib/notifications';
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

export default function NewControlScreen() {
  const router = useRouter();
  const { state, dispatch } = useAppStore();

  const [siteId, setSiteId] = useState(state.sites[0]?.id ?? '');
  const [date, setDate] = useState(state.selectedDate || todayISODate());
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('09:45');
  const [type, setType] = useState<ControlType>('quality');
  const [assigneeName, setAssigneeName] = useState(state.session.userName || 'Agent');
  const [picker, setPicker] = useState<null | { kind: 'date' | 'start' | 'end' }>(null);
  const [sitePickerOpen, setSitePickerOpen] = useState(false);

  const selectedSite = state.sites.find(s => s.id === siteId);

  const canCreate = useMemo(() => siteId && date.trim().length === 10 && startTime.trim().length >= 4 && endTime.trim().length >= 4, [siteId, date, startTime, endTime]);
  const hasDraftChanges = useMemo(
    () =>
      siteId !== (state.sites[0]?.id ?? '') ||
      date !== (state.selectedDate || todayISODate()) ||
      startTime !== '09:00' ||
      endTime !== '09:45' ||
      type !== 'quality' ||
      assigneeName !== (state.session.userName || 'Agent'),
    [assigneeName, date, endTime, siteId, startTime, state.selectedDate, state.session.userName, state.sites, type]
  );

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

  const pickerTitle = picker?.kind === 'date' ? 'Choisir une date' : picker?.kind === 'start' ? 'Heure de début' : 'Heure de fin';
  const pickerSubtitle = picker?.kind === 'date' ? date : picker?.kind === 'start' ? startTime : endTime;

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
    if (Platform.OS !== 'web') {
      const start = timeToDate(control.date, control.startTime);
      const result = await scheduleLocalNotification({
        title: 'Controle a venir',
        body: `Controle planifie a ${control.startTime}.`,
        triggerAt: new Date(start.getTime() - 15 * 60 * 1000),
        sound: true
      });
      if (result === 'denied') {
        Alert.alert('Notifications désactivées', 'Le rappel local n’a pas pu être activé sans permission.');
      }
    }
    router.back();
  };

  return (
    <Screen
      footer={
        <View className="gap-3">
          <Button label="Créer le contrôle" disabled={!canCreate} onPress={create} />
          <Button label="Annuler" variant="secondary" onPress={confirmClose} />
        </View>
      }
    >
      <AppBar title="Nouveau contrôle" subtitle="Planifier un contrôle" left={{ icon: 'chevron-left', label: 'Retour', onPress: confirmClose }} />

      <Card>
        <FormField label="Site" icon="building">
          <PickerField
            value={selectedSite ? selectedSite.name : 'Choisir un site'}
            description={selectedSite ? `${selectedSite.city} • ${selectedSite.address}` : 'Obligatoire'}
            leftIcon="building"
            icon="chevron-right"
            onPress={() => setSitePickerOpen(true)}
          />
        </FormField>
      </Card>

      <SectionHeader title="Planning" />
      <Card>
        {Platform.OS === 'web' ? (
          <>
            <View className="flex-row gap-3">
              <View className="flex-1">
                <FormField label="Date" hint="Format AAAA-MM-JJ">
                  <TextField leftIcon="calendar" value={date} onChangeText={setDate} keyboardType="numbers-and-punctuation" autoCapitalize="none" autoCorrect={false} />
                </FormField>
              </View>
            </View>
            <View className="mt-4 flex-row gap-3">
              <View className="flex-1">
                <FormField label="Début" hint="Format HH:MM">
                  <TextField leftIcon="chevron-right" value={startTime} onChangeText={setStartTime} keyboardType="numbers-and-punctuation" autoCapitalize="none" autoCorrect={false} />
                </FormField>
              </View>
              <View className="flex-1">
                <FormField label="Fin" hint="Format HH:MM">
                  <TextField leftIcon="chevron-right" value={endTime} onChangeText={setEndTime} keyboardType="numbers-and-punctuation" autoCapitalize="none" autoCorrect={false} />
                </FormField>
              </View>
            </View>
          </>
        ) : (
          <>
            <FormField label="Date" icon="calendar">
              <PickerField value={shortDateLabel(date)} description={date} leftIcon="calendar" icon="chevron-right" onPress={() => openPicker('date')} />
            </FormField>

            <View className="mt-4 flex-row gap-3">
              <View className="flex-1">
                <FormField label="Début" icon="chevron-right">
                  <PickerField value={startTime} leftIcon="chevron-right" icon="chevron-right" onPress={() => openPicker('start')} />
                </FormField>
              </View>
              <View className="flex-1">
                <FormField label="Fin" icon="chevron-right">
                  <PickerField value={endTime} leftIcon="chevron-right" icon="chevron-right" onPress={() => openPicker('end')} />
                </FormField>
              </View>
            </View>

            <FormField label="Durée rapide" className="mt-4">
            <View className="mt-2 flex-row gap-2">
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
            </FormField>
          </>
        )}
      </Card>

      <SectionHeader title="Type" />
      <Card>
        <SegmentedControl
          value={type}
          onChange={setType}
          items={[
            { label: 'Qualité', value: 'quality', icon: 'clipboard-check', tone: 'brand' },
            { label: 'Avant / Après', value: 'beforeAfter', icon: 'camera', tone: 'neutral' }
          ]}
        />
      </Card>

      <Card>
        <FormField label="Assigné à" icon="user" hint="Nom de la personne responsable du contrôle.">
          <TextField
            leftIcon="user"
            accessibilityLabel="Nom de la personne assignée"
            value={assigneeName}
            onChangeText={setAssigneeName}
            autoCapitalize="words"
            autoCorrect={false}
          />
        </FormField>
      </Card>
      <SitePickerModal
        visible={sitePickerOpen}
        sites={state.sites}
        selectedSiteId={siteId}
        onClose={() => setSitePickerOpen(false)}
        onSelect={setSiteId}
      />
      <DateTimePickerSheet
        visible={Boolean(picker) && Platform.OS !== 'web'}
        title={pickerTitle}
        subtitle={pickerSubtitle}
        mode={picker?.kind === 'date' ? 'date' : 'time'}
        value={
          picker?.kind === 'date'
            ? isoToDate(date)
            : picker?.kind === 'start'
              ? timeToDate(date, startTime)
              : timeToDate(date, endTime)
        }
        onClose={closePicker}
        onPicked={dt => {
          if (!picker) return;
          if (picker.kind === 'date') onPickedDate(dt);
          if (picker.kind === 'start') onPickedStart(dt);
          if (picker.kind === 'end') onPickedEnd(dt);
        }}
      />
    </Screen>
  );
}
