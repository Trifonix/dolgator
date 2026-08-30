import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { colors } from '../theme/colors';
import {
  FLASK_EXERCISE_WIDTH,
  FLASK_FOOD_WIDTH,
  FLASK_HEIGHT,
} from '../theme/layout';
import type { FlaskFill, FoodFlaskFill } from '../utils/flaskMetrics';

const NECK_HEIGHT = 7;
const TICK = 5;
const BODY_HEIGHT = FLASK_HEIGHT - NECK_HEIGHT;

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

  return anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, maxPx],
  });
}

function SideTicks({
  markRatio,
  hasBaseline,
  bodyHeight,
  color,
}: {
  markRatio: number;
  hasBaseline: boolean;
  bodyHeight: number;
  color: string;
}) {
  if (!hasBaseline) return null;
  const bottom = Math.max(0, bodyHeight * markRatio - 1);
  return (
    <>
      <View style={[styles.tick, { left: 0, bottom, backgroundColor: color }]} />
      <View style={[styles.tick, { right: 0, bottom, backgroundColor: color }]} />
    </>
  );
}

function ChamberLiquid({ fill, color }: { fill: FlaskFill; color: string }) {
  const [h, setH] = useState(0);
  const fillHeight = useFillHeight(fill.fillRatio, h);

  return (
    <View
      style={styles.chamber}
      onLayout={(e) => setH(e.nativeEvent.layout.height)}
    >
      <Animated.View
        style={[
          styles.liquid,
          { backgroundColor: color, height: fillHeight },
        ]}
      />
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
      <SideTicks
        markRatio={mark.markRatio}
        hasBaseline={mark.hasBaseline}
        bodyHeight={BODY_HEIGHT}
        color="#ffe082"
      />
      <View style={styles.flaskClip}>
        <View style={[styles.neck, { borderColor: colors.exercise.primary }]} />
        <View
          style={[
            styles.body,
            { borderColor: colors.exercise.primary, shadowColor: colors.exercise.primary },
          ]}
        >
          {fills.map((fill, idx) => (
            <React.Fragment key={idx}>
              {idx > 0 && (
                <View style={[styles.insert, { backgroundColor: colors.exercise.primary }]} />
              )}
              <ChamberLiquid
                fill={fill}
                color={
                  fill.hasBaseline && fill.fillRatio >= fill.markRatio
                    ? colors.compareGood
                    : 'rgba(224, 64, 251, 0.72)'
                }
              />
            </React.Fragment>
          ))}
        </View>
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
  const liquid = fill.overTarget
    ? colors.compareBad
    : 'rgba(0, 212, 255, 0.72)';

  return (
    <View style={styles.foodWrap}>
      <SideTicks
        markRatio={fill.markRatio}
        hasBaseline={fill.hasBaseline}
        bodyHeight={FLASK_HEIGHT}
        color="#ffe082"
      />
      <View
        style={[
          styles.foodTube,
          { borderColor: colors.food.primary, shadowColor: colors.food.primary },
        ]}
        onLayout={(e) => setH(e.nativeEvent.layout.height)}
      >
        <Animated.View
          style={[styles.liquid, { backgroundColor: liquid, height: fillHeight }]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  exerciseFlask: {
    width: FLASK_EXERCISE_WIDTH + TICK * 2,
    height: FLASK_HEIGHT,
    flexGrow: 0,
    flexShrink: 0,
    position: 'relative',
  },
  flaskClip: {
    marginHorizontal: TICK,
    height: FLASK_HEIGHT,
    overflow: 'hidden',
  },
  neck: {
    width: 14,
    height: NECK_HEIGHT,
    alignSelf: 'center',
    borderWidth: 1.5,
    borderBottomWidth: 0,
    borderTopLeftRadius: 5,
    borderTopRightRadius: 5,
    backgroundColor: colors.bgCard,
    marginBottom: -1.5,
    zIndex: 2,
  },
  body: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'stretch',
    borderWidth: 1.5,
    borderRadius: 6,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    backgroundColor: colors.bgCard,
    overflow: 'hidden',
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
  insert: {
    width: 1.5,
    alignSelf: 'stretch',
    opacity: 0.9,
  },
  foodWrap: {
    width: FLASK_FOOD_WIDTH + TICK * 2,
    height: FLASK_HEIGHT,
    flexGrow: 0,
    flexShrink: 0,
    position: 'relative',
  },
  foodTube: {
    marginHorizontal: TICK,
    height: FLASK_HEIGHT,
    borderWidth: 1.5,
    borderRadius: 4,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
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
    bottom: 0,
  },
  tick: {
    position: 'absolute',
    width: TICK,
    height: 2,
    borderRadius: 1,
    zIndex: 3,
  },
});
