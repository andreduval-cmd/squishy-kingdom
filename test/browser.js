import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { createGameServer } from '../server/index.js';
const game = createGameServer();
await new Promise(resolve => game.server.listen(0, '127.0.0.1', resolve));
const base = process.env.TEST_BASE_URL || `http://127.0.0.1:${game.server.address().port}`;
const browser = await chromium.launch({ headless: true, channel: process.env.BROWSER_CHANNEL || undefined, args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--enable-webgl','--ignore-gpu-blocklist'] });
const errors = [];
let pages=[];
try {
  const contexts = await Promise.all([0, 1].map(() => browser.newContext({ viewport: { width: 1280, height: 900 } })));
  for (const context of contexts) { context.setDefaultTimeout(45000); await context.addInitScript(() => { localStorage.sqTut = '1'; }); }
  const a = await contexts[0].newPage(), b = await contexts[1].newPage();
  pages=[a,b];
  for (const page of [a, b]) {
    page.on('pageerror', error => { errors.push(error.message); console.error('Browser error:',error.message); });
    page.on('console', message => { if(message.type()==='warning' && message.text().includes('3D renderer unavailable')) console.warn(message.text()); });
    await page.goto(base); await page.waitForFunction(() => typeof ONLINE !== 'undefined');
    if (page === a) {
      await page.screenshot({ path: 'test-results/title-desktop.png', fullPage: true });
      await page.setViewportSize({ width:390, height:844 });
      await page.screenshot({ path:'test-results/title-mobile.png', fullPage:true });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      await page.setViewportSize({ width:1280, height:900 });
    }
    await page.evaluate(() => { looked = 1; ld = dayN(); hg = HD?.key || 0; showSrv(); });
  }
  // Browser QA stays in an isolated invite room, including against the live host.
  await a.locator('#online-name').fill('Alice'); await a.evaluate(() => enter('priv'));
  await a.waitForFunction(() => ONLINE.connected && ONLINE.code);
  const initialRoom = await a.evaluate(() => ONLINE.code);
  await b.locator('#online-name').fill('Bob'); await b.evaluate(code => enter('priv',code),initialRoom);
  await a.waitForFunction(() => LB.p.some(p => p.label === 'Bob'));
  await b.waitForFunction(() => LB.p.some(p => p.label === 'Alice'));
  console.log('Room connected; initializing 3D rendering.');
  for(const page of [a,b]) { await page.bringToFront(); await page.waitForFunction(() => window.Squishy3D?.ready && Squishy3D.diagnostics.frame > 2); }
  await a.bringToFront();
  console.log('3D rendering ready in both browsers.');
  const projection = await a.evaluate(() => { const point=Squishy3D.project(WS.p.x,WS.p.y);const back=Squishy3D.unproject(point.x,point.y);return Math.hypot(back.x-WS.p.x,back.y-WS.p.y); });
  assert.ok(projection < .01, '3D ground hit testing matches world coordinates');
  const zoom = await a.evaluate(() => Squishy3D.diagnostics.zoom);
  await a.locator('#world-zoom-in').click(); assert.ok((await a.evaluate(() => Squishy3D.diagnostics.zoom)) > zoom);
  await a.locator('#world-zoom-out').click();
  const squeeze = a.locator('#plush-squeeze'); const rect = await squeeze.boundingBox();
  await a.mouse.move(rect.x+rect.width/2,rect.y+rect.height/2); await a.mouse.down();
  await a.waitForFunction(() => Squishy3D.diagnostics.localSquash > .12);
  await b.waitForFunction(() => LB.p.some(p => p.label === 'Alice' && p.squish));
  await a.mouse.up(); await a.waitForFunction(() => Math.abs(Squishy3D.diagnostics.localSquash) < .035);
  await a.evaluate(() => { WS.p.x=400; WS.p.y=450; WS.vx=WS.vy=0; });
  await a.keyboard.down('ArrowUp'); await a.waitForFunction(() => WS.p.y < 447); await a.keyboard.up('ArrowUp');
  assert.ok(await a.evaluate(() => WS.p.y >= 444), '3D building collision follows existing world geometry');
  await a.waitForFunction(() => WS.near?.n.includes('League'));
  await a.locator('#wgo').click(); await a.waitForFunction(() => tab === 'hall');
  await a.evaluate(() => setTab('world'));
  await a.evaluate(() => { WS.p.x = 450; av.c = 14; });
  await b.waitForFunction(() => LB.p.some(p => p.label === 'Alice' && p.tx === 450 && p.c === 14));
  await a.evaluate(() => setTab('home'));
  assert.equal(await a.locator('#world').isVisible(), false);
  await a.screenshot({ path:'test-results/collection-desktop.png', fullPage:true });
  await b.waitForFunction(() => LB.p.find(p => p.label === 'Alice')?.scene === 'inside');
  await a.evaluate(() => setTab('world'));
  await b.waitForFunction(() => LB.p.find(p => p.label === 'Alice')?.scene === 'world');
  // Daily reward can open after entering; close it before testing ordinary UI input.
  await a.evaluate(() => { clearTimeout(daily); closeModal(); });
  await a.locator('#online-message').fill('<img src=x onerror=alert(1)>');
  await a.locator('#online-form button').click();
  await b.locator('#online-log').getByText('Alice: <img src=x onerror=alert(1)>', { exact: true }).waitFor();
  assert.equal(await b.locator('#online-log img').count(), 0);
  await a.evaluate(() => { saveNow(); });
  const save = await a.evaluate(() => localStorage.sqSave); assert.ok(save);
  await a.evaluate(() => { ONLINE.socket.close(); });
  await a.waitForFunction(() => ONLINE.connected && LB.p.some(p => p.label === 'Bob'));
  await b.evaluate(() => enter('solo'));
  await a.waitForFunction(() => LB.p.length === 0);
  assert.equal(await b.locator('.online-panel').isVisible(), false);
  // Private invite round trip through real UI.
  await a.evaluate(() => enter('priv'));
  await a.waitForFunction(() => ONLINE.connected && ONLINE.code);
  const code = await a.evaluate(() => ONLINE.code);
  await b.evaluate(() => showSrv()); await b.locator('#online-code').fill(code); await b.getByRole('button', { name: 'Join room code', exact: true }).click();
  await b.waitForFunction(() => ONLINE.connected && LB.p.length === 1);
  await a.waitForFunction(() => LB.p.length === 1);
  // Mobile layout and save reload.
  await b.bringToFront();
  await b.setViewportSize({ width: 390, height: 844 });
  await b.screenshot({ path: 'test-results/mobile.png', fullPage: true });
  assert.equal(await b.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  await a.bringToFront(); await a.screenshot({ path: 'test-results/multiplayer.png', fullPage: true });
  console.log('3D interactions passed; checking saved progress in a fresh browser session.');
  const restored = await browser.newContext({ storageState: await contexts[0].storageState() });
  restored.setDefaultTimeout(45000);
  const restoredPage = await restored.newPage(); await restoredPage.goto(base);
  await restoredPage.waitForFunction(() => typeof ONLINE !== 'undefined');
  assert.ok((await restoredPage.locator('#go').textContent()).includes('Continue'));
  assert.deepEqual(errors, []);
  console.log('PASS: independent browsers: 3D rendering, soft squish synchronization, collision/doors, presence, movement, avatars, scenes, safe chat, reconnect, solo, invites, mobile, save reload.');
} catch(error) {
  console.error(error.stack || error);
  for(let i=0;i<pages.length;i++) { try { await pages[i].screenshot({path:`test-results/failure-${i}.png`,timeout:10000}); } catch {} }
  throw error;
} finally { await browser.close(); await game.close(); }
