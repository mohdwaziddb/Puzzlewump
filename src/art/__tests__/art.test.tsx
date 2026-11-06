jest.setTimeout(30000);
import React from 'react';
import { act } from 'react';
import { createRoot } from 'test-renderer';
import type { WorldId } from '@/types';
import type { BadgeArt } from '@/data/achievements';
import { CharacterArt, EXPRESSIONS, characterSource } from '@/art/characters';
import { BossArt, WorldIcon, WorldScene } from '@/art/worlds';
import { ITEM_NAMES, ItemIcon, MISSING_ITEM_ART } from '@/art/items';
import { ITEMS_IMG } from '@/art/images';
import { BadgeArtIcon, BrainMascot, ChestArt, Logo, MenuArt, type MenuArtName } from '@/art/ui';
import { ArtGallery } from '@/art/Gallery';

const WORLDS: WorldId[] = ['memory', 'number', 'jungle', 'logic', 'treasure'];
const CHARS = ['max', 'mia', 'coco', 'robo'] as const;
const BADGES: BadgeArt[] = ['star', 'trophy', 'brain', 'coin', 'flame', 'crown', 'gem', 'medal', 'rocket', 'chest'];
const MENUS: MenuArtName[] = ['map', 'calendar', 'trophy', 'crown', 'chart', 'gift'];

async function render(el: React.ReactElement) {
  const root = createRoot();
  await act(async () => {
    root.render(el);
  });
  return root;
}

describe('art', () => {
  it('has a drawing for every item', () => {
    expect(MISSING_ITEM_ART).toEqual([]);
    for (const n of ITEM_NAMES) expect(ITEMS_IMG[n]).toBeDefined();
  });

  it('has every character body', () => {
    for (const c of CHARS) for (const e of EXPRESSIONS) expect(characterSource(c, e)).toBeDefined();
  });

  it('renders every character x expression (+ locked)', async () => {
    for (const c of CHARS) {
      for (const e of EXPRESSIONS) await render(<CharacterArt id={c} expression={e} size={100} />);
      await render(<CharacterArt id={c} size={100} locked />);
    }
  });

  it('renders worlds, scenes and bosses', async () => {
    for (const w of WORLDS) {
      await render(<WorldIcon worldId={w} size={80} />);
      await render(<WorldScene worldId={w} width={360} height={720} />);
      await render(<BossArt worldId={w} size={120} />);
    }
  });

  it('renders every item', async () => {
    for (const n of ITEM_NAMES) await render(<ItemIcon name={n} size={64} />);
  });

  it('renders ui art', async () => {
    await render(<ChestArt size={100} />);
    await render(<ChestArt size={100} open />);
    for (const m of ['happy', 'wink', 'wow'] as const) await render(<BrainMascot size={100} mood={m} />);
    await render(<Logo size={300} />);
    for (const b of BADGES) {
      await render(<BadgeArtIcon art={b} size={80} color="#A46CF5" />);
      await render(<BadgeArtIcon art={b} size={80} color="#A46CF5" locked />);
    }
    for (const m of MENUS) await render(<MenuArt name={m} size={80} />);
  });

  it('renders the gallery', async () => {
    const root = await render(<ArtGallery />);
    expect(root.container).toBeTruthy();
  });
});
