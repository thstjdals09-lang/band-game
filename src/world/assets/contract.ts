// ASSET CONTRACT - what a production sprite must satisfy to drop into this world.
// No images exist yet; these types are the agreement between the world code and art production.
// See docs/BASECAMP_STAGE1_ASSET_PRODUCTION_SPEC.md.

import type { Footprint, GridPos } from '../iso/coordinates';

/** Where the sprite's own (0,0) pixel sits relative to its anchor tile centre, in tile fractions. */
export interface SpriteAnchor {
  /** 0.5 = horizontally centred on the anchor tile. */
  ax: number;
  /** 1 = sprite bottom sits on the anchor tile centre (standard for floor-standing props). */
  ay: number;
}

export const FLOOR_ANCHOR: SpriteAnchor = { ax: 0.5, ay: 1 };

export interface TileAssetDefinition {
  id: string;
  assetKey: string;
  kind: 'floor' | 'wall';
  /** Tiles this art covers (almost always 1x1 for floors). */
  footprint: Footprint;
  /** Transparent padding the artist must leave around the diamond, in render units. */
  paddingUnits: number;
}

export interface ObjectStateVariant {
  /** Player-visible state id, e.g. 'locked' | 'buildable' | 'built'. */
  id: string;
  assetKey: string;
  /** Optional short marker rendered above the object (counts, '!'). */
  badge?: string;
}

export interface ObjectAssetDefinition {
  id: string;
  /** Floor tiles reserved by the object - NOT the image bounding box. */
  footprint: Footprint;
  /** Anchor tile inside the footprint (offset from its min corner). */
  anchorOffset: GridPos;
  spriteAnchor: SpriteAnchor;
  /** Tile used for depth sorting; defaults to the front tile of the footprint. */
  depthAnchorOffset?: GridPos;
  /** Tile a character conceptually uses to interact; also a tap target. */
  interactionOffset?: GridPos;
  /** Visual height in elevation units, used for debug boxes and camera head-room. */
  heightUnits: number;
  stateVariants: ObjectStateVariant[];
}

export interface CharacterSpriteDefinition {
  characterId: string;
  assetKeyPrefix: string;
  /** Height in elevation units at the prototype tile size (4~4.5 등신 target). */
  heightUnits: number;
  spriteAnchor: SpriteAnchor;
  /** Pose keys the world can request. Animation frames are out of scope for this stage. */
  poses: string[];
}

export const CHARACTER_SPRITE_CONTRACT: Omit<CharacterSpriteDefinition, 'characterId' | 'assetKeyPrefix'> = {
  heightUnits: 1.6,
  spriteAnchor: FLOOR_ANCHOR,
  poses: ['idle', 'play', 'sit', 'talk'],
};
