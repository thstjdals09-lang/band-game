// 월드에 세우는 스프라이트의 크기와 발 접지점.
//
// **여기에 적는 건 선택이다.** 적혀 있지 않은 그림은 렌더러가 브라우저에서 직접 재서 세운다
// (measureSprite.ts). 그래서 자세 그림은 파일만 넣으면 되고 이 표를 건드릴 필요가 없다.
//
// 적어두면 좋은 경우:
//  - 기본 전신처럼 항상 쓰이는 그림 (측정 대기 없이 첫 프레임부터 정확히 선다)
//  - 점프처럼 접지점이 그림 바닥과 다른 자세 (측정으로는 알 수 없으므로 값을 적어 덮어쓴다)
//
//   sourceSize  : 그려지는 이미지 전체 크기(투명 여백 포함)
//   footAnchor  : 타일 중심에 닿아야 하는 픽셀
//   heightBasis : 자세 등급의 키에 대응하는 source 픽셀 수 (여백을 뺀 인물 높이)

export interface SpriteMetrics {
  sourceSize: { w: number; h: number };
  footAnchor: { x: number; y: number };
  heightBasis: number;
}

export const SPRITE_METRICS: Record<string, SpriteMetrics> = {
  CHARACTER_C01_FULL: { sourceSize: { w: 145, h: 311 }, footAnchor: { x: 59, y: 311 }, heightBasis: 311 },
  CHARACTER_C02_FULL: { sourceSize: { w: 157, h: 310 }, footAnchor: { x: 72, y: 310 }, heightBasis: 310 },
  CHARACTER_C04_FULL: { sourceSize: { w: 141, h: 308 }, footAnchor: { x: 67, y: 308 }, heightBasis: 308 },
  CHARACTER_C07_FULL: { sourceSize: { w: 156, h: 347 }, footAnchor: { x: 71, y: 347 }, heightBasis: 347 },
  CHARACTER_C10_FULL: { sourceSize: { w: 144, h: 312 }, footAnchor: { x: 63, y: 312 }, heightBasis: 312 },
  SESSION_01_FULL: { sourceSize: { w: 102, h: 247 }, footAnchor: { x: 48, y: 247 }, heightBasis: 247 },
  SESSION_02_FULL: { sourceSize: { w: 100, h: 248 }, footAnchor: { x: 56, y: 248 }, heightBasis: 248 },
  SESSION_03_FULL: { sourceSize: { w: 108, h: 245 }, footAnchor: { x: 51, y: 245 }, heightBasis: 245 },
  SESSION_04_FULL: { sourceSize: { w: 108, h: 252 }, footAnchor: { x: 44, y: 252 }, heightBasis: 252 },
  SESSION_05_FULL: { sourceSize: { w: 96, h: 238 }, footAnchor: { x: 43, y: 238 }, heightBasis: 238 },
  SESSION_06_FULL: { sourceSize: { w: 109, h: 251 }, footAnchor: { x: 43, y: 251 }, heightBasis: 251 },
  SESSION_07_FULL: { sourceSize: { w: 102, h: 248 }, footAnchor: { x: 46, y: 248 }, heightBasis: 248 },
  SESSION_08_FULL: { sourceSize: { w: 107, h: 253 }, footAnchor: { x: 47, y: 253 }, heightBasis: 253 },
  SESSION_09_FULL: { sourceSize: { w: 107, h: 243 }, footAnchor: { x: 47, y: 243 }, heightBasis: 243 },
  SESSION_10_FULL: { sourceSize: { w: 102, h: 241 }, footAnchor: { x: 42, y: 241 }, heightBasis: 241 },
  SESSION_11_FULL: { sourceSize: { w: 105, h: 248 }, footAnchor: { x: 47, y: 248 }, heightBasis: 248 },
  SESSION_12_FULL: { sourceSize: { w: 100, h: 243 }, footAnchor: { x: 43, y: 243 }, heightBasis: 243 },
  SESSION_13_FULL: { sourceSize: { w: 103, h: 256 }, footAnchor: { x: 47, y: 256 }, heightBasis: 256 },
  SESSION_14_FULL: { sourceSize: { w: 104, h: 262 }, footAnchor: { x: 46, y: 262 }, heightBasis: 262 },
  SESSION_15_FULL: { sourceSize: { w: 122, h: 268 }, footAnchor: { x: 46, y: 268 }, heightBasis: 268 },
};

/** 적어둔 값이 있으면 그것을 쓰고, 없으면 렌더러가 직접 잰다. */
export function spriteMetricsFor(assetKey?: string): SpriteMetrics | undefined {
  return assetKey ? SPRITE_METRICS[assetKey] : undefined;
}
