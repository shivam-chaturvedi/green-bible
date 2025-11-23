import {Alert, Linking, Platform} from 'react-native';
import {
  PERMISSIONS,
  Permission,
  RESULTS,
  openSettings,
  request,
} from 'react-native-permissions';

type PermissionMessage = {
  title: string;
  message: string;
};

const defaultMessages = {
  location: {
    title: 'Location needed',
    message:
      'GreenGarden uses your location to personalise weather-based tips and reminders.',
  },
  camera: {
    title: 'Camera needed',
    message:
      'GreenGarden needs camera access to capture plant photos for diagnosis.',
  },
  photos: {
    title: 'Photos needed',
    message:
      'GreenGarden needs access to your photo library to select plant images for analysis.',
  },
};

async function requestPermission(
  permission: Permission | undefined,
  dialog: PermissionMessage,
): Promise<boolean> {
  if (!permission) {
    return true;
  }

  try {
    const result = await request(permission);
    if (result === RESULTS.GRANTED || result === RESULTS.LIMITED) {
      return true;
    }
    if (result === RESULTS.BLOCKED) {
      Alert.alert(dialog.title, dialog.message, [
        {text: 'Cancel', style: 'cancel'},
        {text: 'Open Settings', onPress: () => openSettings()},
      ]);
    }
  } catch (error) {
    console.warn('Permission request failed', error);
  }
  return false;
}

export async function ensureLocationPermission(
  customMessage?: PermissionMessage,
): Promise<boolean> {
  const message = customMessage ?? defaultMessages.location;
  const permission = Platform.select<Permission | undefined>({
    ios: PERMISSIONS.IOS.LOCATION_WHEN_IN_USE,
    android: PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION,
    default: undefined,
  });

  if (!permission) {
    return true;
  }

  try {
    const result = await request(permission);
    if (result === RESULTS.GRANTED || result === RESULTS.LIMITED) {
      return true;
    }
    if (result === RESULTS.BLOCKED) {
      const openLocationPanel = () => {
        if (Platform.OS === 'android' && typeof Linking.sendIntent === 'function') {
          Linking.sendIntent('android.settings.LOCATION_SOURCE_SETTINGS').catch(() =>
            openSettings(),
          );
        } else {
          openSettings();
        }
      };

      Alert.alert(message.title, message.message, [
        {text: 'Cancel', style: 'cancel'},
        {text: 'Open location settings', onPress: openLocationPanel},
      ]);
    }
  } catch (error) {
    console.warn('Permission request failed', error);
  }
  return false;
}

export async function ensureCameraPermission(
  customMessage?: PermissionMessage,
): Promise<boolean> {
  const message = customMessage ?? defaultMessages.camera;
  const permission = Platform.select<Permission | undefined>({
    ios: PERMISSIONS.IOS.CAMERA,
    android: PERMISSIONS.ANDROID.CAMERA,
    default: undefined,
  });
  return requestPermission(permission, message);
}

export async function ensurePhotoPermission(
  customMessage?: PermissionMessage,
): Promise<boolean> {
  const message = customMessage ?? defaultMessages.photos;
  const androidPermission =
    Platform.OS === 'android'
      ? Platform.Version >= 33
        ? PERMISSIONS.ANDROID.READ_MEDIA_IMAGES
        : PERMISSIONS.ANDROID.READ_EXTERNAL_STORAGE
      : undefined;
  const permission = Platform.select<Permission | undefined>({
    ios: PERMISSIONS.IOS.PHOTO_LIBRARY,
    android: androidPermission,
    default: undefined,
  });
  return requestPermission(permission, message);
}
