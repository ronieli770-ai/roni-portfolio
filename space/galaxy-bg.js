/* <galaxy-bg> — animated star-galaxy background (vanilla WebGL port of React Bits <Galaxy />). */
(function () {
  const VERT = `
attribute vec2 uv;
attribute vec2 position;
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 0, 1);
}
`;

  const FRAG = `
precision highp float;

uniform float uTime;
uniform vec3 uResolution;
uniform vec2 uFocal;
uniform vec2 uRotation;
uniform float uStarSpeed;
uniform float uDensity;
uniform float uHueShift;
uniform float uSpeed;
uniform vec2 uMouse;
uniform float uGlowIntensity;
uniform float uSaturation;
uniform bool uMouseRepulsion;
uniform float uTwinkleIntensity;
uniform float uRotationSpeed;
uniform float uRepulsionStrength;
uniform float uMouseActiveFactor;
uniform float uAutoCenterRepulsion;
uniform bool uTransparent;

varying vec2 vUv;

#define NUM_LAYER 4.0
#define STAR_COLOR_CUTOFF 0.2
#define MAT45 mat2(0.7071, -0.7071, 0.7071, 0.7071)
#define PERIOD 3.0

float Hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float tri(float x) {
  return abs(fract(x) * 2.0 - 1.0);
}

float tris(float x) {
  float t = fract(x);
  return 1.0 - smoothstep(0.0, 1.0, abs(2.0 * t - 1.0));
}

float trisn(float x) {
  float t = fract(x);
  return 2.0 * (1.0 - smoothstep(0.0, 1.0, abs(2.0 * t - 1.0))) - 1.0;
}

vec3 hsv2rgb(vec3 c) {
  vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

float Star(vec2 uv, float flare) {
  float d = length(uv);
  float m = (0.05 * uGlowIntensity) / d;
  float rays = smoothstep(0.0, 1.0, 1.0 - abs(uv.x * uv.y * 1000.0));
  m += rays * flare * uGlowIntensity;
  uv *= MAT45;
  rays = smoothstep(0.0, 1.0, 1.0 - abs(uv.x * uv.y * 1000.0));
  m += rays * 0.3 * flare * uGlowIntensity;
  m *= smoothstep(1.0, 0.2, d);
  return m;
}

vec3 StarLayer(vec2 uv) {
  vec3 col = vec3(0.0);

  vec2 gv = fract(uv) - 0.5;
  vec2 id = floor(uv);

  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 offset = vec2(float(x), float(y));
      vec2 si = id + vec2(float(x), float(y));
      float seed = Hash21(si);
      float size = fract(seed * 345.32);
      float glossLocal = tri(uStarSpeed / (PERIOD * seed + 1.0));
      float flareSize = smoothstep(0.9, 1.0, size) * glossLocal;

      float red = smoothstep(STAR_COLOR_CUTOFF, 1.0, Hash21(si + 1.0)) + STAR_COLOR_CUTOFF;
      float blu = smoothstep(STAR_COLOR_CUTOFF, 1.0, Hash21(si + 3.0)) + STAR_COLOR_CUTOFF;
      float grn = min(red, blu) * seed;
      vec3 base = vec3(red, grn, blu);

      float hue = atan(base.g - base.r, base.b - base.r) / (2.0 * 3.14159) + 0.5;
      hue = fract(hue + uHueShift / 360.0);
      float sat = length(base - vec3(dot(base, vec3(0.299, 0.587, 0.114)))) * uSaturation;
      float val = max(max(base.r, base.g), base.b);
      base = hsv2rgb(vec3(hue, sat, val));

      vec2 pad = vec2(tris(seed * 34.0 + uTime * uSpeed / 10.0), tris(seed * 38.0 + uTime * uSpeed / 30.0)) - 0.5;

      float star = Star(gv - offset - pad, flareSize);
      vec3 color = base;

      float twinkle = trisn(uTime * uSpeed + seed * 6.2831) * 0.5 + 1.0;
      twinkle = mix(1.0, twinkle, uTwinkleIntensity);
      star *= twinkle;

      col += star * size * color;
    }
  }

  return col;
}

void main() {
  vec2 focalPx = uFocal * uResolution.xy;
  vec2 uv = (vUv * uResolution.xy - focalPx) / uResolution.y;

  vec2 mouseNorm = uMouse - vec2(0.5);

  if (uAutoCenterRepulsion > 0.0) {
    vec2 centerUV = vec2(0.0, 0.0);
    float centerDist = length(uv - centerUV);
    vec2 repulsion = normalize(uv - centerUV) * (uAutoCenterRepulsion / (centerDist + 0.1));
    uv += repulsion * 0.05;
  } else if (uMouseRepulsion) {
    vec2 mousePosUV = (uMouse * uResolution.xy - focalPx) / uResolution.y;
    float mouseDist = length(uv - mousePosUV);
    vec2 repulsion = normalize(uv - mousePosUV) * (uRepulsionStrength / (mouseDist + 0.1));
    uv += repulsion * 0.05 * uMouseActiveFactor;
  } else {
    vec2 mouseOffset = mouseNorm * 0.1 * uMouseActiveFactor;
    uv += mouseOffset;
  }

  float autoRotAngle = uTime * uRotationSpeed;
  mat2 autoRot = mat2(cos(autoRotAngle), -sin(autoRotAngle), sin(autoRotAngle), cos(autoRotAngle));
  uv = autoRot * uv;

  uv = mat2(uRotation.x, -uRotation.y, uRotation.y, uRotation.x) * uv;

  vec3 col = vec3(0.0);

  for (float i = 0.0; i < 1.0; i += 1.0 / NUM_LAYER) {
    float depth = fract(i + uStarSpeed * uSpeed);
    float scale = mix(20.0 * uDensity, 0.5 * uDensity, depth);
    float fade = depth * smoothstep(1.0, 0.9, depth);
    col += StarLayer(uv * scale + i * 453.32) * fade;
  }

  if (uTransparent) {
    float alpha = length(col);
    alpha = smoothstep(0.0, 0.3, alpha);
    alpha = min(alpha, 1.0);
    gl_FragColor = vec4(col, alpha);
  } else {
    gl_FragColor = vec4(col, 1.0);
  }
}
`;

  const num = (el, name, dflt) => {
    const v = parseFloat(el.getAttribute(name));
    return Number.isFinite(v) ? v : dflt;
  };

  class GalaxyBg extends HTMLElement {
    connectedCallback() {
      if (this._booted) return;
      this._booted = true;

      const o = {
        focal: [0.5, 0.5],
        rotation: [1.0, 0.0],
        starSpeed: num(this, 'star-speed', 0.2),
        density: num(this, 'density', 1.2),
        hueShift: num(this, 'hue-shift', 140),
        speed: num(this, 'speed', 0.6),
        glowIntensity: num(this, 'glow', 0.25),
        saturation: num(this, 'saturation', 0),
        mouseRepulsion: true,
        twinkleIntensity: num(this, 'twinkle', 0.3),
        rotationSpeed: num(this, 'rotation-speed', 0.05),
        repulsionStrength: num(this, 'repulsion', 0.5),
        autoCenterRepulsion: 0,
        transparent: true
      };

      const canvas = document.createElement('canvas');
      canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block';
      this.appendChild(canvas);
      const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: false });
      if (!gl) return;

      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.clearColor(0, 0, 0, 0);

      const sh = (type, src) => {
        const s = gl.createShader(type);
        gl.shaderSource(s, src);
        gl.compileShader(s);
        return s;
      };
      const prog = gl.createProgram();
      gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
      gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
      gl.linkProgram(prog);
      gl.useProgram(prog);

      /* fullscreen triangle (same as ogl's Triangle) */
      const buf = (data, loc) => {
        const b = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, b);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
        gl.enableVertexAttribArray(loc);
        gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      };
      buf([-1, -1, 3, -1, -1, 3], gl.getAttribLocation(prog, 'position'));
      buf([0, 0, 2, 0, 0, 2], gl.getAttribLocation(prog, 'uv'));

      const U = {};
      ['uTime','uResolution','uFocal','uRotation','uStarSpeed','uDensity','uHueShift','uSpeed','uMouse',
       'uGlowIntensity','uSaturation','uMouseRepulsion','uTwinkleIntensity','uRotationSpeed',
       'uRepulsionStrength','uMouseActiveFactor','uAutoCenterRepulsion','uTransparent']
        .forEach(n => { U[n] = gl.getUniformLocation(prog, n); });

      gl.uniform2fv(U.uFocal, o.focal);
      gl.uniform2fv(U.uRotation, o.rotation);
      gl.uniform1f(U.uDensity, o.density);
      gl.uniform1f(U.uHueShift, o.hueShift);
      gl.uniform1f(U.uSpeed, o.speed);
      gl.uniform1f(U.uGlowIntensity, o.glowIntensity);
      gl.uniform1f(U.uSaturation, o.saturation);
      gl.uniform1i(U.uMouseRepulsion, o.mouseRepulsion ? 1 : 0);
      gl.uniform1f(U.uTwinkleIntensity, o.twinkleIntensity);
      gl.uniform1f(U.uRotationSpeed, o.rotationSpeed);
      gl.uniform1f(U.uRepulsionStrength, o.repulsionStrength);
      gl.uniform1f(U.uAutoCenterRepulsion, o.autoCenterRepulsion);
      gl.uniform1i(U.uTransparent, o.transparent ? 1 : 0);

      const resize = () => {
        const w = Math.max(1, this.offsetWidth), h = Math.max(1, this.offsetHeight);
        canvas.width = w; canvas.height = h;
        gl.viewport(0, 0, w, h);
        gl.uniform3f(U.uResolution, w, h, w / h);
      };
      addEventListener('resize', resize);
      resize();

      /* mouse — listened on the host section so the background layer can stay pointer-events:none */
      const host = this.closest('.proj-section') || this.parentElement || this;
      const tgt = { x: 0.5, y: 0.5, active: 0 };
      const cur = { x: 0.5, y: 0.5, active: 0 };
      host.addEventListener('mousemove', e => {
        const r = this.getBoundingClientRect();
        tgt.x = (e.clientX - r.left) / Math.max(1, r.width);
        tgt.y = 1 - (e.clientY - r.top) / Math.max(1, r.height);
        tgt.active = 1;
      }, { passive: true });
      host.addEventListener('mouseleave', () => { tgt.active = 0; });

      const loop = t => {
        requestAnimationFrame(loop);
        if (!this.offsetParent) return;              /* section hidden — skip rendering */
        if (canvas.width !== this.offsetWidth) resize();
        gl.uniform1f(U.uTime, t * 0.001);
        gl.uniform1f(U.uStarSpeed, (t * 0.001 * o.starSpeed) / 10.0);
        cur.x += (tgt.x - cur.x) * 0.05;
        cur.y += (tgt.y - cur.y) * 0.05;
        cur.active += (tgt.active - cur.active) * 0.05;
        gl.uniform2f(U.uMouse, cur.x, cur.y);
        gl.uniform1f(U.uMouseActiveFactor, cur.active);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      };
      requestAnimationFrame(loop);
    }
  }

  customElements.define('galaxy-bg', GalaxyBg);
})();
