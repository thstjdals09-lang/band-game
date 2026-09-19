// 라이브 호흡 V1 — 실제 브라우저에서 준비 화면 표시와 점수 연결을 확인한다.
// 세션 보충 vs 빈자리 유지의 실제 수치도 측정한다.
import { chromium } from 'playwright';

const BASE = 'http://localhost:4173/band-game/';
const log = (...a) => console.log('•', ...a);
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });

const expect = async (c, l) => { if (!c) throw new Error(`EXPECT FAILED: ${l}`); log('ok', l); };
const text = async () => (await page.locator('.phone').innerText()).replace(/\s+/g, ' ');
const save = () => page.evaluate(() => JSON.parse(localStorage.getItem('band-game.save.v1')).state.save);
const tapText = async (t, exact = false) => { await page.getByText(t, { exact }).first().click(); await page.waitForTimeout(150); };
const patch = async (body) => {
  await page.evaluate((src) => {
    const raw = JSON.parse(localStorage.getItem('band-game.save.v1'));
    // eslint-disable-next-line no-new-func
    new Function('sv', src)(raw.state.save);
    localStorage.setItem('band-game.save.v1', JSON.stringify(raw));
  }, body);
  await page.reload();
  await page.waitForTimeout(400);
};
const shownPercent = async () => Number(((await text()).match(/라이브 호흡 (\d+)%/) ?? [])[1]);

/** 준비 화면을 연다. */
async function openPrep() {
  await page.goto(BASE + '#/performance/prep');
  await page.waitForTimeout(300);
}

try {
  await page.goto(BASE + '#/start');
  await page.evaluate(() => localStorage.clear());
  await page.goto(BASE + '#/start');
  await page.waitForSelector('#producer');
  await page.fill('#producer', 'QA');
  await tapText('START', true);
  await page.waitForSelector('.hud');

  // 공동 공연 기록 9회를 가진 4인 밴드를 만든다 (테스트 준비)
  await patch(`
    const ids = ['C01','C04','C07','C10'];
    const slots = ['VOCAL','GUITAR','BASS','DRUMS'];
    sv.band.activeMembers = ids;
    sv.band.lineup = slots.map((slotId, i) => ({ slotId, assignment: { kind:'MEMBER', characterId: ids[i] } }));
    ids.forEach((id) => { sv.contracts[id] = { characterId:id, salary:200000, startWeek:1, endWeek:200,
      rolePromise:'SUPPORT_MEMBER', clauses:[], satisfaction:70, renewal:null, pendingChange:null }; });
    for (let i = 0; i < 9; i += 1) {
      sv.performanceHistory.push({ id:'h'+i, week:i+1, absoluteWeek:i+1, venueId:'BASEMENT_CLUB',
        venueName:'Basement Club',
        lineup: slots.map((slot, k) => ({ slot, label:'', characterId: ids[k] })),
        openingSongTitle:'A', audience:40, grade:'GOOD SHOW', revenue:1, fansDelta:1,
        reputationDelta:1, crowdEnergyPeak:50, choices:[] });
    }
    sv.songs.s1 = { id:'s1', title:'A', createdWeek:1, contributors:{composer:[],lyrics:[]},
      originContext:[], musicProfile:{popularity:60,artistry:60,fanFit:60,liveFit:60}, genreTags:[],
      status:'UNRELEASED', recordedWeek:null, rehearsalCount:0 };
    sv.songs.s2 = { ...sv.songs.s1, id:'s2', title:'B' };
    sv.world.week = 20;
    sv.opportunities.o1 = { id:'o1', type:'LIVE', title:'Basement Club 공연', description:'무대',
      createdWeek:20, expiresWeek:24, status:'ACCEPTED', payload:{ venueId:'BASEMENT_CLUB' } };
    sv.pendingPerformance = { opportunityId:'o1', venueId:'BASEMENT_CLUB', openingSongId:'s1', status:'SCHEDULED' };
    sv.weeklyPlan.mainActions = ['LIVE_SHOW', null, null];
  `);

  // ---------------- 준비 화면 표시
  await openPrep();
  const t = await text();
  await expect(t.includes('라이브 호흡'), '준비 화면에 라이브 호흡이 표시된다');
  await expect(t.includes('함께 완료한 공연 경험에 따른 호흡입니다'), '설명 문구가 있다');
  await expect(!/익숙한 조합|완벽에 가까운/.test(t), '승인되지 않은 등급 명칭이 없다');
  await expect(await shownPercent() === 75, `4인 전원 9회 -> 75% (표시값 ${await shownPercent()}%)`);

  // ---------------- 라인업을 바꾸면 표시가 갱신된다
  await patch(`sv.band.lineup[3].assignment = { kind:'MEMBER', characterId:'C12' };`); // C10 -> 경험 없는 C12
  await openPrep();
  await expect(await shownPercent() === 38, `1명 교체 -> 37.5% (반올림 38%, 표시값 ${await shownPercent()}%)`);

  await patch(`sv.band.lineup[3].assignment = { kind:'MEMBER', characterId:'C10' };`); // 복귀
  await openPrep();
  await expect(await shownPercent() === 75, '복귀시키면 예전 경험이 다시 쓰인다 (75%)');

  // ---------------- 세션 보충 vs 빈자리 (밸런스 관찰)
  const measure = async (label, mutate) => {
    await patch(mutate);
    await openPrep();
    const pct = await shownPercent();
    const sv = await save();
    console.log(`   ${label}: 출전자 ${sv.band.lineup.filter((x) => x.assignment).length}명, 라이브 호흡 ${pct}%`);
    return pct;
  };
  const three = await measure('고정 3인 + 빈자리 1', `sv.band.lineup[3].assignment = null;`);
  const threePlusSession = await measure('고정 3인 + 세션 1', `sv.band.lineup[3].assignment = { kind:'SESSION', instanceId:'sess_x' };`);
  // 화면 값은 반올림된 퍼센트다. 정확한 보너스(4 x value)는 단위 테스트에서 확인한다.
  console.log(`   => 표시된 호흡: ${three}% vs ${threePlusSession}% (보너스 상한 4점)`);
  await expect(threePlusSession < three, '세션을 채우면 분모가 커져 호흡 보너스가 낮아진다 (승인된 계산의 결과)');

  // ---------------- 실제 공연 결과와 준비 화면이 같은 값을 쓴다
  await patch(`sv.band.lineup[3].assignment = { kind:'MEMBER', characterId:'C10' };`);
  await openPrep();
  const prepPct = await shownPercent();
  const before = await save();
  await tapText('공연 시작');
  await page.waitForTimeout(250);
  for (let g = 0; g < 30; g += 1) {
    if (new URL(page.url()).hash === '#/performance/result') break;
    const tt = await text();
    if (tt.includes('그대로 밀어붙인다')) { await tapText('그대로 밀어붙인다'); continue; }
    if (tt.includes('무대를 내려온다')) { await tapText('무대를 내려온다'); continue; }
    await tapText('계속', true);
  }
  await expect(new URL(page.url()).hash === '#/performance/result', '공연 결과가 확정된다');
  await tapText('연습실로 돌아가기');
  await page.waitForTimeout(300);
  const after = await save();
  const snap = after.performanceHistory[after.performanceHistory.length - 1];
  console.log(`   준비 화면 ${prepPct}% / 확정된 공연 점수 ${snap.crowdEnergyPeak} (${snap.grade})`);
  await expect(after.performanceHistory.length === before.performanceHistory.length + 1, '공연이 기록으로 남는다');
  await expect(snap.absoluteWeek === before.world.week, '통산 주차가 기록된다');

  // ---------------- 이번 공연은 다음 공연부터 반영된다
  await patch(`
    sv.pendingPerformance = { opportunityId:'o1', venueId:'BASEMENT_CLUB', openingSongId:'s1', status:'SCHEDULED' };
    sv.weeklyPlan.mainActions = ['LIVE_SHOW', null, null];
    sv.world.week = 21;
  `);
  await openPrep();
  const nextPct = await shownPercent();
  console.log(`   이번 공연 전 ${prepPct}% -> 다음 공연 준비 ${nextPct}% (공동 공연 9 -> 10회)`);
  await expect(nextPct > prepPct, '방금 끝낸 공연이 다음 공연의 호흡에 반영된다');

  if (errors.length) throw new Error(errors.join('\n'));
  console.log('\nLIVE FAMILIARITY PASSED');
} catch (e) {
  console.error('\nFAILED:', e.message);
  if (errors.length) console.error(errors.join('\n'));
  await page.screenshot({ path: 'familiarity_fail.png' });
  process.exitCode = 1;
} finally {
  await browser.close();
}
