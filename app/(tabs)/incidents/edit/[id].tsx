import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Platform, Pressable, Text, View } from 'react-native';

import { AppBar } from '../../../../components/ui/AppBar';
import { Button } from '../../../../components/ui/Button';
import { Card } from '../../../../components/ui/Card';
import { DateTimePickerSheet } from '../../../../components/ui/DateTimePickerSheet';
import { DisclosureSection } from '../../../../components/ui/DisclosureSection';
import { FormField, PickerField, TextField } from '../../../../components/ui/FormControls';
import { Screen } from '../../../../components/ui/Screen';
import { SegmentedControl } from '../../../../components/ui/SegmentedControl';
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

const statuses: Array<{ label: string; value: IncidentStatus; tone: 'neutral' | 'brand' | 'success' }> = [
  { label: 'Ouvert', value: 'ouvert', tone: 'neutral' },
  { label: 'En cours', value: 'en_cours', tone: 'brand' },
  { label: 'Clos', value: 'clos', tone: 'success' }
];

export default function EditIncidentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { state, dispatch } = useAppStore();

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

  const pickerTitle = picker?.kind === 'occurredDate' ? 'Choisir une date' : picker?.kind === 'occurredTime' ? 'Choisir une heure' : 'Choisir une échéance';
  const pickerSubtitle = picker?.kind === 'occurredDate' ? occurredDate : picker?.kind === 'occurredTime' ? occurredTime : dueDate ?? 'Aucune';

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
    const hasProof = incident.photos.length > 0;
    const allowed =
      status === incident.status ||
      (incident.status === 'ouvert' && status === 'en_cours') ||
      (incident.status === 'en_cours' && (status === 'ouvert' || status === 'clos')) ||
      (incident.status === 'clos' && status === 'ouvert');
    if (!allowed) {
      Alert.alert('Statut invalide', 'Transition de statut non autorisée.');
      return;
    }
    if (status === 'clos' && !hasProof) {
      Alert.alert('Preuve requise', 'Ajoute au moins une photo avant de clôturer l’incident.');
      return;
    }
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
              <FormField label="Date" hint="Format AAAA-MM-JJ">
                <TextField value={occurredDate} onChangeText={setOccurredDate} keyboardType="numbers-and-punctuation" autoCapitalize="none" autoCorrect={false} />
              </FormField>
            </View>
            <View className="flex-1">
              <FormField label="Heure" hint="Format HH:MM">
                <TextField value={occurredTime} onChangeText={setOccurredTime} keyboardType="numbers-and-punctuation" autoCapitalize="none" autoCorrect={false} />
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

      <SectionHeader title="Statut" />
      <Card>
        <SegmentedControl value={status} onChange={setStatus} items={statuses.map(s => ({ label: s.label, value: s.value, tone: s.tone }))} />
      </Card>

      {Platform.OS !== 'web' ? (
        <DisclosureSection title="Échéance (optionnel)" subtitle={dueDate ? shortDateLabel(dueDate) : 'Aucune'} icon="calendar" defaultOpen={false} className="mt-4">
          <FormField label="Échéance" icon="calendar" hint="Suivi de correction.">
            <PickerField
              value={dueDate ? shortDateLabel(dueDate) : 'Aucune'}
              description={dueDate ?? 'Suivi exploitation'}
              leftIcon="calendar"
              icon="chevron-right"
              onPress={() => openPicker('dueDate')}
            />
            <Pressable onPress={() => setDueDate(null)} className="mt-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3 py-3 active:opacity-90">
              <Text className="text-center text-[12px] font-semibold text-slate-700 dark:text-slate-200">Retirer l’échéance</Text>
            </Pressable>
          </FormField>
        </DisclosureSection>
      ) : null}

      <SectionHeader title="Détails" />
      <Card>
        <FormField label="Titre" icon="pencil">
          <TextField leftIcon="pencil" value={title} onChangeText={setTitle} autoCapitalize="sentences" />
        </FormField>

        <FormField label="Description" icon="clipboard-check" className="mt-4">
          <TextField value={description} onChangeText={setDescription} multiline inputClassName="text-[14px]" />
        </FormField>

        <FormField label="Assigné à" icon="user" className="mt-4">
          <TextField leftIcon="user" value={assignedTo} onChangeText={setAssignedTo} autoCapitalize="words" autoCorrect={false} />
        </FormField>
      </Card>

      <View className="mt-6 gap-3">
        <Button label="Enregistrer" disabled={!canSave} onPress={save} />
        <Button label="Annuler" variant="secondary" onPress={confirmClose} />
      </View>

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
