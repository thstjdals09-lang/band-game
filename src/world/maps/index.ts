import { BASECAMP_STAGE_1 } from './basecampStage1';
import { BASECAMP_STAGE_2 } from './basecampStage2';
import type { BasecampMap } from './types';

export * from './types';
export { BASECAMP_STAGE_1 } from './basecampStage1';
export { BASECAMP_STAGE_2, BASECAMP_STAGE_2_PATCH } from './basecampStage2';

export const BASECAMP_MAPS: BasecampMap[] = [BASECAMP_STAGE_1, BASECAMP_STAGE_2];

/** Map for a basecamp visual stage. Falls back to the highest stage at or below the request. */
export function basecampMapForStage(stage: number): BasecampMap {
  const sorted = [...BASECAMP_MAPS].sort((a, b) => a.stage - b.stage);
  let chosen = sorted[0];
  sorted.forEach((m) => { if (m.stage <= stage) chosen = m; });
  return chosen;
}
