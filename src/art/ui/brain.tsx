/** Pink brain mascot body (100x100 space). Reused by BrainMascot, Logo and the brain badge. */
import React from 'react';
import { Circle, Defs, Ellipse, G, Path, RadialGradient, Stop } from 'react-native-svg';
import { INK, type Gid } from '@/art/shared';

export type BrainMood = 'happy' | 'wink' | 'wow';

const OUTLINE =
  'M20 58 Q9 50 15 39 Q13 27 26 23 Q30 12 42 15 Q50 8 58 15 Q70 12 74 23 Q87 27 85 39 Q91 50 80 58 Q82 71 69 72 Q63 80 54 76 Q50 80 46 76 Q37 80 31 72 Q18 71 20 58 Z';

const FOLDS = [
  'M50 16 Q46 26 50 34 Q54 42 50 50',
  'M24 36 Q30 30 36 35 Q40 40 36 44',
  'M30 24 Q36 22 40 27',
  'M64 27 Q68 22 74 25',
  'M76 36 Q70 31 65 36 Q61 41 65 45',
  'M18 50 Q24 47 27 52',
  'M82 50 Q76 47 73 52',
  'M38 66 Q44 70 46 74',
  'M62 66 Q56 70 54 74',
];

export function BrainBody({
  g,
  mood = 'happy',
  arms = true,
  face = true,
}: {
  g: Gid;
  mood?: BrainMood;
  arms?: boolean;
  face?: boolean;
}) {
  const ink = INK;
  const fold = '#D24C8A';
  return (
    <G>
      <Defs>
        <RadialGradient id={g('brain')} cx="0.38" cy="0.3" r="0.75" fx="0.38" fy="0.3">
          <Stop offset="0" stopColor="#FFE0EE" />
          <Stop offset="0.35" stopColor="#FFA6CC" />
          <Stop offset="1" stopColor="#E25D9A" />
        </RadialGradient>
      </Defs>
      <Ellipse cx={50} cy={92} rx={26} ry={4} fill="#000" opacity={0.16} />
      {arms ? (
        <G>
          {/* feet */}
          <Ellipse cx={40} cy={84} rx={7} ry={5} fill={g.u('brain')} stroke={ink} strokeWidth={2.4} />
          <Ellipse cx={60} cy={84} rx={7} ry={5} fill={g.u('brain')} stroke={ink} strokeWidth={2.4} />
          {/* arms */}
          <Path d="M17 58 Q7 56 7 45" stroke={ink} strokeWidth={8} strokeLinecap="round" fill="none" />
          <Path d="M17 58 Q7 56 7 45" stroke="#FF9EC7" strokeWidth={4.5} strokeLinecap="round" fill="none" />
          <Circle cx={7} cy={42} r={5.4} fill={g.u('brain')} stroke={ink} strokeWidth={2.2} />
          <Path d="M83 58 Q93 60 94 68" stroke={ink} strokeWidth={8} strokeLinecap="round" fill="none" />
          <Path d="M83 58 Q93 60 94 68" stroke="#FF9EC7" strokeWidth={4.5} strokeLinecap="round" fill="none" />
          <Circle cx={94} cy={70} r={5.4} fill={g.u('brain')} stroke={ink} strokeWidth={2.2} />
        </G>
      ) : null}
      <Path d={OUTLINE} fill={g.u('brain')} stroke={ink} strokeWidth={3} strokeLinejoin="round" />
      {FOLDS.map((d) => (
        <Path key={d} d={d} stroke={fold} strokeWidth={2.4} strokeLinecap="round" fill="none" opacity={0.75} />
      ))}
      <Ellipse cx={33} cy={24} rx={8} ry={4} fill="#fff" opacity={0.7} transform="rotate(-25 33 24)" />
      <Circle cx={45} cy={19} r={1.8} fill="#fff" opacity={0.8} />
      {face ? <BrainFace mood={mood} /> : null}
    </G>
  );
}

function BrainFace({ mood }: { mood: BrainMood }) {
  const ink = INK;
  const eye = (x: number, r = 4.2) => (
    <G key={x}>
      <Ellipse cx={x} cy={52} rx={r} ry={r * 1.25} fill="#2B1A10" />
      <Circle cx={x + 1.3} cy={50} r={r * 0.4} fill="#fff" />
      <Circle cx={x - 1.2} cy={54.3} r={r * 0.18} fill="#fff" />
    </G>
  );
  return (
    <G>
      <Ellipse cx={30} cy={60} rx={4.5} ry={2.6} fill="#FF5C8E" opacity={0.5} />
      <Ellipse cx={70} cy={60} rx={4.5} ry={2.6} fill="#FF5C8E" opacity={0.5} />
      {mood === 'wow' ? (
        <G>
          {eye(39, 5.2)}
          {eye(61, 5.2)}
          <Ellipse cx={50} cy={66} rx={4} ry={5} fill="#8E2236" stroke={ink} strokeWidth={2} />
          <Path d="M33 41 Q38 38 43 40 M57 40 Q62 38 67 41" stroke={ink} strokeWidth={2} strokeLinecap="round" fill="none" />
        </G>
      ) : mood === 'wink' ? (
        <G>
          <Path d="M35 53 Q39 48 43 53" stroke="#2B1A10" strokeWidth={3} strokeLinecap="round" fill="none" />
          {eye(61)}
          <Path d="M42 61 Q50 64 58 61 Q57 70 50 70 Q43 70 42 61 Z" fill="#8E2236" stroke={ink} strokeWidth={2} strokeLinejoin="round" />
          <Path d="M50 69 Q55 72 56 66" fill="#FF7F8E" stroke={ink} strokeWidth={1.4} />
        </G>
      ) : (
        <G>
          {eye(39)}
          {eye(61)}
          <Path d="M42 61 Q50 63 58 61 Q57 70 50 70 Q43 70 42 61 Z" fill="#8E2236" stroke={ink} strokeWidth={2} strokeLinejoin="round" />
          <Ellipse cx={50} cy={67.3} rx={3.6} ry={1.8} fill="#FF7F8E" />
        </G>
      )}
    </G>
  );
}
