/**
 * CONTRACT: <CharacterArt id expression size /> — full-body 3D cartoon character in a
 * size (width) x size*1.25 (height) box, feet at the bottom. Expressions = different poses.
 */
import React from 'react';
import type { CharacterId, Expression } from '@/types';
import { ArtImage } from '@/art/ArtImage';
import { CHARACTERS_IMG } from '@/art/images';

export interface CharacterArtProps {
  id: CharacterId;
  expression?: Expression;
  size: number;
  /** dark silhouette for locked characters */
  locked?: boolean;
}

export const EXPRESSIONS: Expression[] = ['idle', 'happy', 'cheer', 'think', 'sad'];

export function characterSource(id: CharacterId, expression: Expression = 'idle'): number | undefined {
  return CHARACTERS_IMG[`${id}_${expression}`] ?? CHARACTERS_IMG[`${id}_idle`];
}

export function CharacterArt({ id, expression = 'idle', size, locked }: CharacterArtProps) {
  return (
    <ArtImage
      source={characterSource(id, expression)}
      width={size}
      height={size * 1.25}
      silhouette={locked ? '#2A2F45' : undefined}
      style={locked ? { opacity: 0.85 } : undefined}
    />
  );
}

export default React.memo(CharacterArt);
