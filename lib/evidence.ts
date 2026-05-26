import { Platform } from 'react-native';

export async function ensureDeviceSecret() {
  if (Platform.OS === 'web') return null;
  const SecureStore: any = require('expo-secure-store');
  const Crypto: any = require('expo-crypto');
  const key = 'p5_device_secret_v1';
  const existing = await SecureStore.getItemAsync(key);
  if (existing) return existing;
  const bytes = await Crypto.getRandomBytesAsync(32);
  const secret = Array.from(bytes as number[])
    .map(b => Number(b).toString(16).padStart(2, '0'))
    .join('');
  await SecureStore.setItemAsync(key, secret);
  return secret;
}

export async function createSignedEvidence(fileUri: string, payloadParts: Array<string | number | undefined>) {
  if (Platform.OS === 'web') return { fileHash: undefined, signature: undefined, certified: false };
  const Crypto: any = require('expo-crypto');
  const FileSystemLegacy: any = require('expo-file-system/legacy');
  const secret = await ensureDeviceSecret();
  if (!secret) return { fileHash: undefined, signature: undefined, certified: false };

  const info = await FileSystemLegacy.getInfoAsync(fileUri, { md5: true });
  const fileHash = info?.md5
    ? await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, info.md5)
    : await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${fileUri}|${String(payloadParts[0] ?? '')}`);
  const payload = [secret, fileHash, ...payloadParts.map(part => String(part ?? ''))].join('|');
  const signature = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, payload);
  return { fileHash, signature, certified: Boolean(signature) };
}

export async function readFieldEvidenceContext() {
  if (Platform.OS === 'web') {
    return {
      lat: undefined,
      lng: undefined,
      networkVerified: false,
      networkType: undefined
    };
  }

  const Location: any = require('expo-location');
  const Network: any = require('expo-network');

  let lat: number | undefined;
  let lng: number | undefined;
  try {
    const locPerm = await Location.requestForegroundPermissionsAsync();
    if (locPerm.status === 'granted') {
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      lat = pos?.coords?.latitude;
      lng = pos?.coords?.longitude;
    }
  } catch {}

  let networkVerified = false;
  let networkType: string | undefined;
  try {
    const net = await Network.getNetworkStateAsync();
    networkVerified = Boolean(net?.isConnected);
    networkType = net?.type ? String(net.type) : undefined;
  } catch {}

  return { lat, lng, networkVerified, networkType };
}
