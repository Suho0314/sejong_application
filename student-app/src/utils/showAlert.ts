import { Alert, Platform } from 'react-native';

type WebGlobal = typeof globalThis & {
  alert?: (message?: string) => void;
};

export function showAlert(message: string, title?: string) {
  if (Platform.OS === 'web') {
    (globalThis as WebGlobal).alert?.(title ? `${title}\n\n${message}` : message);
    return;
  }

  if (title) {
    Alert.alert(title, message);
    return;
  }

  Alert.alert(message);
}
