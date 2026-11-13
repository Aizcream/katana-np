/* scene3d.js — kit family "scene3d": REAL 3D inside a Katana film (three.js r170, engine/vendor/three.katana.js).
   K.kit.scene3d(parent, opts) → component { el, update(lt), prepare(lt), project(p), ctx, scene, camera, state }
   K.three.*                  → deterministic helpers: materials, geometry, cables, instance floods (+ pile recipe), particles,
                                LED dot-matrix panels, sticker labels, textured cards, contact shadows, keyed tracks.
   Docs: engine/kit/docs/scene3d.md · Demo: engine/demos/scene3d.html

   How it stays deterministic and capture-safe
     · ONE WebGLRenderer for the whole page (an off-DOM canvas); every component owns a 2D <canvas> and receives its frame
       with drawImage right after the synchronous render inside update(lt) — the pixels exist when __seek resolves.
     · Every frame is rebuilt from lt: camera rig → frame(lt) → updaters (instances, particles, cables, LED panels) → render.
       Nothing is integrated between frames; randomness comes from K.three.rnd(i, k, seed) (integer hash).
     · Geometry that moves (instances, cables, particles) is never frustum-culled and carries a fixed bounding sphere (three
       caches one from the first frame it draws and sorts blended objects by its centre).
     · Texture canvases (labels, cards, atlases, LED panels) are CPU-backed: GPU canvases rasterise text through a glyph
       cache whose state depends on what the tab drew before.
     · Fonts and images needed by labels/cards are awaited in prepare() before the first frame that shows them.
     Verified: the WebGL frame is bit-identical for any seek history (gl.readPixels hash), GPU raster and KATANA_CPU_RASTER=1. */
(function () {
  const K = window.K, T = window.THREE;
  const N3 = K.three = { THREE: T };
  if (!T) {
    K.kit.scene3d = (parent) => { K.errors.push('scene3d: engine/vendor/three.katana.js is not loaded (add its <script> before kit/scene3d.js)');
      return { el: K.div(parent, 'display:none'), update() {}, project: () => ({ x: 0, y: 0, visible: false, scale: 0, depth: 0 }) }; };
    return;
  }
  const V3 = T.Vector3, DEG = Math.PI / 180, TAU = Math.PI * 2, { clamp, lerp, E } = K;
  const col = (c) => (c && c.isColor ? c : new T.Color(c));
  // Moving geometry gets a FIXED bounding sphere. three computes one lazily from the first frame it draws and keeps it; its
  // centre is the depth-sort key, so the draw order of blended objects depended on which frame a tab rendered first.
  const fixedSphere = () => new T.Sphere(new V3(0, 0, 0), Infinity);
  const v3 = (p, out = new V3()) => { if (p == null) return out.set(0, 0, 0); if (p.isVector3) return out.copy(p); if (p.isObject3D) return p.getWorldPosition(out); if (typeof p === 'function') return v3(p(), out); return out.set(p[0], p[1], p[2] || 0); };
  // integer hash → [0,1): the kit's random source. rnd(i, k, seed): i = element index, k = channel, seed = recipe seed.
  const rnd = N3.rnd = (i, k = 0, seed = 0) => {
    let x = (Math.imul(i + 1, 0x9E3779B1) ^ Math.imul(k + 1, 0x85EBCA77) ^ Math.imul(seed + 1, 0xC2B2AE3D)) >>> 0;
    x ^= x >>> 15; x = Math.imul(x, 0x2C1B3C6D); x ^= x >>> 12; x = Math.imul(x, 0x297A2D39); x ^= x >>> 15; return (x >>> 0) / 4294967296;
  };

  /* ================================================================ renderer (one per page) */
  let RR = null, RFAIL = false;
  const getR = () => {
    if (RR || RFAIL) return RR;
    try { RR = new T.WebGLRenderer({ canvas: document.createElement('canvas'), antialias: true, alpha: true, premultipliedAlpha: true, stencil: false, powerPreference: 'high-performance' }); }
    catch (e) { RFAIL = true; K.errors.push('scene3d: WebGL is not available — ' + e.message); return null; }
    RR.setPixelRatio(1); RR.outputColorSpace = T.SRGBColorSpace; RR.setClearColor(0x000000, 0);
    RR.shadowMap.enabled = true; RR.shadowMap.type = T.PCFShadowMap;   // the PCF branch is replaced by the soft shadow below
    RR.domElement.addEventListener('webglcontextlost', () => K.errors.push('scene3d: WebGL context lost'));
    return RR;
  };
  N3.renderer = getR;
  const TONES = { neutral: T.NeutralToneMapping, aces: T.ACESFilmicToneMapping, agx: T.AgXToneMapping, reinhard: T.ReinhardToneMapping, none: T.NoToneMapping };

  // Soft shadows from a big light: blocker search + percentage-closer filtering whose radius grows with the distance
  // between occluder and receiver (sharp at the contact, soft far away). Sample pattern = golden-angle disc rotated per
  // pixel by interleaved-gradient noise of gl_FragCoord (a pure function of the pixel, so frames stay repeatable).
  // light.shadow.radius = penumbra growth (texels per unit of normalised shadow depth); the light rigs compute it.
  (function patchShadows() {
    const C = T.ShaderChunk, src = C.shadowmap_pars_fragment, a = src.indexOf('float getShadow('), b = src.indexOf('vec2 cubeToUV(');
    if (a < 0 || b < a) return;
    C.shadowmap_pars_fragment = src.slice(0, a) + `
	float k3ign( vec2 p ) { return fract( 52.9829189 * fract( dot( p, vec2( 0.06711056, 0.00583715 ) ) ) ); }
	float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
		shadowCoord.xyz /= shadowCoord.w;
		shadowCoord.z += shadowBias;
		bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
		if ( ! ( inFrustum && shadowCoord.z <= 1.0 ) ) return 1.0;
		vec2 texel = 1.0 / shadowMapSize;
		float zr = shadowCoord.z;
		float rot = k3ign( gl_FragCoord.xy ) * 6.2831853;
		float maxR = shadowMapSize.x * 0.016;
		float zb = 0.0, nb = 0.0;
		for ( int i = 0; i < 14; i ++ ) {
			float fi = float( i ) + 0.5;
			float ang = fi * 2.39996323 + rot;
			float d = unpackRGBAToDepth( texture2D( shadowMap, shadowCoord.xy + vec2( cos( ang ), sin( ang ) ) * sqrt( fi / 14.0 ) * maxR * 0.75 * texel ) );
			if ( d < zr ) { zb += d; nb += 1.0; }
		}
		if ( nb < 0.5 ) return 1.0;
		float pr = clamp( ( zr - zb / nb ) * shadowRadius, 1.25, maxR );
		float lit = 0.0;
		for ( int i = 0; i < 28; i ++ ) {
			float fi = float( i ) + 0.5;
			float ang = fi * 2.39996323 + rot;
			lit += texture2DCompare( shadowMap, shadowCoord.xy + vec2( cos( ang ), sin( ang ) ) * sqrt( fi / 28.0 ) * pr * texel, zr );
		}
		return mix( 1.0, lit / 28.0, shadowIntensity );
	}
	` + src.slice(b);
  })();

  /* ================================================================ textures, fonts, async registry */
  // Fonts/images that were not ready at build time: their promises are awaited by every scene3d component's prepare(),
  // so capture never grabs a label drawn with a fallback font or a card without its picture.
  const PEND = []; let FL = Promise.resolve();
  const flush = () => { if (PEND.length) FL = Promise.all([FL, ...PEND.splice(0)]).catch((e) => { K.errors.push('scene3d: ' + e.message); }); return FL; };
  // Texture-source canvases are CPU-backed (willReadFrequently): a GPU canvas rasterises its text lazily through Skia's glyph
  // cache, whose state depends on what the tab drew before — the uploaded label could differ by one grey level per history.
  const CPU2D = { willReadFrequently: true };
  const canvas = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; };
  const canvasTex = N3.canvasTexture = (cv) => { const t = new T.CanvasTexture(cv); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 16; t.generateMipmaps = true; t.minFilter = T.LinearMipmapLinearFilter; t.magFilter = T.LinearFilter; return t; };
  const needFont = (spec, sample, then) => {   // true when the face is usable now; otherwise loads it and calls then()
    let ok = false; try { ok = document.fonts.check(spec, sample); } catch (e) { ok = true; }
    if (!ok) PEND.push(document.fonts.load(spec, sample).then(then, then));
    return ok;
  };

  /* ================================================================ materials */
  // Photographic defaults: nothing perfectly rough or perfectly sharp, a clear coat on plastics so big soft lights read.
  const phys = (base) => (color = '#ffffff', o = {}) => new T.MeshPhysicalMaterial(Object.assign({ color: col(color) }, base, o));
  N3.mat = {
    plastic: phys({ roughness: .34, metalness: 0, clearcoat: .5, clearcoatRoughness: .25 }),          // injection-moulded, satin
    gloss: phys({ roughness: .2, metalness: 0, clearcoat: 1, clearcoatRoughness: .07 }),              // candy / piano gloss
    clay: phys({ roughness: .9, metalness: 0, sheen: .25, sheenRoughness: .8 }),                      // matte, soft
    matte: phys({ roughness: .78, metalness: 0 }),
    rubber: (color = '#1c1d22', o = {}) => new T.MeshPhysicalMaterial(Object.assign({ color: col(color), roughness: .96, metalness: 0, sheen: .4, sheenRoughness: .6, sheenColor: col('#5a5f6a') }, o)),
    chrome: (color = '#ffffff', o = {}) => new T.MeshStandardMaterial(Object.assign({ color: col(color), roughness: .07, metalness: 1 }, o)),
    metal: (color = '#c9ccd2', o = {}) => new T.MeshStandardMaterial(Object.assign({ color: col(color), roughness: .36, metalness: 1 }, o)),   // brushed
    emissive: (color = '#ffffff', intensity = 1.4, o = {}) => new T.MeshStandardMaterial(Object.assign({ color: col('#000000'), emissive: col(color), emissiveIntensity: intensity, roughness: .6 }, o)),
    screen: (map = null, o = {}) => new T.MeshPhysicalMaterial(Object.assign({ color: col('#040405'), roughness: .22, clearcoat: 1, clearcoatRoughness: .1, emissive: col('#ffffff'), emissiveMap: map, emissiveIntensity: 1 }, o)),
    shadow: (opacity = .3, color = '#000000') => new T.ShadowMaterial({ opacity, color: col(color) }),   // invisible floor that only shows shadows
  };

  /* ================================================================ geometry */
  N3.rbox = (w = 1, h = 1, d = 1, r = .1, seg = 5) => new T.RoundedBoxGeometry(w, h, d, seg, Math.min(r, w / 2, h / 2, d / 2));
  const axisRot = (g, axis) => { if (axis === 'x') g.rotateZ(-Math.PI / 2); else if (axis === 'z') g.rotateX(Math.PI / 2); return g; };
  N3.pill = (r = .25, len = 1, { axis = 'y', seg = 10, radial = 28 } = {}) => axisRot(new T.CapsuleGeometry(r, Math.max(1e-4, len - 2 * r), seg, radial), axis);
  // disc / coin / knob with a rounded rim. Top face (+axis) has planar UVs 0–1 (for prints); the rest maps to a corner texel.
  N3.disc = (r = .5, h = .2, { bevel = null, seg = 40, dish = 0, axis = 'y' } = {}) => {
    const b = Math.min(bevel == null ? h * .38 : bevel, h / 2 - 1e-4, r - 1e-4), pts = [new T.Vector2(0, -h / 2)], n = 6;
    for (let k = 0; k <= n; k++) { const a = -Math.PI / 2 + Math.PI / 2 * k / n; pts.push(new T.Vector2(r - b + b * Math.cos(a), -h / 2 + b + b * Math.sin(a))); }
    for (let k = 0; k <= n; k++) { const a = Math.PI / 2 * k / n; pts.push(new T.Vector2(r - b + b * Math.cos(a), h / 2 - b + b * Math.sin(a))); }
    pts.push(new T.Vector2(0, h / 2 - dish));
    const g = new T.LatheGeometry(pts, seg), P = g.attributes.position, Nn = g.attributes.normal, U = g.attributes.uv;
    for (let i = 0; i < P.count; i++) { if (P.getY(i) > h / 2 - b * .5 - dish - 1e-6) U.setXY(i, P.getX(i) / (2 * r) + .5, .5 - P.getZ(i) / (2 * r)); else U.setXY(i, .004, .004); }
    g.normalizeNormals(); void Nn;   // LatheGeometry leaves the normal on the axis un-normalised
    return axisRot(g, axis);
  };
  N3.ring = (R = 1, r = .08, { axis = 'y', seg = 72, radial = 16 } = {}) => { const g = new T.TorusGeometry(R, r, radial, seg); if (axis === 'y') g.rotateX(Math.PI / 2); else if (axis === 'x') g.rotateY(Math.PI / 2); return g; };
  // rounded-rectangle slab facing +z, centred, planar UVs over w×h. Material slots: 0 = back, 1 = sides, 2 = front.
  N3.slab = (w = 1, h = 1, r = .1, depth = .05, bevel = null) => {
    r = Math.max(1e-4, Math.min(r, w / 2 - 1e-4, h / 2 - 1e-4)); const bv = Math.min(bevel == null ? depth * .3 : bevel, depth / 2 - 1e-5, r * .9);
    const s = new T.Shape(), x = -w / 2, y = -h / 2, q = Math.PI / 2;
    s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.absarc(x + w - r, y + r, r, -q, 0, false); s.lineTo(x + w, y + h - r); s.absarc(x + w - r, y + h - r, r, 0, q, false);
    s.lineTo(x + r, y + h); s.absarc(x + r, y + h - r, r, q, 2 * q, false); s.lineTo(x, y + r); s.absarc(x + r, y + r, r, 2 * q, 3 * q, false);
    const inner = Math.max(1e-4, depth - 2 * bv);
    const g = new T.ExtrudeGeometry(s, { depth: inner, bevelEnabled: bv > 1e-5, bevelThickness: bv, bevelSize: bv, bevelOffset: -bv, bevelSegments: 3, curveSegments: 10 });
    g.translate(0, 0, -inner / 2);
    const P = g.attributes.position, U = g.attributes.uv;
    for (let i = 0; i < P.count; i++) U.setXY(i, clamp(P.getX(i) / w + .5), clamp(P.getY(i) / h + .5));
    const lid = g.groups[0], side = g.groups[1], half = lid.count / 2, backFirst = P.getZ(lid.start) < 0;
    g.clearGroups(); g.addGroup(lid.start, half, backFirst ? 0 : 2); g.addGroup(lid.start + half, half, backFirst ? 2 : 0); if (side) g.addGroup(side.start, side.count, 1);
    return g;
  };

  /* ================================================================ keyed tracks (camera rig and anything else) */
  // K.three.track(keys, prop, def) → (t) => number[]. keys = [{ t, [prop]: number | [..], ease?, hold? }, …] sorted by t.
  // Default: a velocity-continuous spline through the keys (it never stops at a key). `ease` on a key = pose-to-pose
  // (straight, K.E.*) for the segment INTO that key; `hold: true` = zero speed at that key. Outside the keyed range the
  // value keeps drifting with the end velocity for up to 2 s (cuts and transitions never see a frozen camera).
  const dEase = (e, end) => clamp(end ? (e(1) - e(.999)) / .001 : (e(.001) - e(0)) / .001, 0, 8);
  N3.track = (keys, prop, def = 0) => {
    let last = def; const ks = [];
    for (const k of keys) { let v = k[prop]; if (v == null) v = last; last = v; ks.push({ t: k.t, v: Array.isArray(v) ? v.slice() : v && v.isVector3 ? [v.x, v.y, v.z] : [v], ease: k.ease || null, hold: !!k.hold }); }
    const n = ks.length, dim = ks[0].v.length, zero = new Array(dim).fill(0);
    if (n === 1) return () => ks[0].v;
    const slope = (i) => ks[i + 1].v.map((x, j) => (x - ks[i].v[j]) / (ks[i + 1].t - ks[i].t));   // mean velocity of segment i
    // shape-preserving (monotone, PCHIP) tangents per component: fast → slow keys decelerate without overshooting
    const auto = ks.map(() => zero), sgn = Math.sign;
    for (let i = 1; i < n - 1; i++) { const h0 = ks[i].t - ks[i - 1].t, h1 = ks[i + 1].t - ks[i].t, d0 = slope(i - 1), d1 = slope(i), w1 = 2 * h1 + h0, w2 = h1 + 2 * h0;
      auto[i] = d0.map((a, j) => (a * d1[j] > 0 ? (w1 + w2) / (w1 / a + w2 / d1[j]) : 0)); }
    const edge = (h0, h1, d0, d1) => d0.map((a, j) => { let d = ((2 * h0 + h1) * a - h0 * d1[j]) / (h0 + h1); if (sgn(d) !== sgn(a)) d = 0; else if (sgn(a) !== sgn(d1[j]) && Math.abs(d) > 3 * Math.abs(a)) d = 3 * a; return d; });
    auto[0] = n > 2 && !ks[1].ease && !ks[2].ease ? edge(ks[1].t - ks[0].t, ks[2].t - ks[1].t, slope(0), slope(1)) : slope(0);
    auto[n - 1] = n > 2 && !ks[n - 1].ease && !ks[n - 2].ease ? edge(ks[n - 1].t - ks[n - 2].t, ks[n - 2].t - ks[n - 3].t, slope(n - 2), slope(n - 3)) : slope(n - 2);
    const eased = (i) => i >= 0 && i < n - 1 && !!ks[i + 1].ease;                                  // is segment i pose-to-pose?
    const vel = (i, end) => slope(i).map((d) => d * dEase(ks[i + 1].ease, end));                   // velocity of an eased segment at one end
    const out = ks.map((k, i) => (k.hold ? zero : eased(i) ? vel(i, false) : eased(i - 1) ? vel(i - 1, true) : auto[i]));    // leaving key i
    const inn = ks.map((k, i) => (k.hold ? zero : eased(i - 1) ? vel(i - 1, true) : eased(i) ? vel(i, false) : auto[i]));    // arriving at key i
    return (t) => {
      if (t <= ks[0].t) { const d = Math.max(-2, t - ks[0].t); return ks[0].v.map((x, j) => x + out[0][j] * d); }
      if (t >= ks[n - 1].t) { const d = Math.min(2, t - ks[n - 1].t); return ks[n - 1].v.map((x, j) => x + inn[n - 1][j] * d); }
      let i = 0; while (i < n - 2 && t >= ks[i + 1].t) i++;
      const a = ks[i], b = ks[i + 1], h = b.t - a.t, u = (t - a.t) / h;
      if (b.ease) { const w = b.ease(u); return a.v.map((x, j) => x + (b.v[j] - x) * w); }
      const u2 = u * u, u3 = u2 * u, h00 = 2 * u3 - 3 * u2 + 1, h10 = u3 - 2 * u2 + u, h01 = -2 * u3 + 3 * u2, h11 = u3 - u2;
      return a.v.map((x, j) => h00 * x + h10 * h * out[i][j] + h01 * b.v[j] + h11 * h * inn[i + 1][j]);
    };
  };

  /* ================================================================ cables */
  // K.three.tube(points, radius, { sag, sway, segments, radial, material, gravity, seed }) → Mesh (add it to the scene root).
  // points: 2+ of [x,y,z] | Vector3 | Object3D (its world position, read every frame) | () => point. The END POINTS are
  // exact; sag droops the span along gravity (world units at mid-span); sway = { amp, freq } (or a number = amp) swings
  // the span sideways with a sin(π·u) envelope, a pure function of lt.
  N3.tube = (points, radius = .04, o = {}) => {
    const { sag = 0, sway = 0, segments = 40, radial = 10, gravity = [0, -1, 0], seed = 1 } = o;
    const nv = (segments + 1) * (radial + 1), pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), idx = [];
    for (let i = 0; i < segments; i++) for (let j = 0; j < radial; j++) { const a = i * (radial + 1) + j, b = a + radial + 1; idx.push(a, a + 1, b, b, a + 1, b + 1); }
    const g = new T.BufferGeometry(); g.setIndex(idx);
    g.setAttribute('position', new T.BufferAttribute(pos, 3).setUsage(T.DynamicDrawUsage)); g.setAttribute('normal', new T.BufferAttribute(nor, 3).setUsage(T.DynamicDrawUsage));
    g.boundingSphere = fixedSphere(); const mesh = new T.Mesh(g, o.material || N3.mat.rubber()); mesh.frustumCulled = false; mesh.castShadow = true; mesh.receiveShadow = true;
    const sw = sway ? (typeof sway === 'number' ? { amp: sway } : sway) : null, G = v3(gravity).normalize();
    const P = points.map(() => new V3()), C = Array.from({ length: segments + 1 }, () => new V3()), tan = new V3(), nrm = new V3(), bin = new V3(), n1 = new V3(), n2 = new V3(), chord = new V3(), tmp = new V3();
    const ph1 = rnd(1, 1, seed) * TAU, ph2 = rnd(1, 2, seed) * TAU;
    mesh.userData.k3update = (lt) => {
      points.forEach((p, k) => v3(p, P[k]));
      const curve = P.length > 2 ? new T.CatmullRomCurve3(P, false, 'centripetal') : null;
      chord.subVectors(P[P.length - 1], P[0]); n1.crossVectors(chord, G); if (n1.lengthSq() < 1e-8) n1.set(1, 0, 0); n1.normalize(); n2.crossVectors(chord, n1).normalize();
      for (let i = 0; i <= segments; i++) {
        const u = i / segments, c = C[i]; if (curve) curve.getPoint(u, c); else c.lerpVectors(P[0], P[1], u);
        if (sag) c.addScaledVector(G, sag * 4 * u * (1 - u));
        if (sw) { const env = Math.sin(Math.PI * u), f = (sw.freq || .45) * TAU, a = sw.amp || 0;
          c.addScaledVector(n1, env * a * Math.sin(f * lt + ph1 + u * 2.1)).addScaledVector(n2, env * a * .5 * Math.sin(f * 1.37 * lt + ph2 + u * 3.3)); }
        if (mesh.parent) mesh.worldToLocal(c);
      }
      for (let i = 0; i <= segments; i++) {
        tan.subVectors(C[Math.min(segments, i + 1)], C[Math.max(0, i - 1)]).normalize();
        if (i === 0) { tmp.set(0, 0, 1); if (Math.abs(tan.z) > .9) tmp.set(1, 0, 0); nrm.crossVectors(tan, tmp).normalize(); }
        else nrm.addScaledVector(tan, -nrm.dot(tan)).normalize();   // parallel transport
        bin.crossVectors(tan, nrm);
        for (let j = 0; j <= radial; j++) { const a = j / radial * TAU, ca = Math.cos(a), sa = Math.sin(a), k = (i * (radial + 1) + j) * 3;
          const nx = ca * nrm.x + sa * bin.x, ny = ca * nrm.y + sa * bin.y, nz = ca * nrm.z + sa * bin.z;
          nor[k] = nx; nor[k + 1] = ny; nor[k + 2] = nz; pos[k] = C[i].x + radius * nx; pos[k + 1] = C[i].y + radius * ny; pos[k + 2] = C[i].z + radius * nz; }
      }
      g.attributes.position.needsUpdate = true; g.attributes.normal.needsUpdate = true;
    };
    return mesh;
  };

  /* ================================================================ instance floods */
  // K.three.atlas(glyphs, { cell, cols, font, color, scale }) → { texture, cols, rows, n } — a grid of small prints (text or
  // draw functions) for instances(…, { atlas }): each instance shows one cell on the +axis face of K.three.disc geometry.
  N3.atlas = (glyphs, o = {}) => {
    const { cell = 128, font = '800 1px "Inter Tight", sans-serif', color = '#ffffff', scale = .46 } = o, n = glyphs.length, cols = o.cols || Math.ceil(Math.sqrt(n)), rows = Math.ceil(n / cols);
    const cv = canvas(cols * cell, rows * cell), g = cv.getContext('2d', CPU2D), tex = canvasTex(cv); tex.premultiplyAlpha = true;
    const paint = () => { g.clearRect(0, 0, cv.width, cv.height); g.textAlign = 'center'; g.textBaseline = 'middle';
      glyphs.forEach((gl, k) => { const cx = (k % cols + .5) * cell, cy = (Math.floor(k / cols) + .5) * cell, it = typeof gl === 'object' && !Array.isArray(gl) && typeof gl !== 'function' ? gl : { text: gl };
        g.save(); g.fillStyle = g.strokeStyle = it.color || color;
        if (typeof it.text === 'function') it.text(g, cx, cy, cell * scale); else { g.font = font.replace(/\b1px\b/, Math.round(cell * scale * (it.scale || 1)) + 'px'); g.fillText(String(it.text), cx, cy + cell * .03); }
        g.restore(); }); tex.needsUpdate = true; };
    const spec = font.replace(/\b1px\b/, '64px'); needFont(spec, glyphs.filter((x) => typeof x === 'string').join('') || 'A', paint); paint();
    return { texture: tex, canvas: cv, cols, rows, n };
  };
  // K.three.instances(geometry, material, count, fn, { atlas, shadow }) → InstancedMesh. fn(i, lt, m) places instance i:
  // m.pos(x,y,z) · m.rot(rx,ry,rz) (radians, XYZ) · m.quat(q) · m.scale(s | x,y,z) · m.color(c) · m.cell(k) · m.hide();
  // m.p / m.q / m.s are the raw Vector3 / Quaternion / Vector3. Everything is reset before each call (pos 0, scale 1).
  N3.instances = (geometry, material, count, fn, o = {}) => {
    const mesh = new T.InstancedMesh(geometry, material, count); mesh.frustumCulled = false; mesh.boundingSphere = fixedSphere(); mesh.castShadow = o.shadow !== false; mesh.receiveShadow = o.shadow !== false;
    mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);
    const M4 = new T.Matrix4(), eu = new T.Euler(), cc = new T.Color(), arr = mesh.instanceMatrix.array; let hidden = false, cdirty = false, celld = false, cells = null, ci = 0;
    if (o.atlas) {
      const A = o.atlas; cells = new Float32Array(count * 2); geometry.setAttribute('aCell', new T.InstancedBufferAttribute(cells, 2));
      material.customProgramCacheKey = () => 'k3atlas'; material.userData.k3atlas = A;
      material.onBeforeCompile = (sh) => { sh.uniforms.uAtlas = { value: A.texture }; sh.uniforms.uCells = { value: new T.Vector2(1 / A.cols, 1 / A.rows) };
        sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec2 aCell; uniform vec2 uCells; varying vec2 vAtlasUv;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvAtlasUv = ( uv + aCell ) * uCells;');
        sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform sampler2D uAtlas; varying vec2 vAtlasUv;').replace('#include <color_fragment>', '#include <color_fragment>\nvec4 k3ink = texture2D( uAtlas, vAtlasUv ); diffuseColor.rgb = diffuseColor.rgb * ( 1.0 - k3ink.a ) + k3ink.rgb;'); };
    }
    const m = { p: new V3(), q: new T.Quaternion(), s: new V3(1, 1, 1),
      pos(x, y, z) { m.p.set(x, y, z); return m; }, rot(x, y, z) { m.q.setFromEuler(eu.set(x, y, z)); return m; }, quat(q) { m.q.copy(q); return m; },
      scale(x, y, z) { if (y === undefined) m.s.set(x, x, x); else m.s.set(x, y, z); return m; },
      color(c) { cc.set(c); mesh.setColorAt(ci, cc); cdirty = true; return m; },
      cell(k) { const A = o.atlas; if (!A) return m; const cx = k % A.cols, cy = A.rows - 1 - Math.floor(k / A.cols); if (cells[ci * 2] !== cx || cells[ci * 2 + 1] !== cy) { cells[ci * 2] = cx; cells[ci * 2 + 1] = cy; celld = true; } return m; },
      hide() { hidden = true; return m; } };
    mesh.userData.k3update = (lt, ctx) => {
      for (let i = 0; i < count; i++) {
        ci = i; hidden = false; m.p.set(0, 0, 0); m.q.set(0, 0, 0, 1); m.s.set(1, 1, 1);
        fn(i, lt, m, ctx);
        if (hidden) arr.fill(0, i * 16, i * 16 + 16); else M4.compose(m.p, m.q, m.s).toArray(arr, i * 16);
      }
      mesh.instanceMatrix.needsUpdate = true;
      if (cdirty && mesh.instanceColor) { mesh.instanceColor.needsUpdate = true; cdirty = false; }
      if (celld) { geometry.attributes.aCell.needsUpdate = true; celld = false; }
    };
    return mesh;
  };

  // K.three.pile(opts) → fn(i, lt, m) for instances(): a flood that POURS in, SETTLES into a layered pile and PARTS around
  // regions — closed form per instance (no simulation). The pile lies in the local XY plane and grows towards +z
  // (camera side); rotate the InstancedMesh to lay it on a floor. Geometry is expected with its flat axis on Y (K.three.disc).
  //   count, seed, w, h (extent), r (piece radius), thick (piece thickness), spacing (pitch / diameter inside one layer, ≥1 =
  //   pieces of a layer never touch), layers (default: as many as count needs), tilt (rad), jitter, warp (0–1, bends the rows),
  //   pour: [t0, t1] landing window, fall (s in the air), height (drop height, +z), from: [dx, dy] lateral entry direction,
  //   throw (lateral distance travelled while falling), spin (rad of tumbling), bounce, size: [min, max] scale,
  //   part: [{ x, y, w, h, r, rot, at, dur, ease, until, back }] rounded rectangles (or { x, y, R } circles) the pieces
  //         leave from `at` (and return to from `until`); margin (clear distance from a border, default r), band (width of
  //         the ring that absorbs the displaced pieces), lift (extra height of that ring).
  // Layers are hexagonal lattices shifted against each other (three interleaved sub-lattices, then random shifts), so the
  // pile is dense from above while pieces only rest on — never cut through — their neighbours.
  // fn.rest(i) → [x, y, z] resting position · fn.land(i) → landing time · fn.layer(i) · fn.layers · fn.count
  N3.pile = (o = {}) => {
    const { count = 2500, seed = 1, w = 24, h = 14, r = .45, thick = .21, spacing = 1.06, jitter = 1, warp = .6, tilt = .15, pour = [0, 1.5], fall = .6, height = 10, from = [0, 1], spin = 5, bounce = 1, size = [.94, 1.06], axis = 'y' } = o;
    const thr = o.throw == null ? 6 : o.throw, margin = o.margin == null ? r + .06 : o.margin, band = o.band == null ? r * 4 : o.band, lift = o.lift == null ? thick * 1.3 : o.lift;
    const parts = (o.part || []).map((q) => Object.assign({ dur: .55, ease: E.soft, rot: 0 }, q)).map((q) => Object.assign(q, { inside: q.R != null ? q.R : Math.min(q.w, q.h) / 2, cs: Math.cos(-q.rot), sn: Math.sin(-q.rot) }));
    const pitch = 2 * r * spacing, rowH = pitch * .8660254, cols = Math.ceil(w / pitch) + 1, rows = Math.ceil(h / rowH) + 1, cap = cols * rows, layers = o.layers || Math.max(1, Math.ceil(count / cap));
    let prime = 7919; while (cap % prime === 0) prime += 2;
    const base = new T.Quaternion(), qa = new T.Quaternion(), qb = new T.Quaternion(), ax = new V3(), ZA = new V3(0, 0, 1);
    if (axis === 'y') base.setFromAxisAngle(new V3(1, 0, 0), Math.PI / 2);
    const D = new Float32Array(count * 3), LT = new Float32Array(count), LY = new Uint8Array(count), SUB = [[0, 0], [.5, 1 / 3], [0, 2 / 3]], kw = TAU / (pitch * 7);
    for (let i = 0; i < count; i++) {
      const l = Math.min(layers - 1, Math.floor(i / cap)), j = i - l * cap, slot = (j * prime) % cap, c = slot % cols, row = Math.floor(slot / cols);
      const ox = SUB[l % 3][0] + (l >= 3 ? rnd(l, 90, seed) * .5 : 0), oy = SUB[l % 3][1] + (l >= 3 ? rnd(l, 91, seed) * .5 : 0);
      let x = -w / 2 + (c + (row % 2) * .5 + ox - .25) * pitch + (rnd(i, 1, seed) - .5) * jitter * (pitch - 2 * r * .96), y = -h / 2 + (row + oy - .25) * rowH + (rnd(i, 2, seed) - .5) * jitter * (pitch - 2 * r * .96);
      const wx = Math.sin(y * kw + 1.3 + seed) * Math.cos(x * kw * .6 + .4), wy = Math.sin(x * kw * 1.1 + 2.1 + seed) * Math.cos(y * kw * .7 + 1.7);
      x += wx * warp * pitch * .45; y += wy * warp * pitch * .45;
      D[i * 3] = x; D[i * 3 + 1] = y; D[i * 3 + 2] = thick * (.5 + l * 1.03 + rnd(i, 3, seed) * .1);
      LY[i] = l; LT[i] = lerp(pour[0], pour[1], clamp(.74 * (l + rnd(i, 4, seed)) / layers + .26 * rnd(i, 5, seed)));
    }
    const S = { d: 0, gx: 0, gy: 0 };
    const sdf = (R, x, y) => {   // signed distance to region R (negative inside) and its outward direction → S
      const dx = x - R.x, dy = y - R.y, lx = dx * R.cs - dy * R.sn, ly = dx * R.sn + dy * R.cs; let d, gx, gy;
      if (R.R != null) { const len = Math.hypot(lx, ly) || 1e-6; d = len - R.R; gx = lx / len; gy = ly / len; }
      else { const rr = Math.min(R.r == null ? Math.min(R.w, R.h) * .25 : R.r, R.w / 2, R.h / 2), qx = Math.abs(lx) - (R.w / 2 - rr), qy = Math.abs(ly) - (R.h / 2 - rr), sgx = lx < 0 ? -1 : 1, sgy = ly < 0 ? -1 : 1;
        if (qx > 0 && qy > 0) { const len = Math.hypot(qx, qy); d = len - rr; gx = sgx * qx / len; gy = sgy * qy / len; }
        else if (qx > qy) { d = qx - rr; gx = sgx; gy = 0; } else { d = qy - rr; gx = 0; gy = sgy; } }
      S.d = d; S.gx = gx * R.cs + gy * R.sn; S.gy = -gx * R.sn + gy * R.cs;
    };
    const OP = new Float32Array(parts.length), F = { d: 0, gx: 0, gy: 0, k: 0 };
    // union of the open regions at (x, y): nearest signed distance (a region that is still opening counts as shrunk)
    const union = (x, y) => { let dmin = 1e9; for (let k = 0; k < parts.length; k++) { if (OP[k] <= 0) continue; sdf(parts[k], x, y); const d = S.d + (1 - OP[k]) * (parts[k].inside + band); if (d < dmin) dmin = d; } return dmin; };
    // … and the way out seen from a resting piece: soft-min blend of the region gradients + a push away from the centre of
    // the open regions (it decides for pieces caught between two neighbouring regions)
    const field = (x, y, cx, cy) => {
      let dmin = 1e9, km = 0; for (let k = 0; k < parts.length; k++) { if (OP[k] <= 0) { parts[k]._d = 1e9; continue; } sdf(parts[k], x, y); const d = S.d + (1 - OP[k]) * (parts[k].inside + band); parts[k]._d = d; parts[k]._gx = S.gx; parts[k]._gy = S.gy; if (d < dmin) { dmin = d; km = k; } }
      let gx = 0, gy = 0; for (let k = 0; k < parts.length; k++) { const q = parts[k]; if (q._d > 1e8) continue; const wt = Math.exp(-5 * (q._d - dmin)); gx += wt * q._gx; gy += wt * q._gy; }
      const rx = x - cx, ry = y - cy, rl = Math.hypot(rx, ry) || 1; gx += .4 * rx / rl; gy += .4 * ry / rl;
      const gl = Math.hypot(gx, gy) || 1; F.d = dmin; F.gx = gx / gl; F.gy = gy / gl; F.k = km;
    };
    const fn = (i, lt, m) => {
      const tl = LT[i], tau = tl - lt;
      if (tau > fall) return m.hide();
      let x = D[i * 3], y = D[i * 3 + 1], z = D[i * 3 + 2];
      const yaw = rnd(i, 6, seed) * TAU, ta = rnd(i, 7, seed) * TAU, l = LY[i];
      let tl2 = tilt * (l ? .3 + .7 * rnd(i, 8, seed) : .15 * rnd(i, 8, seed)), tumble = 0;
      if (parts.length) {
        let any = 0, cx = 0, cy = 0; const dl = rnd(i, 20, seed) * .07;
        for (let k = 0; k < parts.length; k++) { const R = parts[k]; let op = R.ease(K.p(lt, R.at + dl, R.at + R.dur + dl)); if (R.until != null) op *= 1 - E.inOut(2.4)(K.p(lt, R.until, R.until + (R.back || .6))); OP[k] = op; any += op; cx += op * R.x; cy += op * R.y; }
        if (any > 0) {
          cx /= any; cy /= any; field(x, y, cx, cy);
          if (F.d < band) {
            // leave in a straight line (direction fixed at the resting place) until clear of every open region: the nearest
            // distance grows at most 1 per unit travelled, so stepping by the missing distance never jumps over the exit
            const ins = parts[F.k].inside, f = clamp((F.d + ins) / (band + ins)), nd = margin + (band - margin) * Math.pow(f, .85), gx = F.gx, gy = F.gy; let d = F.d, tr = 0;
            for (let it = 0; it < 40 && d < nd - .01; it++) { tr += Math.max(nd - d, .05); d = union(x + gx * tr, y + gy * tr); }
            const moved = Math.min(1, tr / (2 * r)), side = (rnd(i, 32, seed) - .5) * r * 1.1 * moved;
            x += gx * tr - gy * side; y += gy * tr + gx * side;
            z += lift * moved * (.35 + rnd(i, 30, seed)); tl2 += .22 * moved * rnd(i, 31, seed);
          }
        }
      }
      const sc = lerp(size[0], size[1], rnd(i, 9, seed));
      if (tau > 0) {                                                 // in the air: time-reversed free fall that ends at rest
        const e = tau / fall, sidex = from[0] + (rnd(i, 10, seed) - .5) * .7, sidey = from[1] + (rnd(i, 11, seed) - .5) * .7;
        z += height * (1 - (1 - e) * (1 - e)); x += sidex * thr * e; y += sidey * thr * e; tumble = spin * e * (.6 + .8 * rnd(i, 12, seed));
      } else if (bounce) {                                            // landed: short damped bounce + wobble
        const a = -tau; z += bounce * thick * 1.5 * (.4 + rnd(i, 13, seed)) * Math.exp(-8 * a) * Math.abs(Math.sin(13 * a));
        tl2 += bounce * .2 * Math.exp(-6.5 * a) * Math.sin(17 * a + rnd(i, 14, seed) * TAU);
      }
      qa.setFromAxisAngle(ZA, yaw); m.q.copy(base).premultiply(qa);                                   // flat on the pile, random yaw
      ax.set(Math.cos(ta), Math.sin(ta), 0); qb.setFromAxisAngle(ax, tl2); m.q.premultiply(qb);          // resting tilt
      if (tumble) { ax.set(rnd(i, 15, seed) - .5, rnd(i, 16, seed) - .5, rnd(i, 17, seed) - .5).normalize(); qb.setFromAxisAngle(ax, tumble); m.q.premultiply(qb); }
      m.p.set(x, y, z); m.s.set(sc, sc, sc);
    };
    fn.rest = (i) => [D[i * 3], D[i * 3 + 1], D[i * 3 + 2]]; fn.land = (i) => LT[i]; fn.layer = (i) => LY[i]; fn.count = count; fn.layers = layers; fn.top = thick * (.5 + layers * 1.03);
    return fn;
  };

  /* ================================================================ particles */
  // K.three.points(count, fn, { size, soft, blend, depthTest }) → Points. fn(i, lt, p): p.pos(x,y,z) · p.color(c) | p.rgb(r,g,b)
  // (linear 0–1) · p.size (world units, default opts.size) · p.alpha (0–1). Round soft sprites, perspective-sized.
  N3.points = (count, fn, o = {}) => {
    const { size = .05, soft = .5, blend = 'add', depthTest = true } = o;
    const pos = new Float32Array(count * 3), colr = new Float32Array(count * 3).fill(1), sz = new Float32Array(count), al = new Float32Array(count), g = new T.BufferGeometry();
    const dyn = (a, n) => new T.BufferAttribute(a, n).setUsage(T.DynamicDrawUsage);
    g.setAttribute('position', dyn(pos, 3)); g.setAttribute('aColor', dyn(colr, 3)); g.setAttribute('aSize', dyn(sz, 1)); g.setAttribute('aAlpha', dyn(al, 1));
    // premultiplied output with alpha ≥ every colour channel: an additive sprite must not leave rgb > alpha on a transparent
    // canvas (Chrome's copy paths treat such "brighter than opaque" pixels differently)
    const mat = new T.ShaderMaterial({ transparent: true, premultipliedAlpha: true, depthWrite: false, depthTest, blending: blend === 'add' ? T.AdditiveBlending : T.NormalBlending,
      uniforms: { uScale: { value: 1000 }, uSoft: { value: 1 - clamp(soft, .01, 1) }, uAdd: { value: blend === 'add' ? 1 : 0 } },
      vertexShader: 'attribute vec3 aColor; attribute float aSize; attribute float aAlpha; uniform float uScale; varying vec3 vC; varying float vA;\nvoid main() { vec4 mv = modelViewMatrix * vec4( position, 1.0 ); gl_Position = projectionMatrix * mv; float s = aSize * uScale / max( 0.001, - mv.z ); vA = aAlpha * min( 1.0, s * s / 2.25 ); gl_PointSize = max( s, 1.5 ); vC = aColor; }',
      fragmentShader: 'uniform float uSoft; uniform float uAdd; varying vec3 vC; varying float vA;\nvoid main() { float r = length( gl_PointCoord - 0.5 ) * 2.0; float a = ( 1.0 - smoothstep( uSoft, 1.0, r ) ) * vA; if ( a <= 0.0 ) discard; gl_FragColor = vec4( vC, 1.0 );\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\ngl_FragColor.rgb = min( gl_FragColor.rgb, 1.0 ) * a; gl_FragColor.a = a * mix( 1.0, max( gl_FragColor.r, max( gl_FragColor.g, gl_FragColor.b ) ) / max( a, 1e-5 ), uAdd );\n}' });
    g.boundingSphere = fixedSphere(); const pts = new T.Points(g, mat); pts.frustumCulled = false;
    const cc = new T.Color(); let ci = 0;
    const p = { size, alpha: 1, pos(x, y, z) { pos[ci * 3] = x; pos[ci * 3 + 1] = y; pos[ci * 3 + 2] = z; return p; }, rgb(r, gg, b) { colr[ci * 3] = r; colr[ci * 3 + 1] = gg; colr[ci * 3 + 2] = b; return p; },
      color(c) { cc.set(c); return p.rgb(cc.r, cc.g, cc.b); } };
    pts.userData.k3update = (lt, ctx) => {
      mat.uniforms.uScale.value = ctx.focalPx;
      for (let i = 0; i < count; i++) { ci = i; p.size = size; p.alpha = 1; fn(i, lt, p, ctx); sz[i] = p.size; al[i] = p.alpha; }
      for (const k in g.attributes) g.attributes[k].needsUpdate = true;
    };
    return pts;
  };
  // shape samplers: (i, seed) → [x, y, z] inside/on a unit-sized shape (deterministic from the index)
  const HEART = (t) => { const s = Math.sin(t); return [16 * s * s * s / 17, (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) / 17]; };
  const HCDF = (() => { const n = 720, c = new Float32Array(n + 1); let p = HEART(0); for (let i = 1; i <= n; i++) { const q = HEART(i / n * TAU); c[i] = c[i - 1] + Math.hypot(q[0] - p[0], q[1] - p[1]); p = q; } return c; })();
  const heartT = (u) => { const n = HCDF.length - 1, target = u * HCDF[n]; let lo = 0, hi = n; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (HCDF[m] <= target) lo = m; else hi = m; } return (lo + (target - HCDF[lo]) / Math.max(1e-9, HCDF[hi] - HCDF[lo])) / n * TAU; };
  N3.shape = {
    sphere: (i, seed = 0) => { const u = rnd(i, 1, seed) * 2 - 1, a = rnd(i, 2, seed) * TAU, s = Math.sqrt(1 - u * u); return [s * Math.cos(a), u, s * Math.sin(a)]; },
    ball: (i, seed = 0) => { const q = N3.shape.sphere(i, seed), r = Math.cbrt(rnd(i, 3, seed)); return [q[0] * r, q[1] * r, q[2] * r]; },
    box: (i, seed = 0) => [rnd(i, 1, seed) - .5, rnd(i, 2, seed) - .5, rnd(i, 3, seed) - .5],
    ring: (i, seed = 0, tube = .06) => { const a = rnd(i, 1, seed) * TAU, b = rnd(i, 2, seed) * TAU, r = 1 + tube * Math.cos(b) * Math.sqrt(rnd(i, 3, seed)); return [r * Math.cos(a), tube * Math.sin(b), r * Math.sin(a)]; },
    // puffy heart, ≈1.9 wide × 1.7 tall × 2·depth deep, facing +z, centred. fill = share of the points inside the volume,
    // rim = share on the outline (draws the contour), the rest on the puffy shell
    heart: (i, seed = 0, { fill = .2, depth = .42, rim = .2 } = {}) => {
      const u = rnd(i, 3, seed), k = u < rim ? 1 - .04 * rnd(i, 2, seed) : Math.sqrt(rnd(i, 2, seed)), q = HEART(heartT(rnd(i, 1, seed)));
      const x = q[0] * k, y = q[1] * k + 2.4 / 17 * k;
      const zz = depth * Math.pow(Math.max(0, 1 - Math.pow(k, 2.4)), .55) * (u > 1 - fill ? rnd(i, 4, seed) : 1) * (rnd(i, 5, seed) < .5 ? -1 : 1);
      return [x, y, zz];
    },
    // lumpy two-lobed blob (brain-ish), unit radius
    blob: (i, seed = 0) => { const q = N3.shape.sphere(i, seed), th = Math.atan2(q[2], q[0]), ph = Math.asin(q[1]);
      const r = 1 + .07 * Math.sin(9 * th + 3 * Math.sin(5 * ph)) + .05 * Math.sin(13 * ph + 2 * Math.sin(7 * th)) - .16 * Math.exp(-q[0] * q[0] * 60) * (q[1] > -.2 ? 1 : 0);
      return [q[0] * r * .86, q[1] * r * .78, q[2] * r * 1.08]; },
  };

  /* ================================================================ LED dot-matrix */
  // 5×7 font written for this kit (rows top→bottom, '#' = lit): A–Z a–z 0–9, Spanish (á é í ó ú ü ñ ¿ ¡ and the accented
  // capitals), punctuation and a few symbols (… → ← ↑ ↓ ♥ ♪ ✓ × • ° € █).
  const F = {};
  const def = (chars, rows) => { const b = rows.split('/'); [...chars].forEach((c) => { F[c] = b; }); };
  def(' ', '...../...../...../...../...../...../.....');
  def('A', '.###./#...#/#...#/#####/#...#/#...#/#...#'); def('B', '####./#...#/#...#/####./#...#/#...#/####.'); def('C', '.###./#...#/#..../#..../#..../#...#/.###.');
  def('D', '####./#...#/#...#/#...#/#...#/#...#/####.'); def('E', '#####/#..../#..../####./#..../#..../#####'); def('F', '#####/#..../#..../####./#..../#..../#....');
  def('G', '.###./#...#/#..../#.###/#...#/#...#/.###.'); def('H', '#...#/#...#/#...#/#####/#...#/#...#/#...#'); def('I', '.###./..#../..#../..#../..#../..#../.###.');
  def('J', '..###/...#./...#./...#./...#./#..#./.##..'); def('K', '#...#/#..#./#.#../##.../#.#../#..#./#...#'); def('L', '#..../#..../#..../#..../#..../#..../#####');
  def('M', '#...#/##.##/#.#.#/#.#.#/#...#/#...#/#...#'); def('N', '#...#/#...#/##..#/#.#.#/#..##/#...#/#...#'); def('O', '.###./#...#/#...#/#...#/#...#/#...#/.###.');
  def('P', '####./#...#/#...#/####./#..../#..../#....'); def('Q', '.###./#...#/#...#/#...#/#.#.#/#..#./.##.#'); def('R', '####./#...#/#...#/####./#.#../#..#./#...#');
  def('S', '.####/#..../#..../.###./....#/....#/####.'); def('T', '#####/..#../..#../..#../..#../..#../..#..'); def('U', '#...#/#...#/#...#/#...#/#...#/#...#/.###.');
  def('V', '#...#/#...#/#...#/#...#/#...#/.#.#./..#..'); def('W', '#...#/#...#/#...#/#.#.#/#.#.#/#.#.#/.#.#.'); def('X', '#...#/#...#/.#.#./..#../.#.#./#...#/#...#');
  def('Y', '#...#/#...#/.#.#./..#../..#../..#../..#..'); def('Z', '#####/....#/...#./..#../.#.../#..../#####');
  def('a', '...../...../.###./....#/.####/#...#/.####'); def('b', '#..../#..../#.##./##..#/#...#/#...#/####.'); def('c', '...../...../.###./#..../#..../#...#/.###.');
  def('d', '....#/....#/.##.#/#..##/#...#/#...#/.####'); def('e', '...../...../.###./#...#/#####/#..../.###.'); def('f', '..##./.#..#/.#.../###../.#.../.#.../.#...');
  def('g', '...../.####/#...#/#...#/.####/....#/.###.'); def('h', '#..../#..../#.##./##..#/#...#/#...#/#...#'); def('i', '..#../...../.##../..#../..#../..#../.###.');
  def('j', '...#./...../..##./...#./...#./#..#./.##..'); def('k', '#..../#..../#..#./#.#../##.../#.#../#..#.'); def('l', '.##../..#../..#../..#../..#../..#../.###.');
  def('m', '...../...../##.#./#.#.#/#.#.#/#...#/#...#'); def('n', '...../...../#.##./##..#/#...#/#...#/#...#'); def('o', '...../...../.###./#...#/#...#/#...#/.###.');
  def('p', '...../...../####./#...#/####./#..../#....'); def('q', '...../...../.##.#/#..##/.####/....#/....#'); def('r', '...../...../#.##./##..#/#..../#..../#....');
  def('s', '...../...../.###./#..../.###./....#/####.'); def('t', '.#.../.#.../###../.#.../.#.../.#..#/..##.'); def('u', '...../...../#...#/#...#/#...#/#..##/.##.#');
  def('v', '...../...../#...#/#...#/#...#/.#.#./..#..'); def('w', '...../...../#...#/#...#/#.#.#/#.#.#/.#.#.'); def('x', '...../...../#...#/.#.#./..#../.#.#./#...#');
  def('y', '...../...../#...#/#...#/.####/....#/.###.'); def('z', '...../...../#####/...#./..#../.#.../#####');
  def('0', '.###./#...#/#..##/#.#.#/##..#/#...#/.###.'); def('1', '..#../.##../..#../..#../..#../..#../.###.'); def('2', '.###./#...#/....#/...#./..#../.#.../#####');
  def('3', '#####/...#./..#../...#./....#/#...#/.###.'); def('4', '...#./..##./.#.#./#..#./#####/...#./...#.'); def('5', '#####/#..../####./....#/....#/#...#/.###.');
  def('6', '..##./.#.../#..../####./#...#/#...#/.###.'); def('7', '#####/....#/...#./..#../.#.../.#.../.#...'); def('8', '.###./#...#/#...#/.###./#...#/#...#/.###.');
  def('9', '.###./#...#/#...#/.####/....#/...#./.##..');
  def('ó', '...#./..#../.###./#...#/#...#/#...#/.###.');
  // accented capitals: the plain letter plus a mark in the two rows ABOVE the cell (keep gap ≥ 3 and a 2-row top margin)
  const ACC = {}, mark = (chars, bases, rows) => [...chars].forEach((c, k) => { ACC[c] = { base: bases[k], rows: rows.split('/') }; });
  mark('ÁÉÍÓÚ', 'AEIOU', '...#./..#..'); mark('ÀÈÌÒÙ', 'AEIOU', '.#.../..#..'); mark('ÄËÏÖÜ', 'AEIOU', '.#.#./.....'); mark('Ñ', 'N', '.##.#/#..#.'); mark('ÂÊÎÔÛ', 'AEIOU', '..#../.#.#.');
  def('á', '...#./..#../.###./....#/.####/#...#/.####'); def('é', '...#./..#../.###./#...#/#####/#..../.###.'); def('í', '...#./..#../...../.##../..#../..#../.###.');
  def('ú', '...#./..#../#...#/#...#/#...#/#..##/.##.#'); def('ü', '.#.#./...../#...#/#...#/#...#/#..##/.##.#'); def('ñ', '.##.#/#..#./...../#.##./##..#/#...#/#...#');
  def('.', '...../...../...../...../...../.##../.##..'); def(',', '...../...../...../...../.##../..#../.#...'); def(':', '...../.##../.##../...../.##../.##../.....');
  def(';', '...../.##../.##../...../.##../..#../.#...'); def('!', '..#../..#../..#../..#../..#../...../..#..'); def('¡', '..#../...../..#../..#../..#../..#../..#..');
  def('?', '.###./#...#/....#/...#./..#../...../..#..'); def('¿', '..#../...../..#../.#.../#..../#...#/.###.'); def('-–—', '...../...../...../#####/...../...../.....');
  def('_', '...../...../...../...../...../...../#####'); def('+', '...../..#../..#../#####/..#../..#../.....'); def('=', '...../...../#####/...../#####/...../.....');
  def('/', '...../....#/...#./..#../.#.../#..../.....'); def('\\', '...../#..../.#.../..#../...#./....#/.....'); def('(', '...#./..#../.#.../.#.../.#.../..#../...#.');
  def(')', '.#.../..#../...#./...#./...#./..#../.#...'); def('[', '.###./.#.../.#.../.#.../.#.../.#.../.###.'); def(']', '.###./...#./...#./...#./...#./...#./.###.');
  def('\'’', '.##../..#../.#.../...../...../...../.....'); def('"“”', '.#.#./.#.#./.#.#./...../...../...../.....'); def('#', '.#.#./.#.#./#####/.#.#./#####/.#.#./.#.#.');
  def('%', '##.../##..#/...#./..#../.#.../#..##/...##'); def('&', '.##../#..#./#.#../.#.../#.#.#/#..#./.##.#'); def('*', '...../..#../#.#.#/.###./#.#.#/..#../.....');
  def('@', '.###./#...#/....#/.##.#/#.#.#/#.#.#/.###.'); def('$', '..#../.####/#.#../.###./..#.#/####./..#..'); def('€', '..###/.#.../####./.#.../####./.#.../..###');
  def('<', '...#./..#../.#.../#..../.#.../..#../...#.'); def('>', '.#.../..#../...#./....#/...#./..#../.#...'); def('…', '...../...../...../...../...../#.#.#/#.#.#');
  def('°', '.##../#..#./#..#./.##../...../...../.....'); def('•', '...../...../.###./.###./.###./...../.....'); def('·', '...../...../...../..#../...../...../.....');
  def('→', '...../..#../...#./#####/...#./..#../.....'); def('←', '...../..#../.#.../#####/.#.../..#../.....'); def('↑', '..#../.###./#.#.#/..#../..#../..#../..#..');
  def('↓', '..#../..#../..#../..#../#.#.#/.###./..#..'); def('♥', '...../.#.#./#####/#####/.###./..#../.....'); def('♪', '..#../..##./..#.#/..#../.##../###../.#...');
  def('✓', '...../....#/...#./#.#../.#.../...../.....'); def('×', '...../#...#/.#.#./..#../.#.#./#...#/.....'); def('|', '..#../..#../..#../..#../..#../..#../..#..');
  def('~', '...../...../.#.../#.#.#/...#./...../.....'); def('█', '#####/#####/#####/#####/#####/#####/#####'); def('▁', '...../...../...../...../...../...../#####');
  N3.font5x7 = F; N3.font5x7.accents = ACC;
  // K.three.ledPanel(opts) → Mesh (a plane cols·pitch × rows·pitch facing +z; add it to any object, it stays glued).
  //   content, one of:  lines: ['TEXT', { text, color, align }] | (lt) => lines
  //                     screens: [{ at, lines, type: cps | { cps, delay }, cursor, in: 'cut'|'wipe'|'scan', dur }]
  //                     draw(lt, g): g.clear() · g.text(str, col, row, color) → end col · g.dot(col, row, color) ·
  //                                  g.fill(c0, r0, c1, r1, color) · g.width(str) · g.cols · g.rows
  //   look: on, off, bg (colours), dot (0–1 of the pitch), glow, intensity, px (texture px per LED), gap (rows between lines),
  //         align, cursor ('block' | 'bar' | false), blink (Hz)
  N3.ledPanel = (o = {}) => {
    const { cols = 48, rows = 16, pitch = .05, px = 16, on = '#ffb347', off = '#2a2019', bg = '#0b0a0a', dot = .7, glow = .5, intensity = 1.15, gap = 3, align = 'center', blink = 2 } = o;
    const cv = canvas(cols * px, rows * px), g = cv.getContext('2d', CPU2D), baseCv = canvas(cols * px, rows * px), bg2 = baseCv.getContext('2d', CPU2D), tex = canvasTex(cv);
    const mat = N3.mat.screen(tex, Object.assign({ emissiveIntensity: intensity }, o.material || {}));
    const mesh = new T.Mesh(new T.PlaneGeometry(cols * pitch, rows * pitch), mat); mesh.userData.w = cols * pitch; mesh.userData.h = rows * pitch; mesh.receiveShadow = false;
    const R0 = px * dot / 2;
    bg2.fillStyle = bg; bg2.fillRect(0, 0, cv.width, cv.height); bg2.fillStyle = off; bg2.beginPath();
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) { bg2.moveTo((c + .5) * px + R0, (r + .5) * px); bg2.arc((c + .5) * px, (r + .5) * px, R0, 0, TAU); }
    bg2.fill();
    const buf = new Uint8Array(cols * rows), pal = [], sprites = [];
    const pid = (c) => { c = c || on; let k = pal.indexOf(c); if (k < 0) { pal.push(c); k = pal.length - 1; const s = canvas(px * 3, px * 3), sg = s.getContext('2d', CPU2D), gr = sg.createRadialGradient(px * 1.5, px * 1.5, R0 * .6, px * 1.5, px * 1.5, px * 1.5);
      gr.addColorStop(0, c); gr.addColorStop(1, 'rgba(0,0,0,0)'); sg.globalAlpha = .34 * glow; sg.fillStyle = gr; sg.fillRect(0, 0, px * 3, px * 3); sprites.push(s); } return k + 1; };
    const G = { cols, rows,
      clear() { buf.fill(0); }, dot(c, r, color) { if (c >= 0 && c < cols && r >= 0 && r < rows) buf[r * cols + c] = pid(color); },
      fill(c0, r0, c1, r1, color) { const k = pid(color); for (let r = Math.max(0, r0); r <= Math.min(rows - 1, r1); r++) for (let c = Math.max(0, c0); c <= Math.min(cols - 1, c1); c++) buf[r * cols + c] = k; },
      width: (s) => Math.max(0, [...s].length * 6 - 1),
      text(s, c0, r0, color) { const k = pid(color); let c = c0; const put = (cc, rr) => { if (cc >= 0 && cc < cols && rr >= 0 && rr < rows) buf[rr * cols + cc] = k; };
        for (const ch of s) { const ac = ACC[ch], gl = ac ? F[ac.base] : F[ch] || F[ch.toUpperCase()] || F['?'];
          for (let r = 0; r < 7; r++) for (let x = 0; x < 5; x++) if (gl[r][x] === '#') put(c + x, r0 + r);
          if (ac) for (let r = 0; r < 2; r++) for (let x = 0; x < 5; x++) if (ac.rows[r][x] === '#') put(c + x, r0 - 2 + r);
          c += 6; } return c; } };
    const norm = (l) => (typeof l === 'string' ? { text: l } : l);
    const screens = (o.screens || (o.lines ? [{ at: o.type ? 0 : -1e9, lines: o.lines, cursor: o.cursor, type: o.type }] : [])).slice().sort((a, b) => a.at - b.at);
    const layout = (s, lt) => {
      const ls = (typeof s.lines === 'function' ? s.lines(lt) : s.lines).map(norm), n = ls.length, top = Math.floor((rows - (n * 7 + (n - 1) * gap)) / 2), tq = K.TQ(lt), cur = s.cursor === true ? 'block' : s.cursor;
      const ty = s.type ? (typeof s.type === 'number' ? { cps: s.type } : s.type) : null, t0 = s.at + (ty && ty.delay || 0);
      const total = ls.reduce((a, l) => a + [...l.text].length, 0); let left = ty ? clamp(Math.floor((tq - t0) * ty.cps + 1e-6), 0, total) : total; const done = left >= total;
      let cc = -1, cr = 0, ccol = null;
      ls.forEach((l, k) => { const chars = [...l.text], show = chars.slice(0, left).join(''), wFull = G.width(l.text), al = l.align || s.align || align, r0 = top + k * (7 + gap);
        const c0 = al === 'left' ? (o.margin == null ? 2 : o.margin) : al === 'right' ? cols - wFull - (o.margin == null ? 2 : o.margin) : Math.floor((cols - wFull) / 2);
        const end = G.text(show, c0, r0, l.color || s.color);
        if (cc < 0 && (left < chars.length || k === n - 1)) { cc = end; cr = r0; ccol = l.color || s.color; }
        left = Math.max(0, left - chars.length); });
      if (cur && cc >= 0) { const tEnd = ty ? t0 + total / ty.cps : Math.max(0, s.at), lit = !done || Math.floor(Math.max(0, tq - tEnd) * blink * 2) % 2 === 0;
        if (lit) { if (cur === 'bar') G.fill(cc, cr + 6, cc + 4, cr + 6, ccol); else G.fill(cc, cr, cc + 4, cr + 6, ccol); } }
      const mode = s.in || 'cut', q = K.p(tq, s.at, s.at + (s.dur || .3));
      if (mode !== 'cut' && q < 1) { if (mode === 'wipe') { const lim = Math.floor(cols * q); for (let r = 0; r < rows; r++) buf.fill(0, r * cols + lim, (r + 1) * cols); } else { const lim = Math.floor(rows * q); buf.fill(0, lim * cols); } }
    };
    let lastKey = null;
    mesh.userData.k3update = (lt) => {
      buf.fill(0);
      if (o.draw) o.draw(lt, G);
      else { let s = null; const tq = K.TQ(lt); for (const x of screens) if (x.at <= tq + 1e-9) s = x; if (s) layout(s, lt); }
      const key = pal.join() + '|' + String.fromCharCode.apply(null, buf); if (key === lastKey) return; lastKey = key;   // same picture → keep the texture
      g.globalCompositeOperation = 'source-over'; g.drawImage(baseCv, 0, 0);
      if (glow > 0) { g.globalCompositeOperation = 'lighter'; for (let i = 0; i < buf.length; i++) if (buf[i]) g.drawImage(sprites[buf[i] - 1], (i % cols - 1) * px, (Math.floor(i / cols) - 1) * px); g.globalCompositeOperation = 'source-over'; }
      for (let k = 0; k < pal.length; k++) { g.fillStyle = pal[k]; g.beginPath(); let any = false;
        for (let i = 0; i < buf.length; i++) if (buf[i] === k + 1) { const x = (i % cols + .5) * px, y = (Math.floor(i / cols) + .5) * px; g.moveTo(x + R0, y); g.arc(x, y, R0, 0, TAU); any = true; }
        if (any) g.fill(); }
      g.fillStyle = 'rgba(255,255,255,.3)'; g.beginPath(); for (let i = 0; i < buf.length; i++) if (buf[i]) { const x = (i % cols + .5) * px - R0 * .22, y = (Math.floor(i / cols) + .5) * px - R0 * .22; g.moveTo(x + R0 * .4, y); g.arc(x, y, R0 * .4, 0, TAU); } g.fill();
      tex.needsUpdate = true;
    };
    mesh.userData.led = G; return mesh;
  };

  /* ================================================================ labels and cards */
  const slabMesh = (w, h, o, front) => {
    const { radius = .1, depth = .05, side = '#e9e9ee', back = side, rough = .5 } = o;
    const sideM = N3.mat.plastic(side, { roughness: rough }), backM = back === side ? sideM : N3.mat.plastic(back, { roughness: rough });
    const mesh = new T.Mesh(N3.slab(w, h, radius, depth, o.bevel), [backM, sideM, front]); mesh.castShadow = true; mesh.receiveShadow = true; mesh.userData.w = w; mesh.userData.h = h; mesh.userData.depth = depth;
    return mesh;
  };
  const faceMat = (tex, o) => new T.MeshPhysicalMaterial(Object.assign({ map: tex, roughness: o.rough == null ? .5 : o.rough, metalness: 0, clearcoat: o.coat == null ? .35 : o.coat, clearcoatRoughness: .3,
    emissive: col('#ffffff'), emissiveMap: o.glow ? tex : null, emissiveIntensity: o.glow || 0 }, o.material || {}));
  // K.three.label(text, { h, font, weight, serif, color, bg, radius, pad, depth, size, tracking, res, rough, coat, glow })
  // → Mesh: a rounded sticker slab, h world units tall, as wide as its text. Markup: "la *IA*" sets IA in the serif italic.
  // mesh.userData = { w, h, depth }. With the face declared in K.fonts before K.start, w is exact at build; otherwise it is
  // corrected (texture + geometry) as soon as the font arrives, before the first captured frame.
  N3.label = (text, o = {}) => {
    const { h = 1, weight = 800, color = '#ffffff', bg = '#7b61ff', radius = .26, pad = .36, depth = .1, size = .56, tracking = -.035, res = 240 } = o;
    const fam = o.font || K.theme.display || '"Inter Tight", sans-serif', ser = o.serif || K.theme.serif || '"Instrument Serif", serif';
    const H = Math.round(h * res), fpx = Math.round(H * size), fMain = `${weight} ${fpx}px ${fam}`, fEm = `italic 400 ${Math.round(fpx * 1.08)}px ${ser}`;
    const toks = K.tokens(text), cv = canvas(8, H), g = cv.getContext('2d', CPU2D), tex = canvasTex(cv);
    const mesh = slabMesh(1, h, { radius: radius * h, depth: depth * h, side: o.side || bg, back: o.back || o.side || bg, rough: o.rough }, faceMat(tex, o));
    const paint = () => {
      const run = (t) => { g.font = t.em ? fEm : fMain; g.letterSpacing = (t.em ? 0 : tracking * fpx) + 'px'; };
      let wpx = 0; const spaceW = fpx * .26; toks.forEach((t) => { if (t.space) wpx += spaceW; else if (t.text) { run(t); t.w = g.measureText(t.text).width; wpx += t.w; } });
      const padPx = pad * H, W = Math.ceil(wpx + padPx * 2); cv.width = W; cv.height = H;
      g.fillStyle = bg; g.fillRect(0, 0, W, H); g.textBaseline = 'alphabetic'; g.textAlign = 'left'; g.font = fMain; const cap = g.measureText('H').actualBoundingBoxAscent || fpx * .72;
      let x = padPx; const y = H / 2 + cap / 2; g.fillStyle = color;
      toks.forEach((t) => { if (t.space) x += spaceW; else if (t.text) { run(t); g.fillStyle = t.cls && o.colors && o.colors[t.cls] ? o.colors[t.cls] : t.em && o.emColor ? o.emColor : color; g.fillText(t.text, x, y); x += t.w; } });
      const w = W / res; if (Math.abs(w - mesh.userData.w) > 1e-6) { mesh.geometry.dispose(); mesh.geometry = N3.slab(w, h, radius * h, depth * h, o.bevel); mesh.userData.w = w; }
      tex.dispose(); tex.needsUpdate = true;
    };
    const plain = toks.filter((t) => t.text).map((t) => t.text).join(' ') || 'A';
    needFont(fMain, plain, paint); if (toks.some((t) => t.em)) needFont(fEm, plain, paint);
    paint(); return mesh;
  };
  // K.three.card(src, w, h, radius, { depth, side, back, res, rough, coat, glow, fit }) → Mesh, a rounded card with a picture.
  // src: image URL (preloaded, capture waits) | <canvas> | <img> | (g, W, H) => draw with canvas 2D at res px per unit.
  N3.card = (src, w = 1.2, h = 1.6, radius = .1, o = {}) => {
    const res = o.res || 256; let tex;
    if (typeof src === 'function') { const cv = canvas(w * res, h * res), g = cv.getContext('2d', CPU2D); src(g, cv.width, cv.height); tex = canvasTex(cv); if (o.fonts) o.fonts.forEach((f) => needFont(f, o.sample || 'Aa', () => { g.clearRect(0, 0, cv.width, cv.height); src(g, cv.width, cv.height); tex.needsUpdate = true; })); }
    else if (typeof src === 'string') { const cv = canvas(w * res, h * res), g = cv.getContext('2d', CPU2D); g.fillStyle = o.side || '#e9e9ee'; g.fillRect(0, 0, cv.width, cv.height); tex = canvasTex(cv);
      PEND.push(K.preload(src).then((im) => { if (!im || !im.naturalWidth) return; const s = (o.fit === 'contain' ? Math.min : Math.max)(cv.width / im.naturalWidth, cv.height / im.naturalHeight), dw = im.naturalWidth * s, dh = im.naturalHeight * s;
        g.drawImage(im, (cv.width - dw) / 2, (cv.height - dh) / 2, dw, dh); tex.needsUpdate = true; })); }
    else tex = canvasTex(src);
    return slabMesh(w, h, Object.assign({ radius, depth: .04 }, o), faceMat(tex, o));
  };

  /* ================================================================ contact shadow (soft blob under floating objects) */
  // K.three.contactShadow({ w, d, y, far, blur, opacity, color, res }) → Group lying on y (XZ plane). Everything within
  // `far` above it darkens the floor, softer the higher it floats. Rendered each frame from below (depth → blur).
  N3.contactShadow = (o = {}) => {
    const { w = 10, d = 10, y = 0, far = 4, blur = 2.5, opacity = .55, color = '#000000', res = 512 } = o;
    const grp = new T.Group(); grp.position.y = y;
    const mk = () => { const rt = new T.WebGLRenderTarget(res, res); rt.texture.generateMipmaps = false; return rt; }, rtA = mk(), rtB = mk();
    const cam = new T.OrthographicCamera(-w / 2, w / 2, d / 2, -d / 2, 0, far); cam.rotation.x = Math.PI / 2; grp.add(cam);
    const depthMat = new T.MeshDepthMaterial({ depthTest: true, depthWrite: true }); depthMat.userData.dark = { value: 1 };
    depthMat.onBeforeCompile = (sh) => { sh.uniforms.uDark = depthMat.userData.dark; sh.fragmentShader = 'uniform float uDark;\n' + sh.fragmentShader.replace('gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );', 'gl_FragColor = vec4( vec3( 0.0 ), ( 1.0 - fragCoordZ ) * uDark );'); };
    const plane = new T.Mesh(new T.PlaneGeometry(w, d).rotateX(Math.PI / 2), new T.MeshBasicMaterial({ map: rtA.texture, color: col(color), opacity, transparent: true, depthWrite: false, toneMapped: false })); plane.scale.y = -1; plane.renderOrder = 1; grp.add(plane);
    const blurMat = (dir) => new T.ShaderMaterial({ depthTest: false, uniforms: { tDiffuse: { value: null }, d: { value: 1 / 256 } },
      vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 ); }',
      fragmentShader: `uniform sampler2D tDiffuse; uniform float d; varying vec2 vUv; void main() { vec4 s = vec4( 0.0 ); vec2 o = ${dir ? 'vec2( 0.0, d )' : 'vec2( d, 0.0 )'};
        s += texture2D( tDiffuse, vUv - 4.0 * o ) * 0.051; s += texture2D( tDiffuse, vUv - 3.0 * o ) * 0.0918; s += texture2D( tDiffuse, vUv - 2.0 * o ) * 0.12245; s += texture2D( tDiffuse, vUv - o ) * 0.1531;
        s += texture2D( tDiffuse, vUv ) * 0.1633; s += texture2D( tDiffuse, vUv + o ) * 0.1531; s += texture2D( tDiffuse, vUv + 2.0 * o ) * 0.12245; s += texture2D( tDiffuse, vUv + 3.0 * o ) * 0.0918; s += texture2D( tDiffuse, vUv + 4.0 * o ) * 0.051; gl_FragColor = s; }` });
    const bH = blurMat(0), bV = blurMat(1), bPlane = new T.Mesh(new T.PlaneGeometry(w, d).rotateX(Math.PI / 2)); bPlane.visible = false; grp.add(bPlane);
    const pass = (R, amount) => { bPlane.visible = true;
      bPlane.material = bH; bH.uniforms.tDiffuse.value = rtA.texture; bH.uniforms.d.value = amount / 256; R.setRenderTarget(rtB); R.render(bPlane, cam);
      bPlane.material = bV; bV.uniforms.tDiffuse.value = rtB.texture; bV.uniforms.d.value = amount / 256; R.setRenderTarget(rtA); R.render(bPlane, cam); bPlane.visible = false; };
    grp.userData.k3pre = (R, scene) => {
      const bgd = scene.background, hide = []; scene.traverse((x) => { if (x.visible && (x.isPoints || x.isLine || x.userData.noContact || (x.material && x.material.isShadowMaterial))) { hide.push(x); x.visible = false; } });
      plane.visible = false; scene.background = null; scene.overrideMaterial = depthMat;
      const ca = R.getClearAlpha(), au = R.shadowMap.autoUpdate; R.shadowMap.autoUpdate = false; R.setClearAlpha(0); R.setRenderTarget(rtA); R.clear(); R.render(scene, cam);
      scene.overrideMaterial = null; pass(R, blur); pass(R, blur * .4);
      R.setRenderTarget(null); R.setClearAlpha(ca); R.shadowMap.autoUpdate = au; scene.background = bgd; plane.visible = true; hide.forEach((x) => { x.visible = true; });
    };
    return grp;
  };

  // K.three.depthProxy(geometry) → invisible Mesh that only writes depth, drawn after everything else. Particles write no
  // depth, so depth of field would blur them like the far background: put a proxy where the cloud is (a sphere will do).
  N3.depthProxy = (geometry) => { const m = new T.Mesh(geometry, new T.MeshBasicMaterial({ colorWrite: false, depthWrite: true, transparent: true })); m.renderOrder = 999; m.userData.noContact = true; return m; };

  /* ================================================================ environments (image-based light, built in code) */
  // softbox: { az, el (deg), d, w, h, i (intensity), c }. az 0 = in front (+z), 90 = right (+x); el = elevation.
  const ENV = {
    studio: { top: '#f2f4f8', bottom: '#8d93a0', sky: .5, boxes: [{ az: -42, el: 48, d: 9, w: 7, h: 7, i: 8, c: '#fff5e8' }, { az: 0, el: 89, d: 10, w: 11, h: 11, i: 2.2 }, { az: 68, el: 12, d: 9, w: 5, h: 8, i: 1.5, c: '#e4edff' },
      { az: 152, el: 22, d: 9, w: 1.6, h: 9, i: 9 }, { az: -150, el: 18, d: 9, w: 1.4, h: 9, i: 6 }, { az: -22, el: -4, d: 9.5, w: 9, h: 5, i: 1.1 }, { az: 104, el: 0, d: 8, w: 2.6, h: 12, i: .03, c: '#1a1c22' }, { az: -96, el: 0, d: 8, w: 2.2, h: 12, i: .03, c: '#1a1c22' }] },
    soft: { top: '#ffffff', bottom: '#c9ccd4', sky: .95, boxes: [{ az: -30, el: 60, d: 9, w: 10, h: 10, i: 3, c: '#fff8f0' }, { az: 150, el: 30, d: 9, w: 3, h: 9, i: 4 }] },
    sky: { top: '#6fb2ff', bottom: '#f6e7da', sky: .8, boxes: [{ az: -48, el: 44, d: 9, w: 6, h: 6, i: 10, c: '#fff1dc' }, { az: 0, el: 89, d: 10, w: 9, h: 9, i: 2 }, { az: 140, el: 24, d: 9, w: 2, h: 9, i: 8, c: '#ffffff' }, { az: -140, el: 10, d: 9, w: 1.4, h: 8, i: 4, c: '#dfeaff' },
      { az: -20, el: -2, d: 9.5, w: 10, h: 5, i: 1.5, c: '#fff6ee' }, { az: 100, el: 0, d: 8, w: 2.4, h: 12, i: .04, c: '#1b2030' }, { az: -98, el: 0, d: 8, w: 2, h: 12, i: .04, c: '#1b2030' }, { az: 30, el: -50, d: 9, w: 8, h: 6, i: .25, c: '#59483c' }] },
    night: { top: '#0b0d16', bottom: '#040406', sky: 1, boxes: [{ az: -35, el: 55, d: 9, w: 6, h: 6, i: 3.2, c: '#dfe6ff' }, { az: 140, el: 20, d: 9, w: 1.4, h: 9, i: 8, c: '#8fb0ff' }, { az: -135, el: 14, d: 9, w: 1.2, h: 9, i: 6, c: '#ff7fb4' }, { az: 60, el: 5, d: 9, w: 4, h: 6, i: .7, c: '#b9a6ff' }, { az: -15, el: 0, d: 9.5, w: 8, h: 5, i: .5, c: '#cfd6ff' }] },
  };
  N3.envPresets = ENV;
  const ENVC = new Map();
  const buildEnv = (spec) => {
    const key = JSON.stringify(spec); if (ENVC.has(key)) return ENVC.get(key);
    const R = getR(), s = new T.Scene(), dome = new T.SphereGeometry(40, 48, 24), P = dome.attributes.position, cols = new Float32Array(P.count * 3), ct = col(spec.top), cb = col(spec.bottom), c = new T.Color(), k = spec.sky == null ? 1 : spec.sky;
    for (let i = 0; i < P.count; i++) { const f = clamp(P.getY(i) / 40 * .9 + .45); c.copy(cb).lerp(ct, f * f * (3 - 2 * f)); cols[i * 3] = c.r * k; cols[i * 3 + 1] = c.g * k; cols[i * 3 + 2] = c.b * k; }
    dome.setAttribute('color', new T.BufferAttribute(cols, 3)); s.add(new T.Mesh(dome, new T.MeshBasicMaterial({ vertexColors: true, side: T.BackSide, toneMapped: false })));
    for (const b of spec.boxes || []) { const az = b.az * DEG, el = b.el * DEG, m = new T.Mesh(new T.PlaneGeometry(b.w, b.h), new T.MeshBasicMaterial({ color: col(b.c || '#ffffff').multiplyScalar(b.i), side: T.DoubleSide, toneMapped: false }));
      m.position.set(Math.sin(az) * Math.cos(el) * b.d, Math.sin(el) * b.d, Math.cos(az) * Math.cos(el) * b.d); m.lookAt(0, 0, 0); s.add(m); }
    const pm = new T.PMREMGenerator(R), tex = pm.fromScene(s, .035, .1, 100).texture; pm.dispose();
    s.traverse((x) => { if (x.geometry) { x.geometry.dispose(); x.material.dispose(); } });
    ENVC.set(key, tex); return tex;
  };

  /* ================================================================ light rigs */
  // dir = direction FROM the target TO the light. i = intensity. Only the key casts shadows.
  const RIGS = {
    soft: { key: { dir: [-.55, .95, .8], color: '#fff2e0', i: 2.3 }, fill: { dir: [.85, .2, .6], color: '#dde7ff', i: .5 }, rim: { dir: [.4, .55, -1], color: '#ffffff', i: 1.5 }, env: .85 },
    product: { key: { dir: [-.7, .85, .55], color: '#fff0dc', i: 2.7 }, fill: { dir: [.9, .1, .5], color: '#d9e4ff', i: .3 }, rim: { dir: [.55, .5, -1], color: '#ffffff', i: 2.4 }, env: .7 },
    top: { key: { dir: [-.35, .55, 1], color: '#fff4e6', i: 2.2 }, fill: { dir: [.8, -.3, .7], color: '#e3ebff', i: .45 }, rim: { dir: [.3, 1, .15], color: '#ffffff', i: .8 }, env: .9 },
    night: { key: { dir: [-.45, .8, .75], color: '#dfe5ff', i: 1.5 }, fill: { dir: [.9, .1, .4], color: '#ff86b6', i: .45 }, rim: { dir: [.1, .5, -1], color: '#9db8ff', i: 2 }, env: .5 },
    none: { env: 1 },
  };
  N3.lightRigs = RIGS;

  /* ================================================================ depth of field (post) */
  let RT = null, POST = null; const RTS = new Map();
  const ensurePost = (w, h) => {
    RT = RTS.get(w + 'x' + h);
    if (!RT) {
      if (RTS.size >= 3) { const k0 = RTS.keys().next().value; RTS.get(k0).dispose(); RTS.delete(k0); }
      RT = new T.WebGLRenderTarget(w, h, { samples: 4, type: T.UnsignedByteType, depthBuffer: true, depthTexture: new T.DepthTexture(w, h, T.UnsignedIntType) });
      // the scene is drawn into this target exactly as it would be on the canvas (tone-mapped, sRGB-encoded, resolved MSAA)
      RT.isXRRenderTarget = true; RT.texture.colorSpace = T.SRGBColorSpace; RT.texture.internalFormat = 'RGBA8'; RT.texture.minFilter = RT.texture.magFilter = T.LinearFilter; RT.texture.generateMipmaps = false; RTS.set(w + 'x' + h, RT);
    }
    if (!POST) {
      const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3)); geo.setAttribute('uv', new T.Float32BufferAttribute([0, 0, 2, 0, 0, 2], 2));
      const mat = new T.RawShaderMaterial({ glslVersion: T.GLSL3, depthTest: false, depthWrite: false, blending: T.NoBlending,
        uniforms: { tColor: { value: null }, tDepth: { value: null }, uPx: { value: new T.Vector2() }, uNear: { value: .1 }, uFar: { value: 200 }, uFocus: { value: 10 }, uScale: { value: 0 }, uMax: { value: 16 }, uStep: { value: 1 } },
        vertexShader: 'in vec3 position; in vec2 uv; out vec2 vUv; void main() { vUv = uv; gl_Position = vec4( position.xy, 0.0, 1.0 ); }',
        fragmentShader: `precision highp float; precision highp sampler2D;
uniform sampler2D tColor; uniform sampler2D tDepth; uniform vec2 uPx; uniform float uNear, uFar, uFocus, uScale, uMax, uStep; in vec2 vUv; out vec4 outColor;
vec3 toLin( vec3 c ) { return mix( c / 12.92, pow( ( c + 0.055 ) / 1.055, vec3( 2.4 ) ), step( 0.04045, c ) ); }
vec3 toSrgb( vec3 c ) { return mix( c * 12.92, 1.055 * pow( c, vec3( 1.0 / 2.4 ) ) - 0.055, step( 0.0031308, c ) ); }
vec4 lin( vec2 uv ) { vec4 c = texture( tColor, uv ); if ( c.a > 0.0 ) c.rgb = toLin( min( c.rgb / c.a, 1.0 ) ) * c.a; return c; }
float coc( vec2 uv, out float z ) { float d = texture( tDepth, uv ).r; z = ( uNear * uFar ) / ( uFar - d * ( uFar - uNear ) ); return min( abs( 1.0 / uFocus - 1.0 / z ) * uScale, uMax ); }
void main() {
	float zc; float cc = coc( vUv, zc );
	vec4 acc = lin( vUv ); float tot = 1.0; float radius = uStep;
	for ( int i = 0; i < 520; i ++ ) {
		if ( radius >= uMax ) break;
		float a = float( i ) * 2.39996323;
		vec2 tc = vUv + vec2( cos( a ), sin( a ) ) * uPx * radius;
		float zs; float cs = coc( tc, zs );
		if ( zs > zc ) cs = min( cs, cc * 2.0 );
		float m = smoothstep( radius - 0.5, radius + 0.5, cs );
		acc += mix( acc / tot, lin( tc ), m );
		tot += 1.0; radius += uStep / radius;
	}
	acc /= tot;
	if ( acc.a > 0.0 ) acc.rgb = toSrgb( acc.rgb / acc.a ) * acc.a;
	outColor = acc;
}` });
      const mesh = new T.Mesh(geo, mat); mesh.frustumCulled = false; const sc = new T.Scene(); sc.add(mesh);
      POST = { scene: sc, cam: new T.Camera(), mat };
    }
    return POST;
  };

  /* ================================================================ the component */
  K.kit.scene3d = (parent, o = {}) => {
    const at = o.at || 0, X = o.x || 0, Y = o.y || 0, W = Math.round(o.w || K.W), H = Math.round(o.h || K.H), ss = o.ss || 1, SW = Math.round(W * ss), SH = Math.round(H * ss);
    const bgCss = !o.bg ? '' : Array.isArray(o.bg) ? `background:linear-gradient(${o.bg.join(',')});` : `background:${o.bg};`;
    const el = K.el('canvas', `position:absolute;left:${X}px;top:${Y}px;width:${W}px;height:${H}px;display:none;pointer-events:none;${bgCss}${o.z != null ? 'z-index:' + o.z + ';' : ''}`, parent);
    el.width = W; el.height = H; const g2 = el.getContext('2d');
    const R = getR(), tmpV = new V3(), size2 = new T.Vector2();
    const scene = new T.Scene(), camera = new T.PerspectiveCamera(o.fov || 35, W / H, o.near || .1, o.far || 200); camera.position.set(0, 0, 10);
    const project = (p) => {
      v3(p, tmpV); const depth = -tmpV.clone().applyMatrix4(camera.matrixWorldInverse).z; tmpV.project(camera);
      return { x: X + (tmpV.x * .5 + .5) * W, y: Y + (.5 - tmpV.y * .5) * H, depth, scale: depth > 0 ? (H / 2) / Math.tan(camera.fov * DEG / 2) / depth : 0, visible: depth > camera.near && Math.abs(tmpV.x) <= 1 && Math.abs(tmpV.y) <= 1 };
    };
    if (!R) return { el, scene, camera, update() {}, project, ctx: null, state: null };

    // environment
    const envSpec = o.env === undefined ? 'studio' : o.env;
    if (envSpec) { const sp = typeof envSpec === 'string' ? ENV[envSpec] || ENV.studio : Object.assign({}, ENV[envSpec.preset || 'studio'], envSpec);
      const spec = Object.assign({}, sp); delete spec.preset; delete spec.rotation; delete spec.intensity;
      if (Array.isArray(o.bg) && (envSpec === 'sky' || (envSpec.preset === 'sky' && !envSpec.top))) { spec.top = String(o.bg[0]).trim().split(' ')[0]; spec.bottom = String(o.bg[o.bg.length - 1]).trim().split(' ')[0]; }
      scene.environment = buildEnv(spec); if (envSpec.rotation) scene.environmentRotation.y = envSpec.rotation; }
    // lights
    const lspec = o.lights === undefined ? 'soft' : o.lights, lo = typeof lspec === 'string' ? {} : lspec || {}, rig = lspec ? Object.assign({}, RIGS[typeof lspec === 'string' ? lspec : lo.preset || 'soft'] || RIGS.soft) : { env: 1 };
    for (const k of ['key', 'fill', 'rim']) if (lo[k] === false) delete rig[k]; else if (lo[k]) rig[k] = Object.assign({}, rig[k], lo[k]);
    const sh = Object.assign({ area: 10, res: 2048, soft: 1, bias: -.0006, opacity: 1 }, o.shadow === false ? { off: true } : o.shadow || {}), target = v3(lo.target || sh.center || [0, 0, 0]);
    scene.environmentIntensity = (o.envIntensity == null ? (lo.env == null ? rig.env == null ? 1 : rig.env : lo.env) : o.envIntensity) * (envSpec && envSpec.intensity != null ? envSpec.intensity : 1);
    const lights = { target };
    for (const k of ['key', 'fill', 'rim']) {
      const d = rig[k]; if (!d) continue;
      const L = new T.DirectionalLight(col(d.color || '#ffffff'), d.i == null ? 1 : d.i), dist = sh.area * 2.2;
      L.position.copy(target).addScaledVector(v3(d.dir).normalize(), dist); L.target.position.copy(target); scene.add(L, L.target);
      if (k === 'key' && !sh.off && d.shadow !== false) {
        L.castShadow = true; const s = L.shadow, c = s.camera; s.mapSize.set(sh.res, sh.res); c.left = c.bottom = -sh.area; c.right = c.top = sh.area; c.near = .1; c.far = dist + sh.area * 1.8; c.updateProjectionMatrix();
        s.bias = sh.bias; s.normalBias = sh.normalBias == null ? .012 * sh.area / 10 * 2048 / sh.res + .01 : sh.normalBias; s.intensity = sh.opacity;
        s.radius = Math.tan(4.5 * DEG * sh.soft) * (c.far - c.near) / (2 * sh.area) * sh.res;     // light of ≈9°·soft angular size
      }
      lights[k] = L;
    }

    const ctx = { THREE: T, three: N3, scene, camera, renderer: R, lights, w: W, h: H, lt: 0, focalPx: 1000, look: new V3(), project, mat: N3.mat,
      add(...objs) { scene.add(...objs); dirty = true; return objs[0]; },
      // place the camera from frame(): ctx.cam([x,y,z], [lookX,lookY,lookZ], { fov, roll (deg) })
      cam(pos, look, c = {}) { v3(pos, camera.position); if (look) v3(look, ctx.look); camera.up.set(0, 1, 0); camera.lookAt(ctx.look); if (c.fov) camera.fov = c.fov; if (c.roll) camera.rotateZ(c.roll * DEG); } };
    let dirty = true, ups = [], pres = [], state = null, shown = false;
    try { state = o.build ? o.build(ctx) : null; } catch (e) { K.errors.push('scene3d build: ' + e.message); }
    const keys = o.camera && o.camera.length ? o.camera.slice().sort((a, b) => a.t - b.t) : null;
    const cr = keys ? { pos: N3.track(keys, 'pos', [0, 0, 10]), look: N3.track(keys, 'look', [0, 0, 0]), fov: N3.track(keys, 'fov', o.fov || 35), roll: N3.track(keys, 'roll', 0) } : null;
    const collect = () => { ups = []; pres = []; scene.traverse((x) => { if (x.userData.k3update) ups.push(x); if (x.userData.k3pre) pres.push(x); }); dirty = false; };
    const dof = o.dof ? Object.assign({ focus: 'look', aperture: .12, maxBlur: 18, quality: 1 }, o.dof) : null;

    const comp = { el, scene, camera, ctx, state, three: T, project, cues: () => o.cues || [],
      prepare: () => (PEND.length ? flush() : FL),
      update(lt0) {
        const lt = lt0 - at, vis = lt >= 0 && (o.out == null || lt0 < o.out);
        if (!vis) { if (shown) { el.style.display = 'none'; shown = false; } return; }
        if (!shown) { el.style.display = 'block'; shown = true; }
        ctx.lt = lt;
        if (cr) { const p = cr.pos(lt), l = cr.look(lt), r = cr.roll(lt)[0]; camera.position.set(p[0], p[1], p[2]); ctx.look.set(l[0], l[1], l[2]); camera.fov = cr.fov(lt)[0]; camera.up.set(0, 1, 0); camera.lookAt(ctx.look); if (r) camera.rotateZ(r * DEG); }
        if (o.frame) o.frame(lt, ctx, state);
        camera.updateProjectionMatrix(); scene.updateMatrixWorld(true); camera.updateMatrixWorld(true);
        ctx.focalPx = (SH / 2) / Math.tan(camera.fov * DEG / 2);
        if (dirty) collect();
        for (const u of ups) u.userData.k3update(lt, ctx);
        // render
        // the shared canvas only grows; every component draws into its lower-left SW×SH corner (no realloc when sizes differ)
        R.getSize(size2); if (size2.x < SW || size2.y < SH) { R.setSize(Math.max(size2.x, SW), Math.max(size2.y, SH), false); R.getSize(size2); }
        const CH = size2.y; R.setViewport(0, 0, SW, SH); R.setScissor(0, 0, SW, SH); R.setScissorTest(true);
        R.toneMapping = TONES[o.tone || 'neutral'] ?? T.NeutralToneMapping; R.toneMappingExposure = typeof o.exposure === 'function' ? o.exposure(lt) : o.exposure == null ? 1 : o.exposure;
        for (const x of pres) x.userData.k3pre(R, scene, camera);
        let d = dof; if (d && typeof d.on === 'function' && !d.on(lt)) d = null;
        if (d) {
          const P = ensurePost(SW, SH), U = P.mat.uniforms; let f = typeof d.focus === 'function' ? d.focus(lt, ctx, state) : d.focus;
          if (f === 'look' || f == null) f = ctx.look; if (typeof f !== 'number') f = -v3(f, tmpV).applyMatrix4(camera.matrixWorldInverse).z;
          const ap = typeof d.aperture === 'function' ? d.aperture(lt, ctx, state) : d.aperture;
          R.setRenderTarget(RT); R.clear(); R.render(scene, camera); R.setRenderTarget(null);
          U.tColor.value = RT.texture; U.tDepth.value = RT.depthTexture; U.uPx.value.set(1 / SW, 1 / SH); U.uNear.value = camera.near; U.uFar.value = camera.far;
          U.uFocus.value = Math.max(camera.near * 1.01, f); U.uScale.value = .5 * ap * ctx.focalPx; U.uMax.value = Math.max(1, d.maxBlur * SH / 1080); U.uStep.value = Math.max(.35, 1.1 / d.quality) * Math.max(1, SH / 1080);
          R.clear(); R.render(P.scene, P.cam);
        } else { R.setRenderTarget(null); R.clear(); R.render(scene, camera); }
        g2.globalCompositeOperation = 'copy'; g2.drawImage(R.domElement, 0, CH - SH, SW, SH, 0, 0, W, H);
      } };
    return comp;
  };
})();
