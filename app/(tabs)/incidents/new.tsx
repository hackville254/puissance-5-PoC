import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Platform, Pressable, Text, View } from 'react-native';
import { AppBar } from '../../../components/ui/AppBar';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { DisclosureSection } from '../../../components/ui/DisclosureSection';
import { FormField, PickerField, TextField } from '../../../components/ui/FormControls';
import { DateTimePickerSheet } from '../../../components/ui/DateTimePickerSheet';
import { Screen } from '../../../components/ui/Screen';
import { SegmentedControl } from '../../../components/ui/SegmentedControl';
import { SectionHeader } from '../../../components/ui/SectionHeader';
import { SitePickerModal } from '../../../components/ui/SitePickerModal';
import type { Severity } from '../../../lib/models';
import { addDaysISODate, pad2, shortDateLabel, todayISODate } from '../../../lib/format';
import { scheduleLocalNotification } from '../../../lib/notifications';
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

export default function NewIncidentScreen() {
  const router = useRouter();
  const { state, dispatch } = useAppStore();

  const [siteId, setSiteId] = useState(state.sites[0]?.id ?? '');
  const [severity, setSeverity] = useState<Severity>('majeure');
  const [occurredDate, setOccurredDate] = useState(state.selectedDate || todayISODate());
  const [occurredTime, setOccurredTime] = useState(minutesToTime(timeToMinutes(new Date().toTimeString().slice(0, 5))));
  const [dueDate, setDueDate] = useState<string | null>(null);
  const [title, setTitle] = useState('Zone non nettoyée');
  const [description, setDescription] = useState('Décris le problème, la zone concernée, et l’action attendue.');
  const [assignedTo, setAssignedTo] = useState('Chef d’équipe');
  const [picker, setPicker] = useState<null | { kind: 'occurredDate' | 'occurredTime' | 'dueDate' }>(null);
  const [sitePickerOpen, setSitePickerOpen] = useState(false);

  const selectedSite = state.sites.find(s => s.id === siteId);

  const canCreate = useMemo(() => {
    const baseOk = siteId && title.trim().length >= 4 && description.trim().length >= 8;
    const occurredOk = occurredDate.trim().length === 10 && occurredTime.trim().length >= 4;
    return Boolean(baseOk && occurredOk);
  }, [siteId, title, description, occurredDate, occurredTime]);
  const hasDraftChanges = useMemo(
    () =>
      siteId !== (state.sites[0]?.id ?? '') ||
      severity !== 'majeure' ||
      occurredDate !== (state.selectedDate || todayISODate()) ||
      dueDate !== null ||
      title !== 'Zone non nettoyée' ||
      description !== 'Décris le problème, la zone concernée, et l’action attendue.' ||
      assignedTo !== 'Chef d’équipe',
    [assignedTo, description, dueDate, occurredDate, severity, siteId, state.selectedDate, state.sites, title]
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

  const pickerTitle = picker?.kind === 'occurredDate' ? 'Choisir une date' : picker?.kind === 'occurredTime' ? 'Choisir une heure' : 'Choisir une échéance';
  const pickerSubtitle = picker?.kind === 'occurredDate' ? occurredDate : picker?.kind === 'occurredTime' ? occurredTime : dueDate ?? 'Aucune';

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
    if (due && Platform.OS !== 'web') {
      const result = await scheduleLocalNotification({
        title: 'Echeance incident',
        body: 'Une non-conformite arrive a echeance aujourd hui.',
        triggerAt: timeToDate(due, '09:00'),
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
          <Button label="Créer l’incident" disabled={!canCreate} onPress={create} />
          <Button label="Annuler" variant="secondary" onPress={confirmClose} />
        </View>
      }
    >
      <AppBar title="Nouvel incident" subtitle="Créer une non-conformité" left={{ icon: 'chevron-left', label: 'Retour', onPress: confirmClose }} />

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

      <SectionHeader title="Constat" />
      <Card>
        {Platform.OS === 'web' ? (
          <View className="flex-row gap-3">
            <View className="flex-1">
              <FormField label="Date" hint="Format AAAA-MM-JJ">
                <TextField leftIcon="calendar" value={occurredDate} onChangeText={setOccurredDate} keyboardType="numbers-and-punctuation" autoCapitalize="none" autoCorrect={false} />
              </FormField>
            </View>
            <View className="flex-1">
              <FormField label="Heure" hint="Format HH:MM">
                <TextField leftIcon="chevron-right" value={occurredTime} onChangeText={setOccurredTime} keyboardType="numbers-and-punctuation" autoCapitalize="none" autoCorrect={false} />
              </FormField>
            </View>
          </View>
        ) : (
          <>
            <View className="flex-row gap-3">
              <View className="flex-1">
                <FormField label="Date" icon="calendar">
                  <PickerField value={shortDateLabel(occurredDate)} description={occurredDate} leftIcon="calendar" icon="chevron-right" onPress={() => openPicker('occurredDate')} />
                </FormField>
              </View>
              <View className="flex-1">
                <FormField label="Heure" icon="chevron-right">
                  <PickerField value={occurredTime} leftIcon="chevron-right" icon="chevron-right" onPress={() => openPicker('occurredTime')} />
                </FormField>
              </View>
            </View>
          </>
        )}
      </Card>

      {Platform.OS !== 'web' ? (
        <DisclosureSection title="Échéance (optionnel)" subtitle={dueDate ? shortDateLabel(dueDate) : 'Aucune'} icon="calendar" defaultOpen={false} className="mt-4">
          <FormField label="Échéance de correction" icon="calendar" hint="Rappels et suivi exploitation.">
            <PickerField
              value={dueDate ? shortDateLabel(dueDate) : 'Aucune'}
              description={dueDate ?? 'Suivi exploitation'}
              leftIcon="calendar"
              icon="chevron-right"
              onPress={() => openPicker('dueDate')}
            />

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
          </FormField>
        </DisclosureSection>
      ) : null}

      <SectionHeader title="Sévérité" />
      <Card>
        <SegmentedControl
          value={severity}
          onChange={setSeverity}
          items={[
            { label: 'Critique', value: 'critique', tone: 'danger' },
            { label: 'Majeure', value: 'majeure', tone: 'warning' },
            { label: 'Mineure', value: 'mineure', tone: 'neutral' }
          ]}
        />
      </Card>

      <SectionHeader title="Détails" />
      <Card>
        <FormField label="Titre" icon="pencil">
          <TextField leftIcon="pencil" accessibilityLabel="Titre de l’incident" value={title} onChangeText={setTitle} autoCapitalize="sentences" />
        </FormField>

        <FormField label="Description" icon="clipboard-check" className="mt-4">
          <TextField
            value={description}
            onChangeText={setDescription}
            accessibilityLabel="Description de l’incident"
            multiline
            inputClassName="text-[14px]"
          />
        </FormField>

        <FormField label="Assigné à" icon="user" className="mt-4">
          <TextField leftIcon="user" accessibilityLabel="Responsable assigné" value={assignedTo} onChangeText={setAssignedTo} autoCapitalize="words" autoCorrect={false} />
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
        mode={picker?.kind === 'occurredTime' ? 'time' : 'date'}
        value={
          picker?.kind === 'occurredDate'
            ? isoToDate(occurredDate)
            : picker?.kind === 'occurredTime'
              ? timeToDate(occurredDate, occurredTime)
              : isoToDate(dueDate ?? occurredDate)
        }
        onPicked={applyPicked}
        onClose={closePicker}
      />
    </Screen>
  );
}
