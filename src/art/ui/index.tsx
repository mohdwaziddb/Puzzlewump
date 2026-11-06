/**
 * UI art barrel.
 * Small vector icons live in ./icons. Large illustrations (chest, mascot, logo, menu art) are bundled
 * 3D renders; achievement badges stay vector so they can be recoloured per badge.
 */
import React from "react";
import Svg, { Circle, Defs, G, Path, Rect } from "react-native-svg";
import type { BadgeArt } from "@/data/achievements";
import { Ball, DGrad, INK, VGrad, shade, useGid } from "@/art/shared";
import { ArtImage } from "@/art/ArtImage";
import { UI_IMG } from "@/art/images";
import {
  BrainEmblem,
  ChestEmblem,
  CoinEmblem,
  CrownEmblem,
  FlameEmblem,
  GemEmblem,
  MedalEmblem,
  RocketEmblem,
  StarEmblem,
  TrophyEmblem,
  type Emblem,
} from "./emblems";

export * from "./icons";

/** Treasure chest; `open` shows lid open with glowing gold. size = width, height = size*0.85 */
export const ChestArt = React.memo(function ChestArt({ size, open = false }: { size: number; open?: boolean }) {
  return <ArtImage source={UI_IMG[open ? "chest_open" : "chest_closed"]} width={size} height={size * 0.85} />;
});

/** The cute pink brain mascot. size x size */
export const BrainMascot = React.memo(function BrainMascot({
  size,
}: {
  size: number;
  mood?: "happy" | "wink" | "wow";
  arms?: boolean;
}) {
  return <ArtImage source={UI_IMG.brain} width={size} height={size} />;
});

/** "Brain Quest / Mind Adventure" logo. width = size, height = size*0.75 */
export const Logo = React.memo(function Logo({ size }: { size: number }) {
  return <ArtImage source={UI_IMG.logo} width={size} height={size * 0.75} />;
});

const BADGE_EMBLEM: Record<BadgeArt, Emblem> = {
  star: StarEmblem,
  trophy: TrophyEmblem,
  brain: BrainEmblem,
  coin: CoinEmblem,
  flame: FlameEmblem,
  crown: CrownEmblem,
  gem: GemEmblem,
  medal: MedalEmblem,
  rocket: RocketEmblem,
  chest: ChestEmblem,
};

/** Achievement badge medallion. size x size. locked = greyed out */
export const BadgeArtIcon = React.memo(function BadgeArtIcon({
  art,
  size,
  color,
  locked = false,
}: {
  art: BadgeArt;
  size: number;
  color: string;
  locked?: boolean;
}) {
  const g = useGid();
  const base = locked ? '#A9B1BF' : color;
  const E = BADGE_EMBLEM[art] ?? StarEmblem;
  const dots = Array.from({ length: 16 }, (_, i) => {
    const a = (Math.PI * 2 * i) / 16;
    return [50 + 38 * Math.cos(a), 46 + 38 * Math.sin(a)];
  });
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <DGrad id={g('ring')} from={shade(base, 0.45)} mid={base} to={shade(base, -0.4)} />
        <Ball id={g('disc')} light={shade(base, 0.55)} base={shade(base, 0.1)} dark={shade(base, -0.35)} />
        <VGrad id={g('rib')} top={shade(base, -0.05)} bottom={shade(base, -0.4)} />
        <VGrad id={g('lock')} top="#E2E7EF" bottom="#8C96A8" />
      </Defs>
      {/* ribbon tails */}
      <Path d="M30 68 L20 96 L31 90 L37 99 L46 74 Z" fill={g.u('rib')} stroke={INK} strokeWidth={2.4} strokeLinejoin="round" />
      <Path d="M70 68 L80 96 L69 90 L63 99 L54 74 Z" fill={g.u('rib')} stroke={INK} strokeWidth={2.4} strokeLinejoin="round" />
      <Circle cx={50} cy={49} r={43} fill={shade(base, -0.55)} />
      <Circle cx={50} cy={46} r={43} fill={g.u('ring')} stroke={INK} strokeWidth={3} />
      {dots.map(([x, y], i) => (
        <Circle key={i} cx={x} cy={y} r={1.7} fill="#fff" opacity={0.55} />
      ))}
      <Circle cx={50} cy={46} r={32} fill={g.u('disc')} stroke={shade(base, -0.5)} strokeWidth={2.4} />
      <G transform="translate(27 23) scale(0.46)">
        <E g={g} />
      </G>
      <Path d="M24 34 Q34 12 60 12" stroke="#fff" strokeWidth={4} strokeLinecap="round" opacity={0.45} fill="none" />
      {locked ? (
        <G>
          <Circle cx={50} cy={46} r={32} fill="#7E8798" opacity={0.6} />
          <Path d="M66 70 V64 Q73 55 80 64 V70" stroke={INK} strokeWidth={6} fill="none" strokeLinecap="round" />
          <Path d="M66 70 V64 Q73 55 80 64 V70" stroke="#C3CAD6" strokeWidth={3} fill="none" strokeLinecap="round" />
          <Rect x={61} y={68} width={24} height={20} rx={5} fill={g.u('lock')} stroke={INK} strokeWidth={2.6} />
          <Circle cx={73} cy={76} r={2.6} fill={INK} />
          <Rect x={72} y={77} width={2} height={6} rx={1} fill={INK} />
        </G>
      ) : null}
    </Svg>
  );
});

/** Illustrations for menu buttons on the home screen. size x size */
export type MenuArtName = "map" | "calendar" | "trophy" | "crown" | "chart" | "gift";

export const MenuArt = React.memo(function MenuArt({ name, size }: { name: MenuArtName; size: number }) {
  return <ArtImage source={UI_IMG[name]} width={size} height={size} />;
});

export default ChestArt;
