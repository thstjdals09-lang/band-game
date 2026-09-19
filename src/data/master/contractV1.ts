// CONTRACT V1 시험 규칙 (CONTRACT_V1_PROVISIONAL).
//
// 공식 문서는 캐릭터별 personality(Character Master §09)와 contractProfile의 preferredDurationWeeks까지만
// 정의한다. "얼마를 더 받으면 긴 계약을 받아들이는가" 같은 수치는 어느 문서에도 없다.
// 아래 가중치는 전부 이번에 새로 도입한 V1 시험값이며 기획 확정값이 아니다.
//
// 설계 원칙
//  - 결정론적 판정. 확률을 굴리지 않는다.
//  - 모두에게 똑같이 적용되는 장기 계약 할인 / 주전 할인을 만들지 않는다.
//    기간은 riskTolerance, 역할은 ego로 갈리므로 캐릭터마다 부호가 반대로 나온다.
//  - 기존 15명의 기준 주급(baseSalary)은 건드리지 않는다. 여기서는 배수만 만든다.
export const CONTRACT_V1_PROVISIONAL = {
  /** 선호 조건 그대로일 때 받아들이는 기준 주급 비율. PHASE 1의 0.75를 그대로 옮긴 값. */
  baseAcceptRatio: 0.75,
  /**
   * 선호 기간에서 한 단계(26 → 52 → 104) 멀어질 때마다 riskTolerance에 비례해 움직이는 폭.
   * riskTolerance가 높으면 묶이는 것을 싫어해 장기 계약에 웃돈을 요구하고, 단기는 싸게 받는다.
   * 낮으면 반대로 안정을 원해 장기 계약을 싸게 받고 단기에 웃돈을 요구한다.
   */
  durationStepWeight: 0.06,
  /**
   * 서포트 역할을 제안했을 때 ego에 비례해 움직이는 폭.
   * ego가 높으면 무대를 양보하는 대가를 요구하고, 낮으면 오히려 부담이 줄어 조금 싸진다.
   * 주전(CORE_MEMBER)에는 어떤 보정도 붙이지 않는다.
   */
  supportRoleWeight: 0.30,
  /** 요구 비율의 상한과 하한. */
  minRequiredRatio: 0.5,
  maxRequiredRatio: 1.6,
  /** 계약 종료 전 이 기간 동안 재계약 협상이 열린다. */
  renewalWindowWeeks: 4,
  /** 주전 기용 약속: 최근 이만큼의 공연을 본다. */
  starterRecentShows: 4,
  /** 그 안에서 허용하는 결장 횟수. */
  starterAllowedAbsences: 1,
} as const;

export const CONTRACT_DURATION_OPTIONS = [26, 52, 104] as const;
