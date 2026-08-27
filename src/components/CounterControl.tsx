import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { colors } from '../theme/colors';
import { GAP } from '../theme/layout';

interface CounterControlProps {
  value: number;
  onDecrement: () => void;
  onIncrement: () => void;
  onValuePress: () => void;
  variant: 'exercise' | 'food';
  compact?: boolean;
  submitDisabled?: boolean;
}

export function CounterControl({
  value,
  onDecrement,
  onIncrement,
  onValuePress,
  variant,
  compact = false,
  submitDisabled = false,
}: CounterControlProps) {
  const palette = variant === 'exercise' ? colors.exercise : colors.food;
  const btnSize = compact ? 40 : 52;
  const valueSize = compact ? 26 : 36;
  const valueColor = submitDisabled ? colors.textMuted : palette.primary;
  const valueBorder = submitDisabled ? colors.border : palette.primary;

  return (
    <View style={[styles.wrapper, compact && styles.wrapperCompact]}>
      <View style={styles.row}>
        <Pressable
          onPress={onDecrement}
          style={({ pressed }) => [
            styles.btn,
            { width: btnSize, height: btnSize, borderRadius: btnSize / 2, borderColor: palette.primary, shadowColor: palette.glow },
            pressed && styles.btnPressed,
          ]}
          hitSlop={6}
        >
          <Text style={[styles.btnText, compact && styles.btnTextCompact, { color: palette.primary }]}>−</Text>
        </Pressable>

        <Pressable
          onPress={submitDisabled ? undefined : onValuePress}
          disabled={submitDisabled}
          style={({ pressed }) => [
            styles.valueBox,
            compact && styles.valueBoxCompact,
            { borderColor: valueBorder, shadowColor: palette.glow },
            submitDisabled && styles.valueBoxDisabled,
            !submitDisabled && pressed && styles.valueBoxPressed,
          ]}
        >
          <Text style={[styles.value, { fontSize: valueSize, color: valueColor }]}>{value}</Text>
        </Pressable>

        <Pressable
          onPress={onIncrement}
          style={({ pressed }) => [
            styles.btn,
            { width: btnSize, height: btnSize, borderRadius: btnSize / 2, borderColor: palette.primary, shadowColor: palette.glow },
            pressed && styles.btnPressed,
          ]}
          hitSlop={6}
        >
          <Text style={[styles.btnText, compact && styles.btnTextCompact, { color: palette.primary }]}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

const glowShadow: ViewStyle = {
  shadowOffset: { width: 0, height: 0 },
  shadowOpacity: 0.5,
  shadowRadius: 8,
  elevation: 6,
};

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  wrapperCompact: {
    paddingVertical: GAP * 0.4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  btn: {
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bgCard,
    ...glowShadow,
  },
  btnPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.95 }],
  },
  btnText: {
    fontSize: 26,
    fontWeight: '300',
    lineHeight: 28,
  },
  btnTextCompact: {
    fontSize: 22,
    lineHeight: 24,
  },
  valueBox: {
    minWidth: 72,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    backgroundColor: colors.bgCard,
    ...glowShadow,
  },
  valueBoxCompact: {
    minWidth: 64,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  valueBoxPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.97 }],
  },
  valueBoxDisabled: {
    opacity: 0.45,
    shadowOpacity: 0,
    elevation: 0,
  },
  value: {
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
});
