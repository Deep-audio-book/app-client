import React, { useEffect, useRef } from 'react';
import { AccessibilityInfo, Animated, StyleProp, ViewStyle } from 'react-native';

import { TRANSITION } from './transitions';

type Props = {
  /**
   * Change this value when the section changes (e.g. the active tab).
   * The children fade + slide in again every time it changes.
   */
  sectionKey?: string | number;
  /** Position in a list. Rows fade in one after another (first few only). */
  index?: number;
  /** Direction the content slides in from: 'up' (default), 'left' or 'right'. */
  from?: 'up' | 'left' | 'right';
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
};

/**
 * Subtle fade + small slide when a section appears or changes.
 * Uses the native driver (no JS work while animating) and respects the
 * system "Reduce motion" setting.
 */
export default function SectionTransition({
  sectionKey,
  index = 0,
  from = 'up',
  style,
  children,
}: Props) {
  const progress = useRef(new Animated.Value(0)).current;
  const reduceMotion = useRef(false);

  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((v) => {
        if (alive) reduceMotion.current = !!v;
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (reduceMotion.current) {
      progress.setValue(1);
      return;
    }

    progress.setValue(0);
    const delay = Math.min(index, TRANSITION.staggerMax) * TRANSITION.stagger;
    const anim = Animated.timing(progress, {
      toValue: 1,
      duration: TRANSITION.section,
      delay,
      easing: TRANSITION.easing,
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
  }, [sectionKey, index, progress]);

  const offset = TRANSITION.sectionOffset;
  const translate = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [from === 'left' ? -offset : from === 'right' ? offset : offset, 0],
  });

  const transform =
    from === 'up' ? [{ translateY: translate }] : [{ translateX: translate }];

  return (
    <Animated.View style={[{ opacity: progress, transform }, style]}>
      {children}
    </Animated.View>
  );
}
