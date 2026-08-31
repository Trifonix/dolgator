import * as FileSystem from 'expo-file-system/legacy';
import { File } from 'expo-file-system';
import { Platform, PermissionsAndroid } from 'react-native';
import { AppState } from '../types';

export const DEV_TRANSFER_FILENAME = 'dolgator-import.json';
const SAF_FILE_NAME = 'dolgator-import';

const { StorageAccessFramework } = FileSystem;

const IMPORT_PATHS = [
  `file:///storage/emulated/0/Download/${DEV_TRANSFER_FILENAME}`,
  `file:///sdcard/Download/${DEV_TRANSFER_FILENAME}`,
  `file:///storage/emulated/0/Documents/${DEV_TRANSFER_FILENAME}`,
  `file:///sdcard/Documents/${DEV_TRANSFER_FILENAME}`,
];

function parseAppState(raw: string): AppState | null {
  try {
    const parsed = JSON.parse(raw) as AppState;
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed;
  } catch {
    return null;
  }
}

async function requestAndroidReadPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  try {
    if (Platform.Version >= 33) {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES,
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  } catch {
    return false;
  }
}

async function requestAndroidWritePermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  if (Platform.Version >= 33) return false;
  try {
    const result = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
      PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
    ]);
    return (
      result[PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE] ===
        PermissionsAndroid.RESULTS.GRANTED &&
      result[PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE] ===
        PermissionsAndroid.RESULTS.GRANTED
    );
  } catch {
    return false;
  }
}

async function writeToPublicDownload(json: string): Promise<string | null> {
  for (const uri of IMPORT_PATHS.slice(0, 2)) {
    try {
      await FileSystem.writeAsStringAsync(uri, json);
      return uri;
    } catch {
      // next path
    }
  }
  return null;
}

/** SAF — единственный надёжный способ на Android 11+ / targetSdk 34+ */
async function writeViaStorageAccessFramework(json: string): Promise<string> {
  const downloadRoot = StorageAccessFramework.getUriForDirectoryInRoot('Download');
  const perm = await StorageAccessFramework.requestDirectoryPermissionsAsync(downloadRoot);
  if (!perm.granted) {
    throw new Error('Нужен доступ к папке. Выбери Download или Documents.');
  }

  const fileUri = await StorageAccessFramework.createFileAsync(
    perm.directoryUri,
    SAF_FILE_NAME,
    'application/json',
  );
  await FileSystem.writeAsStringAsync(fileUri, json);
  return fileUri;
}

export async function findImportUri(): Promise<string | null> {
  if (Platform.OS === 'android') {
    await requestAndroidReadPermission();
  }
  for (const uri of IMPORT_PATHS) {
    try {
      const info = await FileSystem.getInfoAsync(uri);
      if (info.exists) return uri;
    } catch {
      // next path
    }
  }
  return null;
}

export async function getImportFileInfo(): Promise<{ exists: boolean; uri?: string; size?: number }> {
  const uri = await findImportUri();
  if (!uri) return { exists: false };
  try {
    const info = await FileSystem.getInfoAsync(uri);
    if (!info.exists) return { exists: false };
    return { exists: true, uri, size: info.size };
  } catch {
    return { exists: false };
  }
}

/** Записать состояние в Download/Documents — для миграции APK ↔ Expo Go */
export async function exportStateToDownload(state: AppState): Promise<string> {
  const json = JSON.stringify(state, null, 2);

  if (Platform.OS === 'android') {
    const canLegacyWrite = await requestAndroidWritePermission();
    if (canLegacyWrite) {
      const direct = await writeToPublicDownload(json);
      if (direct) return direct;
    }
    return writeViaStorageAccessFramework(json);
  }

  const uri = `${FileSystem.documentDirectory}${DEV_TRANSFER_FILENAME}`;
  await FileSystem.writeAsStringAsync(uri, json);
  return uri;
}

export async function readImportFromDownload(): Promise<AppState | null> {
  const uri = await findImportUri();
  if (!uri) return null;

  try {
    const raw = await FileSystem.readAsStringAsync(uri);
    return parseAppState(raw);
  } catch {
    return null;
  }
}

/** Выбор JSON через системный диалог — обходит scoped storage Expo Go */
export async function pickAndReadImportFile(): Promise<AppState> {
  const picked = await File.pickFileAsync(undefined, '*/*');
  const file = Array.isArray(picked) ? picked[0] : picked;
  if (!file) {
    throw new Error('Файл не выбран');
  }

  let raw = '';
  try {
    raw = await file.text();
  } catch {
    raw = await FileSystem.readAsStringAsync(file.uri);
  }

  const parsed = parseAppState(raw);
  if (!parsed) {
    throw new Error('Это не JSON Dolgator (нет объекта с days)');
  }
  return parsed;
}

export async function deleteImportFile(): Promise<void> {
  const uri = await findImportUri();
  if (!uri) return;
  await FileSystem.deleteAsync(uri, { idempotent: true });
}

/** Одноразовый автоимпорт при старте Expo Go (__DEV__) */
export async function tryDevAutoImportState(): Promise<AppState | null> {
  if (!__DEV__) return null;
  return readImportFromDownload();
}

export function countDays(state: AppState): number {
  return Object.keys(state.days ?? {}).length;
}
