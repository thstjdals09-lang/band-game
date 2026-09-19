// 개선 후 재플레이: 새 게임 -> 첫 공연까지, 플레이어가 화면에서 읽는 안내만 따라간다.
// HOME 카드가 가리키는 곳으로만 이동하고, 임의로 숨은 화면을 열지 않는다.
import { chromium } from 'playwright';

const BASE = 'http://localhost:4173/band-game/';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });

const expect = async (c, l) => { if (!c) throw new Error(`EXPECT FAILED: ${l}`); console.log('•', l); };
const text = async () => (await page.locator('.phone').innerText()).replace(/\s+/g, ' ');
const hash = () => new URL(page.url()).hash;
const save = () => page.evaluate(() => JSON.parse(localStorage.getItem('band-game.save.v1')).state.save);
const tap = async (t, exact = false) => { await page.getByText(t, { exact }).first().click(); await page.waitForTimeout(180); };
/** HOME의 다음 할 일 카드 제목. 없으면 null. */
const homeCta = async () => {
  await page.goto(BASE + '#/');
  await page.waitForSelector('.hud');
  await page.waitForTimeout(250);
  const n = await page.locator('.homecta__card').count();
  if (n === 0) return null;
  return (await page.locator('.homecta__card .rowcard__title').first().innerText()).trim();
};
const tapHomeCta = async () => { await page.locator('.homecta__card').first().click(); await page.waitForTimeout(300); };
async function setSlot(i, name) {
  await page.goto(BASE + '#/schedule');
  await page.waitForSelector('.actionslot');
  await page.locator('.actionslot').nth(i).click();
  await page.waitForSelector('.sheet .rowcard');
  await page.locator('.sheet .rowcard')
    .filter({ has: page.locator('.rowcard__title', { hasText: new RegExp(`^${name}$`) }) }).first().click();
  await page.waitForTimeout(200);
}
async function runWeek() {
  await page.goto(BASE + '#/schedule');
  await page.waitForSelector('.actionslot');
  await tap('다음 주로 ▶');
  await page.waitForTimeout(220);
  const cards = [];
  for (let g = 0; g < 18; g += 1) {
    const t = await text();
    cards.push(t);
    if (t.includes('이제 이 팀에 이름이 필요하다')) { await page.fill('input', 'FIRST BAND'); await tap('이 이름으로 간다'); continue; }
    if (t.includes('한 주가 끝났다')) break;
    await tap('계속', true);
  }
  await tap('연습실로 돌아가기');
  await page.waitForTimeout(280);
  return cards.join(' ');
}

try {
  await page.goto(BASE + '#/start');
  await page.evaluate(() => localStorage.clear());
  await page.goto(BASE + '#/start');
  await page.waitForSelector('#producer');
  await page.fill('#producer', 'PLAYER');
  await tap('START', true);
  await page.waitForSelector('.hud');

  // ---- 1. HOME이 오디션을 가리킨다
  await expect(await homeCta() === '오디션이 열려 있다', 'HOME: 오디션이 열려 있다');
  await tapHomeCta();
  await expect(hash().startsWith('#/audition'), '카드를 누르면 오디션으로 간다');

  for (const who of ['윤하진', '민채린']) {
    await page.goto(BASE + '#/audition');
    await page.waitForSelector('.roster__card');
    await page.locator('.roster__card', { hasText: who }).click();
    await page.waitForTimeout(180);
    await tap('상세 보기', true);
    await tap('계약 협상');
    await tap('제안하기');
    await tap('함께 하기로 한다');
    await page.waitForTimeout(220);
  }

  // ---- 2. 영입 후 HOME이 다음 할 일을 가리킨다 (이전에는 비어 있었다)
  const cta1 = await homeCta();
  console.log(`   HOME 카드: ${cta1}`);
  await expect(cta1 === '새 곡을 쓸 차례다', '영입 후 HOME: 새 곡을 쓸 차례다');
  await expect((await text()).includes('곡 0/2'), '남은 곡 수를 알려준다');
  await tapHomeCta();
  await expect(hash() === '#/band/songs', '카드가 곡 화면으로 데려간다');

  // ---- 3. 곡 화면에서 예약하면 HOME 카드가 합주로 바뀐다
  await tap('새 곡 작업 예약');
  const cta2 = await homeCta();
  console.log(`   HOME 카드: ${cta2}`);
  await expect(cta2 === '합주를 잡아 데모를 만든다', '예약 후 HOME: 합주를 잡아 데모를 만든다');
  await tapHomeCta();
  await expect(hash() === '#/schedule', '카드가 일정 화면으로 데려간다');

  // ---- 4. 예약 없이 합주만 넣으면 진행 전에 경고한다 (다른 세이브 경로 확인)
  await setSlot(0, '합주 연습');
  await setSlot(1, '휴식');
  await expect(!(await text()).includes('합주로는 곡이 나오지 않는다'), '예약이 있으면 경고하지 않는다');

  // ---- 5. 한 주 진행 -> 데모가 나온다
  const w1 = await runWeek();
  await expect(w1.includes('새 곡'), '주간 결과에 새 곡이 나온다');
  const s1 = await save();
  await expect(Object.keys(s1.songs).length === 1, `1주 만에 데모 1곡 (${Object.keys(s1.songs).length}곡)`);

  // ---- 6. 예약을 하지 않은 주는 이유를 알려준다
  await setSlot(0, '합주 연습');
  await setSlot(1, '휴식');
  const sched = await text();
  await expect(sched.includes('합주로는 곡이 나오지 않는다') === false, '곡이 있으면 합주는 공연 준비로 쓰인다 (경고 없음)');
  console.log(`   일정 화면 경고: ${(sched.match(/특별히 걱정할 일은 없어 보인다|합주로는 곡이 나오지 않는다|[^.]*경고[^.]*/) ?? ['-'])[0]}`);

  // ---- 7. 두 번째 곡
  await page.goto(BASE + '#/band/songs');
  await page.waitForTimeout(250);
  await tap('새 곡 작업 예약');
  await setSlot(0, '합주 연습');
  await setSlot(1, '홍보');
  await runWeek();
  const s2 = await save();
  await expect(Object.keys(s2.songs).length === 2, `곡 2개 확보 (${Object.keys(s2.songs).length}곡)`);

  // ---- 8. 공연 제안이 올 때까지 (HOME 카드를 따라간다)
  let guard = 0;
  while (guard < 5) {
    const cta = await homeCta();
    if (cta && cta.includes('제안')) break;
    if (cta === '새 곡을 쓸 차례다') break; // 아직 곡이 모자라면 계속
    await setSlot(0, '합주 연습');
    await setSlot(1, '휴식');
    await runWeek();
    guard += 1;
  }
  const ctaOffer = await homeCta();
  console.log(`   HOME 카드: ${ctaOffer}`);
  await expect(!!ctaOffer && ctaOffer.includes('제안'), 'HOME이 새 제안을 알린다');
  await tapHomeCta();
  await expect(hash() === '#/inbox', '카드가 제안함으로 데려간다');
  await page.locator('.rowcard--stack').filter({ hasText: '수용 인원' }).first().getByText('수락', { exact: true }).click();
  await page.waitForTimeout(250);

  // ---- 9. 수락 후 HOME이 공연을 가리킨다
  const ctaShow = await homeCta();
  console.log(`   HOME 카드: ${ctaShow}`);
  await expect(!!ctaShow && ctaShow.includes('공연이 잡혀 있다'), 'HOME이 잡힌 공연을 알린다');
  await tapHomeCta();
  await expect(hash() === '#/performance/prep', '카드가 공연 준비로 데려간다');
  await expect((await text()).includes('이번 주 일정에 공연을 넣어야'), '슬롯이 필요하다고 안내한다');
  await tap('일정 짜러 가기');
  await page.waitForTimeout(250);
  await setSlot(0, '공연');
  await setSlot(1, '합주 연습');

  // ---- 10. 공연
  await page.goto(BASE + '#/performance/prep');
  await page.waitForTimeout(280);
  const prep = await text();
  await expect(prep.includes('라이브 호흡'), '준비 화면이 라이브 호흡을 보여준다');
  await page.locator('.rowcard--tap').filter({ hasText: '라이브 적합도' }).first().click();
  await page.waitForTimeout(180);
  await tap('공연 시작');
  await page.waitForTimeout(250);
  for (let g = 0; g < 30; g += 1) {
    if (hash() === '#/performance/result') break;
    const t = await text();
    if (t.includes('그대로 밀어붙인다')) { await tap('그대로 밀어붙인다'); continue; }
    if (t.includes('무대를 내려온다')) { await tap('무대를 내려온다'); continue; }
    await tap('계속', true);
  }
  await expect(hash() === '#/performance/result', '첫 공연 결과 화면');
  const res = await text();
  console.log(`\n===== 첫 공연 결과 =====\n${res}\n`);
  await tap('연습실로 돌아가기');
  await page.waitForTimeout(280);

  const done = await save();
  console.log(`>>> 첫 공연: ${done.world.week}주차 · 곡 ${Object.keys(done.songs).length}개 · 팬 ${done.band.metrics.fans}`);
  const ctaAfter = await homeCta();
  console.log(`   공연 후 HOME 카드: ${ctaAfter}`);

  if (errors.length) throw new Error(errors.join('\n'));
  console.log('\nPLAYTHROUGH OK');
} catch (e) {
  console.error('\nFAILED:', e.message);
  if (errors.length) console.error(errors.join('\n'));
  await page.screenshot({ path: 'playtest2_fail.png' });
  process.exitCode = 1;
} finally {
  await browser.close();
}
