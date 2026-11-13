/* the process section: five pictures made of particles on a sticky stage, the steps scroll past at the page's own pace.
   ported from _process-launch.html (option s, sides swapping every second step). it only starts once the section is near. */
import * as THREE from 'three';

const sec = document.getElementById('process');
const stick = sec.querySelector('.pc-stick'), canvas = sec.querySelector('.pc-gl'), lightEl = sec.querySelector('.pc-light');
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const MQ = matchMedia('(max-width:860px)');
let PHONE = MQ.matches;

/* object box on the 1440 x 903 figma frame [x, y, size] and the light ellipse [x, y, w, h, rgb] */
const STEPS = [
  { box: [-23, -49, 1001], light: [43, -157, 935, 359, [255, 240, 231]] },
  { box: [-136, -22, 1235], light: [43, -157, 935, 359, [250, 145, 84]] },
  { box: [23, -2, 922], light: [-127, -157, 774, 634, [250, 145, 84]] },
  { box: [-24, -35, 935], light: [377, -169, 774, 634, [255, 244, 238]] },
  { box: [-610, 32, 1532], light: [377, -169, 774, 634, [224, 120, 60]] }
];
/* every second step swaps sides: the object on the right, the copy on the left */
STEPS.forEach((st, i) => { if (i % 2) { const [x, y, z] = st.box; st.box = [1440 - x - z, y, z]; const l = st.light; st.light = [1440 - l[0] - l[2], l[1], l[2], l[3], l[4]]; } });
/* on a phone the copy runs full width under the object, so every object sits centred in the upper part */
const WIDE = STEPS.map(st => ({ box: st.box.slice(), light: st.light.slice() }));
/* the layout follows the window: a phone width (or a desktop window made narrow) gets the phone boxes, and back again */
function placeSteps(){ STEPS.forEach((st, i) => { if (PHONE) { st.box = [720 - 560, -60, 1120]; st.light = [253, -157, 935, 359, WIDE[i].light[4]]; } else { st.box = WIDE[i].box.slice(); st.light = WIDE[i].light.slice(); } }); }
placeSteps();
const N = STEPS.length;
let shown = 0, target = 0;

let S = 1, OX = 0, OY = 0, W = 0, H = 0;
function layout(){
  W = stick.clientWidth; H = stick.clientHeight;
  S = Math.min(W / 1440, H / 903) * (PHONE ? 1 : 1);
  OX = (W - 1440 * S) / 2; OY = (H - 903 * S) / 2;
}

/* the light: a huge soft ellipse per step, eased from one to the next, breathing a little */
let Lt = STEPS[0].light; const L = { x: Lt[0], y: Lt[1], w: Lt[2], h: Lt[3], c: Lt[4].slice() };
function drawLight(t){
  const k = .035; L.x += (Lt[0] - L.x) * k; L.y += (Lt[1] - L.y) * k; L.w += (Lt[2] - L.w) * k; L.h += (Lt[3] - L.h) * k; L.c = L.c.map((v, i) => v + (Lt[4][i] - v) * k);
  const bx = Math.sin(t * .00023) * 40, by = Math.cos(t * .00031) * 24, bs = 1 + Math.sin(t * .00041) * .06;
  const cx = OX + (L.x + L.w / 2 + bx) * S, cy = OY + (L.y + L.h / 2 + by) * S;
  const rx = (L.w * .5 + 700) * S * bs, ry = (L.h * .5 + 620) * S * bs, c = L.c.map(Math.round).join(',');
  lightEl.style.background = 'radial-gradient(' + rx + 'px ' + ry + 'px at ' + cx + 'px ' + cy + 'px, rgba(' + c + ',.34) 0%, rgba(' + c + ',.17) 32%, rgba(' + c + ',.06) 62%, rgba(' + c + ',0) 100%)';
}

const DPR = Math.min(2, devicePixelRatio || 1);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true });
renderer.setPixelRatio(DPR); renderer.setClearColor(0, 0);
const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(0, 1, 0, 1, -4000, 4000);
const imgs = await Promise.all(STEPS.map((_, i) => new Promise(res => { const im = new Image(); im.onload = () => res(im); im.src = 'assets/process-launch/web/step-' + (i + 1) + '.webp'; })));
const texs = imgs.map(im => { const t = new THREE.Texture(im); t.flipY = false; t.generateMipmaps = false; t.minFilter = t.magFilter = THREE.LinearFilter; t.colorSpace = THREE.NoColorSpace; t.needsUpdate = true; return t; });

/* each particle carries its own square of the picture: at rest they tile edge to edge and are the picture, in motion they fly and glow */
let CELL = 4, grids = [], COUNT = 0;
function gridOf(img, box){
  const [bx, by, bs] = box;
  const dx0 = Math.round((OX + bx * S) * DPR), dy0 = Math.round((OY + by * S) * DPR), dsz = Math.round(bs * S * DPR);
  const n = Math.floor(dsz / CELL), cv = document.createElement('canvas'); cv.width = cv.height = n;
  const c = cv.getContext('2d'); c.drawImage(img, 0, 0, n, n);
  const d = c.getImageData(0, 0, n, n).data, out = [];
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { const i = (y * n + x) * 4, l = Math.max(d[i], d[i + 1], d[i + 2]) / 255; if (l < (PHONE ? .06 : .035)) continue;
    const px = (dx0 + (x + .5) * CELL) / DPR, py = (dy0 + (y + .5) * CELL) / DPR; if (px < -8 || py < -8 || px > W + 8 || py > H + 8) continue;
    /* on a phone the picture's square edge melts away, so dust that runs to the edge of the source never shows a straight cut */
    const ed = Math.min(x, y, n - 1 - x, n - 1 - y) / n, fd = PHONE ? Math.min(1, ed / .14) : 1;
    out.push([px, py, (x + .5) / n, (y + .5) / n, fd * fd * (3 - 2 * fd)]); }
  for (let i = out.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [out[i], out[j]] = [out[j], out[i]]; }
  return { cells: out, cuv: 1 / n };
}
const geo = new THREE.BufferGeometry();
const uni = { uT: { value: 1 }, uMode: { value: 0 }, uTime: { value: 0 }, uMouse: { value: new THREE.Vector3(-9999, -9999, 0) }, uCell: { value: 4 }, uK: { value: 1 }, uLoose: { value: 1 },
  uC: { value: new THREE.Vector2() }, texA: { value: texs[0] }, texB: { value: texs[0] }, cuvA: { value: 0 }, cuvB: { value: 0 } };
const mat = new THREE.ShaderMaterial({ uniforms: uni, transparent: true, depthWrite: false, depthTest: false, blending: THREE.CustomBlending,
  blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor, blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneFactor,
  vertexShader: `
    attribute vec3 posB; attribute vec4 uvA; attribute vec4 uvB; attribute float seed;
    uniform float uT, uMode, uTime, uCell, uK, uLoose; uniform vec3 uMouse; uniform vec2 uC; uniform sampler2D texA, texB;
    varying vec2 vUvA, vUvB; varying float vMix, vRound, vVisA, vVisB, vGlow;
    float ease(float t){ return t < .5 ? 4.*t*t*t : 1. - pow(-2.*t + 2., 3.) / 2.; }
    vec2 rot(vec2 p, vec2 c, float a){ p -= c; return c + vec2(p.x*cos(a) - p.y*sin(a), p.x*sin(a) + p.y*cos(a)); }
    void main(){
      float k = clamp((uT - seed * .28) / .72, 0., 1.);
      vec3 a = position, b = posB, p;
      float h = fract(seed * 91.7), g = fract(seed * 47.3), K = uK;
      vec2 C = uC;
      if (uMode < .5) {
        float q1 = smoothstep(0., .35, k);
        vec3 soft = vec3(C + (a.xy - C) * (1. - .16 * q1), 0.) + vec3(sin(seed * 71.), cos(seed * 53.), 0.) * 22. * K * q1;
        float q2 = smoothstep(.22, .62, k + h * .08);
        vec3 gone = soft + vec3(q2 * q2 * (900. + h * 1300.), (g - .5) * q2 * 420., 0.) * K;
        float q3 = smoothstep(.5, 1., k);
        vec3 come = mix(b + vec3(700. + h * 1200., (g - .5) * 520., 0.) * K, b, 1. - pow(1. - q3, 3.));
        p = k < .55 ? gone : mix(gone, come, smoothstep(.5, .62, k));
      } else {
        vec2 dir = normalize(a.xy - C + vec2(.01));
        vec3 far = vec3(C + dir * (700. + h * 600.) * K, 0.);
        p = k < .5 ? mix(a, far, ease(k * 2.)) : mix(far, b, ease((k - .5) * 2.));
      }
      float mid = 1. - abs(k - .5) * 2.;
      float moving = smoothstep(0., .12, k) * (1. - smoothstep(.88, 1., k));
      vec2 dm = p.xy - uMouse.xy; float dist = length(dm), R = 140. * K, f = 0.;
      if (dist < R) { f = pow(1. - dist / R, 2.) * uMouse.z; p.xy += normalize(dm + vec2(.001)) * f * 60. * K + vec2(sin(uTime * 3. + seed * 40.), cos(uTime * 2.6 + seed * 30.)) * f * 6. * K; }
      p.xy += vec2(sin(uTime * .7 + seed * 50.), cos(uTime * .6 + seed * 40.)) * 1.2 * K * moving;
      /* the slow breathing scale and tilt open seams between the tiles on a small screen, so a phone keeps the picture still */
      float fs = 1. + .035 * sin(uTime * .42) * uLoose, fa = (.006 * sin(uTime * .21) + .002 * sin(uTime * .53)) * uLoose;
      p.xy = C + rot(p.xy - C, vec2(0.), fa) * fs + vec2(sin(uTime * .31) * 10., sin(uTime * .47) * 14.) * K;
      vec3 tc = mix(texture2D(texA, uvA.xy).rgb, texture2D(texB, uvB.xy).rgb, step(.5, k));
      float lum = max(tc.r, max(tc.g, tc.b));
      float loose = (1. - smoothstep(.12, .4, lum)) * (.35 + h * .65) * uLoose;
      p.xy += vec2(sin(uTime * (.5 + g) + seed * 60.), cos(uTime * (.45 + h) + seed * 70.)) * loose * 9. * K;
      vUvA = uvA.xy; vUvB = uvB.xy; vVisA = uvA.z; vVisB = uvB.z;
      vMix = smoothstep(.35, .65, k);
      vRound = max(max(moving, smoothstep(0., .25, f)), smoothstep(.3, .8, loose));
      vGlow = vRound;
      gl_Position = projectionMatrix * vec4(p.xy, 0., 1.);
      gl_PointSize = uCell * fs * (1. + vRound * (.35 + mid * .6));
    }`,
  fragmentShader: `
    uniform sampler2D texA, texB; uniform float cuvA, cuvB;
    varying vec2 vUvA, vUvB; varying float vMix, vRound, vVisA, vVisB, vGlow;
    void main(){
      vec2 pc = gl_PointCoord - .5;
      vec2 off = pc * (1. - vRound);
      vec4 ca = texture2D(texA, vUvA + off * cuvA) * vVisA;
      vec4 cb = texture2D(texB, vUvB + off * cuvB) * vVisB;
      vec3 c = mix(ca.rgb, cb.rgb, vMix);
      float r = length(pc), shape = mix(1., smoothstep(.5, .1, r), vRound);
      if (shape < .01) discard;
      vec3 o = c * (1. + vGlow * .15) * shape;
      gl_FragColor = vec4(o, max(o.r, max(o.g, o.b)));
    }`
});
scene.add(new THREE.Points(geo, mat));
let pair = [0, 0];
const MAXP = PHONE ? 150000 : 240000;
function build(){
  CELL = Math.max(2, Math.round(2 * S * DPR));
  grids = imgs.map((im, i) => gridOf(im, STEPS[i].box));
  while (Math.max(...grids.map(g => g.cells.length)) > MAXP) { CELL++; grids = imgs.map((im, i) => gridOf(im, STEPS[i].box)); }
  COUNT = Math.max(...grids.map(g => g.cells.length));
  ['position', 'posB'].forEach(k => geo.setAttribute(k, new THREE.BufferAttribute(new Float32Array(COUNT * 3), 3)));
  ['uvA', 'uvB'].forEach(k => geo.setAttribute(k, new THREE.BufferAttribute(new Float32Array(COUNT * 4), 4)));
  const sd = new Float32Array(COUNT); for (let i = 0; i < COUNT; i++) sd[i] = Math.random(); geo.setAttribute('seed', new THREE.BufferAttribute(sd, 1));
  uni.uCell.value = CELL; uni.uK.value = S; uni.uLoose.value = PHONE ? 0 : 1;
  if (PHONE) uni.uC.value.set(W / 2, H * PCY); else uni.uC.value.set(OX + 720 * S, OY + 470 * S);
  setPair(pair[0], pair[1]);
}
function fill(attrPos, attrUv, g){
  const P = attrPos.array, U = attrUv.array, c = g.cells, n = c.length;
  for (let i = 0; i < COUNT; i++) { const e = c[i % n], vis = i < n ? e[4] : 0; P[i * 3] = e[0]; P[i * 3 + 1] = e[1]; P[i * 3 + 2] = 0; U[i * 4] = e[2]; U[i * 4 + 1] = e[3]; U[i * 4 + 2] = vis; }
  attrPos.needsUpdate = attrUv.needsUpdate = true;
}
function setPair(a, b){
  pair = [a, b];
  fill(geo.getAttribute('position'), geo.getAttribute('uvA'), grids[a]); fill(geo.getAttribute('posB'), geo.getAttribute('uvB'), grids[b]);
  uni.texA.value = texs[a]; uni.texB.value = texs[b]; uni.cuvA.value = grids[a].cuv; uni.cuvB.value = grids[b].cuv;
}

/* star dust over the whole stage, always turning round the middle like an atmosphere, swirling faster while an object changes */
const SN = PHONE ? 7000 : 16000, sg = new THREE.BufferGeometry(), sp = new Float32Array(SN * 3), sc = new Float32Array(SN * 3), ss = new Float32Array(SN);
const PAL = [[1, .96, .93], [.80, .86, .95], [.98, .62, .38]];
for (let i = 0; i < SN; i++) { const a = Math.random() * Math.PI * 2, rr = Math.sqrt(Math.random()); sp[i * 3] = Math.cos(a) * rr; sp[i * 3 + 1] = Math.sin(a) * rr; sp[i * 3 + 2] = Math.pow(Math.random(), 2.2);
  const r = Math.random(), c = r < .45 ? PAL[0] : r < .7 ? PAL[1] : PAL[2]; sc.set(c, i * 3); ss[i] = Math.random(); }
sg.setAttribute('position', new THREE.BufferAttribute(sp, 3)); sg.setAttribute('col', new THREE.BufferAttribute(sc, 3)); sg.setAttribute('seed', new THREE.BufferAttribute(ss, 1));
const suni = { uTime: { value: 0 }, uSize: { value: new THREE.Vector2(1, 1) }, uPx: { value: DPR }, uPar: { value: new THREE.Vector2() }, uAng: { value: 0 } };
const stars = new THREE.Points(sg, new THREE.ShaderMaterial({ uniforms: suni, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
  vertexShader: `attribute vec3 col; attribute float seed; uniform float uTime, uPx, uAng; uniform vec2 uSize, uPar; varying vec3 vC; varying float vA, vSoft;
    void main(){ float z = position.z;
      float R = length(uSize) * .62, ang = uAng * (1. + z * 1.2);
      vec2 q = position.xy * R; q = vec2(q.x * cos(ang) - q.y * sin(ang), q.x * sin(ang) + q.y * cos(ang));
      q += vec2(sin(uTime * .3 + seed * 40.), cos(uTime * .27 + seed * 30.)) * (3. + z * 8.);
      vec2 p = uSize * .5 + q + uPar * (.1 + z * z * 1.2);
      float tw = .7 + .3 * sin(uTime * (.4 + seed * 1.2) + seed * 80.);
      bool bokeh = seed > .992;
      vSoft = bokeh ? 1. : 0.;
      vC = col; vA = (bokeh ? .12 : (.4 + z * .6)) * tw;
      gl_Position = projectionMatrix * vec4(p, 0., 1.);
      gl_PointSize = (bokeh ? 8. + z * 12. : 1.1 + z * 2.6) * uPx; }`,
  fragmentShader: `varying vec3 vC; varying float vA, vSoft; void main(){ float r = length(gl_PointCoord - .5); if (r > .5) discard;
    float a = mix(smoothstep(.5, .1, r), smoothstep(.5, 0., r) * .8, vSoft); gl_FragColor = vec4(vC, a * vA); }` }));
stars.renderOrder = -1; scene.add(stars);

/* the lit part of every picture, so on a phone the object itself (not its empty square) is sized to the screen */
const BB = imgs.map(im => { const n = 160, cv = document.createElement('canvas'); cv.width = cv.height = n; const c = cv.getContext('2d'); c.drawImage(im, 0, 0, n, n);
  const d = c.getImageData(0, 0, n, n).data; let x0 = n, y0 = n, x1 = 0, y1 = 0;
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { const i = (y * n + x) * 4; if (Math.max(d[i], d[i + 1], d[i + 2]) > 70) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; } }
  return [x0 / n, y0 / n, (x1 + 1) / n, (y1 + 1) / n]; });
const PCY = .35;
/* the rocket sized by its own body (from the source picture), not by its fire, so the ship sits big in the middle and the fire runs off the screen */
const ROCKET = [.5, .09, .89, .5];
function placePhone(){
  /* each object fits a band between the header and the copy: the satellite starts under the section title */
  const B = H * .62;
  STEPS.forEach((st, i) => { let x0, y0, x1, y1, size, cy;
    if (i === 4) { [x0, y0, x1, y1] = ROCKET; size = W * .64 / (x1 - x0); cy = (104 + B) / 2; }
    else { [x0, y0, x1, y1] = BB[i]; const T = i === 0 ? 192 : 104; size = Math.min(W * (i === 0 ? .94 : 1.06) / (x1 - x0), (B - T) / (y1 - y0)); cy = (T + B) / 2; }
    const cx = W / 2, left = cx - (x0 + x1) / 2 * size, top = cy - (y0 + y1) / 2 * size;
    st.box = [(left - OX) / S, (top - OY) / S, size / S];
    st.light = [(cx - OX) / S - 467, (cy - OY) / S - 180, 935, 359, WIDE[i].light[4]]; });
  Lt = STEPS[target].light;
}
function resize(){
  if (MQ.matches !== PHONE) { PHONE = MQ.matches; placeSteps(); }
  layout();
  if (PHONE) placePhone();
  renderer.setSize(W, H, false);
  camera.left = 0; camera.right = W; camera.top = 0; camera.bottom = H; camera.updateProjectionMatrix();
  suni.uSize.value.set(W, H);
  build();
}
let rT; addEventListener('resize', () => { clearTimeout(rT); rT = setTimeout(resize, 150); });
resize();

let mx = -9999, my = -9999, mStr = 0, mIn = false, pmx = 0;
stick.addEventListener('pointermove', e => { const r = stick.getBoundingClientRect(); mx = e.clientX - r.left; my = e.clientY - r.top; mIn = true; pmx = e.clientX / innerWidth - .5; });
stick.addEventListener('pointerleave', () => mIn = false);
const smouse = { x: -9999, y: -9999 };

/* the step nearest the middle of the screen drives the visual; the swap plays out on its own clock */
const steps = [...sec.querySelectorAll('.pc-step')], head = sec.querySelector('.pc-head');
let start = -1, from = 0, spin = 0, last = 0, running = false;
const DUR = 900;
function go(step, now){
  if (start >= 0) { shown = target; start = -1; }
  from = shown; target = step; setPair(from, target);
  uni.uMode.value = [0, 1, 0, 1][Math.min(from, target)]; uni.uT.value = 0; start = now;
  Lt = STEPS[target].light;
}
/* copy is sharp in the middle of the screen and blurs as it rises or while it waits below */
const fog = (el, d) => { const t = clamp((Math.abs(d) - .2 * innerHeight) / (.25 * innerHeight)), e = t * t * (3 - 2 * t); el.style.filter = e > .01 ? 'blur(' + (e * 8).toFixed(1) + 'px)' : 'none'; el.style.opacity = (1 - e * .75).toFixed(3); };
const veil = (el, e) => { el.style.filter = e > .01 ? 'blur(' + (e * 10).toFixed(1) + 'px)' : 'none'; el.style.opacity = (1 - e).toFixed(3); };
function frame(now){
  if (!running) return;
  const mid = innerHeight / 2; let best = 0, bd = 1e9;
  if (PHONE) {
    const H0 = innerHeight, line = H0 * .64;
    steps.forEach((el, i) => { const a = el.getBoundingClientRect().top - line; if (Math.abs(a) < bd) { bd = Math.abs(a); best = i; }
      const e = a < 0 ? clamp(-a / (H0 * .26)) : clamp((a - H0 * .14) / (H0 * .2)); veil(el, e * e * (3 - 2 * e)); });
    { const t = clamp(-head.getBoundingClientRect().top / (H0 * .18)); veil(head, t * t * (3 - 2 * t)); }
  } else {
  steps.forEach((el, i) => { const r = el.getBoundingClientRect(), d = r.top + r.height / 2 - mid; if (Math.abs(d) < bd) { bd = Math.abs(d); best = i; } fog(el, d); });
  { const r = head.getBoundingClientRect(); fog(head, (r.bottom - .4 * innerHeight) * 1.6); }
  }
  if (best !== target && start < 0) go(best, now);
  if (start >= 0) { const k = clamp((now - start) / DUR); uni.uT.value = k; if (k >= 1) { shown = target; start = -1; setPair(shown, shown); uni.uT.value = 1; } }
  uni.uTime.value = suni.uTime.value = now / 1000;
  mStr += ((mIn ? 1 : 0) - mStr) * .08; smouse.x += (mx - smouse.x) * .25; smouse.y += (my - smouse.y) * .25;
  uni.uMouse.value.set(smouse.x, smouse.y, mStr);
  suni.uPar.value.set(pmx * -40, sec.getBoundingClientRect().top * .35);
  const dt = Math.min(.05, (now - (last || now)) / 1000); last = now;
  spin += ((start >= 0 ? 1 : 0) - spin) * (start >= 0 ? .08 : .03);
  suni.uAng.value += dt * (.03 + spin * .75);
  drawLight(now);
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
/* only draws while the section is on screen */
new IntersectionObserver(es => { const on = es[0].isIntersecting; if (on && !running) { running = true; last = 0; requestAnimationFrame(frame); } else if (!on) running = false; }, { rootMargin: '100px 0px' }).observe(sec);
sec.classList.add('ready');
