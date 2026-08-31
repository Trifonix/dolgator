import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ConfirmDialog } from './src/components/ConfirmDialog';
import { CounterControl } from './src/components/CounterControl';
import { ExerciseFlasks, FoodFlask } from './src/components/ProgressFlasks';
import { MobileScreen } from './src/components/MobileScreen';
import {
  WeekTable,
  buildExerciseColumns,
  buildFoodColumns,
} from './src/components/WeekTable';
import { useTableGestures } from './src/hooks/useTableGestures';
import { useTrackerData } from './src/hooks/useTrackerData';
import { ChangelogScreen } from './src/screens/ChangelogScreen';
import { DevTransferScreen } from './src/screens/DevTransferScreen';
import { HistoryScreen } from './src/screens/HistoryScreen';
import { OnboardingScreen } from './src/screens/OnboardingScreen';
import { colors, MAX_MEALS, MAX_SETS } from './src/theme/colors';
import { fullScreen, ANDROID_NAV_BAR_MIN, CENTER_CTRL_ROW_WIDTH, GAP } from './src/theme/layout';
import { APP_NAME, APP_VERSION, DEVELOPER_NAME, DEVELOPER_URL, formatLastCommit, LAST_COMMIT_AT } from './src/version';

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
  const insets = useSafeAreaInsets();
  const bottomInset =
    Platform.OS === 'android'
      ? Math.max(insets.bottom, ANDROID_NAV_BAR_MIN)
      : insets.bottom;
  const [dialog, setDialog] = useState<DialogState>(null);
  const [showChangelog, setShowChangelog] = useState(false);
  const [showDevTransfer, setShowDevTransfer] = useState(false);
  const [historyVariant, setHistoryVariant] = useState<TableVariant | null>(null);
  /** Секрет истории: 5 тапов верх → Нет → 5 тапов низ → Нет (только clear-диалоги) */
  const awaitingClearFoodNoRef = useRef(false);

  /** Секрет: 5 тапов по номеру версии → экран переноса данных */
  const versionExportTapsRef = useRef(0);

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

  const onVersionTap = useCallback(() => {
    versionExportTapsRef.current += 1;
    if (versionExportTapsRef.current < 5) return;
    versionExportTapsRef.current = 0;
    setShowDevTransfer(true);
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

  if (tracker.needsOnboarding) {
    return (
      <MobileScreen>
        <StatusBar style="light" />
        <OnboardingScreen onComplete={tracker.completeOnboarding} />
      </MobileScreen>
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

  if (showDevTransfer && tracker.appState) {
    return (
      <MobileScreen>
        <StatusBar style="light" />
        <DevTransferScreen
          state={tracker.appState}
          onApplied={tracker.applyImportedState}
          onClose={() => setShowDevTransfer(false)}
        />
      </MobileScreen>
    );
  }

  if (historyVariant && tracker.appState) {
    return (
      <MobileScreen>
        <StatusBar style="light" />
        <HistoryScreen
          variant={historyVariant}
          state={tracker.appState}
          todayKey={tracker.todayKey}
          onClose={() => setHistoryVariant(null)}
        />
      </MobileScreen>
    );
  }

  const exerciseColumns = buildExerciseColumns(tracker.weekExerciseData);
  const foodColumns = buildFoodColumns(tracker.weekFoodData);
  const ghostExerciseColumns = buildExerciseColumns(tracker.ghostExerciseData);
  const ghostFoodColumns = buildFoodColumns(tracker.ghostFoodData);

  return (
    <MobileScreen>
      <SafeAreaView
        style={[styles.safe, { paddingBottom: bottomInset }]}
        edges={['top']}
      >
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
              ghostColumns={ghostExerciseColumns}
              maxRows={MAX_SETS}
              weekCompare={{
                current: tracker.weekExerciseSessionAvg,
                previous: tracker.prevWeekExerciseSessionAvg,
              }}
              onTap={() => registerTap('exercise')}
              onLongPress={() => tracker.armExerciseUndo()}
              flex
            />
          </View>

          <View style={styles.centerBand}>
            <ExerciseFlasks
              fills={tracker.exerciseFlasks}
              onLongPress={() => setHistoryVariant('exercise')}
            />
            <View style={styles.centerColumn}>
              <CounterControl
                variant="exercise"
                accentPalette={tracker.exerciseAccent}
                value={tracker.exerciseCounter}
                onDecrement={() => tracker.adjustExercise(-1)}
                onIncrement={() => tracker.adjustExercise(1)}
                onValuePress={() => openSubmitDialog('exercise')}
                onUndoLast={() => tracker.undoLastExercise()}
                okMode={
                  tracker.exerciseUndoArmed
                    ? 'undo'
                    : tracker.isExerciseDayFullToday
                      ? 'disabled'
                      : 'active'
                }
                compact
              />
              <View style={styles.versionRow}>
                <Text style={[styles.versionAppName, styles.versionSlotStart]}>
                  {APP_NAME}
                </Text>
                <Pressable
                  style={[styles.versionPair, styles.versionSlotMid]}
                  onPress={onVersionTap}
                >
                  <Text style={styles.versionV}>v</Text>
                  <Text style={styles.versionNumber}>{APP_VERSION}</Text>
                </Pressable>
                <Text style={[styles.versionDate, styles.versionSlotMid]}>
                  {formatLastCommit(LAST_COMMIT_AT)}
                </Text>
                <Text
                  style={[styles.versionAuthor, styles.versionSlotEnd]}
                  onPress={() => Linking.openURL(DEVELOPER_URL)}
                >
                  {DEVELOPER_NAME}
                </Text>
              </View>
              <CounterControl
                variant="food"
                value={tracker.foodCounter}
                onDecrement={() => tracker.adjustFood(-10)}
                onIncrement={() => tracker.adjustFood(10)}
                onValuePress={() => openSubmitDialog('food')}
                onUndoLast={() => tracker.undoLastFood()}
                incrementDisabled={tracker.isFoodIncrementBlockedToday}
                okMode={
                  tracker.foodUndoArmed
                    ? 'undo'
                    : tracker.isFoodDayFullToday
                      ? 'disabled'
                      : 'active'
                }
                compact
              />
            </View>
            <FoodFlask
              fill={tracker.foodFlask}
              onLongPress={() => setHistoryVariant('food')}
            />
          </View>

          <View style={styles.half}>
            <WeekTable
              variant="food"
              weekDays={tracker.weekDays}
              todayKey={tracker.todayKey}
              columns={foodColumns}
              ghostColumns={ghostFoodColumns}
              maxRows={MAX_MEALS}
              weekCompare={{
                current: tracker.weekFoodDailyAvg,
                previous: tracker.prevWeekFoodDailyAvg,
              }}
              onTap={() => registerTap('food')}
              onLongPress={() => tracker.armFoodUndo()}
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
    gap: GAP,
    overflow: 'hidden',
  },
  half: {
    flex: 1,
    flexShrink: 1,
    minHeight: 0,
    overflow: 'hidden',
  },
  centerBand: {
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'space-between',
    flexGrow: 0,
    flexShrink: 0,
  },
  centerColumn: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 4,
  },
  versionRow: {
    width: CENTER_CTRL_ROW_WIDTH,
    flexDirection: 'row',
    alignItems: 'center',
    flexGrow: 0,
    flexShrink: 0,
    marginVertical: 2,
  },
  versionSlotStart: {
    flex: 1,
    textAlign: 'left',
  },
  versionSlotMid: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
  },
  versionSlotEnd: {
    flex: 1,
    textAlign: 'right',
  },
  versionAppName: {
    color: colors.brand.primary,
    fontSize: 9,
    fontWeight: '700',
  },
  versionPair: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  versionV: {
    color: '#ff8a3d',
    fontSize: 9,
    fontWeight: '700',
  },
  versionNumber: {
    color: '#f2f2f6',
    fontSize: 9,
    fontWeight: '700',
  },
  versionDate: {
    color: colors.textMuted,
    fontSize: 9,
    fontWeight: '500',
  },
  versionAuthor: {
    color: colors.intro.primary,
    fontSize: 9,
    fontWeight: '700',
  },
});
