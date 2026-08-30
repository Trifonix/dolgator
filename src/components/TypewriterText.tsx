import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TextStyle } from 'react-native';
import { colors } from '../theme/colors';

interface TypewriterTextProps {
  text: string;
  style?: TextStyle | TextStyle[];
  /** мс на символ */
  speed?: number;
  /** начать набор */
  active?: boolean;
  onComplete?: () => void;
}

export function TypewriterText({
  text,
  style,
  speed = 26,
  active = true,
  onComplete,
}: TypewriterTextProps) {
  const [length, setLength] = useState(0);
  const [done, setDone] = useState(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    if (!active) {
      setLength(0);
      setDone(false);
      return;
    }

    setLength(0);
    setDone(false);
    let idx = 0;

    const tick = () => {
      idx += 1;
      setLength(idx);
      if (idx >= text.length) {
        clearInterval(timer);
        setDone(true);
        onCompleteRef.current?.();
      }
    };

    const timer = setInterval(tick, speed);
    return () => clearInterval(timer);
  }, [active, text, speed]);

  return (
    <Text style={style}>
      {text.slice(0, length)}
      {active && !done ? <Text style={styles.cursor}>|</Text> : null}
    </Text>
  );
}

const styles = StyleSheet.create({
  cursor: {
    color: colors.exercise.primary,
    opacity: 0.85,
  },
});
