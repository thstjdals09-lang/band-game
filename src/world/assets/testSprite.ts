// WORLD SPRITE PLACEMENT — 월드에 인물을 세우는 규칙.
//
// 설계 원칙: **어떤 이미지인가는 노드가 정한다.**
// 캐릭터/세션 노드는 이미 자기 `assetKey`를 들고 있고, 크기·접지점은 그 키로 `SPRITE_METRICS`에서 찾는다.
// 아래 파라미터는 "얼마나 크게 세울지"만 정하며, 어떤 인물인지는 담지 않는다.
//
// 예전에는 이 파라미터가 characterId/assetKey/sourceSize/footAnchor까지 들고 있었고, 그 객체가
// localStorage에 통째로 저장됐다. 그래서 (1) 파라미터 경로를 못 타는 세션은 블록으로 떨어지고,
// (2) 브라우저에 남은 옛 assetKey 때문에 특정 인물이 화면에서 사라지고, (3) "모든 캐릭터에 적용"이
// 켜져 있으면 전원이 같은 얼굴로 그려졌다. 정체성을 파라미터에서 들어내면 세 가지가 함께 사라진다.
//
// NOT A FINAL SPEC. 값은 개발 파라미터이며 /dev/world (ISOMETRIC WORLD LAB)에서 실시간 조정한다.
import { spriteMetricsFor } from './spriteMetrics';

/**
 * 파일 이름 끝의 자세 등급 -> 서 있는 키 대비 비율.
 * `C01_POSE_4_SIT.png` 처럼 끝 토큰으로 정한다. 필요해지면 여기에 줄을 늘린다.
 * 값은 이번에 들어온 앉은 자세를 실제로 재서 나온 비율(0.82)을 출발점으로 잡았다.
 */
export const POSE_HEIGHT_CLASS: Record<string, number> = {
  FULL: 1,
  // 기본 3.6u일 때 3.0u(≈95px). 비율로 둬서 랩에서 키를 바꾸면 같이 따라간다.
  SIT: 3.0 / 3.6,
};

/** 에셋 키 끝에서 자세 등급을 읽는다. 모르면 서 있는 것으로 본다. */
export function poseHeightScale(assetKey: string): number {
  const cls = assetKey.slice(assetKey.lastIndexOf('_') + 1);
  return POSE_HEIGHT_CLASS[cls] ?? 1;
}

export interface TestSpriteParams {
  /** Draw real art instead of the neutral debug block. */
  enabled: boolean;
  /**
   * Sprite height in elevation units - the scale control.
   * 1 unit = PROTOTYPE_PROJECTION.elevationHeight (32 render px).
   */
  heightUnits: number;
  /**
   * 접지 보정. 모든 스프라이트에 똑같이 더해지는 개발용 오프셋으로,
   * 발이 타일 중심에 닿는지 확인할 때만 쓴다. 기본은 보정 없음.
   */
  footNudge: { x: number; y: number };
}

export const DEFAULT_TEST_SPRITE: TestSpriteParams = {
  enabled: true,
  // 3.6u × 32 = 115.2 render px. 타일 폭 128 위에 인물이 서 있는 크기.
  heightUnits: 3.6,
  footNudge: { x: 0, y: 0 },
};

export const TEST_SPRITE_LIMITS = {
  heightUnits: { min: 0.8, max: 6, step: 0.1 },
  footNudge: { step: 2 },
} as const;

/** Sprite placement resolved for the renderer. */
export interface SpritePlacement {
  assetKey: string;
  heightUnits: number;
  /**
   * 'exact' = 측정한 크기와 접지점으로 그린다 (SPRITE_METRICS에 있는 에셋).
   * 'measure' = 적어둔 값이 없는 그림. 렌더러가 브라우저에서 직접 재서 세운다.
   *             덕분에 여백이 어떻든 파일을 넣기만 하면 제자리에 선다.
   */
  mode: 'exact' | 'measure';
  sourceSize?: { w: number; h: number };
  footAnchor?: { x: number; y: number };
  /** heightUnits 높이에 대응하는 source 픽셀 수. 앉은 자세가 서 있는 자세보다 낮게 서는 근거. */
  heightBasis?: number;
}

/**
 * 이 노드를 월드에 세울 때 쓸 이미지와 접지 정보.
 *
 * 노드의 assetKey로만 찾는다 — 다른 인물의 이미지를 대신 쓰지 않는다.
 * 크기를 재둔 에셋은 'exact', 아직 재지 않은 에셋은 'fit'으로 세운다.
 * 레지스트리에 그림 자체가 없으면 렌더러가 이미지를 그리지 않고 기존 디버그 표시로 남긴다.
 */
export function spriteFor(params: TestSpriteParams, assetKey?: string): SpritePlacement | undefined {
  if (!params.enabled || !assetKey) return undefined;
  // 자세 등급이 키를 정한다. 앉은 자세는 서 있는 자세보다 낮게 선다.
  const heightUnits = params.heightUnits * poseHeightScale(assetKey);
  const metrics = spriteMetricsFor(assetKey);
  // 적어둔 값이 없으면 렌더러가 그림을 직접 재서 세운다.
  if (!metrics) return { assetKey, heightUnits, mode: 'measure' };
  return {
    assetKey,
    heightUnits,
    mode: 'exact',
    sourceSize: metrics.sourceSize,
    heightBasis: metrics.heightBasis,
    footAnchor: {
      x: metrics.footAnchor.x + params.footNudge.x,
      y: metrics.footAnchor.y + params.footNudge.y,
    },
  };
}
