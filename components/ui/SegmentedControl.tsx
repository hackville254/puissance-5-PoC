import { Pressable, Text, View } from 'react-native';
import { useColorScheme } from 'nativewind';

import { cn } from '../../lib/cn';
import type { IconName } from './Icon';
import { Icon } from './Icon';

type Tone = 'brand' | 'neutral' | 'danger' | 'warning' | 'success';

function toneBg(tone: Tone) {
  if (tone === 'danger') return 'bg-rose-600';
  if (tone === 'warning') return 'bg-amber-600';
  if (tone === 'success') return 'bg-emerald-600';
  if (tone === 'neutral') return 'bg-slate-900 dark:bg-white';
  return 'bg-brand-600';
}

function toneText(tone: Tone) {
  if (tone === 'neutral') return 'text-white dark:text-slate-900';
  return 'text-white';
}

export function SegmentedControl<T extends string>({
  value,
  onChange,
  items,
  className
}: {
  value: T;
  onChange: (next: T) => void;
  items: Array<{ label: string; value: T; icon?: IconName; tone?: Tone }>;
  className?: string;
}) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <View className={cn('flex-row rounded-2xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-900', className)}>
      {items.map(it => {
        const selected = it.value === value;
        const activeTone = it.tone ?? 'brand';
        const selectedIconColor = activeTone === 'neutral' && isDark ? '#0F172A' : '#FFFFFF';
        return (
          <Pressable
            key={it.value}
            accessibilityRole="button"
            onPress={() => onChange(it.value)}
            className={cn(
              'flex-1 flex-row items-center justify-center rounded-xl px-3 py-2.5 active:opacity-90',
              selected ? toneBg(activeTone) : 'bg-transparent'
            )}
          >
            {it.icon ? <Icon name={it.icon} size={16} color={selected ? selectedIconColor : isDark ? 'rgba(255,255,255,0.85)' : '#0F172A'} /> : null}
            <Text
              numberOfLines={1}
              ellipsizeMode="tail"
              className={cn(
                'text-[13px] font-extrabold',
                selected ? toneText(activeTone) : 'text-slate-700 dark:text-slate-200',
                it.icon && 'ml-2'
              )}
            >
              {it.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
