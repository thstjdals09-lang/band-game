// Basic practice must not be billed as its own activity cost — check the schedule preview,
// the weekly ledger and the actual cash movement.
import { chromium } from 'playwright';

const BASE = 'http://localhost:4173/band-game/';
const log = (...a) => console.log('•', ...a);
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));

const expect = async (c, l) => { if (!c) throw new Error(`EXPECT FAILED: ${l}`); log('ok', l); };
const text = async () => (await page.locator('.phone').innerText()).replace(/\s+/g, ' ');
const save = () => page.evaluate(() => JSON.parse(localStorage.getItem('band-game.save.v1')).state.save);
const tapText = async (t, exact = false) => { await page.getByText(t, { exact }).first().click(); await page.waitForTimeout(150); };

async function setSlot(i, name) {
  await page.locator('.actionslot').nth(i).click();
  await page.waitForSelector('.sheet .rowcard');
  await page.locator('.sheet .rowcard', { hasText: name }).first().click();
  await page.waitForTimeout(200);
}
const expensePreview = async () => {
  const t = await text();
  const m = t.match(/예상 지출 ([^ ]+)/);
  return m ? m[1] : null;
};

try {
  await page.goto(BASE + '#/start');
  await page.evaluate(() => localStorage.clear());
  await page.goto(BASE + '#/start');
  await page.waitForSelector('#producer');
  await page.fill('#producer', 'QA');
  await tapText('START', true);
  await page.waitForSelector('.hud');
  for (let i = 0; i < 5; i += 1) { await page.locator('.hud__week').click(); await page.waitForTimeout(80); }
  await page.waitForTimeout(450);
  await page.goto(BASE + '#/dev');
  await page.waitForSelector('.panel');
  await page.locator('.rowcard', { hasText: 'B2 · 2명 영입 (이름 완료)' }).locator('.btn').click();
  await page.waitForTimeout(500);

  // ---- schedule preview: an empty week vs a three-practice week must cost the same
  await page.goto(BASE + '#/schedule');
  await page.waitForSelector('.actionslot');
  const emptyWeek = await expensePreview();
  await setSlot(0, '합주 연습');
  const onePractice = await expensePreview();
  await setSlot(1, '합주 연습');
  await setSlot(2, '합주 연습');
  const threePractice = await expensePreview();
  log('예상 지출  빈 주:', emptyWeek, '| 연습 1칸:', onePractice, '| 연습 3칸:', threePractice);
  await expect(onePractice === emptyWeek && threePractice === emptyWeek,
    '합주·연습을 넣어도 예상 지출이 늘지 않는다');

  // the sheet should also read 무료
  await page.locator('.actionslot').first().click();
  await page.waitForSelector('.sheet .rowcard');
  const row = await page.locator('.sheet .rowcard', { hasText: '합주 연습' }).first().innerText();
  await expect(row.includes('무료'), `활동 선택 시트에 "무료"로 표시된다 (${row.replace(/\s+/g, ' ')})`);
  await page.locator('.sheet .rowcard', { hasText: '합주 연습' }).first().click();
  await page.waitForTimeout(200);

  // ---- run the week and read the ledger
  const before = await save();
  await tapText('다음 주로 ▶');
  for (let g = 0; g < 16; g += 1) {
    if ((await text()).includes('한 주가 끝났다')) break;
    await tapText('계속', true);
  }
  const closing = await text();
  await tapText('연습실로 돌아가기');
  await page.waitForTimeout(250);
  const after = await save();

  const newLedger = after.economy.ledger.slice(before.economy.ledger.length);
  console.log('주간 장부:', JSON.stringify(newLedger, null, 0));
  await expect(!newLedger.some((l) => /연습|합주/.test(l.label)),
    '장부에 합주·연습 명목의 청구 항목이 없다');

  const salaries = after.band.activeMembers.reduce((a, id) => a + (after.contracts[id]?.salary ?? 0), 0);
  const charged = before.economy.cash - after.economy.cash;
  console.log(`차감액 ${charged} / 주급 합계 ${salaries}`);
  await expect(charged === salaries, '차감된 금액은 멤버 주급뿐이다 (연습 비용 0)');
  await expect(after.characterStates.C01.growth.experience > 0, '연습 효과(경험치)는 그대로 남아 있다');
  await expect(after.characterStates.C01.condition.energy < before.characterStates.C01.condition.energy,
    '연습의 체력 소모도 그대로다');
  await expect(Object.keys(after.songs).length === 1, '연습으로 곡도 그대로 나온다');
  log('주간 마감 화면:', closing.match(/지출 [^ ]+/)?.[0] ?? '-');

  // ---- other activities still cost what they cost
  await page.goto(BASE + '#/schedule');
  await page.waitForSelector('.actionslot');
  const base2 = await expensePreview();
  await setSlot(0, '홍보');
  const withPromo = await expensePreview();
  await expect(withPromo !== base2, `홍보는 여전히 비용이 붙는다 (${base2} → ${withPromo})`);

  if (errors.length) throw new Error(errors.join('\n'));
  console.log('\nPRACTICE COST CHECK PASSED');
} catch (e) {
  console.error('\nFAILED:', e.message);
  if (errors.length) console.error(errors.join('\n'));
  await page.screenshot({ path: 'practicecost_fail.png' });
  process.exitCode = 1;
} finally {
  await browser.close();
}
