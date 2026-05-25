import { Alert, Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { AppBar } from '../../components/ui/AppBar';
import { Card } from '../../components/ui/Card';
import { Chip } from '../../components/ui/Chip';
import { Icon } from '../../components/ui/Icon';
import { ListScreen } from '../../components/ui/ListScreen';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { canPerform } from '../../lib/models';
import { routes } from '../../lib/routes';
import { useAppStore } from '../../lib/store';

export default function TemplatesScreen() {
  const router = useRouter();
  const { state, dispatch } = useAppStore();

  return (
    <ListScreen
      data={state.templates}
      keyExtractor={item => item.id}
      ListHeaderComponent={
        <>
      <AppBar
        title="Listes de contrôle"
        subtitle="Modèles (gestion)"
        left={{ icon: 'chevron-left', label: 'Retour', onPress: () => router.back() }}
        right={
          canPerform(state.role, 'manage_templates')
            ? [{ icon: 'plus', label: 'Nouveau modèle', onPress: () => router.push(routes.newTemplate) }]
            : undefined
        }
      />

      <SectionHeader title="Liste" right={<Chip label={`${state.templates.length}`} tone="neutral" />} />
        </>
      }
      renderItem={({ item: tpl }) => (
        <View className="mb-3">
          <Card>
            <Pressable onPress={() => router.push(routes.templateDetail(tpl.id))} className="active:opacity-90">
              <View className="flex-row items-start justify-between">
                <View className="flex-1 pr-4">
                  <Text className="text-[15px] font-semibold text-slate-900 dark:text-white">{tpl.name}</Text>
                  <Text className="mt-1 text-[13px] text-slate-500 dark:text-slate-300">{tpl.items.length} critère{tpl.items.length > 1 ? 's' : ''}</Text>
                  <View className="mt-3 flex-row gap-2">
                    <Chip label={`Critiques: ${tpl.items.filter(i => i.critical).length}`} tone="warning" />
                    <Chip label={`OK: ${tpl.items.filter(i => !i.critical).length}`} tone="neutral" />
                  </View>
                </View>
                {canPerform(state.role, 'manage_templates') ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Supprimer"
                    onPress={() =>
                      Alert.alert('Supprimer', `Supprimer “${tpl.name}” ?`, [
                        { text: 'Annuler', style: 'cancel' },
                        { text: 'Supprimer', style: 'destructive', onPress: () => dispatch({ type: 'deleteTemplate', templateId: tpl.id }) }
                      ])
                    }
                    className="h-11 w-11 items-center justify-center rounded-2xl bg-rose-50 dark:bg-rose-950"
                  >
                    <Icon name="trash" size={18} color="#E11D48" />
                  </Pressable>
                ) : null}
              </View>
            </Pressable>
          </Card>
        </View>
      )}
    />
  );
}
