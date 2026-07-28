import { useEffect, useRef, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import * as SplashScreen from 'expo-splash-screen';
import { theme } from './theme';

// App-open sequence: the loading animation plays full-screen, then the app
// icon holds for a couple of seconds, then the app itself appears. The native
// splash stays up until the video is actually ready, so there's no flash of
// UI in between. Every step has a failsafe timeout — a bad video file or a
// slow decoder can delay employees by a few seconds at most, never block.

const VIDEO_SOURCE = require('../assets/videos/loading-animation.mp4');
const ICON_SOURCE = require('../assets/images/ReefNerds.png');

const ICON_HOLD_MS = 2000;
// If the video never reports ready/finished, move on anyway.
const VIDEO_READY_TIMEOUT_MS = 4000;
const VIDEO_MAX_MS = 15000;

type Phase = 'video' | 'icon';

export function IntroSplash({ onDone }: { onDone: () => void }) {
  const [phase, setPhase] = useState<Phase>('video');
  const finishedVideo = useRef(false);

  const player = useVideoPlayer(VIDEO_SOURCE, (p) => {
    p.loop = false;
    // The animation plays WITH its audio track.
    p.muted = false;
  });

  // The native splash hides once the first frame is ready (or on timeout).
  useEffect(() => {
    const hideAndPlay = () => {
      SplashScreen.hideAsync().catch(() => {});
      try {
        player.play();
      } catch {
        // fall through — the ready timeout below advances the sequence
      }
    };
    const readySub = player.addListener('statusChange', ({ status }) => {
      if (status === 'readyToPlay') hideAndPlay();
      if (status === 'error') endVideo();
    });
    const readyTimeout = setTimeout(hideAndPlay, VIDEO_READY_TIMEOUT_MS);
    return () => {
      readySub.remove();
      clearTimeout(readyTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player]);

  const endVideo = () => {
    if (finishedVideo.current) return;
    finishedVideo.current = true;
    setPhase('icon');
  };

  useEffect(() => {
    const endSub = player.addListener('playToEnd', endVideo);
    const hardStop = setTimeout(endVideo, VIDEO_MAX_MS);
    return () => {
      endSub.remove();
      clearTimeout(hardStop);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player]);

  useEffect(() => {
    if (phase !== 'icon') return;
    const t = setTimeout(onDone, ICON_HOLD_MS);
    return () => clearTimeout(t);
  }, [phase, onDone]);

  return (
    <View style={styles.root} pointerEvents="auto">
      {phase === 'video' ? (
        <VideoView
          player={player}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          nativeControls={false}
        />
      ) : (
        <Image source={ICON_SOURCE} style={styles.icon} resizeMode="contain" />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.color.bg,
  },
  icon: { width: 220, height: 220 },
});
