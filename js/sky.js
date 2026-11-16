(function (Damy) {
  "use strict";

  // "Two Lights" — the persistent world behind the whole story.
  // A night of out-of-focus lights (everyone else: cool, distant, drifting) and two warm
  // lights (us). As the story moves, the two drift together, their slow pulses fall into
  // sync, they orbit at the end — and if you hold on long enough, they become one and
  // warm every other light in the world.
  const { WebGLRenderer, Scene, PerspectiveCamera, BufferGeometry, BufferAttribute, Points, Mesh, ShaderMaterial, AdditiveBlending, Color, Vector2, Vector3, } = THREE;

  const NIGHT = new Color("#0b0a0d");
  const FOV = 45;
  const CAM_Z = 10;

  const fieldVertex = /* glsl */ `
    uniform float uTime, uScroll, uFlow, uPR, uAspect, uTanHalf, uWarmth, uDim, uFocus, uScale;
    uniform vec2 uPointer;
    uniform vec3 uCool, uNeutral, uWarm;
    attribute vec3 aPos;
    attribute float aSeed, aSize, aTone;
    varying vec3 vColor;
    varying float vAlpha, vBlur;

    void main() {
      float z = aPos.z;
      float dist = ${CAM_Z.toFixed(1)} - z;
      float halfH = uTanHalf * dist * 1.1;
      float halfW = halfH * uAspect;
      float depthK = 12.0 / dist;               // nearer lights move faster: parallax

      vec2 n = aPos.xy;
      float sp = 0.5 + aSeed;
      n.x += sin(uTime * 0.045 * sp + aSeed * 40.0) * 0.025;
      n.y += cos(uTime * 0.038 * sp + aSeed * 17.0) * 0.025;
      n.y += uScroll * 0.14 * depthK;            // vertical scroll: lights pass by like a window
      n.x -= uFlow * depthK;                     // the drive: horizontal streaming
      n = mod(n + 1.0, 2.0) - 1.0;

      vec4 mv = modelViewMatrix * vec4(n.x * halfW, n.y * halfH, z, 1.0);
      gl_Position = projectionMatrix * mv;

      // Circle of confusion: out-of-focus lights grow into soft discs and lose energy.
      float coc = clamp(abs(dist - uFocus) / 15.0, 0.0, 1.0);
      vBlur = coc;

      vec2 ndc = gl_Position.xy / gl_Position.w;
      vec2 asp = vec2(uAspect, 1.0);
      float near = smoothstep(0.42, 0.0, distance(ndc * asp, uPointer * asp));

      float size = aSize * (1.0 + coc * coc * 7.0) * (uScale / dist);
      gl_PointSize = max(1.0, size * uPR * (1.0 + near * 0.3));

      float twinkle = 0.78 + 0.22 * sin(uTime * (0.5 + aSeed * 1.3) + aSeed * 90.0);
      float tone = mix(aTone, 1.0, uWarmth);
      vColor = tone < 0.5 ? mix(uCool, uNeutral, tone * 2.0) : mix(uNeutral, uWarm, tone * 2.0 - 1.0);
      float far = mix(0.35, 1.0, smoothstep(48.0, 14.0, dist));
      vAlpha = uDim * twinkle * far * (0.62 + near * 0.55) / (1.0 + coc * coc * 3.2);
    }
  `;

  const fieldFragment = /* glsl */ `
    varying vec3 vColor;
    varying float vAlpha, vBlur;
    void main() {
      vec2 c = gl_PointCoord - 0.5;
      float d = length(c) * 2.0;
      if (d > 1.0) discard;
      float sharp = exp(-d * d * 7.0);
      // Bokeh: a flat disc with a slightly brighter rim, like a lens wide open at night.
      float disc = smoothstep(1.0, 0.86, d) * (0.5 + 0.5 * smoothstep(0.45, 0.95, d));
      float a = mix(sharp, disc * 0.55, smoothstep(0.15, 0.7, vBlur));
      gl_FragColor = vec4(vColor, a * vAlpha);
    }
  `;

  const pairVertex = /* glsl */ `
    uniform vec3 uA, uB;
    uniform float uTime, uSync, uPR, uSize, uGlow, uMerge, uFreeze;
    attribute float aIdx;
    varying float vPulse, vIdx;
    void main() {
      vec3 p = aIdx < 0.5 ? uA : uB;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      // Two slow pulses, out of phase at first; uSync pulls them into the same rhythm.
      float phase = aIdx * (1.0 - uSync) * 2.7;
      float pulse = 0.5 + 0.5 * sin(uTime * 1.15 + phase);
      vPulse = mix(pulse, 0.6, uFreeze);
      vIdx = aIdx;
      gl_PointSize = uSize * uPR * (0.9 + vPulse * 0.16) * (1.0 + uMerge * 1.4) * uGlow;
    }
  `;

  const pairFragment = /* glsl */ `
    uniform float uGlow, uMerge;
    varying float vPulse, vIdx;
    void main() {
      vec2 c = gl_PointCoord - 0.5;
      float d = length(c) * 2.0;
      if (d > 1.0) discard;
      vec3 coreCol = vec3(1.0, 0.94, 0.84);
      vec3 haloCol = mix(vec3(0.96, 0.66, 0.36), vec3(0.97, 0.58, 0.42), vIdx);
      float core = exp(-d * d * 120.0) * 1.3;
      float halo = exp(-d * 5.2) * (0.34 + vPulse * 0.12);
      // A faint horizontal streak, like headlights through a phone lens.
      float streak = exp(-abs(c.y) * 150.0) * exp(-abs(c.x) * 5.0) * 0.22;
      float edge = smoothstep(1.0, 0.7, d);
      vec3 col = coreCol * core + haloCol * (halo + streak);
      float a = (core + halo + streak) * edge * uGlow * (1.0 + uMerge * 0.5);
      gl_FragColor = vec4(col / max(core + halo + streak, 1e-3), a);
    }
  `;

  const skyVertex = /* glsl */ `
    varying vec2 vUv;
    void main() { vUv = position.xy * 0.5 + 0.5; gl_Position = vec4(position.xy, 0.0, 1.0); }
  `;
  const skyFragment = /* glsl */ `
    uniform vec2 uMid;
    uniform float uAspect, uWarmth, uDim, uHaze;
    varying vec2 vUv;
    void main() {
      vec3 top = vec3(0.043, 0.039, 0.051);
      vec3 low = vec3(0.075, 0.062, 0.082);
      vec3 col = mix(low, top, smoothstep(0.0, 1.0, vUv.y));
      // A warm haze around the two of us; it grows as everything warms.
      vec2 p = (vUv * 2.0 - 1.0 - uMid) * vec2(uAspect, 1.0);
      float h = exp(-dot(p, p) * 1.6);
      col += vec3(0.16, 0.085, 0.04) * h * (0.35 + uWarmth * 0.9) * uHaze * uDim;
      // vignette
      vec2 v = vUv - 0.5;
      col *= 1.0 - dot(v, v) * 0.9;
      gl_FragColor = vec4(col, 1.0);
    }
  `;

  function supportsWebGL() {
    try {
      const c = document.createElement("canvas");
      return !!(c.getContext("webgl2") || c.getContext("webgl"));
    } catch {
      return false;
    }
  }

  function createSky(canvas, { reduce, story }) {
    const html = document.documentElement;
    if (!supportsWebGL()) {
      html.classList.add("no-webgl");
      return null;
    }

    let renderer;
    try {
      renderer = new WebGLRenderer({
        canvas,
        antialias: false,
        alpha: false,
        depth: false,
        stencil: false,
        powerPreference: "high-performance",
      });
    } catch (err) {
      console.warn("[sky] WebGL unavailable, using static fallback", err);
      html.classList.add("no-webgl");
      return null;
    }
    renderer.setClearColor(NIGHT, 1);

    const scene = new Scene();
    const camera = new PerspectiveCamera(FOV, 1, 0.1, 100);
    camera.position.z = CAM_Z;
    const tanHalf = Math.tan(((FOV / 2) * Math.PI) / 180);

    // ---------------------------------------------------------------- quality
    const small = Math.min(window.innerWidth, window.innerHeight) < 700;
    const weak = (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4;
    let maxPR = small ? 1.5 : 1.75;
    if (weak) maxPR = Math.min(maxPR, 1.25);
    const COUNT = Math.round((small ? 700 : 1600) * (weak ? 0.6 : 1));

    // ---------------------------------------------------------------- background
    const skyMat = new ShaderMaterial({
      vertexShader: skyVertex,
      fragmentShader: skyFragment,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        uMid: { value: new Vector2() },
        uAspect: { value: 1 },
        uWarmth: { value: 0 },
        uDim: { value: 1 },
        uHaze: { value: 0 },
      },
    });
    const quadGeo = new BufferGeometry();
    quadGeo.setAttribute("position", new BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3));
    const skyMesh = new Mesh(quadGeo, skyMat);
    skyMesh.frustumCulled = false;
    skyMesh.renderOrder = -1;
    scene.add(skyMesh);

    // ---------------------------------------------------------------- everyone
    const pos = new Float32Array(COUNT * 3);
    const seed = new Float32Array(COUNT);
    const size = new Float32Array(COUNT);
    const tone = new Float32Array(COUNT);
    for (let i = 0; i < COUNT; i++) {
      pos[i * 3] = Math.random() * 2 - 1;
      pos[i * 3 + 1] = Math.random() * 2 - 1;
      pos[i * 3 + 2] = -36 + Math.pow(Math.random(), 0.7) * 41; // -36 … 5
      seed[i] = Math.random();
      size[i] = 1 + Math.pow(Math.random(), 3) * 3.2;
      const r = Math.random();
      tone[i] = r < 0.62 ? Math.random() * 0.35 : r < 0.9 ? 0.35 + Math.random() * 0.3 : 0.7 + Math.random() * 0.3;
    }
    const fieldGeo = new BufferGeometry();
    // Positions are computed in the shader; a dummy position attribute keeps three.js happy.
    fieldGeo.setAttribute("position", new BufferAttribute(new Float32Array(COUNT * 3), 3));
    fieldGeo.setAttribute("aPos", new BufferAttribute(pos, 3));
    fieldGeo.setAttribute("aSeed", new BufferAttribute(seed, 1));
    fieldGeo.setAttribute("aSize", new BufferAttribute(size, 1));
    fieldGeo.setAttribute("aTone", new BufferAttribute(tone, 1));
    const fieldMat = new ShaderMaterial({
      vertexShader: fieldVertex,
      fragmentShader: fieldFragment,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      blending: AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uScroll: { value: 0 },
        uFlow: { value: 0 },
        uPR: { value: 1 },
        uAspect: { value: 1 },
        uTanHalf: { value: tanHalf },
        uWarmth: { value: 0 },
        uDim: { value: 0 },
        uFocus: { value: 24 },
        uScale: { value: 30 },
        uPointer: { value: new Vector2(9, 9) },
        uCool: { value: new Color("#7f97bd") },
        uNeutral: { value: new Color("#d9cbb8") },
        uWarm: { value: new Color("#f3a865") },
      },
    });
    const field = new Points(fieldGeo, fieldMat);
    field.frustumCulled = false;
    scene.add(field);

    // ---------------------------------------------------------------- us
    const pairGeo = new BufferGeometry();
    pairGeo.setAttribute("position", new BufferAttribute(new Float32Array(6), 3));
    pairGeo.setAttribute("aIdx", new BufferAttribute(new Float32Array([0, 1]), 1));
    const pairMat = new ShaderMaterial({
      vertexShader: pairVertex,
      fragmentShader: pairFragment,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      blending: AdditiveBlending,
      uniforms: {
        uA: { value: new Vector3() },
        uB: { value: new Vector3() },
        uTime: { value: 0 },
        uSync: { value: 0 },
        uPR: { value: 1 },
        uSize: { value: 140 },
        uGlow: { value: 0 },
        uMerge: { value: 0 },
        uFreeze: { value: reduce ? 1 : 0 },
      },
    });
    const pair = new Points(pairGeo, pairMat);
    pair.frustumCulled = false;
    pair.renderOrder = 2;
    scene.add(pair);

    // ---------------------------------------------------------------- state
    const live = { ...story.target }; // damped copy of the story target
    const extra = { intro: 0, hold: 0, merge: 0 }; // driven by GSAP from the outside
    const pointer = { x: 9, y: 9, tx: 9, ty: 9 };
    let W = 1, H = 1, aspect = 1, halfH = tanHalf * CAM_Z, halfW = halfH;
    let lastScroll = window.scrollY;
    let flow = 0;
    let theta = 0;
    let time = reduce ? 14 : 0;
    let running = true;
    let frames = 0, slowFrames = 0, downgraded = false;

    function resize() {
      W = canvas.clientWidth || window.innerWidth;
      H = canvas.clientHeight || window.innerHeight;
      aspect = W / H;
      const pr = Math.min(window.devicePixelRatio || 1, downgraded ? 1 : maxPR);
      renderer.setPixelRatio(pr);
      renderer.setSize(W, H, false);
      camera.aspect = aspect;
      camera.updateProjectionMatrix();
      halfH = tanHalf * CAM_Z;
      halfW = halfH * aspect;
      fieldMat.uniforms.uPR.value = pr;
      fieldMat.uniforms.uAspect.value = aspect;
      fieldMat.uniforms.uScale.value = Math.max(22, Math.min(40, H / 26));
      pairMat.uniforms.uPR.value = pr;
      pairMat.uniforms.uSize.value = Math.max(110, Math.min(220, Math.min(W, H) * 0.24));
      skyMat.uniforms.uAspect.value = aspect;
      story.refresh();
      render(0);
    }

    function onPointer(e) {
      if (e.pointerType === "touch") return;
      pointer.tx = (e.clientX / W) * 2 - 1;
      pointer.ty = -(e.clientY / H) * 2 + 1;
    }
    function onLeave() {
      pointer.tx = 9;
      pointer.ty = 9;
    }

    // Projects one of the lights to CSS pixels (used to centre the dawn glow).
    function screenOf(which = "mid") {
      const u = pairMat.uniforms;
      const v = which === "a" ? u.uA.value : which === "b" ? u.uB.value : u.uA.value.clone().add(u.uB.value).multiplyScalar(0.5);
      return { x: ((v.x / halfW) * 0.5 + 0.5) * W, y: (0.5 - (v.y / halfH) * 0.5) * H };
    }

    function render(dt) {
      const s = story.update(window.scrollY);
      // Damped follow: the lights glide rather than snap, even on a fast flick.
      const k = reduce ? 1 : 1 - Math.pow(0.0015, dt || 0.016);
      for (const key in s) live[key] += (s[key] - live[key]) * k;

      const dy = window.scrollY - lastScroll;
      lastScroll = window.scrollY;
      if (!reduce) {
        flow += (dy / H) * 0.22 * live.flow;
        time += dt;
      }
      pointer.x += (pointer.tx - pointer.x) * 0.08;
      pointer.y += (pointer.ty - pointer.y) * 0.08;

      const dim = live.dim * extra.intro;
      const merge = extra.merge;
      const warmth = Math.min(1, live.warmth + merge * 0.85);

      // Positions of the two lights.
      theta += (dt || 0) * (0.32 + extra.hold * 1.4 + merge * 2.2) * (reduce ? 0 : 1);
      const mx = (live.ax + live.bx) / 2, my = (live.ay + live.by) / 2;
      const hx = (live.ax - live.bx) / 2, hy = (live.ay - live.by) / 2;
      const orbit = live.orbit;
      const r = live.radius * (1 - extra.hold * 0.55) * (1 - merge);
      const ox = Math.cos(theta) * r * orbit, oy = Math.sin(theta) * r * orbit * aspect * 0.55;
      const ax = mx + hx * (1 - orbit) + ox, ay = my + hy * (1 - orbit) + oy;
      const bx = mx - hx * (1 - orbit) - ox, by = my - hy * (1 - orbit) - oy;
      // A tiny independent float so they never feel mechanical.
      const fa = reduce ? 0 : Math.sin(time * 0.6) * 0.012, fb = reduce ? 0 : Math.cos(time * 0.52 + 1) * 0.012;
      pairMat.uniforms.uA.value.set((ax + fa) * halfW, (ay + fb) * halfH, 0);
      pairMat.uniforms.uB.value.set((bx - fb) * halfW, (by + fa) * halfH, 0);

      pairMat.uniforms.uTime.value = time;
      pairMat.uniforms.uSync.value = Math.min(1, live.sync + extra.hold * 0.5 + merge);
      pairMat.uniforms.uGlow.value = Math.min(extra.intro * 1.15, 1) * (0.25 + 0.75 * live.dim) * (1 + extra.hold * 0.25);
      pairMat.uniforms.uMerge.value = merge;

      fieldMat.uniforms.uTime.value = time;
      fieldMat.uniforms.uScroll.value = reduce ? 0 : window.scrollY / H;
      fieldMat.uniforms.uFlow.value = flow;
      fieldMat.uniforms.uDim.value = dim * (1 + merge * 0.35);
      fieldMat.uniforms.uWarmth.value = warmth;
      fieldMat.uniforms.uPointer.value.set(pointer.x, pointer.y);

      skyMat.uniforms.uMid.value.set(mx, my);
      skyMat.uniforms.uWarmth.value = warmth;
      skyMat.uniforms.uDim.value = Math.max(dim, 0.0001);
      skyMat.uniforms.uHaze.value = extra.intro;

      // Nothing to draw while the letter's paper fully covers the night.
      if (dim < 0.002 && live.dim < 0.002) return;
      renderer.render(scene, camera);
    }

    function tick(_t, deltaMs) {
      if (!running) return;
      const dt = Math.min(deltaMs / 1000, 0.05);
      render(dt);
      // Adaptive quality: if the device struggles, drop resolution and density once.
      if (!downgraded && extra.intro > 0.99) {
        frames++;
        if (deltaMs > 24) slowFrames++;
        if (frames === 150) {
          if (slowFrames > 60) {
            downgraded = true;
            fieldGeo.setDrawRange(0, Math.floor(COUNT * 0.55));
            resize();
          }
        }
      }
    }

    // ---------------------------------------------------------------- lifecycle
    let resizeRaf = 0;
    const onResize = () => {
      cancelAnimationFrame(resizeRaf);
      resizeRaf = requestAnimationFrame(resize);
    };
    window.addEventListener("resize", onResize);
    window.addEventListener("pointermove", onPointer, { passive: true });
    document.addEventListener("pointerleave", onLeave);
    canvas.addEventListener("webglcontextlost", (e) => {
      e.preventDefault();
      running = false;
      html.classList.add("no-webgl");
    });
    canvas.addEventListener("webglcontextrestored", () => {
      html.classList.remove("no-webgl");
      running = true;
      resize();
    });

    resize();
    gsap.ticker.add(tick);

    function destroy() {
      gsap.ticker.remove(tick);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointermove", onPointer);
      document.removeEventListener("pointerleave", onLeave);
      fieldGeo.dispose();
      fieldMat.dispose();
      pairGeo.dispose();
      pairMat.dispose();
      quadGeo.dispose();
      skyMat.dispose();
      renderer.dispose();
    }

    return { extra, screenOf, resize, destroy };
  }

  Damy.createSky = createSky;
})((window.Damy = window.Damy || {}));
