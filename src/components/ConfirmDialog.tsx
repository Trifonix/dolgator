import React from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { colors } from '../theme/colors';

interface ConfirmDialogProps {
  visible: boolean;
  message: string;
  variant: 'exercise' | 'food';
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  visible,
  message,
  variant,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const palette = variant === 'exercise' ? colors.exercise : colors.food;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <Pressable style={styles.backdrop} onPress={onCancel}>
        <View style={[styles.box, { borderColor: palette.primary }]}>
          <Text style={styles.message}>{message}</Text>
          <View style={styles.actions}>
            <Pressable
              style={[styles.btn, styles.btnNo]}
              onPress={onCancel}
            >
              <Text style={styles.btnNoText}>Нет</Text>
            </Pressable>
            <Pressable
              style={[styles.btn, { borderColor: palette.primary }]}
              onPress={onConfirm}
            >
              <Text style={[styles.btnYesText, { color: palette.primary }]}>
                Да
              </Text>
            </Pressable>
          </View>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  box: {
    width: '100%',
    maxWidth: 300,
    backgroundColor: colors.bgCard,
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 20,
    gap: 20,
  },
  message: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  btn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  btnNo: {
    borderColor: colors.border,
  },
  btnNoText: {
    color: colors.textMuted,
    fontSize: 15,
    fontWeight: '600',
  },
  btnYesText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
