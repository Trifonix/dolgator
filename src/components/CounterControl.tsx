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
  subtitle?: string;
  compact?: boolean;
}

export function CounterControl({
  value,
  onDecrement,
  onIncrement,
  variant,
  subtitle,
  compact = false,
}: CounterControlProps) {
  const palette = variant === 'exercise' ? colors.exercise : colors.food;
  const btnSize = compact ? 40 : 52;
  const valueSize = compact ? 26 : 36;

  return (
    <View style={[styles.wrapper, compact && styles.wrapperCompact]}>
      {subtitle ? (
        <Text
          style={[styles.subtitle, compact && styles.subtitleCompact, { color: palette.text }]}
          numberOfLines={1}
        >
          {subtitle}
        </Text>
      ) : null}
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

        <View
          style={[
            styles.valueBox,
            compact && styles.valueBoxCompact,
            { borderColor: palette.primary, shadowColor: palette.glow },
          ]}
        >
          <Text style={[styles.value, { fontSize: valueSize, color: palette.primary }]}>{value}</Text>
        </View>

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
    paddingVertical: 2,
  },
  subtitle: {
    fontSize: 11,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 4,
    opacity: 0.85,
  },
  subtitleCompact: {
    fontSize: 9,
    marginBottom: 2,
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
  value: {
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
});
