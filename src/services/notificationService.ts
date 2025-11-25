import {PermissionsAndroid, Platform} from 'react-native';
import PushNotification from 'react-native-push-notification';
import {Task} from '../types';

const CHANNEL_ID = 'garden-tasks';
const CHANNEL_NAME = 'Garden Tasks';
const FIVE_MINUTES = 5 * 60 * 1000;
const ONE_MINUTE = 60 * 1000;

let initialized = false;

export function initializeNotifications() {
  if (initialized) {
    return;
  }

  if (!PushNotification || typeof PushNotification.configure !== 'function') {
    console.warn('PushNotification native module unavailable');
    return;
  }

  PushNotification.configure({
    onNotification: () => {},
    popInitialNotification: true,
    requestPermissions: Platform.OS === 'ios' || Platform.Version >= 33,
  });

  if (Platform.OS === 'android' && Platform.Version >= 33) {
    PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS).catch(
      () => {},
    );
  }

  PushNotification.createChannel(
    {
      channelId: CHANNEL_ID,
      channelName: CHANNEL_NAME,
      channelDescription: 'Reminders for garden tasks and events',
      importance: 4,
      vibrate: true,
    },
    () => {},
  );

  initialized = true;
}

export function syncTaskNotifications(tasks: Task[]) {
  if (!initialized) {
    return;
  }

  PushNotification.cancelAllLocalNotifications();
  const now = Date.now();

  tasks.forEach(task => {
    const due = parseTaskDateTime(task);
    if (!due) {
      return;
    }

    scheduleIfFuture({
      triggerAt: new Date(due.getTime() - FIVE_MINUTES),
      title: 'Task starting soon',
      message: `${task.text} in 5 minutes`,
      id: `${task.id}-5`,
      now,
    });

    scheduleIfFuture({
      triggerAt: new Date(due.getTime() - ONE_MINUTE),
      title: 'Task about to start',
      message: `${task.text} in 1 minute`,
      id: `${task.id}-1`,
      now,
    });
  });
}

function scheduleIfFuture({
  triggerAt,
  title,
  message,
  id,
  now,
}: {
  triggerAt: Date;
  title: string;
  message: string;
  id: string;
  now: number;
}) {
  if (triggerAt.getTime() <= now) {
    return;
  }

  PushNotification.localNotificationSchedule({
    id,
    channelId: CHANNEL_ID,
    title,
    message,
    date: triggerAt,
    allowWhileIdle: true,
    playSound: true,
    importance: 'high',
  });
}

function parseTaskDateTime(task: Task): Date | null {
  if (!task.date || !task.time) {
    return null;
  }
  const [y, m, d] = task.date.split('-').map(Number);
  const [h, min] = task.time.split(':').map(Number);
  const dt = new Date(y, (m ?? 1) - 1, d ?? 1, h ?? 0, min ?? 0, 0, 0);
  return isNaN(dt.getTime()) ? null : dt;
}
