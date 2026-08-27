import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { colors } from '../theme/colors';
import { getDayOfMonth } from '../utils/dates';

type Variant = 'exercise' | 'food';

interface WeekTableProps {
  variant: Variant;
  weekDays: Date[];
  todayKey: string;
  columns: { items: (string | number)[][]; sums: number[] };
  maxRows: number;
  onTap?: () => void;
  flex?: boolean;
}

function formatExerciseCell(values: [number, number, number]): string {
  return `${values[0]} ${values[1]} ${values[2]}`;
}

function dateKey(day: Date): string {
  return `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
}

/** Фон ячейки «сегодня»: каждая строка чуть светлее предыдущей */
function todayCellBackground(rowIndex: number): string {
  const alpha = 0.06 + rowIndex * 0.04;
  return `rgba(255, 255, 255, ${Math.min(alpha, 0.26)})`;
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

export function WeekTable({
  variant,
  weekDays,
  todayKey,
  columns,
  maxRows,
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
          <View style={styles.cornerCell} />
          {weekDays.map((day) => {
            const key = dateKey(day);
            const isToday = key === todayKey;
            return (
              <View
                key={key}
                style={[
                  styles.headerCell,
                  isToday && todayHeaderLayout(),
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
              <View style={styles.cornerCell}>
                <Text style={styles.rowLabelText}>{rowIdx + 1}</Text>
              </View>
              {weekDays.map((day, colIdx) => {
                const key = dateKey(day);
                const isToday = key === todayKey;
                const cell = columns.items[colIdx]?.[rowIdx];

                return (
                  <View
                    key={key}
                    style={[
                      styles.cell,
                      flex && styles.cellFlex,
                      isToday && todayCellLayout(rowIdx, maxRows),
                      isToday && {
                        backgroundColor: todayCellBackground(rowIdx),
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.cellText,
                        variant === 'food' && styles.foodCellText,
                        { color: cell != null ? palette.primary : colors.textMuted },
                      ]}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.7}
                    >
                      {cell != null ? String(cell) : ''}
                    </Text>
                  </View>
                );
              })}
            </View>
          ))}

          <View style={[styles.row, flex && styles.rowFlex, styles.sumRow]}>
            <View style={styles.cornerCell} />
            {columns.sums.map((sum, colIdx) => {
              const day = weekDays[colIdx];
              const key = dateKey(day);
              const isFirstCol = colIdx === 0;

              return (
                <View
                  key={key}
                  style={[
                    styles.cell,
                    styles.sumCellRight,
                    isFirstCol && styles.sumCellLeft,
                    flex && styles.cellFlex,
                  ]}
                >
                  <Text
                    style={[
                      styles.sumText,
                      { color: sum > 0 ? palette.primary : colors.textMuted },
                    ]}
                    numberOfLines={1}
                  >
                    {sum > 0 ? sum : ' '}
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
  weekData: { sets: [number, number, number][]; sum: number }[],
): { items: string[][]; sums: number[] } {
  return {
    items: weekData.map((d) => d.sets.map(formatExerciseCell)),
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
    opacity: 0.85,
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
    width: 22,
    justifyContent: 'center',
    alignItems: 'center',
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
    fontSize: 10,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  headerTextToday: {
    fontWeight: '900',
  },
  rowLabelText: {
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
    fontWeight: '600',
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
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
});
