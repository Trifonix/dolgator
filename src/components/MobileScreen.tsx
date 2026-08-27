import React, { useMemo } from 'react';
import { Platform, StyleSheet, useWindowDimensions, View } from 'react-native';
import { colors } from '../theme/colors';
import { REF_HEIGHT, REF_WIDTH, fullScreen } from '../theme/layout';

interface MobileScreenProps {
  children: React.ReactNode;
}

function usePhoneFrameSize() {
  const { width: vw, height: vh } = useWindowDimensions();

  return useMemo(() => {
    const aspect = REF_HEIGHT / REF_WIDTH;
    const padding = 24;
    const maxW = vw - padding * 2;
    const maxH = vh - padding * 2;

    let frameW = REF_WIDTH;
    let frameH = REF_HEIGHT;

    if (frameH > maxH) {
      frameH = maxH;
      frameW = frameH / aspect;
    }
    if (frameW > maxW) {
      frameW = maxW;
      frameH = frameW * aspect;
    }

    return { frameW, frameH };
  }, [vw, vh]);
}

/** На web — узкая «рамка телефона» 360×640 по центру; на устройстве — весь экран */
export function MobileScreen({ children }: MobileScreenProps) {
  const { frameW, frameH } = usePhoneFrameSize();

  if (Platform.OS === 'web') {
    return (
      <View style={[styles.webOuter, fullScreen]}>
        <View style={[styles.webFrame, { width: frameW, height: frameH }]}>
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
    justifyContent: 'center',
    backgroundColor: '#050508',
  },
  webFrame: {
    overflow: 'hidden',
    backgroundColor: colors.bg,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: '#2a2a38',
  },
  nativeFrame: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: colors.bg,
  },
});
