import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  LayoutChangeEvent,
  Pressable,
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
import { MAX_MEALS, MAX_SETS, colors } from '../theme/colors';
import { GAP } from '../theme/layout';
import { AppState, DayRecord, ExerciseColumns } from '../types';
import {
  getDayExercises,
  getDayRecord,
  isExerciseDayFull,
  sumExerciseDay,
  sumMealsDay,
} from '../storage/storage';
import { formatDateKey, getCurrentWeekDays, getPreviousWeekDays } from '../utils/dates';
import {
  DEFAULT_ONBOARDING_EXERCISE,
  DEFAULT_ONBOARDING_MEALS,
  EXAMPLE_EXERCISE_BASE,
  appendExerciseSetToExtraDay,
  buildOnboardingPreviewWeek,
  planExerciseExtraDaySets,
  randomizeExampleMeals,
  randomizeExampleSets,
} from '../utils/onboardingSeed';

type Step = 'welcome' | 'exercise-intro' | 'exercise' | 'food-intro' | 'food';
type ExtraBlock = { text: string; variant?: 'group' | 'note' };

const WELCOME_TITLE = 'Добро пожаловать!';
const WELCOME_P1 =
  'Вы установили автономное приложение для Android-телефона по подсчёту повторений в физических упражнениях и по подсчёту грамм в порциях еды за сегодняшний день.';
const WELCOME_P2 =
  'Сначала нужно ввести примерные значения за прошлую неделю — они станут ориентиром для плавного прогресса: больше повторений в тренировках и чуть меньше граммов в питании каждую неделю.';

const EXERCISE_INTRO_P1 =
  'Сейчас нужно ввести примерные значения в 15 подходах (по 5 подходов в упражнении), которые вы сделали на прошлой неделе в один тренировочный день:';
const EXERCISE_INTRO_GROUPS: ExtraBlock[] = [
  { text: 'Ноги (приседания)', variant: 'group' },
  { text: 'Грудные (отжимания)', variant: 'group' },
  { text: 'Спина (подтягивания)', variant: 'group' },
  { text: 'любые другие базовые упражнения', variant: 'note' },
];
const EXERCISE_INTRO_P2 =
  'Можно заполнить вручную через − / число / + и OK, либо нажать «Использовать пример» и принять готовый вариант.';

const FOOD_INTRO_P1 =
  'Сейчас нужно ввести примерные граммы за один день (до 5 приёмов пищи), которые вы ели на прошлой неделе:';
const FOOD_INTRO_GROUPS: ExtraBlock[] = [
  { text: 'Завтрак (например 250 г)', variant: 'group' },
  { text: 'Обед (например 400 г)', variant: 'group' },
  { text: 'Ужин (например 500 г)', variant: 'group' },
  { text: 'любые другие приёмы — размажутся по будням ±10–20 г', variant: 'note' },
];
const FOOD_INTRO_P2 =
  'На этой неделе цель — чуть меньше прошлой: если за прошлую неделю выходило ~7000 г, стремитесь не превышать ~1000 г в день и снижать объём плавно: 6990 → 6980 → 6950…';

const FILL_BTN_COLORS = ['#9c27b0', '#ec407a', '#5c6bc0'] as const;
const FILL_BTN_LABELS = ['НОГИ', 'ГРУДНЫЕ', 'СПИНА'] as const;
const INTRO_ACTS: Step[] = ['welcome', 'exercise-intro', 'food-intro'];
const MIN_FOOD_MEALS = 1;
const INTRO_FADE_MS = 320;
const SPREAD_STEP_MS = 260;

function IntroActStep({
  title,
  titleSecondLine,
  paragraph1,
  paragraph2,
  paragraph2Muted = false,
  extraBlocks,
  buttonLabel,
  accentColor = colors.intro.primary,
  titleColor,
  groupAccentColor,
  buttonColor = colors.intro.dim,
  darkLabel = false,
  onAction,
  onTypingComplete,
  canProceed,
  busy,
}: {
  title: string;
  titleSecondLine?: string;
  paragraph1: string;
  paragraph2: string;
  paragraph2Muted?: boolean;
  extraBlocks?: ExtraBlock[];
  buttonLabel: string;
  accentColor?: string;
  titleColor?: string;
  groupAccentColor?: string;
  buttonColor?: string;
  darkLabel?: boolean;
  onAction: () => void;
  onTypingComplete: () => void;
  canProceed: boolean;
  busy: boolean;
}) {
  const [title1Done, setTitle1Done] = useState(false);
  const [titleDone, setTitleDone] = useState(false);
  const [p1Done, setP1Done] = useState(false);
  const [blockDone, setBlockDone] = useState(0);
  const extraCount = extraBlocks?.length ?? 0;
  const extrasFinished = extraCount === 0 || blockDone >= extraCount;
  const showControls = p1Done && extrasFinished;
  const headingColor = titleColor ?? accentColor;
  const barColor = groupAccentColor ?? accentColor;

  return (
    <View style={styles.introInner}>
      <TypewriterText
        text={title}
        style={[styles.leadCenter, { color: headingColor }]}
        cursorColor={headingColor}
        speed={42}
        active
        onComplete={() => {
          if (titleSecondLine) setTitle1Done(true);
          else setTitleDone(true);
        }}
      />
      {titleSecondLine ? (
        <TypewriterText
          text={titleSecondLine}
          style={[styles.leadCenter, styles.leadSecondLine, { color: accentColor }]}
          cursorColor={accentColor}
          speed={42}
          active={title1Done}
          onComplete={() => setTitleDone(true)}
        />
      ) : null}
      <TypewriterText
        text={paragraph1}
        style={styles.paragraphCenter}
        cursorColor={accentColor}
        speed={22}
        active={titleDone}
        onComplete={() => setP1Done(true)}
      />
      {extraBlocks?.map((block, idx) => {
        const blockActive = p1Done && blockDone >= idx;
        return (
          <View
            key={block.text}
            style={[
              block.variant === 'note' ? styles.noteBlock : styles.groupBlock,
              block.variant !== 'note' && { borderLeftColor: barColor },
              !blockActive && styles.reservedHidden,
            ]}
          >
            <TypewriterText
              text={block.text}
              style={block.variant === 'note' ? styles.noteBlockText : styles.groupBlockText}
              cursorColor={accentColor}
              speed={28}
              active={blockActive}
              onComplete={() => setBlockDone((n) => Math.max(n, idx + 1))}
            />
          </View>
        );
      })}
      <Pressable
        style={[
          styles.introPrimaryBtn,
          { backgroundColor: buttonColor },
          (!showControls || !canProceed || busy) && styles.primaryBtnDisabled,
          !showControls && styles.introPrimaryBtnHidden,
        ]}
        onPress={onAction}
        disabled={!showControls || !canProceed || busy}
      >
        <Text style={[styles.primaryBtnText, darkLabel && styles.primaryBtnTextDark]}>
          {canProceed ? buttonLabel : '…'}
        </Text>
      </Pressable>
      <TypewriterText
        text={paragraph2}
        style={paragraph2Muted ? styles.paragraphCenterMuted : styles.paragraphCenter}
        cursorColor={accentColor}
        speed={22}
        active={showControls}
        onComplete={onTypingComplete}
      />
    </View>
  );
}

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
  return (
    <IntroActStep
      title={WELCOME_TITLE}
      paragraph1={WELCOME_P1}
      paragraph2={WELCOME_P2}
      buttonLabel="НАЧАТЬ"
      darkLabel
      onAction={onStart}
      onTypingComplete={onTypingComplete}
      canProceed={canStart}
      busy={busy}
    />
  );
}

function ExerciseIntroStep({
  onTypingComplete,
  onContinue,
  canContinue,
  busy,
}: {
  onTypingComplete: () => void;
  onContinue: () => void;
  canContinue: boolean;
  busy: boolean;
}) {
  return (
    <IntroActStep
      title="Повторения"
      titleSecondLine="за прошлую неделю"
      titleColor={colors.exercise.primary}
      groupAccentColor={colors.exercise.primary}
      paragraph1={EXERCISE_INTRO_P1}
      extraBlocks={EXERCISE_INTRO_GROUPS}
      paragraph2={EXERCISE_INTRO_P2}
      paragraph2Muted
      buttonLabel="ТАБЛИЦА"
      darkLabel
      onAction={onContinue}
      onTypingComplete={onTypingComplete}
      canProceed={canContinue}
      busy={busy}
    />
  );
}

function FoodIntroStep({
  onTypingComplete,
  onContinue,
  canContinue,
  busy,
}: {
  onTypingComplete: () => void;
  onContinue: () => void;
  canContinue: boolean;
  busy: boolean;
}) {
  return (
    <IntroActStep
      title="Питание"
      titleSecondLine="за прошлую неделю"
      titleColor={colors.food.primary}
      groupAccentColor={colors.food.primary}
      paragraph1={FOOD_INTRO_P1}
      extraBlocks={FOOD_INTRO_GROUPS}
      paragraph2={FOOD_INTRO_P2}
      paragraph2Muted
      buttonLabel="ТАБЛИЦА"
      darkLabel
      onAction={onContinue}
      onTypingComplete={onTypingComplete}
      canProceed={canContinue}
      busy={busy}
    />
  );
}

interface OnboardingScreenProps {
  onComplete: (
    exercise: ExerciseColumns,
    meals: number[],
    extraExerciseDays?: ExerciseColumns[],
    extraMealDays?: number[][],
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
  const [introReady, setIntroReady] = useState(false);
  const [tableReveal, setTableReveal] = useState(false);
  const [spreadBusy, setSpreadBusy] = useState(false);
  const introOpacity = useRef(new Animated.Value(1)).current;
  const introSlide = useRef(new Animated.Value(0)).current;
  const introTransitioning = useRef(false);
  const chromeOpacity = useRef(new Animated.Value(1)).current;
  const tableShift = useRef(new Animated.Value(0)).current;
  const tableScale = useRef(new Animated.Value(1)).current;
  const tableOpacity = useRef(new Animated.Value(1)).current;
  const revealTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const spreadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const workAreaH = useRef(0);
  const tableLayout = useRef({ y: 0, height: 100 });

  useEffect(() => {
    if (INTRO_ACTS.includes(step)) {
      setIntroReady(false);
    }
  }, [step]);

  useEffect(() => {
    return () => {
      if (revealTimerRef.current) clearTimeout(revealTimerRef.current);
      if (spreadTimerRef.current) clearTimeout(spreadTimerRef.current);
    };
  }, []);

  const goToStep = useCallback((next: Step, options?: { skipFadeOut?: boolean }) => {
    if (introTransitioning.current) return;
    introTransitioning.current = true;

    const fadeIn = () => {
      setStep(next);
      introSlide.setValue(22);
      introOpacity.setValue(0);
      Animated.parallel([
        Animated.timing(introOpacity, {
          toValue: 1,
          duration: INTRO_FADE_MS + 100,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(introSlide, {
          toValue: 0,
          duration: INTRO_FADE_MS + 100,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start(() => {
        introTransitioning.current = false;
      });
    };

    if (options?.skipFadeOut) {
      fadeIn();
      return;
    }

    Animated.parallel([
      Animated.timing(introOpacity, {
        toValue: 0,
        duration: INTRO_FADE_MS,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(introSlide, {
        toValue: -22,
        duration: INTRO_FADE_MS,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(fadeIn);
  }, [introOpacity, introSlide]);

  const pulseTableUpdate = useCallback(() => {
    tableOpacity.setValue(1);
    Animated.sequence([
      Animated.timing(tableOpacity, {
        toValue: 0.25,
        duration: 160,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(tableOpacity, {
        toValue: 1,
        duration: 520,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [tableOpacity]);

  const playTableReveal = useCallback((onDone: () => void) => {
    if (revealTimerRef.current) clearTimeout(revealTimerRef.current);

    const { y, height } = tableLayout.current;
    const areaH = workAreaH.current || 640;
    const delta = areaH / 2 - (y + height / 2);

    chromeOpacity.setValue(1);
    tableShift.setValue(0);
    tableScale.setValue(1);
    tableOpacity.setValue(1);
    setTableReveal(true);

    Animated.parallel([
      Animated.timing(chromeOpacity, {
        toValue: 0,
        duration: 560,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(tableShift, {
        toValue: delta,
        duration: 820,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(tableScale, {
        toValue: 1.05,
        duration: 820,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    revealTimerRef.current = setTimeout(() => {
      Animated.timing(tableOpacity, {
        toValue: 0,
        duration: 450,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start(() => {
        setTableReveal(false);
        chromeOpacity.setValue(1);
        tableShift.setValue(0);
        tableScale.setValue(1);
        tableOpacity.setValue(1);
        onDone();
      });
    }, 2800);
  }, [chromeOpacity, tableShift, tableScale, tableOpacity]);

  const onWorkAreaLayout = useCallback((e: LayoutChangeEvent) => {
    workAreaH.current = e.nativeEvent.layout.height;
  }, []);

  const onTableLayout = useCallback((e: LayoutChangeEvent) => {
    const { y, height } = e.nativeEvent.layout;
    tableLayout.current = { y, height };
  }, []);

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

  const currentSetsCount = exerciseDraft[exerciseIndex].length;
  const currentExerciseReady = currentSetsCount >= MAX_SETS;
  const exerciseFull = isExerciseDayFull(exerciseDraft);

  const applyExerciseExample = useCallback(() => {
    const sets = randomizeExampleSets(EXAMPLE_EXERCISE_BASE);
    setExerciseDraft((prev) => {
      const next = cloneExercises(prev);
      next[exerciseIndex] = sets;
      return next;
    });
    setExerciseCounter(sets[sets.length - 1] ?? sets[0] ?? 6);
  }, [exerciseIndex]);

  const applyFoodExample = useCallback(() => {
    const monday = randomizeExampleMeals();
    setMealsDraft(monday);
    setConfirmedMealDays([]);
    setFoodCounter(monday[monday.length - 1] ?? 250);
  }, []);

  const submitExerciseSet = useCallback(() => {
    if (currentExerciseReady) return;
    setExerciseDraft((prev) => {
      const next = cloneExercises(prev);
      if (next[exerciseIndex].length >= MAX_SETS) return prev;
      next[exerciseIndex] = [...next[exerciseIndex], exerciseCounter];
      return next;
    });
  }, [exerciseCounter, currentExerciseReady, exerciseIndex]);

  const submitMeal = useCallback(() => {
    if (mealsDraft.length >= MAX_MEALS) return;
    setMealsDraft((prev) => [...prev, foodCounter]);
  }, [foodCounter, mealsDraft.length]);

  const confirmCurrentExercise = useCallback(() => {
    if (tableReveal || spreadBusy) return;
    if (exerciseDraft[exerciseIndex].length < MAX_SETS) return;

    const monday = exerciseDraft[exerciseIndex];
    const planned = planExerciseExtraDaySets(monday);
    const idx = exerciseIndex;
    const steps: { day: 0 | 1; value: number }[] = [];
    for (let setIdx = 0; setIdx < monday.length; setIdx++) {
      steps.push({ day: 0, value: planned.wed[setIdx] });
      steps.push({ day: 1, value: planned.fri[setIdx] });
    }

    setSpreadBusy(true);

    let stepI = 0;
    const runStep = () => {
      if (stepI >= steps.length) {
        setSpreadBusy(false);
        if (idx < 2) {
          const nextIdx = (idx + 1) as 0 | 1 | 2;
          setExerciseIndex(nextIdx);
          const example = DEFAULT_ONBOARDING_EXERCISE[nextIdx];
          setExerciseCounter(example[0] ?? 5);
          return;
        }
        requestAnimationFrame(() => {
          setTimeout(() => {
            playTableReveal(() => goToStep('food-intro', { skipFadeOut: true }));
          }, 420);
        });
        return;
      }
      const stepItem = steps[stepI];
      stepI += 1;
      setConfirmedExerciseDays((prev) =>
        appendExerciseSetToExtraDay(prev, stepItem.day, idx, stepItem.value),
      );
      spreadTimerRef.current = setTimeout(runStep, SPREAD_STEP_MS);
    };
    runStep();
  }, [
    exerciseDraft,
    exerciseIndex,
    tableReveal,
    spreadBusy,
    playTableReveal,
    goToStep,
  ]);

  const finishFoodStep = useCallback(async (extraMeals?: number[][]) => {
    const templateEx = exerciseFull
      ? exerciseDraft
      : cloneExercises(DEFAULT_ONBOARDING_EXERCISE);
    const templateMeals =
      mealsDraft.length > 0 ? mealsDraft : [...DEFAULT_ONBOARDING_MEALS];
    const extra = extraMeals ?? confirmedMealDays;

    setBusy(true);
    try {
      await onComplete(templateEx, templateMeals, confirmedExerciseDays, extra);
    } finally {
      setBusy(false);
    }
  }, [exerciseDraft, exerciseFull, mealsDraft, onComplete, confirmedExerciseDays, confirmedMealDays]);

  const confirmFoodDay = useCallback(() => {
    if (tableReveal) return;
    if (mealsDraft.length < MIN_FOOD_MEALS || mealsDraft.length > MAX_MEALS) return;

    const extra = Array.from({ length: 6 }, () => randomizeExampleMeals());
    setConfirmedMealDays(extra);
    pulseTableUpdate();
    // Дать таблице отрисовать новые дни, затем reveal в центр
    requestAnimationFrame(() => {
      setTimeout(() => {
        playTableReveal(() => {
          introOpacity.setValue(0);
          void finishFoodStep(extra);
        });
      }, 560);
    });
  }, [
    tableReveal,
    mealsDraft.length,
    playTableReveal,
    finishFoodStep,
    introOpacity,
    pulseTableUpdate,
  ]);

  const renderIntroAct = () => {
    if (step === 'welcome') {
      return (
        <WelcomeStep
          onTypingComplete={() => setIntroReady(true)}
          onStart={() => goToStep('exercise-intro')}
          canStart={introReady}
          busy={busy}
        />
      );
    }
    if (step === 'exercise-intro') {
      return (
        <ExerciseIntroStep
          onTypingComplete={() => setIntroReady(true)}
          onContinue={() => goToStep('exercise')}
          canContinue={introReady}
          busy={busy}
        />
      );
    }
    return (
      <FoodIntroStep
        onTypingComplete={() => setIntroReady(true)}
        onContinue={() => goToStep('food')}
        canContinue={introReady}
        busy={busy}
      />
    );
  };

  const renderBody = () => {
    switch (step) {
      case 'welcome':
      case 'exercise-intro':
      case 'food-intro':
        return renderIntroAct();

      case 'exercise':
        return (
          <View
            style={styles.workInner}
            onLayout={onWorkAreaLayout}
          >
            <Animated.View
              style={[styles.chromeBlock, { opacity: chromeOpacity }]}
              pointerEvents={tableReveal ? 'none' : 'auto'}
            >
              <Text style={[styles.leadCenter, { color: colors.intro.primary }]}>
                Прошлая неделя —{'\n'}
                <Text style={{ color: colors.exercise.primary }}>повторения</Text>
              </Text>
              <Text style={[styles.hintCenter, { color: colors.intro.primary }]}>
                Сейчас:{' '}
                <Text style={{ color: colors.exercise.primary }}>
                  {FILL_BTN_LABELS[exerciseIndex]}
                </Text>
                {' · '}
                {currentExerciseReady
                  ? `5 из ${MAX_SETS} — нажмите ЗАПОЛНИЛ`
                  : `подход ${currentSetsCount + 1} из ${MAX_SETS}`}
              </Text>
            </Animated.View>

            <Animated.View
              onLayout={onTableLayout}
              style={[
                styles.tableWrapCompact,
                {
                  opacity: tableOpacity,
                  transform: [{ translateY: tableShift }, { scale: tableScale }],
                },
              ]}
            >
              <WeekTable
                variant="exercise"
                weekDays={prevWeekDays}
                todayKey={todayKey}
                columns={buildExerciseColumns(exercisePreview)}
                maxRows={MAX_SETS}
              />
            </Animated.View>

            <Animated.View
              style={[styles.chromeBlock, { opacity: chromeOpacity }]}
              pointerEvents={tableReveal ? 'none' : 'auto'}
            >
              <CounterControl
                variant="exercise"
                value={exerciseCounter}
                onDecrement={() => setExerciseCounter((v) => Math.max(0, v - 1))}
                onIncrement={() => setExerciseCounter((v) => v + 1)}
                onValuePress={() => setPendingConfirm('exercise')}
                onUndoLast={() => {}}
                onArmUndo={() => {}}
                okMode={currentExerciseReady || tableReveal || spreadBusy ? 'disabled' : 'active'}
                compact
              />
              <Pressable
                style={[
                  styles.introPrimaryBtn,
                  { backgroundColor: FILL_BTN_COLORS[exerciseIndex] },
                  (!currentExerciseReady || tableReveal || spreadBusy) && styles.primaryBtnDisabled,
                ]}
                onPress={confirmCurrentExercise}
                disabled={!currentExerciseReady || busy || tableReveal || spreadBusy}
              >
                <Text style={styles.primaryBtnText}>ЗАПОЛНИЛ</Text>
              </Pressable>
              <Pressable
                style={styles.secondaryBtn}
                onPress={applyExerciseExample}
                disabled={tableReveal || spreadBusy}
              >
                <Text style={styles.secondaryBtnText}>
                  Использовать{' '}
                  <Text style={{ color: colors.intro.primary }}>пример</Text>
                </Text>
              </Pressable>
            </Animated.View>
          </View>
        );

      case 'food':
        return (
          <View
            style={styles.workInner}
            onLayout={onWorkAreaLayout}
          >
            <Animated.View
              style={[styles.chromeBlock, { opacity: chromeOpacity }]}
              pointerEvents={tableReveal ? 'none' : 'auto'}
            >
              <Text style={[styles.leadCenter, { color: colors.intro.primary }]}>
                Прошлая неделя —{'\n'}
                <Text style={{ color: colors.food.primary }}>питание</Text>
              </Text>
              {mealsDraft.length >= MIN_FOOD_MEALS ? (
                <Text style={[styles.hintCenter, { color: colors.intro.primary }]}>
                  <Text style={{ color: colors.food.primary }}>
                    {mealsDraft.length} приём
                    {mealsDraft.length === 1 ? '' : mealsDraft.length < 5 ? 'а' : 'ов'}
                  </Text>
                  {' — нажмите ЗАПОЛНИЛ'}
                </Text>
              ) : (
                <Text style={[styles.hintCenter, { color: colors.intro.primary }]}>
                  Приём{' '}
                  <Text style={{ color: colors.food.primary }}>
                    {Math.min(mealsDraft.length + 1, MAX_MEALS)} из {MAX_MEALS}
                  </Text>
                </Text>
              )}
            </Animated.View>

            <Animated.View
              onLayout={onTableLayout}
              style={[
                styles.tableWrapCompact,
                {
                  opacity: tableOpacity,
                  transform: [{ translateY: tableShift }, { scale: tableScale }],
                },
              ]}
            >
              <WeekTable
                variant="food"
                weekDays={prevWeekDays}
                todayKey={todayKey}
                columns={buildFoodColumns(foodPreview)}
                maxRows={MAX_MEALS}
              />
            </Animated.View>

            <Animated.View
              style={[styles.chromeBlock, { opacity: chromeOpacity }]}
              pointerEvents={tableReveal ? 'none' : 'auto'}
            >
              <CounterControl
                variant="food"
                value={foodCounter}
                onDecrement={() => setFoodCounter((v) => Math.max(0, v - 10))}
                onIncrement={() => setFoodCounter((v) => v + 10)}
                onValuePress={() => setPendingConfirm('food')}
                onUndoLast={() => {}}
                onArmUndo={() => {}}
                okMode={mealsDraft.length >= MAX_MEALS || tableReveal ? 'disabled' : 'active'}
                compact
              />
              <Pressable
                style={[
                  styles.introPrimaryBtn,
                  { backgroundColor: colors.food.dim },
                  (mealsDraft.length < MIN_FOOD_MEALS || tableReveal) && styles.primaryBtnDisabled,
                ]}
                onPress={confirmFoodDay}
                disabled={mealsDraft.length < MIN_FOOD_MEALS || busy || tableReveal}
              >
                <Text style={styles.primaryBtnText}>ЗАПОЛНИЛ</Text>
              </Pressable>
              <Pressable
                style={styles.secondaryBtn}
                onPress={applyFoodExample}
                disabled={tableReveal}
              >
                <Text style={styles.secondaryBtnText}>
                  Использовать{' '}
                  <Text style={{ color: colors.intro.primary }}>пример</Text>
                </Text>
              </Pressable>
            </Animated.View>
          </View>
        );
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
      <View style={styles.introContainer}>
        <Animated.View
          key={step}
          style={[
            styles.stepFrame,
            (step === 'exercise' || step === 'food') && styles.stepFrameFill,
            {
              opacity: introOpacity,
              transform: [{ translateY: introSlide }],
            },
          ]}
        >
          {renderBody()}
        </Animated.View>
      </View>

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
  introContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: GAP,
  },
  stepFrame: {
    width: '100%',
  },
  stepFrameFill: {
    flex: 1,
  },
  introInner: {
    width: '100%',
    alignItems: 'center',
    gap: GAP * 0.75,
  },
  workInner: {
    width: '100%',
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: GAP,
    paddingVertical: GAP,
  },
  chromeBlock: {
    width: '100%',
    alignItems: 'center',
    gap: GAP * 0.55,
  },
  tableWrapCompact: {
    width: '100%',
    minHeight: 96,
  },
  introPrimaryBtn: {
    alignSelf: 'center',
    minWidth: 160,
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 10,
    backgroundColor: colors.intro.dim,
    alignItems: 'center',
    marginVertical: GAP * 0.25,
  },
  introPrimaryBtnHidden: {
    opacity: 0,
  },
  reservedHidden: {
    opacity: 0,
  },
  leadCenter: {
    color: colors.intro.primary,
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 28,
    textAlign: 'center',
  },
  leadSecondLine: {
    fontSize: 18,
    marginTop: -4,
  },
  paragraphCenter: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
  },
  paragraphCenterMuted: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
  },
  groupBlock: {
    alignSelf: 'stretch',
    backgroundColor: colors.bgCard,
    borderLeftWidth: 3,
    borderLeftColor: colors.intro.primary,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  groupBlockText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
    textAlign: 'left',
  },
  noteBlock: {
    alignSelf: 'stretch',
    paddingVertical: 2,
    paddingHorizontal: 12,
  },
  noteBlockText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '400',
    fontStyle: 'italic',
    lineHeight: 18,
    textAlign: 'left',
  },
  lead: {
    color: colors.intro.primary,
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
  hintCenter: {
    color: colors.food.primary,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
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
  primaryBtnTextDark: {
    color: '#1a1608',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
});
