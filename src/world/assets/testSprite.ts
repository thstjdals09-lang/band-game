// WORLD VISUAL FIT TEST — one real character image dropped into the logical world so we can judge
// the room's viewpoint, proportions and camera.
//
// NOT A FINAL SPEC. Every number here is a development parameter and is tuned live in
// /dev/world (ISOMETRIC WORLD LAB). Nothing is locked until the art direction is approved.
//
// Source: the approved C01 master turnaround (assets_source/), front-facing standing pose,
// extracted as a connected component -> src/assets/characters/C01_FULL.png (145x311).

import { characterSpriteMetrics } from './characterSprites';

export interface TestSpriteParams {
  /** Draw the real image instead of the neutral debug block. */
  enabled: boolean;
  /** Character this stand-in represents. */
  characterId: string;
  assetKey: string;
  /** Native pixel size of the extracted sprite. */
  sourceSize: { w: number; h: number };
  /**
   * Pixel inside the sprite that sits on the spawn tile centre (the depth anchor).
   * y = sourceSize.h means "the very bottom row of the image".
   */
  footAnchor: { x: number; y: number };
  /** Sprite height expressed in elevation units - this is the scale control. */
  heightUnits: number;
}

/** Measured from the approved C01_FULL derivative; still a development default, not a locked spec. */
export const TEST_SPRITE_SOURCE = { w: 145, h: 311 } as const;

export const DEFAULT_TEST_SPRITE: TestSpriteParams = {
  enabled: true,
  characterId: 'C01',
  assetKey: 'CHARACTER_C01_FULL',
  sourceSize: { ...TEST_SPRITE_SOURCE },
  // Horizontal centre of the shoe contact band (x 0..119 across the bottom 20 rows), bottom row.
  footAnchor: { x: 59, y: 311 },
  // 1 elevation unit = 32 render px at the prototype tile size, so 2.2 ≈ 70 px tall on a 128px tile.
  heightUnits: 2.2,
};

export const TEST_SPRITE_LIMITS = {
  heightUnits: { min: 0.8, max: 4, step: 0.1 },
  footAnchor: { step: 2 },
} as const;

/** Sprite placement resolved for the renderer. */
export interface SpritePlacement {
  assetKey: string;
  sourceSize: { w: number; h: number };
  footAnchor: { x: number; y: number };
  heightUnits: number;
}

/**
 * 한 캐릭터를 타일 위에 세울 때 쓸 이미지와 접지 정보.
 *
 * 인물마다 자기 이미지를 쓴다. 다른 인물의 이미지를 대신 넣지 않는다.
 * - 랩에서 조정 중인 인물(params.characterId)은 랩 값을 그대로 따른다.
 * - 나머지는 자기 스프라이트 지표를 쓰고, 크기 기준(heightUnits)만 랩 값을 공유한다.
 * - 아직 자기 이미지가 없는 인물은 스프라이트 없이 그려진다.
 */
export function spriteFor(
  params: TestSpriteParams,
  characterId?: string,
  assetKey?: string,
): SpritePlacement | undefined {
  if (!params.enabled) return undefined;
  if (characterId && characterId === params.characterId) {
    return {
      assetKey: params.assetKey,
      sourceSize: params.sourceSize,
      footAnchor: params.footAnchor,
      heightUnits: params.heightUnits,
    };
  }
  const metrics = characterSpriteMetrics(characterId);
  if (!metrics || !assetKey) return undefined;
  return {
    assetKey,
    sourceSize: metrics.sourceSize,
    footAnchor: metrics.footAnchor,
    heightUnits: params.heightUnits,
  };
}
