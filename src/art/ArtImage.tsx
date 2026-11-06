/**
 * Shared renderer for all bundled 3D art.
 *  - `silhouette`  -> solid dark shape (Image tintColor works on Android, iOS and web)
 *  - `overlay`     -> recolour: a tinted copy of the same image blended on top
 *  - `dim`         -> locked look (dark silhouette, slightly transparent)
 */
import React from 'react';
import { Image, View, type ImageResizeMode, type StyleProp, type ViewStyle } from 'react-native';

export interface ArtImageProps {
  source: number | undefined;
  width: number;
  height: number;
  resizeMode?: ImageResizeMode;
  silhouette?: string | boolean;
  overlay?: { color: string; opacity: number };
  style?: StyleProp<ViewStyle>;
}

export const ArtImage = React.memo(function ArtImage({
  source,
  width,
  height,
  resizeMode = 'contain',
  silhouette,
  overlay,
  style,
}: ArtImageProps) {
  if (source === undefined) return <View style={[{ width, height }, style]} />;
  const tint = silhouette ? (typeof silhouette === 'string' ? silhouette : '#22193A') : undefined;
  return (
    <View style={[{ width, height }, style]} pointerEvents="none">
      <Image
        source={source}
        style={{ width, height, tintColor: tint }}
        resizeMode={resizeMode}
        fadeDuration={0}
        accessibilityIgnoresInvertColors
      />
      {overlay && !tint ? (
        <Image
          source={source}
          style={{ position: 'absolute', left: 0, top: 0, width, height, tintColor: overlay.color, opacity: overlay.opacity }}
          resizeMode={resizeMode}
          fadeDuration={0}
        />
      ) : null}
    </View>
  );
});
