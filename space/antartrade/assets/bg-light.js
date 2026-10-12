// Background light, ported from linearity.io (WebGLBackgroundCore): two soft colour fields
// (a cool accent and a layered main glow) drifting and rippling through a warped space.
// Same shader and settings as the reference, our colours.
(function () {
  const VERT = `
  attribute vec2 a_position;
  varying vec2 vUv;
  void main() {
    vUv = a_position * 0.5 + 0.5;
    gl_Position = vec4(a_position, 0.0, 1.0);
  }`;
  const FRAG = `
  precision highp float;
  varying vec2 vUv;
  uniform float u_time;
  uniform vec2 u_resolution;
  uniform float u_pulse;
  uniform float u_activeProgress;
  uniform float u_blendAmount;
  uniform vec3 u_c0;
  uniform vec3 u_c1;
  uniform vec3 u_c2;
  uniform vec3 u_c3;
  uniform vec3 u_hot;
  uniform vec2 u_colorWeights;
  uniform float u_maskSoftness;
  uniform float u_coldEdgeBleed;
  uniform float u_warmEdgeBleed;
  uniform float u_internalBlend;
  uniform float u_hotspotBlend;
  uniform float u_colorCurve;
  uniform float u_seed;
  uniform float u_waveAmplitude;
  uniform float u_waveAngle;
  uniform float u_waveFreqX;
  uniform float u_waveFreqY;
  uniform float u_waveSpeed;

  #define S(a,b,t) smoothstep(a,b,t)
  mat2 Rot(float a) { float s = sin(a), c = cos(a); return mat2(c, -s, s, c); }
  vec2 hash(vec2 p) {
    float s = u_seed;
    vec2 k1 = vec2(2127.1 + s * 13.37, 81.17 + s * 7.31);
    vec2 k2 = vec2(1269.5 + s * 11.13, 283.37 + s * 5.79);
    p = vec2(dot(p, k1), dot(p, k2));
    return fract(sin(p) * (43758.5453 + s * 1.618));
  }
  float noise(in vec2 p) {
    vec2 i = floor(p); vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    float n = mix(
      mix(dot(-1.0 + 2.0 * hash(i), f), dot(-1.0 + 2.0 * hash(i + vec2(1.0, 0.0)), f - vec2(1.0, 0.0)), u.x),
      mix(dot(-1.0 + 2.0 * hash(i + vec2(0.0, 1.0)), f - vec2(0.0, 1.0)), dot(-1.0 + 2.0 * hash(i + vec2(1.0, 1.0)), f - vec2(1.0, 1.0)), u.x),
      u.y);
    return 0.5 + 0.5 * n;
  }
  float seedF(float base) { return base * (1.0 + 0.5 * sin(u_seed * 3.17 + base)); }
  vec2 warpUV(vec2 uv) {
    float tx = u_time * u_waveSpeed * u_waveFreqX;
    float angleOffset = sin(u_seed * 2.73) * 30.0;
    vec2 ruv = Rot(radians(u_waveAngle + angleOffset)) * uv;
    float fxMod = seedF(u_waveFreqX);
    float fyMod = seedF(u_waveFreqY);
    float phaseX = fract(sin(u_seed * 7.19) * 437.58) * 6.2832;
    float phaseY = fract(cos(u_seed * 3.41) * 291.37) * 6.2832;
    float harmonic = sin(u_seed * 1.23) * 0.5;
    float a = fyMod * ruv.y - sin(ruv.x * fxMod + ruv.y - tx + phaseX);
    a += harmonic * sin(ruv.x * fxMod * 2.0 + ruv.y * 0.5 + tx * 0.7 + phaseY);
    a = smoothstep(cos(a) * u_maskSoftness, sin(a) * u_maskSoftness + 3.0, cos(a - fyMod * ruv.y) - sin(a - fxMod * ruv.x));
    a *= u_waveAmplitude * (1.0 + u_activeProgress * 0.35);
    return cos(a) * uv + sin(a) * vec2(-uv.y, uv.x);
  }
  float channel(vec2 uvc, vec2 p1, vec2 p2, float rO, float rM, float rC, float rH, float cold, float outer, float mid, float core, float hot) {
    float d1 = length(uvc - p1), d2 = length(uvc - p2);
    float wT = pow(S(u_colorWeights.x + u_coldEdgeBleed, u_colorWeights.x - u_coldEdgeBleed, d1), u_colorCurve);
    float wO = pow(S(rO + u_warmEdgeBleed, rO - u_warmEdgeBleed, d2), u_colorCurve);
    float wM = pow(S(rM + u_internalBlend, rM - u_internalBlend, d2), u_colorCurve);
    float wC = pow(S(rC + u_internalBlend, rC - u_internalBlend, d2), u_colorCurve);
    float wH = pow(S(rH + u_hotspotBlend, 0.0, d2), u_colorCurve);
    float v = 0.0;
    v = mix(v, outer, wO); v = mix(v, mid, wM); v = mix(v, core, wC);
    v = mix(v, hot, wH * 0.85); v = mix(v, cold, wT);
    return v;
  }
  void main() {
    float magnify = 1.0 - sin(u_pulse * 3.14159) * 0.15;
    vec2 zoomedUv = (vUv - 0.5) * magnify + 0.5;
    if (u_activeProgress > 0.0) { vec2 d = zoomedUv - 0.5; zoomedUv = 0.5 + d * (1.0 - u_activeProgress * 0.35 * dot(d, d)); }
    vec2 fragCoord = zoomedUv * u_resolution;
    vec2 uv = fragCoord / u_resolution.xy;
    float ratio = u_resolution.x / u_resolution.y;
    float t = u_time * u_waveSpeed;
    vec2 tuv = uv - 0.5;
    vec2 seedShift = vec2(sin(u_seed * 4.37), cos(u_seed * 5.91)) * 100.0;
    float degree = noise(vec2(t * 0.1, tuv.x * tuv.y) + seedShift);
    tuv.y *= 1.0 / ratio;
    tuv *= Rot(radians((degree - 0.5) * 720.0 + 180.0));
    tuv.y *= ratio;
    vec2 uv2 = (fragCoord * 2.0 - u_resolution.xy) / (u_resolution.x + u_resolution.y) * 2.0;
    uv2 *= Rot(fract(sin(u_seed * 5.63) * 173.29) * 6.2832);
    vec2 warped = warpUV(uv2) * 0.5 + 0.5;
    vec2 blendUV = mix(tuv, warped - 0.5, u_blendAmount);
    float timeAnim = u_time * 0.2;
    // our own path: the two glows orbit against each other and drift closer and further apart
    float breathe = 1.0 + 0.18 * sin(u_time * 0.35);
    vec2 p1 = vec2(-0.45, 0.3) * breathe * Rot(sin(u_seed * 1.83) - timeAnim * 0.7);
    vec2 p2 = vec2(0.35, -0.45) * (2.0 - breathe) * Rot(cos(u_seed * 2.47) + timeAnim * 0.55 + 0.4 * sin(u_time * 0.21));
    float w = u_colorWeights.y;
    float rO = w, rM = w * 0.75, rC = w * 0.55, rH = w * 0.30;
    float shift = u_activeProgress * 0.018;
    vec3 col = vec3(
      channel(blendUV - vec2(shift, 0.0), p1, p2, rO, rM, rC, rH, u_c0.r, u_c1.r, u_c2.r, u_c3.r, u_hot.r),
      channel(blendUV, p1, p2, rO, rM, rC, rH, u_c0.g, u_c1.g, u_c2.g, u_c3.g, u_hot.g),
      channel(blendUV + vec2(shift, 0.0), p1, p2, rO, rM, rC, rH, u_c0.b, u_c1.b, u_c2.b, u_c3.b, u_hot.b));
    col = mix(col, col * col + 0.5 * sqrt(col), 0.3 + u_activeProgress * 0.15);
    gl_FragColor = vec4(col, 1.0);
  }`;

  // Same settings as the reference ("default" scenario)
  const P = {blendAmount: .3, colorWeights: [.2, .36], maskSoftness: .8, coldEdgeBleed: .4, warmEdgeBleed: .5, internalBlend: .25,
    hotspotBlend: .33, colorCurve: 1.28, seed: 17, waveAmplitude: 2.6, waveAngle: -35, waveFreqX: .35, waveFreqY: 2.8, waveSpeed: 3.2};

  // colors: [cool accent, outer glow, middle band, core, hotspot]
  window.startBgLight = function (canvas, colors) {
    const gl = canvas.getContext('webgl', {alpha: false, antialias: false});
    if (!gl) return null;
    const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255);
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(s)); return s; };
    const p = gl.createProgram();
    gl.attachShader(p, sh(gl.VERTEX_SHADER, VERT)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, FRAG));
    gl.bindAttribLocation(p, 0, 'a_position'); gl.linkProgram(p); gl.useProgram(p);
    const u = n => gl.getUniformLocation(p, n);
    const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    ['u_c0', 'u_c1', 'u_c2', 'u_c3', 'u_hot'].forEach((n, i) => gl.uniform3fv(u(n), rgb(colors[i])));
    gl.uniform2fv(u('u_colorWeights'), P.colorWeights);
    for (const k of ['blendAmount', 'coldEdgeBleed', 'warmEdgeBleed', 'internalBlend', 'hotspotBlend', 'colorCurve', 'seed', 'waveAmplitude', 'waveAngle', 'waveFreqX', 'waveFreqY', 'waveSpeed'])
      gl.uniform1f(u('u_' + k), P[k]);
    const uTime = u('u_time'), uRes = u('u_resolution'), uPulse = u('u_pulse'), uActive = u('u_activeProgress'), uSoft = u('u_maskSoftness');

    function resize() {
      canvas.width = Math.max(1, Math.floor(canvas.clientWidth));
      canvas.height = Math.max(1, Math.floor(canvas.clientHeight));
      gl.viewport(0, 0, canvas.width, canvas.height);
    }
    resize();

    // energy stands in for the reference's scroll velocity: it speeds the light up and loosens the mask
    const state = {energy: 0, pulse: 0, active: 0};
    let acc = 0, last = 0;
    function frame(now) {
      requestAnimationFrame(frame);
      const dt = last ? Math.min(.1, (now - last) / 1000) : .016; last = now;
      state.energy *= Math.pow(.05, dt);
      acc += dt + state.energy * .0015;
      gl.uniform1f(uTime, acc * .4);
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uPulse, state.pulse);
      gl.uniform1f(uActive, state.active);
      gl.uniform1f(uSoft, P.maskSoftness + Math.min(state.energy * .05, .3));
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
    requestAnimationFrame(frame);

    return {
      state, resize,
      kick(v) { state.energy = Math.max(state.energy, v); },
      // zoom in and out once, like the reference's pulse
      pulse() { const s = performance.now(); const step = n => { const k = Math.min(1, (n - s) / 1500); state.pulse = k; if (k < 1) requestAnimationFrame(step); else state.pulse = 0; }; requestAnimationFrame(step); },
    };
  };
})();
