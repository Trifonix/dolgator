import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { ConfirmDialog } from './src/components/ConfirmDialog';
import { CounterControl } from './src/components/CounterControl';
import { MobileScreen } from './src/components/MobileScreen';
import {
  WeekTable,
  buildExerciseColumns,
  buildFoodColumns,
} from './src/components/WeekTable';
import { useTableClearGesture } from './src/hooks/useTableClearGesture';
import { useTrackerData } from './src/hooks/useTrackerData';
import { colors, MAX_MEALS, MAX_SETS } from './src/theme/colors';
import { fullScreen, GAP } from './src/theme/layout';

type TableVariant = 'exercise' | 'food';

type DialogState =
  | { kind: 'submit'; variant: TableVariant }
  | { kind: 'clear'; variant: TableVariant }
  | null;

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
  const [dialog, setDialog] = useState<DialogState>(null);

  const { registerTap } = useTableClearGesture((variant) => {
    setDialog({ kind: 'clear', variant });
  });

  const dialogMessage = useMemo(() => {
    if (!dialog) return '';
    if (dialog.kind === 'clear') {
      return 'Очистить данные в этой таблице за сегодня?';
    }
    if (dialog.variant === 'exercise') {
      return `Вы сделали ${tracker.exerciseCounter} повторений?`;
    }
    return `Вы съели ${tracker.foodCounter} грамм?`;
  }, [dialog, tracker.exerciseCounter, tracker.foodCounter]);

  const handleDialogConfirm = useCallback(() => {
    if (!dialog) return;
    if (dialog.kind === 'clear') {
      if (dialog.variant === 'exercise') tracker.clearTodayExercise();
      else tracker.clearTodayFood();
    } else {
      if (dialog.variant === 'exercise') tracker.submitExercise();
      else tracker.submitFood();
    }
    setDialog(null);
  }, [dialog, tracker]);

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
          <View style={styles.half}>
            <WeekTable
              variant="exercise"
              weekDays={tracker.weekDays}
              todayKey={tracker.todayKey}
              columns={exerciseColumns}
              maxRows={MAX_SETS}
              onTap={() => registerTap('exercise')}
              flex
            />
            <CounterControl
              variant="exercise"
              value={tracker.exerciseCounter}
              onDecrement={() => tracker.adjustExercise(-1)}
              onIncrement={() => tracker.adjustExercise(1)}
              onValuePress={() => setDialog({ kind: 'submit', variant: 'exercise' })}
              compact
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.half}>
            <CounterControl
              variant="food"
              value={tracker.foodCounter}
              onDecrement={() => tracker.adjustFood(-10)}
              onIncrement={() => tracker.adjustFood(10)}
              onValuePress={() => setDialog({ kind: 'submit', variant: 'food' })}
              compact
            />
            <WeekTable
              variant="food"
              weekDays={tracker.weekDays}
              todayKey={tracker.todayKey}
              columns={foodColumns}
              maxRows={MAX_MEALS}
              onTap={() => registerTap('food')}
              flex
            />
          </View>
        </View>

        <ConfirmDialog
          visible={dialog !== null}
          message={dialogMessage}
          variant={dialog?.variant ?? 'exercise'}
          onConfirm={handleDialogConfirm}
          onCancel={() => setDialog(null)}
        />
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
