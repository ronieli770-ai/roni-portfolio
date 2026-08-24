/* Roni glitch intro loader — a faithful port of the Claude Design piece
   (Glitch Logo Loader.dc.html / glitch-loader.jsx).
   Frame-quantized (24fps) hash noise drives the tears, slices, jitter and
   glow, exactly like the design; the 0.75s Hold is stretched so the whole
   run lasts 5s. Shown once per visit. */
(function () {
  var DUR = 3000;                    // total run, ms
  var el = document.getElementById('rl-loader');
  if (!el) return;
  var mark = el.querySelector('.rl-mark');
  var root = document.documentElement;

  /* the intro belongs to arriving at the site, not to every page view - a
     return to the home page from another page must not replay it */
  try {
    if (sessionStorage.getItem('rl-intro-shown')){
      if (el.parentNode) el.parentNode.removeChild(el);
      return;
    }
    sessionStorage.setItem('rl-intro-shown', '1');
  } catch (e) {}

  root.classList.add('rl-lock');

  var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  function remove() {
    el.classList.add('rl-out');
    /* hand the stage to the hero: its "settle" entrance runs while the
       loader fades. the class comes off once the entrance is done so its
       fill never blocks the hero's own .off transition later */
    root.classList.remove('rl-lock');
    if (!reduced) {
      root.classList.add('rl-enter');
      setTimeout(function () { root.classList.remove('rl-enter'); }, 2100);
    }
    setTimeout(function () {
      if (el.parentNode) el.parentNode.removeChild(el);
    }, 400);
  }

  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
    mark.innerHTML = '<div class="rl-l"></div>';
    setTimeout(remove, 1500);
    return;
  }

  /* ---- layers: two blurred glow copies (static filters, only opacity
     moves), the crisp base, the two tear halves, four burst slices ---- */
  function layer(cls) {
    var d = document.createElement('div');
    d.className = 'rl-l ' + cls;
    mark.appendChild(d);
    return d;
  }
  var glowWide = layer('rl-glow-w');
  var glowTight = layer('rl-glow-t');
  var base = layer('');
  var top = layer('');
  top.style.clipPath = 'inset(0% 0% 50% 0%)';
  var bot = layer('');
  bot.style.clipPath = 'inset(50% 0% 0% 0%)';
  var slices = [];
  for (var j = 0; j < 4; j++) {
    var s = layer('');
    var t = 12 + j * 22;
    s.style.clipPath = 'inset(' + t + '% 0% ' + (100 - t - 12) + '% 0%)';
    s.style.opacity = 0;
    slices.push(s);
  }

  /* ---- the design's math, verbatim ---- */
  var hash = function (n) { var s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
  var rnd = function (i, f) { return hash(i * 17.13 + f * 3.77); };
  var sgn = function (i, f) { return rnd(i, f) * 2 - 1; };
  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };
  var settle = function (t) { return 1 - Math.pow(1 - t, 3); };
  var snap = function (t) { return 1 - Math.pow(1 - t, 5); };
  var pulse = function (t) { return Math.sin(t * Math.PI); };

  /* design cues: Signal 0.55 | Lock 0.8 | Hold (0.75 -> stretched) | Exit 0.4.
     the hold carries extra micro-glitches at the design's cadence */
  var LOCK = 0.55, HOLD = 1.35, EXIT = 2.6, GAIN = 0.88;
  var SPIKES = [
    { at: 0.66, len: 0.12, amp: 0.8 },
    { at: 1.02, len: 0.08, amp: 0.5 },
    { at: 1.52, len: 0.09, amp: 0.6 },
    { at: 1.88, len: 0.06, amp: 0.4 },
    { at: 2.28, len: 0.08, amp: 0.5 }
  ];

  function glitchAmount(T) {
    var a;
    if (T < LOCK) a = 0.95;
    else if (T < EXIT) a = 0.95 * (1 - settle(clamp((T - LOCK) / 0.58, 0, 1)));
    else a = clamp(0.1 + (T - EXIT) * 7.2, 0, 1.1);
    for (var i = 0; i < SPIKES.length; i++) {
      var s = SPIKES[i];
      if (T >= s.at && T < s.at + s.len) a = Math.max(a, s.amp * pulse(clamp((T - s.at) / s.len, 0, 1)) * 1.15);
    }
    return a;
  }

  var start = performance.now();
  var done = false;
  function frame(now) {
    if (done) return;
    var T = (now - start) / 1000;
    if (T > EXIT + 0.22) {           // the design's cut to black
      done = true;
      mark.style.opacity = 0;
      setTimeout(remove, Math.max(0, DUR - (performance.now() - start)));
      return;
    }
    requestAnimationFrame(frame);

    var F = Math.floor(T * 24);      // the design runs its noise at 24fps
    var k = mark.offsetWidth / 880;  // design px are for an 880px-wide mark
    var G = clamp(glitchAmount(T) * GAIN, 0, 1.4);

    var born = clamp(T / 0.16, 0, 1);
    var flicker = T < 0.30 ? (rnd(3, F) > 0.32 ? 1 : 0.18) : 1;

    var enter = snap(clamp(T / (HOLD - 0.08), 0, 1));
    var scale = 1.045 + (1 - 1.045) * enter;
    if (T >= HOLD && T < EXIT) scale = 1 + 0.008 * Math.sin((T - HOLD) * 3.0);
    if (T >= EXIT) scale = 1 + 0.04 * clamp((T - EXIT) / 0.2, 0, 1);

    mark.style.opacity = born * flicker;
    mark.style.transform =
      'translate3d(' + (sgn(1, F) * 8 * G * k) + 'px,' + (sgn(2, F) * 2 * G * k) + 'px,0) scale(' + scale + ')';

    var a = 0.12 + 0.85 * clamp(G, 0, 1);          // glow r=6+26G mapped onto
    glowTight.style.opacity = a;                    // two fixed-blur layers
    glowWide.style.opacity = a * clamp(G, 0, 1);

    var halfShift = 16 * G * k, hs = sgn(21, F);
    var tearOn = G > 0.04;
    var tearOp = tearOn ? clamp(G * 1.8, 0, 1) : 0;
    top.style.opacity = tearOp;
    bot.style.opacity = tearOp;
    if (tearOn) {
      top.style.transform = 'translate3d(' + (hs * halfShift) + 'px,0,0)';
      bot.style.transform = 'translate3d(' + (-hs * halfShift * 0.9) + 'px,0,0)';
    }

    for (var i = 0; i < 4; i++) {
      var on = G > 0.55 && rnd(i + 60, F) >= 0.5;
      slices[i].style.opacity = on ? 0.8 : 0;
      if (on) slices[i].style.transform = 'translate3d(' + (sgn(i + 90, F) * 34 * G * k) + 'px,0,0)';
    }
  }
  requestAnimationFrame(frame);

  setTimeout(remove, DUR + 600);     // hard cap, whatever happens
})();
