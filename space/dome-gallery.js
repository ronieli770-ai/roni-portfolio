/* <dome-gallery> — vanilla port of the React Bits <DomeGallery /> component.
   Attributes: images (comma list), min-radius, max-vertical-rotation-deg,
   segments, drag-dampening, grayscale, overlay-blur-color */
(function () {
  const clamp = (v, min, max) => Math.min(Math.max(v, min), max);
  const normalizeAngle = d => ((d % 360) + 360) % 360;
  const wrapAngleSigned = deg => {
    const a = (((deg + 180) % 360) + 360) % 360;
    return a - 180;
  };

  function buildItems(pool, seg) {
    const xCols = Array.from({ length: seg }, (_, i) => -37 + i * 2);
    const evenYs = [-4, -2, 0, 2, 4];
    const oddYs = [-3, -1, 1, 3, 5];
    const coords = xCols.flatMap((x, c) => {
      const ys = c % 2 === 0 ? evenYs : oddYs;
      return ys.map(y => ({ x, y, sizeX: 2, sizeY: 2 }));
    });
    if (!pool.length) return coords.map(c => ({ ...c, src: '' }));

    /* shuffled, repeating pool so the same ad never lands next to itself */
    const shuffled = pool.slice();
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    const used = Array.from({ length: coords.length }, (_, i) => shuffled[i % shuffled.length]);
    for (let i = 1; i < used.length; i++) {
      if (used[i] === used[i - 1]) {
        for (let j = i + 1; j < used.length; j++) {
          if (used[j] !== used[i]) { const t = used[i]; used[i] = used[j]; used[j] = t; break; }
        }
      }
    }
    return coords.map((c, i) => ({ ...c, src: used[i] }));
  }

  function computeItemBaseRotation(offsetX, offsetY, sizeX, sizeY, segments) {
    const unit = 360 / segments / 2;
    return {
      rotateY: unit * (offsetX + (sizeX - 1) / 2),
      rotateX: unit * (offsetY - (sizeY - 1) / 2)
    };
  }

  class DomeGallery extends HTMLElement {
    connectedCallback() {
      if (this._booted) return;
      this._booted = true;

      const num = (name, dflt) => {
        const v = parseFloat(this.getAttribute(name));
        return Number.isFinite(v) ? v : dflt;
      };
      const o = {
        fit: num('fit', 0.5),
        minRadius: num('min-radius', 450),
        maxRadius: num('max-radius', Infinity),
        padFactor: num('pad-factor', 0.25),
        overlayBlurColor: this.getAttribute('overlay-blur-color') || '#000000',
        maxVerticalRotationDeg: num('max-vertical-rotation-deg', 6),
        dragSensitivity: num('drag-sensitivity', 20),
        enlargeTransitionMs: num('enlarge-transition-ms', 300),
        segments: num('segments', 22),
        dragDampening: num('drag-dampening', 1),
        openedImageWidth: this.getAttribute('opened-image-width') || '400px',
        openedImageHeight: this.getAttribute('opened-image-height') || '400px',
        imageBorderRadius: this.getAttribute('image-border-radius') || '30px',
        openedImageBorderRadius: this.getAttribute('opened-image-border-radius') || '30px',
        grayscale: this.getAttribute('grayscale') === 'true'
      };

      const images = (this.getAttribute('images') || '').split(',').map(s => s.trim()).filter(Boolean);
      const items = buildItems(images, o.segments);

      this.classList.add('sphere-root');
      this.style.setProperty('--segments-x', o.segments);
      this.style.setProperty('--segments-y', o.segments);
      this.style.setProperty('--overlay-blur-color', o.overlayBlurColor);
      this.style.setProperty('--tile-radius', o.imageBorderRadius);
      this.style.setProperty('--enlarge-radius', o.openedImageBorderRadius);
      this.style.setProperty('--image-filter', o.grayscale ? 'grayscale(1)' : 'none');

      this.innerHTML =
        '<main class="sphere-main"><div class="stage"><div class="sphere"></div></div>' +
        '<div class="overlay"></div><div class="overlay overlay--blur"></div>' +
        '<div class="edge-fade edge-fade--top"></div><div class="edge-fade edge-fade--bottom"></div>' +
        '<div class="viewer"><div class="scrim"></div><div class="frame"></div></div></main>';

      const main = this.querySelector('.sphere-main');
      const sphere = this.querySelector('.sphere');
      const viewer = this.querySelector('.viewer');
      const scrim = this.querySelector('.scrim');
      const frame = this.querySelector('.frame');

      const frag = document.createDocumentFragment();
      items.forEach(it => {
        const cell = document.createElement('div');
        cell.className = 'item';
        cell.dataset.src = it.src;
        cell.dataset.offsetX = it.x;
        cell.dataset.offsetY = it.y;
        cell.dataset.sizeX = it.sizeX;
        cell.dataset.sizeY = it.sizeY;
        cell.style.setProperty('--offset-x', it.x);
        cell.style.setProperty('--offset-y', it.y);
        cell.style.setProperty('--item-size-x', it.sizeX);
        cell.style.setProperty('--item-size-y', it.sizeY);
        cell.innerHTML = '<div class="item__image" role="button" tabindex="0">' +
          '<img src="' + it.src + '" draggable="false" alt=""></div>';
        frag.appendChild(cell);
      });
      sphere.appendChild(frag);

      const rotation = { x: 0, y: 0 };
      const applyTransform = (x, y) => {
        sphere.style.transform = 'translateZ(calc(var(--radius) * -1)) rotateX(' + x + 'deg) rotateY(' + y + 'deg)';
      };

      /* ---- sizing ---- */
      const ro = new ResizeObserver(entries => {
        const cr = entries[0].contentRect;
        const w = Math.max(1, cr.width), h = Math.max(1, cr.height);
        const minDim = Math.min(w, h), aspect = w / h;
        const basis = aspect >= 1.3 ? w : minDim;
        let radius = clamp(Math.min(basis * o.fit, h * 1.35), o.minRadius, o.maxRadius);
        this.style.setProperty('--radius', Math.round(radius) + 'px');
        this.style.setProperty('--viewer-pad', Math.max(8, Math.round(minDim * o.padFactor)) + 'px');
        applyTransform(rotation.x, rotation.y);
      });
      ro.observe(this);

      /* ---- drag + inertia ---- */
      let dragging = false, moved = false, startRot = null, startPos = null;
      let lastPos = null, vel = { x: 0, y: 0 }, inertiaRAF = null, lastDragEnd = 0;
      const stopInertia = () => { if (inertiaRAF) { cancelAnimationFrame(inertiaRAF); inertiaRAF = null; } };

      const startInertia = (vx, vy) => {
        const MAX_V = 1.4;
        let vX = clamp(vx, -MAX_V, MAX_V) * 80;
        let vY = clamp(vy, -MAX_V, MAX_V) * 80;
        let frames = 0;
        const d = clamp(o.dragDampening, 0, 1);
        const friction = 0.94 + 0.055 * d;
        const stopThreshold = 0.015 - 0.01 * d;
        const maxFrames = Math.round(90 + 270 * d);
        const step = () => {
          vX *= friction; vY *= friction;
          if ((Math.abs(vX) < stopThreshold && Math.abs(vY) < stopThreshold) || ++frames > maxFrames) {
            inertiaRAF = null; return;
          }
          rotation.x = clamp(rotation.x - vY / 200, -o.maxVerticalRotationDeg, o.maxVerticalRotationDeg);
          rotation.y = wrapAngleSigned(rotation.y + vX / 200);
          applyTransform(rotation.x, rotation.y);
          inertiaRAF = requestAnimationFrame(step);
        };
        stopInertia();
        inertiaRAF = requestAnimationFrame(step);
      };

      main.addEventListener('pointerdown', e => {
        if (focusedEl) return;
        stopInertia();
        dragging = true; moved = false;
        startRot = { ...rotation };
        startPos = { x: e.clientX, y: e.clientY };
        lastPos = { x: e.clientX, y: e.clientY, t: performance.now() };
        vel = { x: 0, y: 0 };
        /* no pointer capture — it would retarget the click away from the tile */
      });
      main.addEventListener('pointermove', e => {
        if (!dragging || !startPos) return;
        const dx = e.clientX - startPos.x, dy = e.clientY - startPos.y;
        if (!moved && dx * dx + dy * dy > 16) moved = true;
        rotation.x = clamp(startRot.x - dy / o.dragSensitivity, -o.maxVerticalRotationDeg, o.maxVerticalRotationDeg);
        rotation.y = wrapAngleSigned(startRot.y + dx / o.dragSensitivity);
        applyTransform(rotation.x, rotation.y);
        const now = performance.now(), dt = Math.max(1, now - lastPos.t);
        vel = { x: (e.clientX - lastPos.x) / dt, y: (e.clientY - lastPos.y) / dt };
        lastPos = { x: e.clientX, y: e.clientY, t: now };
      });
      const endDrag = () => {
        if (!dragging) return;
        dragging = false;
        /* only real flicks get inertia — micro-movements from clicks resume the idle spin at once */
        if (Math.abs(vel.x) > 0.05 || Math.abs(vel.y) > 0.05) startInertia(vel.x, vel.y);
        if (moved) lastDragEnd = performance.now();
        moved = false;
      };
      addEventListener('pointerup', endDrag);
      addEventListener('pointercancel', endDrag);
      main.addEventListener('pointerleave', endDrag);

      /* ---- open / close a tile ---- */
      let focusedEl = null, opening = false, openStartedAt = 0, originalTilePos = null;

      const openTile = el => {
        if (opening) return;
        opening = true;
        openStartedAt = performance.now();
        const parent = el.parentElement;
        focusedEl = el;
        const pr = computeItemBaseRotation(
          +parent.dataset.offsetX, +parent.dataset.offsetY,
          +parent.dataset.sizeX, +parent.dataset.sizeY, o.segments
        );
        let rotY = -(normalizeAngle(pr.rotateY) + normalizeAngle(rotation.y)) % 360;
        if (rotY < -180) rotY += 360;
        parent.style.setProperty('--rot-y-delta', rotY + 'deg');
        parent.style.setProperty('--rot-x-delta', (-pr.rotateX - rotation.x) + 'deg');

        const ref = document.createElement('div');
        ref.className = 'item__image item__image--reference';
        ref.style.opacity = '0';
        ref.style.transform = 'rotateX(' + (-pr.rotateX) + 'deg) rotateY(' + (-pr.rotateY) + 'deg)';
        parent.appendChild(ref);
        void ref.offsetHeight;

        const tileR = ref.getBoundingClientRect();
        const mainR = main.getBoundingClientRect();
        const frameR = frame.getBoundingClientRect();
        if (tileR.width <= 0 || tileR.height <= 0) {
          opening = false; focusedEl = null; ref.remove(); return;
        }
        originalTilePos = { left: tileR.left, top: tileR.top, width: tileR.width, height: tileR.height };
        el.style.visibility = 'hidden';

        const overlay = document.createElement('div');
        overlay.className = 'enlarge';
        overlay.style.cssText = 'position:absolute;left:' + (frameR.left - mainR.left) + 'px;top:' +
          (frameR.top - mainR.top) + 'px;width:' + frameR.width + 'px;height:' + frameR.height +
          'px;opacity:0;z-index:30;transform-origin:top left;transition:transform ' +
          o.enlargeTransitionMs + 'ms ease,opacity ' + o.enlargeTransitionMs + 'ms ease;';
        const img = document.createElement('img');
        img.src = parent.dataset.src;
        overlay.appendChild(img);
        viewer.appendChild(overlay);

        const sx = tileR.width / frameR.width, sy = tileR.height / frameR.height;
        overlay.style.transform = 'translate(' + (tileR.left - frameR.left) + 'px,' +
          (tileR.top - frameR.top) + 'px) scale(' + (sx > 0 ? sx : 1) + ',' + (sy > 0 ? sy : 1) + ')';

        setTimeout(() => {
          if (!overlay.parentElement) return;
          overlay.style.opacity = '1';
          overlay.style.transform = 'translate(0px,0px) scale(1,1)';
          this.setAttribute('data-enlarging', 'true');
        }, 16);

        let resized = false;
        const onFirstEnd = ev => {
          if (ev && ev.propertyName !== 'transform') return;
          if (resized) return;
          resized = true;
          clearTimeout(resizeFallback);
          overlay.removeEventListener('transitionend', onFirstEnd);
          const prev = overlay.style.transition;
          overlay.style.transition = 'none';

          /* target size: honour the css units, and when the width is "auto"
             derive it from the image's own aspect ratio so nothing is cropped */
          const probe = document.createElement('div');
          probe.style.cssText = 'position:absolute;visibility:hidden;height:' + o.openedImageHeight +
            ';width:' + (o.openedImageWidth === 'auto' ? '10px' : o.openedImageWidth) + ';';
          document.body.appendChild(probe);
          const pr2 = probe.getBoundingClientRect();
          probe.remove();
          let tw = pr2.width, th = pr2.height;
          if (o.openedImageWidth === 'auto') {
            const nat = el.querySelector('img');
            const ar = nat && nat.naturalHeight ? nat.naturalWidth / nat.naturalHeight : 1;
            tw = Math.min(th * ar, innerWidth * 0.9);
            th = Math.min(th, tw / ar);
          }
          const targetW = Math.round(tw) + 'px';
          const targetH = Math.round(th) + 'px';

          overlay.style.width = targetW;
          overlay.style.height = targetH;
          const nr = overlay.getBoundingClientRect();
          overlay.style.width = frameR.width + 'px';
          overlay.style.height = frameR.height + 'px';
          void overlay.offsetWidth;
          overlay.style.transition = 'left ' + o.enlargeTransitionMs + 'ms ease,top ' + o.enlargeTransitionMs +
            'ms ease,width ' + o.enlargeTransitionMs + 'ms ease,height ' + o.enlargeTransitionMs + 'ms ease';
          overlay.style.left = (frameR.left - mainR.left + (frameR.width - nr.width) / 2) + 'px';
          overlay.style.top = (frameR.top - mainR.top + (frameR.height - nr.height) / 2) + 'px';
          overlay.style.width = targetW;
          overlay.style.height = targetH;
          overlay.addEventListener('transitionend', () => { overlay.style.transition = prev; }, { once: true });
        };
        overlay.addEventListener('transitionend', onFirstEnd);
        /* transitionend can be skipped when the tab is throttled — always resize */
        const resizeFallback = setTimeout(onFirstEnd, o.enlargeTransitionMs + 80);
      };

      const close = () => {
        if (performance.now() - openStartedAt < 250) return;
        const el = focusedEl;
        if (!el) return;
        const parent = el.parentElement;
        const overlay = viewer.querySelector('.enlarge');
        if (!overlay) return;
        const ref = parent.querySelector('.item__image--reference');
        const rootRect = this.getBoundingClientRect();
        const cur = overlay.getBoundingClientRect();
        const anim = document.createElement('div');
        anim.className = 'enlarge-closing';
        anim.style.cssText = 'position:absolute;left:' + (cur.left - rootRect.left) + 'px;top:' +
          (cur.top - rootRect.top) + 'px;width:' + cur.width + 'px;height:' + cur.height +
          'px;z-index:9999;border-radius:var(--enlarge-radius,32px);overflow:hidden;transition:all ' +
          o.enlargeTransitionMs + 'ms ease-out;pointer-events:none;';
        const oi = overlay.querySelector('img');
        if (oi) {
          const c = oi.cloneNode();
          c.style.cssText = 'width:100%;height:100%;object-fit:cover;';
          anim.appendChild(c);
        }
        overlay.remove();
        this.appendChild(anim);
        void anim.getBoundingClientRect();
        /* the sphere keeps spinning while open, so read the tile's live position */
        let target = originalTilePos;
        if (ref) {
          const live = ref.getBoundingClientRect();
          if (live.width > 0 && live.height > 0) target = live;
        }
        if (target) {
          requestAnimationFrame(() => {
            anim.style.left = (target.left - rootRect.left) + 'px';
            anim.style.top = (target.top - rootRect.top) + 'px';
            anim.style.width = target.width + 'px';
            anim.style.height = target.height + 'px';
            anim.style.opacity = '0';
          });
        }
        const cleanup = () => {
          anim.remove();
          originalTilePos = null;
          if (ref) ref.remove();
          parent.style.setProperty('--rot-y-delta', '0deg');
          parent.style.setProperty('--rot-x-delta', '0deg');
          el.style.visibility = '';
          focusedEl = null;
          opening = false;
          this.removeAttribute('data-enlarging');
        };
        anim.addEventListener('transitionend', cleanup, { once: true });
        setTimeout(() => { if (anim.parentElement) cleanup(); }, o.enlargeTransitionMs + 120);
      };

      scrim.addEventListener('click', close);
      addEventListener('keydown', e => { if (e.key === 'Escape') close(); });

      this.querySelectorAll('.item__image').forEach(t => {
        t.addEventListener('click', e => {
          if (dragging || moved) return;
          if (performance.now() - lastDragEnd < 80) return;
          openTile(e.currentTarget);
        });
      });

      /* ---- gentle idle spin (pauses on drag / open / off-screen) ---- */
      const autoSpeed = num('auto-rotate-speed', 0.04);
      let visible = true;
      new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { threshold: 0 }).observe(this);
      const autoStep = () => {
        requestAnimationFrame(autoStep);
        if (!autoSpeed || !visible || dragging || inertiaRAF) return;
        rotation.y = wrapAngleSigned(rotation.y + autoSpeed);
        applyTransform(rotation.x, rotation.y);
      };
      requestAnimationFrame(autoStep);

      applyTransform(0, 0);
    }
  }

  customElements.define('dome-gallery', DomeGallery);
})();
