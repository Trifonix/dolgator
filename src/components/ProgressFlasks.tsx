import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { colors } from '../theme/colors';
import {
  FLASK_EXERCISE_WIDTH,
  FLASK_FOOD_WIDTH,
  FLASK_HEIGHT,
} from '../theme/layout';
import { approachingWarn, type FlaskFill, type FoodFlaskFill } from '../utils/flaskMetrics';

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

function useWarnPulse(active: boolean, intensity: number) {
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!active) {
      opacity.stopAnimation();
      opacity.setValue(1);
      return;
    }

    const half = Math.round(520 - intensity * 260);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.32,
          duration: half,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: half,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => {
      loop.stop();
      opacity.setValue(1);
    };
  }, [active, intensity, opacity]);

  return opacity;
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
  const bottom = Math.max(2, FLASK_HEIGHT * markRatio - PX * 1.5);
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

function ChamberLiquid({ fill }: { fill: FlaskFill }) {
  const [h, setH] = useState(0);
  const fillHeight = useFillHeight(fill.fillRatio, h);
  const warn = approachingWarn(fill);
  const pulse = useWarnPulse(warn.active, warn.intensity);

  return (
    <View
      style={styles.chamber}
      onLayout={(e) => setH(Math.ceil(e.nativeEvent.layout.height))}
    >
      <Animated.View style={[styles.liquid, { height: fillHeight }]}>
        <Animated.View
          style={[
            styles.liquidFill,
            { backgroundColor: colors.flaskLiquid, opacity: pulse },
          ]}
        />
      </Animated.View>
    </View>
  );
}

interface ExerciseFlasksProps {
  fills: [FlaskFill, FlaskFill, FlaskFill];
}

export function ExerciseFlasks({ fills }: ExerciseFlasksProps) {
  const mark = fills[0];

  return (
    <View style={styles.exerciseFlask}>
      <SideNotch side="left" markRatio={mark.markRatio} hasBaseline={mark.hasBaseline} />
      <SideNotch side="right" markRatio={mark.markRatio} hasBaseline={mark.hasBaseline} />
      <View
        style={[
          styles.body,
          { borderColor: colors.exercise.primary, shadowColor: colors.exercise.primary },
        ]}
      >
        {fills.map((fill, idx) => (
          <ChamberLiquid key={idx} fill={fill} />
        ))}
        <View pointerEvents="none" style={[styles.partition, { left: '33.333%' }]} />
        <View pointerEvents="none" style={[styles.partition, { left: '66.666%' }]} />
      </View>
    </View>
  );
}

interface FoodFlaskProps {
  fill: FoodFlaskFill;
}

export function FoodFlask({ fill }: FoodFlaskProps) {
  const [h, setH] = useState(0);
  const fillHeight = useFillHeight(fill.fillRatio, h);
  const warn = approachingWarn(fill);
  const pulse = useWarnPulse(warn.active, warn.intensity);

  return (
    <View style={styles.foodWrap}>
      <SideNotch side="left" markRatio={fill.markRatio} hasBaseline={fill.hasBaseline} />
      <SideNotch side="right" markRatio={fill.markRatio} hasBaseline={fill.hasBaseline} />
      <View
        style={[
          styles.foodTube,
          { borderColor: colors.food.primary, shadowColor: colors.food.primary },
        ]}
        onLayout={(e) => setH(Math.ceil(e.nativeEvent.layout.height))}
      >
        <Animated.View style={[styles.liquid, { height: fillHeight }]}>
          <Animated.View
            style={[
              styles.liquidFill,
              { backgroundColor: colors.flaskLiquid, opacity: pulse },
            ]}
          />
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    backgroundColor: colors.bgCard,
    overflow: 'hidden',
    position: 'relative',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 6,
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
    backgroundColor: colors.exercise.primary,
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
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
    borderBottomLeftRadius: 9,
    borderBottomRightRadius: 9,
    backgroundColor: colors.bgCard,
    overflow: 'hidden',
    position: 'relative',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 6,
  },
  liquid: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: -2,
  },
  liquidFill: {
    flex: 1,
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
