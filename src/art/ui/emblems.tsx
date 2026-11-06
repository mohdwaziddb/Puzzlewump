/** Glossy emblem drawings in a 100x100 space, used by badges and menu illustrations. */
import React from 'react';
import { Circle, Defs, Ellipse, G, Path, Rect } from 'react-native-svg';
import { Ball, DGrad, Glow, INK, VGrad, sparklePath, starPath, type Gid } from '@/art/shared';
import { BrainBody } from './brain';
import { ChestBody } from './chest';

export type Emblem = (p: { g: Gid }) => React.ReactElement;

const GOLD_IN = '#B86A00';

function GoldDefs({ g }: { g: Gid }) {
  return (
    <Defs>
      <VGrad id={g('gold')} top="#FFF27A" mid="#FFC81F" bottom="#E08A00" />
      <DGrad id={g('goldD')} from="#FFF6A8" mid="#FFC81F" to="#D98200" />
      <Ball id={g('goldB')} light="#FFFBD0" base="#FFCD2A" dark="#D48600" />
    </Defs>
  );
}

export const StarEmblem: Emblem = ({ g }) => (
  <G>
    <GoldDefs g={g} />
    <Path d={starPath(50, 54, 42, 0.48)} fill={GOLD_IN} />
    <Path d={starPath(50, 50, 42, 0.48)} fill={g.u('gold')} stroke={GOLD_IN} strokeWidth={3.5} strokeLinejoin="round" />
    <Path d={starPath(50, 52, 24, 0.48)} fill="#FFE86A" opacity={0.7} />
    <Path d="M38 30 Q46 22 54 26 L50 36 Q44 33 40 38 Z" fill="#fff" opacity={0.7} />
  </G>
);

export const TrophyEmblem: Emblem = ({ g }) => (
  <G>
    <GoldDefs g={g} />
    <Defs>
      <VGrad id={g('plinth')} top="#A0582A" bottom="#5C2C0E" />
    </Defs>
    <Path d="M30 26 Q12 26 14 42 Q16 56 34 54" stroke={INK} strokeWidth={10} fill="none" strokeLinecap="round" />
    <Path d="M30 26 Q12 26 14 42 Q16 56 34 54" stroke={g.u('gold')} strokeWidth={6} fill="none" strokeLinecap="round" />
    <Path d="M70 26 Q88 26 86 42 Q84 56 66 54" stroke={INK} strokeWidth={10} fill="none" strokeLinecap="round" />
    <Path d="M70 26 Q88 26 86 42 Q84 56 66 54" stroke={g.u('gold')} strokeWidth={6} fill="none" strokeLinecap="round" />
    <Rect x={43} y={60} width={14} height={16} fill={g.u('gold')} stroke={INK} strokeWidth={2.6} />
    <Path d="M32 82 L37 72 H63 L68 82 Z" fill={g.u('gold')} stroke={INK} strokeWidth={2.6} strokeLinejoin="round" />
    <Rect x={26} y={81} width={48} height={12} rx={3} fill={g.u('plinth')} stroke={INK} strokeWidth={2.6} />
    <Rect x={40} y={84.5} width={20} height={5} rx={1.5} fill="#FFD95A" stroke={GOLD_IN} strokeWidth={1} />
    <Path d="M26 14 H74 V36 Q74 64 50 66 Q26 64 26 36 Z" fill={g.u('goldD')} stroke={INK} strokeWidth={3} strokeLinejoin="round" />
    <Ellipse cx={50} cy={14.5} rx={24} ry={4} fill="#FFE57A" stroke={INK} strokeWidth={2.2} />
    <Path d={starPath(50, 40, 12)} fill="#FFF6B0" stroke={GOLD_IN} strokeWidth={1.8} strokeLinejoin="round" />
    <Path d="M32 22 Q31 46 40 58" stroke="#fff" strokeWidth={4} strokeLinecap="round" opacity={0.6} fill="none" />
    <Path d={sparklePath(80, 14, 6)} fill="#fff" />
  </G>
);

export const CrownEmblem: Emblem = ({ g }) => (
  <G>
    <GoldDefs g={g} />
    <Defs>
      <DGrad id={g('ruby')} from="#FFA3B1" mid="#FF3A5A" to="#B00C28" />
      <DGrad id={g('saph')} from="#A8ECFF" mid="#3FA4FF" to="#1846B8" />
    </Defs>
    <Path d="M14 76 L9 32 L32 52 L50 18 L68 52 L91 32 L86 76 Z" fill={g.u('goldD')} stroke={INK} strokeWidth={3.2} strokeLinejoin="round" />
    <Path d="M18 66 L15 42 L31 58 L50 28 L50 66 Z" fill="#FFF2A0" opacity={0.45} />
    <Rect x={12} y={68} width={76} height={16} rx={5} fill={g.u('gold')} stroke={INK} strokeWidth={3} />
    <Circle cx={9} cy={30} r={5.5} fill={g.u('goldB')} stroke={INK} strokeWidth={2.4} />
    <Circle cx={50} cy={15} r={6} fill={g.u('goldB')} stroke={INK} strokeWidth={2.4} />
    <Circle cx={91} cy={30} r={5.5} fill={g.u('goldB')} stroke={INK} strokeWidth={2.4} />
    <Path d="M50 46 L57 54 L50 62 L43 54 Z" fill={g.u('ruby')} stroke={INK} strokeWidth={2} strokeLinejoin="round" />
    <Ellipse cx={28} cy={76} rx={4.5} ry={3.6} fill={g.u('saph')} stroke={INK} strokeWidth={1.8} />
    <Ellipse cx={50} cy={76} rx={5} ry={4} fill={g.u('ruby')} stroke={INK} strokeWidth={1.8} />
    <Ellipse cx={72} cy={76} rx={4.5} ry={3.6} fill={g.u('saph')} stroke={INK} strokeWidth={1.8} />
    <Path d="M17 72 H40" stroke="#fff" strokeWidth={2.4} opacity={0.6} strokeLinecap="round" />
    <Path d={sparklePath(76, 18, 6)} fill="#fff" />
  </G>
);

export const CoinEmblem: Emblem = ({ g }) => (
  <G>
    <GoldDefs g={g} />
    <Circle cx={50} cy={55} r={40} fill={GOLD_IN} />
    <Circle cx={50} cy={50} r={40} fill={g.u('goldD')} stroke={INK} strokeWidth={3} />
    <Circle cx={50} cy={50} r={29} fill="none" stroke="#E09A00" strokeWidth={4} />
    <Path d={starPath(50, 51, 18)} fill="#FFE680" stroke={GOLD_IN} strokeWidth={2} strokeLinejoin="round" />
    <Ellipse cx={34} cy={28} rx={11} ry={5} fill="#fff" opacity={0.7} transform="rotate(-30 34 28)" />
  </G>
);

export const FlameEmblem: Emblem = ({ g }) => (
  <G>
    <Defs>
      <VGrad id={g('fo')} top="#FFB13D" mid="#FF6A1F" bottom="#D9261A" />
      <VGrad id={g('fi')} top="#FFFBD0" mid="#FFE45A" bottom="#FFA41F" />
      <Glow id={g('fg')} color="#FFB13D" opacity={0.6} />
    </Defs>
    <Circle cx={50} cy={58} r={44} fill={g.u('fg')} />
    <Path
      d="M50 6 Q74 30 76 54 Q80 86 50 92 Q20 86 24 58 Q26 42 38 32 Q37 48 46 52 Q38 28 50 6 Z"
      fill={g.u('fo')}
      stroke="#8E1A0E"
      strokeWidth={3}
      strokeLinejoin="round"
    />
    <Path d="M52 38 Q66 54 64 70 Q62 86 50 87 Q36 85 36 70 Q36 60 44 54 Q44 64 50 66 Q46 50 52 38 Z" fill={g.u('fi')} />
    <Path d="M32 56 Q30 70 38 80" stroke="#fff" strokeWidth={3} opacity={0.5} strokeLinecap="round" fill="none" />
  </G>
);

export const GemEmblem: Emblem = ({ g }) => (
  <G>
    <Defs>
      <DGrad id={g('gem')} from="#C9FBFF" mid="#36D4E8" to="#0E7FA6" />
      <VGrad id={g('gemTop')} top="#F0FFFF" bottom="#7FE9F5" />
    </Defs>
    <Path d="M14 38 L30 16 H70 L86 38 L50 88 Z" fill={g.u('gem')} stroke="#0B4D66" strokeWidth={3.2} strokeLinejoin="round" />
    <Path d="M30 16 L40 38 L50 16 L60 38 L70 16" stroke="#0B4D66" strokeWidth={1.8} fill="none" strokeLinejoin="round" opacity={0.7} />
    <Path d="M14 38 H86" stroke="#0B4D66" strokeWidth={2} />
    <Path d="M40 38 L50 88 L60 38" stroke="#0B4D66" strokeWidth={1.6} fill="none" opacity={0.5} />
    <Path d="M30 16 L40 38 L50 16 Z M50 16 L60 38 L70 16 Z" fill={g.u('gemTop')} opacity={0.7} />
    <Path d="M18 40 L44 40 L50 80 Z" fill="#fff" opacity={0.25} />
    <Path d={sparklePath(72, 26, 7)} fill="#fff" />
  </G>
);

export const MedalEmblem: Emblem = ({ g }) => (
  <G>
    <GoldDefs g={g} />
    <Defs>
      <VGrad id={g('rb')} top="#5AB0FF" bottom="#1E5FC4" />
      <VGrad id={g('rr')} top="#FF7A7A" bottom="#C4232E" />
    </Defs>
    <Path d="M26 6 H44 L56 42 H40 Z" fill={g.u('rb')} stroke={INK} strokeWidth={2.6} strokeLinejoin="round" />
    <Path d="M74 6 H56 L44 42 H60 Z" fill={g.u('rr')} stroke={INK} strokeWidth={2.6} strokeLinejoin="round" />
    <Circle cx={50} cy={64} r={28} fill={GOLD_IN} />
    <Circle cx={50} cy={61} r={28} fill={g.u('goldD')} stroke={INK} strokeWidth={3} />
    <Circle cx={50} cy={61} r={20} fill="none" stroke="#E09A00" strokeWidth={3} />
    <Path d={starPath(50, 62, 13)} fill="#FFF3A0" stroke={GOLD_IN} strokeWidth={1.8} strokeLinejoin="round" />
    <Ellipse cx={38} cy={46} rx={8} ry={4} fill="#fff" opacity={0.65} transform="rotate(-30 38 46)" />
  </G>
);

export const RocketEmblem: Emblem = ({ g }) => (
  <G>
    <Defs>
      <DGrad id={g('body')} from="#FFFFFF" to="#BFCDE3" />
      <VGrad id={g('red')} top="#FF8A7A" bottom="#C9232E" />
      <Ball id={g('win')} light="#E4FBFF" base="#4FC3F7" dark="#1A5FB4" />
      <VGrad id={g('fire')} top="#FFF6A0" mid="#FFB52A" bottom="#FF5A1F" />
    </Defs>
    <Path d="M40 74 Q50 100 60 74 Z" fill={g.u('fire')} />
    <Path d="M30 56 L18 74 L36 72 Z" fill={g.u('red')} stroke={INK} strokeWidth={2.6} strokeLinejoin="round" />
    <Path d="M70 56 L82 74 L64 72 Z" fill={g.u('red')} stroke={INK} strokeWidth={2.6} strokeLinejoin="round" />
    <Path d="M50 6 Q72 24 68 74 H32 Q28 24 50 6 Z" fill={g.u('body')} stroke={INK} strokeWidth={3} strokeLinejoin="round" />
    <Path d="M50 6 Q62 15 66 26 H34 Q38 15 50 6 Z" fill={g.u('red')} stroke={INK} strokeWidth={2.6} strokeLinejoin="round" />
    <Circle cx={50} cy={44} r={10} fill={g.u('win')} stroke={INK} strokeWidth={3} />
    <Circle cx={46.5} cy={40.5} r={3} fill="#fff" opacity={0.8} />
    <Rect x={44} y={66} width={12} height={10} rx={2} fill={g.u('red')} stroke={INK} strokeWidth={2.4} />
    <Path d="M38 32 Q36 50 38 66" stroke="#fff" strokeWidth={3} opacity={0.7} strokeLinecap="round" fill="none" />
  </G>
);

export const BrainEmblem: Emblem = ({ g }) => (
  <G transform="translate(4 2) scale(0.92)">
    <BrainBody g={g} arms={false} />
  </G>
);

export const ChestEmblem: Emblem = ({ g }) => (
  <G transform="translate(0 10)">
    <ChestBody g={g} open />
  </G>
);
