import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useColorScheme } from 'nativewind';

import { cn } from '../../lib/cn';
import type { IconName } from './Icon';
import { Icon } from './Icon';
import { Card } from './Card';

export function DisclosureSection({
  title,
  subtitle,
  icon,
  defaultOpen = false,
  children,
  className
}: {
  title: string;
  subtitle?: string;
  icon: IconName;
  defaultOpen?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [open, setOpen] = useState(defaultOpen);

  return (
    <View className={cn(className)}>
      <Pressable
        accessibilityRole="button"
        onPress={() => setOpen(v => !v)}
        className="flex-row items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-4 active:opacity-90 dark:border-slate-700 dark:bg-slate-900"
      >
        <View className="flex-row items-center flex-1 min-w-0 pr-3">
          <Icon name={icon} size={18} color={isDark ? '#FFFFFF' : '#0F172A'} />
          <View className="ml-3 flex-1 min-w-0">
            <Text numberOfLines={1} className="text-[14px] font-semibold text-slate-900 dark:text-white">
              {title}
            </Text>
            {subtitle ? (
              <Text numberOfLines={1} className="mt-0.5 text-[12px] text-slate-500 dark:text-slate-300">
                {subtitle}
              </Text>
            ) : null}
          </View>
        </View>
        <Icon name={open ? 'chevron-up' : 'chevron-down'} size={18} color={isDark ? '#FFFFFF' : '#0F172A'} />
      </Pressable>
      {open ? <Card className="mt-3">{children}</Card> : null}
    </View>
  );
}
