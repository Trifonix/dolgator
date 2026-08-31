import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
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

type HazeSide = 'purple' | 'cyan';

const HAZE_COLOR = {
  purple: colors.exercise.glow,
  cyan: colors.food.glow,
} as const;

/** Слои дымки: чем дальше — тем мягче и прозрачнее */
const HAZE_LAYERS = [
  { pad: 20, alpha: 0.045 },
  { pad: 14, alpha: 0.07 },
  { pad: 9, alpha: 0.1 },
  { pad: 5, alpha: 0.14 },
  { pad: 2, alpha: 0.18 },
] as const;

const HAZE_STRIPS = 24;

function hexToRgb(hex: string) {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

function mixGlow(left: string, right: string, t: number, alpha: number) {
  const a = hexToRgb(left);
  const b = hexToRgb(right);
  const r = Math.round(a.r + (b.r - a.r) * t);
  const g = Math.round(a.g + (b.g - a.g) * t);
  const bl = Math.round(a.b + (b.b - a.b) * t);
  return `rgba(${r},${g},${bl},${alpha})`;
}

/** Ярче у краёв, слабее в центре — двухцветная дымка сзади колбы */
function stripHazeAlpha(t: number, layerAlpha: number) {
  const edge = 1 - Math.abs(t - 0.5) * 2;
  return layerAlpha * (0.18 + 0.82 * edge);
}

function FlaskHaze({ left, right }: { left: HazeSide; right: HazeSide }) {
  const leftGlow = HAZE_COLOR[left];
  const rightGlow = HAZE_COLOR[right];

  return (
    <View style={styles.hazeRoot} pointerEvents="none">
      {HAZE_LAYERS.map((layer) => (
        <View
          key={layer.pad}
          style={[
            styles.hazeShell,
            {
              top: -layer.pad,
              bottom: -layer.pad,
              left: -layer.pad,
              right: -layer.pad,
              borderTopLeftRadius: 2 + layer.pad * 0.25,
              borderTopRightRadius: 2 + layer.pad * 0.25,
              borderBottomLeftRadius: 10 + layer.pad * 0.85,
              borderBottomRightRadius: 10 + layer.pad * 0.85,
            },
          ]}
        >
          {Array.from({ length: HAZE_STRIPS }, (_, i) => {
            const t = i / (HAZE_STRIPS - 1);
            return (
              <View
                key={i}
                style={{
                  flex: 1,
                  backgroundColor: mixGlow(
                    leftGlow,
                    rightGlow,
                    t,
                    stripHazeAlpha(t, layer.alpha),
                  ),
                }}
              />
            );
          })}
        </View>
      ))}
    </View>
  );
}

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

function FlaskCaption({
  word,
  color,
  flaskHeight,
}: {
  word: string;
  color: string;
  flaskHeight: number;
}) {
  const letters = Array.from(word);
  const inset = 3;
  const inner = Math.max(0, flaskHeight - inset * 2);
  const fontSize = Math.min(13, Math.max(8, Math.floor(inner / letters.length) - 1));

  return (
    <View style={[styles.caption, { height: flaskHeight, paddingVertical: inset }]} pointerEvents="none">
      {letters.map((ch, i) => (
        <Text
          key={`${ch}-${i}`}
          style={[styles.captionLetter, { fontSize, lineHeight: fontSize, color }]}
        >
          {ch}
        </Text>
      ))}
    </View>
  );
}

interface ExerciseFlasksProps {
  fills: [FlaskFill, FlaskFill, FlaskFill];
  onLongPress?: () => void;
}

export function ExerciseFlasks({ fills, onLongPress }: ExerciseFlasksProps) {
  const [h, setH] = useState(0);

  return (
    <Pressable
      onLongPress={onLongPress}
      delayLongPress={550}
      disabled={!onLongPress}
      style={styles.flaskWithCaption}
    >
      <View
        style={styles.exerciseFlask}
        onLayout={(e) => setH(Math.ceil(e.nativeEvent.layout.height))}
      >
        <SideNotch side="left" markRatio={EXERCISE_BAND_LOW} hasBaseline flaskHeight={h} />
        <SideNotch side="right" markRatio={EXERCISE_BAND_LOW} hasBaseline flaskHeight={h} />
        <SideNotch side="left" markRatio={EXERCISE_MARK_RATIO} hasBaseline flaskHeight={h} />
        <SideNotch side="right" markRatio={EXERCISE_MARK_RATIO} hasBaseline flaskHeight={h} />
        <View style={styles.bodyWrap}>
          <FlaskHaze left="purple" right="cyan" />
          <View style={styles.body}>
            {fills.map((fill, idx) => (
              <ChamberLiquid key={idx} fill={fill} phaseIndex={idx} />
            ))}
            <View pointerEvents="none" style={[styles.partition, { left: '33.333%' }]} />
            <View pointerEvents="none" style={[styles.partition, { left: '66.666%' }]} />
          </View>
        </View>
      </View>
      <FlaskCaption word="ПОВТОРЫ" color={colors.flaskCaptionExercise} flaskHeight={h || FLASK_HEIGHT} />
    </Pressable>
  );
}

interface FoodFlaskProps {
  fill: FoodFlaskFill;
  onLongPress?: () => void;
}

export function FoodFlask({ fill, onLongPress }: FoodFlaskProps) {
  const [h, setH] = useState(0);
  const fillHeight = useFillHeight(fill.fillRatio, h);

  return (
    <Pressable
      onLongPress={onLongPress}
      delayLongPress={550}
      disabled={!onLongPress}
      style={styles.flaskWithCaption}
    >
      <FlaskCaption word="ГРАММЫ" color={colors.flaskCaptionFood} flaskHeight={h || FLASK_HEIGHT} />
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
        <View style={styles.bodyWrap}>
          <FlaskHaze left="cyan" right="purple" />
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
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flaskWithCaption: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    alignSelf: 'stretch',
    flexGrow: 0,
    flexShrink: 0,
    gap: 4,
  },
  caption: {
    width: 12,
    justifyContent: 'space-between',
    alignItems: 'center',
    flexShrink: 0,
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
    overflow: 'visible',
  },
  bodyWrap: {
    flex: 1,
    marginHorizontal: TICK_GUTTER,
    position: 'relative',
    overflow: 'visible',
  },
  hazeRoot: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
    overflow: 'visible',
  },
  hazeShell: {
    position: 'absolute',
    flexDirection: 'row',
    overflow: 'hidden',
  },
  body: {
    flex: 1,
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
    zIndex: 1,
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
    overflow: 'visible',
  },
  foodTube: {
    flex: 1,
    borderWidth: 2,
    borderColor: colors.flaskGlass,
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
    borderBottomLeftRadius: 9,
    borderBottomRightRadius: 9,
    backgroundColor: colors.flaskGlassInner,
    overflow: 'hidden',
    position: 'relative',
    zIndex: 1,
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
