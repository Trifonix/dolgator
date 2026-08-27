import React from 'react';
import { Platform, StyleSheet, useWindowDimensions, View } from 'react-native';
import { colors } from '../theme/colors';
import { REF_WIDTH, fullScreen } from '../theme/layout';

interface MobileScreenProps {
  children: React.ReactNode;
}

/** На web — центрированная «рамка телефона» 720px, на устройстве — весь экран */
export function MobileScreen({ children }: MobileScreenProps) {
  const { width } = useWindowDimensions();
  const frameWidth = Platform.OS === 'web' ? Math.min(REF_WIDTH, width) : width;

  if (Platform.OS === 'web') {
    return (
      <View style={[styles.webOuter, fullScreen]}>
        <View style={[styles.webFrame, { width: frameWidth }]}>
          {children}
        </View>
      </View>
    );
  }

  return <View style={styles.nativeFrame}>{children}</View>;
}

const styles = StyleSheet.create({
  webOuter: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#050508',
  },
  webFrame: {
    flex: 1,
    maxWidth: REF_WIDTH,
    width: '100%',
    overflow: 'hidden',
    backgroundColor: colors.bg,
  },
  nativeFrame: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: colors.bg,
  },
});
