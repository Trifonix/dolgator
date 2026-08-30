import React, { useCallback, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { CounterControl } from '../components/CounterControl';
import { TypewriterText } from '../components/TypewriterText';
import {
  WeekTable,
  buildExerciseColumns,
  buildFoodColumns,
} from '../components/WeekTable';
import { EXERCISE_LABELS, MAX_MEALS, MAX_SETS, colors } from '../theme/colors';
import { GAP } from '../theme/layout';
import { AppState, DayRecord, ExerciseColumns } from '../types';
import {
  getDayExercises,
  getDayRecord,
  inferCurrentExerciseIndex,
  isExerciseDayFull,
  sumExerciseDay,
  sumMealsDay,
} from '../storage/storage';
import { formatDateKey, getCurrentWeekDays, getPreviousWeekDays } from '../utils/dates';
import {
  DEFAULT_ONBOARDING_EXERCISE,
  DEFAULT_ONBOARDING_MEALS,
  PREV_WEEK_EXERCISE_COL,
  PREV_WEEK_FOOD_COL,
  buildOnboardingPreviewWeek,
  buildPreviousWeekSeed,
} from '../utils/onboardingSeed';

type Step = 'welcome' | 'exercise-intro' | 'exercise' | 'food-intro' | 'food';

const WELCOME_TITLE = 'Добро пожаловать!';
const WELCOME_P1 =
  'Вы установили автономное приложение для Android-телефона по подсчёту повторений в физических упражнениях и по подсчёту грамм в порциях еды за сегодняшний день.';
const WELCOME_P2 =
  'Сначала нужно ввести примерные значения за прошлую неделю — они станут ориентиром для плавного прогресса: больше повторений в тренировках и чуть меньше граммов в питании каждую неделю.';

function WelcomeStep({
  onTypingComplete,
  onStart,
  canStart,
  busy,
}: {
  onTypingComplete: () => void;
  onStart: () => void;
  canStart: boolean;
  busy: boolean;
}) {
  const [titleDone, setTitleDone] = useState(false);
  const [p1Done, setP1Done] = useState(false);

  return (
    <View style={styles.welcomeInner}>
      <TypewriterText
        text={WELCOME_TITLE}
        style={styles.leadCenter}
        speed={42}
        onComplete={() => setTitleDone(true)}
      />
      {titleDone ? (
        <TypewriterText
          text={WELCOME_P1}
          style={styles.paragraphCenter}
          speed={22}
          onComplete={() => setP1Done(true)}
        />
      ) : null}
      {p1Done ? (
        <>
          <Pressable
            style={[
              styles.welcomePrimaryBtn,
              (!canStart || busy) && styles.primaryBtnDisabled,
            ]}
            onPress={onStart}
            disabled={!canStart || busy}
          >
            <Text style={styles.primaryBtnText}>
              {canStart ? 'Начать' : '…'}
            </Text>
          </Pressable>
          <TypewriterText
            text={WELCOME_P2}
            style={styles.paragraphCenter}
            speed={22}
            onComplete={onTypingComplete}
          />
        </>
      ) : null}
    </View>
  );
}

interface OnboardingScreenProps {
  onComplete: (
    exercise: ExerciseColumns,
    meals: number[],
  ) => Promise<void>;
}

function cloneExercises(exercises: ExerciseColumns): ExerciseColumns {
  return [[...exercises[0]], [...exercises[1]], [...exercises[2]]];
}

function exerciseWeekDataFromSeed(
  weekKeys: string[],
  seed: Record<string, DayRecord>,
) {
  const pseudo: AppState = { days: seed } as AppState;
  return weekKeys.map((key) => {
    const record = getDayRecord(pseudo, key);
    const exercises = getDayExercises(record);
    return { exercises, sum: sumExerciseDay(exercises) };
  });
}

function foodWeekDataFromSeed(
  weekKeys: string[],
  seed: Record<string, DayRecord>,
) {
  const pseudo: AppState = { days: seed } as AppState;
  return weekKeys.map((key) => {
    const record = getDayRecord(pseudo, key);
    return { meals: record.meals, sum: sumMealsDay(record.meals) };
  });
}

export function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const [step, setStep] = useState<Step>('welcome');
  const [exerciseCounter, setExerciseCounter] = useState(4);
  const [foodCounter, setFoodCounter] = useState(250);
  const [exerciseDraft, setExerciseDraft] = useState<ExerciseColumns>([[], [], []]);
  const [exerciseIndex, setExerciseIndex] = useState<0 | 1 | 2>(0);
  const [mealsDraft, setMealsDraft] = useState<number[]>([]);
  const [confirmedExerciseDays, setConfirmedExerciseDays] = useState<ExerciseColumns[]>([]);
  const [confirmedMealDays, setConfirmedMealDays] = useState<number[][]>([]);
  const [pendingConfirm, setPendingConfirm] = useState<'exercise' | 'food' | null>(null);
  const [busy, setBusy] = useState(false);
  const [welcomeReady, setWelcomeReady] = useState(false);

  const prevWeekDays = useMemo(
    () => getPreviousWeekDays(getCurrentWeekDays()),
    [],
  );
  const prevWeekKeys = useMemo(
    () => prevWeekDays.map((d) => formatDateKey(d)),
    [prevWeekDays],
  );
  const todayKey = formatDateKey(new Date());

  const previewSeed = useMemo(
    () =>
      buildOnboardingPreviewWeek(
        prevWeekKeys,
        exerciseDraft,
        confirmedExerciseDays,
        mealsDraft,
        confirmedMealDays,
      ),
    [prevWeekKeys, exerciseDraft, confirmedExerciseDays, mealsDraft, confirmedMealDays],
  );

  const exercisePreview = useMemo(
    () => exerciseWeekDataFromSeed(prevWeekKeys, previewSeed),
    [prevWeekKeys, previewSeed],
  );
  const foodPreview = useMemo(
    () => foodWeekDataFromSeed(prevWeekKeys, previewSeed),
    [prevWeekKeys, previewSeed],
  );

  const exerciseFull = isExerciseDayFull(exerciseDraft);
  const mealsDone = mealsDraft.length >= 1;

  const applyExerciseExample = useCallback(() => {
    setExerciseDraft(cloneExercises(DEFAULT_ONBOARDING_EXERCISE));
    setExerciseIndex(2);
    setExerciseCounter(DEFAULT_ONBOARDING_EXERCISE[2][4]);
  }, []);

  const applyFoodExample = useCallback(() => {
    setMealsDraft([...DEFAULT_ONBOARDING_MEALS]);
    setFoodCounter(DEFAULT_ONBOARDING_MEALS[DEFAULT_ONBOARDING_MEALS.length - 1]);
  }, []);

  const submitExerciseSet = useCallback(() => {
    if (exerciseFull) return;
    setExerciseDraft((prev) => {
      const next = cloneExercises(prev);
      if (next[exerciseIndex].length >= MAX_SETS) return prev;
      next[exerciseIndex] = [...next[exerciseIndex], exerciseCounter];
      const newIdx = inferCurrentExerciseIndex(next);
      setExerciseIndex(newIdx);
      return next;
    });
  }, [exerciseCounter, exerciseFull, exerciseIndex]);

  const submitMeal = useCallback(() => {
    if (mealsDraft.length >= MAX_MEALS) return;
    setMealsDraft((prev) => [...prev, foodCounter]);
  }, [foodCounter, mealsDraft.length]);

  const finishExerciseStep = useCallback(() => {
    const template = exerciseFull
      ? exerciseDraft
      : cloneExercises(DEFAULT_ONBOARDING_EXERCISE);
    const fullSeed = buildPreviousWeekSeed(prevWeekKeys, template, []);
    const pseudo: AppState = { days: fullSeed } as AppState;
    const extraDays = PREV_WEEK_EXERCISE_COL.slice(1).map((colIdx) => {
      const key = prevWeekKeys[colIdx];
      return getDayExercises(getDayRecord(pseudo, key));
    });
    setConfirmedExerciseDays(extraDays);
    if (!exerciseFull) {
      setExerciseDraft(template);
      setExerciseIndex(2);
    }
    setStep('food-intro');
  }, [exerciseDraft, exerciseFull, prevWeekKeys]);

  const finishFoodStep = useCallback(async () => {
    const templateEx = exerciseFull
      ? exerciseDraft
      : cloneExercises(DEFAULT_ONBOARDING_EXERCISE);
    const templateMeals =
      mealsDraft.length > 0 ? mealsDraft : [...DEFAULT_ONBOARDING_MEALS];

    setBusy(true);
    try {
      await onComplete(templateEx, templateMeals);
    } finally {
      setBusy(false);
    }
  }, [exerciseDraft, exerciseFull, mealsDraft, onComplete]);

  const finishFoodPreview = useCallback(() => {
    const templateMeals =
      mealsDraft.length > 0 ? mealsDraft : [...DEFAULT_ONBOARDING_MEALS];
    const templateEx = exerciseFull
      ? exerciseDraft
      : cloneExercises(DEFAULT_ONBOARDING_EXERCISE);
    const fullSeed = buildPreviousWeekSeed(prevWeekKeys, templateEx, templateMeals);
    const pseudo: AppState = { days: fullSeed } as AppState;
    const extraMeals = PREV_WEEK_FOOD_COL.slice(1).map((colIdx) => {
      const key = prevWeekKeys[colIdx];
      return getDayRecord(pseudo, key).meals;
    });
    setConfirmedMealDays(extraMeals);
    if (mealsDraft.length === 0) {
      setMealsDraft(templateMeals);
    }
  }, [exerciseDraft, exerciseFull, mealsDraft, prevWeekKeys]);

  const renderBody = () => {
    switch (step) {
      case 'welcome':
        return (
          <WelcomeStep
            onTypingComplete={() => setWelcomeReady(true)}
            onStart={handlePrimary}
            canStart={welcomeReady}
            busy={busy}
          />
        );

      case 'exercise-intro':
        return (
          <>
            <Text style={styles.lead}>Повторения за прошлую неделю</Text>
            <Text style={styles.paragraph}>
              Сейчас нужно ввести примерные значения в 15 подходов (по 5 подходов в
              упражнении), которые вы сделали на прошлой неделе в один тренировочный
              день: ноги → грудь → спина.
            </Text>
            <Text style={styles.paragraphMuted}>
              Можно заполнить вручную через − / число / + и OK, либо нажать
              «Использовать пример» и сразу принять готовый вариант
              4-4-4-4-8 · 5-5-5-5-12 · 2-2-2-2-4.
            </Text>
          </>
        );

      case 'exercise':
        return (
          <>
            <Text style={styles.lead}>Прошлая неделя — повторения</Text>
            <Text style={styles.hint}>
              Сейчас: {EXERCISE_LABELS[exerciseIndex]} · подход{' '}
              {Math.min(exerciseDraft[exerciseIndex].length + 1, MAX_SETS)} из {MAX_SETS}
            </Text>
            <View style={styles.tableWrap}>
              <WeekTable
                variant="exercise"
                weekDays={prevWeekDays}
                todayKey={todayKey}
                columns={buildExerciseColumns(exercisePreview)}
                maxRows={MAX_SETS}
              />
            </View>
            <CounterControl
              variant="exercise"
              value={exerciseCounter}
              onDecrement={() => setExerciseCounter((v) => Math.max(0, v - 1))}
              onIncrement={() => setExerciseCounter((v) => v + 1)}
              onValuePress={() => setPendingConfirm('exercise')}
              onUndoLast={() => {}}
              onArmUndo={() => {}}
              okMode={exerciseFull ? 'disabled' : 'active'}
              compact
            />
            <Pressable style={styles.secondaryBtn} onPress={applyExerciseExample}>
              <Text style={styles.secondaryBtnText}>Использовать пример</Text>
            </Pressable>
          </>
        );

      case 'food-intro':
        return (
          <>
            <Text style={styles.lead}>Питание за прошлую неделю</Text>
            <Text style={styles.paragraph}>
              Теперь введите граммы за один день — до 5 приёмов пищи. Например:
              250-400-500. Эти данные размажутся по будням прошлой недели с небольшим
              разбросом ±10–20 г.
            </Text>
            <Text style={styles.paragraphMuted}>
              На этой неделе цель — чуть меньше прошлой: если за прошлую неделю
              выходило ~7000 г, стремитесь не превышать ~1000 г в день и снижать
              объём плавно: 6990 → 6980 → 6950…
            </Text>
          </>
        );

      case 'food':
        return (
          <>
            <Text style={styles.lead}>Прошлая неделя — питание</Text>
            <Text style={styles.hint}>
              Приём {Math.min(mealsDraft.length + 1, MAX_MEALS)} из {MAX_MEALS}
            </Text>
            <View style={styles.tableWrap}>
              <WeekTable
                variant="food"
                weekDays={prevWeekDays}
                todayKey={todayKey}
                columns={buildFoodColumns(foodPreview)}
                maxRows={MAX_MEALS}
              />
            </View>
            <CounterControl
              variant="food"
              value={foodCounter}
              onDecrement={() => setFoodCounter((v) => Math.max(0, v - 10))}
              onIncrement={() => setFoodCounter((v) => v + 10)}
              onValuePress={() => setPendingConfirm('food')}
              onUndoLast={() => {}}
              onArmUndo={() => {}}
              okMode={mealsDraft.length >= MAX_MEALS ? 'disabled' : 'active'}
              compact
            />
            <Pressable style={styles.secondaryBtn} onPress={applyFoodExample}>
              <Text style={styles.secondaryBtnText}>Использовать пример (250-400-500)</Text>
            </Pressable>
          </>
        );
    }
  };

  const primaryLabel = (() => {
    if (step === 'welcome') return 'Начать';
    if (step === 'exercise-intro') return 'К таблице повторений';
    if (step === 'exercise') return exerciseFull ? 'Далее — питание' : 'Принять пример и далее';
    if (step === 'food-intro') return 'К таблице питания';
    if (step === 'food') return mealsDone ? 'Завершить настройку' : 'Принять пример и завершить';
    return 'OK';
  })();

  const handlePrimary = () => {
    switch (step) {
      case 'welcome':
        setStep('exercise-intro');
        break;
      case 'exercise-intro':
        setStep('exercise');
        break;
      case 'exercise':
        finishExerciseStep();
        break;
      case 'food-intro':
        setStep('food');
        break;
      case 'food':
        finishFoodPreview();
        finishFoodStep();
        break;
    }
  };

  const confirmMessage =
    pendingConfirm === 'exercise'
      ? `Записать ${exerciseCounter} повторений?`
      : pendingConfirm === 'food'
        ? `Записать ${foodCounter} грамм?`
        : '';

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {step === 'welcome' ? (
        <View style={styles.welcomeContainer}>
          {renderBody()}
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {renderBody()}
        </ScrollView>
      )}

      {step !== 'welcome' ? (
        <Pressable
          style={[styles.primaryBtn, busy && styles.primaryBtnDisabled]}
          onPress={handlePrimary}
          disabled={busy}
        >
          <Text style={styles.primaryBtnText}>
            {busy ? 'Сохранение…' : primaryLabel}
          </Text>
        </Pressable>
      ) : null}

      <ConfirmDialog
        visible={pendingConfirm !== null}
        message={confirmMessage}
        variant={pendingConfirm ?? 'exercise'}
        onConfirm={() => {
          if (pendingConfirm === 'exercise') submitExerciseSet();
          if (pendingConfirm === 'food') submitMeal();
          setPendingConfirm(null);
        }}
        onCancel={() => setPendingConfirm(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: GAP,
    gap: GAP,
    paddingBottom: GAP * 2,
  },
  welcomeContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: GAP,
  },
  welcomeInner: {
    width: '100%',
    alignItems: 'center',
    gap: GAP * 0.75,
  },
  welcomePrimaryBtn: {
    alignSelf: 'center',
    minWidth: 160,
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 10,
    backgroundColor: colors.exercise.dim,
    alignItems: 'center',
    marginVertical: GAP * 0.25,
  },
  leadCenter: {
    color: colors.exercise.primary,
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 28,
    textAlign: 'center',
  },
  paragraphCenter: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
  },
  lead: {
    color: colors.exercise.primary,
    fontSize: 17,
    fontWeight: '800',
    lineHeight: 24,
  },
  paragraph: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 21,
  },
  paragraphMuted: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 20,
  },
  hint: {
    color: colors.food.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  tableWrap: {
    minHeight: 120,
  },
  secondaryBtn: {
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryBtnText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  primaryBtn: {
    margin: GAP,
    marginTop: 0,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: colors.exercise.dim,
    alignItems: 'center',
  },
  primaryBtnDisabled: {
    opacity: 0.6,
  },
  primaryBtnText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
});
