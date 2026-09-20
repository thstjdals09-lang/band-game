// 월드에 세우는 스프라이트의 크기와 발 접지점.
//
// 키는 에셋 레지스트리 키 그대로다. 노드가 들고 있는 assetKey로 바로 찾는다.
//   sourceSize  : 그려지는 이미지 전체 크기(투명 여백 포함).
//   footAnchor  : 타일 중심에 닿아야 하는 픽셀. 내용의 접지 구간 가로 중심과 맨 아랫줄이며,
//                 여백이 있는 그림도 이 값 덕분에 제자리에 선다.
//   heightBasis : heightUnits 높이에 대응하는 source 픽셀 수.
//                 서 있는 기본 그림은 자기 내용 높이를 쓰고, 한 인물의 자세 그림들은
//                 그중 가장 큰 내용 높이를 함께 쓴다. 그래야 앉은 자세가 서 있는 자세보다 낮게 선다.
//
// 값은 실제 PNG에서 측정한 것이다. 새 그림을 넣으면 여기에 한 줄 추가한다.
// 여기에 없는 에셋도 월드에 서지만(높이에 맞춰 넣는 'fit' 모드), 발 위치는 이미지 바닥 한가운데가 된다.

export interface SpriteMetrics {
  sourceSize: { w: number; h: number };
  footAnchor: { x: number; y: number };
  heightBasis: number;
}

export const SPRITE_METRICS: Record<string, SpriteMetrics> = {
  CHARACTER_C01_FULL: { sourceSize: { w: 145, h: 311 }, footAnchor: { x: 59, y: 311 }, heightBasis: 311 },
  CHARACTER_C01_POSE_1_FULL: { sourceSize: { w: 254, h: 338 }, footAnchor: { x: 150, y: 334 }, heightBasis: 367 },
  CHARACTER_C01_POSE_2_FULL: { sourceSize: { w: 280, h: 373 }, footAnchor: { x: 133, y: 369 }, heightBasis: 367 },
  CHARACTER_C01_POSE_3_FULL: { sourceSize: { w: 268, h: 358 }, footAnchor: { x: 135, y: 354 }, heightBasis: 367 },
  CHARACTER_C01_POSE_4_FULL: { sourceSize: { w: 280, h: 373 }, footAnchor: { x: 133, y: 369 }, heightBasis: 367 },
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

/** 이 에셋을 정확한 크기로 세울 수 있는가. */
export function spriteMetricsFor(assetKey?: string): SpriteMetrics | undefined {
  return assetKey ? SPRITE_METRICS[assetKey] : undefined;
}
