import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import YoutubePlayer from 'react-native-youtube-iframe';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../store/theme.store';

interface Props {
  videoId: string;
  thumbnail?: string;
  description?: string;
}

const VIDEO_ID_REGEX = /^[a-zA-Z0-9_-]{11}$/;
const DESCRIPTION_COLLAPSE_LENGTH = 140;

export function YoutubeDetailRenderer({ videoId, thumbnail, description }: Props) {
  const colors = useThemeStore((s) => s.colors);
  const [playing, setPlaying] = useState(false);
  const [expanded, setExpanded] = useState(false);

  if (!VIDEO_ID_REGEX.test(videoId)) return null;

  const isLong = !!description && description.length > DESCRIPTION_COLLAPSE_LENGTH;
  const displayDescription =
    expanded || !isLong ? description : description?.slice(0, DESCRIPTION_COLLAPSE_LENGTH) + '...';

  return (
    <View>
      {playing ? (
        <YoutubePlayer
          height={220}
          videoId={videoId}
          play={playing}
          onChangeState={(state: string) => {
            if (state === 'ended') setPlaying(false);
          }}
        />
      ) : (
        <TouchableOpacity
          style={styles.thumbnailContainer}
          onPress={() => setPlaying(true)}
          accessibilityRole="button"
          accessibilityLabel="영상 재생"
        >
          {thumbnail ? (
            <Image source={{ uri: thumbnail }} style={styles.thumbnail} resizeMode="cover" />
          ) : (
            <View style={[styles.thumbnail, { backgroundColor: colors.surface }]} />
          )}
          <View style={styles.playOverlay}>
            <Ionicons name="play-circle" size={64} color="rgba(255,255,255,0.9)" />
          </View>
        </TouchableOpacity>
      )}

      {displayDescription && (
        <View style={[styles.descriptionBox, { backgroundColor: colors.surface }]}>
          <Text style={[styles.description, { color: colors.textSecondary }]}>
            {displayDescription}
          </Text>
          {isLong && (
            <TouchableOpacity
              onPress={() => setExpanded((v) => !v)}
              accessibilityRole="button"
              accessibilityLabel={expanded ? '설명 접기' : '설명 더보기'}
            >
              <Text style={[styles.expandBtn, { color: colors.primary }]}>
                {expanded ? '접기' : '더보기'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  thumbnailContainer: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  playOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  descriptionBox: {
    marginTop: 12,
    borderRadius: 8,
    padding: 12,
  },
  description: { fontSize: 14, lineHeight: 20 },
  expandBtn: { marginTop: 8, fontSize: 13, fontWeight: '600' },
});
