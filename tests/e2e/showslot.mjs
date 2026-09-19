// PHASE 2A 연결 오류 수정 검증:
//  1) 공연 제안 수락 → 주간 일정 공연 슬롯 → 무대 → 결과 확정이 하나로 이어지는지
//  2) 공연 비용·피로·경험치·수익·팬·평판이 정확히 한 번만 적용되는지
//  3) 공연 슬롯만 편성하고 무대에 오르지 않으면 아무것도 청구되지 않는지
//  4) 홍보 1·2·3칸의 팬 증가량
//  5) EP 발매 기록
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
const tapText = async (t, exact = false) => { await page.getByText(t, { exact }).first().click(); await page.waitForTimeout(150); };

async function unlockDev() {
  await page.waitForSelector('.hud');
  for (let i = 0; i < 5; i += 1) { await page.locator('.hud__week').click(); await page.waitForTimeout(80); }
  await page.waitForTimeout(400);
}
async function preset(label) {
  await page.goto(BASE + '#/dev');
  await page.waitForSelector('.panel');
  await page.locator('.rowcard', { hasText: label }).locator('.btn').click();
  await page.waitForTimeout(600);
}
async function setSlot(i, name) {
  await page.goto(BASE + '#/schedule');
  await page.waitForSelector('.actionslot');
  await page.locator('.actionslot').nth(i).click();
  await page.waitForSelector('.sheet .rowcard');
  await page.locator('.sheet .rowcard').filter({ has: page.locator('.rowcard__title', { hasText: new RegExp(`^${name}$`) }) }).first().click();
  await page.waitForTimeout(200);
}
async function clearSlot(i) {
  await page.goto(BASE + '#/schedule');
  await page.waitForSelector('.actionslot');
  await page.locator('.actionslot').nth(i).click();
  await page.waitForSelector('.sheet');
  await tapText('이 칸 비우기');
}
async function runWeek() {
  await page.goto(BASE + '#/schedule');
  await page.waitForSelector('.actionslot');
  await tapText('다음 주로 ▶');
  await page.waitForTimeout(200);
  const cards = [];
  for (let g = 0; g < 20; g += 1) {
    const t = await text();
    cards.push(t);
    if (t.includes('한 주가 끝났다')) break;
    await tapText('계속', true);
  }
  await tapText('연습실로 돌아가기');
  await page.waitForTimeout(250);
  return cards;
}
const condOf = (sv, id) => ({ ...sv.characterStates[id].condition, exp: Math.round(sv.characterStates[id].growth.experience) });

try {
  // ================================================================ setup
  await page.goto(BASE + '#/start');
  await page.evaluate(() => localStorage.clear());
  await page.goto(BASE + '#/start');
  await page.waitForSelector('#producer');
  await page.fill('#producer', 'QA');
  await tapText('START', true);
  await unlockDev();

  // ================================================================ 1. booked but not played
  await preset('E · 공연 제안 도착');
  await page.waitForTimeout(200);
  await page.locator('.rowcard--stack').filter({ hasText: '수용 인원' }).first().getByText('수락', { exact: true }).click();
  await page.waitForTimeout(250);
  const booked = await save();
  await expect(!!booked.pendingPerformance, '제안 수락으로 공연이 예약된다');

  await page.goto(BASE + '#/performance/prep');
  await page.waitForTimeout(250);
  await expect((await text()).includes('이번 주 일정에 공연을 넣어야'), '슬롯 없이는 무대에 오를 수 없다고 안내한다');
  const startBtn = page.locator('.imm__bottom .btn, .panel__footer .btn').filter({ hasText: '공연 시작' }).first();
  await expect(await startBtn.isDisabled(), '슬롯이 없으면 공연 시작 버튼이 잠겨 있다');

  await setSlot(0, '공연');
  const beforeIdle = await save();
  const idleExpensePreview = (await (async () => {
    await page.goto(BASE + '#/schedule');
    await page.waitForSelector('.actionslot');
    return (await text()).match(/예상 지출 ([^ ]+)/)?.[1];
  })());
  log('공연 슬롯만 편성한 주의 예상 지출:', idleExpensePreview);

  const cards = await runWeek();
  await expect(cards.some((c) => c.includes('무대에 오르지 않은 채로')), '무대에 오르지 않은 사실이 주간 결과에 남는다');
  const afterIdle = await save();
  const idleCharged = beforeIdle.economy.cash - afterIdle.economy.cash;
  const salaries = afterIdle.band.activeMembers.reduce((a, id) => a + (afterIdle.contracts[id]?.salary ?? 0), 0);
  await expect(idleCharged === salaries, `공연을 안 하면 제작비가 청구되지 않는다 (차감 ${idleCharged} = 주급 ${salaries})`);
  const c0 = condOf(beforeIdle, 'C01'); const c1 = condOf(afterIdle, 'C01');
  await expect(c1.energy === c0.energy && c1.stress === c0.stress && c1.exp === c0.exp,
    `공연을 안 하면 피로·경험치도 발생하지 않는다 (체력 ${c0.energy}→${c1.energy}, 경험치 ${c0.exp}→${c1.exp})`);
  await expect(!!afterIdle.pendingPerformance, '예약된 공연은 그대로 남는다');

  // ================================================================ 2. the real show, applied once
  await setSlot(0, '공연');
  const before = await save();
  await page.goto(BASE + '#/performance/prep');
  await page.waitForTimeout(250);
  await page.locator('.rowcard--tap').filter({ hasText: '라이브 적합도' }).first().click();
  await page.waitForTimeout(160);
  await tapText('공연 시작');
  await page.waitForTimeout(250);
  for (let g = 0; g < 30; g += 1) {
    if (hash() === '#/performance/result') break;
    const t = await text();
    if (t.includes('그대로 밀어붙인다')) { await tapText('그대로 밀어붙인다'); continue; }
    if (t.includes('무대를 내려온다')) { await tapText('무대를 내려온다'); continue; }
    await tapText('계속', true);
  }
  await expect(hash() === '#/performance/result', '공연 결과가 확정된다');
  await tapText('연습실로 돌아가기');
  await page.waitForTimeout(250);

  const afterShow = await save();
  const snap = afterShow.performanceHistory[afterShow.performanceHistory.length - 1];
  const b = condOf(before, 'C01'); const a = condOf(afterShow, 'C01');
  const cashMove = afterShow.economy.cash - before.economy.cash;
  console.log(`공연 결과: ${snap.venueName} ${snap.grade} 관객 ${snap.audience} 수익 +${snap.revenue} 팬 +${snap.fansDelta} 평판 +${snap.reputationDelta}`);
  console.log(`멤버: 체력 ${b.energy}→${a.energy} 스트레스 ${b.stress}→${a.stress} 경험치 ${b.exp}→${a.exp} / 자금 이동 ${cashMove}`);

  await expect(a.energy < b.energy, '공연으로 체력이 줄었다');
  await expect(a.stress > b.stress, '공연으로 스트레스가 올랐다');
  await expect(a.exp > b.exp, '공연으로 멤버 경험치가 올랐다');
  await expect(afterShow.band.metrics.fans - before.band.metrics.fans === snap.fansDelta, '팬 증가가 공연 결과와 일치한다');
  await expect(afterShow.band.metrics.reputation - before.band.metrics.reputation === snap.reputationDelta, '평판 변화가 공연 결과와 일치한다');
  const prodCost = before.economy.cash + snap.revenue - afterShow.economy.cash;
  await expect(prodCost === 50000, `공연 제작비가 정확히 한 번 청구됐다 (${prodCost})`);
  const costLines = afterShow.economy.ledger.filter((l) => l.label.includes('공연 제작비'));
  const revLines = afterShow.economy.ledger.filter((l) => l.label.includes('공연 수익'));
  await expect(costLines.length === 1 && revLines.length === 1, '장부에 제작비 1줄, 수익 1줄');

  // ---- the same show must not be paid again by the week
  const beforeWeek = await save();
  const weekCards = await runWeek();
  const afterWeek = await save();
  await expect(weekCards.some((c) => c.includes(snap.venueName)), '주간 결과가 그날의 공연을 되짚어준다');
  const aw = condOf(afterWeek, 'C01');
  await expect(afterWeek.performanceHistory.length === beforeWeek.performanceHistory.length, '공연 기록이 늘지 않았다');
  await expect(afterWeek.band.metrics.fans === beforeWeek.band.metrics.fans, '주간 확정으로 팬이 또 늘지 않았다');
  await expect(afterWeek.band.metrics.reputation === beforeWeek.band.metrics.reputation, '평판도 중복 적용되지 않았다');
  await expect(aw.exp === condOf(beforeWeek, 'C01').exp, '공연 경험치가 주간 확정에서 다시 지급되지 않았다');
  await expect(afterWeek.economy.ledger.filter((l) => l.label.includes('공연 제작비')).length === 1, '제작비가 두 번 청구되지 않았다');
  const weekCharged = beforeWeek.economy.cash - afterWeek.economy.cash;
  await expect(weekCharged === salaries, `공연 주간의 운영비는 주급뿐이다 (${weekCharged})`);

  // ---- reload / revisit
  const beforeReload = await save();
  await page.reload();
  await page.waitForSelector('.hud');
  await expect(JSON.stringify(await save()) === JSON.stringify(beforeReload), '새로고침 후 세이브가 동일하다');
  await page.goto(BASE + '#/performance/result');
  await page.waitForTimeout(300);
  await page.goto(BASE + '#/performance/live');
  await page.waitForTimeout(300);
  await expect(JSON.stringify(await save()) === JSON.stringify(beforeReload), '결과·무대 화면 재진입으로도 보상이 다시 지급되지 않는다');

  // ================================================================ 3. promotion slots
  await preset('B2 · 2명 영입 (이름 완료)');
  const fansFor = async (slots) => {
    await preset('B2 · 2명 영입 (이름 완료)');
    const start = (await save()).band.metrics.fans;
    for (let i = 0; i < slots; i += 1) await setSlot(i, '홍보');
    await runWeek();
    return (await save()).band.metrics.fans - start;
  };
  const f1 = await fansFor(1);
  const f2 = await fansFor(2);
  const f3 = await fansFor(3);
  console.log(`홍보 팬 증가 — 1칸 +${f1} / 2칸 +${f2} / 3칸 +${f3}`);
  await expect(f2 === f1 * 2 && f3 === f1 * 3, '홍보 팬 증가가 슬롯 수만큼 적용된다');

  // ================================================================ 4. EP release record
  await preset('H · 시설 건설 후');
  await page.waitForTimeout(300);
  // gather three songs by rehearsing, then mark them for the EP
  for (let i = 0; i < 4; i += 1) {
    const sv = await save();
    const keepable = Object.values(sv.songs).filter((x) => x.status === 'UNRELEASED' || x.status === 'SAVED_FOR_EP');
    if (keepable.length >= 3) break;
    await setSlot(0, '합주 연습');
    await runWeek();
  }
  await page.goto(BASE + '#/band/songs');
  await page.waitForTimeout(300);
  // one button per song card: mark three different songs
  const n = Math.min(3, await page.locator('.btn', { hasText: 'EP까지 모은다' }).count());
  for (let i = 0; i < n; i += 1) {
    await page.locator('.btn', { hasText: 'EP까지 모은다' }).nth(i).click();
    await page.waitForTimeout(220);
  }
  const marked = Object.values((await save()).songs).filter((x) => x.status === 'SAVED_FOR_EP');
  await expect(marked.length >= 3, `EP용으로 ${marked.length}곡을 모았다`);
  await page.goto(BASE + '#/band/songs');
  await page.waitForTimeout(300);
  await tapText('EP로 낸다');
  await page.waitForTimeout(350);

  const epSave = await save();
  const ep = Object.values(epSave.releases).find((r) => r.type === 'EP');
  await expect(!!ep, 'EP 발매 기록이 남았다');
  const epSongs = ep.songIds.map((id) => epSave.songs[id]);
  await expect(epSongs.every((x) => x.status === 'RELEASED_EP'),
    `EP 수록곡이 EP로 기록된다 (${epSongs.map((x) => x.status).join(', ')})`);
  await expect(epSongs.every((x) => x.status !== 'RELEASED_SINGLE'), '더 이상 싱글로 잘못 기록되지 않는다');
  await page.goto(BASE + '#/band/songs');
  await page.waitForTimeout(300);
  await expect((await text()).includes('EP 수록'), '곡 화면에 EP 수록으로 표시된다');

  // old saves keep working: a legacy RELEASED_SINGLE song still reads as released
  await page.evaluate(() => {
    const raw = JSON.parse(localStorage.getItem('band-game.save.v1'));
    const sv = raw.state.save;
    const first = Object.values(sv.songs)[0];
    first.status = 'RELEASED_SINGLE';
    localStorage.setItem('band-game.save.v1', JSON.stringify(raw));
  });
  await page.reload();
  await page.goto(BASE + '#/band/songs');
  await page.waitForTimeout(350);
  await expect((await text()).includes('싱글 발매'), '기존 싱글 발매 기록도 그대로 읽힌다');
  await expect(errors.length === 0, '콘솔 에러 없음');

  console.log('\nSHOW SLOT / PROMOTION / EP CHECK PASSED');
} catch (e) {
  console.error('\nFAILED:', e.message);
  if (errors.length) console.error(errors.join('\n'));
  await page.screenshot({ path: 'showslot_fail.png' });
  process.exitCode = 1;
} finally {
  await browser.close();
}
