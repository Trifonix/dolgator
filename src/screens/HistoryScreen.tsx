import React, { useMemo } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  WeekTable,
  buildExerciseColumns,
  buildFoodColumns,
} from '../components/WeekTable';
import {
  getDayExercises,
  getDayRecord,
  sumExerciseDay,
  sumMealsDay,
} from '../storage/storage';
import { AppState } from '../types';
import { colors, MAX_MEALS, MAX_SETS } from '../theme/colors';
import { GAP } from '../theme/layout';
import { exerciseSessionAverage, foodDailyAverage } from '../utils/flaskMetrics';
import { buildHistoryWeeks } from '../utils/historyWeeks';

type Variant = 'exercise' | 'food';

interface HistoryScreenProps {
  variant: Variant;
  state: AppState;
  todayKey: string;
  onClose: () => void;
}

const TITLES: Record<Variant, string> = {
  exercise: 'ПОВТОРЫ — все недели',
  food: 'ГРАММЫ — все недели',
};

export function HistoryScreen({ variant, state, todayKey, onClose }: HistoryScreenProps) {
  const weeks = useMemo(
    () => buildHistoryWeeks(Object.keys(state.days)),
    [state.days],
  );

  const palette = variant === 'exercise' ? colors.exercise : colors.food;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: palette.primary }]}>{TITLES[variant]}</Text>
        <Text style={styles.meta}>
          {weeks.length} {weeks.length === 1 ? 'неделя' : weeks.length < 5 ? 'недели' : 'недель'} в памяти
        </Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {weeks.length === 0 ? (
          <Text style={styles.empty}>Пока нет записей</Text>
        ) : (
          weeks.map((week, idx) => {
            const prevWeek = weeks[idx + 1];
            let weekCompare: { current: number; previous: number } | undefined;

            if (prevWeek) {
              if (variant === 'exercise') {
                weekCompare = {
                  current: exerciseSessionAverage(state.days, week.weekKeys) ?? 0,
                  previous: exerciseSessionAverage(state.days, prevWeek.weekKeys) ?? 0,
                };
              } else {
                const current = foodDailyAverage(state.days, week.weekKeys);
                const previous = foodDailyAverage(state.days, prevWeek.weekKeys);
                weekCompare = {
                  current: current != null ? Math.floor(current) : 0,
                  previous: previous != null ? Math.floor(previous) : 0,
                };
              }
            }

            const weekExerciseData = week.weekKeys.map((key) => {
              const exercises = getDayExercises(getDayRecord(state, key));
              return { exercises, sum: sumExerciseDay(exercises) };
            });

            const weekFoodData = week.weekKeys.map((key) => {
              const record = getDayRecord(state, key);
              return { meals: record.meals, sum: sumMealsDay(record.meals) };
            });

            const columns =
              variant === 'exercise'
                ? buildExerciseColumns(weekExerciseData)
                : buildFoodColumns(weekFoodData);

            return (
              <View key={week.weekStartKey} style={styles.weekBlock}>
                <Text style={[styles.weekLabel, { color: palette.primary }]}>
                  {week.label}
                </Text>
                <WeekTable
                  variant={variant}
                  weekDays={week.weekDays}
                  todayKey={todayKey}
                  columns={columns}
                  maxRows={variant === 'exercise' ? MAX_SETS : MAX_MEALS}
                  weekCompare={weekCompare}
                />
              </View>
            );
          })
        )}
      </ScrollView>

      <Pressable style={styles.closeBtn} onPress={onClose}>
        <Text style={styles.closeText}>← Назад</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    paddingHorizontal: GAP,
    paddingTop: GAP,
    paddingBottom: GAP * 0.5,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  meta: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 4,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: GAP,
    gap: GAP,
    paddingBottom: GAP * 2,
  },
  weekBlock: {
    gap: 6,
  },
  weekLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    paddingHorizontal: 2,
  },
  empty: {
    color: colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
    marginTop: GAP * 2,
  },
  closeBtn: {
    paddingVertical: 14,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  closeText: {
    color: colors.exercise.primary,
    fontSize: 15,
    fontWeight: '600',
  },
});
