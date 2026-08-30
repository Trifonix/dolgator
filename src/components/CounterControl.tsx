import React, { useRef } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { colors, AccentPalette } from '../theme/colors';
import {
  CENTER_CTRL_GAP,
  CENTER_CTRL_ROW_WIDTH,
  CENTER_OK_FONT_SIZE,
  CENTER_OK_HEIGHT,
  CENTER_OK_WIDTH,
  CENTER_SIDE_BTN,
} from '../theme/layout';

const DOUBLE_TAP_MS = 320;
/** Макс. пауза между тапами в «быстрой» серии для армирования undo */
const RAPID_TAP_GAP_MS = 400;
const ARM_UNDO_TAPS = 10;
const UNDO_OK = '#ef9a9a';

function SideSymbol({
  kind,
  color,
  btnSize,
}: {
  kind: 'minus' | 'plus';
  color: string;
  btnSize: number;
}) {
  const barLen = Math.round(btnSize * 0.38);
  const barW = Math.max(2, Math.round(btnSize * 0.07));

  return (
    <View style={[styles.symbolBox, { width: btnSize, height: btnSize }]}>
      <View
        style={{
          width: barLen,
          height: barW,
          borderRadius: barW / 2,
          backgroundColor: color,
        }}
      />
      {kind === 'plus' ? (
        <View
          style={{
            position: 'absolute',
            width: barW,
            height: barLen,
            borderRadius: barW / 2,
            backgroundColor: color,
          }}
        />
      ) : null}
    </View>
  );
}

export type OkMode = 'active' | 'undo' | 'disabled';

interface CounterControlProps {
  value: number;
  onDecrement: () => void;
  onIncrement: () => void;
  onValuePress: () => void;
  onUndoLast: () => void;
  onArmUndo: () => void;
  okMode: OkMode;
  variant: 'exercise' | 'food';
  /** Переопределяет палитру variant (для цвета текущего упражнения) */
  accentPalette?: AccentPalette;
  compact?: boolean;
}

export function CounterControl({
  value,
  onDecrement,
  onIncrement,
  onValuePress,
  onUndoLast,
  onArmUndo,
  okMode,
  variant,
  accentPalette,
  compact = false,
}: CounterControlProps) {
  const palette =
    accentPalette ?? (variant === 'exercise' ? colors.exercise : colors.food);
  const btnSize = compact ? CENTER_SIDE_BTN : 52;
  const okWidth = compact ? CENTER_OK_WIDTH : 88;
  const okHeight = compact ? CENTER_OK_HEIGHT : 52;
  const valueSize = compact ? CENTER_OK_FONT_SIZE : 36;
  const pendingTap = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rapidCount = useRef(0);

  const valueColor =
    okMode === 'disabled'
      ? colors.textMuted
      : okMode === 'undo'
        ? UNDO_OK
        : palette.primary;
  const valueBorder =
    okMode === 'disabled'
      ? colors.border
      : okMode === 'undo'
        ? UNDO_OK
        : palette.primary;

  const sideDisabled = okMode === 'disabled';
  const sideColor = sideDisabled ? colors.textMuted : palette.primary;
  const sideBorder = sideDisabled ? colors.border : palette.primary;

  const clearPending = () => {
    if (pendingTap.current) {
      clearTimeout(pendingTap.current);
      pendingTap.current = null;
    }
  };

  const handleOkPress = () => {
    if (okMode === 'undo') {
      if (pendingTap.current) {
        clearPending();
        rapidCount.current = 0;
        onUndoLast();
        return;
      }
      pendingTap.current = setTimeout(() => {
        pendingTap.current = null;
      }, DOUBLE_TAP_MS);
      return;
    }

    rapidCount.current += 1;
    clearPending();

    if (rapidCount.current >= ARM_UNDO_TAPS) {
      rapidCount.current = 0;
      onArmUndo();
      return;
    }

    if (okMode === 'active' && rapidCount.current === 1) {
      onValuePress();
    }

    pendingTap.current = setTimeout(() => {
      pendingTap.current = null;
      rapidCount.current = 0;
    }, RAPID_TAP_GAP_MS);
  };

  return (
    <View style={[styles.wrapper, compact && styles.wrapperCompact]}>
      <View style={[styles.row, compact && styles.rowCompact]}>
        <Pressable
          onPress={onDecrement}
          disabled={sideDisabled}
          style={({ pressed }) => [
            styles.btn,
            {
              width: btnSize,
              height: btnSize,
              borderRadius: btnSize / 2,
              borderColor: sideBorder,
              shadowColor: palette.glow,
            },
            sideDisabled && styles.btnDisabled,
            !sideDisabled && pressed && styles.btnPressed,
          ]}
          hitSlop={6}
        >
          <SideSymbol kind="minus" color={sideColor} btnSize={btnSize} />
        </Pressable>

        <Pressable
          onPress={handleOkPress}
          style={({ pressed }) => [
            styles.valueBox,
            {
              width: okWidth,
              height: okHeight,
              borderColor: valueBorder,
              shadowColor: okMode === 'undo' ? UNDO_OK : palette.glow,
            },
            okMode === 'disabled' && styles.valueBoxDisabled,
            okMode === 'undo' && styles.valueBoxUndo,
            pressed && styles.valueBoxPressed,
          ]}
        >
          <Text
            style={[styles.value, { fontSize: valueSize, lineHeight: valueSize + 2, color: valueColor }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.65}
          >
            {value}
          </Text>
        </Pressable>

        <Pressable
          onPress={onIncrement}
          disabled={sideDisabled}
          style={({ pressed }) => [
            styles.btn,
            {
              width: btnSize,
              height: btnSize,
              borderRadius: btnSize / 2,
              borderColor: sideBorder,
              shadowColor: palette.glow,
            },
            sideDisabled && styles.btnDisabled,
            !sideDisabled && pressed && styles.btnPressed,
          ]}
          hitSlop={6}
        >
          <SideSymbol kind="plus" color={sideColor} btnSize={btnSize} />
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
    width: '100%',
    alignItems: 'center',
    paddingVertical: 8,
  },
  wrapperCompact: {
    width: CENTER_CTRL_ROW_WIDTH,
    paddingVertical: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: CENTER_CTRL_GAP,
  },
  rowCompact: {
    minHeight: CENTER_OK_HEIGHT,
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
  btnDisabled: {
    opacity: 0.45,
    shadowOpacity: 0,
    elevation: 0,
  },
  symbolBox: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  valueBox: {
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bgCard,
    ...glowShadow,
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
  valueBoxUndo: {
    opacity: 0.92,
  },
  value: {
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    textAlign: 'center',
  },
});
