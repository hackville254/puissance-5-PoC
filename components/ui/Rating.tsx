import { Pressable, View } from 'react-native';

import { cn } from '../../lib/cn';
import { Icon } from './Icon';

export function Rating({
  value,
  onChange,
  size = 20,
  className
}: {
  value: number;
  onChange: (next: number) => void;
  size?: number;
  className?: string;
}) {
  return (
    <View className={cn('flex-row items-center', className)}>
      {[1, 2, 3, 4, 5].map(n => {
        const filled = n <= value;
        return (
          <Pressable key={n} onPress={() => onChange(n)} className="h-10 w-10 items-center justify-center active:opacity-80">
            <Icon
              name="star"
              size={size}
              color={filled ? '#F59E0B' : '#94A3B8'}
              fill={filled ? '#F59E0B' : 'transparent'}
              strokeWidth={2.2}
            />
          </Pressable>
        );
      })}
    </View>
  );
}
