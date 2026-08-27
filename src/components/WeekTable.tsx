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
  onPress: () => void;
  hint?: string;
  flex?: boolean;
}

function formatExerciseCell(values: [number, number, number]): string {
  return `${values[0]} ${values[1]} ${values[2]}`;
}

function dateKey(day: Date): string {
  return `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
}

export function WeekTable({
  variant,
  weekDays,
  todayKey,
  columns,
  maxRows,
  onPress,
  hint,
  flex = false,
}: WeekTableProps) {
  const palette = variant === 'exercise' ? colors.exercise : colors.food;
  const sumLabel = variant === 'exercise' ? 'суммы' : 'сумма';
  const rows = Array.from({ length: maxRows }, (_, rowIdx) => rowIdx);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.container,
        flex && styles.containerFlex,
        { borderColor: palette.primary, shadowColor: palette.glow },
        pressed && styles.containerPressed,
      ]}
    >
      {hint ? (
        <Text style={[styles.hint, { color: palette.text }]}>{hint}</Text>
      ) : null}

      <View style={[styles.body, flex && styles.bodyFlex]}>
        {/* Заголовок */}
        <View style={styles.row}>
          <View style={styles.cornerCell} />
          {weekDays.map((day) => {
            const key = dateKey(day);
            const isToday = key === todayKey;
            return (
              <View
                key={key}
                style={[
                  styles.headerCell,
                  isToday && { backgroundColor: colors.bgCellActive },
                ]}
              >
                <Text
                  style={[
                    styles.headerText,
                    { color: isToday ? palette.primary : colors.textMuted },
                  ]}
                >
                  {getDayOfMonth(day)}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Строки данных — растягиваются равномерно */}
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
                    style={[styles.cell, flex && styles.cellFlex, isToday && styles.cellToday]}
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
        </View>

        {/* Суммы */}
        <View style={[styles.row, styles.sumRow]}>
          <View style={styles.cornerCell}>
            <Text style={[styles.sumLabel, { color: palette.primary }]}>{sumLabel}</Text>
          </View>
          {columns.sums.map((sum, colIdx) => {
            const day = weekDays[colIdx];
            const key = dateKey(day);
            return (
              <View key={key} style={styles.cell}>
                <Text style={[styles.sumText, { color: palette.primary }]}>
                  {sum > 0 ? sum : ''}
                </Text>
              </View>
            );
          })}
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
  hint: {
    fontSize: 8,
    textAlign: 'center',
    marginBottom: 2,
    opacity: 0.65,
    letterSpacing: 0.3,
  },
  body: {},
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
  headerCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 1,
  },
  headerText: {
    fontSize: 11,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
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
  },
  cellFlex: {
    minHeight: 0,
  },
  cellToday: {
    backgroundColor: colors.bgCell,
    borderRadius: 3,
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
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  sumLabel: {
    fontSize: 7,
    fontWeight: '700',
  },
  sumText: {
    fontSize: 10,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
});
