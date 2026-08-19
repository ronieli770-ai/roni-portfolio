/* Roni glitch intro loader.
   Shows once per browser session; hides when the page is loaded,
   never before MIN ms (so it can't flash) and never after DUR ms. */
(function () {
  var DUR = 5000;   // full animation length - always plays out in full
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

  /* shown on every load - the once-per-session gate is gone by request */
  root.classList.add('rl-lock');

  var start = Date.now();
  function done() {
    var elapsed = Date.now() - start;
    setTimeout(remove, Math.max(DUR - elapsed, 0));
  }

  if (document.readyState === 'complete') done();
  else window.addEventListener('load', done);
  setTimeout(remove, DUR + 400);              // hard cap
})();
