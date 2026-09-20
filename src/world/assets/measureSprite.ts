// 그림을 읽어서 크기와 접지점을 직접 잰다.
//
// 이게 있기 때문에 그림 쪽에 아무 규칙도 요구하지 않는다.
// 여백이 얼마든, 내용이 가운데가 아니든, 파일을 넣기만 하면 제자리에 선다.
//
// 재는 값:
//   contentBox : 투명하지 않은 부분의 사각형. 여백을 무시하기 위해 쓴다.
//   footAnchor : 타일 중심에 닿을 픽셀. 내용 맨 아랫줄에서 실제로 칠해진 구간의 가로 중심.
//                점프처럼 접지점이 그림 바닥과 다른 자세는 SPRITE_METRICS에 값을 적어 덮어쓴다.
import type { SpriteMetrics } from './spriteMetrics';

const ALPHA_T = 8;

const cache = new Map<string, SpriteMetrics>();
const pending = new Set<string>();
const listeners = new Set<() => void>();

function notify(): void {
  listeners.forEach((fn) => fn());
}

/** 측정이 끝나면 다시 그리도록 알림을 받는다. */
export function onSpriteMeasured(fn: () => void): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

function measure(img: HTMLImageElement): SpriteMetrics | undefined {
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  if (!w || !h) return undefined;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return undefined;
  ctx.drawImage(img, 0, 0);
  let data: Uint8ClampedArray;
  try {
    data = ctx.getImageData(0, 0, w, h).data;
  } catch {
    return undefined; // 캔버스를 읽을 수 없는 환경
  }

  let minX = w; let maxX = -1; let minY = h; let maxY = -1;
  for (let y = 0; y < h; y += 1) {
    const row = y * w * 4;
    for (let x = 0; x < w; x += 1) {
      if (data[row + x * 4 + 3] > ALPHA_T) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxY < 0) return undefined; // 전부 투명

  // 접지 구간: 내용 맨 아랫줄에서 20행 위까지 칠해진 x 범위의 가운데.
  let footMin = w; let footMax = -1;
  for (let y = Math.max(minY, maxY - 19); y <= maxY; y += 1) {
    const row = y * w * 4;
    for (let x = 0; x < w; x += 1) {
      if (data[row + x * 4 + 3] > ALPHA_T) {
        if (x < footMin) footMin = x;
        if (x > footMax) footMax = x;
      }
    }
  }

  return {
    sourceSize: { w, h },
    footAnchor: { x: Math.round((footMin + footMax) / 2), y: maxY + 1 },
    // 여백을 뺀 실제 인물 높이. 이 높이가 자세 등급의 키에 대응한다.
    heightBasis: maxY - minY + 1,
  };
}

/**
 * 이 그림의 측정값. 처음 물어보면 undefined를 주고 뒤에서 재며,
 * 다 재고 나면 onSpriteMeasured로 알려 다시 그리게 한다.
 */
export function measuredMetricsFor(url: string): SpriteMetrics | undefined {
  const hit = cache.get(url);
  if (hit) return hit;
  if (pending.has(url) || typeof document === 'undefined') return undefined;
  pending.add(url);
  const img = new Image();
  img.onload = () => {
    const m = measure(img);
    pending.delete(url);
    if (m) { cache.set(url, m); notify(); }
  };
  img.onerror = () => { pending.delete(url); };
  img.src = url;
  return undefined;
}
