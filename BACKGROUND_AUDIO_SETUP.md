# Background audio + lock-screen player (like Spotify / Audible)

The code is already in `providers/PlayerProvider.tsx`:

- audio keeps playing when the app is in the background / the phone is locked
- the lock screen, Control Centre (iOS) and the notification shade (Android)
  show title, cover, play / pause and 15s back / forward
- video switches to audio when the app goes to the background
- the controls are removed on logout / when the mini player is closed

For this to work in the REAL app you must also set the native config. This
cannot be done from JavaScript - it goes into `app.json` (or `app.config.js`).

## 1. app.json

```json
{
  "expo": {
    "ios": {
      "infoPlist": {
        "UIBackgroundModes": ["audio"]
      }
    },
    "android": {
      "permissions": [
        "FOREGROUND_SERVICE",
        "FOREGROUND_SERVICE_MEDIA_PLAYBACK",
        "POST_NOTIFICATIONS"
      ]
    },
    "plugins": [
      "expo-router",
      [
        "expo-audio",
        { "microphonePermission": false }
      ],
      [
        "expo-video",
        { "supportsBackgroundPlayback": true, "supportsPictureInPicture": false }
      ]
    ]
  }
}
```

Keep your existing plugins; only add the entries above.
(`microphonePermission: false` is fine; the waveform uses audio sampling of the
player, not the microphone. If your build still asks for the microphone on
Android, set the text you want to show there instead of `false`.)

## 2. Build

Background playback and the lock-screen player do NOT work in Expo Go (the
simulator log shows "ExponentExperienceData" = Expo Go). Create a development
build and test on a real phone:

```
npx expo prebuild --clean
npx expo run:ios        # or: npx expo run:android
# or with EAS:
eas build --profile development --platform ios
```

## 3. What to test

1. Play an episode, press the home button -> audio continues.
2. Lock the phone -> lock screen shows the book cover + title + play / pause.
3. Pause from the lock screen -> app shows paused when you open it.
4. Another app starts audio (call, music) -> this audio pauses (doNotMix).
5. Logout -> audio stops and the lock-screen player disappears.
