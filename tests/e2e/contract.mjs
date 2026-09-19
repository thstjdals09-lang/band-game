// 계약 협상 PHASE 1 — 실제 브라우저에서 수락 · 역제안 · 거절 · 수락 후 조건 변경 ·
// 체결 · 주간 급여 반영을 확인한다.
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
const tapText = async (t, exact = false) => { await page.getByText(t, { exact }).first().click(); await page.waitForTimeout(160); };
const money = (s) => Number(String(s).replace(/[^0-9]/g, ''));

async function openContract(who) {
  await page.goto(BASE + '#/audition');
  await page.waitForSelector('.roster__card');
  await page.locator('.roster__card', { hasText: who }).click();
  await page.waitForTimeout(160);
  await tapText('상세 보기', true);
  await tapText('계약 협상');
  await page.waitForTimeout(200);
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

try {
  await page.goto(BASE + '#/start');
  await page.evaluate(() => localStorage.clear());
  await page.goto(BASE + '#/start');
  await page.waitForSelector('#producer');
  await page.fill('#producer', 'QA');
  await tapText('START', true);
  await page.waitForSelector('.hud');
  const start = await save();

  // ================================================================ 1. 확률 표현이 사라졌는가
  await openContract('윤하진');
  const t0 = await text();
  await expect(!/가능성|확실|반반|어려움/.test(t0), '확률처럼 보이는 표현을 쓰지 않는다');
  await expect(t0.includes('이 조건을 받아들일까'), '받아들일지 여부를 단정적으로 보여준다');
  await expect(t0.includes('주급 ₩300,000 이상이면 받아들인다'), '받아들이는 최저 주급을 명시한다');
  await expect(await verdict() === 'ACCEPT', `기준 주급(${(await salaryShown()).toLocaleString('ko-KR')})은 수락된다`);

  // ================================================================ 5. 급여 재정 표시
  await expect(t0.includes('현재 주간 급여') && t0.includes('영입 후 주간 급여') && t0.includes('급여만 지급하면'),
    '현재/영입 후 주간 급여와 버틸 수 있는 주수를 보여준다');
  await expect(t0.includes('다른 활동비와 수익을 뺀 단순 추정치'), '단순 추정치임을 명시한다');
  const runway = Number((t0.match(/급여만 지급하면 약 (\d+)주/) ?? [])[1]);
  await expect(runway === Math.floor(start.economy.cash / 400000),
    `자금 ${start.economy.cash.toLocaleString('ko-KR')} ÷ 주급 400,000 = 약 ${runway}주로 계산된다`);

  // ================================================================ 2. 표시와 실제 판정이 일치하는가
  // 임계값 바로 위 → 수락
  await stepSalary('down', 2); // 400,000 -> 300,000 (최저선)
  await expect(await salaryShown() === 300000, '주급을 300,000으로 내렸다');
  await expect(await verdict() === 'ACCEPT', '최저선에서는 받아들인다고 표시한다');
  await footerOffer().click();
  await page.waitForTimeout(220);
  await expect((await text()).includes('합의했다'), '표시대로 실제로도 수락된다');

  // 임계값 바로 아래 → 거절
  await stepSalary('down', 1); // 300,000 -> 250,000
  await expect(await verdict() === 'REJECT', '한 칸 더 내리면 받아들이지 않는다고 표시한다');
  await expect((await text()).includes('조건이 바뀌었다'), '조건을 바꾸면 이전 합의가 풀린다');
  await footerOffer().click();
  await page.waitForTimeout(220);
  const refusedText = await text();
  await expect(refusedText.includes('함께하기 어렵다'), '표시대로 실제로도 거절된다');
  await expect(!refusedText.includes('합의했다'), '거절 상태에서 합의 문구가 남지 않는다');

  // ================================================================ 3. 역제안은 실제로 수락되는 조건인가
  await expect(refusedText.includes('이 조건이면 받아들인다'), '역제안 섹션이 나타난다');
  const counters = await page.locator('.btn').filter({ hasText: /^주급 ₩/ }).allInnerTexts();
  await expect(counters.length >= 1 && counters.length <= 2, `역제안은 최대 2개다 (${counters.length}개)`);
  console.log('역제안:', counters.map((x) => x.replace(/\s+/g, ' ')).join(' | '));
  await expect(counters.every((x) => x.includes('52주') && x.includes('주전 멤버')),
    '역제안은 플레이어가 고른 기간·역할을 그대로 유지한다');

  // 역제안을 누르면 그 조건이 실제로 합의된다
  const firstCounter = money(counters[0].split('·')[0]);
  await page.locator('.btn').filter({ hasText: /^주급 ₩/ }).first().click();
  await page.waitForTimeout(250);
  await expect(await salaryShown() === firstCounter, `역제안 주급 ${firstCounter.toLocaleString('ko-KR')}이 적용된다`);
  await expect((await text()).includes('합의했다'), '역제안은 곧바로 합의로 이어진다');
  await expect(await verdict() === 'ACCEPT', '역제안 조건은 판정에서도 수락이다');

  // ================================================================ 4. 수락 후 조건을 바꾸면 다시 평가한다
  //  - 기간을 바꾼다
  await tapText('104주');
  await page.waitForTimeout(200);
  let afterChange = await text();
  await expect(afterChange.includes('조건이 바뀌었다'), '기간을 바꾸면 합의가 풀린다');
  await expect(!afterChange.includes('함께 하기로 한다'), '합의가 풀리면 체결 버튼이 사라진다');
  //  - 역할을 바꾼다
  await footerOffer().click();
  await page.waitForTimeout(220);
  await expect((await text()).includes('합의했다'), '다시 제안하면 합의된다');
  await tapText('서포트');
  await page.waitForTimeout(200);
  afterChange = await text();
  await expect(afterChange.includes('조건이 바뀌었다'), '역할을 바꿔도 합의가 풀린다');
  //  - 주급을 올린다 (수락되는 방향이어도 다시 제안해야 한다)
  await footerOffer().click();
  await page.waitForTimeout(220);
  await stepSalary('up', 1);
  await expect((await text()).includes('조건이 바뀌었다'), '주급을 올려도 다시 제안해야 한다');
  await expect(await verdict() === 'ACCEPT', '올린 주급 자체는 수락 조건이다');

  // ================================================================ 체결: 저장된 조건 = 합의한 조건
  await footerOffer().click();
  await page.waitForTimeout(220);
  const agreedSalary = await salaryShown();
  const agreedText = await text();
  await expect(agreedText.includes('합의했다'), '최종 조건으로 합의했다');
  await expect(agreedText.includes('104주') && agreedText.includes('서포트'), '합의 내용이 그대로 적혀 있다');
  await tapText('함께 하기로 한다');
  await page.waitForTimeout(300);
  await expect(hash() === '#/band', '체결 후 라인업으로 간다');

  const signed = await save();
  const c1 = signed.contracts.C01;
  console.log('저장된 계약:', JSON.stringify(c1));
  await expect(c1.salary === agreedSalary, `저장된 주급이 합의한 ${agreedSalary.toLocaleString('ko-KR')}과 같다`);
  await expect(c1.endWeek - c1.startWeek === 104, '저장된 계약 기간이 합의한 104주와 같다');
  await expect(c1.rolePromise === 'SUPPORT_MEMBER', '저장된 역할이 합의한 서포트와 같다');

  // ================================================================ 주간 급여 반영
  await page.goto(BASE + '#/management/finance');
  await page.waitForTimeout(280);
  const fin = await text();
  await expect(fin.includes(`₩${(agreedSalary / 1000).toFixed(0)}K`) || fin.includes(agreedSalary.toLocaleString('ko-KR')),
    '자금 화면의 급여 부담에 새 계약이 반영된다');

  // 두 번째 멤버: 기준 주급 그대로 체결하고 합계를 확인한다
  await openContract('민채린');
  const base2 = await salaryShown();
  await expect(await verdict() === 'ACCEPT', `민채린 기준 주급 ${base2.toLocaleString('ko-KR')}은 수락된다`);
  await footerOffer().click();
  await page.waitForTimeout(220);
  await tapText('함께 하기로 한다');
  await page.waitForTimeout(300);
  const both = await save();
  const payroll = Object.values(both.contracts).reduce((a, c) => a + c.salary, 0);
  await expect(payroll === agreedSalary + base2, `주간 급여 합계 ${payroll.toLocaleString('ko-KR')}`);

  // 한 주를 진행해 실제로 그 금액이 빠지는지 본다
  const beforeWeek = await save();
  await page.goto(BASE + '#/schedule');
  await page.waitForSelector('.actionslot');
  await page.locator('.actionslot').nth(0).click();
  await page.waitForSelector('.sheet .rowcard');
  await page.locator('.sheet .rowcard')
    .filter({ has: page.locator('.rowcard__title', { hasText: /^휴식$/ }) }).first().click();
  await page.waitForTimeout(220);
  await tapText('다음 주로 ▶');
  for (let g = 0; g < 16; g += 1) {
    const t = await text();
    if (t.includes('이제 이 팀에 이름이 필요하다')) { await page.fill('input', 'QA BAND'); await tapText('이 이름으로 간다'); continue; }
    if (t.includes('한 주가 끝났다')) break;
    await tapText('계속', true);
  }
  await tapText('연습실로 돌아가기');
  await page.waitForTimeout(280);
  const afterWeek = await save();
  const charged = beforeWeek.economy.cash - afterWeek.economy.cash;
  await expect(charged === payroll, `한 주에 빠져나간 금액이 급여 합계와 같다 (${charged.toLocaleString('ko-KR')})`);

  if (errors.length) throw new Error(errors.join('\n'));
  console.log('\nCONTRACT NEGOTIATION PASSED');
} catch (e) {
  console.error('\nFAILED:', e.message);
  if (errors.length) console.error(errors.join('\n'));
  await page.screenshot({ path: 'contract_fail.png' });
  process.exitCode = 1;
} finally {
  await browser.close();
}
