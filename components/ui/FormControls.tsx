import { Pressable, Text, TextInput, View } from 'react-native';
import type { TextInputProps } from 'react-native';
import { useColorScheme } from 'nativewind';

import { cn } from '../../lib/cn';
import { Chip } from './Chip';
import { Icon, type IconName } from './Icon';

export function FormField({
  label,
  hint,
  children,
  className
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <View className={cn(className)}>
      <Text className="text-[12px] font-semibold text-slate-600 dark:text-slate-300">{label}</Text>
      {hint ? <Text className="mt-1 text-[12px] leading-5 text-slate-500 dark:text-slate-400">{hint}</Text> : null}
      {children}
    </View>
  );
}

export function TextField({
  right,
  multiline,
  containerClassName,
  inputClassName,
  ...props
}: TextInputProps & {
  right?: React.ReactNode;
  containerClassName?: string;
  inputClassName?: string;
}) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <View
      className={cn(
        'mt-2 flex-row items-center rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-950',
        multiline && 'items-start',
        containerClassName
      )}
    >
      <TextInput
        {...props}
        multiline={multiline}
        placeholderTextColor={props.placeholderTextColor ?? (isDark ? 'rgba(255,255,255,0.45)' : '#94A3B8')}
        className={cn(
          'flex-1 text-[15px] text-slate-900 dark:text-white',
          multiline && 'min-h-[96px] py-0',
          inputClassName
        )}
      />
      {right}
    </View>
  );
}

export function SearchField({
  value,
  onChangeText,
  placeholder,
  accessibilityLabel,
  onClear,
  icon = 'building'
}: {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  accessibilityLabel: string;
  onClear?: () => void;
  icon?: IconName;
}) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <View className="mt-2 flex-row items-center rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800">
      <Icon name={icon} size={18} color={isDark ? 'rgba(255,255,255,0.8)' : '#64748B'} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        accessibilityLabel={accessibilityLabel}
        autoCorrect={false}
        autoCapitalize="none"
        placeholder={placeholder}
        placeholderTextColor={isDark ? 'rgba(255,255,255,0.45)' : '#94A3B8'}
        className="ml-3 flex-1 text-[14px] text-slate-900 dark:text-white"
      />
      {value.trim().length > 0 && onClear ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Effacer la recherche"
          onPress={onClear}
          className="h-9 w-9 items-center justify-center rounded-full bg-white/70 dark:bg-white/10"
        >
          <Icon name="x" size={16} color={isDark ? '#FFFFFF' : '#0F172A'} />
        </Pressable>
      ) : null}
    </View>
  );
}

export function ChoiceCard({
  title,
  description,
  selected,
  onPress,
  badge,
  icon,
  className
}: {
  title: string;
  description?: string;
  selected: boolean;
  onPress: () => void;
  badge?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className={cn(
        'rounded-2xl border px-4 py-3 active:opacity-90',
        selected ? 'border-brand-600 bg-brand-600' : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900',
        className
      )}
    >
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1">
          <View className="flex-row items-center gap-2">
            {icon}
            <Text className={selected ? 'text-[13px] font-semibold text-white' : 'text-[13px] font-semibold text-slate-900 dark:text-white'}>
              {title}
            </Text>
          </View>
          {description ? (
            <Text className={selected ? 'mt-1 text-[12px] leading-5 text-white/80' : 'mt-1 text-[12px] leading-5 text-slate-500 dark:text-slate-300'}>
              {description}
            </Text>
          ) : null}
        </View>
        {badge}
      </View>
    </Pressable>
  );
}

export function PickerField({
  value,
  description,
  icon,
  onPress
}: {
  value: string;
  description?: string;
  icon: IconName;
  onPress: () => void;
}) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className="mt-2 flex-row items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 dark:border-slate-700 dark:bg-slate-800"
    >
      <View className="flex-1 pr-3">
        <Text className="text-[15px] font-semibold text-slate-900 dark:text-white">{value}</Text>
        {description ? <Text className="mt-1 text-[12px] text-slate-500 dark:text-slate-300">{description}</Text> : null}
      </View>
      <Icon name={icon} size={20} color={isDark ? '#FFFFFF' : '#111827'} />
    </Pressable>
  );
}

export function ChoiceBadge({ label, tone = 'neutral' }: { label: string; tone?: 'neutral' | 'brand' | 'success' | 'warning' | 'danger' }) {
  return <Chip label={label} tone={tone} className="self-start" />;
}
