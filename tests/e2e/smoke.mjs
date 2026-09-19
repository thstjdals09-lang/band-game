// Smoke test: walk the full Prototype Spine in a 390x844 viewport using the installed Chrome.
// PHASE 1.2: also asserts no developer strings leak into player screens, and checks touch sizes.
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
const tap = async (sel, name) => { await page.locator(sel).first().click(); await page.waitForTimeout(130); log('tap', name ?? sel); };
const tapText = async (t, exact = false) => { await page.getByText(t, { exact }).first().click(); await page.waitForTimeout(130); log('tap', t); };
const dockCount = () => page.locator('.dock').count();
const asset = (key) => page.locator(`[data-asset="${key}"]`).count();
const worldObj = (id) => page.locator(`[data-object="${id}"]`);
/** The playable world is bigger than the screen: drag it until the object is centred, then tap. */
async function dragToObject(id) {
  for (let i = 0; i < 6; i += 1) {
    const box = await worldObj(id).boundingBox();
    if (!box) throw new Error(`world object ${id} not rendered`);
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    const vw = page.viewportSize();
    const dx = vw.width / 2 - cx;
    const dy = vw.height / 2 - cy;
    if (Math.abs(dx) < 60 && Math.abs(dy) < 60) break;
    await page.mouse.move(vw.width / 2, vw.height / 2);
    await page.mouse.down();
    await page.mouse.move(vw.width / 2 + dx / 2, vw.height / 2 + dy / 2, { steps: 6 });
    await page.mouse.move(vw.width / 2 + dx, vw.height / 2 + dy, { steps: 6 });
    await page.mouse.up();
    await page.waitForTimeout(220);
  }
  await worldObj(id).click();
  await page.waitForTimeout(150);
  log('drag+tap', id);
}


const DEV_PATTERNS = [/PLACEHOLDER/, /TODO/, /§/, /PHASE\s?2/i, /Prototype Variable/i, /Source of Truth/i];
const screensChecked = [];
async function assertClean(name) {
  const t = await text();
  for (const p of DEV_PATTERNS) {
    if (p.test(t)) throw new Error(`DEV STRING LEAK on ${name}: ${p} -> ${t.slice(0, 200)}`);
  }
  screensChecked.push(name);
}
/** Every visible button/tap row must be at least 40px tall at 390px width. */
async function assertTapSizes(name) {
  const bad = await page.evaluate(() => {
    const out = [];
    document.querySelectorAll('.btn, .dock__item, .rowcard--tap, .slot, .actionslot, .roster__card, .subtabs__item, .panel__nav, .seg button, .stepper button').forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0 && r.height < 40) out.push(`${el.className}:${Math.round(r.height)}`);
    });
    return out;
  });
  if (bad.length) throw new Error(`SMALL TAP TARGET on ${name}: ${bad.slice(0, 5).join(', ')}`);
}
const check = async (name) => { await assertClean(name); await assertTapSizes(name); log('clean', name); };

try {
  await page.goto(BASE + '#/start');
  await page.evaluate(() => localStorage.clear());
  await page.goto(BASE + '#/start');
  await page.waitForSelector('#producer');
  await check('START');
  await page.fill('#producer', 'TESTER');
  await tapText('START', true);
  await page.waitForSelector('.hud');

  // ---------------- HOME
  await expect((await text()).includes('Y1 W01'), 'HOME HUD shows Y1 W01');
  await expect(hash() === '#/', 'at HOME');
  await expect(await page.locator('.dock__item--active').count() === 0, 'no active dock on HOME');
  await expect(await page.locator('.isoworld').count() === 1, 'isometric world rendered');
  await expect(await page.locator('[data-object="PHONE_DESK"]').count() === 1, 'phone desk object in world');
  await expect(await page.locator('.world[data-stage="1"]').count() === 1, 'world stage 1');
  await check('HOME');

  // ---------------- AUDITION
  await tapText('오디션', true);
  await expect(hash() === '#/audition', 'audition route');
  const t1 = await text();
  for (const n of ['윤하진', '민채린', '박시온', '최우재', '서유리']) await expect(t1.includes(n), `roster has ${n}`);
  await expect(t1.includes('후보 5명'), 'candidate count shown');
  await expect((await page.locator('.dock__item--active').innerText()).includes('오디션'), 'audition dock active');
  await check('AUDITION');

  await tapText('쇼트리스트', true);
  await page.locator('.roster__card', { hasText: '민채린' }).click();
  await page.waitForTimeout(130);
  await tapText('쇼트리스트', true);
  await tapText('비교하기 (2명)');
  await expect(hash() === '#/audition/compare', 'compare route');
  await expect(await page.locator('.compare__col').count() >= 4, 'compare columns rendered');
  const cmp = await text();
  await expect(cmp.includes('밴드 적합도') && cmp.includes('아직 알 수 없음'), 'compare shows honest unknown fit');
  await expect(cmp.includes('계약') && cmp.includes('빈 자리'), 'compare shows contract burden + empty slot fact');
  await check('COMPARE');
  await tap('.panel__nav', 'back');
  await expect(hash().startsWith('#/audition') && !hash().includes('compare'), 'back to audition');

  // ---------------- Candidate Detail -> Contract -> join
  await page.locator('.roster__card', { hasText: '윤하진' }).click();
  await page.waitForTimeout(130);
  await tapText('상세 보기', true);
  await expect(hash() === '#/audition/candidate/C01', 'candidate detail route');
  await expect((await dockCount()) === 0, 'dock hidden on candidate detail');
  const cd = await text();
  await expect(cd.includes('확인된 것') && cd.includes('아직 확실하지 않은 것') && cd.includes('알 수 없는 것'), 'KNOWN/UNCERTAIN/UNKNOWN hierarchy');
  await check('CANDIDATE DETAIL');
  await tapText('인터뷰');
  await expect((await text()).includes('Impulsive'), 'interview revealed second trait');
  await tapText('계약 협상');
  await expect(hash() === '#/audition/contract/C01', 'contract route');
  await expect((await text()).includes('수락 가능성'), 'acceptance likelihood shown as words');
  await check('CONTRACT');
  await tapText('제안하기');
  await expect((await text()).includes('합의했다'), 'offer accepted');
  await tapText('함께 하기로 한다');
  await expect(hash() === '#/band', 'band route after join');
  await expect((await text()).includes('윤하진'), 'lineup shows 윤하진');

  // second member
  await tapText('오디션', true);
  await page.locator('.roster__card', { hasText: '민채린' }).click();
  await page.waitForTimeout(130);
  await tapText('상세 보기', true);
  await tapText('계약 협상');
  await tapText('제안하기');
  await tapText('함께 하기로 한다');
  const lineupTxt = await text();
  await expect(lineupTxt.includes('민채린') && lineupTxt.includes('CURRENT LINEUP 2/4'), 'lineup 2/4 with 민채린');
  await expect(!lineupTxt.includes('커리어 기록') && !lineupTxt.includes('팬 / 차트'), 'future shells removed from BAND first screen');
  await check('BAND / LINEUP');

  // ---------------- Session hire
  await page.locator('.slot', { hasText: 'BASS' }).click();
  await page.waitForTimeout(160);
  await expect(page.url().includes('slot=2'), 'slot sheet opened (index 2 = BASS)');
  const sheet = await text();
  await expect(sheet.includes('세션 베이스') && sheet.includes('주당 비용') && sheet.includes('신뢰도'), 'session card shows cost/skill/reliability');
  await tapText('이 포지션에 고용');
  await expect((await text()).includes('세션 베이스'), 'session hired on BASS');
  await expect((await text()).includes('CURRENT LINEUP 3/4'), 'lineup 3/4 after session');

  // ---------------- Band sub tabs
  await tapText('멤버', true);
  await expect(hash() === '#/band/members', 'members route');
  await check('BAND / MEMBERS');
  await page.locator('.rowcard', { hasText: '윤하진' }).click();
  await page.waitForTimeout(130);
  await expect(hash() === '#/band/members/C01', 'member detail route');
  await expect((await text()).includes('Born Performer'), 'member detail shows visible trait');
  await check('MEMBER DETAIL');
  await tap('.panel__nav', 'back');
  await tapText('케미', true);
  await expect((await text()).includes('갈등 위험'), 'chemistry diagnostics');
  await check('CHEMISTRY');

  // ---------------- Secondary (future) entries behind overflow
  await tapText('밴드', true);
  await page.locator('.panel__nav').last().click();
  await page.waitForTimeout(160);
  await expect((await text()).includes('커리어 기록') && (await text()).includes('공개 프로필'), 'future entries live behind overflow sheet');
  await page.locator('.sheet-backdrop').click();
  await page.waitForTimeout(130);

  // ---------------- SCHEDULE
  await tapText('일정', true);
  await expect(hash() === '#/schedule', 'schedule route');
  await page.locator('.actionslot').first().click();
  await page.waitForTimeout(160);
  await tapText('합주 연습');
  await expect((await text()).includes('합주 완성도'), 'chosen action shows affected elements');
  await page.locator('.actionslot').nth(1).click();
  await page.waitForTimeout(160);
  await tapText('홍보');
  await expect((await text()).includes('예상 지출'), 'projected expense shown');
  await check('SCHEDULE');

  // ---------------- WEEK RESOLUTION
  await tapText('다음 주로 ▶');
  await expect(hash() === '#/schedule/resolution', 'resolution route');
  await expect((await dockCount()) === 0, 'dock hidden on resolution');
  await page.goBack().catch(() => {});
  await page.waitForTimeout(220);
  await expect(hash() === '#/schedule/resolution', 'back locked on resolution');
  await expect((await text()).includes('밴드 활동'), 'resolution replays the week activity by activity');
  await check('WEEK RESOLUTION');
  // PHASE 2A: the cards are the simulated week, so walk them until the naming moment appears.
  for (let guard = 0; guard < 12; guard += 1) {
    if ((await text()).includes('이제 이 팀에 이름이 필요하다')) break;
    await tapText('계속', true);
  }
  await expect((await text()).includes('이제 이 팀에 이름이 필요하다'), 'band name event step');
  await expect(!(await text()).includes('SUGGESTION'), 'no placeholder suggestion keys');
  await check('BAND NAME EVENT');
  await page.fill('input', 'TEST BAND');
  await tapText('이 이름으로 간다');
  await expect((await text()).includes('새 곡'), 'new song reveal');
  await expect((await text()).includes('대중성') && (await text()).includes('라이브'), 'the song is shown by its four axes, not a placeholder name');
  await expect(!(await text()).includes('Untitled Demo'), 'songs are written, not numbered placeholders');
  await check('NEW SONG');
  for (let guard = 0; guard < 12; guard += 1) {
    if ((await text()).includes('한 주가 끝났다')) break;
    await tapText('계속', true);
  }
  await expect((await text()).includes('한 주가 끝났다'), 'week complete');
  await expect((await text()).includes('이번 주 수지'), 'the week closes on money, fans and songs');
  await tapText('연습실로 돌아가기');
  await expect(hash() === '#/', 'returned home');
  const homeTxt = await text();
  await expect(homeTxt.includes('Y1 W02'), 'week advanced to W02');
  await expect(homeTxt.includes('TEST BAND'), 'band name in HUD');
  await expect(await page.locator('[data-character="session_00001"]').count() === 1, 'session actor reflected in world');

  // ---------------- keep playing until the first offer arrives (PHASE 2A: recurring, not scripted)
  const readSave = () => page.evaluate(() => JSON.parse(localStorage.getItem('band-game.save.v1')).state.save);
  const liveOffer = (sv) => Object.values(sv.opportunities).filter(
    (o) => o.type === 'LIVE' && ['NEW', 'SEEN', 'LATER'].includes(o.status) && o.createdWeek <= sv.world.week);
  let songsSeen = 1;
  for (let wk = 0; wk < 5; wk += 1) {
    if (liveOffer(await readSave()).length > 0) break;
    await page.goto(BASE + '#/schedule');
    await page.waitForSelector('.actionslot');
    await page.locator('.actionslot').first().click();
    await page.waitForSelector('.sheet .rowcard');
    await page.locator('.sheet .rowcard', { hasText: '합주 연습' }).first().click();
    await page.waitForTimeout(200);
    await tapText('다음 주로 ▶');
    for (let guard = 0; guard < 14; guard += 1) {
      if ((await text()).includes('한 주가 끝났다')) break;
      await tapText('계속', true);
    }
    await tapText('연습실로 돌아가기');
    await page.waitForTimeout(200);
    songsSeen += 1;
  }
  const svOffer = await readSave();
  await expect(liveOffer(svOffer).length > 0, `a live offer arrived by week ${svOffer.world.week}`);
  await expect(Object.keys(svOffer.songs).length >= 2, `the band keeps writing songs (${Object.keys(svOffer.songs).length})`);
  await expect((await text()).includes('새 제안'), 'home surfaces the new offer');

  // ---------------- Inbox -> accept -> prep -> performance
  await dragToObject('PHONE_DESK');
  await expect(hash() === '#/inbox', 'inbox route');
  const inbox = await text();
  await expect(inbox.includes('Basement Club') && inbox.includes('수용 인원') && inbox.includes('마감'), 'offer shows venue, capacity, expiry');
  await check('OPPORTUNITY INBOX');
  await page.locator('.rowcard--stack').filter({ hasText: '수용 인원' }).first().getByText('수락', { exact: true }).click();
  await page.waitForTimeout(220);
  await tapText('공연 준비하기');
  await expect(hash() === '#/performance/prep', 'prep route');
  await expect(/보유 곡 \d+\/2/.test(await text()), 'prep shows how many songs the band has');
  await check('PERFORMANCE PREP');
  await page.locator('.rowcard--tap', { hasText: '라이브 적합도' }).first().click();
  await page.waitForTimeout(130);
  await tapText('공연 시작');
  await expect(hash() === '#/performance/live', 'live route');
  await expect((await dockCount()) === 0 && (await page.locator('.hud').count()) === 0, 'no dock/hud on performance');
  await expect((await text()).includes('Basement Club') && /SONG 1\/\d/.test(await text()), 'venue + setlist counter');
  await check('PERFORMANCE');
  await tapText('계속', true);
  await tapText('계속', true);
  await expect((await text()).includes('민채린이 예정된 기타 솔로'), 'choice prompt reads naturally');
  await tapText('그대로 밀어붙인다');
  await expect((await text()).includes('SONG 2/2'), 'second song plays');
  await tapText('계속', true);
  await tapText('무대를 내려온다');
  await expect(hash() === '#/performance/result', 'result route');
  const res = await text();
  await expect(/최고의 무대|좋은 공연|무난한 공연|아쉬운 밤/.test(res), 'emotional grade first');
  await expect(res.includes('관객') && res.includes('수익'), 'objective results');
  await expect(res.includes('Local Radio') && res.includes('녹음실'), 'world changes listed');
  await check('PERFORMANCE RESULT');
  await tapText('연습실로 돌아가기');
  await expect(hash() === '#/', 'home after result');

  // ---------------- Facilities
  await tapText('경영', true);
  await check('MANAGEMENT');
  await tapText('시설', true);
  await expect(hash() === '#/management/facilities', 'facilities route');
  const fac = await text();
  await expect(fac.includes('지금 지을 수 있는 곳') && fac.includes('보유 중') && fac.includes('아직 잠긴 공간'), 'facility states grouped');
  await check('FACILITIES');
  await tapText('건설하기');
  await expect(hash() === '#/management/facilities/build/RECORDING_ROOM', 'build route');
  await page.locator('.btn--amber').click();
  await page.waitForTimeout(1900);
  await tapText('넓어진 연습실 보기');
  await expect(hash() === '#/', 'home after build');
  await expect(await page.locator('[data-object="RECORDING_DESK"]').count() === 1, 'stage 2 adds the recording desk object');
  await expect(await page.locator('.world[data-stage="2"]').count() === 1, 'world data-stage=2');
  await check('EXPANDED HOME');

  // ---------------- persistence + migration fallback
  const beforeReload = await readSave();
  await page.reload();
  await page.waitForSelector('.hud');
  const afterReload = await readSave();
  await expect(JSON.stringify(beforeReload) === JSON.stringify(afterReload), 'save byte-identical across reload');
  await expect((await text()).includes('TEST BAND')
    && (await text()).includes(`Y1 W${String(afterReload.world.week).padStart(2, '0')}`), 'save persisted across reload');

  await page.evaluate(() => {
    const raw = JSON.parse(localStorage.getItem('band-game.save.v1'));
    const sv = raw.state.save;
    sv.band.lineup = { VOCAL: { kind: 'MEMBER', characterId: 'C01' }, GUITAR: null, BASS: null, DRUMS: null, KEYS: null };
    delete sv.opportunities; delete sv.pendingPerformance; delete sv.counters;
    Object.values(sv.auditions).forEach((a) => { delete a.shortlistIds; delete a.compareIds; });
    localStorage.setItem('band-game.save.v1', JSON.stringify(raw));
  });
  await page.goto(BASE + '#/band');
  await page.reload();
  await page.waitForSelector('.slot');
  await expect(await page.locator('.slot').count() === 4 && (await text()).includes('CURRENT LINEUP 1/4'), 'legacy Record lineup migrated to 4-slot list');
  await page.goto(BASE + '#/inbox');
  await page.waitForTimeout(160);
  await expect((await page.locator('.panel').count()) >= 1, 'inbox renders with defaulted fields');

  // ---------------- dev presets (QA only, not reachable from the Dock)
  await page.goto(BASE + '#/');
  await page.waitForTimeout(160);
  await expect(!(await text()).includes('DEV'), 'no dev entry in player UI');
  // dev access: hidden by default, reachable by the secret gesture, chip appears afterwards
  await expect(await page.locator('.devfab').count() === 0, 'no DEV chip before /dev is opened');
  for (let i = 0; i < 5; i += 1) { await page.locator('.hud__week').click(); await page.waitForTimeout(80); }
  await page.waitForTimeout(350);
  await expect(hash() === '#/dev', 'secret gesture opens /dev');
  await page.goto(BASE + '#/');
  await page.waitForTimeout(300);
  await expect(await page.locator('.devfab').count() === 1, 'DEV chip appears after unlocking');

  await page.goto(BASE + '#/dev');
  await page.waitForSelector('.panel');
  for (const label of ['A · 새 게임', 'B · 2명 영입 (이름 전)', 'C · 세션 고용 검수', 'D · 2곡 보유', 'E · 공연 제안 도착', 'F · 공연 수락 완료', 'G · 시설 건설 가능', 'H · 시설 건설 후']) {
    await expect((await text()).includes(label), `preset listed: ${label}`);
  }
  const runPreset = async (label) => {
    await page.goto(BASE + '#/dev');
    await page.waitForSelector('.panel');
    await page.locator('.rowcard', { hasText: label }).locator('.btn').click();
    await page.waitForTimeout(300);
  };
  await runPreset('F · 공연 수락 완료');
  await expect(hash() === '#/performance/prep' && /보유 곡 \d+\/2/.test(await text()), 'preset F lands on prep with a booked show');
  await runPreset('H · 시설 건설 후');
  await expect(hash() === '#/' && (await page.locator('.world[data-stage="2"]').count() === 1), 'preset H gives stage 2 basecamp');
  await runPreset('B · 2명 영입 (이름 전)');
  await expect(hash() === '#/band' && (await text()).includes('CURRENT LINEUP 2/4'), 'preset B gives 2 members');
  await runPreset('E · 공연 제안 도착');
  await expect(hash() === '#/inbox' && (await text()).includes('Basement Club'), 'preset E has the live offer');
  await runPreset('A · 새 게임');
  await expect(hash() === '#/' && (await text()).includes('Y1 W01'), 'preset A resets to week 1');

  // diagnostics toggle shows keys only in dev
  await page.goto(BASE + '#/dev');
  await page.waitForSelector('.panel');
  await page.locator('.rowcard', { hasText: 'Asset keys' }).locator('.btn').click();
  await page.waitForTimeout(160);
  await page.goto(BASE + '#/');
  await page.waitForTimeout(220);
  await expect((await text()).includes('PLACEHOLDER'), 'diagnostics ON reveals asset keys');
  await page.goto(BASE + '#/dev');
  await page.locator('.rowcard', { hasText: 'Asset keys' }).locator('.btn').click();
  await page.waitForTimeout(160);
  await page.goto(BASE + '#/');
  await page.waitForTimeout(220);
  await expect(!(await text()).includes('PLACEHOLDER'), 'diagnostics OFF hides asset keys again');

  // ---------------- isometric world lab
  await page.goto(BASE + '#/dev/world');
  await page.waitForSelector('.lab__frame');
  const labText = await text();
  await expect(labText.includes('no overlap'), 'map has no footprint overlap');
  await expect(labText.includes('PERFORM_VOCAL') && labText.includes('SOFA_IDLE'), 'spawn points listed');
  for (const v of ['320 × 568', '375 × 667', '390 × 844', '393 × 852', '430 × 932']) {
    await page.getByText(v, { exact: true }).first().click();
    await page.waitForTimeout(240);
    const t = await text();
    await expect(t.includes('zoom'), `viewport preset ${v} renders`);
    await expect(!t.includes('(clamped)'), `viewport ${v} fits without clamping`);
  }
  await page.getByText('STAGE 2', { exact: true }).click();
  await page.waitForTimeout(260);
  await expect((await text()).includes('연습실 + 녹음실'), 'lab switches to stage 2 map');
  await page.getByText('ALL ON', { exact: true }).click();
  await page.waitForTimeout(260);
  await expect(await page.locator('.isoworld__fp').count() > 0, 'footprint overlay renders');
  await expect(await page.locator('.isoworld__safe').count() > 0, 'camera safe area overlay renders');
  await expect(await page.locator('.isoworld__spawn').count() > 0, 'spawn overlay renders');
  // dev tuning must persist and reach the real world, not just the lab preview
  const camScale = async () => {
    const t = await page.evaluate(() => document.querySelector('.isoworld g[transform]')?.getAttribute('transform') ?? '');
    return Number((t.match(/scale\(([\d.]+)\)/) ?? [])[1] ?? 0);
  };
  await page.goto(BASE + '#/');
  await page.waitForTimeout(350);
  const zoomBefore = await camScale();
  await page.goto(BASE + '#/dev/world');
  await page.waitForSelector('.lab__frame');
  for (let i = 0; i < 3; i += 1) { await page.locator('.stepper').first().locator('button').last().click(); await page.waitForTimeout(110); }
  await page.goto(BASE + '#/');
  await page.waitForTimeout(400);
  const zoomAfter = await camScale();
  await expect(zoomAfter > zoomBefore, 'lab zoom is saved and applied to the real world');
  await page.reload();
  await page.waitForTimeout(500);
  await expect(Math.abs((await camScale()) - zoomAfter) < 0.001, 'saved zoom survives a reload');
  await page.goto(BASE + '#/dev/world');
  await page.waitForSelector('.lab__frame');
  await page.getByText('RESET ALL TUNING', { exact: true }).click();
  await page.waitForTimeout(250);
  await page.goto(BASE + '#/');
  await page.waitForTimeout(400);
  await expect(Math.abs((await camScale()) - zoomBefore) < 0.001, 'reset restores the shipped zoom');
  await page.goto(BASE + '#/dev/world');
  await page.waitForSelector('.lab__frame');

  await page.getByText('ALL OFF', { exact: true }).click();
  await page.waitForTimeout(220);
  await page.goto(BASE + '#/');
  await page.waitForTimeout(260);
  await expect(await page.locator('.isoworld__fp').count() === 0, 'world overlays never leak into HOME');

  // ---------------- future shells still reachable
  for (const r of ['#/band/fans', '#/outside/rankings', '#/management/staff', '#/band/archive', '#/band/profile', '#/band/history', '#/outside/venues', '#/management/finance', '#/management/contracts']) {
    await page.goto(BASE + r);
    await page.waitForTimeout(170);
    await expect(hash() === r && (await page.locator('.panel').count()) >= 1, `route ${r} renders`);
    await assertClean(r);
  }

  console.log(`\nSMOKE PASSED. screens checked for dev strings: ${screensChecked.length}. console/page errors: ${errors.length}`);
  errors.forEach((e) => console.log('  ', e));
} catch (e) {
  console.log('\nSMOKE FAILED:', e.message);
  console.log('url:', page.url());
  console.log('errors:', errors);
  console.log('text:', (await text()).slice(0, 900));
  await page.screenshot({ path: 'fail.png' });
  process.exitCode = 1;
} finally {
  await browser.close();
}
