import React, { useState } from "react";
import { StyleProp, View, ViewStyle } from "react-native";
import Svg, { Circle } from "react-native-svg";

/* =========================================================
   PROGRESS RING PLAY BUTTON

   Wraps the EXISTING play button (whatever size/shape it
   already is) and, when `progress` is provided, draws a
   thin circular progress ring around it — no separate
   "RESUME xx%" label needed anymore.

   Usage: just swap the outer <View style={styles.xPlayBtn}>
   for <ProgressRingPlayButton style={styles.xPlayBtn} progress={progress}>
   and keep the <PlayIcon /> child exactly as before.
========================================================= */

interface ProgressRingPlayButtonProps {
  /** 0-100. If undefined/0 or falsy `active`, no ring is drawn. */
  progress?: number;
  /** Whether to draw the ring at all (e.g. isContinueListening). */
  active?: boolean;
  /** Same style you were already passing to the play button View. */
  style?: StyleProp<ViewStyle>;
  ringColor?: string;
  trackColor?: string;
  /** Gap between the button's own edge and the ring stroke. */
  gap?: number;
  /** Ring stroke thickness. */
  strokeWidth?: number;
  children: React.ReactNode;
}

const ProgressRingPlayButton: React.FC<ProgressRingPlayButtonProps> = ({
  progress = 0,
  active = false,
  style,
  ringColor = "#E8B23B",
  trackColor = "rgba(255,255,255,0.18)",
  gap = 4,
  strokeWidth = 2.5,
  children,
}) => {
  const [btnSize, setBtnSize] = useState(0);

  const ringSize = btnSize + gap * 2;
  const radius = ringSize / 2 - strokeWidth / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(Math.max(progress, 0), 100);
  const dashOffset = circumference * (1 - clamped / 100);

  return (
    <View
      style={[
        style,
        { alignItems: "center", justifyContent: "center" },
      ]}
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        setBtnSize(Math.min(width, height));
      }}
    >
      {active && btnSize > 0 && (
        <Svg
          width={ringSize}
          height={ringSize}
          style={{
            position: "absolute",
            top: -gap,
            left: -gap,
          }}
        >
          <Circle
            cx={ringSize / 2}
            cy={ringSize / 2}
            r={radius}
            stroke={trackColor}
            strokeWidth={strokeWidth}
            fill="none"
          />
          <Circle
            cx={ringSize / 2}
            cy={ringSize / 2}
            r={radius}
            stroke={ringColor}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            rotation="-90"
            origin={`${ringSize / 2}, ${ringSize / 2}`}
          />
        </Svg>
      )}
      {children}
    </View>
  );
};

export default ProgressRingPlayButton;
