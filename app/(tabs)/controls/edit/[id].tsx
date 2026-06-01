import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Platform, Pressable, Text, View } from 'react-native';

import { AppBar } from '../../../../components/ui/AppBar';
import { Button } from '../../../../components/ui/Button';
import { Card } from '../../../../components/ui/Card';
import { DateTimePickerSheet } from '../../../../components/ui/DateTimePickerSheet';
import { FormField, PickerField, TextField } from '../../../../components/ui/FormControls';
import { Screen } from '../../../../components/ui/Screen';
import { SegmentedControl } from '../../../../components/ui/SegmentedControl';
import { SectionHeader } from '../../../../components/ui/SectionHeader';
import { SitePickerModal } from '../../../../components/ui/SitePickerModal';
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

const statuses: Array<{ label: string; value: ControlStatus; tone: 'neutral' | 'brand' | 'success' }> = [
  { label: 'Planifié', value: 'planned', tone: 'neutral' },
  { label: 'En cours', value: 'inProgress', tone: 'brand' },
  { label: 'Terminé', value: 'done', tone: 'success' }
];

export default function EditControlScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { state, dispatch } = useAppStore();

  const control = state.plannedControls.find(c => c.id === id);

  const [siteId, setSiteId] = useState(control?.siteId ?? state.sites[0]?.id ?? '');
  const [date, setDate] = useState(control?.date ?? state.selectedDate ?? todayISODate());
  const [startTime, setStartTime] = useState(control?.startTime ?? '09:00');
  const [endTime, setEndTime] = useState(control?.endTime ?? '09:45');
  const [type, setType] = useState<ControlType>(control?.type ?? 'quality');
  const [status, setStatus] = useState<ControlStatus>(control?.status ?? 'planned');
  const [assigneeName, setAssigneeName] = useState(control?.assigneeName ?? (state.session.userName || 'Agent'));
  const [picker, setPicker] = useState<null | { kind: 'date' | 'start' | 'end' }>(null);
  const [sitePickerOpen, setSitePickerOpen] = useState(false);

  const selectedSite = state.sites.find(s => s.id === siteId);

  const canSave = useMemo(() => Boolean(control && siteId && date && startTime && endTime), [control, siteId, date, startTime, endTime]);
  const hasDraftChanges = useMemo(
    () =>
      Boolean(
        control &&
          (siteId !== control.siteId ||
            date !== control.date ||
            startTime !== control.startTime ||
            endTime !== control.endTime ||
            type !== control.type ||
            status !== control.status ||
            assigneeName !== control.assigneeName)
      ),
    [assigneeName, control, date, endTime, siteId, startTime, status, type]
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
    <Screen
      footer={
        <View className="gap-3">
          <Button label="Enregistrer" disabled={!canSave} onPress={save} />
          <Button label="Annuler" variant="secondary" onPress={confirmClose} />
        </View>
      }
    >
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
            <FormField label="Date" hint="Format AAAA-MM-JJ">
              <TextField value={date} onChangeText={setDate} keyboardType="numbers-and-punctuation" autoCapitalize="none" autoCorrect={false} />
            </FormField>
            <View className="mt-4 flex-row gap-3">
              <View className="flex-1">
                <FormField label="Début" hint="Format HH:MM">
                  <TextField value={startTime} onChangeText={setStartTime} keyboardType="numbers-and-punctuation" autoCapitalize="none" autoCorrect={false} />
                </FormField>
              </View>
              <View className="flex-1">
                <FormField label="Fin" hint="Format HH:MM">
                  <TextField value={endTime} onChangeText={setEndTime} keyboardType="numbers-and-punctuation" autoCapitalize="none" autoCorrect={false} />
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

      <SectionHeader title="Type & Statut" />
      <Card>
        <Text className="text-[12px] font-semibold text-slate-600 dark:text-slate-300">Type</Text>
        <SegmentedControl
          className="mt-2"
          value={type}
          onChange={setType}
          items={[
            { label: 'Qualité', value: 'quality', icon: 'clipboard-check', tone: 'brand' },
            { label: 'Avant / Après', value: 'beforeAfter', icon: 'camera', tone: 'neutral' }
          ]}
        />
        <Text className="mt-4 text-[12px] font-semibold text-slate-600 dark:text-slate-300">Statut</Text>
        <SegmentedControl
          className="mt-2"
          value={status}
          onChange={setStatus}
          items={statuses.map(s => ({ label: s.label, value: s.value, tone: s.tone }))}
        />
      </Card>

      <SectionHeader title="Assignation" />
      <Card>
        <FormField label="Assigné à" icon="user" hint="Nom de la personne responsable du contrôle.">
          <TextField
            leftIcon="user"
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
