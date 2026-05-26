import { Platform, Pressable, View } from 'react-native';
import * as Haptics from 'expo-haptics';

import { cn } from '../../lib/cn';

export function Card({
  children,
  className,
  onPress
}: {
  children: React.ReactNode;
  className?: string;
  onPress?: () => void | Promise<void>;
}) {
  const hasLightBgOverride = /\bbg-[^\s]+/.test(className ?? '');
  const hasDarkBgOverride = /\bdark:bg-[^\s]+/.test(className ?? '');
  const hasLightBorderOverride = /\bborder-[a-z]/.test(className ?? '');
  const hasDarkBorderOverride = /\bdark:border-[a-z]/.test(className ?? '');
  const base = cn(
    'rounded-2xl p-4 shadow-sm border',
    !hasLightBgOverride && 'bg-white',
    !hasDarkBgOverride && 'dark:bg-slate-900',
    !hasLightBorderOverride && 'border-slate-100',
    !hasDarkBorderOverride && 'dark:border-slate-800'
  );

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={async () => {
          if (Platform.OS !== 'web') {
            try {
              await Haptics.selectionAsync();
            } catch {}
          }
          await onPress();
        }}
        style={({ pressed }) => ({ transform: pressed ? [{ scale: 0.992 }] : undefined })}
        className={cn(base, 'active:opacity-90', className)}
      >
        {children}
      </Pressable>
    );
  }
  return <View className={cn(base, className)}>{children}</View>;
}
