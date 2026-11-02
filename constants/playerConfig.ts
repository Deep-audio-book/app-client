/**
 * Player behaviour that Deep Talks decides.
 *
 * Fill the two audio URLs when the approved audio files are ready.
 * While a URL is empty ("") that feature is simply skipped - nothing breaks.
 */
export const PLAYER_CONFIG = {
  /** When an episode ends, start the next one by itself (if it is unlocked). */
  AUTO_PLAY_NEXT: true,

  /**
   * Customised voice-over ending. Played once after the LAST episode of a
   * book finishes. Deep Talks provides the approved wording / audio.
   * Example: "https://cdn.deeptalks.in/audio/ending.mp3"
   */
  CUSTOM_ENDING_AUDIO_URL: "",

  /**
   * Paywall voice message. Played when a FREE episode ends and the next
   * episode is locked ("rent this book or get Premium to continue").
   * Deep Talks provides the approved wording / audio.
   */
  PAYWALL_AUDIO_URL: "",
} as const;
