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
    <Screen scroll={false} className="bg-slate-950" contentClassName="px-0">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
        <View className="flex-1">
          <View className="flex-1 bg-brand-950">
            <View className="px-6 pt-12">
              <View className="flex-row items-center justify-between">
                <Chip label="Mode démo • hors‑ligne" tone="brand" className="self-start bg-white/10 border-white/15" />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Aide"
                  onPress={() =>
                    Alert.alert(
                      'Aide',
                      'Choisis un rôle (les accès changent selon le rôle) puis saisis un nom. Ce PoC ne demande pas de mot de passe et fonctionne hors‑ligne avec un cache local.'
                    )
                  }
                  className="rounded-full bg-white/10 border border-white/15 px-3 py-2"
                >
                  <Text className="text-[13px] font-semibold text-white/90">Aide</Text>
                </Pressable>
              </View>
              <Text className="mt-5 text-[30px] font-extrabold text-white">Puissance 5</Text>
              <Text className="mt-2 text-[14px] text-white/70">
                Contrôle qualité terrain, incidents, rapports — données de démonstration + cache local.
              </Text>
            </View>

            <View className="flex-1 justify-end px-5 pb-8">
              <Card className="bg-white/95 border-white/20">
                <Text className="text-[16px] font-semibold text-slate-900">Connexion</Text>
                <Text className="mt-1 text-[13px] text-slate-600">Choisis un rôle et un nom (pas de mot de passe dans ce PoC).</Text>

                <Text className="mt-5 text-[12px] font-semibold text-slate-700">Nom</Text>
                <View className="mt-2 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                  <TextInput
                    value={userName}
                    onChangeText={setUserName}
                    placeholder="Ex: Camille"
                    placeholderTextColor="#94A3B8"
                    className="text-[15px] text-slate-900"
                    autoCapitalize="words"
                    autoCorrect={false}
                  />
                </View>

                <Text className="mt-5 text-[12px] font-semibold text-slate-700">Rôle</Text>
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
                            : 'rounded-2xl bg-slate-100 px-3 py-2'
                        }
                      >
                        <Text className={selected ? 'text-[13px] font-semibold text-white' : 'text-[13px] font-semibold text-slate-800'}>
                          {r.title}
                        </Text>
                        <Text className={selected ? 'mt-0.5 text-[11px] text-white/80' : 'mt-0.5 text-[11px] text-slate-500'}>{r.caption}</Text>
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
          </View>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
