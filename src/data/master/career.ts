// Career tiers, milestones and revenue streams.
// Source: GDD v0.2 §05 (수익 해금 단계) and §07 (커리어 단계 / 마일스톤).
// Character Master v1.1 §08 lists careerTiers / milestones / economy as Master Data, so they live here.
//
// The documents give the STAGES and the MILESTONE NAMES but no thresholds. Every number below is
// therefore a TODO(balance) placeholder pulled from PROTOTYPE_BALANCE, not a documented value.

import type { CareerTierId } from './types';

export type MilestoneId =
  | 'FIRST_SHOW' | 'FIRST_SELLOUT' | 'FIRST_RELEASE' | 'LOCAL_FANBASE' | 'FIRST_FACILITY'
  | 'FIRST_CHART' | 'FIRST_NATIONAL_TOUR' | 'FIRST_OVERSEAS' | 'FIRST_ARENA';

export interface MilestoneDefinition {
  id: MilestoneId;
  label: string;
  /** Short line shown when it is reached. */
  reveal: string;
  /** Reachable inside the Vertical Slice range (Unknown -> Local Act). */
  inVerticalSlice: boolean;
}

/** GDD §07: 첫 매진 / 첫 차트 진입 / 첫 전국투어 / 첫 해외 공연 / 첫 아레나 + VS 진입 단계. */
export const MILESTONES: Record<MilestoneId, MilestoneDefinition> = {
  FIRST_SHOW: { id: 'FIRST_SHOW', label: '첫 공연', reveal: '처음으로 무대에 섰다.', inVerticalSlice: true },
  FIRST_SELLOUT: { id: 'FIRST_SELLOUT', label: '첫 매진', reveal: '객석이 가득 찼다.', inVerticalSlice: true },
  FIRST_RELEASE: { id: 'FIRST_RELEASE', label: '첫 음원 발매', reveal: '우리 이름으로 음원이 나왔다.', inVerticalSlice: true },
  LOCAL_FANBASE: { id: 'LOCAL_FANBASE', label: '지역 팬덤', reveal: '이 동네에서 우리를 아는 사람이 생겼다.', inVerticalSlice: true },
  FIRST_FACILITY: { id: 'FIRST_FACILITY', label: '기본 시설 확장', reveal: '연습실이 넓어졌다.', inVerticalSlice: true },
  FIRST_CHART: { id: 'FIRST_CHART', label: '첫 차트 진입', reveal: '차트에 이름이 올랐다.', inVerticalSlice: false },
  FIRST_NATIONAL_TOUR: { id: 'FIRST_NATIONAL_TOUR', label: '첫 전국투어', reveal: '전국을 돌기 시작했다.', inVerticalSlice: false },
  FIRST_OVERSEAS: { id: 'FIRST_OVERSEAS', label: '첫 해외 공연', reveal: '국경을 넘었다.', inVerticalSlice: false },
  FIRST_ARENA: { id: 'FIRST_ARENA', label: '첫 아레나', reveal: '아레나에 섰다.', inVerticalSlice: false },
};

export interface CareerTierDefinition {
  id: CareerTierId;
  order: number;
  label: string;
  /** GDD §07 대표 체감 column, verbatim in meaning. */
  feel: string;
  /** Milestones that must all be reached to advance INTO this tier. */
  requires: MilestoneId[];
  /** Reachable inside the Vertical Slice. */
  inVerticalSlice: boolean;
}

export const CAREER_TIERS: Record<CareerTierId, CareerTierDefinition> = {
  UNKNOWN: {
    id: 'UNKNOWN', order: 0, label: '무명', feel: '허름한 연습실, 소규모 공연, 세션 의존',
    requires: [], inVerticalSlice: true,
  },
  LOCAL_ACT: {
    id: 'LOCAL_ACT', order: 1, label: '지역 밴드', feel: '지역 팬덤, 첫 매진, 기본 시설 확장',
    // The three things GDD lists as this tier's 대표 체감.
    requires: ['LOCAL_FANBASE', 'FIRST_SELLOUT', 'FIRST_FACILITY'], inVerticalSlice: true,
  },
  RISING_ACT: {
    id: 'RISING_ACT', order: 2, label: '떠오르는 밴드', feel: '전국 인지도, 페스티벌/첫 투어',
    requires: ['FIRST_CHART'], inVerticalSlice: false,
  },
  MAJOR: {
    id: 'MAJOR', order: 3, label: '메이저', feel: '레이블·대형 계약, 본격 미디어 노출',
    requires: ['FIRST_NATIONAL_TOUR'], inVerticalSlice: false,
  },
  STAR: {
    id: 'STAR', order: 4, label: '스타', feel: '대형 공연장·전국 투어·강한 개인 인기',
    requires: ['FIRST_ARENA'], inVerticalSlice: false,
  },
  WORLD_ICON: {
    id: 'WORLD_ICON', order: 5, label: '월드 아이콘', feel: '해외 시장·월드투어·대표 엔딩 가능',
    requires: ['FIRST_OVERSEAS'], inVerticalSlice: false,
  },
};

export const CAREER_TIER_ORDER: CareerTierId[] =
  (Object.keys(CAREER_TIERS) as CareerTierId[]).sort((a, b) => CAREER_TIERS[a].order - CAREER_TIERS[b].order);

// ---------------------------------------------------------------------------------------------
// GDD §05 수익 해금 단계: 공연 → 음원/앨범 → 굿즈 → 투어 → 광고·스폰서 → 대형 계약
// Only the first two are inside the Vertical Slice.
// ---------------------------------------------------------------------------------------------
export type RevenueStreamId = 'LIVE' | 'MUSIC' | 'GOODS' | 'TOUR' | 'SPONSOR' | 'MAJOR_DEAL';

export interface RevenueStreamDefinition {
  id: RevenueStreamId;
  label: string;
  order: number;
  /** Milestone that opens this stream; undefined = open from the start. */
  unlockedBy?: MilestoneId;
  inVerticalSlice: boolean;
}

export const REVENUE_STREAMS: Record<RevenueStreamId, RevenueStreamDefinition> = {
  LIVE: { id: 'LIVE', label: '공연', order: 0, inVerticalSlice: true },
  MUSIC: { id: 'MUSIC', label: '음원 / 앨범', order: 1, unlockedBy: 'FIRST_SHOW', inVerticalSlice: true },
  GOODS: { id: 'GOODS', label: '굿즈', order: 2, unlockedBy: 'FIRST_CHART', inVerticalSlice: false },
  TOUR: { id: 'TOUR', label: '투어', order: 3, unlockedBy: 'FIRST_NATIONAL_TOUR', inVerticalSlice: false },
  SPONSOR: { id: 'SPONSOR', label: '광고 · 스폰서', order: 4, unlockedBy: 'FIRST_ARENA', inVerticalSlice: false },
  MAJOR_DEAL: { id: 'MAJOR_DEAL', label: '대형 계약', order: 5, unlockedBy: 'FIRST_OVERSEAS', inVerticalSlice: false },
};

/** GDD §06 발매 전략: 싱글로 빠르게 승부 / EP로 팬층 강화 / 정규앨범까지 모으기. */
export type ReleaseKind = 'SINGLE' | 'EP' | 'ALBUM';

export interface ReleaseFormatDefinition {
  id: ReleaseKind;
  label: string;
  /** Songs required to release this format. TODO(balance): counts are not given in the docs. */
  songsRequired: number;
  inVerticalSlice: boolean;
}

export const RELEASE_FORMATS: Record<ReleaseKind, ReleaseFormatDefinition> = {
  SINGLE: { id: 'SINGLE', label: '싱글', songsRequired: 1, inVerticalSlice: true },
  EP: { id: 'EP', label: 'EP', songsRequired: 3, inVerticalSlice: true },
  ALBUM: { id: 'ALBUM', label: '정규 앨범', songsRequired: 8, inVerticalSlice: false },
};
