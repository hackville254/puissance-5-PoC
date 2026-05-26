import { useRef } from 'react';
import { Modal, Platform, Pressable, Text, View } from 'react-native';

export function CameraCaptureModal({
  visible,
  title,
  mode,
  overlay,
  onClose,
  onPhotoCaptured,
  onBarcodeScanned
}: {
  visible: boolean;
  title: string;
  mode: 'photo' | 'qr';
  overlay: string;
  onClose: () => void;
  onPhotoCaptured?: (uri: string) => Promise<void> | void;
  onBarcodeScanned?: (value: string) => void;
}) {
  const CameraView: any = Platform.OS === 'web' ? null : require('expo-camera').CameraView;
  const cameraPermissionsHook =
    Platform.OS === 'web'
      ? (() => [null, async () => null] as const)
      : (require('expo-camera').useCameraPermissions as () => readonly [any, () => Promise<any>]);
  const [cameraPermission, requestCameraPermission] = cameraPermissionsHook();
  const cameraRef = useRef<any>(null);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: overlay }}>
        <View style={{ flex: 1 }}>
          <View style={{ paddingTop: 12, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Pressable onPress={onClose} style={{ height: 42, paddingHorizontal: 14, borderRadius: 999, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center' }}>
              <Text style={{ color: '#FFFFFF', fontWeight: '800' }}>Fermer</Text>
            </Pressable>
            <Text style={{ color: '#FFFFFF', fontWeight: '900' }}>{title}</Text>
            <View style={{ width: 72 }} />
          </View>

          {Platform.OS === 'web' ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 }}>
              <Text style={{ color: '#FFFFFF', fontWeight: '700', textAlign: 'center' }}>Capture indisponible sur Web.</Text>
            </View>
          ) : !cameraPermission?.granted ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 18 }}>
              <Text style={{ color: '#FFFFFF', fontWeight: '700', textAlign: 'center' }}>
                Autorise la caméra pour prendre des preuves sur site.
              </Text>
              <Pressable
                onPress={() => requestCameraPermission()}
                style={{ marginTop: 16, height: 48, paddingHorizontal: 16, borderRadius: 16, backgroundColor: '#25D366', alignItems: 'center', justifyContent: 'center' }}
              >
                <Text style={{ color: '#0B141A', fontWeight: '900' }}>Autoriser la caméra</Text>
              </Pressable>
            </View>
          ) : (
            <CameraView
              ref={cameraRef}
              style={{ flex: 1, marginTop: 12, borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden' }}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              onBarcodeScanned={
                mode === 'qr'
                  ? (e: any) => {
                      if (!e?.data) return;
                      onClose();
                      onBarcodeScanned?.(String(e.data));
                    }
                  : undefined
              }
            >
              {mode === 'photo' ? (
                <View style={{ position: 'absolute', left: 0, right: 0, bottom: 18, alignItems: 'center' }}>
                  <Pressable
                    onPress={async () => {
                      const photo = await cameraRef.current?.takePictureAsync({ quality: 0.65, exif: false });
                      if (!photo?.uri) return;
                      await onPhotoCaptured?.(photo.uri);
                    }}
                    style={{
                      height: 64,
                      width: 64,
                      borderRadius: 999,
                      backgroundColor: '#FFFFFF',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <View style={{ height: 54, width: 54, borderRadius: 999, backgroundColor: '#25D366' }} />
                  </Pressable>
                  <Text style={{ marginTop: 10, color: 'rgba(255,255,255,0.85)', fontWeight: '700' }}>Appuyer pour capturer</Text>
                </View>
              ) : (
                <View style={{ position: 'absolute', left: 0, right: 0, bottom: 18, alignItems: 'center' }}>
                  <Text style={{ color: 'rgba(255,255,255,0.9)', fontWeight: '800' }}>Vise le QR du site</Text>
                </View>
              )}
            </CameraView>
          )}
        </View>
      </View>
    </Modal>
  );
}
