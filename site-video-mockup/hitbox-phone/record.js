// Records the live HITBOX landing page at iPhone size (1170x2532 frames) with the stops of the reel.
// Output: frames/*.jpg + rec.json (frame timestamps, scroll log, taps, rects of every video tile per paint)
const { chromium } = require('playwright-core');
const fs = require('fs');
const URL = 'https://hitbox.co.il/hitbox-lp/';
const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
const SPEED = 470;
const CSS = '#grev-toast{display:none!important} html{scroll-behavior:auto!important}';

(async () => {
  fs.mkdirSync('frames', { recursive: true });
  for (const f of fs.readdirSync('frames')) fs.unlinkSync('frames/' + f);
  const b = await chromium.launch({ channel: 'chrome', args: ['--hide-scrollbars', '--force-device-scale-factor=3', '--autoplay-policy=no-user-gesture-required'] });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, userAgent: UA });
  await ctx.addInitScript(css => {
    addEventListener('DOMContentLoaded', () => { const s = document.createElement('style'); s.textContent = css; document.head.appendChild(s); });
    // every paint: where each video tile is, so the face blur can be clipped to it
    window.__rl = [];
    const tick = () => {
      const cells = document.querySelectorAll('.vgrid .vcell');
      if (cells.length) {
        const r = [];
        cells.forEach(c => { const b = c.getBoundingClientRect(), v = c.querySelector('video'); if (b.bottom > 0 && b.top < innerHeight && b.width > 4 && v) r.push([b.left, b.top, b.width, b.height, (v.dataset.src || '').split('/').pop().replace('.mp4', ''), v.currentTime, getComputedStyle(v).objectFit]); });
        if (r.length) window.__rl.push([Date.now() / 1000, r]);
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, CSS);
  const p = await ctx.newPage();

  // warm-up pass so every image and grid clip is cached
  await p.goto(URL, { waitUntil: 'networkidle', timeout: 90000 });
  const H = await p.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < H; y += 300) { await p.evaluate(y => scrollTo(0, y), y); await p.waitForTimeout(140); }
  await p.waitForTimeout(2500);
  await p.goto('about:blank');

  const cdp = await ctx.newCDPSession(p);
  const frames = []; let n = 0;
  cdp.on('Page.screencastFrame', f => {
    const name = `frames/${String(n++).padStart(5, '0')}.jpg`;
    fs.writeFileSync(name, Buffer.from(f.data, 'base64'));
    frames.push([name, f.metadata.timestamp]);
    cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => { });
  });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 93, maxWidth: 1170, maxHeight: 2532 });
  await p.goto(URL, { waitUntil: 'load' });
  const T0 = Date.now() / 1000;
  const now = () => Date.now() / 1000;
  const marks = { T0, taps: [], scroll: [[T0, 0]], holds: [] };

  const scrollTo = async (y, v = SPEED) => {
    const y0 = await p.evaluate(() => scrollY);
    const d = Math.abs(y - y0) / v;
    marks.scroll.push([now(), y0]);
    await p.evaluate(([y, d]) => new Promise(r => {
      const y0 = scrollY, s = performance.now();
      const ease = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      (function f() { const t = d ? Math.min(1, (performance.now() - s) / 1000 / d) : 1; window.scrollTo(0, y0 + (y - y0) * ease(t)); t < 1 ? requestAnimationFrame(f) : r(); })();
    }), [y, d]);
    marks.scroll.push([now(), y]);
  };
  const top = sel => p.evaluate(s => { const e = document.querySelector(s); return e.getBoundingClientRect().top + scrollY; }, sel);
  const rect = sel => p.evaluate(s => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return [r.left, r.top, r.width, r.height]; }, sel);
  const h2 = i => p.evaluate(i => { const e = document.querySelectorAll('h2')[i]; return e.getBoundingClientRect().top + scrollY; }, i);
  const tap = (x, y, kind) => marks.taps.push({ t: now(), x, y, kind });
  const hold = async (ms, name) => { const a = now(); await p.waitForTimeout(ms); marks.holds.push([name, a, now()]); };

  // one continuous run from the hero to the grid: no stops inside sections, slower over the timeline
  const scrollRun = async pts => {   // pts: [[y, px/s], ...] - constant speed per leg, eased only at the two ends
    const y0 = await p.evaluate(() => scrollY);
    marks.scroll.push([now(), y0]);
    const legs = []; let from = y0;
    for (const [y, v] of pts) { legs.push([from, y, Math.abs(y - from) / v]); from = y; }
    const log = await p.evaluate(legs => new Promise(r => {
      const total = legs.reduce((a, l) => a + l[2], 0); let el = 0, last = performance.now(); const out = [];
      const ramp = .35;   // seconds of ease at start and end
      // time warp so the run starts and ends softly
      const warp = u => { const T = total; let t = u * T; if (t < ramp) return (t * t / (2 * ramp)) / (T - ramp); if (t > T - ramp) { const q = T - t; return 1 - (q * q / (2 * ramp)) / (T - ramp); } return (t - ramp / 2) / (T - ramp); };
      (function f() {
        // advance by frames, not by the wall clock: if the page stalls, the scroll pauses instead of jumping
        const now = performance.now(); el += Math.min((now - last) / 1000, 1 / 40); last = now;
        const u = Math.min(1, el / (total + .35)), w = warp(u) * total;
        let acc = 0, y = legs.at(-1)[1];
        for (const [a, b, d] of legs) { if (w <= acc + d) { y = a + (b - a) * (d ? (w - acc) / d : 1); break; } acc += d; }
        window.scrollTo(0, y); out.push([Date.now() / 1000, y]);
        u < 1 ? requestAnimationFrame(f) : r(out);
      })();
    }), legs);
    marks.scroll.push(...log);
  };

  // start every testimonial clip now, so no decoder spins up (and stalls the page) mid-scroll
  await p.evaluate(() => document.querySelectorAll('.vgrid video').forEach(v => { if (!v.src) v.src = v.dataset.src; v.dataset.on = '1'; v.play().catch(() => { }); }));
  await hold(3000, 'hero');
  const tl = await p.evaluate(() => { const t = document.querySelector('.tl').getBoundingClientRect(); return [t.top + scrollY, t.height]; });
  const pinEnd0 = await p.evaluate(() => { const v = document.querySelector('.vsec').getBoundingClientRect(); return Math.round(v.top + scrollY + v.height - innerHeight); });
  marks.tlRun = { start: now() };
  await scrollRun([[await h2(1) - 120, 470], [tl[0] + tl[1] - 520, 260], [await h2(2) - 140, 470], [pinEnd0, 520]]);
  marks.tlRun.end = now();
  marks.tl = tl;

  // the testimonial grid: hold at the end of its pin while every clip bursts out
  const pinEnd = await p.evaluate(() => { const v = document.querySelector('.vsec').getBoundingClientRect(); return Math.round(v.top + scrollY + v.height - innerHeight); });
  await p.waitForTimeout(200);
  const cells = await p.evaluate(() => [...document.querySelectorAll('.vgrid .vcell')].map(c => { const r = c.getBoundingClientRect(); return { id: (c.querySelector('video').dataset.src || '').split('/').pop().replace('.mp4', ''), r: [r.left, r.top, r.width, r.height] }; }));
  marks.grid = { scrollY: pinEnd, cells, start: now() };
  await p.waitForTimeout(4000);
  marks.grid.end = now();

  // the quiz: four answers and the result card
  const quizY = await top('#quiz');
  await scrollTo(quizY, 700);
  await p.waitForTimeout(350);
  marks.quiz = { scrollY: quizY, start: now(), title: await rect('#q-title'), opts: [] };
  for (const k of [1, 1, 0, 1]) {
    const r = await p.evaluate(k => { const o = document.querySelectorAll('#q-opts .qopt')[k]; const r = o.getBoundingClientRect(); return [r.left, r.top, r.width, r.height]; }, k);
    marks.quiz.opts.push(await rect('#q-opts')); (marks.quiz.heads = marks.quiz.heads || []).push(await rect('#q-head'));
    await p.waitForTimeout(450);
    tap(r[0] + r[2] * 0.62, r[1] + r[3] / 2, 'quiz');
    await p.waitForTimeout(140);
    await p.evaluate(k => document.querySelectorAll('#q-opts .qopt')[k].click(), k);
    await p.waitForTimeout(560);
  }
  await p.waitForTimeout(300);
  marks.quiz.result = await rect('#q-result');
  marks.quiz.resultT = now();
  await p.waitForTimeout(1500);
  marks.quiz.end = now();

  // the before/after gallery: a slow swipe through it
  await scrollTo(await h2(6) - 120, 700);
  await p.waitForTimeout(250);
  const rail = await rect('#rail');
  marks.swipe = { start: now(), rect: rail };
  await p.evaluate(() => new Promise(r => {
    const el = document.getElementById('rail'); el.style.scrollSnapType = 'none';
    const s = performance.now(), d = 1.6, to = -316 * 2;
    (function f() { const t = Math.min(1, (performance.now() - s) / 1000 / d), e = t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; el.scrollLeft = to * e; t < 1 ? requestAnimationFrame(f) : r(); })();
  }));
  marks.swipe.end = now();
  await p.waitForTimeout(200);

  // the objections, three opened one after the other
  await scrollTo(await h2(7) - 110, 700);
  await p.waitForTimeout(200);
  marks.objs = { start: now(), rect: await rect('#objs') };
  for (const k of [1, 2, 4]) {
    const r = await p.evaluate(k => { const o = document.querySelectorAll('#objs .acc .q')[k]; const r = o.getBoundingClientRect(); return [r.left, r.top, r.width, r.height]; }, k);
    await p.waitForTimeout(200);
    tap(r[0] + r[2] * 0.55, r[1] + r[3] / 2, 'obj');
    await p.waitForTimeout(120);
    await p.evaluate(k => document.querySelectorAll('#objs .acc .q')[k].click(), k);
    await p.waitForTimeout(820);
  }
  marks.objs.end = now();

  // the closing form, held while the studio comes in
  marks.endStart = now();
  await p.waitForTimeout(400);
  marks.len = now() - T0;
  await cdp.send('Page.stopScreencast'); await p.waitForTimeout(300);
  marks.tiles = await p.evaluate(() => window.__rl);
  fs.writeFileSync('rec.json', JSON.stringify({ frames, marks }));
  console.log(frames.length, 'frames, len', marks.len.toFixed(1), 'tile paints', marks.tiles.length);
  await b.close();
})();
