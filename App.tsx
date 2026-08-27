import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { CounterControl } from './src/components/CounterControl';
import { MobileScreen } from './src/components/MobileScreen';
import {
  WeekTable,
  buildExerciseColumns,
  buildFoodColumns,
} from './src/components/WeekTable';
import { useTrackerData } from './src/hooks/useTrackerData';
import { colors, MAX_MEALS, MAX_SETS } from './src/theme/colors';
import { fullScreen, GAP } from './src/theme/layout';

export default function App() {
  return (
    <View style={fullScreen}>
      <SafeAreaProvider>
        <AppContent />
      </SafeAreaProvider>
    </View>
  );
}

function AppContent() {
  const tracker = useTrackerData();

  if (!tracker.ready) {
    return (
      <View style={[styles.loading, fullScreen]}>
        <ActivityIndicator size="large" color={colors.exercise.primary} />
      </View>
    );
  }

  const exerciseColumns = buildExerciseColumns(tracker.weekExerciseData);
  const foodColumns = buildFoodColumns(tracker.weekFoodData);

  return (
    <MobileScreen>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <StatusBar style="light" />
        <View style={styles.main}>
          {/* ── Упражнения ── */}
          <View style={styles.half}>
            <WeekTable
              variant="exercise"
              weekDays={tracker.weekDays}
              todayKey={tracker.todayKey}
              columns={exerciseColumns}
              maxRows={MAX_SETS}
              onPress={tracker.submitExercise}
              flex
            />
            <CounterControl
              variant="exercise"
              value={tracker.exerciseCounter}
              onDecrement={() => tracker.adjustExercise(-1)}
              onIncrement={() => tracker.adjustExercise(1)}
              compact
            />
          </View>

          <View style={styles.divider} />

          {/* ── Еда ── */}
          <View style={styles.half}>
            <CounterControl
              variant="food"
              value={tracker.foodCounter}
              onDecrement={() => tracker.adjustFood(-10)}
              onIncrement={() => tracker.adjustFood(10)}
              compact
            />
            <WeekTable
              variant="food"
              weekDays={tracker.weekDays}
              todayKey={tracker.todayKey}
              columns={foodColumns}
              maxRows={MAX_MEALS}
              onPress={tracker.submitFood}
              flex
            />
          </View>
        </View>
      </SafeAreaView>
    </MobileScreen>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  loading: {
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  main: {
    flex: 1,
    paddingHorizontal: GAP,
    paddingVertical: GAP,
    overflow: 'hidden',
  },
  half: {
    flex: 1,
    overflow: 'hidden',
    justifyContent: 'space-between',
    gap: GAP,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: GAP,
    opacity: 0.4,
  },
});
