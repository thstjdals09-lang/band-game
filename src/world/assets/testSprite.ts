// WORLD VISUAL FIT TEST — one real character image dropped into the logical world so we can judge
// the room's viewpoint, proportions and camera.
//
// NOT A FINAL SPEC. Every number here is a development parameter and is tuned live in
// /dev/world (ISOMETRIC WORLD LAB). Nothing is locked until the art direction is approved.
//
// Source: danbiimages/C01_MASTER_DIRECTIONS_PIXEL_TEST_03.png, top-left standing pose,
// extracted as a connected component at sheet coords x 127-275, y 7-324.

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
  /** Use the same stand-in for every character/session so group scale can be judged. */
  applyToAllCharacters: boolean;
}

/** Measured from the extracted PNG; still a development default, not a locked spec. */
export const TEST_SPRITE_SOURCE = { w: 149, h: 318 } as const;

export const DEFAULT_TEST_SPRITE: TestSpriteParams = {
  enabled: true,
  characterId: 'C01',
  assetKey: 'CHARACTER_C01_TEST_FRONT',
  sourceSize: { ...TEST_SPRITE_SOURCE },
  // Horizontal centre of the shoe contact band (x 5..117 across the bottom 20 rows), bottom row.
  footAnchor: { x: 61, y: 318 },
  // 1 elevation unit = 32 render px at the prototype tile size, so 2.2 ≈ 70 px tall on a 128px tile.
  heightUnits: 2.2,
  applyToAllCharacters: false,
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

export function spriteFor(params: TestSpriteParams, characterId?: string): SpritePlacement | undefined {
  if (!params.enabled) return undefined;
  if (!params.applyToAllCharacters && characterId !== params.characterId) return undefined;
  return {
    assetKey: params.assetKey,
    sourceSize: params.sourceSize,
    footAnchor: params.footAnchor,
    heightUnits: params.heightUnits,
  };
}
