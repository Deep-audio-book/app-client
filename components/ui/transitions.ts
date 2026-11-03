import { Easing } from 'react-native';

/**
 * One place for every transition setting in the app, so the whole app
 * moves with the same subtle feel. Change a value here and it updates
 * everywhere.
 */
export const TRANSITION = {
  /** Screen -> screen (stack push / pop), in ms */
  screen: 280,
  /** Bottom-tab -> tab, in ms */
  tab: 200,
  /** Content inside one screen (About <-> Chapters etc.), in ms */
  section: 240,
  /** Small shift the content travels while fading in, in px */
  sectionOffset: 12,
  /** Delay between rows when a list fades in, in ms */
  stagger: 28,
  /** Only the first N rows get a stagger so long lists never feel slow */
  staggerMax: 8,
  easing: Easing.out(Easing.cubic),
} as const;
