// ============================================================================
// PROTOTYPE BALANCE - ALL VALUES ARE TODO(balance).
// None of these numbers are Source of Truth. Hero Screen HUD values (₩3,000,000 / Fans 100 / Fame 10)
// were visual placeholders only. Real balance is decided in Vertical Slice playtests (Character Master §01 Lock 상태).
// Keep every tunable number for the prototype flow here so it is obvious what is not locked.
// ============================================================================

export const PROTOTYPE_BALANCE = {
  start: {
    cash: 3_000_000,   // TODO(balance)
    fans: 100,         // TODO(balance)
    fame: 10,          // TODO(balance)
    condition: { energy: 80, stress: 20, morale: 70 }, // TODO(balance)
  },
  audition: {
    firstAuditionExpiresWeek: 4, // TODO(balance)
  },
  contract: {
    salaryStep: 50_000,   // TODO(balance) stepper increment in the Contract scene
    minSalary: 50_000,    // TODO(balance)
    /**
     * 기준 주급 대비 이 비율 이상이면 받아들인다. 기존 화면이 쓰던 0.75를 그대로 옮긴 값이라
     * 밸런스 변화는 없다. TODO(balance)
     */
    acceptSalaryRatio: 0.75,
    /** 화면 문구용. 실제 판정값은 CONTRACT_V1_PROVISIONAL에 있다. */
    starterRecentShows: 4,
    starterAllowedAbsences: 1,
    durationOptionsWeeks: [26, 52, 104] as const, // TODO(balance)
    initialSatisfaction: 70, // TODO(balance)
  },
  week: {
    energyDrift: -8,   // TODO(balance) per non-rest week
    energyRest: 15,    // TODO(balance)
  },
  songs: {
    /** Debut Showcase requires this many songs. Prototype script keeps producing demos until reached. */
    minSongsForDebut: 2,
    demoFanFit: 50,    // TODO(PHASE2 engine) placeholder 4-axis value
  },
  opportunity: {
    liveOfferDelayWeeks: 1,   // TODO(balance) offer appears next week
    liveOfferWindowWeeks: 2,  // TODO(balance) "Expires in 2 weeks" (IA §6 example)
    mediaOfferWindowWeeks: 1, // TODO(balance)
  },
  performance: {
    startEnergy: 40,        // TODO(balance)
    introEnergy: 10,        // TODO(balance)
    songEnergy: 15,         // TODO(balance)
    choicePushEnergy: 14,   // TODO(balance) LIVE_PEAK_UP + ACCIDENT_RISK_UP
    choicePlanEnergy: 6,    // TODO(balance) STABILITY_UP
    baseAudience: 40,       // TODO(balance)
    audiencePerFan: 0.25,   // TODO(balance)
    ticketRevenue: 10_000,  // TODO(balance) per audience member
    fansPerAudience: 0.5,   // TODO(balance)
    gradeThresholds: { great: 85, good: 65, okay: 45 }, // TODO(balance)
    reputationDelta: { 'GREAT SHOW': 8, 'GOOD SHOW': 5, OKAY: 2, DISASTER: -3 }, // TODO(balance)
  },
  facility: {
    constructionRevealMs: 1400, // Prototype Variable (연출 길이)
  },

  // ---------------------------------------------------------------------------------------
  // PHASE 2A growth loop. The documents define WHICH activities exist and WHAT they affect
  // (GDD §05 / IA §15) but give no magnitudes, so every number below is TODO(balance).
  // ---------------------------------------------------------------------------------------
  /** Per band-activity effect on every active member. */
  activityEffects: {
    PRACTICE:   { energy: -10, stress: 6,  morale: 3,  experience: 90 },  // TODO(balance)
    PROMOTION:  { energy: -7,  stress: 4,  morale: 1,  experience: 25 },  // TODO(balance)
    RECORDING:  { energy: -13, stress: 9,  morale: 2,  experience: 60 },  // TODO(balance)
    REST:       { energy: 22,  stress: -18, morale: 6, experience: 0 },   // TODO(balance)
    LIVE_SHOW:  { energy: -16, stress: 8,  morale: 8,  experience: 120 }, // TODO(balance)
  },
  /** Per individual-activity effect on the chosen member only. */
  individualEffects: {
    PRIVATE_LESSON: { energy: -8, stress: 4,  morale: 1, experience: 150 }, // TODO(balance)
    REST:           { energy: 26, stress: -22, morale: 5, experience: 0 },  // TODO(balance)
    INTERVIEW:      { energy: -5, stress: 3,  morale: 2, experience: 20, personalPopularity: 6 }, // TODO(balance)
  },
  growth: {
    /** Experience needed for one development stage. TODO(balance) */
    experiencePerStage: 600,
    maxDevelopmentStage: 10,
    /** Stat points granted per stage before curve and headroom scaling. TODO(balance) */
    statPointsPerStage: 6,
    /** Tired members learn less. TODO(balance) */
    lowEnergyThreshold: 35,
    lowEnergyExperienceFactor: 0.5,
    highStressThreshold: 70,
    highStressExperienceFactor: 0.7,
    /** A member already at their potential stops gaining. */
    potentialSoftCapMargin: 2,
  },
  promotion: {
    /** Fans gained per promotion week, scaled by star power. TODO(balance) */
    baseFans: 12,
    starPowerFactor: 0.35,
    fanLoyaltyGain: 1,
  },
  release: {
    /** One-off release payout per popularity point. TODO(balance) */
    revenuePerPopularity: 9000,
    epMultiplier: 2.4,
    fansPerPopularity: 1.1,
    reputationPerArtistry: 0.08,
    musicalReputationPerArtistry: 0.12,
    fanLoyaltyPerFanFit: 0.05,
    /** Weekly streaming income decays after release. TODO(balance) */
    weeklyIncomePerPopularity: 420,
    weeklyIncomeDecay: 0.82,
    weeklyIncomeWeeks: 12,
  },
  career: {
    /** GDD §07 Local Act 대표 체감 "지역 팬덤" threshold. TODO(balance) */
    localFanbaseFans: 300,
  },
  liveOffer: {
    /** Weeks to wait after a show before the next offer appears. TODO(balance) */
    cooldownWeeks: 1,
    /** Fans needed before the larger venue starts calling. TODO(balance) */
    moonlightClubFans: 260,
  },
  /**
   * 라이브 호흡 V1 시험 규칙 (Phase 2B-1). 플레이테스트로 확정할 임시값이며 기획 확정값이 아니다.
   * 함께 완료한 공연 횟수 n에 대해 pairFamiliarity = n / (n + softness).
   */
  familiarity: {
    softness: 3,   // TODO(balance)
    maxBonus: 4,   // TODO(balance) 점수에 더하는 상한. 감점은 없다.
  },
  performanceScore: {
    /** Weights over the inputs IA §19 lists. They sum to 1 before the moment-choice bonus. */
    skill: 0.24,
    stagePresence: 0.24,
    songLiveFit: 0.22,
    condition: 0.16,
    liveStability: 0.14,
    /** Crowd reaction from the moment choices, added on top. TODO(balance) */
    choiceBonusMax: 12,
    /** Random is a helper only (IA §19). TODO(balance) */
    randomSpread: 6,
  },
} as const;
