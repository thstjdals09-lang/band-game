// 월드에 세우는 캐릭터별 스프라이트 지표.
//
// 이미지 자체는 `src/assets/characters/<ID>_FULL.png`(승인 마스터에서 뽑은 정면 뷰)이고,
// 여기 있는 값은 그 이미지를 타일 위에 올릴 때 필요한 크기와 접지점이다.
//   sourceSize : 이미지의 실제 픽셀 크기. 렌더러가 이 비율로 그리므로 실제 값과 달라지면 인물이 늘어난다.
//   footAnchor : 타일 중심에 닿아야 하는 픽셀. x는 신발 접지 구간(하단 20행)의 가로 중심, y는 맨 아랫줄.
//
// 새 캐릭터 아트를 넣을 때는 `<ID>_FULL.png`를 추가하고 여기에 한 줄 적으면 된다.
// 값이 없는 인물은 월드에서 스프라이트 없이(디버그 표시로) 그려진다 — 다른 인물의 이미지를 빌려 쓰지 않는다.

export interface CharacterSpriteMetrics {
  sourceSize: { w: number; h: number };
  footAnchor: { x: number; y: number };
}

export const CHARACTER_SPRITES: Record<string, CharacterSpriteMetrics> = {
  C01: { sourceSize: { w: 145, h: 311 }, footAnchor: { x: 59, y: 311 } },
  C02: { sourceSize: { w: 157, h: 310 }, footAnchor: { x: 72, y: 310 } },
  C04: { sourceSize: { w: 141, h: 308 }, footAnchor: { x: 67, y: 308 } },
  C07: { sourceSize: { w: 156, h: 347 }, footAnchor: { x: 71, y: 347 } },
  C10: { sourceSize: { w: 144, h: 312 }, footAnchor: { x: 63, y: 312 } },
};

export function characterSpriteMetrics(characterId?: string): CharacterSpriteMetrics | undefined {
  return characterId ? CHARACTER_SPRITES[characterId] : undefined;
}
