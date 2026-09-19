// PHASE 2A playthrough: a real browser plays a NEW GAME for 5+ consecutive weeks and checks that
// the growth loop repeats — schedule -> growth/songs -> show -> reward -> career/unlock -> next week.
import { chromium } from 'playwright';

const BASE = 'http://localhost:4173/band-game/';
const errors = [];
const log = (...a) => console.log('•', ...a);

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
const page = await ctx.newPage();
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });

const expect = async (cond, label) => { if (!cond) throw new Error(`EXPECT FAILED: ${label}`); log('ok', label); };
const text = async () => (await page.locator('.phone').innerText()).replace(/\s+/g, ' ');
const hash = () => new URL(page.url()).hash;
const tapText = async (t, exact = false) => { await page.getByText(t, { exact }).first().click(); await page.waitForTimeout(140); };
const save = () => page.evaluate(() => JSON.parse(localStorage.getItem('band-game.save.v1')).state.save);

const DEV_PATTERNS = [/PLACEHOLDER/, /TODO/, /§/, /\bSSR\b/, /\bUR\b/, /rarity/i, /PHASE\s?2/i];
async function clean(name) {
  const t = await text();
  for (const p of DEV_PATTERNS) if (p.test(t)) throw new Error(`DEV/RARITY LEAK on ${name}: ${p} -> ${t.slice(0, 200)}`);
}

async function worldTap(id) {
  for (let i = 0; i < 6; i += 1) {
    const box = await page.locator(`[data-object="${id}"]`).boundingBox();
    if (!box) throw new Error(`world object ${id} not rendered`);
    const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
    const vw = page.viewportSize();
    const dx = vw.width / 2 - cx, dy = vw.height / 2 - cy;
    if (Math.abs(dx) < 60 && Math.abs(dy) < 60) break;
    await page.mouse.move(vw.width / 2, vw.height / 2);
    await page.mouse.down();
    await page.mouse.move(vw.width / 2 + dx / 2, vw.height / 2 + dy / 2, { steps: 6 });
    await page.mouse.move(vw.width / 2 + dx, vw.height / 2 + dy, { steps: 6 });
    await page.mouse.up();
    await page.waitForTimeout(220);
  }
  await page.locator(`[data-object="${id}"]`).click();
  await page.waitForTimeout(160);
}

/** Fill the 3 band slots with the named activities, then run the week to the end. */
async function playWeek(actions, { name } = {}) {
  await page.goto(BASE + '#/schedule');
  await page.waitForSelector('.actionslot');
  for (let i = 0; i < actions.length; i += 1) {
    if (!actions[i]) continue;
    await page.locator('.actionslot').nth(i).click();
    await page.waitForSelector('.sheet .rowcard');
    await page.locator('.sheet .rowcard', { hasText: actions[i] }).first().click();
    await page.waitForTimeout(200);
  }
  await clean('SCHEDULE');
  await tapText('다음 주로 ▶');
  await page.waitForTimeout(200);
  await expect(hash() === '#/schedule/resolution', 'resolution route');
  // walk every card
  for (let guard = 0; guard < 24; guard += 1) {
    const t = await text();
    await clean('WEEK RESOLUTION');
    if (t.includes('이제 이 팀에 이름이 필요하다') && name) {
      await page.fill('input', name);
      await tapText('이 이름으로 간다');
      continue;
    }
    if (t.includes('한 주가 끝났다')) break;
    await tapText('계속', true);
  }
  const summary = await text();
  await tapText('연습실로 돌아가기');
  await page.waitForTimeout(200);
  await expect(hash() === '#/', 'back home after the week');
  return summary;
}

/** The inbox can hold several kinds of offer; accept the live one. */
async function acceptLiveOffer() {
  const card = page.locator('.rowcard--stack').filter({ hasText: '수용 인원' }).first();
  await card.waitFor();
  await card.getByText('수락', { exact: true }).click();
  await page.waitForTimeout(250);
  const sv = await save();
  if (!sv.pendingPerformance) throw new Error('accepting the live offer did not book a show');
  return sv.pendingPerformance;
}

async function playShow() {
  await page.goto(BASE + '#/performance/prep');
  await page.waitForTimeout(200);
  await clean('PERFORMANCE PREP');
  await page.locator('.rowcard--tap').filter({ hasText: '라이브 적합도' }).first().click();
  await page.waitForTimeout(160);
  await tapText('공연 시작');
  await page.waitForTimeout(200);
  for (let guard = 0; guard < 30; guard += 1) {
    if (hash() === '#/performance/result') break;
    const t = await text();
    if (t.includes('그대로 밀어붙인다')) { await tapText('그대로 밀어붙인다'); continue; }
    if (t.includes('무대를 내려온다')) { await tapText('무대를 내려온다'); continue; }
    await tapText('계속', true);
  }
  await expect(hash() === '#/performance/result', 'performance result route');
  await clean('PERFORMANCE RESULT');
  const res = await text();
  await tapText('연습실로 돌아가기');
  await page.waitForTimeout(200);
  return res;
}

/** An offer the player can actually act on right now. */
function openOffers(sv) {
  return Object.values(sv.opportunities).filter(
    (o) => o.type === 'LIVE' && ['NEW', 'SEEN', 'LATER'].includes(o.status) && o.createdWeek <= sv.world.week,
  );
}

/** Keep rehearsing week after week until the venue calls. Returns how many weeks it took. */
async function playUntilOffer(max = 4) {
  for (let i = 0; i < max; i += 1) {
    const sv = await save();
    if (openOffers(sv).length > 0) return i;
    await playWeek(['합주 연습', '합주 연습', '홍보']);
  }
  const sv = await save();
  if (openOffers(sv).length === 0) throw new Error(`no live offer after ${max} extra weeks`);
  return max;
}

try {
  // ---------------- NEW GAME + 2 members
  await page.goto(BASE + '#/start');
  await page.evaluate(() => localStorage.clear());
  await page.goto(BASE + '#/start');
  await page.waitForSelector('#producer');
  await page.fill('#producer', 'TESTER');
  await tapText('START', true);
  await page.waitForSelector('.hud');
  for (const who of ['윤하진', '민채린']) {
    await page.goto(BASE + '#/audition');
    await page.waitForSelector('.roster__card');
    await page.locator('.roster__card', { hasText: who }).click();
    await page.waitForTimeout(150);
    await tapText('상세 보기', true);
    await tapText('계약 협상');
    await tapText('제안하기');
    await tapText('함께 하기로 한다');
    await page.waitForTimeout(150);
  }
  const s0 = await save();
  await expect(s0.band.activeMembers.length === 2, 'two members joined');
  await expect(s0.world.week === 1, 'starts on week 1');

  // ---------------- WEEK 1: 합주 연습 x2 + 홍보
  const before1 = await save();
  await playWeek(['합주 연습', '합주 연습', '홍보'], { name: 'TEST BAND' });
  const w1 = await save();
  await expect(w1.world.week === 2, 'week advanced 1 -> 2');
  await expect(Object.keys(w1.songs).length === 1, 'week 1 produced a song');
  const exp1 = w1.characterStates.C01.growth.experience;
  await expect(exp1 > 0, `practice banked experience (${exp1})`);
  await expect(w1.characterStates.C01.condition.energy < before1.characterStates.C01.condition.energy,
    `practice cost energy (${before1.characterStates.C01.condition.energy} -> ${w1.characterStates.C01.condition.energy})`);
  await expect(w1.band.metrics.fans > before1.band.metrics.fans, `promotion brought fans (+${w1.band.metrics.fans - before1.band.metrics.fans})`);
  await expect(w1.band.name === 'TEST BAND', 'band named');

  // ---------------- WEEK 2: 휴식 -> the SAME loop must behave differently
  await playWeek(['휴식', '휴식', '홍보']);
  const w2 = await save();
  await expect(w2.world.week === 3, 'week advanced 2 -> 3');
  await expect(w2.characterStates.C01.condition.energy > w1.characterStates.C01.condition.energy,
    `rest recovered energy (${w1.characterStates.C01.condition.energy} -> ${w2.characterStates.C01.condition.energy})`);
  await expect(w2.characterStates.C01.condition.stress < w1.characterStates.C01.condition.stress, 'rest lowered stress');
  const gain2 = w2.characterStates.C01.growth.experience - exp1;
  await expect(gain2 < exp1 * 0.5,
    `a rest week trains far less than a practice week (${Math.round(exp1)} vs ${Math.round(gain2)}) — the choice matters`);
  await expect(Object.keys(w2.songs).length === 1, 'a rest week writes no song — songs come from practice/recording');

  // ---------------- WEEK 3: back to practice, second song, first offer
  await playWeek(['합주 연습', '합주 연습', '홍보']);
  const w3a = await save();
  await expect(w3a.world.week === 4, 'week advanced 3 -> 4');
  await expect(Object.keys(w3a.songs).length === 2, 'second song written');

  // ---------------- first offer -> first show
  const waited1 = await playUntilOffer(3);
  const wOffer = await save();
  await expect(openOffers(wOffer).length >= 1, `a live offer arrived (after ${waited1} more week(s), week ${wOffer.world.week})`);
  await worldTap('PHONE_DESK');
  await expect(hash() === '#/inbox', 'phone desk still opens the inbox (world regression)');
  await clean('INBOX');
  const booked1 = await acceptLiveOffer();
  await expect(booked1.venueId === 'BASEMENT_CLUB', 'the debut is booked at the small club');
  const res1 = await playShow();
  const a1 = await save();
  await expect(a1.performanceHistory.length === 1, 'first show recorded');
  await expect(a1.economy.cash > w3a.economy.cash, `show paid out (${w3a.economy.cash} -> ${a1.economy.cash})`);
  await expect(a1.band.metrics.fans > w3a.band.metrics.fans, 'show brought fans');
  await expect(/최고의 무대|좋은 공연|무난한 공연|아쉬운 밤/.test(res1), 'show was graded');
  const show1 = a1.performanceHistory[0];

  // ---------------- release a single (music revenue unlocked by the first show)
  await page.goto(BASE + '#/band/songs');
  await page.waitForTimeout(200);
  await clean('SONGS');
  await expect(!(await text()).includes('첫 공연 후 발매 가능'), 'release unlocked after the first show');
  await tapText('싱글로 낸다');
  await page.waitForTimeout(220);
  const rel = await save();
  await expect(Object.keys(rel.releases).length === 1, 'single released');
  await expect(rel.band.metrics.fans > a1.band.metrics.fans, 'release brought fans');
  const releasedSong = Object.values(rel.songs).find((s) => s.status === 'RELEASED_SINGLE');
  await expect(!!releasedSong, 'song marked released');

  // ---------------- WEEK 3: recording room build + streaming income
  await page.goto(BASE + '#/management/facilities');
  await page.waitForTimeout(200);
  await clean('FACILITIES');
  await tapText('건설하기');
  await page.waitForTimeout(150);
  await page.locator('.btn--amber').click();
  await page.waitForTimeout(2000);
  await tapText('넓어진 연습실 보기');
  await page.waitForTimeout(250);
  await expect(await page.locator('.world[data-stage="2"]').count() === 1, 'Stage 2 world after the build (regression)');
  await expect(await page.locator('[data-object="RECORDING_DESK"]').count() === 1, 'stage 2 recording desk present');
  const built = await save();
  await expect(built.facilities.RECORDING_ROOM?.built === true, 'recording room built');

  const w3sum = await playWeek(['녹음', '합주 연습', '홍보']);
  const w3 = await save();
  await expect(w3.world.week === built.world.week + 1, 'the recording week advanced the clock by one');
  await expect(w3sum.includes('음원 수익'), 'streaming income paid in the week summary');
  await expect(Object.keys(w3.songs).length === Object.keys(built.songs).length + 1,
    `the recording week added another song (${Object.keys(w3.songs).length} total)`);
  const recorded = Object.values(w3.songs).find((x) => x.originContext.includes('RECORDING_SESSION'));
  await expect(!!recorded, 'the new song was born in the recording room');

  // ---------------- WEEK 4: the loop repeats — a SECOND show offer must arrive
  const waited2 = await playUntilOffer(4);
  const w4 = await save();
  await expect(w4.world.week > w3.world.week, 'more weeks played after the first show');
  await expect(openOffers(w4).length >= 1,
    `a follow-up show offer arrived ${waited2} week(s) after the first show (week ${w4.world.week})`);

  await page.goto(BASE + '#/inbox');
  await page.waitForTimeout(250);
  const booked2 = await acceptLiveOffer();
  await expect(!!booked2.venueId, `the follow-up show is booked at ${booked2.venueId}`);
  await playShow();
  const a2 = await save();
  await expect(a2.performanceHistory.length === 2, 'second show recorded — the loop repeats');
  const show2 = a2.performanceHistory[1];
  await expect(show2.week > show1.week, 'the second show happened on a later week');

  // ---------------- growth actually landed
  const st = a2.characterStates.C01;
  const baseSkill = await page.evaluate(() => 0); // master value read below from the UI instead
  await expect(st.growth.experience > exp1, `experience kept accumulating (${exp1} -> ${st.growth.experience})`);
  await expect(st.growth.developmentStage >= 1, `development stage rose to ${st.growth.developmentStage}`);
  await expect(Object.keys(st.currentStats).length > 0, 'stat gains were written to the save');
  void baseSkill;

  // ---------------- career progression
  await page.goto(BASE + '#/management');
  await page.waitForTimeout(200);
  await clean('MANAGEMENT');
  const mg = await text();
  await expect(/무명 밴드|지역 밴드/.test(mg), 'career tier shown in words');
  await expect(a2.careerHistory.length > 0, `career milestones logged (${a2.careerHistory.length})`);

  // ---------------- PERSISTENCE: reload mid-progress
  const beforeReload = await save();
  await page.reload();
  await page.waitForSelector('.hud');
  const afterReload = await save();
  await expect(JSON.stringify(beforeReload) === JSON.stringify(afterReload), 'save identical across reload');
  await expect((await text()).includes('TEST BAND'), 'band name survives the reload');

  // ---------------- NO DOUBLE AWARD: re-enter the resolution route after a committed week
  await page.goto(BASE + '#/schedule');
  await page.waitForSelector('.actionslot');
  await page.locator('.actionslot').first().click();
  await page.waitForTimeout(170);
  await tapText('합주 연습');
  await tapText('다음 주로 ▶');
  await page.waitForTimeout(200);
  for (let guard = 0; guard < 24; guard += 1) {
    if ((await text()).includes('한 주가 끝났다')) break;
    await tapText('계속', true);
  }
  const preCommit = await save();
  await tapText('연습실로 돌아가기');
  await page.waitForTimeout(220);
  const postCommit = await save();
  await expect(postCommit.world.week === preCommit.world.week + 1, 'week committed exactly once');

  // walking back into the resolution screen must not pay the week again
  await page.goto(BASE + '#/schedule/resolution');
  await page.waitForTimeout(300);
  await expect((await text()).includes('이번 주 계획이 없다'), 'stale resolution screen refuses to run');
  const afterRevisit = await save();
  await expect(afterRevisit.world.week === postCommit.world.week
    && afterRevisit.economy.cash === postCommit.economy.cash
    && afterRevisit.characterStates.C01.growth.experience === postCommit.characterStates.C01.growth.experience
    && Object.keys(afterRevisit.songs).length === Object.keys(postCommit.songs).length,
    'no experience / money / song awarded twice');

  // reloading straight onto the resolution route must not pay either
  await page.reload();
  await page.waitForTimeout(400);
  const afterReloadOnResolution = await save();
  await expect(JSON.stringify(afterReloadOnResolution) === JSON.stringify(afterRevisit), 'reload on resolution route changes nothing');

  // ---------------- final state report
  const fin = await save();
  console.log('\n--- PLAYTHROUGH RESULT ---');
  console.log('weeks played   :', fin.world.week - 1, `(Y${fin.world.year} W${String(fin.world.week).padStart(2, '0')})`);
  await expect(new Set(Object.values(fin.songs).map((x) => x.title)).size === Object.keys(fin.songs).length, 'every song has its own title');
  console.log('songs          :', Object.keys(fin.songs).length, Object.values(fin.songs).map((s) => `${s.title}[${s.status}]`).join(', '));
  console.log('releases       :', Object.values(fin.releases).map((r) => `${r.type} w${r.releasedWeek} fans+${r.result?.fansDelta ?? 0}`).join(', ') || '-');
  console.log('shows          :', fin.performanceHistory.map((p) => `w${p.week} ${p.venueName} ${p.grade} ${p.audience}명 +${p.fansDelta}팬`).join(' | '));
  console.log('fans / cash    :', fin.band.metrics.fans, '/', fin.economy.cash);
  console.log('career log     :', fin.careerHistory.map((h) => `w${h.week} ${h.text}`).join(' | ') || '-');
  console.log('facilities     :', Object.values(fin.facilities).filter((f) => f.built).map((f) => f.facilityId).join(', ') || '-');
  console.log('offers open    :', Object.values(fin.opportunities).filter((o) => o.status === 'NEW').length);
  Object.entries(fin.characterStates).filter(([id]) => fin.band.activeMembers.includes(id)).forEach(([id, c]) => {
    console.log(`member ${id}     : stage ${c.growth.developmentStage} exp ${Math.round(c.growth.experience)} energy ${c.condition.energy} stress ${c.condition.stress} stats ${JSON.stringify(c.currentStats)}`);
  });

  if (errors.length) throw new Error(`PAGE ERRORS:\n${errors.join('\n')}`);
  console.log('\nPHASE 2A PLAYTHROUGH PASSED');
} catch (e) {
  console.error('\nFAILED:', e.message);
  if (errors.length) console.error('page errors:\n' + errors.join('\n'));
  await page.screenshot({ path: 'phase2a_fail.png' });
  process.exitCode = 1;
} finally {
  await browser.close();
}
