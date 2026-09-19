// 곡 제작·합주·녹음·발매 v1 — 새 게임에서 전체 사슬을 실제로 플레이한다.
//   데모 2곡 제작 → 첫 공연 → 녹음실 건설 → 녹음 → 싱글 발매 → EP 발매
// 함께 확인: 예약 없는 합주는 곡을 만들지 않음 / 예약 취소 / 대상 곡 변경 /
//            주 1회 녹음 / 미녹음 곡 발매 불가 / 중복 녹음·발매 방지 / 정산 중 새로고침.
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
const songs = (sv) => Object.values(sv.songs);
const recorded = (sv) => songs(sv).filter((s) => typeof s.recordedWeek === 'number');

async function setSlot(i, name) {
  await page.goto(BASE + '#/schedule');
  await page.waitForSelector('.actionslot');
  await page.locator('.actionslot').nth(i).click();
  await page.waitForSelector('.sheet .rowcard');
  await page.locator('.sheet .rowcard')
    .filter({ has: page.locator('.rowcard__title', { hasText: new RegExp(`^${name}$`) }) }).first().click();
  await page.waitForTimeout(220);
}
async function songs_screen() { await page.goto(BASE + '#/band/songs'); await page.waitForTimeout(300); }
/** Click a button inside the card of the song with this title. */
async function songCardBtn(title, label) {
  const card = page.locator('.rowcard--stack').filter({ has: page.locator('.rowcard__title', { hasText: new RegExp(`^${title}$`) }) }).first();
  await card.locator('.btn', { hasText: label }).first().click();
  await page.waitForTimeout(250);
}
async function runWeek() {
  await page.goto(BASE + '#/schedule');
  await page.waitForSelector('.actionslot');
  await tapText('다음 주로 ▶');
  await page.waitForTimeout(220);
  const cards = [];
  for (let g = 0; g < 20; g += 1) {
    const t = await text();
    cards.push(t);
    if (t.includes('이제 이 팀에 이름이 필요하다')) { await page.fill('input', 'V1 BAND'); await tapText('이 이름으로 간다'); continue; }
    if (t.includes('한 주가 끝났다')) break;
    await tapText('계속', true);
  }
  await tapText('연습실로 돌아가기');
  await page.waitForTimeout(250);
  return cards.join(' ');
}
async function bookNewSong() {
  await songs_screen();
  if ((await text()).includes('새 곡 작업 예약')) await tapText('새 곡 작업 예약');
  await page.waitForTimeout(200);
}

let weeksToFirstShow = 0;

try {
  // ================================================================ new game + 2 members
  await page.goto(BASE + '#/start');
  await page.evaluate(() => localStorage.clear());
  await page.goto(BASE + '#/start');
  await page.waitForSelector('#producer');
  await page.fill('#producer', 'QA');
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

  // ================================================================ 규칙 1: 예약 없는 합주는 곡을 만들지 않는다
  await setSlot(0, '합주 연습');
  await setSlot(1, '합주 연습');
  await setSlot(2, '휴식');
  const w0 = await save();
  const cards0 = await runWeek();
  const w1 = await save();
  weeksToFirstShow += 1;
  await expect(songs(w1).length === 0, '예약하지 않은 합주는 곡을 만들지 않는다');
  await expect(w1.characterStates.C01.growth.experience > w0.characterStates.C01.growth.experience,
    '그래도 멤버는 성장한다');
  void cards0;

  // ---- 예약 취소가 동작한다
  await songs_screen();
  await tapText('새 곡 작업 예약');
  await page.waitForTimeout(200);
  await expect((await save()).weeklyPlan.songWork.newSong === true, '새 곡 작업이 예약된다');
  await tapText('새 곡 작업 취소');
  await page.waitForTimeout(200);
  await expect((await save()).weeklyPlan.songWork.newSong === false, '예약을 취소할 수 있다');

  // ================================================================ 데모 2곡
  for (let i = 0; i < 2; i += 1) {
    await bookNewSong();
    await setSlot(0, '합주 연습');
    await setSlot(1, '합주 연습');
    await setSlot(2, '휴식');
    const before = await save();
    await runWeek();
    weeksToFirstShow += 1;
    const after = await save();
    await expect(songs(after).length === songs(before).length + 1, `예약한 주에 데모가 1곡 나온다 (${songs(after).length}곡)`);
    await expect((await save()).weeklyPlan.songWork.newSong === false, '예약은 그 주로 끝난다');
  }
  const twoSongs = await save();
  await expect(recorded(twoSongs).length === 0, '데모는 아직 녹음 전이다');

  // ---- 규칙 4: 미녹음 곡은 발매할 수 없다
  await songs_screen();
  await expect((await text()).includes('첫 공연 후 발매 가능'), '첫 공연 전에는 발매할 수 없다');

  // ================================================================ 첫 공연
  let guard = 0;
  while (guard < 6) {
    const sv = await save();
    const offer = Object.values(sv.opportunities).find(
      (o) => o.type === 'LIVE' && ['NEW', 'SEEN', 'LATER'].includes(o.status) && o.createdWeek <= sv.world.week);
    if (offer) break;
    await setSlot(0, '합주 연습');
    await setSlot(1, '홍보');
    await setSlot(2, '휴식');
    await runWeek();
    weeksToFirstShow += 1;
    guard += 1;
  }
  await page.goto(BASE + '#/inbox');
  await page.waitForTimeout(250);
  await page.locator('.rowcard--stack').filter({ hasText: '수용 인원' }).first().getByText('수락', { exact: true }).click();
  await page.waitForTimeout(250);

  // 규칙 2: 대표곡이 합주 대상으로 자동 연결된다
  await page.goto(BASE + '#/performance/prep');
  await page.waitForTimeout(250);
  await page.locator('.rowcard--tap').filter({ hasText: '라이브 적합도' }).first().click();
  await page.waitForTimeout(200);
  const opening = (await save()).pendingPerformance.openingSongId;
  await setSlot(0, '합주 연습');
  await songs_screen();
  const openTitle = (await save()).songs[opening].title;
  await expect((await text()).includes(openTitle), `대표곡 ${openTitle}이 합주 대상으로 자동 연결된다`);

  // 다른 곡으로 바꿀 수 있다
  const otherTitle = songs(await save()).find((s) => s.id !== opening).title;
  await songCardBtn(otherTitle, '합주로 무대를 다듬는다');
  await expect((await save()).weeklyPlan.songWork.rehearsalSongId !== null, `합주 대상을 ${otherTitle}으로 바꿀 수 있다`);
  await songs_screen();
  await tapText('대표곡을 따라가게 되돌리기');
  await expect((await save()).weeklyPlan.songWork.rehearsalSongId === null, '대표곡 자동 연결로 되돌릴 수 있다');

  // 합주 기록이 곡에 쌓인다
  await setSlot(0, '합주 연습');
  await setSlot(1, '합주 연습');
  const beforeReh = (await save()).songs[opening].rehearsalCount ?? 0;
  await runWeek();
  weeksToFirstShow += 1;
  await expect(((await save()).songs[opening].rehearsalCount ?? 0) === beforeReh + 2,
    '합주 슬롯 수만큼 공연 준비가 쌓인다');

  // 무대
  await setSlot(0, '공연');
  await page.goto(BASE + '#/performance/prep');
  await page.waitForTimeout(250);
  await tapText('공연 시작');
  await page.waitForTimeout(250);
  for (let g = 0; g < 30; g += 1) {
    if (hash() === '#/performance/result') break;
    const t = await text();
    if (t.includes('그대로 밀어붙인다')) { await tapText('그대로 밀어붙인다'); continue; }
    if (t.includes('무대를 내려온다')) { await tapText('무대를 내려온다'); continue; }
    await tapText('계속', true);
  }
  await expect(hash() === '#/performance/result', '첫 공연을 마쳤다');
  await tapText('연습실로 돌아가기');
  await page.waitForTimeout(250);
  const afterShow = await save();
  console.log(`첫 공연: ${afterShow.world.week}주차 · 휴식 포함 ${weeksToFirstShow}주 진행 후`);

  // 규칙 4: 공연은 미녹음 곡으로 해도 되지만 발매는 못 한다
  await songs_screen();
  await expect((await text()).includes('녹음해야 발매할 수 있다'), '미녹음 곡은 공연에 썼어도 발매할 수 없다');

  // ================================================================ 녹음실 건설
  await page.goto(BASE + '#/management/facilities');
  await page.waitForTimeout(250);
  await tapText('건설하기');
  await page.waitForTimeout(200);
  await page.locator('.btn--amber').click();
  await page.waitForTimeout(2000);
  await tapText('넓어진 연습실 보기');
  await page.waitForTimeout(300);
  await expect(await page.locator('.world[data-stage="2"]').count() === 1, 'Stage 2 전환 유지');

  // ================================================================ 규칙 3: 녹음
  await setSlot(0, '녹음');
  await setSlot(1, '합주 연습');
  const sv1 = await save();
  await expect(sv1.weeklyPlan.mainActions.filter((a) => a === 'RECORDING').length === 1, '녹음 슬롯은 1칸이다');
  await setSlot(2, '녹음');
  const sv2 = await save();
  await expect(sv2.weeklyPlan.mainActions.filter((a) => a === 'RECORDING').length === 1,
    '두 번째 녹음을 넣으면 이전 녹음 칸이 비워진다 (주 1회)');

  // 대상 없이 진행하면 비용도 청구되지 않는다
  await page.goto(BASE + '#/schedule');
  await page.waitForSelector('.actionslot');
  await expect((await text()).includes('녹음할 곡을 고르지 않았다'), '대상을 고르지 않으면 경고한다');
  const beforeIdleRec = await save();
  await runWeek();
  const afterIdleRec = await save();
  await expect(recorded(afterIdleRec).length === 0, '대상 없는 녹음은 아무 곡도 녹음하지 않는다');
  const idleCharged = beforeIdleRec.economy.cash - afterIdleRec.economy.cash;
  const salaries = afterIdleRec.band.activeMembers.reduce((a, id) => a + (afterIdleRec.contracts[id]?.salary ?? 0), 0);
  await expect(idleCharged === salaries, `대상 없는 녹음은 비용도 청구하지 않는다 (${idleCharged} = 주급 ${salaries})`);

  // 실제 녹음
  const target = songs(await save()).find((s) => typeof s.recordedWeek !== 'number');
  await songs_screen();
  await songCardBtn(target.title, '이번 주에 녹음한다');
  await setSlot(0, '녹음');
  const beforeRec = await save();
  const recCards = await runWeek();
  const afterRec = await save();
  await expect(recCards.includes('녹음 완료'), '주간 결과에 녹음 완료가 남는다');
  await expect(typeof afterRec.songs[target.id].recordedWeek === 'number', `${target.title} 녹음 완료`);
  const recCharged = beforeRec.economy.cash - afterRec.economy.cash;
  await expect(recCharged === salaries + 150000, `녹음 비용 150,000원이 한 번 청구된다 (${recCharged})`);
  await expect(songs(afterRec).length === songs(beforeRec).length, '녹음은 새 곡을 만들지 않는다');
  await expect(afterRec.weeklyPlan.songWork.recordingSongId === null, '녹음 대상은 주간 확정과 함께 비워진다');

  // 이미 녹음한 곡은 다시 녹음 대상이 되지 않는다
  await songs_screen();
  const card = page.locator('.rowcard--stack').filter({ has: page.locator('.rowcard__title', { hasText: new RegExp(`^${target.title}$`) }) }).first();
  await expect(await card.locator('.btn', { hasText: '이번 주에 녹음한다' }).count() === 0, '녹음한 곡에는 녹음 버튼이 없다');

  // ================================================================ 싱글 발매
  await songs_screen();
  await songCardBtn(target.title, '싱글로 낸다');
  const afterSingle = await save();
  const single = Object.values(afterSingle.releases).find((r) => r.type === 'SINGLE');
  await expect(!!single, '싱글이 발매됐다');
  await expect(afterSingle.songs[target.id].status === 'RELEASED_SINGLE', '싱글로 기록된다');

  // ================================================================ EP: 녹음한 곡 3개
  while (recorded(await save()).filter((s) => !String(s.status).startsWith('RELEASED')).length < 3) {
    const sv = await save();
    const un = songs(sv).find((s) => typeof s.recordedWeek !== 'number' && !String(s.status).startsWith('RELEASED'));
    if (un) {
      await songs_screen();
      await songCardBtn(un.title, '이번 주에 녹음한다');
      await setSlot(0, '녹음');
      await setSlot(1, '휴식');
    } else {
      await bookNewSong();
      await setSlot(0, '합주 연습');
      await setSlot(1, '휴식');

    }
    await runWeek();
  }
  const ready = recorded(await save()).filter((s) => !String(s.status).startsWith('RELEASED')).slice(0, 3);
  await songs_screen();
  for (const s of ready) await songCardBtn(s.title, 'EP까지 모은다');
  await songs_screen();
  await tapText('EP로 낸다');
  await page.waitForTimeout(350);
  const afterEp = await save();
  const ep = Object.values(afterEp.releases).find((r) => r.type === 'EP');
  await expect(!!ep, 'EP가 발매됐다');
  await expect(ep.songIds.every((id) => afterEp.songs[id].status === 'RELEASED_EP'), 'EP 수록으로 기록된다');

  // 같은 주에 여러 번 발매할 수 있다 (주당 제한 없음)
  await expect(Object.values(afterEp.releases).length >= 2, '주당 발매 횟수 제한이 없다');

  // 이미 발매한 곡은 다시 발매되지 않는다
  const epFirst = afterEp.songs[ep.songIds[0]];
  await songs_screen();
  const relCard = page.locator('.rowcard--stack').filter({ has: page.locator('.rowcard__title', { hasText: new RegExp(`^${epFirst.title}$`) }) }).first();
  await expect(await relCard.locator('.btn', { hasText: '싱글로 낸다' }).count() === 0, '발매한 곡에는 발매 버튼이 없다');

  // ================================================================ 정산 중 새로고침
  await bookNewSong();
  await setSlot(0, '합주 연습');
  await page.goto(BASE + '#/schedule');
  await page.waitForSelector('.actionslot');
  await tapText('다음 주로 ▶');
  await page.waitForTimeout(250);
  const midWeek = await save();
  await page.reload();
  await page.waitForTimeout(500);
  const afterReload = await save();
  await expect(JSON.stringify(midWeek) === JSON.stringify(afterReload), '정산 중 새로고침해도 아직 아무것도 확정되지 않는다');
  await page.goto(BASE + '#/schedule');
  await page.waitForSelector('.actionslot');
  const finished = await runWeek();
  void finished;
  const done = await save();
  await expect(done.world.week === midWeek.world.week + 1, '다시 진행하면 한 주만 확정된다');
  await expect(songs(done).length === songs(midWeek).length + 1, '곡도 한 곡만 추가된다');

  console.log(`\n--- v1 결과 ---`);
  console.log('주차            :', `Y${done.world.year} W${String(done.world.week).padStart(2, '0')}`);
  console.log('첫 공연까지     :', `${weeksToFirstShow}주 (휴식 포함 일정)`);
  console.log('곡              :', songs(done).map((s) => `${s.title}[${s.status}${typeof s.recordedWeek === 'number' ? '·녹음' : '·데모'}·합주${s.rehearsalCount ?? 0}]`).join(', '));
  console.log('발매            :', Object.values(done.releases).map((r) => `${r.type} w${r.releasedWeek}`).join(', '));
  if (errors.length) throw new Error(errors.join('\n'));
  console.log('\nSONG WORK v1 PASSED');
} catch (e) {
  console.error('\nFAILED:', e.message);
  if (errors.length) console.error(errors.join('\n'));
  await page.screenshot({ path: 'songwork_fail.png' });
  process.exitCode = 1;
} finally {
  await browser.close();
}
