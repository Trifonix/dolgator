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
                  isToday && { backgroundColor: headerPalette.headerTodayBg },
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
          <View style={styles.cornerCell} />
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

const headerStyles = {
  exercise: {
    headerBg: 'rgba(156, 39, 176, 0.22)',
    headerBorder: 'rgba(224, 64, 251, 0.35)',
    headerText: '#c9a0dc',
    headerTodayBg: 'rgba(224, 64, 251, 0.28)',
  },
  food: {
    headerBg: 'rgba(2, 136, 209, 0.22)',
    headerBorder: 'rgba(0, 212, 255, 0.35)',
    headerText: '#7ecde8',
    headerTodayBg: 'rgba(0, 212, 255, 0.28)',
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
  headerRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    marginBottom: 2,
    borderRadius: 4,
  },
  headerCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 1,
    borderRadius: 3,
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
  sumText: {
    fontSize: 10,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
});
