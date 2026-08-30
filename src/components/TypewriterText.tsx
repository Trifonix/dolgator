import React, { useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, Text, TextStyle, View } from 'react-native';
import { colors } from '../theme/colors';

interface TypewriterTextProps {
  text: string;
  style?: TextStyle | TextStyle[];
  /** мс на символ */
  speed?: number;
  /** начать набор */
  active?: boolean;
  cursorColor?: string;
  onComplete?: () => void;
}

/**
 * Место под полный текст резервируется сразу (невидимый слой),
 * видимый набор идёт поверх — без прыжков вёрстки.
 */
export function TypewriterText({
  text,
  style,
  speed = 26,
  active = true,
  cursorColor = colors.intro.primary,
  onComplete,
}: TypewriterTextProps) {
  const [length, setLength] = useState(0);
  const [done, setDone] = useState(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const completedForText = useRef<string | null>(null);

  useEffect(() => {
    if (!active) {
      setLength(0);
      setDone(false);
      completedForText.current = null;
      return;
    }

    if (text.length === 0) {
      setLength(0);
      setDone(true);
      if (completedForText.current !== text) {
        completedForText.current = text;
        onCompleteRef.current?.();
      }
      return;
    }

    // На телефоне typewriter грузит JS-поток и тормозит онбординг.
    if (Platform.OS !== 'web') {
      setLength(text.length);
      setDone(true);
      if (completedForText.current !== text) {
        completedForText.current = text;
        onCompleteRef.current?.();
      }
      return;
    }

    setLength(0);
    setDone(false);
    completedForText.current = null;
    let idx = 0;

    const tick = () => {
      idx += 1;
      setLength(idx);
      if (idx >= text.length) {
        clearInterval(timer);
        setDone(true);
        if (completedForText.current !== text) {
          completedForText.current = text;
          onCompleteRef.current?.();
        }
      }
    };

    const timer = setInterval(tick, speed);
    return () => clearInterval(timer);
  }, [active, text, speed]);

  return (
    <View style={styles.wrap}>
      <Text style={[style, styles.measure]}>{text}</Text>
      <Text style={[style, styles.overlay]}>
        {active ? text.slice(0, length) : ''}
        {active && !done ? <Text style={[styles.cursor, { color: cursorColor }]}>|</Text> : null}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    position: 'relative',
  },
  measure: {
    opacity: 0,
  },
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
  },
  cursor: {
    opacity: 0.85,
  },
});
