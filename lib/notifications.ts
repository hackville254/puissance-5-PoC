import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';

let configured = false;

export type NotificationPermissionResult = 'granted' | 'denied' | 'unsupported';

export type NotificationScheduleResult = 'scheduled' | 'skipped' | 'denied' | 'unsupported';

type NotificationsModule = typeof import('expo-notifications');

function isExpoGo() {
  return Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
}

function getNotificationsModule(): NotificationsModule | null {
  if (Platform.OS === 'web' || isExpoGo()) return null;
  try {
    return require('expo-notifications') as NotificationsModule;
  } catch {
    return null;
  }
}

export async function configureNotifications() {
  if (configured) return false;
  const Notifications = getNotificationsModule();
  if (!Notifications) return false;
  try {
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
    return true;
  } catch {
    return false;
  }
}

export async function ensureNotificationPermission(): Promise<NotificationPermissionResult> {
  const Notifications = getNotificationsModule();
  if (!Notifications) return 'unsupported';
  try {
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return 'granted';
    const asked = await Notifications.requestPermissionsAsync();
    return asked.granted ? 'granted' : 'denied';
  } catch {
    return 'unsupported';
  }
}

export async function scheduleLocalNotification(input: {
  title: string;
  body: string;
  triggerAt: Date;
  sound?: boolean;
}): Promise<NotificationScheduleResult> {
  const Notifications = getNotificationsModule();
  if (!Notifications) return 'unsupported';

  const permission = await ensureNotificationPermission();
  if (permission !== 'granted') return permission === 'denied' ? 'denied' : 'unsupported';
  if (input.triggerAt.getTime() <= Date.now() + 10_000) return 'skipped';

  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: input.title,
        body: input.body,
        sound: input.sound ?? true
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: input.triggerAt
      }
    });
    return 'scheduled';
  } catch {
    return 'unsupported';
  }
}
