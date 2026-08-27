import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
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
import { useTableGestures } from './src/hooks/useTableGestures';
import { useTrackerData } from './src/hooks/useTrackerData';
import { ChangelogScreen } from './src/screens/ChangelogScreen';
import { colors, MAX_MEALS, MAX_SETS } from './src/theme/colors';
import { fullScreen, GAP } from './src/theme/layout';
import { APP_VERSION, formatLastCommit, LAST_COMMIT_AT } from './src/version';

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
  const [showChangelog, setShowChangelog] = useState(false);
  /** Секрет истории: 5 тапов верх → Нет → 5 тапов низ → Нет (только clear-диалоги) */
  const awaitingClearFoodNoRef = useRef(false);

  const resetChangelogSequence = useCallback(() => {
    awaitingClearFoodNoRef.current = false;
  }, []);

  const openSubmitDialog = useCallback((variant: TableVariant) => {
    resetChangelogSequence();
    setDialog({ kind: 'submit', variant });
  }, [resetChangelogSequence]);

  const openClearDialog = useCallback((variant: TableVariant) => {
    setDialog({ kind: 'clear', variant });
  }, []);

  const { registerTap } = useTableGestures({ onClear: openClearDialog });

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
    resetChangelogSequence();
    if (dialog.kind === 'clear') {
      if (dialog.variant === 'exercise') tracker.clearTodayExercise();
      else tracker.clearTodayFood();
    } else {
      if (dialog.variant === 'exercise') tracker.submitExercise();
      else tracker.submitFood();
    }
    setDialog(null);
  }, [dialog, tracker, resetChangelogSequence]);

  const handleDialogCancel = useCallback(() => {
    if (!dialog) return;

    if (dialog.kind === 'clear') {
      if (dialog.variant === 'exercise') {
        awaitingClearFoodNoRef.current = true;
      } else if (dialog.variant === 'food' && awaitingClearFoodNoRef.current) {
        awaitingClearFoodNoRef.current = false;
        setDialog(null);
        setShowChangelog(true);
        return;
      } else {
        resetChangelogSequence();
      }
    } else {
      resetChangelogSequence();
    }

    setDialog(null);
  }, [dialog, resetChangelogSequence]);

  if (!tracker.ready) {
    return (
      <View style={[styles.loading, fullScreen]}>
        <ActivityIndicator size="large" color={colors.exercise.primary} />
      </View>
    );
  }

  if (showChangelog) {
    return (
      <MobileScreen>
        <StatusBar style="light" />
        <ChangelogScreen onClose={() => setShowChangelog(false)} />
      </MobileScreen>
    );
  }

  const exerciseColumns = buildExerciseColumns(tracker.weekExerciseData);
  const foodColumns = buildFoodColumns(tracker.weekFoodData);

  return (
    <MobileScreen>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <StatusBar style="light" />
        <View
          style={styles.main}
          pointerEvents={dialog !== null ? 'none' : 'auto'}
        >
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
              onValuePress={() => openSubmitDialog('exercise')}
              compact
            />
          </View>

          <View style={styles.versionRow}>
            <View style={styles.versionLine} />
            <Text style={styles.versionText} numberOfLines={1}>
              v{APP_VERSION} · {formatLastCommit(LAST_COMMIT_AT)}
            </Text>
            <View style={styles.versionLine} />
          </View>

          <View style={styles.half}>
            <CounterControl
              variant="food"
              value={tracker.foodCounter}
              onDecrement={() => tracker.adjustFood(-10)}
              onIncrement={() => tracker.adjustFood(10)}
              onValuePress={() => openSubmitDialog('food')}
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
          onCancel={handleDialogCancel}
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
  versionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: GAP,
    gap: 8,
  },
  versionLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
    opacity: 0.4,
  },
  versionText: {
    color: colors.textMuted,
    fontSize: 9,
    opacity: 0.5,
    flexShrink: 0,
  },
});
