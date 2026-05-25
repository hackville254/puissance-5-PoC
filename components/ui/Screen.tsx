import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { cn } from '../../lib/cn';

export function Screen({
  children,
  scroll = true,
  className,
  contentClassName
}: {
  children: React.ReactNode;
  scroll?: boolean;
  className?: string;
  contentClassName?: string;
}) {
  if (!scroll) {
    return (
      <SafeAreaView className={cn('flex-1 bg-slate-50 dark:bg-slate-950', className)}>
        <View className={cn('flex-1 px-5', contentClassName)}>{children}</View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className={cn('flex-1 bg-slate-50 dark:bg-slate-950', className)}>
      <ScrollView contentContainerClassName={cn('px-5 pb-10', contentClassName)} showsVerticalScrollIndicator={false}>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}
