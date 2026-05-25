import { Text, View } from 'react-native';

export function SectionHeader({ title, right }: { title: string; right?: React.ReactNode }) {
  return (
    <View className="mt-8 mb-3 flex-row items-center justify-between">
      <Text className="text-[16px] font-semibold text-slate-900 dark:text-white">{title}</Text>
      {right}
    </View>
  );
}
