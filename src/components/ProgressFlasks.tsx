import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { fonts } from '../theme/fonts';
import {
  FLASK_EXERCISE_WIDTH,
  FLASK_FOOD_WIDTH,
  FLASK_HEIGHT,
} from '../theme/layout';
import { flaskPulseAccent, EXERCISE_BAND_LOW, EXERCISE_MARK_RATIO, FOOD_MARK_RATIO, type FlaskFill, type FlaskKind, type FoodFlaskFill } from '../utils/flaskMetrics';

const TICK_GUTTER = 6;
const PX = 2;
const YEL = '#ffe566';
const TAN = '#c4a035';

function useFillHeight(ratio: number, maxPx: number) {
  const clamped = Math.min(1, Math.max(0, ratio));
  const anim = useRef(new Animated.Value(clamped)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: clamped,
      duration: 380,
      useNativeDriver: false,
    }).start();
  }, [anim, clamped]);

  const extra = maxPx > 0 ? 3 : 0;
  return anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, maxPx + extra],
  });
}

const PULSE_HOLD_MS = 3000;
const PULSE_FLASH_MS = 1000;

function useSmoothPulse(active: boolean, phaseDelayMs: number) {
  const mix = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    mix.stopAnimation();
    mix.setValue(0);
    if (!active) return;

    const flash = Animated.sequence([
      Animated.timing(mix, {
        toValue: 1,
        duration: PULSE_FLASH_MS / 2,
        easing: Easing.out(Easing.sin),
        useNativeDriver: false,
      }),
      Animated.timing(mix, {
        toValue: 0,
        duration: PULSE_FLASH_MS / 2,
        easing: Easing.in(Easing.sin),
        useNativeDriver: false,
      }),
    ]);
    const beat = Animated.loop(
      Animated.sequence([Animated.delay(PULSE_HOLD_MS), flash]),
    );
    const run = Animated.sequence([Animated.delay(phaseDelayMs % 500), beat]);
    run.start();
    return () => {
      run.stop();
      beat.stop();
      mix.setValue(0);
    };
  }, [active, mix, phaseDelayMs]);

  return mix;
}

const WAVE_BARS = 10;
const WAVE_PERIOD_MS = 3200;
/** Ровно один период sin — без скачка при Animated.loop */
const WAVE_OMEGA = Math.PI * 2;

function waveBarHeight(phase: Animated.Value, barIndex: number) {
  const steps = 24;
  const inputRange: number[] = [];
  const outputRange: number[] = [];
  for (let s = 0; s <= steps; s += 1) {
    const t = s / steps;
    inputRange.push(t);
    const rad = t * WAVE_OMEGA + barIndex * 0.78;
    outputRange.push(1.4 + 2.8 * (0.5 + 0.5 * Math.sin(rad)));
  }
  return phase.interpolate({ inputRange, outputRange });
}

function WaveSurface({
  active,
  delayMs,
  color,
}: {
  active: boolean;
  delayMs: number;
  color: Animated.AnimatedInterpolation<string | number>;
}) {
  const phase = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    phase.stopAnimation();
    phase.setValue(0);
    if (!active) return;

    const beat = Animated.loop(
      Animated.timing(phase, {
        toValue: 1,
        duration: WAVE_PERIOD_MS,
        easing: Easing.linear,
        useNativeDriver: false,
      }),
    );
    const run = Animated.sequence([Animated.delay(delayMs % 500), beat]);
    run.start();
    return () => {
      run.stop();
      beat.stop();
      phase.setValue(0);
    };
  }, [active, delayMs, phase]);

  if (!active) return null;

  return (
    <View style={styles.waveClip} pointerEvents="none">
      <View style={styles.waveRow}>
        {Array.from({ length: WAVE_BARS }, (_, i) => (
          <Animated.View
            key={i}
            style={[
              styles.waveBar,
              i > 0 && styles.waveBarOverlap,
              { height: waveBarHeight(phase, i), backgroundColor: color },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

function PulseLiquid({
  kind,
  fillRatio,
  height,
  phaseDelayMs = 0,
  pulseRatio,
}: {
  kind: FlaskKind;
  fillRatio: number;
  height: Animated.AnimatedInterpolation<string | number>;
  phaseDelayMs?: number;
  pulseRatio?: number;
}) {
  const mix = useSmoothPulse(fillRatio > 0, phaseDelayMs);
  const accent = flaskPulseAccent(kind, pulseRatio ?? fillRatio);
  const backgroundColor = mix.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.flaskLiquid, accent],
  });

  return (
    <Animated.View style={[styles.liquid, { height }]}>
      <Animated.View style={[styles.liquidFill, { backgroundColor }]} />
      <WaveSurface
        active={fillRatio > 0.04}
        delayMs={phaseDelayMs}
        color={backgroundColor}
      />
    </Animated.View>
  );
}

function SideNotch({
  side,
  markRatio,
  hasBaseline,
  flaskHeight,
}: {
  side: 'left' | 'right';
  markRatio: number;
  hasBaseline: boolean;
  flaskHeight: number;
}) {
  if (!hasBaseline) return null;
  const h = flaskHeight > 0 ? flaskHeight : FLASK_HEIGHT;
  const notchH = PX * 3;
  const bottom = Math.min(
    h - notchH,
    Math.max(2, h * markRatio - PX * 1.5),
  );
  const isLeft = side === 'left';

  return (
    <View
      pointerEvents="none"
      style={[
        styles.notch,
        { bottom },
        isLeft ? { left: TICK_GUTTER - PX * 2 } : { right: TICK_GUTTER - PX * 2 },
        { flexDirection: isLeft ? 'row-reverse' : 'row' },
      ]}
    >
      <View>
        <View style={[styles.px, { backgroundColor: TAN }]} />
        <View style={[styles.px, { backgroundColor: YEL }]} />
        <View style={[styles.px, { backgroundColor: TAN }]} />
      </View>
      <View style={styles.notchInner}>
        <View style={[styles.px, { backgroundColor: YEL }]} />
      </View>
    </View>
  );
}

function ChamberLiquid({ fill, phaseIndex }: { fill: FlaskFill; phaseIndex: number }) {
  const [h, setH] = useState(0);
  const fillHeight = useFillHeight(fill.fillRatio, h);

  return (
    <View
      style={styles.chamber}
      onLayout={(e) => setH(Math.ceil(e.nativeEvent.layout.height))}
    >
      <PulseLiquid
        kind="exercise"
        fillRatio={fill.fillRatio}
        height={fillHeight}
        phaseDelayMs={phaseIndex * 1200}
      />
    </View>
  );
}

function FlaskCaption({ word, color }: { word: string; color: string }) {
  const [h, setH] = useState(FLASK_HEIGHT);
  const letters = Array.from(word);
  const fontSize = Math.min(13, Math.max(8, Math.floor(h / letters.length) - 1));

  return (
    <View
      style={styles.caption}
      pointerEvents="none"
      onLayout={(e) => setH(Math.ceil(e.nativeEvent.layout.height))}
    >
      {letters.map((ch, i) => (
        <Text
          key={`${ch}-${i}`}
          style={[styles.captionLetter, { fontSize, lineHeight: fontSize + 1, color }]}
        >
          {ch}
        </Text>
      ))}
    </View>
  );
}

interface ExerciseFlasksProps {
  fills: [FlaskFill, FlaskFill, FlaskFill];
}

export function ExerciseFlasks({ fills }: ExerciseFlasksProps) {
  const [h, setH] = useState(0);

  return (
    <View style={styles.flaskWithCaption}>
      <View
        style={styles.exerciseFlask}
        onLayout={(e) => setH(Math.ceil(e.nativeEvent.layout.height))}
      >
        <SideNotch side="left" markRatio={EXERCISE_BAND_LOW} hasBaseline flaskHeight={h} />
        <SideNotch side="right" markRatio={EXERCISE_BAND_LOW} hasBaseline flaskHeight={h} />
        <SideNotch side="left" markRatio={EXERCISE_MARK_RATIO} hasBaseline flaskHeight={h} />
        <SideNotch side="right" markRatio={EXERCISE_MARK_RATIO} hasBaseline flaskHeight={h} />
        <View style={styles.body}>
          {fills.map((fill, idx) => (
            <ChamberLiquid key={idx} fill={fill} phaseIndex={idx} />
          ))}
          <View pointerEvents="none" style={[styles.partition, { left: '33.333%' }]} />
          <View pointerEvents="none" style={[styles.partition, { left: '66.666%' }]} />
        </View>
      </View>
      <FlaskCaption word="ПОВТОРЫ" color={colors.flaskCaptionExercise} />
    </View>
  );
}

interface FoodFlaskProps {
  fill: FoodFlaskFill;
}

export function FoodFlask({ fill }: FoodFlaskProps) {
  const [h, setH] = useState(0);
  const fillHeight = useFillHeight(fill.fillRatio, h);

  return (
    <View style={styles.flaskWithCaption}>
      <FlaskCaption word="ГРАММЫ" color={colors.flaskCaptionFood} />
      <View style={styles.foodWrap}>
        <SideNotch
          side="left"
          markRatio={FOOD_MARK_RATIO}
          hasBaseline={fill.hasBaseline}
          flaskHeight={h}
        />
        <SideNotch
          side="right"
          markRatio={FOOD_MARK_RATIO}
          hasBaseline={fill.hasBaseline}
          flaskHeight={h}
        />
        <View
          style={styles.foodTube}
          onLayout={(e) => setH(Math.ceil(e.nativeEvent.layout.height))}
        >
          <PulseLiquid
            kind="food"
            fillRatio={fill.fillRatio}
            pulseRatio={fill.pulseRatio}
            height={fillHeight}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flaskWithCaption: {
    flexDirection: 'row',
    alignItems: 'stretch',
    alignSelf: 'stretch',
    flexGrow: 0,
    flexShrink: 0,
    gap: 4,
  },
  caption: {
    width: 12,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  captionLetter: {
    fontFamily: fonts.ui,
    fontWeight: '700',
    textAlign: 'center',
  },
  exerciseFlask: {
    width: FLASK_EXERCISE_WIDTH + TICK_GUTTER * 2,
    flexGrow: 0,
    flexShrink: 0,
    alignSelf: 'stretch',
    position: 'relative',
  },
  body: {
    flex: 1,
    marginHorizontal: TICK_GUTTER,
    flexDirection: 'row',
    alignItems: 'stretch',
    borderWidth: 2,
    borderColor: colors.flaskGlass,
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    backgroundColor: colors.flaskGlassInner,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: colors.flaskGlassGlow,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 5,
  },
  chamber: {
    flex: 1,
    minWidth: 0,
    position: 'relative',
    overflow: 'hidden',
  },
  partition: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 2,
    marginLeft: -1,
    backgroundColor: colors.flaskGlassPartition,
    zIndex: 2,
  },
  foodWrap: {
    width: FLASK_FOOD_WIDTH + TICK_GUTTER * 2,
    flexGrow: 0,
    flexShrink: 0,
    alignSelf: 'stretch',
    position: 'relative',
  },
  foodTube: {
    flex: 1,
    marginHorizontal: TICK_GUTTER,
    borderWidth: 2,
    borderColor: colors.flaskGlass,
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
    borderBottomLeftRadius: 9,
    borderBottomRightRadius: 9,
    backgroundColor: colors.flaskGlassInner,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: colors.flaskGlassGlow,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 5,
  },
  liquid: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: -2,
    overflow: 'visible',
    zIndex: 1,
  },
  liquidFill: {
    flex: 1,
  },
  waveClip: {
    position: 'absolute',
    top: -6,
    left: -1,
    right: -1,
    height: 7,
    overflow: 'hidden',
  },
  waveRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  waveBar: {
    flex: 1,
    minWidth: 3,
  },
  waveBarOverlap: {
    marginLeft: -2,
  },
  notch: {
    position: 'absolute',
    width: PX * 2,
    height: PX * 3,
    zIndex: 4,
  },
  notchInner: {
    width: PX,
    justifyContent: 'center',
  },
  px: {
    width: PX,
    height: PX,
  },
});
