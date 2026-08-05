/* dev-review — private annotation layer.
   Off by default. Turn on with ?dev=1 (stays on until ?dev=0).
   Pick an element, write a note, copy a prompt for Claude. */
(function () {
  const KEY_ON = 'roni-dev-review';
  const KEY_NOTES = 'roni-dev-notes';

  const url = new URLSearchParams(location.search);
  if (url.has('dev')) {
    if (url.get('dev') === '0') localStorage.removeItem(KEY_ON);
    else localStorage.setItem(KEY_ON, '1');
  }
  if (localStorage.getItem(KEY_ON) !== '1') return;

  let notes = [];
  try { notes = JSON.parse(localStorage.getItem(KEY_NOTES) || '[]'); } catch (e) { notes = []; }
  const save = () => localStorage.setItem(KEY_NOTES, JSON.stringify(notes));

  /* ---------- what am I looking at ---------- */

  function sectionOf(el) {
    const proj = el.closest('[data-proj]');
    if (proj) return 'פרויקט ' + (+proj.dataset.proj + 1) + ' (data-proj="' + proj.dataset.proj + '")';
    const gd = el.closest('[data-gd]');
    if (gd) return 'עיצוב גרפי — סקשן ' + gd.dataset.gd;
    if (el.closest('#menu-overlay')) return 'המבורגר';
    if (el.closest('#hero')) return 'הירו';
    if (el.closest('[data-mars-section]')) return 'מארס — למה לעבוד איתי';
    const pane = el.closest('.pane');
    if (pane) return 'פאנל פתיחה ' + ([...document.querySelectorAll('.pane')].indexOf(pane) + 1);
    return document.title;
  }

  function selectorOf(el) {
    const step = n => {
      if (n.id) return '#' + n.id;
      let s = n.tagName.toLowerCase();
      const cls = [...n.classList].filter(c => !c.startsWith('dev-')).slice(0, 2);
      if (cls.length) s += '.' + cls.join('.');
      for (const a of ['data-proj', 'data-gd', 'data-stop']) {
        if (n.hasAttribute(a)) s += '[' + a + '="' + n.getAttribute(a) + '"]';
      }
      const sibs = n.parentElement ? [...n.parentElement.children].filter(c => c.tagName === n.tagName) : [];
      if (sibs.length > 1) s += ':nth-of-type(' + (sibs.indexOf(n) + 1) + ')';
      return s;
    };
    const path = [];
    let n = el;
    while (n && n !== document.body && path.length < 4) {
      path.unshift(step(n));
      if (n.id) break;
      n = n.parentElement;
    }
    return path.join(' > ');
  }

  function describe(el) {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    const txt = (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 60);
    return {
      selector: selectorOf(el),
      section: sectionOf(el),
      text: txt,
      rect: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)],
      font: cs.fontSize + ' / ' + cs.fontWeight,
      viewport: innerWidth + 'x' + innerHeight + ' @' + (devicePixelRatio || 1) + 'x',
      page: location.pathname.split('/').pop() || 'index.html'
    };
  }

  /* ---------- ui ---------- */

  const css = `
  .dev-fab,.dev-panel,.dev-hl{position:fixed;z-index:2147483000;font-family:'IBM Plex Sans Hebrew',system-ui,sans-serif}
  .dev-fab{left:14px;bottom:104px;width:46px;height:46px;border-radius:50%;border:0;cursor:pointer;
    background:#1d64f2;color:#fff;font-size:20px;line-height:46px;text-align:center;
    box-shadow:0 6px 20px rgba(0,0,0,.45)}
  .dev-fab.on{background:#e0783c}
  .dev-panel{left:10px;right:10px;bottom:72px;max-width:420px;margin:auto;direction:rtl;
    background:#12151c;color:#e9eef7;border:1px solid #2c3444;border-radius:14px;
    box-shadow:0 18px 50px rgba(0,0,0,.6);padding:12px;display:none;overflow:auto;
    max-height:min(70vh,70dvh);-webkit-overflow-scrolling:touch}
  .dev-panel.open{display:block}
  .dev-row{display:flex;gap:8px;align-items:center;margin-bottom:8px}
  .dev-panel h4{margin:0;font-size:15px;font-weight:600;flex:1}
  .dev-btn{border:0;border-radius:8px;padding:8px 12px;cursor:pointer;font-family:inherit;
    font-size:13px;font-weight:600;background:#243044;color:#e9eef7}
  .dev-btn.primary{background:#1d64f2;color:#fff}
  .dev-btn.warn{background:#3a2430;color:#ffb4b4}
  .dev-btn.pick.on{background:#e0783c;color:#fff}
  .dev-target{font-size:11px;line-height:1.45;background:#0c0f15;border:1px solid #222a38;
    border-radius:8px;padding:8px;margin-bottom:8px;word-break:break-all;color:#9fb0c8}
  .dev-target b{color:#e9eef7}
  .dev-panel textarea{width:100%;min-height:64px;resize:vertical;border-radius:8px;padding:8px;
    background:#0c0f15;border:1px solid #2c3444;color:#e9eef7;font-family:inherit;font-size:13px}
  .dev-list{margin:10px 0 0;padding:0;list-style:none}
  .dev-list li{background:#0c0f15;border:1px solid #222a38;border-radius:8px;padding:8px;
    margin-bottom:6px;font-size:12px;line-height:1.5}
  .dev-list .sel{color:#7f93ad;font-size:10px;word-break:break-all;display:block;margin-top:3px}
  .dev-list button{float:left;background:none;border:0;color:#ff8f8f;cursor:pointer;font-size:14px}
  .dev-hl{pointer-events:none;border:2px solid #1d64f2;border-radius:4px;
    background:rgba(29,100,242,.14);display:none}
  .dev-sheet{position:fixed;inset:10px;z-index:2147483001;direction:rtl;display:flex;flex-direction:column;
    background:#12151c;border:1px solid #2c3444;border-radius:14px;padding:12px;
    font-family:'IBM Plex Sans Hebrew',system-ui,sans-serif}
  .dev-sheet textarea{flex:1;width:100%;border-radius:8px;padding:10px;background:#0c0f15;
    border:1px solid #2c3444;color:#e9eef7;font-family:inherit;font-size:13px;line-height:1.5}
  .dev-toast{position:fixed;left:50%;bottom:130px;transform:translateX(-50%);z-index:2147483000;
    background:#1d64f2;color:#fff;padding:9px 16px;border-radius:999px;font-size:13px;
    font-family:inherit;opacity:0;transition:opacity .25s;pointer-events:none}
  .dev-toast.show{opacity:1}`;

  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  const ui = document.createElement('div');
  ui.setAttribute('data-devui', '');
  ui.innerHTML = `
    <button class="dev-fab" title="מצב ביקורת">◎</button>
    <div class="dev-hl"></div>
    <div class="dev-panel">
      <div class="dev-row">
        <h4>ביקורת על האתר</h4>
        <button class="dev-btn pick">בחר אלמנט</button>
      </div>
      <div class="dev-target">לא נבחר אלמנט — לחצי «בחר אלמנט» ואז על משהו בעמוד.<br>לחיצה נוספת על אותה נקודה בוחרת את האלמנט שמתחת.</div>
      <textarea placeholder="מה לתקן כאן?"></textarea>
      <div class="dev-row" style="margin:8px 0 0">
        <button class="dev-btn primary add">הוסף הערה</button>
        <button class="dev-btn copy">העתק פרומפט</button>
        <button class="dev-btn warn clear">נקה</button>
      </div>
      <ul class="dev-list"></ul>
    </div>
    <div class="dev-toast"></div>`;
  document.body.appendChild(ui);

  const fab = ui.querySelector('.dev-fab');
  const panel = ui.querySelector('.dev-panel');
  const pickBtn = ui.querySelector('.dev-btn.pick');
  const targetBox = ui.querySelector('.dev-target');
  const ta = ui.querySelector('textarea');
  const list = ui.querySelector('.dev-list');
  const hl = ui.querySelector('.dev-hl');
  const toastEl = ui.querySelector('.dev-toast');

  let picking = false;
  let current = null;

  const toast = m => {
    toastEl.textContent = m;
    toastEl.classList.add('show');
    setTimeout(() => toastEl.classList.remove('show'), 1400);
  };

  function renderList() {
    list.innerHTML = notes.map((n, i) =>
      '<li><button data-i="' + i + '">✕</button>' + (i + 1) + '. ' + n.note +
      '<span class="sel">' + n.el.section + ' · ' + n.el.selector + '</span></li>').join('');
  }
  renderList();

  function showTarget() {
    if (!current) return;
    const d = describe(current);
    targetBox.innerHTML = '<b>' + d.section + '</b><br>' + d.selector +
      (d.text ? '<br>«' + d.text + '»' : '') +
      '<br>' + d.rect[2] + '×' + d.rect[3] + 'px · ' + d.font;
  }

  function place(el) {
    const r = el.getBoundingClientRect();
    hl.style.display = 'block';
    hl.style.left = r.left + 'px';
    hl.style.top = r.top + 'px';
    hl.style.width = r.width + 'px';
    hl.style.height = r.height + 'px';
  }

  const isUI = el => !el || (el.closest && el.closest('[data-devui]'));

  /* the site is built from stacked full-screen layers, so the topmost hit is
     often an invisible wrapper — score the stack and take the element that
     actually draws something. Clicking the same spot again digs one deeper. */
  function candidates(x, y) {
    return (document.elementsFromPoint(x, y) || []).filter(el => {
      if (isUI(el) || el === document.body || el === document.documentElement) return false;
      const cs = getComputedStyle(el);
      return cs.visibility !== 'hidden' && parseFloat(cs.opacity) > 0.05;
    }).slice(0, 8);
  }

  function score(el) {
    let s = 0;
    const own = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
    if (own) s += 3;
    if (/^(IMG|VIDEO|CANVAS|SVG|BUTTON|A|INPUT|TEXTAREA)$/.test(el.tagName)) s += 3;
    const cs = getComputedStyle(el);
    if (cs.backgroundImage !== 'none') s += 2;
    if (cs.backgroundColor && !/rgba\(0, 0, 0, 0\)|transparent/.test(cs.backgroundColor)) s += 1;
    if (el.getBoundingClientRect().width * el.getBoundingClientRect().height >
        innerWidth * innerHeight * 0.9) s -= 2;   /* full-screen wrappers */
    return s;
  }

  let lastPt = null, depth = 0;
  function bestAt(x, y) {
    const list = candidates(x, y);
    if (!list.length) return null;
    if (lastPt && Math.abs(lastPt[0] - x) < 6 && Math.abs(lastPt[1] - y) < 6) depth++;
    else depth = 0;
    lastPt = [x, y];
    const ranked = list.map((el, i) => ({ el, s: score(el) - i * 0.1 }))
                       .sort((a, b) => b.s - a.s).map(o => o.el);
    return ranked[depth % ranked.length];
  }

  function onMove(e) {
    if (!picking) return;
    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (isUI(el) || !el) return;
    const best = candidates(e.clientX, e.clientY)
      .map((n, i) => ({ n, s: score(n) - i * 0.1 }))
      .sort((a, b) => b.s - a.s)[0];
    place(best ? best.n : el);
  }

  function onPick(e) {
    if (!picking) return;
    const probe = document.elementFromPoint(e.clientX, e.clientY);
    if (isUI(probe)) return;
    const el = bestAt(e.clientX, e.clientY);
    if (!el) return;
    e.preventDefault();
    e.stopPropagation();
    current = el;
    place(el);
    showTarget();
    setPicking(false);
    panel.classList.add('open');
    ta.focus();
  }

  function setPicking(on) {
    picking = on;
    document.documentElement.style.touchAction = on ? 'none' : '';
    pickBtn.classList.toggle('on', on);
    pickBtn.textContent = on ? 'לחצי על אלמנט…' : 'בחר אלמנט';
    if (on) panel.classList.remove('open');
    else if (!current) hl.style.display = 'none';
  }

  addEventListener('pointermove', onMove, true);
  addEventListener('pointerdown', onPick, true);

  /* on a phone the same tap would also swipe the site to the next section —
     while picking, every touch event is swallowed before the site sees it */
  const swallow = e => {
    if (!picking) return;
    if (isUI(e.target)) return;
    e.preventDefault();
    e.stopPropagation();
  };
  ['touchstart', 'touchmove', 'touchend', 'click'].forEach(t =>
    addEventListener(t, swallow, { capture: true, passive: false }));

  fab.addEventListener('click', () => {
    if (picking) return setPicking(false);
    panel.classList.toggle('open');
    fab.classList.toggle('on', panel.classList.contains('open'));
  });
  pickBtn.addEventListener('click', () => setPicking(!picking));

  ta.addEventListener('focus', () => {
    setTimeout(() => panel.scrollIntoView({ block: 'end' }), 250);
  });

  ui.querySelector('.add').addEventListener('click', () => {
    const note = ta.value.trim();
    if (!current) return toast('קודם בחרי אלמנט');
    if (!note) return toast('כתבי מה לתקן');
    notes.push({ note, el: describe(current) });
    save(); renderList();
    ta.value = '';
    toast('נוסף (' + notes.length + ')');
  });

  list.addEventListener('click', e => {
    const b = e.target.closest('button[data-i]');
    if (!b) return;
    notes.splice(+b.dataset.i, 1);
    save(); renderList();
  });

  ui.querySelector('.clear').addEventListener('click', () => {
    if (!notes.length) return;
    notes = []; save(); renderList();
    toast('נוקה');
  });

  function buildPrompt() {
    const head = 'תיקונים לאתר (' + (notes[0] ? notes[0].el.page : '') +
      ', מסך ' + (notes[0] ? notes[0].el.viewport : innerWidth + 'x' + innerHeight) + '):\n';
    const body = notes.map((n, i) =>
      (i + 1) + '. ' + n.note + '\n' +
      '   • סקשן: ' + n.el.section + '\n' +
      '   • אלמנט: ' + n.el.selector + (n.el.text ? ' — «' + n.el.text + '»' : '') + '\n' +
      '   • מיקום כרגע: x=' + n.el.rect[0] + ' y=' + n.el.rect[1] +
      ' · ' + n.el.rect[2] + '×' + n.el.rect[3] + 'px · פונט ' + n.el.font
    ).join('\n');
    return head + body + '\n\n/fast-code';
  }

  /* http://192.168.x.x is not a secure context, so navigator.clipboard is
     missing on the phone — fall back to execCommand, then to a sheet the
     user can select from or push through the native share menu */
  function openSheet(text) {
    const sheet = document.createElement('div');
    sheet.setAttribute('data-devui', '');
    sheet.className = 'dev-sheet';
    sheet.innerHTML =
      '<textarea readonly></textarea>' +
      '<div class="dev-row" style="margin:8px 0 0">' +
      (navigator.share ? '<button class="dev-btn primary sh">שיתוף / שליחה לעצמי</button>' : '') +
      '<button class="dev-btn sel">בחר הכל</button>' +
      '<button class="dev-btn warn cl">סגור</button></div>';
    document.body.appendChild(sheet);
    const t = sheet.querySelector('textarea');
    t.value = text;
    sheet.querySelector('.sel').addEventListener('click', () => {
      t.focus(); t.setSelectionRange(0, t.value.length);
      try { document.execCommand('copy'); toast('הועתק ✓'); } catch (e) { toast('לחיצה ארוכה → העתק'); }
    });
    const sh = sheet.querySelector('.sh');
    if (sh) sh.addEventListener('click', () => navigator.share({ text }).catch(() => {}));
    sheet.querySelector('.cl').addEventListener('click', () => sheet.remove());
  }

  ui.querySelector('.copy').addEventListener('click', async () => {
    if (!notes.length) return toast('אין הערות');
    const text = buildPrompt();
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(text);
        return toast('הפרומפט הועתק ✓');
      } catch (e) { /* fall through */ }
    }
    openSheet(text);
  });

  /* keep every keystroke inside the tool to itself — the pages bind space and
     the arrows to navigation */
  ['keydown', 'keyup', 'keypress'].forEach(t =>
    addEventListener(t, e => { if (isUI(e.target)) e.stopPropagation(); }, true));

  addEventListener('keydown', e => {
    if (e.key === 'Escape' && picking) setPicking(false);
  });
  addEventListener('scroll', () => { if (current) place(current); }, true);
  addEventListener('resize', () => { if (current) place(current); });
})();
