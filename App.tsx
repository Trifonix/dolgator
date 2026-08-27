import React from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { CounterControl } from './src/components/CounterControl';
import {
  WeekTable,
  buildExerciseColumns,
  buildFoodColumns,
} from './src/components/WeekTable';
import { useTrackerData } from './src/hooks/useTrackerData';
import { colors, MAX_MEALS, MAX_SETS } from './src/theme/colors';

export default function App() {
  return (
    <SafeAreaProvider>
      <AppContent />
    </SafeAreaProvider>
  );
}

function AppContent() {
  const tracker = useTrackerData();

  if (!tracker.ready) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.exercise.primary} />
      </View>
    );
  }

  const exerciseColumns = buildExerciseColumns(tracker.weekExerciseData);
  const foodColumns = buildFoodColumns(tracker.weekFoodData);

  const draftHint = tracker.currentSetDraft
    .map((v, i) => (i === tracker.currentExerciseIndex ? '?' : v))
    .join(' ');

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Упражнения ── */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.exercise.primary }]}>
            Повторения
          </Text>

          <WeekTable
            variant="exercise"
            weekDays={tracker.weekDays}
            todayKey={tracker.todayKey}
            columns={exerciseColumns}
            maxRows={MAX_SETS}
            onPress={tracker.submitExercise}
            hint="нажми таблицу — записать подход (ОК)"
          />

          <CounterControl
            variant="exercise"
            value={tracker.exerciseCounter}
            onDecrement={() => tracker.adjustExercise(-1)}
            onIncrement={() => tracker.adjustExercise(1)}
            subtitle={`${tracker.currentExerciseLabel} · подход ${tracker.todaySetsCount + 1} · [${draftHint}]`}
          />

          {tracker.todaySetsCount >= MAX_SETS && (
            <Text style={styles.limitText}>
              Лимит подходов на сегодня ({MAX_SETS})
            </Text>
          )}
        </View>

        <View style={styles.divider} />

        {/* ── Еда ── */}
        <View style={styles.section}>
          <CounterControl
            variant="food"
            value={tracker.foodCounter}
            onDecrement={() => tracker.adjustFood(-10)}
            onIncrement={() => tracker.adjustFood(10)}
            subtitle={`приём ${tracker.todayMealsCount + 1} · граммы`}
          />

          <WeekTable
            variant="food"
            weekDays={tracker.weekDays}
            todayKey={tracker.todayKey}
            columns={foodColumns}
            maxRows={MAX_MEALS}
            onPress={tracker.submitFood}
            hint="нажми таблицу — записать приём (ОК)"
          />

          {tracker.todayMealsCount >= MAX_MEALS && (
            <Text style={styles.limitText}>
              Лимит приёмов пищи на сегодня ({MAX_MEALS})
            </Text>
          )}
        </View>

        <Text style={styles.footer}>
          неделя · данные сохраняются на телефоне
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  loading: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    paddingHorizontal: 12,
    paddingBottom: 24,
    gap: 4,
  },
  section: {
    gap: 4,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
    textAlign: 'center',
    marginBottom: 4,
    textShadowColor: colors.exercise.glow,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 12,
    opacity: 0.5,
  },
  limitText: {
    textAlign: 'center',
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 4,
  },
  footer: {
    textAlign: 'center',
    color: colors.textMuted,
    fontSize: 10,
    marginTop: 16,
    opacity: 0.5,
  },
});
