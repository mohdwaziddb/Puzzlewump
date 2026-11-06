/** Visual QA page that renders every art piece. Route to it from settings > about in dev. */
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { WorldId } from '@/types';
import type { BadgeArt } from '@/data/achievements';
import { CharacterArt, EXPRESSIONS } from './characters';
import { BossArt, WorldIcon, WorldScene } from './worlds';
import { ITEMS, ItemIcon } from './items';
import { BadgeArtIcon, BrainMascot, ChestArt, Logo, MenuArt, type MenuArtName } from './ui';

const WORLDS: WorldId[] = ['memory', 'number', 'jungle', 'logic', 'treasure'];
const CHARS = ['max', 'mia', 'coco', 'robo'] as const;
const BADGES: BadgeArt[] = ['star', 'trophy', 'brain', 'coin', 'flame', 'crown', 'gem', 'medal', 'rocket', 'chest'];
const BADGE_COLORS = ['#FFB13D', '#A46CF5', '#FF7EB6', '#4AA8FF', '#5BC43A'];
const MENUS: MenuArtName[] = ['map', 'calendar', 'trophy', 'crown', 'chart', 'gift'];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={s.section}>
      <Text style={s.title}>{title}</Text>
      <View style={s.row}>{children}</View>
    </View>
  );
}

function Cell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={s.cell}>
      {children}
      <Text style={s.label}>{label}</Text>
    </View>
  );
}

export function ArtGallery() {
  return (
    <ScrollView style={s.root} contentContainerStyle={s.content}>
      <Section title="Logo & mascot">
        <Logo size={260} />
        <BrainMascot size={110} mood="happy" />
        <BrainMascot size={110} mood="wink" />
        <BrainMascot size={110} mood="wow" />
      </Section>
      {CHARS.map((id) => (
        <Section key={id} title={`Character: ${id}`}>
          {EXPRESSIONS.map((e) => (
            <Cell key={e} label={e}>
              <CharacterArt id={id} expression={e} size={90} />
            </Cell>
          ))}
          <Cell label="locked">
            <CharacterArt id={id} size={90} locked />
          </Cell>
        </Section>
      ))}
      <Section title="World icons">
        {WORLDS.map((w) => (
          <Cell key={w} label={w}>
            <WorldIcon worldId={w} size={100} />
          </Cell>
        ))}
      </Section>
      <Section title="Bosses">
        {WORLDS.map((w) => (
          <Cell key={w} label={w}>
            <BossArt worldId={w} size={120} />
          </Cell>
        ))}
      </Section>
      <Section title="World scenes">
        {WORLDS.map((w) => (
          <Cell key={w} label={w}>
            <View style={s.scene}>
              <WorldScene worldId={w} width={150} height={300} />
            </View>
          </Cell>
        ))}
      </Section>
      <Section title="Chest">
        <ChestArt size={130} />
        <ChestArt size={130} open />
      </Section>
      <Section title="Menu art">
        {MENUS.map((m) => (
          <Cell key={m} label={m}>
            <MenuArt name={m} size={80} />
          </Cell>
        ))}
      </Section>
      <Section title="Badges">
        {BADGES.map((b, i) => (
          <Cell key={b} label={b}>
            <BadgeArtIcon art={b} size={80} color={BADGE_COLORS[i % BADGE_COLORS.length]} locked={false} />
          </Cell>
        ))}
        {BADGES.slice(0, 3).map((b) => (
          <Cell key={b + 'l'} label={b + ' (locked)'}>
            <BadgeArtIcon art={b} size={80} color="#FFB13D" locked />
          </Cell>
        ))}
      </Section>
      <Section title={`Items (${ITEMS.length}) at 32px and 96px`}>
        {ITEMS.map((it) => (
          <Cell key={it.name} label={it.name}>
            <View style={s.itemPair}>
              <ItemIcon name={it.name} size={32} />
              <ItemIcon name={it.name} size={96} />
            </View>
          </Cell>
        ))}
      </Section>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#E9F6FF' },
  content: { padding: 12, paddingBottom: 60 },
  section: { marginBottom: 18 },
  title: { fontSize: 18, fontWeight: '700', color: '#3A2A1A', marginBottom: 8 },
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end', gap: 10 },
  cell: { alignItems: 'center' },
  label: { fontSize: 11, color: '#6B5843', marginTop: 2 },
  scene: { borderRadius: 12, overflow: 'hidden' },
  itemPair: { flexDirection: 'row', alignItems: 'flex-end', gap: 4 },
});

export default ArtGallery;
