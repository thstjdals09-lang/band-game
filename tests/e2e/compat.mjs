// Save compatibility: a save written before PHASE 2A (no musicDna, no release counter/result,
// pre-2A song shape) must still load, render and keep playing.
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

try {
  // build a normal save through the QA preset, then age it back to the pre-2A shape
  await page.goto(BASE + '#/start');
  await page.evaluate(() => localStorage.clear());
  await page.waitForSelector('#producer');
  await page.fill('#producer', 'QA');
  await tapText('START', true);
  await page.waitForSelector('.hud');
  for (let i = 0; i < 5; i += 1) { await page.locator('.hud__week').click(); await page.waitForTimeout(80); }
  await page.waitForTimeout(450);
  await page.goto(BASE + '#/dev');
  await page.waitForSelector('.panel');
  await page.locator('.rowcard', { hasText: 'H · 시설 건설 후' }).locator('.btn').click();
  await page.waitForTimeout(600);
  const modern = await save();
  await expect(Object.keys(modern.songs).length >= 2, 'preset produced a playable save');

  const stripped = await page.evaluate(() => {
    const raw = JSON.parse(localStorage.getItem('band-game.save.v1'));
    const sv = raw.state.save;
    // everything PHASE 2A added, removed again
    Object.values(sv.songs).forEach((s) => { delete s.musicDna; });
    Object.values(sv.releases ?? {}).forEach((r) => { delete r.result; });
    delete sv.counters.release;
    delete sv.careerHistory;
    localStorage.setItem('band-game.save.v1', JSON.stringify(raw));
    return Object.keys(sv.songs).length;
  });
  log('legacy save written with', stripped, 'songs and no 2A fields');

  await page.goto(BASE + '#/');
  await page.reload();
  await page.waitForSelector('.hud');
  await expect((await text()).includes('QA BAND'), 'legacy save loads on HOME');
  await expect(errors.length === 0, 'no errors loading the legacy save');

  await page.goto(BASE + '#/band/songs');
  await page.waitForTimeout(300);
  await expect((await text()).includes('대중성'), 'legacy songs still render their four axes');

  await page.goto(BASE + '#/management');
  await page.waitForTimeout(300);
  await expect(/무명 밴드|지역 밴드/.test(await text()), 'career tier derives itself from the legacy history');

  // and a fresh week still runs on top of it
  const before = await save();
  await page.goto(BASE + '#/schedule');
  await page.waitForSelector('.actionslot');
  await page.locator('.actionslot').first().click();
  await page.waitForSelector('.sheet .rowcard');
  await page.locator('.sheet .rowcard')
    .filter({ has: page.locator('.rowcard__title', { hasText: /^합주 연습$/ }) }).first().click();
  await page.waitForTimeout(200);
  await tapText('다음 주로 ▶');
  for (let g = 0; g < 16; g += 1) {
    if ((await text()).includes('한 주가 끝났다')) break;
    await tapText('계속', true);
  }
  await tapText('연습실로 돌아가기');
  await page.waitForTimeout(250);
  const after = await save();
  await expect(after.world.week === before.world.week + 1, 'a week runs on a legacy save');
  await expect(Object.keys(after.songs).length === Object.keys(before.songs).length + 1, 'the legacy save can still write songs');
  await expect(typeof after.counters.release === 'number', 'the missing release counter was defaulted');

  // releasing works on the legacy save too
  await page.goto(BASE + '#/band/songs');
  await page.waitForTimeout(300);
  if ((await text()).includes('싱글로 낸다')) {
    await tapText('싱글로 낸다');
    await page.waitForTimeout(300);
    const rel = await save();
    await expect(Object.keys(rel.releases).length > Object.keys(before.releases ?? {}).length, 'a release can be made from a legacy save');
  }

  if (errors.length) throw new Error(`PAGE ERRORS:\n${errors.join('\n')}`);
  console.log('\nSAVE COMPATIBILITY PASSED');
} catch (e) {
  console.error('\nFAILED:', e.message);
  if (errors.length) console.error(errors.join('\n'));
  await page.screenshot({ path: 'compat_fail.png' });
  process.exitCode = 1;
} finally {
  await browser.close();
}
