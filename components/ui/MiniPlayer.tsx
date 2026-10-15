import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSelector } from 'react-redux';

import { usePlayer } from '../../providers/PlayerProvider';
import { RootState } from '../../redux/store';

export function MiniPlayer() {
  /* =========================================================
     REDUX
  ========================================================= */

  const {
    isExpanded,
    isActive,
    isPlaying,
    elapsed,
    duration,
    chapterIndex,
  } = useSelector(
    (s: RootState) => s.player
  );

  /* =========================================================
     PLAYER PROVIDER
  ========================================================= */

  const {
    chapters,
    currentChapter,
    handlePlayPause,
    expandPlayer,
    handleNextChapter,
    handlePreviousChapter,
    closePlayer,
  } = usePlayer();

  const router = useRouter();

  /* =========================================================
     HIDE MINI PLAYER
  ========================================================= */

  if (
    !isActive ||
    isExpanded ||
    !currentChapter
  ) {
    return null;
  }

  /* =========================================================
     PROGRESS
  ========================================================= */

  const progress =
    duration > 0
      ? Math.min(
          1,
          Math.max(
            0,
            elapsed / duration
          )
        )
      : 0;

  /* =========================================================
     CHAPTER COUNT

     chapters comes from PlayerProvider and contains
     the actual story episodes loaded from API.
  ========================================================= */

  const chapterCount =
    chapters.length;

  /* =========================================================
     PREVIOUS / NEXT CONDITIONS
  ========================================================= */

  const isFirstChapter =
    chapterCount <= 1 ||
    chapterIndex <= 0;

  const isLastChapter =
    chapterCount <= 1 ||
    chapterIndex >=
      chapterCount - 1;

  /* =========================================================
     COVER
  ========================================================= */

  const coverSource =
    currentChapter.cover
      ? {
          uri: currentChapter.cover,
        }
      : null;

  /* =========================================================
     EXPAND
  ========================================================= */

  const handleExpand = () => {
    expandPlayer();

    router.push(
      '/player-standard'
    );
  };

  /* =========================================================
     CLOSE
  ========================================================= */

  const handleClose = (
    e: any
  ) => {
    e.stopPropagation();

    closePlayer();
  };

  /* =========================================================
     PREVIOUS
  ========================================================= */

  const handlePrevious = (
    e: any
  ) => {
    e.stopPropagation();

    if (isFirstChapter) {
      return;
    }

    handlePreviousChapter();
  };

  /* =========================================================
     NEXT
  ========================================================= */

  const handleNext = (
    e: any
  ) => {
    e.stopPropagation();

    if (isLastChapter) {
      return;
    }

    handleNextChapter();
  };

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <Pressable
      onPress={handleExpand}
      style={styles.wrapper}
    >
      {/* =====================================================
          PROGRESS
      ===================================================== */}

      <View
        style={styles.progressTrack}
      >
        <View
          style={[
            styles.progressFill,
            {
              width: `${
                progress * 100
              }%`,
            },
          ]}
        />
      </View>

      {/* =====================================================
          ROW
      ===================================================== */}

      <View style={styles.row}>

        {/* ===================================================
            COVER
        =================================================== */}

        <View style={styles.cover}>
          {coverSource ? (
            <Image
              source={coverSource}
              style={
                StyleSheet.absoluteFillObject
              }
              resizeMode="cover"
            />
          ) : (
            <Ionicons
              name="book"
              size={20}
              color="rgba(255,255,255,0.85)"
            />
          )}
        </View>

        {/* ===================================================
            TITLE / ARTIST
        =================================================== */}

        <View
          style={styles.textBlock}
        >
          <Text
            style={styles.title}
            numberOfLines={1}
          >
            {currentChapter.title}
          </Text>

          <Text
            style={styles.artist}
            numberOfLines={1}
          >
            {currentChapter.artist}
          </Text>
        </View>

        {/* ===================================================
            PREVIOUS
        =================================================== */}

        {!isFirstChapter && (
          <Pressable
            onPress={
              handlePrevious
            }
            hitSlop={10}
            style={
              styles.iconButton
            }
          >
            <Ionicons
              name="play-skip-back"
              size={20}
              color="#FFFFFF"
            />
          </Pressable>
        )}

        {/* ===================================================
            PLAY / PAUSE
        =================================================== */}

        <Pressable
          onPress={(e) => {
            e.stopPropagation();
            handlePlayPause();
          }}
          hitSlop={10}
          style={
            styles.iconButton
          }
        >
          <Ionicons
            name={
              isPlaying
                ? 'pause'
                : 'play'
            }
            size={22}
            color="#FFFFFF"
          />
        </Pressable>

        {/* ===================================================
            NEXT
        =================================================== */}

        {!isLastChapter && (
          <Pressable
            onPress={handleNext}
            hitSlop={10}
            style={
              styles.iconButton
            }
          >
            <Ionicons
              name="play-skip-forward"
              size={20}
              color="#FFFFFF"
            />
          </Pressable>
        )}

        {/* ===================================================
            CLOSE
        =================================================== */}

        <Pressable
          onPress={handleClose}
          hitSlop={10}
          style={
            styles.iconButton
          }
        >
          <Ionicons
            name="close"
            size={20}
            color="rgba(255,255,255,0.85)"
          />
        </Pressable>

      </View>
    </Pressable>
  );
}

/* =========================================================
   STYLES
========================================================= */

const styles = StyleSheet.create({

  /* =======================================================
     MINI PLAYER
  ======================================================= */

  wrapper: {
    position: 'absolute',

    left: 8,
    right: 8,

    // 👇 Footer
    bottom: 95,

    backgroundColor: '#1C1C1C',

    borderRadius: 14,

    overflow: 'hidden',

    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 10,

    shadowOffset: {
      width: 0,
      height: 4,
    },

    elevation: 8,
  },

  /* =======================================================
     PROGRESS
  ======================================================= */

  progressTrack: {
    height: 2,

    backgroundColor:
      'rgba(255,255,255,0.15)',
  },

  progressFill: {
    height: 2,

    backgroundColor: '#FFFFFF',
  },

  /* =======================================================
     ROW
  ======================================================= */

  row: {
    flexDirection: 'row',

    alignItems: 'center',

    paddingVertical: 8,
    paddingHorizontal: 10,

    gap: 10,
  },

  /* =======================================================
     COVER
  ======================================================= */

  cover: {
    width: 40,
    height: 40,

    borderRadius: 6,

    backgroundColor:
      'rgba(255,255,255,0.14)',

    alignItems: 'center',
    justifyContent: 'center',

    overflow: 'hidden',
  },

  /* =======================================================
     TEXT
  ======================================================= */

  textBlock: {
    flex: 1,

    minWidth: 0,
  },

  title: {
    color: '#FFFFFF',

    fontSize: 13.5,

    fontWeight: '600',
  },

  artist: {
    color:
      'rgba(255,255,255,0.6)',

    fontSize: 11.5,

    marginTop: 1,
  },

  /* =======================================================
     BUTTON
  ======================================================= */

  iconButton: {
    width: 36,
    height: 36,

    alignItems: 'center',
    justifyContent: 'center',
  },
});