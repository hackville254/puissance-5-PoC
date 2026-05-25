import { useState } from 'react';
import { ActivityIndicator, Platform, Pressable, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';

import { cn } from '../../lib/cn';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'glass';

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled,
  loading,
  left,
  className,
  textClassName
}: {
  label: string;
  onPress?: () => void | Promise<void>;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  left?: React.ReactNode;
  className?: string;
  textClassName?: string;
}) {
  const [inFlight, setInFlight] = useState(false);
  const base =
    'h-12 flex-row items-center justify-center rounded-2xl px-4 active:opacity-90';
  const byVariant: Record<Variant, string> = {
    primary: 'bg-brand-600',
    secondary: 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700',
    danger: 'bg-rose-600',
    ghost: 'bg-transparent',
    glass: 'bg-white/15 border border-white/20'
  };
  const textByVariant: Record<Variant, string> = {
    primary: 'text-white',
    secondary: 'text-slate-900 dark:text-white',
    danger: 'text-white',
    ghost: 'text-brand-700 dark:text-brand-300',
    glass: 'text-white'
  };

  const isDisabled = Boolean(disabled || loading || inFlight);
  const spinnerColor = variant === 'secondary' ? '#0F172A' : '#FFFFFF';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: isDisabled, busy: loading || inFlight }}
      disabled={isDisabled}
      onPress={async () => {
        if (!onPress) return;
        if (isDisabled) return;
        if (Platform.OS !== 'web') {
          try {
            if (variant === 'danger') await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            else await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          } catch {}
        }
        setInFlight(true);
        try {
          await Promise.resolve(onPress());
        } finally {
          setInFlight(false);
        }
      }}
      style={({ pressed }) => ({ transform: pressed && !isDisabled ? [{ scale: 0.985 }] : undefined })}
      className={cn(base, byVariant[variant], isDisabled && 'opacity-50', className)}
    >
      {left ? <View className="mr-2">{left}</View> : null}
      {loading || inFlight ? <ActivityIndicator size="small" color={spinnerColor} /> : null}
      <Text className={cn('text-[15px] font-semibold', (loading || inFlight) && 'ml-2', textByVariant[variant], textClassName)}>{label}</Text>
    </Pressable>
  );
}
