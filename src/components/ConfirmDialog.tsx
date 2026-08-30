import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { colors } from '../theme/colors';

const FADE_MS = 220;

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
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const dialogOpacity = useRef(new Animated.Value(0)).current;
  const dialogScale = useRef(new Animated.Value(0.96)).current;

  useEffect(() => {
    if (!visible) return;

    backdropOpacity.setValue(0);
    dialogOpacity.setValue(0);
    dialogScale.setValue(0.96);

    Animated.parallel([
      Animated.timing(backdropOpacity, {
        toValue: 1,
        duration: FADE_MS,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(dialogOpacity, {
        toValue: 1,
        duration: FADE_MS,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(dialogScale, {
        toValue: 1,
        duration: FADE_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [visible, backdropOpacity, dialogOpacity, dialogScale]);

  if (!visible) return null;

  return (
    <Modal
      visible
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onCancel}
    >
      <View style={styles.root}>
        <Animated.View
          style={[styles.backdrop, { opacity: backdropOpacity }]}
          pointerEvents="none"
        />
        <Pressable style={styles.blocker} onPress={() => {}} accessibilityRole="none" />
        <View style={styles.centerHost} pointerEvents="box-none">
          <Animated.View
            style={[
              styles.box,
              { borderColor: palette.primary, opacity: dialogOpacity, transform: [{ scale: dialogScale }] },
            ]}
          >
            <Text style={styles.message}>{message}</Text>
            <View style={styles.actions}>
              <Pressable style={[styles.btn, styles.btnNo]} onPress={onCancel}>
                <Text style={styles.btnNoText}>Нет</Text>
              </Pressable>
              <Pressable
                style={[styles.btn, { borderColor: palette.primary }]}
                onPress={onConfirm}
              >
                <Text style={[styles.btnYesText, { color: palette.primary }]}>Да</Text>
              </Pressable>
            </View>
          </Animated.View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.78)',
  },
  blocker: {
    ...StyleSheet.absoluteFillObject,
  },
  centerHost: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
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
