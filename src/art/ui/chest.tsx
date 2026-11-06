/** Wooden treasure chest with gold bands (100x85 space). */
import React from 'react';
import { Circle, Defs, Ellipse, G, Path, Rect } from 'react-native-svg';
import { Ball, DGrad, Glow, INK, VGrad, sparklePath, type Gid } from '@/art/shared';

export function ChestBody({ g, open = false }: { g: Gid; open?: boolean }) {
  const ink = INK;
  const u = g.u;
  return (
    <G>
      <Defs>
        <VGrad id={g('wood')} top="#D98A48" bottom="#8A4718" />
        <VGrad id={g('woodLid')} top="#E7A262" bottom="#A35624" />
        <VGrad id={g('inner')} top="#5A2C0E" bottom="#2E1405" />
        <VGrad id={g('band')} top="#FFF07A" bottom="#D98E00" mid="#FFC72A" />
        <Ball id={g('coin')} light="#FFF7B0" base="#FFCB2A" dark="#D48600" />
        <DGrad id={g('ruby')} from="#FF9AA8" to="#C4102E" mid="#FF3A5A" />
        <DGrad id={g('saph')} from="#9EE6FF" to="#1D5FD8" mid="#3FA4FF" />
        <DGrad id={g('emer')} from="#A8FFB8" to="#16934A" mid="#34D06A" />
        <Glow id={g('glow')} color="#FFE36B" opacity={0.95} />
      </Defs>
      <Ellipse cx={50} cy={81} rx={42} ry={4} fill="#000" opacity={0.2} />
      {open ? (
        <G>
          <Ellipse cx={50} cy={36} rx={48} ry={34} fill={u('glow')} />
          {/* open lid (inside face visible) */}
          <Path d="M14 40 L18 8 Q50 0 82 8 L86 40 Z" fill={u('inner')} stroke={ink} strokeWidth={2.6} strokeLinejoin="round" />
          <Path d="M18 8 Q50 0 82 8 L81 13 Q50 5 19 13 Z" fill={u('woodLid')} stroke={ink} strokeWidth={2} strokeLinejoin="round" />
          <Path d="M24 7 L22 40 M76 7 L78 40" stroke={u('band')} strokeWidth={6} />
          {/* gold pile */}
          <Path d="M12 44 Q16 30 28 32 Q34 22 46 26 Q54 18 64 25 Q76 22 80 32 Q90 32 88 44 Z" fill={u('band')} stroke="#B86E00" strokeWidth={2.2} strokeLinejoin="round" />
          {[
            [24, 36], [34, 30], [46, 33], [57, 27], [68, 32], [78, 38], [40, 40], [62, 40], [30, 42],
          ].map(([x, y]) => (
            <G key={`${x}-${y}`}>
              <Ellipse cx={x} cy={y} rx={6} ry={4.2} fill={u('coin')} stroke="#B86E00" strokeWidth={1.6} />
              <Ellipse cx={x} cy={y} rx={3.2} ry={2} fill="none" stroke="#E09A00" strokeWidth={1} />
            </G>
          ))}
          <Path d="M48 18 L54 12 L60 18 L54 28 Z" fill={u('ruby')} stroke="#7A0A1C" strokeWidth={1.8} strokeLinejoin="round" />
          <Path d="M66 24 L71 19 L76 24 L71 32 Z" fill={u('saph')} stroke="#123A8A" strokeWidth={1.6} strokeLinejoin="round" />
          <Path d="M26 26 L31 21 L36 26 L31 34 Z" fill={u('emer')} stroke="#0B5A2A" strokeWidth={1.6} strokeLinejoin="round" />
          <Path d="M50 16 L54 14 L52 19 Z" fill="#fff" opacity={0.8} />
          <Path d={sparklePath(18, 18, 6)} fill="#fff" />
          <Path d={sparklePath(86, 22, 5)} fill="#FFF7B0" />
          <Path d={sparklePath(42, 10, 4)} fill="#fff" />
        </G>
      ) : (
        <G>
          {/* closed domed lid */}
          <Path d="M10 44 L10 30 Q10 14 50 14 Q90 14 90 30 L90 44 Z" fill={u('woodLid')} stroke={ink} strokeWidth={2.8} strokeLinejoin="round" />
          <Path d="M12 30 Q14 20 50 19 Q86 20 88 30" stroke={ink} strokeWidth={1.4} opacity={0.3} fill="none" />
          <Path d="M18 25 Q24 19 40 18" stroke="#fff" strokeWidth={3} opacity={0.45} strokeLinecap="round" fill="none" />
          <Path d="M22 15.5 L22 44 M78 15.5 L78 44" stroke={ink} strokeWidth={9} />
          <Path d="M22 16.5 L22 43 M78 16.5 L78 43" stroke={u('band')} strokeWidth={6} />
        </G>
      )}
      {/* base box */}
      <Rect x={10} y={42} width={80} height={38} rx={5} fill={u('wood')} stroke={ink} strokeWidth={2.8} />
      <Path d="M12 55 H88 M12 67 H88" stroke={ink} strokeWidth={1.4} opacity={0.3} />
      <Rect x={9} y={41} width={82} height={6} rx={3} fill={u('band')} stroke={ink} strokeWidth={2} />
      <Rect x={18} y={42} width={8} height={38} fill={u('band')} stroke={ink} strokeWidth={2} />
      <Rect x={74} y={42} width={8} height={38} fill={u('band')} stroke={ink} strokeWidth={2} />
      {[22, 78].map((x) => [52, 62, 72].map((y) => <Circle key={`${x}${y}`} cx={x} cy={y} r={1.3} fill="#A86400" />))}
      {/* lock */}
      <Path d="M42 44 H58 V58 Q58 64 50 66 Q42 64 42 58 Z" fill={u('band')} stroke={ink} strokeWidth={2.2} strokeLinejoin="round" />
      <Circle cx={50} cy={53} r={2.6} fill={ink} />
      <Path d="M48.8 54 L51.2 54 L52 60 L48 60 Z" fill={ink} />
      <Ellipse cx={45.5} cy={48} rx={1.6} ry={2.6} fill="#fff" opacity={0.7} />
      <Path d="M14 50 Q14 46 18 46" stroke="#fff" strokeWidth={2} opacity={0.35} strokeLinecap="round" fill="none" />
    </G>
  );
}
