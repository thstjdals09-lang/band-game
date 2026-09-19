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
} as const;
