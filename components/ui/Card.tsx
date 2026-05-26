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
  const base = 'rounded-2xl bg-white dark:bg-slate-900 p-4 shadow-sm border border-slate-100 dark:border-slate-800';

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
