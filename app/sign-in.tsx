import { useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from 'react-native';

import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Chip } from '../components/ui/Chip';
import { Screen } from '../components/ui/Screen';
import type { Role } from '../lib/models';
import { useAppStore } from '../lib/store';

const roles: Array<{ role: Role; title: string; caption: string }> = [
  { role: 'agent', title: 'Agent', caption: 'Exécution, checklists, photos' },
  { role: 'controller', title: 'Contrôleur', caption: 'Audits, notes, conformité' },
  { role: 'ops', title: 'Exploitation', caption: 'KPI, incidents, pilotage' },
  { role: 'client', title: 'Client', caption: 'Rapports, historique, validation' }
];

export default function SignInScreen() {
  const { dispatch } = useAppStore();
  const [userName, setUserName] = useState('');
  const [role, setRole] = useState<Role>('controller');

  const canSubmit = useMemo(() => userName.trim().length >= 2, [userName]);

  return (
    <Screen scroll={false}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
        <View className="flex-1 justify-center">
          <View className="mb-6 flex-row items-center justify-between">
            <Chip label="Accès rapide" tone="brand" className="self-start" />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Aide"
              onPress={() => Alert.alert('Aide', 'Choisis un rôle puis saisis ton nom pour accéder à l’espace correspondant.')}
              className="rounded-full border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900"
            >
              <Text className="text-[13px] font-semibold text-slate-700 dark:text-slate-200">Aide</Text>
            </Pressable>
          </View>

          <View className="mb-6">
            <Text className="text-[30px] font-extrabold text-slate-950 dark:text-white">Puissance 5</Text>
            <Text className="mt-2 text-[14px] text-slate-600 dark:text-slate-300">
              Contrôle qualité terrain, incidents et rapports pour vos équipes.
            </Text>
          </View>

          <Card>
            <Text className="text-[16px] font-semibold text-slate-900 dark:text-white">Connexion</Text>
            <Text className="mt-1 text-[13px] text-slate-600 dark:text-slate-300">Choisis un rôle et renseigne ton nom.</Text>

            <Text className="mt-5 text-[12px] font-semibold text-slate-700 dark:text-slate-200">Nom</Text>
            <View className="mt-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-950">
              <TextInput
                value={userName}
                onChangeText={setUserName}
                placeholder="Ex: Camille"
                placeholderTextColor="#94A3B8"
                className="text-[15px] text-slate-900 dark:text-white"
                autoCapitalize="words"
                autoCorrect={false}
              />
            </View>

            <Text className="mt-5 text-[12px] font-semibold text-slate-700 dark:text-slate-200">Rôle</Text>
            <View className="mt-2 flex-row flex-wrap gap-2">
              {roles.map(r => {
                const selected = r.role === role;
                return (
                  <Pressable
                    key={r.role}
                    onPress={() => setRole(r.role)}
                    className={
                      selected
                        ? 'rounded-2xl bg-brand-600 px-3 py-2'
                        : 'rounded-2xl bg-slate-100 px-3 py-2 dark:bg-slate-800'
                    }
                  >
                    <Text className={selected ? 'text-[13px] font-semibold text-white' : 'text-[13px] font-semibold text-slate-800 dark:text-slate-100'}>
                      {r.title}
                    </Text>
                    <Text className={selected ? 'mt-0.5 text-[11px] text-white/80' : 'mt-0.5 text-[11px] text-slate-500 dark:text-slate-300'}>{r.caption}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Button
              label="Entrer dans l’application"
              disabled={!canSubmit}
              onPress={() => dispatch({ type: 'signIn', userName, role })}
              className="mt-6"
            />
          </Card>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
