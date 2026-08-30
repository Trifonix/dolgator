import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
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
const PULSE_CYCLE_MS = PULSE_HOLD_MS + PULSE_FLASH_MS;

function useSmoothPulse(active: boolean, phaseDelayMs: number) {
  const mix = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    mix.stopAnimation();
    mix.setValue(0);
    if (!active) return;

    let raf = 0;
    const origin = Date.now() + phaseDelayMs;

    const tick = () => {
      const elapsed = Math.max(0, Date.now() - origin);
      const t = elapsed % PULSE_CYCLE_MS;
      if (t < PULSE_HOLD_MS) {
        mix.setValue(0);
      } else {
        const u = (t - PULSE_HOLD_MS) / PULSE_FLASH_MS;
        mix.setValue(Math.sin(u * Math.PI));
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      mix.setValue(0);
    };
  }, [active, mix, phaseDelayMs]);

  return mix;
}

const WAVE_BARS = 8;

function WaveSurface({
  active,
  delayMs,
  color,
}: {
  active: boolean;
  delayMs: number;
  color: Animated.AnimatedInterpolation<string | number>;
}) {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    if (!active) {
      setPhase(0);
      return;
    }

    let raf = 0;
    let last = 0;
    const origin = Date.now() + (delayMs % 500);

    const tick = () => {
      const now = Date.now();
      if (now - last >= 40) {
        last = now;
        setPhase(((now - origin) / 1000) * Math.PI * 2 * 0.85);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, delayMs]);

  if (!active) return null;

  return (
    <View style={styles.waveClip} pointerEvents="none">
      <View style={styles.waveRow}>
        {Array.from({ length: WAVE_BARS }, (_, i) => {
          const h = 1.2 + 3 * (0.5 + 0.5 * Math.sin(phase + i * 0.82));
          return (
            <Animated.View
              key={i}
              style={[styles.waveBar, { height: h, backgroundColor: color }]}
            />
          );
        })}
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
}: {
  side: 'left' | 'right';
  markRatio: number;
  hasBaseline: boolean;
}) {
  if (!hasBaseline) return null;
  const notchH = PX * 3;
  const bottom = Math.min(
    FLASK_HEIGHT - notchH,
    Math.max(2, FLASK_HEIGHT * markRatio - PX * 1.5),
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

function FlaskCaption({ word }: { word: string }) {
  const letters = Array.from(word);
  const fontSize = Math.min(13, Math.floor(FLASK_HEIGHT / letters.length) - 1);

  return (
    <View style={styles.caption} pointerEvents="none">
      {letters.map((ch, i) => (
        <Text key={`${ch}-${i}`} style={[styles.captionLetter, { fontSize, lineHeight: fontSize + 1 }]}>
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
  return (
    <View style={styles.flaskWithCaption}>
      <View style={styles.exerciseFlask}>
        <SideNotch side="left" markRatio={EXERCISE_BAND_LOW} hasBaseline />
        <SideNotch side="right" markRatio={EXERCISE_BAND_LOW} hasBaseline />
        <SideNotch side="left" markRatio={EXERCISE_MARK_RATIO} hasBaseline />
        <SideNotch side="right" markRatio={EXERCISE_MARK_RATIO} hasBaseline />
        <View style={styles.body}>
          {fills.map((fill, idx) => (
            <ChamberLiquid key={idx} fill={fill} phaseIndex={idx} />
          ))}
          <View pointerEvents="none" style={[styles.partition, { left: '33.333%' }]} />
          <View pointerEvents="none" style={[styles.partition, { left: '66.666%' }]} />
        </View>
      </View>
      <FlaskCaption word="ПОВТОРЫ" />
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
      <FlaskCaption word="ГРАММЫ" />
      <View style={styles.foodWrap}>
        <SideNotch side="left" markRatio={FOOD_MARK_RATIO} hasBaseline={fill.hasBaseline} />
        <SideNotch side="right" markRatio={FOOD_MARK_RATIO} hasBaseline={fill.hasBaseline} />
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
    alignItems: 'center',
    flexGrow: 0,
    flexShrink: 0,
    gap: 4,
  },
  caption: {
    height: FLASK_HEIGHT,
    width: 12,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  captionLetter: {
    fontFamily: fonts.ui,
    fontWeight: '700',
    color: colors.textMuted,
    textAlign: 'center',
  },
  exerciseFlask: {
    width: FLASK_EXERCISE_WIDTH + TICK_GUTTER * 2,
    height: FLASK_HEIGHT,
    flexGrow: 0,
    flexShrink: 0,
    position: 'relative',
  },
  body: {
    height: FLASK_HEIGHT,
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
    height: FLASK_HEIGHT,
    flexGrow: 0,
    flexShrink: 0,
    position: 'relative',
  },
  foodTube: {
    marginHorizontal: TICK_GUTTER,
    height: FLASK_HEIGHT,
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
    top: -5,
    left: 0,
    right: 0,
    height: 5,
  },
  waveRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  waveBar: {
    flex: 1,
    borderTopLeftRadius: 1,
    borderTopRightRadius: 1,
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
