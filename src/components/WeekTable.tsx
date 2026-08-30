import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
  type StyleProp,
} from 'react-native';
import { colors, EXERCISE_COLUMN_COLORS, EXERCISE_COLUMN_GHOST } from '../theme/colors';
import { fonts } from '../theme/fonts';
import { getDayOfMonth } from '../utils/dates';
import { ExerciseCell, ExerciseColumns } from '../types';
import { exercisesToTableRows } from '../storage/storage';

type Variant = 'exercise' | 'food';

type TableCell = string | number | ExerciseCell;

interface WeekTableProps {
  variant: Variant;
  weekDays: Date[];
  todayKey: string;
  columns: { items: TableCell[][]; sums: number[] };
  ghostColumns?: { items: TableCell[][]; sums: number[] };
  maxRows: number;
  weekCompare?: { current: number; previous: number };
  onTap?: () => void;
  flex?: boolean;
}

function isExerciseCell(cell: TableCell | undefined): cell is ExerciseCell {
  return Array.isArray(cell);
}

function FadeInMiniValue({
  value,
  color,
  style,
  pulse = false,
  pulseDelayMs = 0,
}: {
  value: number | null | undefined;
  color: string;
  style: StyleProp<TextStyle>;
  pulse?: boolean;
  pulseDelayMs?: number;
}) {
  const hasValue = value != null;
  const opacity = useRef(new Animated.Value(hasValue ? 1 : 0)).current;
  const seen = useRef(value);
  const pulseLoop = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    let cancelled = false;
    const had = seen.current != null;
    const has = value != null;

    function stopPulse() {
      pulseLoop.current?.stop();
      pulseLoop.current = null;
    }

    function startPulse() {
      if (cancelled || !pulse) return;
      stopPulse();
      const beat = Animated.loop(
        Animated.sequence([
          Animated.timing(opacity, {
            toValue: 0.8,
            duration: 900,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: false,
          }),
          Animated.timing(opacity, {
            toValue: 1,
            duration: 900,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: false,
          }),
        ]),
      );
      pulseLoop.current = Animated.sequence([
        Animated.delay(pulseDelayMs),
        beat,
      ]);
      pulseLoop.current.start();
    }

    if (!had && has) {
      opacity.setValue(0);
      Animated.timing(opacity, {
        toValue: 1,
        duration: 320,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start(({ finished }) => {
        if (finished && !cancelled) startPulse();
      });
    } else if (had && !has) {
      stopPulse();
      opacity.setValue(0);
    } else if (has) {
      opacity.setValue(1);
      if (pulse) startPulse();
      else stopPulse();
    }
    seen.current = value;

    return () => {
      cancelled = true;
      stopPulse();
    };
  }, [opacity, pulse, pulseDelayMs, value]);

  if (value == null) {
    return <Text style={style} />;
  }

  return (
    <Animated.Text
      style={[style, { color, opacity }]}
      numberOfLines={1}
      adjustsFontSizeToFit
      minimumFontScale={0.6}
    >
      {String(value)}
    </Animated.Text>
  );
}

function dateKey(day: Date): string {
  return `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
}

/** Фон ячейки «сегодня»: строка 1 чуть ярче, к 5-й — тусклее (приглушённый градиент) */
function todayCellBackground(rowIndex: number, maxRows: number): string {
  const invertedIdx = maxRows - 1 - rowIndex;
  const alpha = 0.05 + invertedIdx * 0.02;
  return `rgba(255, 255, 255, ${Math.min(alpha, 0.13)})`;
}

function todayHeaderBackground(): string {
  return 'rgba(255, 255, 255, 0.05)';
}

function todayCellLayout(rowIndex: number, maxRows: number): ViewStyle {
  const base: ViewStyle = {
    marginHorizontal: 0,
    borderRadius: 0,
  };
  if (rowIndex === maxRows - 1) {
    return {
      ...base,
      borderBottomLeftRadius: 3,
      borderBottomRightRadius: 3,
    };
  }
  return base;
}

function todayHeaderLayout(): ViewStyle {
  return {
    marginHorizontal: 0,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  };
}

function weekCompareColor(
  variant: Variant,
  current: number,
  previous: number,
): string {
  if (variant === 'exercise') {
    return current >= previous ? colors.compareGood : colors.compareBad;
  }
  return current <= previous ? colors.compareGood : colors.compareBad;
}

function isWeekendColumn(colIdx: number): boolean {
  return colIdx >= 5;
}

function weekendHeaderBackground(variant: Variant): string {
  return variant === 'exercise'
    ? 'rgba(156, 39, 176, 0.14)'
    : 'rgba(2, 136, 209, 0.14)';
}

function weekendCellBackground(variant: Variant): string {
  return variant === 'exercise'
    ? 'rgba(156, 39, 176, 0.07)'
    : 'rgba(2, 136, 209, 0.07)';
}

function labelColumnHeaderBackground(variant: Variant): string {
  return variant === 'exercise'
    ? 'rgba(156, 39, 176, 0.16)'
    : 'rgba(2, 136, 209, 0.16)';
}

function labelColumnCellBackground(variant: Variant): string {
  return variant === 'exercise'
    ? 'rgba(156, 39, 176, 0.1)'
    : 'rgba(2, 136, 209, 0.1)';
}

export function WeekTable({
  variant,
  weekDays,
  todayKey,
  columns,
  ghostColumns,
  maxRows,
  weekCompare,
  onTap,
  flex = false,
}: WeekTableProps) {
  const palette = variant === 'exercise' ? colors.exercise : colors.food;
  const headerPalette = variant === 'exercise' ? headerStyles.exercise : headerStyles.food;
  const rows = Array.from({ length: maxRows }, (_, rowIdx) => rowIdx);

  return (
    <Pressable
      onPress={onTap}
      disabled={!onTap}
      style={({ pressed }) => [
        styles.container,
        flex && styles.containerFlex,
        { borderColor: palette.primary, shadowColor: palette.glow },
        onTap && pressed && styles.containerPressed,
      ]}
    >
      <View style={[styles.body, flex && styles.bodyFlex]}>
        {/* Заголовок — дни недели */}
        <View style={[styles.headerRow, { backgroundColor: headerPalette.headerBg, borderBottomColor: headerPalette.headerBorder }]}>
          <View
            style={[
              styles.cornerCell,
              styles.labelCorner,
              { backgroundColor: labelColumnHeaderBackground(variant) },
            ]}
          />
          {weekDays.map((day, colIdx) => {
            const key = dateKey(day);
            const isToday = key === todayKey;
            const isWeekend = isWeekendColumn(colIdx);
            return (
              <View
                key={key}
                style={[
                  styles.headerCell,
                  isToday && todayHeaderLayout(),
                  !isToday && isWeekend && { backgroundColor: weekendHeaderBackground(variant) },
                  isToday && { backgroundColor: todayHeaderBackground() },
                ]}
              >
                <Text
                  style={[
                    styles.headerText,
                    { color: isToday ? palette.primary : headerPalette.headerText },
                    isToday && styles.headerTextToday,
                  ]}
                >
                  {getDayOfMonth(day)}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Строки данных и суммы — одинаковая высота */}
        <View style={[styles.dataRows, flex && styles.dataRowsFlex]}>
          {rows.map((rowIdx) => (
            <View key={rowIdx} style={[styles.row, flex && styles.rowFlex]}>
              <View
                style={[
                  styles.cornerCell,
                  styles.labelCorner,
                  { backgroundColor: labelColumnCellBackground(variant) },
                ]}
              >
                <Text style={styles.rowLabelText}>{rowIdx + 1}</Text>
              </View>
              {weekDays.map((day, colIdx) => {
                const key = dateKey(day);
                const isToday = key === todayKey;
                const isWeekend = isWeekendColumn(colIdx);
                const cell = columns.items[colIdx]?.[rowIdx];
                const ghostCell = ghostColumns?.items[colIdx]?.[rowIdx];

                return (
                  <View
                    key={key}
                    style={[
                      styles.cell,
                      flex && styles.cellFlex,
                      isToday && todayCellLayout(rowIdx, maxRows),
                      !isToday && isWeekend && { backgroundColor: weekendCellBackground(variant) },
                      isToday && {
                        backgroundColor: todayCellBackground(rowIdx, maxRows),
                      },
                    ]}
                  >
                    {variant === 'exercise' && (isExerciseCell(cell) || isExerciseCell(ghostCell)) ? (
                      <View style={styles.exerciseMiniRow}>
                        {([0, 1, 2] as const).map((miniIdx) => {
                          const value = isExerciseCell(cell) ? cell[miniIdx] : null;
                          const ghostValue = isExerciseCell(ghostCell) ? ghostCell[miniIdx] : null;
                          const showActual = value != null;
                          const showGhost = !showActual && ghostValue != null;
                          return (
                            <FadeInMiniValue
                              key={miniIdx}
                              value={showActual ? value : showGhost ? ghostValue : null}
                              color={
                                showActual
                                  ? EXERCISE_COLUMN_COLORS[miniIdx]
                                  : showGhost
                                    ? EXERCISE_COLUMN_GHOST[miniIdx]
                                    : colors.textMuted
                              }
                              style={[
                                styles.exerciseMiniCell,
                                showActual ? styles.fontCurrent : styles.fontPast,
                              ]}
                              pulse={showActual}
                              pulseDelayMs={miniIdx * 280}
                            />
                          );
                        })}
                      </View>
                    ) : (
                      (() => {
                        const hasActual = cell != null && cell !== '';
                        const ghostVal = ghostCell != null && ghostCell !== '' ? ghostCell : null;
                        const display = hasActual ? cell : ghostVal;
                        return (
                          <Text
                            style={[
                              styles.cellText,
                              variant === 'food' && styles.foodCellText,
                              hasActual ? styles.fontCurrent : styles.fontPast,
                              {
                                color: hasActual
                                  ? palette.primary
                                  : ghostVal != null
                                    ? colors.ghostText
                                    : colors.textMuted,
                              },
                            ]}
                            numberOfLines={1}
                            adjustsFontSizeToFit
                            minimumFontScale={0.7}
                          >
                            {display != null ? String(display) : ''}
                          </Text>
                        );
                      })()
                    )}
                  </View>
                );
              })}
            </View>
          ))}

          <View style={[styles.row, flex && styles.rowFlex, styles.sumRow]}>
            <View
              style={[
                styles.cornerCell,
                styles.labelCornerSum,
                {
                  backgroundColor: labelColumnCellBackground(variant),
                  borderTopWidth: 1.5,
                  borderRightWidth: 1.5,
                  borderLeftWidth: 1.5,
                  borderBottomWidth: 1.5,
                  borderTopColor: palette.primary,
                  borderRightColor: palette.primary,
                  borderLeftColor: palette.primary,
                  borderBottomColor: palette.primary,
                },
              ]}
            >
              {weekCompare != null && (
                <View style={styles.weekCompareStack}>
                  <Text
                    style={[styles.weekComparePrev, styles.fontPast]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.5}
                  >
                    {weekCompare.previous}
                  </Text>
                  <Text
                    style={[
                      styles.weekCompareCurrent,
                      styles.fontCurrent,
                      {
                        color: weekCompareColor(
                          variant,
                          weekCompare.current,
                          weekCompare.previous,
                        ),
                      },
                    ]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.5}
                  >
                    {weekCompare.current}
                  </Text>
                </View>
              )}
            </View>
            {columns.sums.map((sum, colIdx) => {
              const day = weekDays[colIdx];
              const key = dateKey(day);
              const isFirstCol = colIdx === 0;
              const isToday = key === todayKey;
              const isWeekend = isWeekendColumn(colIdx);
              const ghostSum = ghostColumns?.sums[colIdx] ?? 0;
              const hasActual = sum > 0;

              return (
                <View
                  key={key}
                  style={[
                    styles.cell,
                    styles.sumCellRight,
                    isFirstCol && styles.sumCellLeft,
                    flex && styles.cellFlex,
                    !isToday && isWeekend && { backgroundColor: weekendCellBackground(variant) },
                  ]}
                >
                  <Text
                    style={[
                      styles.sumText,
                      hasActual ? styles.fontCurrent : styles.fontPast,
                      {
                        color: hasActual
                          ? palette.primary
                          : ghostSum > 0
                            ? colors.ghostText
                            : colors.textMuted,
                      },
                    ]}
                    numberOfLines={1}
                  >
                    {hasActual ? sum : ghostSum > 0 ? ghostSum : ' '}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      </View>
    </Pressable>
  );
}

export function buildExerciseColumns(
  weekData: { exercises: ExerciseColumns; sum: number }[],
): { items: ExerciseCell[][]; sums: number[] } {
  return {
    items: weekData.map((d) => exercisesToTableRows(d.exercises)),
    sums: weekData.map((d) => d.sum),
  };
}

export function buildFoodColumns(
  weekData: { meals: number[]; sum: number }[],
): { items: (string | number)[][]; sums: number[] } {
  return {
    items: weekData.map((d) => d.meals.map(String)),
    sums: weekData.map((d) => d.sum),
  };
}

const headerStyles = {
  exercise: {
    headerBg: 'rgba(156, 39, 176, 0.22)',
    headerBorder: 'rgba(224, 64, 251, 0.35)',
    headerText: '#c9a0dc',
  },
  food: {
    headerBg: 'rgba(2, 136, 209, 0.22)',
    headerBorder: 'rgba(0, 212, 255, 0.35)',
    headerText: '#7ecde8',
  },
};

const glowShadow: ViewStyle = {
  shadowOffset: { width: 0, height: 0 },
  shadowOpacity: 0.3,
  shadowRadius: 10,
  elevation: 4,
};

const styles = StyleSheet.create({
  container: {
    borderWidth: 1.5,
    borderRadius: 10,
    backgroundColor: colors.bgCard,
    padding: 4,
    ...glowShadow,
  },
  containerFlex: {
    flex: 1,
  },
  containerPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.95 }],
  },
  body: {
    overflow: 'hidden',
    borderRadius: 6,
  },
  bodyFlex: {
    flex: 1,
  },
  dataRows: {},
  dataRowsFlex: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
  },
  rowFlex: {
    flex: 1,
  },
  cornerCell: {
    width: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  labelCorner: {
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: colors.border,
  },
  labelCornerSum: {
    borderBottomLeftRadius: 3,
  },
  headerRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderRadius: 4,
  },
  headerCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 1,
    borderRadius: 3,
    alignSelf: 'stretch',
  },
  headerText: {
    fontFamily: fonts.ui,
    fontSize: 10,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  headerTextToday: {
    fontWeight: '900',
  },
  rowLabelText: {
    fontFamily: fonts.ui,
    fontSize: 8,
    color: colors.textMuted,
  },
  cell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 1,
    alignSelf: 'stretch',
  },
  cellFlex: {
    minHeight: 0,
  },
  cellText: {
    fontSize: 9,
    fontVariant: ['tabular-nums'],
  },
  exerciseMiniRow: {
    flexDirection: 'row',
    width: '100%',
    alignItems: 'center',
  },
  exerciseMiniCell: {
    flex: 1,
    textAlign: 'center',
    fontSize: 8,
    fontVariant: ['tabular-nums'],
  },
  foodCellText: {
    fontSize: 10,
  },
  sumRow: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  sumCellRight: {
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: colors.border,
  },
  sumCellLeft: {
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: colors.border,
  },
  sumText: {
    fontSize: 9,
    fontVariant: ['tabular-nums'],
  },
  weekCompareStack: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
  },
  weekCompareCurrent: {
    fontSize: 8,
    fontVariant: ['tabular-nums'],
    lineHeight: 9,
  },
  weekComparePrev: {
    fontSize: 7,
    fontVariant: ['tabular-nums'],
    color: colors.textMuted,
    lineHeight: 8,
  },
  fontPast: {
    fontFamily: fonts.past,
    fontWeight: '400',
  },
  fontCurrent: {
    fontFamily: fonts.current,
    fontWeight: '700',
  },
});
