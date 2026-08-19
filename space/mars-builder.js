/* Mars — procedural surface builder. Classic script: defines window.MarsBuilder.
   buildMars(THREE, opts) -> THREE.Group of named meshes/materials. */
(function () {
  function permTable(seed) {
    let s = seed >>> 0;
    const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) p[i] = i;
    for (let i = 255; i > 0; i--) {
      const j = (rnd() * (i + 1)) | 0;
      const t = p[i]; p[i] = p[j]; p[j] = t;
    }
    const q = new Uint8Array(512);
    for (let i = 0; i < 512; i++) q[i] = p[i & 255];
    return q;
  }

  const fade = (t) => t * t * (3 - 2 * t);
  const lerp = (a, b, t) => a + (b - a) * t;

  function vnoise(p, x, y, z) {
    const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
    const xf = fade(x - xi), yf = fade(y - yi), zf = fade(z - zi);
    const h = (a, b, c) => p[(p[(p[a & 255] + (b & 255)) & 255] + (c & 255)) & 255] / 255;
    const c000 = h(xi, yi, zi), c100 = h(xi + 1, yi, zi);
    const c010 = h(xi, yi + 1, zi), c110 = h(xi + 1, yi + 1, zi);
    const c001 = h(xi, yi, zi + 1), c101 = h(xi + 1, yi, zi + 1);
    const c011 = h(xi, yi + 1, zi + 1), c111 = h(xi + 1, yi + 1, zi + 1);
    return lerp(
      lerp(lerp(c000, c100, xf), lerp(c010, c110, xf), yf),
      lerp(lerp(c001, c101, xf), lerp(c011, c111, xf), yf),
      zf
    );
  }

  function fbm(p, x, y, z, oct) {
    let a = 0.5, f = 1, sum = 0, norm = 0;
    for (let i = 0; i < oct; i++) {
      sum += a * vnoise(p, x * f, y * f, z * f);
      norm += a; a *= 0.5; f *= 2.03;
    }
    return sum / norm;
  }

  const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

  const RAMP = [
    [52, 24, 14], [88, 36, 18], [138, 52, 22],
    [186, 82, 28], [218, 118, 38], [232, 156, 62],
    [244, 186, 98], [248, 212, 142],
  ];

  function rampAt(t) {
    t = clamp01(t) * (RAMP.length - 1);
    const i = Math.min(RAMP.length - 2, Math.floor(t)), f = t - i;
    const a = RAMP[i], b = RAMP[i + 1];
    return [lerp(a[0], b[0], f), lerp(a[1], b[1], f), lerp(a[2], b[2], f)];
  }

  const canvasCache = {};

  function marsTextures(THREE, size) {
    const w = size || 2048, h = (size || 2048) / 2;
    if (canvasCache[w]) return wrap(THREE, canvasCache[w]);
    const albedo = document.createElement('canvas');
    const bump = document.createElement('canvas');
    albedo.width = bump.width = w; albedo.height = bump.height = h;
    const actx = albedo.getContext('2d'), bctx = bump.getContext('2d');
    const ai = actx.createImageData(w, h), bi = bctx.createImageData(w, h);
    const p = permTable(20260729);
    const p2 = permTable(77442211);

    for (let y = 0; y < h; y++) {
      const theta = ((y + 0.5) / h) * Math.PI;
      const sy = Math.cos(theta), sr = Math.sin(theta);
      for (let x = 0; x < w; x++) {
        const phi = ((x + 0.5) / w) * Math.PI * 2;
        const sx = Math.cos(phi) * sr, sz = Math.sin(phi) * sr;
        const cont = fbm(p, sx * 1.9 + 3.1, sy * 1.9, sz * 1.9, 7);
        const detail = fbm(p, sx * 9.5 + 41, sy * 9.5, sz * 9.5, 6);
        const fine = fbm(p2, sx * 22 + 7.3, sy * 22, sz * 22, 5);
        const grit = vnoise(p, sx * 48, sy * 48, sz * 48);
        const micro = vnoise(p2, sx * 80, sy * 80, sz * 80);
        let v = cont * 0.48 + detail * 0.26 + fine * 0.14 + grit * 0.08 + micro * 0.04;
        v -= Math.max(0, 0.47 - cont) * 1.4;
        v += Math.max(0, cont - 0.58) * 0.9;
        const dust = fbm(p2, sx * 4.2 + 19, sy * 4.2, sz * 4.2, 5);
        v += (dust - 0.5) * 0.18;
        const streaks = fbm(p, sx * 3.2 + 11, sy * 6.8 + 5, sz * 3.2, 5);
        v += (streaks - 0.5) * 0.14;
        v = v * 1.15 - 0.06;
        let [r, g, b] = rampAt(v);
        const warm = fbm(p2, sx * 2.8 + 33, sy * 2.8, sz * 2.8, 4);
        r *= 0.92 + warm * 0.22;
        g *= 0.88 + warm * 0.14;
        b *= 0.82 + warm * 0.08;
        const tint = vnoise(p2, sx * 5.5, sy * 5.5, sz * 5.5);
        r *= 0.94 + tint * 0.14; g *= 0.92 + tint * 0.08; b *= 0.88 + tint * 0.06;
        const edge = 0.855 + detail * 0.055;
        const ice = Math.abs(sy) > edge ? clamp01((Math.abs(sy) - edge) / 0.05) : 0;
        if (ice > 0) {
          r = lerp(r, 240, ice); g = lerp(g, 236, ice); b = lerp(b, 228, ice);
        }
        const i = (y * w + x) * 4;
        ai.data[i] = clamp01(r/255)*255; ai.data[i + 1] = clamp01(g/255)*255; ai.data[i + 2] = clamp01(b/255)*255; ai.data[i + 3] = 255;
        let bv = clamp01(0.46 + (v - 0.5) * 0.9 + (detail - 0.5) * 0.55 + (fine - 0.5) * 0.3);
        if (ice > 0) bv = lerp(bv, 0.72, ice);
        const bb = bv * 255;
        bi.data[i] = bb; bi.data[i + 1] = bb; bi.data[i + 2] = bb; bi.data[i + 3] = 255;
      }
    }
    actx.putImageData(ai, 0, 0);
    bctx.putImageData(bi, 0, 0);

    let s = 987654321 >>> 0;
    const rnd = () => ((s = (s * 1103515245 + 12345) >>> 0) / 4294967296);
    for (let n = 0; n < 600; n++) {
      const cy = h * 0.06 + rnd() * h * 0.88;
      const cx = rnd() * w;
      const lat = Math.abs(cy / h - 0.5) * 2;
      const tier = rnd();
      const big = tier > 0.92;
      const med = tier > 0.7 && !big;
      const rad = (big ? 10 + rnd() * 14 : med ? 4 + rnd() * 6 : 1.2 + rnd() * 3.5) * (1 + lat * 1.1);
      for (const ctx of [actx, bctx]) {
        const dark = ctx === actx ? 'rgba(58,32,22,0.32)' : 'rgba(0,0,0,0.4)';
        const rim = ctx === actx ? 'rgba(238,200,164,0.16)' : 'rgba(255,255,255,0.34)';
        const g1 = ctx.createRadialGradient(cx, cy, rad * 0.1, cx, cy, rad);
        g1.addColorStop(0, dark);
        g1.addColorStop(0.72, dark.replace(/0\.\d+\)/, '0.12)'));
        g1.addColorStop(0.88, rim);
        g1.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g1;
        ctx.beginPath(); ctx.ellipse(cx, cy, rad, rad * 0.95, 0, 0, Math.PI * 2); ctx.fill();
        if (big) {
          const g2 = ctx.createRadialGradient(cx + rad * 0.15, cy - rad * 0.1, 0, cx, cy, rad * 0.7);
          g2.addColorStop(0, ctx === actx ? 'rgba(42,24,16,0.18)' : 'rgba(0,0,0,0.22)');
          g2.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = g2;
          ctx.beginPath(); ctx.ellipse(cx, cy, rad * 0.7, rad * 0.65, 0, 0, Math.PI * 2); ctx.fill();
        }
      }
    }

    canvasCache[w] = { albedo: albedo, bump: bump };
    return wrap(THREE, canvasCache[w]);
  }

  function wrap(THREE, pair) {
    const map = new THREE.CanvasTexture(pair.albedo);
    map.colorSpace = THREE.SRGBColorSpace;
    map.wrapS = THREE.RepeatWrapping;
    map.anisotropy = 4;
    const bumpMap = new THREE.CanvasTexture(pair.bump);
    bumpMap.wrapS = THREE.RepeatWrapping;
    return { map: map, bumpMap: bumpMap };
  }

  function photoTextures(THREE) {
    const loader = new THREE.TextureLoader();
    const map = loader.load('mars-texture.webp');
    map.colorSpace = THREE.SRGBColorSpace;
    map.wrapS = THREE.RepeatWrapping;
    map.anisotropy = 16;
    const bumpMap = loader.load('mars-texture.webp');
    bumpMap.wrapS = THREE.RepeatWrapping;
    bumpMap.wrapT = THREE.RepeatWrapping;
    bumpMap.anisotropy = 16;
    return { map: map, bumpMap: bumpMap };
  }

  function buildMars(THREE, opts) {
    const o = Object.assign(
      { segments: 96, textured: true, atmosphere: false, radius: 1, source: 'photo' },
      opts || {}
    );
    const group = new THREE.Group();
    group.name = 'Mars';
    let rimU = null;

    const mat = new THREE.MeshStandardMaterial({
      name: 'mars_regolith',
      color: o.textured ? 0xffffff : 0xa8522a,
      roughness: 0.86,
      metalness: 0.0,
    });
    if (o.textured) {
      const t = o.source === 'photo' ? photoTextures(THREE) : marsTextures(THREE, 1024);
      mat.map = t.map;
      mat.bumpMap = t.bumpMap;
      mat.bumpScale = 1.6;
      mat.onBeforeCompile = (shader) => {
        shader.uniforms.uDetail = { value: t.bumpMap };
        shader.uniforms.uDetailRep = { value: new THREE.Vector2(16, 8) };
        shader.uniforms.uDetailAmt = { value: 0.95 };
        shader.uniforms.uRim = { value: 0 };
        rimU = shader.uniforms.uRim;
        shader.fragmentShader =
          'uniform sampler2D uDetail;\nuniform vec2 uDetailRep;\nuniform float uDetailAmt;\nuniform float uRim;\n' +
          shader.fragmentShader.replace(
            '#include <map_fragment>',
            ['#include <map_fragment>',
              '{',
              '  float d0 = texture2D(uDetail, vMapUv * uDetailRep).r;',
              '  float d1 = texture2D(uDetail, vMapUv * uDetailRep * 3.7 + vec2(0.37, 0.11)).r;',
              '  float d = mix(d0, d1, 0.45);',
              '  diffuseColor.rgb *= (1.0 - uDetailAmt * 0.5) + uDetailAmt * d * 1.05;',
              '  diffuseColor.rgb *= 1.0 + (d - 0.5) * 0.34 * vec3(1.0, 0.72, 0.5);',
              '}'].join('\n')
          );
        shader.fragmentShader = shader.fragmentShader.replace(
          '#include <roughnessmap_fragment>',
          ['#include <roughnessmap_fragment>',
            '{',
            '  float dr = texture2D(uDetail, vMapUv * uDetailRep * 2.1).r;',
            '  roughnessFactor = clamp(roughnessFactor + (dr - 0.5) * 0.42, 0.18, 1.0);',
            '}'].join('\n')
        );
        shader.fragmentShader = shader.fragmentShader.replace(
          '#include <normal_fragment_maps>',
          ['#include <normal_fragment_maps>',
            '  float marsRim = pow(clamp(1.0 - abs(dot(normalize(vViewPosition), normal)), 0.0, 1.0), 3.4)',
            '    * smoothstep(-0.1, 0.9, normal.y);'].join('\n')
        );
        shader.fragmentShader = shader.fragmentShader.replace(
          '#include <dithering_fragment>',
          ['#include <dithering_fragment>',
            '  gl_FragColor.rgb += vec3(1.0, 0.74, 0.46) * marsRim * uRim;'].join('\n')
        );
      };
      mat.customProgramCacheKey = () => 'marsDetailAlbedo';
    }
    const surface = new THREE.Mesh(
      new THREE.SphereGeometry(o.radius, o.segments, Math.round(o.segments / 2)),
      mat
    );
    surface.name = 'mars_surface';
    surface.castShadow = true;
    surface.receiveShadow = true;
    group.add(surface);

    if (o.atmosphere) {
      const SHELL = 1.62;
      const inner = Math.sqrt(1 - (o.radius / (o.radius * SHELL)) ** 2);
      const haze = new THREE.Mesh(
        new THREE.SphereGeometry(o.radius * SHELL, 64, 32),
        new THREE.ShaderMaterial({
          name: 'mars_haze',
          transparent: true,
          side: THREE.BackSide,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
          uniforms: {
            uColor: { value: new THREE.Color(0xff9445) },
            uHot: { value: new THREE.Color(0xfff0d6) },
            uOpacity: { value: 0.42 },
            uBand: { value: 0 },
            uInner: { value: inner },
          },
          vertexShader: [
            'varying vec3 vN;',
            'varying vec3 vV;',
            'void main() {',
            '  vec4 mv = modelViewMatrix * vec4(position, 1.0);',
            '  vN = normalize(normalMatrix * normal);',
            '  vV = normalize(-mv.xyz);',
            '  gl_Position = projectionMatrix * mv;',
            '}',
          ].join('\n'),
          fragmentShader: [
            'uniform vec3 uColor;',
            'uniform vec3 uHot;',
            'uniform float uOpacity;',
            'uniform float uBand;',
            'uniform float uInner;',
            'varying vec3 vN;',
            'varying vec3 vV;',
            'void main() {',
            '  float d = abs(dot(normalize(vN), normalize(vV)));',
            '  float t = clamp(d / max(uInner, 0.001), 0.0, 1.0);',
            '  float up = smoothstep(-0.05, 0.85, normalize(vN).y);',
            '  float band = 0.0;',
            '  float a = (pow(t, 1.35) + band * 1.15) * uOpacity;',
            '  vec3 c = mix(uColor, uHot, clamp(pow(t, 2.0) * 0.55 + band * 1.2, 0.0, 1.0));',
            '  gl_FragColor = vec4(c * a, a);',
            '}',
          ].join('\n'),
        })
      );
      haze.name = 'mars_atmosphere';
      group.add(haze);
      group.userData.setRim = (v) => {
        const k = Math.max(0, v);
        if (rimU) rimU.value = k * 0.55;
      };
    }
    if (!group.userData.setRim) {
      group.userData.setRim = (v) => { if (rimU) rimU.value = Math.max(0, v) * 0.55; };
    }
    return group;
  }

  window.MarsBuilder = { buildMars: buildMars, marsTextures: marsTextures };
})();
