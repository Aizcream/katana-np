/* Katana kit · anim — animation that is more than a transform: things that BEND, TURN, MORPH, FLOOD and LAND.
   Built after the first reference-first test, where every transition had been reduced to slides and zooms while the
   reference peeled stickers, flipped cards, morphed a chip into a paper plane and flooded backgrounds from the action
   point. Everything here is a pure function of the value you pass (no state, no clocks): drive it from scene time.

   K.anim.peel(parent, {el, x, y, w, h, angle, r})   sticker peel: `el` is clipped along a moving fold, its mirrored back folds over
   K.anim.flip(parent, {x, y, w, h})                 a two-faced body that really turns in perspective (front / back)
   K.anim.morph(dA, dB)                              SVG path A → path B (resampled, wound and aligned): (p) → d
   K.anim.flood(parent, {x, y, colors})              background change as concentric shapes growing from the action point
   K.anim.iris(el, {x, y})                           reveal `el` through a growing circle / rounded box, with outline rings
   K.anim.slam(lt, t0)                               an object dropped from the camera: big ghost → hit → squash → settle
   K.anim.pop(e, lt, t0)                             squash-and-stretch entrance with a rotation that settles (follow-through)
   K.anim.ghostType(el, text, lt, t0, t1)            typed line whose newest characters arrive as a pale ghost
   K.anim.anticipate / K.anim.follow / K.anim.squash / K.anim.arc    the principles as small functions (see docs/anim.md) */
(function () {
  const K = window.K, { E, p: P, lerp, clamp, div } = K, A = K.anim = {};
  const rad = (d) => d * Math.PI / 180;

  /* ---------- principles as functions ---------- */
  // anticipation: go the other way first (a·amount), then overshoot (o) and settle — p in 0..1 → value 0..1
  A.anticipate = (q, a = .12, o = .08) => { q = clamp(q); if (q < .22) return -a * Math.sin(q / .22 * Math.PI); const u = (q - .22) / .78; return 1 + o * Math.sin(u * Math.PI) * (1 - u) - Math.pow(1 - u, 3); };
  // follow-through / overlapping action: a child evaluates its parent's motion `lag` seconds late
  A.follow = (fn, lag) => (t) => fn(t - lag);
  // squash and stretch that keeps the area: k > 0 stretches along y (speed), k < 0 squashes (impact)
  A.squash = (k) => { const sy = 1 + k, sx = 1 / Math.sqrt(Math.max(.2, sy)); return `scale(${sx.toFixed(4)},${sy.toFixed(4)})`; };
  // arc between two points with a bulge (share of the distance, + = to the left of travel): (q) → {x, y, a (deg, tangent)}
  A.arc = (x0, y0, x1, y1, bulge = .25) => { const mx = (x0 + x1) / 2 + (y1 - y0) * bulge, my = (y0 + y1) / 2 - (x1 - x0) * bulge;
    return (q) => { const u = 1 - q, x = u * u * x0 + 2 * u * q * mx + q * q * x1, y = u * u * y0 + 2 * u * q * my + q * q * y1, tx = 2 * u * (mx - x0) + 2 * q * (x1 - mx), ty = 2 * u * (my - y0) + 2 * q * (y1 - my); return { x, y, a: Math.atan2(ty, tx) * 180 / Math.PI }; }; };
  // entrance with squash & stretch: stretches while it grows, squashes on arrival, rotation settles a beat later
  A.pop = (e, lt, t0, { d = .34, rot = 0, r0 = -12, from = .3, c = true, extra = '', sq = .14 } = {}) => {
    if (lt < t0) { e.style.visibility = 'hidden'; return 0; }
    e.style.visibility = 'visible';
    const x = (lt - t0) / d, k = K.pop(lt, t0, d), q = E.soft(P(lt, t0, t0 + d * 1.25)), s = from + (1 - from) * k;
    const st = x < 1 ? sq * Math.sin(Math.min(1, x * 1.6) * Math.PI) * (x < .45 ? 1 : -1) * (1 - x) * 1.6 : 0;     // stretch going up, squash on the hit
    e.style.transform = `${c ? 'translate(-50%,-50%) ' : ''}${extra}rotate(${(rot + r0 * (1 - q)).toFixed(3)}deg) scale(${(s * (1 - st * .5)).toFixed(4)},${(s * (1 + st)).toFixed(4)})`;
    return q;
  };
  // dropped from the camera (stamps, stickers landing): {on, s, sx, sy, o, r} — s falls from `from` to 1, then the impact squashes
  A.slam = (lt, t0, { from = 1.9, d = .13, rot = 14, sq = .16 } = {}) => {
    const x = lt - t0; if (x < 0) return { on: false, s: from, sx: 1, sy: 1, o: 0, r: rot };
    if (x < d) { const q = E.in(2)(x / d); return { on: true, s: lerp(from, 1, q), sx: 1, sy: 1, o: lerp(.45, 1, q), r: rot * (1 - q) }; }
    const u = x - d, w = Math.exp(-9 * u) * Math.cos(u * 34);
    return { on: true, s: 1, sx: 1 + sq * w, sy: 1 - sq * w, o: 1, r: 0 };
  };
  A.slamTo = (e, lt, t0, o = {}) => { const m = A.slam(lt, t0, o); e.style.visibility = m.on ? 'visible' : 'hidden'; if (!m.on) return m;
    e.style.opacity = m.o < .999 ? m.o.toFixed(3) : ''; e.style.transform = `translate(-50%,-50%) rotate(${((o.rest || 0) + m.r).toFixed(2)}deg) scale(${(m.s * m.sx).toFixed(4)},${(m.s * m.sy).toFixed(4)})`; return m; };
  // typed text; the newest `ghost` characters are pale (they "arrive"), like a hand that has not pressed fully yet
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  A.ghostType = (e, text, lt, t0, t1, { seed = 7, ghost = 2, alpha = .32 } = {}) => {
    if (!e.__gt) e.__gt = K.cadence(text, t0, t1, seed);
    const n = K.typedN(e.__gt, lt), done = n >= text.length && lt > t1 + .07, g = done ? 0 : Math.min(ghost, n);
    e.innerHTML = esc(text.slice(0, n - g)) + (g ? `<span style="opacity:${alpha}">${esc(text.slice(n - g, n))}</span>` : '');
    return n;
  };

  /* ---------- geometry ---------- */
  // polygon = rect [x0,y0]–[x1,y1] ∩ { keep · (dot(P − C, d) − f) ≥ 0 } as a CSS polygon() string
  A.halfPoly = (x0, y0, x1, y1, cx, cy, dx, dy, f, keep) => {
    const V = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]], out = [], g = (v) => ((v[0] - cx) * dx + (v[1] - cy) * dy - f) * keep;
    for (let i = 0; i < 4; i++) { const a = V[i], b = V[(i + 1) % 4], ga = g(a), gb = g(b); if (ga >= 0) out.push(a); if ((ga >= 0) !== (gb >= 0)) { const t = ga / (ga - gb); out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); } }
    return out.length >= 3 ? 'polygon(' + out.map((v) => `${v[0].toFixed(1)}px ${v[1].toFixed(1)}px`).join(',') + ')' : 'polygon(0 0,0 0,0 0)';
  };

  /* ---------- peel: a sticker folds over itself and leaves ----------
     `el` (already in `parent`, any size, positioned at the parent's 0,0 frame) is the sticker; {x, y, w, h} is its card
     rectangle in parent px and `r` its corner radius. The fold travels along `angle` (deg; 35 = from the top-left corner
     towards the bottom-right). set(f): f px of travel (0 = stuck, P.U = the whole sticker is folded over); set(f, fly):
     fly 0..1 lifts the folded sticker off towards the camera and out along the same direction.
     The part behind the fold is clipped away from `el`; a mirrored back (paper colour, outline, crease shading, soft
     shadow) lies over what is still stuck. Whatever is under `el` in the DOM shows through: put the next card there. */
  A.peel = (parent, o) => {
    const { el: target, x, y, w, h, angle = 35, r = 46, back = '#FFFDF8', ink = '#111214', line = 5, shade = .3, flyDist = 1500, big = 3000 } = o;
    const a = rad(angle), dx = Math.cos(a), dy = Math.sin(a), U = Math.abs(w * dx) + Math.abs(h * dy), cx = x + w / 2, cy = y + h / 2;
    const holder = div(parent, `left:0;top:0;width:0;height:0;transform-origin:${cx}px ${cy}px;pointer-events:none`);
    const mirror = div(holder, `left:${x}px;top:${y}px;width:${w}px;height:${h}px;transform-origin:0 0;filter:drop-shadow(0 0 22px rgba(20,24,24,${shade}))`);
    const inner = div(mirror, `left:0;top:0;width:${w}px;height:${h}px;box-sizing:border-box;border-radius:${r}px;border:${line}px solid ${ink};background:${back};overflow:hidden`);
    const crease = div(inner, `left:0;top:0;width:${2 * big}px;height:190px;transform-origin:0 0;box-sizing:border-box;border-bottom:3px solid ${ink};` +
      `background:linear-gradient(0deg,rgba(255,255,255,.96) 0,rgba(255,255,255,0) 12px),linear-gradient(0deg,rgba(60,54,44,${shade * 1.05}) 0,rgba(60,54,44,0) 100%)`);
    holder.style.visibility = 'hidden';
    return { el: holder, U, target,
      set(f, fly = 0) {
        const st = target.style;
        if (f <= 0) { st.clipPath = 'none'; holder.style.visibility = 'hidden'; return; }
        const full = f >= U; f = Math.min(f, U);
        // an empty clip (not visibility) hides the sticker: its children may carry their own visibility
        st.clipPath = full ? 'polygon(0 0,0 0,0 0)' : A.halfPoly(-big, -big, big, big, cx, cy, dx, dy, f - U / 2, 1);
        if (fly >= 1) { holder.style.visibility = 'hidden'; return; }
        holder.style.visibility = 'visible';
        // local frame of the mirror box (origin = card top-left): fold line through Q with normal d
        const qx = w / 2 + (f - U / 2) * dx, qy = h / 2 + (f - U / 2) * dy, qd = qx * dx + qy * dy;
        mirror.style.transform = `matrix(${(1 - 2 * dx * dx).toFixed(6)},${(-2 * dx * dy).toFixed(6)},${(-2 * dx * dy).toFixed(6)},${(1 - 2 * dy * dy).toFixed(6)},${(2 * qd * dx).toFixed(2)},${(2 * qd * dy).toFixed(2)})`;
        inner.style.clipPath = full ? 'none' : A.halfPoly(0, 0, w, h, w / 2, h / 2, dx, dy, f - U / 2, -1);
        crease.style.transform = `translate(${qx.toFixed(1)}px,${qy.toFixed(1)}px) rotate(${angle - 90}deg) translate(${-big}px,-190px)`;
        crease.style.opacity = (1 - fly).toFixed(3);
        const k = E.in(2)(clamp(fly));
        holder.style.transform = fly > 0 ? `translate(${(k * flyDist * dx).toFixed(1)}px,${(k * flyDist * dy * .35 - k * 120).toFixed(1)}px) rotate(${(k * 16).toFixed(2)}deg) scale(${(1 + k * .55).toFixed(4)})` : 'none';
        holder.style.opacity = fly > .55 ? (1 - P(fly, .55, 1)).toFixed(3) : '';
      } };
  };

  /* ---------- flip: a body with two faces that turns in perspective ----------
     Build the two sides into `.front` and `.back`; set(deg, {axis:'Y'|'X', z, tilt, s}) turns it. 0 = front, 180 = back.
     The perspective lives on the returned stage, so the turn foreshortens for real (no scaleX fake). */
  A.flip = (parent, { x, y, w, h, persp = 2600 }) => {
    const stage = div(parent, `left:${x}px;top:${y}px;width:${w}px;height:${h}px;perspective:${persp}px;transform-origin:50% 50%`);
    const body = div(stage, 'inset:0;transform-style:preserve-3d;transform-origin:50% 50%');
    const face = 'inset:0;backface-visibility:hidden;-webkit-backface-visibility:hidden';
    const front = div(body, face), back = div(body, face + ';transform:rotateY(180deg)');
    return { el: stage, body, front, back,
      set(deg, { axis = 'Y', z = 0, tilt = 0, s = 1 } = {}) { body.style.transform = `translateZ(${z.toFixed(1)}px) rotateZ(${tilt.toFixed(3)}deg) rotate${axis}(${deg.toFixed(3)}deg) scale(${s.toFixed(4)})`; } };
  };

  /* ---------- morph: one outline becomes another ----------
     Both paths are resampled to n points by length, wound the same way and rotated to the best start, then blended.
     Coordinates are kept as given: author both shapes around the same centre. Returns (p 0..1) → path d. */
  A.morph = (dA, dB, n = 144) => {
    const NS = 'http://www.w3.org/2000/svg', svg = document.createElementNS(NS, 'svg');
    svg.style.cssText = 'position:absolute;left:0;top:0;width:10px;height:10px;visibility:hidden'; document.body.appendChild(svg);
    const sample = (d) => { const pt = document.createElementNS(NS, 'path'); pt.setAttribute('d', d); svg.appendChild(pt); const L = pt.getTotalLength(), out = []; for (let i = 0; i < n; i++) { const q = pt.getPointAtLength(L * i / n); out.push([q.x, q.y]); } return out; };
    const a = sample(dA); let b = sample(dB); svg.remove();
    const area = (S) => S.reduce((s, q, i) => { const t = S[(i + 1) % n]; return s + q[0] * t[1] - t[0] * q[1]; }, 0), cen = (S) => S.reduce((s, q) => [s[0] + q[0] / n, s[1] + q[1] / n], [0, 0]);
    if (Math.sign(area(a)) !== Math.sign(area(b))) b.reverse();
    const ca = cen(a), cb = cen(b); let best = 0, bc = Infinity;
    for (let k = 0; k < n; k++) { let c = 0; for (let i = 0; i < n; i += 3) { const q = a[i], t = b[(i + k) % n]; c += (q[0] - ca[0] - t[0] + cb[0]) ** 2 + (q[1] - ca[1] - t[1] + cb[1]) ** 2; } if (c < bc) { bc = c; best = k; } }
    b = b.map((_, i) => b[(i + best) % n]);
    return (t) => { t = clamp(t); let d = ''; for (let i = 0; i < n; i++) d += (i ? 'L' : 'M') + lerp(a[i][0], b[i][0], t).toFixed(1) + ',' + lerp(a[i][1], b[i][1], t).toFixed(1); return d + 'Z'; };
  };

  /* ---------- flood: the background changes from where the action is ----------
     `colors` from the first ring to the last; the LAST one is the colour the frame ends on (e.g. [to, from, to] gives a
     ripple of bands). set(q 0..1). Put it right above the scene's base background. */
  A.flood = (parent, { x, y, colors, ink = '#111214', line = 5, gap = .2, R }) => {
    R = R || Math.hypot(Math.max(x, K.W - x), Math.max(y, K.H - y)) + 60;
    const els = colors.map((c) => div(parent, `left:${x - R}px;top:${y - R}px;width:${2 * R}px;height:${2 * R}px;border-radius:50%;box-sizing:border-box;background:${c};border:${line}px solid ${ink};transform-origin:50% 50%;visibility:hidden`));
    return { els, set(q, ease = E.out(2.2)) { const n = els.length; els.forEach((e, i) => { const k = ease(clamp(q * (1 + gap * (n - 1)) - i * gap)); e.style.visibility = k <= 0 ? 'hidden' : 'visible'; e.style.transform = `scale(${Math.max(.0001, k).toFixed(4)})`; }); } };
  };

  /* ---------- iris: the next scene opens through a growing shape ----------
     Clips `el` (the incoming layer) to a circle — or, with {box:[w,h], round}, to a rounded box that keeps its aspect —
     centred on (x, y), and draws outline rings in `over` (a layer that is NOT clipped; defaults to el's parent).
     set(q 0..1): q = 1 covers the frame. */
  A.iris = (el, { x, y, over, rings = [{ c: '#111214', w: 5 }], box, round = .5, R }) => {
    R = R || Math.hypot(Math.max(x, K.W - x), Math.max(y, K.H - y)) + 80;
    const asp = box ? box[0] / box[1] : 1, layer = over || el.parentNode;
    const rs = rings.map((g) => div(layer, `left:${x}px;top:${y}px;box-sizing:border-box;border:${g.w}px solid ${g.c};pointer-events:none;visibility:hidden`));
    return { rings: rs, set(q, ease = E.in(1.6)) {
      q = clamp(q); if (q <= 0) { el.style.clipPath = 'circle(0px at 0px 0px)'; rs.forEach((e) => { e.style.visibility = 'hidden'; }); return; }
      if (q >= 1) { el.style.clipPath = 'none'; rs.forEach((e) => { e.style.visibility = 'hidden'; }); return; }
      const rr = ease(q) * R * (box ? 1.45 : 1);
      if (box) { const hw = rr * Math.min(1, asp), hh = hw / asp; el.style.clipPath = `inset(${(y - hh).toFixed(1)}px ${(K.W - x - hw).toFixed(1)}px ${(K.H - y - hh).toFixed(1)}px ${(x - hw).toFixed(1)}px round ${(Math.min(hw, hh) * round * 2).toFixed(1)}px)`; }
      else el.style.clipPath = `circle(${rr.toFixed(1)}px at ${x}px ${y}px)`;
      rs.forEach((e, i) => { const g = rings[i], k = rr + (g.off || 0) * (1 + q), hw = box ? k * Math.min(1, asp) : k, hh = box ? hw / asp : k;
        e.style.visibility = 'visible'; e.style.width = (2 * hw).toFixed(1) + 'px'; e.style.height = (2 * hh).toFixed(1) + 'px'; e.style.margin = `${(-hh).toFixed(1)}px 0 0 ${(-hw).toFixed(1)}px`; e.style.borderRadius = box ? (Math.min(hw, hh) * round * 2).toFixed(1) + 'px' : '50%'; });
    } };
  };
})();
