// CONTRACT V1 — 실제 브라우저 검증.
//  [1] 주급·기간·역할이 판정에 반영되고 캐릭터마다 다르다 / 역제안이 실제로 성립한다
//  [2] 26·52·104주 계약이 정확히 만료된다 (연도 넘김 포함)
//  [3] 재계약이 기존 계약 직후 시작하고 기간·급여가 중복되지 않는다
//  [4] 주전 기용 약속의 출전 기록과 사전 확인
//  [5] 역할 변경 재협상
//
// 계약 만료처럼 수십 주가 걸리는 상태는 localStorage로 시점을 당겨 두고(테스트 준비),
// 그 다음의 판정과 정산은 전부 게임 로직에 맡겨 확인한다.
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
const hash = () => new URL(page.url()).hash;
const save = () => page.evaluate(() => JSON.parse(localStorage.getItem('band-game.save.v1')).state.save);
/** 테스트 준비용 세이브 조작. 화면이 들고 있는 상태를 버리도록 반드시 새로고침한다. */
const patch = async (fn) => {
  await page.evaluate((body) => {
    const raw = JSON.parse(localStorage.getItem('band-game.save.v1'));
    // eslint-disable-next-line no-new-func
    new Function('sv', body)(raw.state.save);
    localStorage.setItem('band-game.save.v1', JSON.stringify(raw));
  }, fn);
  await page.reload();
  await page.waitForTimeout(400);
};
const tapText = async (t, exact = false) => { await page.getByText(t, { exact }).first().click(); await page.waitForTimeout(160); };
const money = (s) => Number(String(s).replace(/[^0-9]/g, ''));

async function openContract(who) {
  await page.goto(BASE + '#/audition');
  await page.waitForSelector('.roster__card');
  await page.locator('.roster__card', { hasText: who }).click();
  await page.waitForTimeout(160);
  await tapText('상세 보기', true);
  await tapText('계약 협상');
  await page.waitForTimeout(220);
}
const salaryShown = async () => money((await page.locator('.stepper span').first().innerText()));
const stepSalary = async (dir, times = 1) => {
  for (let i = 0; i < times; i += 1) {
    await page.locator(`.stepper button[aria-label="주급 ${dir === 'down' ? '내리기' : '올리기'}"]`).click();
    await page.waitForTimeout(120);
  }
};
const verdict = async () => ((await text()).includes('지금 조건이면 받아들인다') ? 'ACCEPT' : 'REJECT');
const footerOffer = () => page.locator('.btn').filter({ hasText: /^제안하기$|^다시 제안$/ }).first();
async function runWeek(action = '휴식') {
  await page.goto(BASE + '#/schedule');
  await page.waitForSelector('.actionslot');
  await page.locator('.actionslot').nth(0).click();
  await page.waitForSelector('.sheet .rowcard');
  await page.locator('.sheet .rowcard')
    .filter({ has: page.locator('.rowcard__title', { hasText: new RegExp(`^${action}$`) }) }).first().click();
  await page.waitForTimeout(200);
  await tapText('다음 주로 ▶');
  for (let g = 0; g < 18; g += 1) {
    const t = await text();
    if (t.includes('이제 이 팀에 이름이 필요하다')) { await page.fill('input', 'QA BAND'); await tapText('이 이름으로 간다'); continue; }
    if (t.includes('한 주가 끝났다')) break;
    await tapText('계속', true);
  }
  await tapText('연습실로 돌아가기');
  await page.waitForTimeout(260);
}

try {
  await page.goto(BASE + '#/start');
  await page.evaluate(() => localStorage.clear());
  await page.goto(BASE + '#/start');
  await page.waitForSelector('#producer');
  await page.fill('#producer', 'QA');
  await tapText('START', true);
  await page.waitForSelector('.hud');

  // ================================================================ [1] 기간·역할이 판정에 반영된다
  await openContract('윤하진');
  const t0 = await text();
  await expect(!/가능성|확실|반반|어려움/.test(t0), '확률처럼 보이는 표현을 쓰지 않는다');
  await expect(t0.includes('선호하는 기간은 52주'), '선호 기간을 알려준다');
  await stepSalary('down', 2); // 400,000 -> 300,000 (52주 주전 최저선)
  await expect(await salaryShown() === 300000, '주급을 300,000으로 맞췄다');
  await expect(await verdict() === 'ACCEPT', '52주 · 주전 300,000 → 수락');

  await tapText('104주');
  await page.waitForTimeout(200);
  await expect(await verdict() === 'REJECT', '같은 주급인데 104주로 바꾸면 거절 (기간이 판정에 반영된다)');
  await expect((await text()).includes('104주 계약은 52주보다 부담스럽다'), '거절 이유를 말한다');

  await tapText('52주');
  await page.waitForTimeout(200);
  await tapText('서포트');
  await page.waitForTimeout(200);
  await expect(await verdict() === 'REJECT', '같은 주급인데 서포트로 바꾸면 거절 (역할이 판정에 반영된다)');
  await expect((await text()).includes('무대를 양보하는 자리는'), '서포트 거절 이유를 말한다');

  // 역제안이 실제로 성립한다
  await footerOffer().click();
  await page.waitForTimeout(250);
  const counters = await page.locator('.btn').filter({ hasText: /^주급 ₩/ }).allInnerTexts();
  await expect(counters.length >= 1 && counters.length <= 2, `역제안 ${counters.length}개 (최대 2개)`);
  console.log('역제안:', counters.map((x) => x.replace(/\s+/g, ' ')).join(' | '));
  await page.locator('.btn').filter({ hasText: /^주급 ₩/ }).first().click();
  await page.waitForTimeout(250);
  await expect(await verdict() === 'ACCEPT' && (await text()).includes('합의했다'), '역제안을 고르면 실제로 성립한다');

  // 합의 후 조건을 바꾸면 무효
  await stepSalary('down', 1);
  await expect((await text()).includes('조건이 바뀌었다'), '합의 후 조건을 바꾸면 합의가 풀린다');

  // 주전 52주로 다시 맞춰 체결
  await tapText('주전 멤버');
  await page.waitForTimeout(180);
  while (await salaryShown() < 300000) await stepSalary('up', 1);
  await footerOffer().click();
  await page.waitForTimeout(250);
  const agreed = await salaryShown();
  await tapText('함께 하기로 한다');
  await page.waitForTimeout(300);
  const signed = await save();
  await expect(signed.contracts.C01.salary === agreed, `합의한 주급 ${agreed.toLocaleString('ko-KR')}이 저장된다`);
  await expect(signed.contracts.C01.endWeek - signed.contracts.C01.startWeek + 1 === 52, '52주 계약이 52주로 기록된다');

  // ================================================================ [8].2 캐릭터마다 다르다
  await openContract('민채린');
  const base2 = await salaryShown();
  await expect(await verdict() === 'ACCEPT', `민채린 기준 주급 ${base2.toLocaleString('ko-KR')} → 수락`);
  await tapText('104주');
  await page.waitForTimeout(180);
  const chaerinLong = await verdict();
  await tapText('서포트');
  await page.waitForTimeout(180);
  const chaerinSupport = await verdict();
  await expect(chaerinLong === 'ACCEPT' && chaerinSupport === 'ACCEPT',
    '민채린은 104주도 서포트도 같은 주급에 받아들인다 (윤하진과 반대)');
  await tapText('주전 멤버');
  await page.waitForTimeout(180);
  await footerOffer().click();
  await page.waitForTimeout(220);
  await tapText('함께 하기로 한다');
  await page.waitForTimeout(300);
  const two = await save();
  await expect(two.contracts.C04.endWeek - two.contracts.C04.startWeek + 1 === 104, '민채린은 104주 계약');
  const payroll = Object.values(two.contracts).reduce((a, c) => a + c.salary, 0);

  // ================================================================ [4] 주전 출전 기록
  // 공연을 한 번 치러 출전 기록이 남는지 본다
  await patch(`
    sv.songs.s1 = { id:'s1', title:'A', createdWeek:1, contributors:{composer:['C01'],lyrics:[]},
      originContext:[], musicProfile:{popularity:60,artistry:60,fanFit:60,liveFit:60}, genreTags:[],
      status:'UNRELEASED', recordedWeek:null, rehearsalCount:0 };
    sv.songs.s2 = { ...sv.songs.s1, id:'s2', title:'B' };
    sv.opportunities.o1 = { id:'o1', type:'LIVE', title:'Basement Club 공연 제안', description:'데뷔 무대',
      createdWeek: sv.world.week, expiresWeek: sv.world.week + 4, status:'NEW',
      payload:{ venueId:'BASEMENT_CLUB' } };
  `);
  await page.goto(BASE + '#/inbox');
  await page.waitForTimeout(280);
  await page.locator('.rowcard--stack').filter({ hasText: '수용 인원' }).first().getByText('수락', { exact: true }).click();
  await page.waitForTimeout(250);
  await page.goto(BASE + '#/schedule');
  await page.waitForSelector('.actionslot');
  await page.locator('.actionslot').nth(0).click();
  await page.waitForSelector('.sheet .rowcard');
  await page.locator('.sheet .rowcard').filter({ has: page.locator('.rowcard__title', { hasText: /^공연$/ }) }).first().click();
  await page.waitForTimeout(220);
  await page.goto(BASE + '#/performance/prep');
  await page.waitForTimeout(250);
  await page.locator('.rowcard--tap').filter({ hasText: '라이브 적합도' }).first().click();
  await page.waitForTimeout(180);
  await tapText('공연 시작');
  await page.waitForTimeout(250);
  for (let g = 0; g < 30; g += 1) {
    if (hash() === '#/performance/result') break;
    const t = await text();
    if (t.includes('그대로 밀어붙인다')) { await tapText('그대로 밀어붙인다'); continue; }
    if (t.includes('무대를 내려온다')) { await tapText('무대를 내려온다'); continue; }
    await tapText('계속', true);
  }
  await tapText('연습실로 돌아가기');
  await page.waitForTimeout(280);
  const afterShow = await save();
  const snap = afterShow.performanceHistory[0];
  console.log('공연 출전 기록:', JSON.stringify(snap.lineup));
  await expect(snap.lineup.some((s) => s.characterId === 'C01'), '실제 출전 멤버 ID가 공연 기록에 남는다');
  await page.reload();
  await page.waitForSelector('.hud');
  await expect((await save()).performanceHistory[0].lineup.some((s) => s.characterId === 'C01'),
    '출전 기록이 새로고침 후에도 유지된다');

  // 계약 화면에 약속 이행 상황이 보인다
  await page.goto(BASE + '#/management/contracts');
  await page.waitForTimeout(280);
  await expect((await text()).includes('최근 공연 1회 중 결장 0회'), '계약 화면이 주전 약속 이행을 보여준다');

  // ================================================================ [9] 위반 사전 확인 + 편성 안내
  // 공연은 한 주에 한 번이므로 한 주를 보낸 뒤 다음 공연을 준비한다
  await runWeek();
  // 결장 2회를 만들어 다음 공연이 위반이 되도록 기록을 넣는다 (테스트 준비)
  await patch(`
    const w = 1; // 지난 주들의 결장 기록 (이번 주가 아니어야 한다)
    sv.performanceHistory.push(
      { id:'pX', week:w, venueId:'BASEMENT_CLUB', venueName:'Basement Club',
        lineup:[{slot:'GUITAR',label:'민채린',characterId:'C04'}], openingSongTitle:'B',
        audience:40, grade:'OKAY', revenue:1, fansDelta:1, reputationDelta:1, crowdEnergyPeak:40, choices:[] },
      { id:'pY', week:w, venueId:'BASEMENT_CLUB', venueName:'Basement Club',
        lineup:[{slot:'GUITAR',label:'민채린',characterId:'C04'}], openingSongTitle:'B',
        audience:40, grade:'OKAY', revenue:1, fansDelta:1, reputationDelta:1, crowdEnergyPeak:40, choices:[] },
    );
    sv.band.lineup.forEach((s) => { if (s.assignment && s.assignment.characterId === 'C01') s.assignment = null; });
    sv.opportunities.o2 = { id:'o2', type:'LIVE', title:'Basement Club 재섭외', description:'또 불렀다',
      createdWeek: sv.world.week, expiresWeek: sv.world.week + 4, status:'NEW', payload:{ venueId:'BASEMENT_CLUB' } };
    sv.pendingPerformance = { opportunityId:'o2', venueId:'BASEMENT_CLUB', openingSongId:'s1', status:'SCHEDULED' };
  `);
  await page.goto(BASE + '#/schedule');
  await page.waitForSelector('.actionslot');
  await page.locator('.actionslot').nth(0).click();
  await page.waitForSelector('.sheet .rowcard');
  await page.locator('.sheet .rowcard').filter({ has: page.locator('.rowcard__title', { hasText: /^공연$/ }) }).first().click();
  await page.waitForTimeout(220);
  await page.goto(BASE + '#/performance/prep');
  await page.waitForTimeout(300);
  const prep = await text();
  await expect(prep.includes('기용 약속'), '공연 준비 화면이 기용 약속을 사전에 확인한다');
  await expect(prep.includes('윤하진') && prep.includes('자리에 올려 편성을 고치면'), '위반 예상 멤버와 고칠 방법을 알려준다');
  const startBtn = page.locator('.btn').filter({ hasText: '공연 시작' }).first();
  await expect(await startBtn.isDisabled(), '약속을 어기는 편성으로는 공연을 확정할 수 없다');

  // 편성을 고치면 풀린다
  await patch(`
    const slot = sv.band.lineup.find((s) => s.slotId === 'VOCAL');
    slot.assignment = { kind:'MEMBER', characterId:'C01' };
  `);
  await page.goto(BASE + '#/performance/prep');
  await page.waitForTimeout(300);
  await expect(!(await text()).includes('편성을 고치면'), '편성을 고치면 경고가 사라진다');
  await expect(!(await page.locator('.btn').filter({ hasText: '공연 시작' }).first().isDisabled()),
    '약속을 지키는 편성이면 공연할 수 있다');

  // ================================================================ [5] 역할 변경 재협상
  await page.goto(BASE + '#/management/contracts');
  await page.waitForTimeout(280);
  await page.locator('.btn').filter({ hasText: '역할 재협상' }).first().click();
  await page.waitForTimeout(280);
  await expect((await text()).includes('역할 재협상') && (await text()).includes('남은 계약'), '역할 재협상 화면이 열린다');
  const beforeRole = await save();
  const cSalary = beforeRole.contracts.C01.salary;
  await tapText('서포트');
  await page.waitForTimeout(200);
  await expect(await verdict() === 'REJECT', '같은 주급으로 서포트 전환은 거절된다 (할인 무임승차 차단)');
  await footerOffer().click();
  await page.waitForTimeout(250);
  await page.locator('.btn').filter({ hasText: /^주급 ₩/ }).first().click();
  await page.waitForTimeout(250);
  const newSalary = await salaryShown();
  await expect(newSalary > cSalary, `서포트로 바꾸려면 주급을 ${cSalary.toLocaleString('ko-KR')} → ${newSalary.toLocaleString('ko-KR')}으로 올려야 한다`);
  await tapText('역할을 바꾼다');
  await page.waitForTimeout(300);
  const pending = await save();
  await expect(pending.contracts.C01.rolePromise === 'CORE_MEMBER', '이번 주에는 아직 기존 역할이다');
  await expect(pending.contracts.C01.pendingChange?.rolePromise === 'SUPPORT_MEMBER', '다음 주부터 적용되도록 예약된다');
  const endBefore = pending.contracts.C01.endWeek;
  await runWeek();
  const applied = await save();
  await expect(applied.contracts.C01.rolePromise === 'SUPPORT_MEMBER', '다음 주부터 역할이 바뀐다');
  await expect(applied.contracts.C01.salary === newSalary, '합의한 주급으로 바뀐다');
  await expect(applied.contracts.C01.endWeek === endBefore, '계약 만료일은 그대로다');

  // ================================================================ [3] 재계약
  await patch(`
    const c = sv.contracts.C01;
    const abs = sv.world.week + (sv.world.year - 1) * 52;
    c.endWeek = abs + 2;   // 재계약 창 안으로 당긴다 (테스트 준비)
  `);
  await page.goto(BASE + '#/management/contracts');
  await page.waitForTimeout(300);
  await page.locator('.btn').filter({ hasText: '재계약 협상' }).first().click();
  await page.waitForTimeout(300);
  await expect((await text()).includes('재계약 협상'), '마지막 구간에서 재계약 협상이 열린다');
  await tapText('주전 멤버');
  await page.waitForTimeout(180);
  await tapText('26주');
  await page.waitForTimeout(180);
  while (await verdict() === 'REJECT') await stepSalary('up', 1);
  await footerOffer().click();
  await page.waitForTimeout(250);
  const renewSalary = await salaryShown();
  await tapText('재계약한다');
  await page.waitForTimeout(300);
  const booked = await save();
  const oldEnd = booked.contracts.C01.endWeek;
  const oldSalary = booked.contracts.C01.salary;
  await expect(booked.contracts.C01.renewal?.durationWeeks === 26, '재계약이 예약된다');
  await expect(booked.contracts.C01.salary === oldSalary, '새 급여를 기존 계약에 소급 적용하지 않는다');

  // 기존 계약이 끝날 때까지 기존 조건, 그 다음 주에 새 계약 시작
  let guard = 0;
  while (guard < 6) {
    const sv = await save();
    const abs = sv.world.week + (sv.world.year - 1) * 52;
    if (abs > oldEnd) break;
    await expect(sv.contracts.C01.salary === oldSalary, `${abs}주차: 기존 계약 조건이 유지된다`);
    await runWeek();
    guard += 1;
  }
  const renewed = await save();
  const c1 = renewed.contracts.C01;
  await expect(c1.salary === renewSalary, `새 계약 급여 ${renewSalary.toLocaleString('ko-KR')}가 적용된다`);
  await expect(c1.startWeek === oldEnd + 1, '새 계약은 기존 계약 종료 직후 시작한다');
  await expect(c1.endWeek - c1.startWeek + 1 === 26, '새 계약 기간이 26주로 정확하다 (중복 계산 없음)');
  await expect(c1.renewal === null, '예약은 소모된다');

  // ================================================================ [2] 만료
  await patch(`
    const abs = sv.world.week + (sv.world.year - 1) * 52;
    sv.contracts.C04.endWeek = abs;  // 민채린 계약을 이번 주로 끝나게 한다 (테스트 준비)
  `);
  const beforeExpiry = await save();
  await expect(beforeExpiry.band.activeMembers.includes('C04'), '만료 전에는 멤버다');
  await runWeek();
  const expired = await save();
  await expect(expired.contracts.C04 === undefined, '계약이 만료되어 사라진다');
  await expect(!expired.band.activeMembers.includes('C04'), '현재 멤버에서 빠진다');
  await expect(!expired.band.lineup.some((s) => s.assignment?.characterId === 'C04'), '라인업에서도 빠진다');
  await expect(expired.characterStates.C04.worldStatus === 'FORMER_MEMBER', '오디션 후보로 되돌아가지 않는다');
  await expect(expired.characterStates.C04.growth.experience === beforeExpiry.characterStates.C04.growth.experience,
    '성장 기록은 남는다');
  await expect(expired.performanceHistory.length === beforeExpiry.performanceHistory.length, '과거 공연 기록도 남는다');
  await expect(expired.careerHistory.some((h) => h.text.includes('민채린 계약 만료')), '만료가 기록된다');

  // 급여가 실제로 끊긴다
  const beforePay = await save();
  const expectedPayroll = Object.values(beforePay.contracts).reduce((a, c) => a + c.salary, 0);
  await runWeek();
  const afterPay = await save();
  const charged = beforePay.economy.cash - afterPay.economy.cash;
  await expect(charged === expectedPayroll, `만료 후 급여는 남은 계약만 나간다 (${charged.toLocaleString('ko-KR')})`);
  await expect(charged < payroll, `2인 시절 급여 ${payroll.toLocaleString('ko-KR')}보다 줄었다`);

  // 만료 멤버는 오디션으로 되돌아오지 않는다
  await page.goto(BASE + '#/audition');
  await page.waitForTimeout(280);
  await expect(!(await text()).includes('민채린'), '만료 멤버가 오디션 후보로 다시 나오지 않는다');

  if (errors.length) throw new Error(errors.join('\n'));
  console.log('\nCONTRACT V1 PASSED');
} catch (e) {
  console.error('\nFAILED:', e.message);
  if (errors.length) console.error(errors.join('\n'));
  await page.screenshot({ path: 'contract_fail.png' });
  process.exitCode = 1;
} finally {
  await browser.close();
}
