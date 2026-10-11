// Renders scene4.html with a time remap: real time where something happens, whips over the scrolls between.
// node render4.js [t1,t2,...] (test stills) | node render4.js (full)
const { chromium } = require('playwright-core');
const fs = require('fs'), path = require('path');
const FPS = 30;
const rec = JSON.parse(fs.readFileSync('rec.json'));
const M = rec.marks, T0 = M.T0, R = a => a - T0;   // recording clock, seconds from load
const ts = rec.frames.map(f => f[1] - T0);
const Q = M.quiz, quizTaps = M.taps.filter(t => t.kind === 'quiz');
// ---------- beat grid: Vivaldi Winter Drill, 140 bpm; the 808 drop (song 6.744s) lands with the phone at 1.0s ----------
const P = 60 / 140, DROP_V = .5, SONG_OFFSET = 6.744 - DROP_V;
const B = n => DROP_V + n * P;
const qt = quizTaps.map(q => R(q.t)), ot = M.taps.filter(t => t.kind === 'obj').map(o => R(o.t));
// [recFrom, recTo, videoFrom, videoTo]; 'home' = the whip back to the hero
const segs = [
  [.6, 3.0, 0, B(4)],                          // the hero gets four beats to be read
  [3.0, R(M.grid.start) + .25, B(4), B(24)],
  [R(M.grid.start) + .25, R(M.grid.end), B(24), B(31)],
  [R(M.grid.end), R(Q.start), B(31), B(32)],
  [R(Q.start), qt[0], B(32), B(33)], [qt[0], qt[1], B(33), B(35)], [qt[1], qt[2], B(35), B(37)], [qt[2], qt[3], B(37), B(39)],
  [qt[3], R(Q.resultT) - .1, B(39), B(41) - .45],
  [R(Q.resultT) - .1, R(Q.end), B(41) - .45, B(46)],
  [R(Q.end), R(M.swipe.start), B(46), B(47)],
  [R(M.swipe.start), R(M.swipe.end), B(47), B(51)],
  [R(M.swipe.end), R(M.objs.start), B(51), B(52)],
  [R(M.objs.start), ot[0], B(52), B(53)], [ot[0], ot[1], B(53), B(55)], [ot[1], ot[2], B(55), B(57)], [ot[2], R(M.objs.end), B(57), B(59)],
  ['home', null, B(59), B(60)],
  [.4, 3.0, B(60), B(68)],
];
const LEN = B(68) + .45;
function v2r(t) {
  const s = segs.find(s => t < s[3]) || segs.at(-1), u = Math.min(1, Math.max(0, (t - s[2]) / (s[3] - s[2])));
  if (s[0] === 'home') return u < .5 ? R(M.objs.end) : .4;
  return s[0] + (s[1] - s[0]) * u;
}
function r2v(r) {
  for (const s of segs) if (s[0] !== 'home' && r >= s[0] && r <= s[1]) return s[2] + (r - s[0]) / ((s[1] - s[0]) || 1) * (s[3] - s[2]);
  return null;
}
const whips = [[B(31), B(32)], [B(46), B(47)], [B(51), B(52)], [B(59), B(60)]];

const sc = M.scroll.map(([a, y]) => [R(a), y]);
function sy(r) { let i = 0; while (i + 1 < sc.length && sc[i + 1][0] <= r) i++; const a = sc[i], b = sc[i + 1] || a; return b[0] > a[0] ? a[1] + (b[1] - a[1]) * Math.min(1, (r - a[0]) / (b[0] - a[0])) : a[1]; }
const ev = {
  introEnd: DROP_V, heroB: B(4), punches: [B(2)], T: LEN, whips,
  tlA: r2v(sc.find(s => s[1] >= M.tl[0] - 300)[0]), tlB: r2v(sc.find(s => s[1] >= M.tl[0] + M.tl[1] - 560)[0]),
  gridA: r2v(R(M.grid.start)), quizA: r2v(R(Q.start)), quizLastTap: r2v(R(quizTaps.at(-1).t)) + .14,
  resultA: B(41) - .45, wordsStep: P / 2, songOffset: SONG_OFFSET,
  // the form under the headline (the headline itself flies out as words)
  resRect: [Q.result[0] - 14, 218, Q.result[2] + 28, Q.result[1] + Q.result[3] - 218 + 16],
  // [x, y, w, h, centred x]: each line slides to the middle as it leaves the screen
  words: [[88.7, 134, 270.7, 42, 195 - 270.7 / 2], [80.3, 172, 279, 42, 195 - 279 / 2]],
};
ev.burstA = B(24);
ev.wordsA = B(41) - .35; ev.formA = B(44);

// the quiz block: the question and its answers, one fixed size, following the page between questions
const blocks = Q.heads.map((h, i) => { const o = Q.opts[i]; return [h[1] - 18, o[1] + o[3] + 18]; });
const Hq = Math.max(...blocks.map(b => b[1] - b[0]));
const qSwap = quizTaps.map(q => r2v(R(q.t) + .3));
function quizRect(t) {
  let k = qSwap.filter(x => t >= x).length; k = Math.min(k, blocks.length - 1);
  const c = b => (b[0] + b[1]) / 2;
  let cy = c(blocks[k]);
  if (k > 0) { const u = Math.min(1, (t - qSwap[k - 1]) / .25); cy = c(blocks[k - 1]) + (cy - c(blocks[k - 1])) * u; }
  return [8, cy - Hq / 2, 374, Hq];
}

// testimonial cards: three depths, like the reference - big and soft in front, sharp around the phone, small behind
//            x     y     w    z    rz   ry   rx  blur
const T = {
  F1: [-262, 560, 232, 520, -8, 14, -4, 7], F2: [296, -150, 214, 430, 7, -10, 3, 5],
  M1: [-176, 10, 150, 170, -4, 8, 0, 0], M2: [352, 290, 150, 210, 5, -8, 0, 0],
  M3: [292, 650, 150, 150, -3, -6, 0, 0], M4: [-160, 300, 140, 120, 3, 6, 0, 0],
  B1: [70, -270, 122, -280, -5, 0, 0, 3], B2: [410, 590, 122, -300, 6, 0, 0, 3],
};
const leftT = ['M1', 'M4', 'F1', 'B1'], rightT = ['F2', 'M2', 'M3', 'B2'];
const cells = M.grid.cells.slice().sort((a, b) => a.r[1] - b.r[1]);
let li = 0, ri = 0;
ev.cells = cells.map((c, i) => {
  const isL = c.r[0] < 120, key = isL ? leftT[li++] : rightT[ri++], p = T[key];
  return { id: c.id, r: c.r, delay: [0, .05, .02, .08, .04, .1, .06, .12][i], to: [p[0], p[1], p[2], p[2] * 1.55, p[3], p[4], p[5], p[6], p[7]] };
});
const paints = M.tiles, burstAbs = v2r(ev.burstA) + T0;
const pk = paints.reduce((best, p) => Math.abs(p[0] - burstAbs) < Math.abs(best[0] - burstAbs) ? p : best);
const ct0 = {}; for (const r of pk[1]) ct0[r[4]] = r[5] + (burstAbs - pk[0]);
const loops = JSON.parse(fs.readFileSync('burst/loops.json'));
const here = p => 'file://' + path.resolve(p);
const swipeV = [r2v(R(M.swipe.start)), r2v(R(M.swipe.end))];

function frame(i) {
  const t = i / FPS, r = v2r(t);
  let k = 0; while (k + 1 < ts.length && ts[k + 1] <= r) k++;
  const name = rec.frames[k][0], blurred = name.replace('frames/', 'frames_b/');
  const f = { i, t, screen: here(fs.existsSync(blurred) ? blurred : name) };
  // a hole in the screencast while the page kept scrolling: slide the frames on both sides of it
  if (k + 1 < ts.length && ts[k + 1] - ts[k] > .07 && r > ts[k]) {
    const y = sy(r), y0 = sy(ts[k]), y1 = sy(ts[k + 1]);
    const pinned = v => v >= 3842 && v <= 4838;
    if (Math.abs(y1 - y0) > 2 && !pinned(y) && !pinned(y0) && !pinned(y1)) {
      const n2 = rec.frames[k + 1][0], b2 = n2.replace('frames/', 'frames_b/');
      Object.assign(f, { shift: y - y0, next: here(fs.existsSync(b2) ? b2 : n2), nextShift: y - y1 });
    }
  }
  const tp = M.taps.map(p => ({ ...p, t: r2v(R(p.t)) })).find(p => t >= p.t - .25 && t <= p.t + .4);
  if (tp) f.tap = tp;
  if (t >= swipeV[0] - .2 && t <= swipeV[1] + .2) f.tap = { kind: 'swipe', a: swipeV[0], b: swipeV[1], x0: 80, x1: 310, y: M.swipe.rect[1] + M.swipe.rect[3] / 2 };
  f.quiz = quizRect(t);
  if (t >= ev.burstA - .1 && t <= whips[0][1])
    f.cards = ev.cells.map(c => { const L = loops[c.id]; const n = (Math.floor(((ct0[c.id] || 0) + Math.max(0, v2r(t) - v2r(ev.burstA))) * FPS) % L.n) + 1; return here(`burst/${c.id}/${String(n).padStart(4, '0')}.jpg`); });
  return f;
}

(async () => {
  const b = await chromium.launch({ channel: 'chrome', args: ['--allow-file-access-from-files'] });
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  await p.goto(here('scene5.html'));
  await p.evaluate(d => init(d), { ev });
  const tests = process.argv[2] ? process.argv[2].split(',').map(Number) : null;
  const list = tests ? tests.map(t => Math.round(t * FPS)) : [...Array(Math.round(LEN * FPS)).keys()];
  const out = tests ? 'test5' : 'out5'; fs.mkdirSync(out, { recursive: true });
  for (const i of list) {
    await p.evaluate(f => draw(f), frame(i));
    await p.screenshot({ path: `${out}/${tests ? 't' + (i / FPS).toFixed(2) : String(i).padStart(4, '0')}.jpg`, type: 'jpeg', quality: 94 });
  }
  fs.writeFileSync('ev5.json', JSON.stringify({ ...ev, taps: M.taps.map(p => r2v(R(p.t))) }));
  console.log('LEN', LEN.toFixed(2), JSON.stringify({ ...ev, cells: undefined }));
  await b.close();
})();
