/* <mars-globe> — scroll-driven planet stage using a GLB model.
   Attributes (smoothed per frame):
     yaw, idle, zoom, offx, offy, tilt, exp, haze, ease, rim
   three.js + GLTFLoader fetched dynamically from unpkg. */
(function () {
  const THREE_URL = 'https://esm.sh/three@0.184.0';
  const GLTF_URL = 'https://esm.sh/three@0.184.0/examples/jsm/loaders/GLTFLoader';
  let threeP = null;
  const loadThree = () => (threeP = threeP || Promise.all([import(THREE_URL), import(GLTF_URL)]));
  const num = (el, name, dflt) => {
    const v = parseFloat(el.getAttribute(name));
    return Number.isFinite(v) ? v : dflt;
  };

  class MarsGlobe extends HTMLElement {
    connectedCallback() {
      if (this._booted) {
        if (this._dead) { this._dead = false; if (this._renderer) this._loop(); }
        return;
      }
      this._booted = true;
      this.style.display = 'block';
      if (!this.style.position) this.style.position = 'absolute';
      this._holder = document.createElement('div');
      this._holder.style.cssText = 'position:absolute;inset:0;';
      this.appendChild(this._holder);
      this._spin = Math.PI;
      this._cur = null;
      this._last = performance.now();
      this._modelRadius = 1;
      this._dragX = null;
      this._dragSpin = 0;
      this._holder.style.cursor = 'grab';
      const onDown = e => { this._dragX = (e.touches ? e.touches[0] : e).clientX; this._dragBase = this._dragSpin; this._holder.style.cursor = 'grabbing'; };
      const onMove = e => { if (this._dragX === null) return; e.preventDefault(); const x = (e.touches ? e.touches[0] : e).clientX; this._dragSpin = this._dragBase + (x - this._dragX) * 0.006; };
      const onUp = () => { this._dragX = null; this._holder.style.cursor = 'grab'; };
      this._holder.addEventListener('mousedown', onDown);
      this._holder.addEventListener('touchstart', onDown, { passive: true });
      addEventListener('mousemove', onMove);
      addEventListener('touchmove', onMove, { passive: false });
      addEventListener('mouseup', onUp);
      addEventListener('touchend', onUp);
      loadThree().then(([THREE, GLTF]) => { this.THREE = THREE; this.GLTFLoader = GLTF.GLTFLoader; this._start(); });
    }

    disconnectedCallback() {
      this._dead = true;
      if (this._ro) this._ro.disconnect();
    }

    metrics() {
      const c = this._cur;
      if (!c) return null;
      const h = this.clientHeight || 1, w = this.clientWidth || 1;
      const R = (h / 2) / (Math.tan((this._camera.fov * Math.PI) / 360) * c.dist);
      return { x: w / 2 + c.offx * R, y: h / 2 - c.offy * R, r: R };
    }

    _start() {
      if (this._dead) return;
      const THREE = this.THREE;
      const scene = new THREE.Scene();
      this._scene = scene;

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.2;
      this._renderer = renderer;
      renderer.domElement.style.cssText = 'display:block;width:100%;height:100%;';
      this._holder.appendChild(renderer.domElement);

      this._camera = new THREE.PerspectiveCamera(30, 1, 0.02, 100);
      this._pivot = new THREE.Group();
      scene.add(this._pivot);

      this._amb = new THREE.AmbientLight(0x8090a0, 0.6);
      scene.add(this._amb);
      this._hemi = new THREE.HemisphereLight(0xdde4f0, 0x1a1a2e, 0.5);
      scene.add(this._hemi);
      this._key = new THREE.DirectionalLight(0xfff8f0, 2.8);
      this._key.position.set(2.0, 1.0, 3.5);
      scene.add(this._key);
      this._warm = new THREE.PointLight(0xc0c8d8, 0.8, 26, 2);
      this._warm.position.set(-1.5, 0.8, 2.5);
      scene.add(this._warm);
      this._cool = new THREE.DirectionalLight(0x4a5570, 0.4);
      this._cool.position.set(-2.5, -0.3, 2.0);
      scene.add(this._cool);
      this._base = { amb: 0.6, key: 2.8, warm: 0.8, cool: 0.4 };

      const loader = new this.GLTFLoader();
      loader.load('moon.glb', (gltf) => {
        this._planet = gltf.scene;
        const box = new THREE.Box3().setFromObject(this._planet);
        const size = box.getSize(new THREE.Vector3());
        this._modelRadius = Math.max(size.x, size.y, size.z) / 2;
        const scale = 1.35 / this._modelRadius;
        this._planet.scale.setScalar(scale);
        const center = box.getCenter(new THREE.Vector3());
        this._planet.position.set(-center.x * scale, -center.y * scale, -center.z * scale);
        this._pivot.add(this._planet);

        this._resize();
        this._ro = new ResizeObserver(() => this._resize());
        this._ro.observe(this);
        this.setAttribute('data-ready', '');
        this._loop();
      });
    }

    _resize() {
      if (!this._renderer) return;
      const w = this.clientWidth || 1, h = this.clientHeight || 1;
      /* 1.5x is indistinguishable on a smooth lit sphere and costs ~45% fewer
         pixels per frame than 2x — this is what made the descent drop frames */
      const cap = parseFloat(this.getAttribute('dprcap')) || 1.5;
      const dpr = Math.min(cap, window.devicePixelRatio || 1);
      this._renderer.setPixelRatio(Math.min(dpr, 2400 / Math.max(w, h)));
      this._renderer.setSize(w, h, false);
      this._camera.aspect = w / h;
      this._camera.updateProjectionMatrix();
    }

    _fitDist(zoom) {
      const aspect = (this.clientWidth || 1) / (this.clientHeight || 1);
      const fit = 1.05 / Math.tan((this._camera.fov * Math.PI) / 360);
      return (aspect < 1 ? fit / aspect : fit) / Math.max(0.15, zoom);
    }

    _loop() {
      if (this._dead || !this._renderer) return;
      const now = performance.now();
      const dt = Math.min(0.05, (now - this._last) / 1000);
      this._last = now;

      this._spin += num(this, 'idle', 0.04) * dt;
      const t = {
        yaw: num(this, 'yaw', 0),
        dist: this._fitDist(num(this, 'zoom', 1)),
        offx: num(this, 'offx', 0),
        offy: num(this, 'offy', 0),
        tilt: num(this, 'tilt', 0),
        rim: num(this, 'rim', 0),
        exp: num(this, 'exp', 1),
        haze: num(this, 'haze', 1),
      };
      if (!this._cur) this._cur = Object.assign({}, t);
      const k = Math.min(1, num(this, 'ease', 0.07) * (dt * 60));
      const c = this._cur;
      for (const key in t) c[key] += (t[key] - c[key]) * k;

      this._pivot.position.set(c.offx, c.offy, 0);
      this._pivot.rotation.set(0.08, this._spin + c.yaw + this._dragSpin, c.tilt);

      const g = Math.min(1, Math.abs(c.tilt) / 1.5708);
      this._key.position.set(2.2 + 2.9 * g, 1.6 - 0.7 * g, 3.4 - 2.6 * g);
      this._warm.position.set(2.8 - 1.4 * g, 1.6, -2.4 + 1.2 * g);

      const e = Math.max(0.02, c.exp);
      this._amb.intensity = this._base.amb * e;
      this._key.intensity = this._base.key * e;
      this._warm.intensity = this._base.warm * Math.max(0.25, e);
      this._cool.intensity = this._base.cool * e;
      this._renderer.toneMappingExposure = 0.55 + 0.5 * Math.min(2, e);

      this._camera.position.set(0, 0, c.dist);
      this._camera.lookAt(0, 0, 0);
      this._renderer.render(this._scene, this._camera);
      requestAnimationFrame(() => this._loop());
    }
  }

  if (!customElements.get('mars-globe')) customElements.define('mars-globe', MarsGlobe);
})();
