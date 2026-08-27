import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { colors } from '../theme/colors';

interface CounterControlProps {
  value: number;
  onDecrement: () => void;
  onIncrement: () => void;
  variant: 'exercise' | 'food';
  step?: number;
  subtitle?: string;
}

export function CounterControl({
  value,
  onDecrement,
  onIncrement,
  variant,
  step = 1,
  subtitle,
}: CounterControlProps) {
  const palette = variant === 'exercise' ? colors.exercise : colors.food;

  return (
    <View style={styles.wrapper}>
      {subtitle ? (
        <Text style={[styles.subtitle, { color: palette.text }]}>{subtitle}</Text>
      ) : null}
      <View style={styles.row}>
        <Pressable
          onPress={onDecrement}
          style={({ pressed }) => [
            styles.btn,
            { borderColor: palette.primary, shadowColor: palette.glow },
            pressed && styles.btnPressed,
          ]}
          hitSlop={8}
        >
          <Text style={[styles.btnText, { color: palette.primary }]}>−</Text>
        </Pressable>

        <View
          style={[
            styles.valueBox,
            {
              borderColor: palette.primary,
              shadowColor: palette.glow,
            },
          ]}
        >
          <Text style={[styles.value, { color: palette.primary }]}>{value}</Text>
        </View>

        <Pressable
          onPress={onIncrement}
          style={({ pressed }) => [
            styles.btn,
            { borderColor: palette.primary, shadowColor: palette.glow },
            pressed && styles.btnPressed,
          ]}
          hitSlop={8}
        >
          <Text style={[styles.btnText, { color: palette.primary }]}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

const glowShadow: ViewStyle = {
  shadowOffset: { width: 0, height: 0 },
  shadowOpacity: 0.6,
  shadowRadius: 12,
  elevation: 8,
};

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  subtitle: {
    fontSize: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 6,
    opacity: 0.85,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  btn: {
    width: 52,
    height: 52,
    borderRadius: 26,
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
    fontSize: 28,
    fontWeight: '300',
    lineHeight: 32,
  },
  valueBox: {
    minWidth: 90,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    backgroundColor: colors.bgCard,
    ...glowShadow,
  },
  value: {
    fontSize: 36,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
});
