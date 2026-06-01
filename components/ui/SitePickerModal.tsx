import { useMemo, useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { useColorScheme } from 'nativewind';

import type { Site } from '../../lib/models';
import { Card } from './Card';
import { Icon } from './Icon';
import { SearchField } from './FormControls';

export function SitePickerModal({
  visible,
  sites,
  selectedSiteId,
  title = 'Choisir un site',
  onClose,
  onSelect
}: {
  visible: boolean;
  sites: Site[];
  selectedSiteId: string;
  title?: string;
  onClose: () => void;
  onSelect: (siteId: string) => void;
}) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const overlay = isDark ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.35)';
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sites;
    return sites.filter(s => `${s.name} ${s.city} ${s.address}`.toLowerCase().includes(q));
  }, [query, sites]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: overlay, padding: 18, justifyContent: 'center' }}>
        <Pressable onPress={() => {}} style={{ width: '100%' }}>
          <Card className="border-slate-200 dark:border-slate-800">
            <View className="flex-row items-center justify-between">
              <View className="flex-1 min-w-0 pr-3">
                <Text className="text-[16px] font-extrabold text-slate-900 dark:text-white" numberOfLines={1}>
                  {title}
                </Text>
                <Text className="mt-1 text-[12px] text-slate-500 dark:text-slate-300">{sites.length} site{sites.length > 1 ? 's' : ''}</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Fermer"
                onPress={onClose}
                className="h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800"
              >
                <Icon name="x" size={18} color={isDark ? '#FFFFFF' : '#0F172A'} />
              </Pressable>
            </View>

            <View className="mt-4">
              <SearchField
                value={query}
                onChangeText={setQuery}
                accessibilityLabel="Recherche de site"
                placeholder="Rechercher un site"
                onClear={() => setQuery('')}
              />
            </View>

            <View className="mt-4 gap-2">
              {filtered.slice(0, 14).map(site => {
                const selected = site.id === selectedSiteId;
                return (
                  <Pressable
                    key={site.id}
                    accessibilityRole="button"
                    onPress={() => {
                      onSelect(site.id);
                      onClose();
                    }}
                    className={
                      selected
                        ? 'rounded-2xl border border-brand-600 bg-brand-600 px-4 py-3 active:opacity-90'
                        : 'rounded-2xl border border-slate-200 bg-white px-4 py-3 active:opacity-90 dark:border-slate-700 dark:bg-slate-900'
                    }
                  >
                    <View className="flex-row items-center justify-between gap-3">
                      <View className="flex-1 min-w-0">
                        <Text
                          numberOfLines={1}
                          className={selected ? 'text-[14px] font-semibold text-white' : 'text-[14px] font-semibold text-slate-900 dark:text-white'}
                        >
                          {site.name}
                        </Text>
                        <Text
                          numberOfLines={1}
                          className={selected ? 'mt-1 text-[12px] text-white/80' : 'mt-1 text-[12px] text-slate-500 dark:text-slate-300'}
                        >
                          {site.city} • {site.address}
                        </Text>
                      </View>
                      <Icon name={selected ? 'check' : 'chevron-right'} size={18} color={selected ? '#FFFFFF' : isDark ? '#FFFFFF' : '#0F172A'} />
                    </View>
                  </Pressable>
                );
              })}
              {filtered.length > 14 ? (
                <View className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800">
                  <Text className="text-[12px] font-semibold text-slate-600 dark:text-slate-200">
                    {filtered.length - 14} autre{filtered.length - 14 > 1 ? 's' : ''} résultat{filtered.length - 14 > 1 ? 's' : ''}…
                  </Text>
                </View>
              ) : null}
              {filtered.length === 0 ? (
                <View className="rounded-2xl border border-dashed border-slate-300 px-4 py-4 dark:border-slate-700">
                  <Text className="text-[13px] font-semibold text-slate-900 dark:text-white">Aucun site trouvé</Text>
                  <Text className="mt-1 text-[12px] text-slate-500 dark:text-slate-300">Modifie la recherche ou crée un site.</Text>
                </View>
              ) : null}
            </View>
          </Card>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
