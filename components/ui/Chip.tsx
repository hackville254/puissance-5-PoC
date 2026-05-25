import { Text, View } from 'react-native';

import { cn } from '../../lib/cn';

type Tone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger';

export function Chip({ label, tone = 'neutral', className }: { label: string; tone?: Tone; className?: string }) {
  const base = 'h-7 px-3 rounded-full items-center justify-center border';
  const byTone: Record<Tone, string> = {
    neutral: 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700',
    brand: 'bg-brand-50 dark:bg-brand-900 border-brand-200 dark:border-brand-700',
    success: 'bg-emerald-50 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-800',
    warning: 'bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800',
    danger: 'bg-rose-50 dark:bg-rose-950 border-rose-200 dark:border-rose-800'
  };
  const textByTone: Record<Tone, string> = {
    neutral: 'text-slate-700 dark:text-slate-200',
    brand: 'text-brand-700 dark:text-brand-200',
    success: 'text-emerald-700 dark:text-emerald-200',
    warning: 'text-amber-800 dark:text-amber-200',
    danger: 'text-rose-700 dark:text-rose-200'
  };
  return (
    <View className={cn(base, byTone[tone], className)}>
      <Text className={cn('text-[12px] font-medium', textByTone[tone])}>{label}</Text>
    </View>
  );
}
