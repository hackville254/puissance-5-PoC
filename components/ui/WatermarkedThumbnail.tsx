import { Image, Text, View } from 'react-native';
import { useColorScheme } from 'nativewind';

export function WatermarkedThumbnail({
  uri,
  capturedAt,
  size = 52,
  radius = 14
}: {
  uri: string;
  capturedAt: string;
  size?: number;
  radius?: number;
}) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const stamp = capturedAt ? capturedAt.slice(0, 16).replace('T', ' ') : '';

  return (
    <View style={{ width: size, height: size, borderRadius: radius, overflow: 'hidden', backgroundColor: isDark ? '#111827' : '#E2E8F0' }}>
      <Image source={{ uri }} style={{ width: size, height: size }} />
      <View style={{ position: 'absolute', left: 6, top: 6, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 999, backgroundColor: 'rgba(0,0,0,0.45)' }}>
        <Text style={{ color: '#FFFFFF', fontSize: 9, fontWeight: '800' }} numberOfLines={1}>
          {stamp}
        </Text>
      </View>
      <View style={{ position: 'absolute', right: 6, bottom: 6, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 999, backgroundColor: 'rgba(0,0,0,0.45)' }}>
        <Text style={{ color: '#FFFFFF', fontSize: 9, fontWeight: '900' }} numberOfLines={1}>
          Puissance 5
        </Text>
      </View>
    </View>
  );
}
