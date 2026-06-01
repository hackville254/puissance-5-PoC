import { Modal, Platform, Pressable, Text, View } from 'react-native';
import { useColorScheme } from 'nativewind';

export function DateTimePickerSheet({
  visible,
  title,
  subtitle,
  value,
  mode,
  onPicked,
  onClose
}: {
  visible: boolean;
  title: string;
  subtitle?: string;
  value: Date;
  mode: 'date' | 'time';
  onPicked: (dt: Date) => void;
  onClose: () => void;
}) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const overlay = isDark ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.35)';
  const sheetBg = isDark ? '#0B141A' : '#FFFFFF';
  const sheetBorder = isDark ? '#1F2C34' : '#E5E7EB';
  const sheetText = isDark ? '#FFFFFF' : '#111827';
  const sheetTextMuted = isDark ? 'rgba(255,255,255,0.7)' : '#6B7280';

  const DateTimePicker: any = Platform.OS === 'web' ? null : require('@react-native-community/datetimepicker').default;
  if (!visible || Platform.OS === 'web' || !DateTimePicker) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: overlay, justifyContent: 'flex-end' }}>
        <Pressable
          onPress={() => {}}
          style={{
            backgroundColor: sheetBg,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            borderTopWidth: 1,
            borderTopColor: sheetBorder,
            paddingHorizontal: 14,
            paddingTop: 12,
            paddingBottom: 18
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 6, paddingBottom: 10 }}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={{ fontSize: 14, fontWeight: '800', color: sheetText }} numberOfLines={1}>
                {title}
              </Text>
              {subtitle ? (
                <Text style={{ marginTop: 2, fontSize: 12, fontWeight: '600', color: sheetTextMuted }} numberOfLines={1}>
                  {subtitle}
                </Text>
              ) : null}
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Fermer"
              onPress={onClose}
              style={{
                height: 36,
                paddingHorizontal: 12,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 999,
                backgroundColor: isDark ? '#111B21' : '#F3F4F6'
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: '800', color: sheetText }}>OK</Text>
            </Pressable>
          </View>

          <DateTimePicker
            value={value}
            mode={mode}
            display={Platform.OS === 'ios' ? (mode === 'time' ? 'spinner' : 'inline') : 'default'}
            onChange={(event: any, selected?: Date) => {
              if (Platform.OS === 'android') {
                if (event?.type === 'dismissed') return onClose();
                if (event?.type === 'set' && selected) {
                  onPicked(selected);
                  return onClose();
                }
                return;
              }
              if (!selected) return;
              onPicked(selected);
            }}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}
