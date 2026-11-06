/**
 * Game object illustrations used by memory cards, hidden-object scenes, counting, matching etc.
 * CONTRACT: <ItemIcon name size /> renders a centered 3D cartoon illustration in a size x size box.
 * Optional: silhouette (shadow-matching) and overlay (recolour, e.g. find-the-difference).
 */
import React from "react";
import { ArtImage } from "@/art/ArtImage";
import { ITEMS_IMG } from "@/art/images";

export const ITEMS = [
  // fruit
  { name: 'apple', label: 'Apple', category: 'fruit', color: '#E53935' },
  { name: 'banana', label: 'Banana', category: 'fruit', color: '#FDD835' },
  { name: 'cherry', label: 'Cherry', category: 'fruit', color: '#C62828' },
  { name: 'grapes', label: 'Grapes', category: 'fruit', color: '#8E24AA' },
  { name: 'strawberry', label: 'Strawberry', category: 'fruit', color: '#F44336' },
  { name: 'orange', label: 'Orange', category: 'fruit', color: '#FB8C00' },
  { name: 'watermelon', label: 'Watermelon', category: 'fruit', color: '#43A047' },
  { name: 'pear', label: 'Pear', category: 'fruit', color: '#C0CA33' },
  // animals
  { name: 'lion', label: 'Lion', category: 'animal', color: '#F9A825' },
  { name: 'cat', label: 'Cat', category: 'animal', color: '#FFB74D' },
  { name: 'dog', label: 'Dog', category: 'animal', color: '#A1887F' },
  { name: 'rabbit', label: 'Rabbit', category: 'animal', color: '#ECEFF1' },
  { name: 'panda', label: 'Panda', category: 'animal', color: '#FAFAFA' },
  { name: 'frog', label: 'Frog', category: 'animal', color: '#66BB6A' },
  { name: 'owl', label: 'Owl', category: 'animal', color: '#8D6E63' },
  { name: 'fish', label: 'Fish', category: 'animal', color: '#29B6F6' },
  { name: 'elephant', label: 'Elephant', category: 'animal', color: '#90A4AE' },
  { name: 'monkey', label: 'Monkey', category: 'animal', color: '#8D6E63' },
  { name: 'turtle', label: 'Turtle', category: 'animal', color: '#7CB342' },
  { name: 'butterfly', label: 'Butterfly', category: 'animal', color: '#BA68C8' },
  // toys & things
  { name: 'ball', label: 'Ball', category: 'toy', color: '#EF5350' },
  { name: 'kite', label: 'Kite', category: 'toy', color: '#42A5F5' },
  { name: 'balloon', label: 'Balloon', category: 'toy', color: '#EC407A' },
  { name: 'drum', label: 'Drum', category: 'toy', color: '#FF7043' },
  { name: 'book', label: 'Book', category: 'toy', color: '#5C6BC0' },
  { name: 'umbrella', label: 'Umbrella', category: 'toy', color: '#AB47BC' },
  { name: 'hat', label: 'Hat', category: 'toy', color: '#26A69A' },
  { name: 'bell', label: 'Bell', category: 'toy', color: '#FFCA28' },
  { name: 'key', label: 'Key', category: 'treasure', color: '#FFC107' },
  { name: 'crown', label: 'Crown', category: 'treasure', color: '#FFD54F' },
  { name: 'gem', label: 'Gem', category: 'treasure', color: '#26C6DA' },
  { name: 'coinbag', label: 'Coin Bag', category: 'treasure', color: '#A1887F' },
  // nature
  { name: 'sun', label: 'Sun', category: 'nature', color: '#FFCA28' },
  { name: 'moon', label: 'Moon', category: 'nature', color: '#FFF59D' },
  { name: 'star', label: 'Star', category: 'nature', color: '#FFD600' },
  { name: 'cloud', label: 'Cloud', category: 'nature', color: '#E3F2FD' },
  { name: 'flower', label: 'Flower', category: 'nature', color: '#F06292' },
  { name: 'tree', label: 'Tree', category: 'nature', color: '#43A047' },
  { name: 'mushroom', label: 'Mushroom', category: 'nature', color: '#E53935' },
  { name: 'leaf', label: 'Leaf', category: 'nature', color: '#7CB342' },
  // sea & pirate
  { name: 'shell', label: 'Shell', category: 'sea', color: '#F8BBD0' },
  { name: 'anchor', label: 'Anchor', category: 'sea', color: '#546E7A' },
  { name: 'compass', label: 'Compass', category: 'sea', color: '#BCAAA4' },
  { name: 'ship', label: 'Ship', category: 'sea', color: '#8D6E63' },
  { name: 'parrot', label: 'Parrot', category: 'animal', color: '#43A047' },
  { name: 'crab', label: 'Crab', category: 'sea', color: '#FF7043' },
  { name: 'starfish', label: 'Starfish', category: 'sea', color: '#FF8A65' },
  // space
  { name: 'rocket', label: 'Rocket', category: 'space', color: '#EF5350' },
  { name: 'planet', label: 'Planet', category: 'space', color: '#7E57C2' },
  { name: 'ufo', label: 'UFO', category: 'space', color: '#26A69A' },
  { name: 'comet', label: 'Comet', category: 'space', color: '#4FC3F7' },
] as const;

export type ItemName = (typeof ITEMS)[number]['name'];
export type ItemCategory = (typeof ITEMS)[number]['category'];
export const ITEM_NAMES: ItemName[] = ITEMS.map((i) => i.name);
export const ITEM_BY_NAME = Object.fromEntries(ITEMS.map((i) => [i.name, i])) as Record<
  ItemName,
  (typeof ITEMS)[number]
>;

export interface ItemIconProps {
  name: ItemName;
  size: number;
  /** render as a solid dark shadow (true) or a given colour */
  silhouette?: boolean | string;
  /** recolour by blending a tinted copy on top */
  overlay?: { color: string; opacity: number };
}

/** Names without a bundled image (should always be empty; checked in tests). */
export const MISSING_ITEM_ART: string[] = ITEM_NAMES.filter((n) => ITEMS_IMG[n] === undefined);

export function ItemIcon({ name, size, silhouette, overlay }: ItemIconProps) {
  return <ArtImage source={ITEMS_IMG[name]} width={size} height={size} silhouette={silhouette} overlay={overlay} />;
}

export default React.memo(ItemIcon);
