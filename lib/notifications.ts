import { Platform } from 'react-native';

let configured = false;

export async function configureNotifications() {
  if (configured || Platform.OS === 'web') return;
  try {
    const Notifications = require('expo-notifications') as typeof import('expo-notifications');
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldPlaySound: false,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true
      })
    });
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Par defaut',
        importance: Notifications.AndroidImportance.DEFAULT
      });
    }
    configured = true;
  } catch {}
}

export async function ensureNotificationPermission() {
  if (Platform.OS === 'web') return false;
  try {
    const Notifications = require('expo-notifications') as typeof import('expo-notifications');
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    const asked = await Notifications.requestPermissionsAsync();
    return Boolean(asked.granted);
  } catch {
    return false;
  }
}
