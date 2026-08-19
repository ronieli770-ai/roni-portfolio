/* Roni glitch intro loader.
   Shows once per browser session; hides when the page is loaded,
   never before MIN ms (so it can't flash) and never after DUR ms. */
(function () {
  var KEY = 'rl-intro-shown';
  var DUR = 2500;   // full animation length
  var MIN = 1200;   // minimum time on screen
  var el = document.getElementById('rl-loader');
  if (!el) return;

  var root = document.documentElement;

  function remove() {
    el.classList.add('rl-out');
    setTimeout(function () {
      if (el.parentNode) el.parentNode.removeChild(el);
      root.classList.remove('rl-lock');
    }, 400);
  }

  if (sessionStorage.getItem(KEY)) {          // repeat visit in this session
    if (el.parentNode) el.parentNode.removeChild(el);
    root.classList.remove('rl-lock');
    return;
  }

  root.classList.add('rl-lock');
  sessionStorage.setItem(KEY, '1');

  var start = Date.now();
  function done() {
    var elapsed = Date.now() - start;
    setTimeout(remove, Math.min(Math.max(MIN - elapsed, 0), DUR));
  }

  if (document.readyState === 'complete') done();
  else window.addEventListener('load', done);
  setTimeout(remove, DUR + 400);              // hard cap
})();
