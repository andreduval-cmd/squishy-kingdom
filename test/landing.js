import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { createGameServer } from '../server/index.js';
const game=createGameServer();await new Promise(resolve=>game.server.listen(0,'127.0.0.1',resolve));
const base=process.env.TEST_BASE_URL||`http://127.0.0.1:${game.server.address().port}`;
const browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL||undefined,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const errors=[];let page;
try {
  const context=await browser.newContext({viewport:{width:1440,height:960}});context.setDefaultTimeout(30000);
  page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(base);await page.bringToFront();
  await page.waitForFunction(()=>window.KingdomLanding?.live3D&&KingdomLanding.diagnostics.frames>1);
  assert.equal(await page.locator('h1').first().innerText(),'Small world.\nBig soft spot.');
  await page.screenshot({path:'test-results/landing-desktop.png'});
  const travel=await page.evaluate(()=>document.getElementById('lp-story').offsetHeight-document.getElementById('lp-visual').offsetHeight);
  await page.mouse.move(1100,550);await page.mouse.wheel(0,travel*.51);await page.waitForFunction(()=>KingdomLanding.activeChapter===1);
  await page.locator('#lp-squish-demo').click();await page.waitForFunction(()=>KingdomLanding.diagnostics.squash>.08);
  await page.screenshot({path:'test-results/landing-discover.png'});
  await page.mouse.move(1100,550);await page.mouse.wheel(0,travel*.38);await page.waitForFunction(()=>KingdomLanding.activeChapter===2);
  await page.screenshot({path:'test-results/landing-together.png'});
  await page.mouse.wheel(0,-travel*.6);await page.waitForFunction(()=>KingdomLanding.activeChapter===-1);
  await page.locator('.lp-skip').click();await page.waitForFunction(()=>document.getElementById('lp-features').getBoundingClientRect().top<150);
  assert.ok(await page.locator('.lp-nav').evaluate(el=>Math.abs(el.getBoundingClientRect().top)<2));
  await page.screenshot({path:'test-results/landing-features.png'});
  await page.setViewportSize({width:390,height:844});await page.evaluate(()=>document.getElementById('start').scrollTo({top:0,behavior:'instant'}));
  await page.waitForFunction(()=>KingdomLanding.activeChapter===0);await page.waitForFunction(()=>getComputedStyle(document.getElementById('lp-opening')).opacity==='1');await page.screenshot({path:'test-results/landing-mobile.png'});
  assert.equal(await page.evaluate(()=>document.getElementById('start').scrollWidth>innerWidth),false);
  await page.locator('#lp-menu-open').click();assert.equal(await page.locator('#lp-menu').evaluate(el=>el.open),true);
  assert.equal(await page.locator('#lp-menu').evaluate(el=>el.contains(document.activeElement)),true);
  await page.keyboard.press('Escape');assert.equal(await page.locator('#lp-menu').evaluate(el=>el.open),false);
  await page.locator('#lp-menu-open').click();await page.locator('#lp-menu a[href="#lp-play"]').click();
  await page.waitForFunction(()=>!document.getElementById('lp-menu').open&&document.getElementById('lp-play').getBoundingClientRect().top<150);
  assert.ok(await page.locator('.lp-nav').evaluate(el=>Math.abs(el.getBoundingClientRect().top)<2));
  await page.screenshot({path:'test-results/landing-mobile-play.png'});
  await page.evaluate(()=>{looked=1;ld=dayN();hg=HD?.key||0;});
  await page.locator('.lp-nav [data-lp-launch]').click();await page.locator('#online-name').waitFor();
  await page.getByRole('button',{name:/Play solo/}).click();await page.waitForFunction(()=>document.getElementById('start').hidden);
  assert.equal(await page.evaluate(()=>KingdomLanding.live3D),false);
  await page.waitForFunction(()=>Squishy3D.ready);await context.close();
  // A reduced-motion visitor gets a still composition and ordinary content flow.
  const reduced=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});reduced.setDefaultTimeout(30000);
  const still=await reduced.newPage();await still.goto(base);await still.bringToFront();await still.waitForFunction(()=>window.KingdomLanding?.live3D&&KingdomLanding.diagnostics.frames>0);
  assert.ok(await still.locator('#lp-story').evaluate(el=>el.offsetHeight<innerHeight*1.3));
  await still.screenshot({path:'test-results/landing-reduced-motion.png'});
  await reduced.close();
  // If WebGL is unavailable, the authored illustration and semantic actions remain.
  const fallback=await browser.newContext({viewport:{width:390,height:844}});fallback.setDefaultTimeout(30000);
  await fallback.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(kind,...args){if(this.id==='landing-3d'&&kind.includes('webgl'))return null;return original.call(this,kind,...args);};});
  const safe=await fallback.newPage();await safe.goto(base);await safe.waitForFunction(()=>typeof KingdomLanding!=='undefined');
  assert.equal(await safe.evaluate(()=>KingdomLanding.live3D),false);assert.equal(await safe.locator('#lp-visual').evaluate(el=>el.classList.contains('has-live-scene')),false);
  assert.equal(await safe.locator('#go').isVisible(),true);await safe.screenshot({path:'test-results/landing-fallback.png'});
  assert.deepEqual(errors,[]);
  console.log('PASS: landing scroll chapters/reverse pacing, interactive squish, desktop/mobile navigation, menu focus/Escape, launch into 3D game, reduced motion, WebGL fallback.');
}catch(error){console.error(error.stack||error);try{await page?.screenshot({path:'test-results/landing-failure.png',timeout:10000});}catch{}throw error;}
finally{await browser.close();await game.close();}
