import type { ComponentProps } from 'react';
import { FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { cn } from '../../lib/cn';

export function ListScreen<ItemT>({
  className,
  contentClassName,
  ...props
}: ComponentProps<typeof FlatList<ItemT>> & {
  className?: string;
  contentClassName?: string;
}) {
  return (
    <SafeAreaView className={cn('flex-1 bg-slate-50 dark:bg-slate-950', className)}>
      <FlatList
        {...props}
        contentContainerClassName={cn('px-5 pb-10', contentClassName)}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}
