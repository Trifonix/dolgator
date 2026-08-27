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
  /** Строки данных: exercise = массив подходов, food = массив приёмов */
  columns: { items: (string | number)[][]; sums: number[] };
  maxRows: number;
  onPress: () => void;
  hint?: string;
}

function formatExerciseCell(values: [number, number, number]): string {
  return `${values[0]} ${values[1]} ${values[2]}`;
}

export function WeekTable({
  variant,
  weekDays,
  todayKey,
  columns,
  maxRows,
  onPress,
  hint,
}: WeekTableProps) {
  const palette = variant === 'exercise' ? colors.exercise : colors.food;
  const sumLabel = variant === 'exercise' ? 'суммы' : 'сумма';

  const rows = Array.from({ length: maxRows }, (_, rowIdx) => rowIdx);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.container,
        {
          borderColor: palette.primary,
          shadowColor: palette.glow,
        },
        pressed && styles.containerPressed,
      ]}
    >
      {hint ? (
        <Text style={[styles.hint, { color: palette.text }]}>
          {hint}
        </Text>
      ) : null}

      {/* Заголовок — числа дней */}
      <View style={styles.row}>
        <View style={styles.cornerCell} />
        {weekDays.map((day) => {
          const key = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
          const isToday = key === todayKey;
          return (
            <View
              key={key}
              style={[
                styles.headerCell,
                isToday && { backgroundColor: colors.bgCellActive, borderColor: palette.primary },
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

      {/* Строки данных */}
      {rows.map((rowIdx) => (
        <View key={rowIdx} style={styles.row}>
          <View style={styles.rowLabel}>
            <Text style={styles.rowLabelText}>{rowIdx + 1}</Text>
          </View>
          {weekDays.map((day, colIdx) => {
            const key = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
            const isToday = key === todayKey;
            const col = columns.items[colIdx];
            const cell = col?.[rowIdx];

            return (
              <View
                key={key}
                style={[
                  styles.cell,
                  isToday && styles.cellToday,
                ]}
              >
                <Text
                  style={[
                    styles.cellText,
                    { color: cell != null ? palette.primary : colors.textMuted },
                    variant === 'food' && styles.foodCellText,
                  ]}
                  numberOfLines={1}
                >
                  {cell != null ? String(cell) : ''}
                </Text>
              </View>
            );
          })}
        </View>
      ))}

      {/* Строка сумм */}
      <View style={[styles.row, styles.sumRow]}>
        <View style={styles.rowLabel}>
          <Text style={[styles.sumLabel, { color: palette.primary }]}>
            {sumLabel}
          </Text>
        </View>
        {columns.sums.map((sum, colIdx) => {
          const day = weekDays[colIdx];
          const key = `${day.getFullYear()}-${day.getMonth() + 1}-${day.getDate()}`;
          return (
            <View key={key} style={[styles.cell, styles.sumCell]}>
              <Text style={[styles.sumText, { color: palette.primary }]}>
                {sum > 0 ? sum : ''}
              </Text>
            </View>
          );
        })}
      </View>
    </Pressable>
  );
}

/** Подготовка данных для таблицы упражнений */
export function buildExerciseColumns(
  weekData: { sets: [number, number, number][]; sum: number }[],
): { items: string[][]; sums: number[] } {
  return {
    items: weekData.map((d) => d.sets.map(formatExerciseCell)),
    sums: weekData.map((d) => d.sum),
  };
}

/** Подготовка данных для таблицы еды */
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
  shadowOpacity: 0.35,
  shadowRadius: 16,
  elevation: 6,
};

const styles = StyleSheet.create({
  container: {
    borderWidth: 1.5,
    borderRadius: 12,
    backgroundColor: colors.bgCard,
    padding: 6,
    ...glowShadow,
  },
  containerPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.985 }],
  },
  hint: {
    fontSize: 10,
    textAlign: 'center',
    marginBottom: 4,
    opacity: 0.7,
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row',
  },
  cornerCell: {
    width: 28,
  },
  headerCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
    borderRadius: 4,
    marginHorizontal: 1,
  },
  headerText: {
    fontSize: 13,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  rowLabel: {
    width: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowLabelText: {
    fontSize: 10,
    color: colors.textMuted,
  },
  cell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 5,
    marginHorizontal: 1,
    borderRadius: 4,
    minHeight: 28,
  },
  cellToday: {
    backgroundColor: colors.bgCell,
  },
  cellText: {
    fontSize: 11,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  foodCellText: {
    fontSize: 12,
  },
  sumRow: {
    marginTop: 2,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 4,
  },
  sumLabel: {
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'lowercase',
  },
  sumCell: {
    minHeight: 24,
  },
  sumText: {
    fontSize: 12,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
});
