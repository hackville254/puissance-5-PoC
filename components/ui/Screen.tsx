import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { cn } from '../../lib/cn';

export function Screen({
  children,
  scroll = true,
  footer,
  className,
  contentClassName,
  footerClassName
}: {
  children: React.ReactNode;
  scroll?: boolean;
  footer?: React.ReactNode;
  className?: string;
  contentClassName?: string;
  footerClassName?: string;
}) {
  const insets = useSafeAreaInsets();
  const paddingHorizontal = 20;
  const paddingBottom = Math.max(24, insets.bottom) + (footer ? 24 : 96);

  if (!scroll) {
    return (
      <SafeAreaView className={cn('flex-1 bg-slate-50 dark:bg-slate-950', className)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <View className={cn('flex-1', contentClassName)} style={{ paddingHorizontal, paddingBottom }}>
            {children}
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className={cn('flex-1 bg-slate-50 dark:bg-slate-950', className)}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={{ flex: 1 }}>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingHorizontal, paddingBottom }}
            contentContainerClassName={cn(contentClassName)}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          >
            {children}
          </ScrollView>
          {footer ? (
            <View
              className={cn('border-t border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950', footerClassName)}
              style={{ paddingHorizontal, paddingTop: 12, paddingBottom: Math.max(12, insets.bottom) }}
            >
              {footer}
            </View>
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
