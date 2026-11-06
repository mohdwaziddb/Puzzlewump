/**
 * World art (bundled 3D renders):
 *  <WorldIcon worldId size />           — world emblem (castle, planet, temple, station, chest)
 *  <WorldScene worldId width height />  — full-screen background, cover-scaled
 *  <BossArt worldId size />             — the world's boss character
 */
import React from 'react';
import { Image, View } from 'react-native';
import type { WorldId } from '@/types';
import { worldThemes } from '@/constants/theme';
import { ArtImage } from '@/art/ArtImage';
import { BOSSES_IMG, SCENES_IMG, WORLDS_IMG } from '@/art/images';

export const WorldIcon = React.memo(function WorldIcon({ worldId, size }: { worldId: WorldId; size: number }) {
  return <ArtImage source={WORLDS_IMG[worldId]} width={size} height={size} />;
});

export const WorldScene = React.memo(function WorldScene({
  worldId,
  width,
  height,
}: {
  worldId: WorldId;
  width: number;
  height: number;
}) {
  return (
    <View
      style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, minWidth: width, minHeight: height, backgroundColor: worldThemes[worldId].skyTop, overflow: 'hidden' }}
      pointerEvents="none"
    >
      <Image source={SCENES_IMG[worldId]} style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }} resizeMode="cover" fadeDuration={0} />
    </View>
  );
});

export const BossArt = React.memo(function BossArt({ worldId, size }: { worldId: WorldId; size: number }) {
  return <ArtImage source={BOSSES_IMG[worldId]} width={size} height={size} />;
});

export default WorldIcon;
