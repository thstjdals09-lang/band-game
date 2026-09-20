// 월드에 세우는 스프라이트의 크기와 발 접지점.
//
// 키는 에셋 레지스트리 키 그대로다. 노드가 들고 있는 assetKey로 바로 찾는다.
//   sourceSize : 이미지의 실제 픽셀 크기. 렌더러가 이 비율로 그리므로 실제 값과 어긋나면 인물이 늘어난다.
//   footAnchor : 타일 중심에 닿아야 하는 픽셀. x = 하단 20행 접지 구간의 가로 중심, y = 맨 아랫줄.
//
// 값은 실제 PNG에서 측정한 것이다. 새 아트를 넣으면 여기에 한 줄 추가한다.
// 측정 방법: 하단 20행에서 alpha > 8 인 픽셀의 x 범위 중앙, y는 이미지 높이.
// 여기에 없는 에셋은 월드에서 스프라이트 없이 그려진다 — 다른 인물의 이미지를 빌려 쓰지 않는다.

export interface SpriteMetrics {
  sourceSize: { w: number; h: number };
  footAnchor: { x: number; y: number };
}

export const SPRITE_METRICS: Record<string, SpriteMetrics> = {
  CHARACTER_C01_FULL: { sourceSize: { w: 145, h: 311 }, footAnchor: { x: 59, y: 311 } },
  CHARACTER_C02_FULL: { sourceSize: { w: 157, h: 310 }, footAnchor: { x: 72, y: 310 } },
  CHARACTER_C04_FULL: { sourceSize: { w: 141, h: 308 }, footAnchor: { x: 67, y: 308 } },
  CHARACTER_C07_FULL: { sourceSize: { w: 156, h: 347 }, footAnchor: { x: 71, y: 347 } },
  CHARACTER_C10_FULL: { sourceSize: { w: 144, h: 312 }, footAnchor: { x: 63, y: 312 } },
  SESSION_01_FULL: { sourceSize: { w: 102, h: 247 }, footAnchor: { x: 48, y: 247 } },
  SESSION_02_FULL: { sourceSize: { w: 100, h: 248 }, footAnchor: { x: 56, y: 248 } },
  SESSION_03_FULL: { sourceSize: { w: 108, h: 245 }, footAnchor: { x: 51, y: 245 } },
  SESSION_04_FULL: { sourceSize: { w: 108, h: 252 }, footAnchor: { x: 44, y: 252 } },
  SESSION_05_FULL: { sourceSize: { w: 96, h: 238 }, footAnchor: { x: 43, y: 238 } },
  SESSION_06_FULL: { sourceSize: { w: 109, h: 251 }, footAnchor: { x: 43, y: 251 } },
  SESSION_07_FULL: { sourceSize: { w: 102, h: 248 }, footAnchor: { x: 46, y: 248 } },
  SESSION_08_FULL: { sourceSize: { w: 107, h: 253 }, footAnchor: { x: 47, y: 253 } },
  SESSION_09_FULL: { sourceSize: { w: 107, h: 243 }, footAnchor: { x: 47, y: 243 } },
  SESSION_10_FULL: { sourceSize: { w: 102, h: 241 }, footAnchor: { x: 42, y: 241 } },
  SESSION_11_FULL: { sourceSize: { w: 105, h: 248 }, footAnchor: { x: 47, y: 248 } },
  SESSION_12_FULL: { sourceSize: { w: 100, h: 243 }, footAnchor: { x: 43, y: 243 } },
  SESSION_13_FULL: { sourceSize: { w: 103, h: 256 }, footAnchor: { x: 47, y: 256 } },
  SESSION_14_FULL: { sourceSize: { w: 104, h: 262 }, footAnchor: { x: 46, y: 262 } },
  SESSION_15_FULL: { sourceSize: { w: 122, h: 268 }, footAnchor: { x: 46, y: 268 } },
};

/** 이 에셋을 월드에 세울 수 있는가. */
export function spriteMetricsFor(assetKey?: string): SpriteMetrics | undefined {
  return assetKey ? SPRITE_METRICS[assetKey] : undefined;
}
