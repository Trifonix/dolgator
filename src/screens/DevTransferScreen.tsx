import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  DEV_TRANSFER_FILENAME,
  countDays,
  exportStateToDownload,
  getImportFileInfo,
  pickAndReadImportFile,
} from '../storage/devTransfer';
import { mergeImportedState, saveState } from '../storage/storage';
import { AppState } from '../types';
import { colors } from '../theme/colors';
import { GAP } from '../theme/layout';

interface DevTransferScreenProps {
  state: AppState;
  onApplied: (next: AppState) => void;
  onClose: () => void;
}

export function DevTransferScreen({ state, onApplied, onClose }: DevTransferScreenProps) {
  const [busy, setBusy] = useState(false);
  const [importInfo, setImportInfo] = useState<{ exists: boolean; size?: number }>({ exists: false });

  const refreshImportInfo = useCallback(async () => {
    setImportInfo(await getImportFileInfo());
  }, []);

  useEffect(() => {
    void refreshImportInfo();
  }, [refreshImportInfo]);

  const onExport = useCallback(async () => {
    setBusy(true);
    try {
      await exportStateToDownload(state);
      const days = countDays(state);
      Alert.alert(
        'Экспорт готов',
        `${days} дней записей.\n\n` +
          'В Expo Go: Перенос данных → «Выбрать JSON» → укажи файл dolgator-import.json (Download или Documents).',
      );
      await refreshImportInfo();
    } catch (e) {
      const msg = String(e);
      Alert.alert(
        'Ошибка экспорта',
        msg.includes('Download') || msg.includes('writable')
          ? 'Разреши доступ к папке «Загрузки» и повтори экспорт.'
          : msg,
      );
    } finally {
      setBusy(false);
    }
  }, [state, refreshImportInfo]);

  const applyPickedImport = useCallback(async () => {
    setBusy(true);
    try {
      const parsed = await pickAndReadImportFile();
      const merged = mergeImportedState(parsed);
      await saveState(merged);
      onApplied(merged);
      Alert.alert('Импорт', `Загружено ${countDays(merged)} дней.`);
      onClose();
    } catch (e) {
      const msg = String(e);
      if (msg.toLowerCase().includes('cancel') || msg.toLowerCase().includes('cancel')) {
        return;
      }
      Alert.alert('Ошибка импорта', msg);
    } finally {
      setBusy(false);
    }
  }, [onApplied, onClose]);

  const onImport = useCallback(() => {
    Alert.alert(
      'Импорт данных',
      'Выбери JSON (Download или Documents). Текущие данные Expo Go будут заменены. Продолжить?',
      [
        { text: 'Отмена', style: 'cancel' },
        { text: 'Выбрать файл', style: 'destructive', onPress: () => void applyPickedImport() },
      ],
    );
  }, [applyPickedImport]);

  const days = countDays(state);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Text style={styles.title}>Перенос данных</Text>
        <Text style={styles.subtitle}>Только для разработчика</Text>
      </View>

      <View style={styles.body}>
        <Text style={styles.label}>Текущие данные</Text>
        <Text style={styles.value}>{days} дней в приложении</Text>

        <Text style={[styles.label, styles.gapTop]}>Файл на телефоне</Text>
        <Text style={styles.value}>
          {importInfo.exists
            ? `${DEV_TRANSFER_FILENAME} (${importInfo.size ?? '?'} байт)`
            : 'не найден'}
        </Text>

        <Text style={styles.hint}>
          Экспорт пишет JSON в выбранную папку. Импорт: «Выбрать JSON» и укажи этот файл.
        </Text>
      </View>

      <View style={styles.actions}>
        <Pressable
          style={[styles.btn, styles.btnPrimary, busy && styles.btnDisabled]}
          disabled={busy}
          onPress={() => void onExport()}
        >
          {busy ? (
            <ActivityIndicator color={colors.bg} />
          ) : (
            <Text style={styles.btnPrimaryText}>Экспорт в Download</Text>
          )}
        </Pressable>

        <Pressable
          style={[styles.btn, styles.btnSecondary, busy && styles.btnDisabled]}
          disabled={busy}
          onPress={onImport}
        >
          <Text style={styles.btnSecondaryText}>Выбрать JSON</Text>
        </Pressable>

        <Pressable style={styles.closeBtn} onPress={onClose}>
          <Text style={styles.closeText}>← Назад</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    paddingHorizontal: GAP,
    paddingTop: GAP,
    paddingBottom: GAP * 0.5,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    color: colors.food.primary,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 4,
  },
  body: {
    flex: 1,
    padding: GAP,
  },
  label: {
    color: colors.textMuted,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  value: {
    color: colors.text,
    fontSize: 15,
    marginTop: 4,
  },
  gapTop: {
    marginTop: GAP,
  },
  hint: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: GAP * 1.5,
  },
  actions: {
    padding: GAP,
    gap: GAP * 0.75,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  btn: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  btnPrimary: {
    backgroundColor: colors.food.primary,
  },
  btnSecondary: {
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  btnPrimaryText: {
    color: colors.bg,
    fontWeight: '700',
    fontSize: 15,
  },
  btnSecondaryText: {
    color: colors.text,
    fontWeight: '600',
    fontSize: 15,
  },
  closeBtn: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  closeText: {
    color: colors.exercise.primary,
    fontSize: 15,
    fontWeight: '600',
  },
});
