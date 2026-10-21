# ui.js — product / UI mockups (K.kit.*)

Devices, browser windows, search bars, cursors, chips, cards, tickers, rotating badges, mono labels, Lighthouse
gauges, iOS notifications, video players and CTA buttons — the "app launch" layer of a Katana NP film (the look of the
r2 *dusk* and r1 *Peel* references). Demo / test page: `engine/demos/ui.html` (`?fmt=16x9` for landscape).

```
./katana gallery engine/demos/ui.html 1.6,2.9,4.9,6.3,9.8,13.6,15.32,16.9,20.6,25.6,27.6,32.5,34.8
node tools/capture.mjs engine/demos/ui.html <dir> --query fmt=16x9 --size 1920x1080 --stills 2.9,4.9,9.8,15.32,25.6 --serve .
```

Demo timeline (9:16, 36.2 s): phone + finger swipes (`cursor` shape `'touch'`) + chip + counting label 0–3.4 ·
browser (cursor clicks the URL, URL typed, skeleton load, scroll) 3.4–6.9 · laptop (lid opens) + badge + ticker 6.9–10.4 · searchBar → chips + cursor click 10.4–15.4 · cards dealt
15.4–18.6 · chipCloud 18.6–21.8 · lighthouse 81→94 21.8–26 · player + notification 26–29.4 · phone with a `build`
(chat) screen + WhatsApp button 29.4–32.6 · CTA button + badge + ticker 32.6–36.2.

## Conventions (all fifteen components)

* Factory: `const c = K.kit.<name>(parent, opts)` → `{ el, update(lt), cues(), dur, … }` (+ `prepare(lt)` when it shows
  footage frames: phone / browser / laptop / card / player with `clip`). Inside a scene pass it to `add()` (driven
  automatically, `prepare` awaited) and register its sounds with `K.addCues(c, scene.t0)`:
  ```js
  K.scene({ id: 'web', t0: 3, t1: 6.5, build(root, add) {
    const w = K.div(root, 'inset:0');                       // never style the scene root itself
    const b = add(K.kit.browser(w, { at: 0, src: 'assets/ui/site_desktop.jpg', url: 'auroracafe.co',
                                     typeUrl: .5, load: [1.2, 1.7], scroll: [[2, 0], [2.6, .3]] }));
    const [ux, uy] = b.urlAt();
    add(K.kit.cursor(w, { path: [[.3, 800, 1500], [1.0, ux + 40, uy]], clicks: [1.1] }));
    K.addCues(b, 3);                                         // 3 = this scene's t0
  } });
  ```
* **Times are scene-local seconds** (`lt`). `at` = start (default 0). Before `at` the component is `display:none`.
  `out` = time the exit starts (no `out` → stays until the scene ends); `outDur` = exit length. Exits accelerate into
  the cut (speed peak at the end).
* **Position**: `x`, `y` are the component's CENTRE in film pixels (exceptions: `notification` → `y` is the TOP of the
  banner; `label` → `anchor` decides). Default `x = K.W/2`, `y = K.H/2` unless noted.
* **Animatable numbers** accept a number, keyframes `[[t, v], [t, v, ease], …]` (scene-local, `K.kf`, default ease
  `E.smooth`) or a function `(lt) => v`. Example: `ry: [[0, -14], [3.5, 10]]` (slow turn), `s: [[.8, .9], [3.4, 1.05]]`
  (push-in), `y: (lt) => 960 + Math.sin(lt) * 10`. Which options animate, per component:

  | component | animatable | | component | animatable |
  |---|---|---|---|---|
  | phone, browser, card, player | `x y rx ry rz s` | | badge | `x y s` |
  | laptop | `x y rx ry rz s lean` | | lighthouse, button, chip | `x y s` |
  | searchBar | `x y s rz` | | ticker | `x y rot` |
  | chipCloud, label, notification | `x y` | | cursor | moves along `path` |

  Everything else (sizes, colours, `rot` on chip, …) is read once at build time.
* **Sizes** default per format: values in the tables are `9:16 / 16:9` (1080×1920 / 1920×1080). Everything is built at
  its real pixel size (crisp), so prefer the size option (`w`, `size`, `r`) over scaling with `s`.
* **Theme**: accents default to `var(--k-accent)` (blue), `--k-accent2` (lime), `--k-accent3` (orange-red), text to
  `var(--k-fg)`; fonts to `--k-display` (Inter Tight), `--k-serif`, `--k-mono` (Geist Mono), `--k-wide` (Archivo).
  Any CSS colour string works for colour options.
* **Markup** in titles/text (chip, card title, ticker items, button, notification title/body, player title/tag,
  lighthouse labels): `*word*` → Instrument Serif italic emphasis (the Katana one-word italic). HTML is escaped.
* **Object entrances** (`enter`; phone / browser / laptop / card / player): `'rise'` (default — springs up from below
  the frame tilted back 34° and settles with ~4 % overshoot), `'drop'` (from above), `'pop'` (scale .2→1 + blur),
  `'flip'` (turns in on Y from −120°), `'slide-left'` / `'slide-right'` (`'slide'` = right), `'zoom'` (from ×2.1 with
  blur — out of the camera), `'deal'` (from below with a big tilt; `dealSide: ±1` sets the side), `'none'`.
  `enterSpeed` (default 1) scales the entrance clock (1.5 = faster).
  **Object exits** (`exit`): `'fall'` (default), `'rise'`, `'pop'`, `'zoom'` (×7 into the camera — use it as a
  transition into the screen), `'slide-left'` (`'slide'`), `'slide-right'`, `'none'`.
* `float: true | { amp, hz, rot }` (phone / browser / laptop / card) — gentle idle bob + sway (defaults: amp 1.4 % of
  height, 0.32 Hz, rot 0.7°).
* `cues()` returns `[{kind, t, gain}]` in scene-local time. Kinds used: `whoosh`, `swipe`, `pop`, `key`, `click`,
  `cta`, `ding`, `riser`, `tick`, `blip`, `hit`, `swoosh`. Every component accepts `cue: false` (no cues).
* All animation is a pure function of `lt`; footage frames hold under the motion-blur shutter (`K.heldTime`);
  determinism check passes (see *Determinism notes* at the end).

### Media (`src` / `clip` / `build`) — phone screen, browser & laptop viewport, card cover, player

| option | default | |
|---|---|---|
| `src` | — | image URL (relative to the page). Fills the box (`object-fit` = `fit`) |
| `clip` | — | frame-sequence dir (`<dir>/_clip.json`, from `katana clip`). Plays from `clipAt` |
| `clipAt` / `clipIn` / `rate` / `loop` | 0 / 0 / 1 / false | clip starts at scene time `clipAt`, from clip second `clipIn` |
| `clipTime` | — | `(lt) => clipSeconds` override (player sets this itself) |
| `build` (alias `content`) | — | `(el, {w, h}) => ({ update(lt), prepare(lt) } | void)` — custom DOM screen |
| `fit` / `focus` | `'cover'` / `[.5, .5]` | object-fit and focal point (fractions) |
| `scroll` | — | `[[t, frac], …]` frac of max scroll (0 top … 1 bottom); content laid at box width |
| `scrollPx` | — | `[[t, px], …]` alternative in content pixels |
| `scrollEase` | `E.smooth` | ease between scroll keys (per key: third item) |
| `scrollBlur` | .5 | stylised vertical smear ∝ scroll speed (0 = off; real blur comes from `--mb`) |

Tall screenshots for scrolling: `engine/demos/assets/ui/site_desktop.jpg` (1440×4500, the site of "Aurora Café", a
fictional coffee shop used for every demo) and `site_mobile.jpg` (860×9140, mobile layout) — regenerate/edit with
`assets/ui/site_mock.html`.
A `build` page may also scroll: its natural `offsetHeight` (measured at build) is the content height.

---

## 1 · `K.kit.phone(parent, opts)` — iPhone-style device

iPhone 15 Pro proportions (h = 2.06·w), 16 % corner radius, metal ring + thin black bezel, dynamic island with lens,
side buttons, 7-layer metal thickness visible when tilted, status bar, home bar, moving screen glare, soft two-layer
floor shadow that follows the tilt. 3D tilt via `rx ry rz` (perspective on the device).

| option | default | |
|---|---|---|
| `w` (alias `size`) | 540 / 367 (= .5·W / .34·H) | device width; screen = w − 8.4 % |
| `x`, `y` | centre | device centre (animatable) |
| `rx`, `ry`, `rz`, `s` | 0, 0, 0, 1 | tilt (deg) / scale (animatable). Nice hero: `rz: -4, ry: 8` |
| `color` (alias `finish`) | `'black'` | `'black' 'silver' 'titanium' 'blue' 'white'` |
| media opts | — | `src` / `clip` / `build` / `scroll` … (screen box = `sw × sh`) |
| `screenBg` | `'#000'` | screen colour behind media |
| `statusBar` | `'light'` (`'dark'` when scrolling) | `'light'` white text, `'dark'` black, `false` none |
| `statusBg` | frosted white when scrolling, else none | CSS background behind the status bar |
| `time` | `'9:41'` | status-bar clock |
| `homeBar` / `glare` | true / 1 | home indicator; glare opacity (0 = off) |
| `shadow` | .5 | floor-shadow opacity |
| `perspective` | 5·w | px |
| `enter` / `exit` / `out` / `outDur` | `'rise'` / `'fall'` / — / .5 | see conventions |
| `float` | false | idle bob |

Returns `{ el, body, screen, w, h, sw, sh, media, pointAt(fx, fy, lt?) → [x, y] }` — `pointAt` maps a point on the
screen (fractions) to film px (ignores tilt), e.g. to aim a cursor/finger. `dur` 1. Cues: `whoosh` at `at` (+ at `out`).

```js
add(K.kit.phone(w, { at: .15, x: 540, y: 1230, w: 500, src: 'assets/ui/site_mobile.jpg',
  scroll: [[1.2, 0], [2.1, .16], [2.9, .3]], rz: -4, ry: 8, float: true }));
add(K.kit.phone(w, { at: .1, enter: 'flip', color: 'silver', statusBar: 'dark', build: (el, { w, h }) => {
  el.style.background = '#EFE7DE'; const b = K.div(el, 'left:20px;top:200px', '¡Hola! 👋');
  return { update(lt) { b.style.transform = `scale(${K.pop(lt, 1, .45) + 1e-5})`; } };
} }));
add(K.kit.phone(w, { at: 0, clip: 'assets/clips/c3293', enter: 'pop', color: 'titanium' }));
```

## 2 · `K.kit.browser(parent, opts)` — browser window with a scrolling page

macOS window: traffic lights, back/forward, centred URL pill (lock + url + reload), optional URL typing with caret,
page load (accent progress bar, a grey skeleton page with a moving shimmer, then the real page wipes in top-down), eased
scroll of a tall screenshot (or a `build` page), soft shadow. The chrome is drawn ≈2× real macOS scale so the URL is
readable on a phone (26 px text on the default 9:16 window).

| option | default | |
|---|---|---|
| `w`, `h` | 950×1236 / 1190×714 | window size (h default: 1.3·w portrait, .6·w landscape; even px) |
| `x`, `y`, `rx ry rz s` | centre, 0… | animatable; entrance tilt is damped (×.6) |
| `url` | `'auroracafe.co'` | text in the URL pill |
| `typeUrl` | — | time the URL types itself (≈15 cps, human cadence, caret) |
| `load` | — | `[t0, t1]`: accent progress bar t0→t1, page wipes in from the top over t1−.05 … t1+.5. Before the wipe the window shows the skeleton (from `at`) |
| `skeleton` / `skeletonColor` | true (with `load`) / 7.5 % ink | grey placeholder page (nav, hero, headline, 3 cards) + shimmer; `false` = plain `pageBg`. Light blocks only when `theme: 'dark'` AND a `pageBg` is given |
| `theme` | `'light'` | `'dark'` chrome |
| `chrome` / `barH` | true / clamp(.085·w (9:16) · .072·w (16:9), 36, 100) | show the bar / its height (URL text = .32·barH) |
| `radius` | max(10, .022·w) | corner radius |
| media opts | — | usually `src` (tall screenshot) + `scroll` |
| `pageBg` | `'#fff'` | viewport colour before/without media |
| `shadow` | 1 | shadow strength |
| `enter` / `exit` / `out` | `'rise'` / `'fall'` / — | |

Returns `{ el, body, win, viewport, media, w, h, barH, pointAt(fx, fy, lt?), urlAt(lt?) }` — `pointAt` uses fractions
of the whole window (fy 0 = top of the chrome bar); `urlAt` = URL pill centre. Cues: `whoosh` at `at`, `swipe` per
scroll move, `key` at `typeUrl`, `ding` at `load[1]`.

```js
const b = add(K.kit.browser(w, { at: 0, y: 1060, w: 950, h: 1180, src: 'assets/ui/site_desktop.jpg',
  url: 'auroracafe.co', typeUrl: .85, load: [1.65, 2.05], scroll: [[2.45, 0], [2.9, .2], [3.45, .38]], rx: 4 }));
const [ux, uy] = b.urlAt();                                   // click the URL pill first, then it types
add(K.kit.cursor(w, { path: [[.25, 800, 1500], [.72, ux + 30, uy + 6]], clicks: [.78] }));
```

## 2b · `K.kit.laptop(parent, opts)` — MacBook-style laptop (real 3D lid + keyboard deck)

Lid (aluminium rim, black bezel, notch + macOS menu bar) holding a browser window, hinged to a 3D keyboard deck
(keys, trackpad, front lip with thumb notch) and a table shadow. Seen from slightly above by default.

| option | default | |
|---|---|---|
| `w` | 972 / 883 (.9·W / .46·W) | lid width (lid h = .655·w, deck depth .66·w) |
| `x`, `y` | W/2, .45·H / .44·H | centre of the LID (the deck hangs below it) |
| `rx` | −16 | view tilt (negative = camera above; keep ≤ 0 — the deck underside isn't modelled) |
| `ry`, `rz`, `s` | 0, 0, 1 | animatable; a slow `ry: [[0, -14], [3.5, 10]]` turn looks great |
| `lean` | 6 | lid lean-back (deg, animatable) |
| `enter` | `'rise'` | plus `'open'`: rises while the lid opens from closed (spring) |
| `color` | `'silver'` | `'space'` (alias `'black'`) |
| `notch` | true | notch + menu bar strip |
| browser opts | — | `url`, `typeUrl`, `load`, `theme`, `chrome` (true), `barH` (clamp(.046·sw, 26, 70)) |
| media opts | — | `src` + `scroll` (the page inside the window) |
| `glare` / `shadow` / `perspective` | .9 / 1 / 3·w | |

Returns `{ el, body, lid, deck, screen, viewport, media, w, h, sw, sh }`. Cues: `whoosh` (+ `hit` when the lid lands
for `'open'`).

```js
add(K.kit.laptop(w, { at: 0, enter: 'open', y: 1000, w: 940, src: 'assets/ui/site_desktop.jpg',
  scroll: [[1.4, 0], [2.3, .3], [3.2, .5]], ry: [[0, -14], [3.5, 10]], rx: -14 }));
```

## 3 · `K.kit.searchBar(parent, opts)` — prompt bar → typing → submit → chips with connectors

Entrance: pops in as a circle with the icon spinning in, then the width grows (accelerate → long settle); placeholder
and button arrive. Human-cadence typing (`K.cadence`) with an accent caret; while focused the pill gets a crisp accent
border + soft accent halo (the r2 look); the query auto-shrinks to
fit (down to 72 %), then scrolls like a real input. Submit: button press (squash + brightness + ring), bar squash, the
query flies up blurred, then chips spawn alternately above/below, each preceded by an orthogonal connector line that
draws on from a dot on the bar (the r2 "MOOD 01" look).

| option | default | |
|---|---|---|
| `w`, `h` | 908×132 / 960×112 | bar size (even px) |
| `size` | .34·h | font px (placeholder / query) |
| `x`, `y`, `s`, `rz` | centre, 1, 0 | animatable — `s: [[.8, .9], [3.4, 1.05]]` = the Katana push-in while typing (chips/lines scale with it) |
| `focusRing` | true | accent border + halo while typing; `false` = off |
| `theme` | `'light'` | `'dark'` |
| `icon` | `'sparkle'` | any ICON key (`'search'`, `'link'`…), an `<svg>` string, or `false` |
| `button` | arrow-up circle | ICON key, a text label (`'Analizar'` → accent pill) or `false` |
| `placeholder` | `'¿Qué necesita tu web?'` | |
| `text` | `''` | the typed query |
| `typeAt` / `typeDur` / `cps` / `seed` | at+.85 / len/cps / 16 / 7 | typing window (cadence is seeded) |
| `fit` | true | auto-shrink long queries |
| `submitAt` | typeEnd + .45 | press time; `false` = no submit |
| `chips` | [] | strings or chip specs (any `chip` option) + `side` `'top'|'bottom'`, `dx`, `dy` (offset from bar centre), `label` |
| `chipsAt` / `chipStagger` | submit + .18 / .16 | first line starts / gap; each chip pops .2 s after its line |
| `chipSize` / `chipStyle` | 1.05·size / `'light'` | |
| `chipLabel` | — | e.g. `'IDEA'` → mono captions `IDEA 01`, `IDEA 02`… |
| `chipGap` | 1.15·h | vertical distance bar edge → chip centre |
| `chipsOut` | — | time chips + lines leave |
| `clear` | true when chips exist | query flies out on submit |
| `lineColor` | 32 % fg | connector colour |
| `out` / `outDur` | — / .5 | exit: width collapses to the circle, then pops away |

Returns `{ el, pill, w, h, chips, typeAt, typeEnd, submitAt, chipsAt, buttonAt(lt?) → [x, y] }` — aim a cursor at
`buttonAt(sb.submitAt)` (follows `x y s rz` at that time; default lt = the final pose) and click at `submitAt`. Cues: `pop` at `at`, `key` per typed character (gain .32), `click` at submit,
`pop` per chip. `dur` = until the last chip settles.

```js
const sb = add(K.kit.searchBar(w, { at: .1, s: [[.8, .9], [3.4, 1.05]], text: 'Rediseño con Astro que cargue rápido', chipLabel: 'IDEA',
  chips: [{ text: 'Astro', icon: '🚀' }, { text: 'SEO', icon: '🔍' }, { text: 'Lighthouse 94', icon: 'dot', color: '#0CCE6B' }] }));
const [bx, by] = sb.buttonAt(sb.submitAt);
add(K.kit.cursor(w, { path: [[sb.typeEnd - .7, bx + 160, by + 420], [sb.submitAt - .05, bx + 4, by + 6]],
  clicks: [sb.submitAt], shape: 'hand', out: sb.submitAt + .9 }));
```

## 4 · `K.kit.cursor(parent, opts)` — macOS arrow / pointing hand / finger touch

Moves along keyframes with a human ease (fast start, long decel into the target) and a slight arc (alternating side),
tilts a little with horizontal speed, presses (scale .8 + rebound) and emits two ripple rings on each click.

| option | default | |
|---|---|---|
| `path` | `[[at, x, y]]` | `[[t, x, y, ease?], …]` film px; hotspot = arrow tip / fingertip |
| `x`, `y` | centre | static position when no `path` |
| `at` | `path[0][0]` | appears (pop) at the first key |
| `clicks` | [] | click times |
| `shape` / `shapes` | `'arrow'` / [] | `'hand'` (pointer), `'touch'` (iOS finger disc, hotspot = centre — swipes/taps on a phone); `shapes: [[t, 'hand'], [t2, 'arrow']]` switches with a tiny pop |
| `size` | 80 / 58 | px |
| `ease` / `arc` / `tilt` | `E.bez(.5,0,.12,1)` / .12 / 1 | arc = sideways bow as fraction of the segment length |
| `ringColor` | accent | click rings |
| `enter` | `'pop'` | `'none'` (e.g. when it enters from off-frame) |
| `out` / `outDur` | — / .25 | shrinks away |
| `z` | 40 | |

Returns `{ el, pos(lt) → [x, y] }`. Cues: `click` per click.

```js
add(K.kit.cursor(w, { path: [[1.2, 900, 1440], [1.92, ix + 4, iy + 10]], clicks: [2.0], shape: 'hand', out: 2.9 }));
// finger swipe synced with a phone scroll move [[1.25, 0], [2.0, .16]]:
const A = ph.pointAt(.6, .8), B = ph.pointAt(.6, .46);
add(K.kit.cursor(w, { shape: 'touch', path: [[1.1, ...A], [1.23, ...A], [2.0, ...B, K.E.smooth]], out: 1.98, outDur: .2, arc: .03 }));
```

## 5 · `K.kit.chip(parent, opts)` — pill with icon + text

| option | default | |
|---|---|---|
| `text` | `''` | markup `*x*` = serif italic |
| `icon` | — | `'dot'` (coloured dot with halo), ICON key (`'sparkle' 'search' 'link' 'whatsapp' 'play' 'arrow'`…), emoji, `{img: src}` (round photo), `<svg>` string |
| `color` | accent | dot / ICON colour |
| `style` | `'light'` | `'light'` (white + soft shadow), `'dark'`, `'accent'`, `'lime'`, `'hot'`, `'outline'`, `'glass'` (over footage) |
| `size` | 44 / 32 | font px (pill height ≈ 1.8·size) |
| `x`, `y`, `s` | centre, 1 | animatable |
| `rot` | 0 | resting rotation (sticker look: ±3…6; static) |
| `enter` | `'pop'` | `'pop'` (scale+blur+twist), `'rise'`, `'slide'`, `'stamp'` (slams from ×1.9 and shakes) |
| `label` / `labelSide` | — / `'bottom'` | mono caption under/over the pill |
| `out` / `outDur` | — / .28 | pops away |

Returns `{ el, pill, w, h }` (measured). Cues: `pop`.

```js
add(K.kit.chip(w, { at: 1.0, x: 250, y: 820, text: 'Hecha con *Astro*', icon: '🚀', rot: -5 }));
add(K.kit.chip(w, { at: .5, text: 'Webs *rápidas*', style: 'accent', icon: 'sparkle', enter: 'stamp' }));
```

## 5b · `K.kit.chipCloud(parent, opts)` — node graph of chips

Optional centre node, then each line draws on (curved, solid or dashed) and its chip pops at the end, in sequence.

| option | default | |
|---|---|---|
| `items` | [] | strings or chip specs; `dx`, `dy` = manual position relative to the centre |
| `center` | — | `'dot'` (glowing accent dot), a string or chip spec (dark chip, 1.12× size) |
| `layout` | `'radial'` | `'radial'` (ellipse, jittered), `'chain'` (zig-zag column, consecutive links), `'row'` |
| `rx`, `ry` | .3·W, .16·H / .25·W, .3·H | ellipse radii |
| `rotate` / `seed` | 0 / 1 | start angle offset (deg) / jitter seed |
| `stagger` | .14 | between items |
| `size`, `style` | chip defaults / `'light'` | per-item overrides allowed |
| `lines` / `dashed` / `curve` | true / false / .18 | connectors |
| `lineColor` / `lineWidth` / `dotColor` | 28 % fg / 2.6·2 / accent | |
| `drift` | 0 | slow vertical float in px-ish units (1 ≈ ±7 px). Off by default: sub-pixel drifting of shadowed pills is not seek-order stable |
| `x`, `y`, `out` | centre | |

Returns `{ el, chips }`. Cues: `pop` per node.

```js
add(K.kit.chipCloud(w, { at: .1, center: { text: 'North Pearl', icon: 'sparkle', color: '#D6FF3D' }, dashed: true,
  items: [{ text: 'Carga rápida', icon: '⚡' }, { text: 'SEO', icon: '🔍' }, { text: 'Astro', icon: '🚀', style: 'accent' }] }));
```

## 6 · `K.kit.card(parent, opts)` — UI card (cover, title, mono meta)

| option | default | |
|---|---|---|
| media opts | — | cover (`src` / `clip` / `build`) |
| `layout` | `'stack'` if title/meta else `'image'` | `'stack'` (cover + text block), `'overlay'` (text on a gradient over the cover), `'image'` |
| `ratio` | .78 / 1.3 / 1.25 | cover height ÷ width (stack / overlay / image) |
| `title` / `meta` / `tag` | — | display 800 title (`*x*` serif) / mono uppercase line / white pill on the cover |
| `w` | 648 / 422 | |
| `titleSize` / `metaSize` / `radius` | .1·w / max(14, .032·w) / .06·w | |
| `theme` | `'light'` | `'dark'` card body |
| `kenburns` | true | cover settles 1.14 → 1 over 2.2 s |
| `x y rx ry rz(rot) s` | centre | animatable |
| `enter` / `exit` | `'rise'` / `'fall'` | `'deal'` + `dealSide` for a dealt hand of cards; `'flip'` |
| `float`, `shadow`, `perspective` | | |

Returns `{ el, body, card, w, h, media }`. Cues: `whoosh` (`pop` when `enter: 'pop'`).

```js
[['_tile_a.jpg', -7, -1], ['_tile_b.jpg', 5, 1]].forEach(([f, rz, side], i) => add(K.kit.card(w, { at: .3 + i * .18,
  x: 300 + i * 490, y: 850, w: 470, src: 'assets/ui/' + f, title: 'Aurora Café', meta: 'CAFÉ · ASTRO · 2026', rz, enter: 'deal', dealSide: side })));
```

## 7 · `K.kit.ticker(parent, opts)` — marquee band

Continuous with `lt` (no seams), optional rotation (the band is made long enough to cross the frame diagonally).

| option | default | |
|---|---|---|
| `text` | `'NUEVA WEB'` | string or array of items (markup ok); a separator follows each item |
| `sep` / `sepColor` | `'•'` / currentColor | lime separators on black read very Katana |
| `font` | `'mono'` | `'mono'` (600, +.09 em, upper), `'wide'` (Archivo 125 %), `'display'`, `'serif'` |
| `size` / `h` | 34 / 26, 2.15·size | font / band height |
| `bg` / `color` / `border` | `var(--k-fg)` / `#fff` / — | `border` = colour of thin inner top/bottom rules |
| `rot` | 0 | degrees (−3…−5 for the classic tilted band); animatable — the band length/wipe use the largest key |
| `speed` / `dir` | 170 / −1 | px/s, −1 = moves left |
| `x`, `y` | W/2, .74·H / .8·H | |
| `enter` | `'wipe'` | `'wipe'` (reveals left→right), `'grow'` (scaleY), `'none'`; `out` wipes off to the right |

Returns `{ el, band, segW }`. Cues: `swipe`.

```js
add(K.kit.ticker(w, { at: .5, y: 1560, rot: -4, text: ['WEBS QUE CARGAN RÁPIDO', 'DISEÑO + SEO', 'HECHO EN COLOMBIA'],
  bg: '#111214', color: '#fff', sepColor: '#D6FF3D', speed: 190 }));
```

## 8 · `K.kit.badge(parent, opts)` — rotating circular text

SVG textPath ring (text repeated to fill the circumference exactly), spinning; entrance sweeps the text on around the
circle while it spins up, the centre pops.

| option | default | |
|---|---|---|
| `text` | `'NUEVO • NORTH PEARL • '` | one unit (upper-cased, repeated to fill) |
| `r` / `size` | 150 / 118, .19·r | text radius / font px |
| `color` | accent | text (and dot) colour |
| `centerColor` | `'#2B4BFF'` | colour of the `'ring'` torus / `'play'` button (tints + shades are derived) |
| `font` | mono | `'display'` = Inter Tight 800 |
| `center` | `'dot'` | `'dot'`, `'ring'` (thick glossy 3D torus, outer radius .73·r, r2 "N·O·thing"), `'play'` (glossy extruded play button, r2 "dusk"), `{img, size}`, `fn(el, {r})`, `'none'` |
| `speed` / `dir` / `rot0` | 42°/s / 1 / 0 | |
| `halo` / `track` | true / false | soft colour glow / thin outer circle |
| `x`, `y`, `s` | centre, 1 | animatable |
| `out` | — | shrinks + stops |

Cues: `pop` at at+.1.

```js
add(K.kit.badge(w, { at: .8, x: 850, y: 540, r: 112, text: 'NUEVA WEB • NORTH PEARL • ', center: 'ring', color: '#D6FF3D', centerColor: '#D6FF3D' }));
add(K.kit.badge(w, { at: .9, x: 860, y: 760, r: 105, text: 'NORTH PEARL • WEB • ', center: 'play', color: '#111214' }));
```

## 9 · `K.kit.label(parent, opts)` — mono micro label (decode + count)

Characters decode from scramble glyphs (`K.scramble`, frame-quantised); box styles wipe in; numbers count with
thousands separators; width is reserved for the final string (no jitter).

| option | default | |
|---|---|---|
| `text` | `''` | `{n}` = the counted number: `'{n} VISITAS'`, `'CARGA · {n} S'` |
| `count` | — | `{ from: 0, to, at: at+.2, dur: 1.3, ease: E.out(3), decimals: 0, sep: '.' }` (`sep '.'` → `12.450`, decimals use `,`; `sep: ','` → `12,450`) |
| `from`, `to` | — | shorthand for `count` |
| `style` | `'box'` | `'box'` (hairline frame), `'tag'` (filled), `'plain'`, `'dot'` (pulsing dot) |
| `anchor` | `'center'` | what `x` is: `'left' 'center' 'right'` |
| `size` | 28 / 21 | |
| `color` / `bg` / `dotColor` | fg (white on tag) / fg for tag / accent3 | |
| `upper` / `weight` / `tracking` | true / 500 / .14 em | |
| `decode` | .55 | decode duration (s) |
| `out` | — | reverse decode + wipe |

Cues: `blip` at `at`, `tick` at count start and middle.

```js
add(K.kit.label(w, { at: 1.3, x: 790, y: 600, text: 'CARGA · {n} S', count: { from: 4.2, to: .8, decimals: 1, dur: 1.2 }, style: 'tag' }));
add(K.kit.label(w, { at: 1.0, y: 1280, text: 'LINK EN LA BIO', style: 'dot' }));
```

## 10 · `K.kit.lighthouse(parent, opts)` — Google Lighthouse gauges

Arcs draw on and numbers count (mono, tabular). Colour by score like Lighthouse (<50 red `#FF4E42`, <90 orange
`#FFA400`, ≥90 green `#0CCE6B`; tinted fill, darker number text on light theme). With `from`, each gauge first fills
to its old score, then counts old → new; crossing into a new colour band gives a kick + ring flash + `ding`, and a
`+N` pill pops when the count lands.

| option | default | |
|---|---|---|
| `scores` | `[94, 100, 96, 100]` | |
| `from` | — | e.g. `[81, 87, 92, 100]` (before → after) |
| `labels` | `['Rendimiento', 'Accesibilidad', 'Prácticas recomendadas', 'SEO']` | |
| `layout` | single (1 score) · grid (9:16 & ≥4) · row | `'row' 'grid' 'single'` |
| `w` | grid .82·W · row .9·W / .6·W · single .62·W / .3·W | card width |
| `r` / `labelSize` / `stroke` | auto / auto (≥22) / 8 (of 120) | gauge radius px / label px / arc width |
| `theme` / `card` / `title` / `radius` | `'light'` / true / — / auto | `'dark'` = Lighthouse dark; `card: false` = gauges only; title = mono header |
| `stagger` / `dur` | .12 / 1.35 | gauge pop gap / count duration |
| `countAt` / `countStagger` | at+.75+n·stagger / stagger | when old→new counting starts (with `from`) |
| `delta` | true | `+N` pills |
| `x`, `y`, `s`, `out` | centre, 1 | exit: drops + blurs |

Returns `{ el, w, h, dur }`. Cues: `whoosh`, `pop` per gauge, `riser` into the count, `ding` per colour change.

```js
add(K.kit.lighthouse(w, { at: .35, y: 1060, theme: 'dark', title: 'Lighthouse · auroracafe.co',
  scores: [94, 100, 96, 100], from: [81, 87, 92, 100] }));
add(K.kit.lighthouse(w, { at: .1, scores: [94], from: [81], countAt: .9 }));        // one big gauge
```

## 11 · `K.kit.notification(parent, opts)` — iOS banner

Frosted material (backdrop blur), app icon, bold title + time, two-line body; drops in from above with a spring,
leaves upward.

| option | default | |
|---|---|---|
| `title` (or `app`) / `body` / `time` | `'North Pearl'` / `''` / `'ahora'` | markup ok |
| `icon` / `iconBg` | first letter / `var(--k-fg)` | emoji, letter, or `{img, fit: 'contain'|'cover'}` (e.g. the NP logo, `fit: 'contain'`) |
| `theme` | `'light'` | `'dark'` |
| `w` | W−72 / .34·W | |
| `x`, `y` | W/2, safe.top+20 (240) / 60 | `y` = TOP edge |
| `lines` / `stack` / `radius` | 2 / 0 / .055·w | `stack: 1–2` ghost banners behind (grouped notifications) |
| `out`, `z` | —, 30 | |

Cues: `ding` at at+.06 (+ `swoosh` at `out`).

```js
add(K.kit.notification(w, { at: .9, out: 3, title: 'North Pearl', body: '¡Tu web nueva está lista! 🚀 Carga en 0,8 s.',
  icon: { img: 'assets/img/np_logo_vertical.png', fit: 'contain' }, iconBg: '#111214', stack: 1 }));
```

## 12 · `K.kit.player(parent, opts)` — video player chrome over media

Rounded video frame with bottom gradient, tag pill (sparkle), mono meta, big title, controls row (play/pause, progress
with knob, remaining time, volume, fullscreen). Play/pause toggles freeze the footage (`clip` follows the play state)
and flash a centre icon. Chrome staggers in after the frame.

| option | default | |
|---|---|---|
| media opts | — | `clip` recommended (or `src` / `build`) |
| `w` / `ratio` / `h` | 972 / 1114, 9/16, w·ratio | ratio = height÷width (9/16 = landscape video, 1.15 = portrait-ish) |
| `tag` / `meta` / `title` / `titleSize` | — / — / — / 5.2 % of w | |
| `duration` / `start` | 112 / 0 | fake video length / position at `at` (s) |
| `playing` / `pauseAt` / `playAt` | true / [] / [] | toggles (scene time) |
| `showTime` | `'remaining'` | `'elapsed'` |
| `color` | accent3 | progress colour |
| `radius`, `x y rx ry rz s`, `enter`, `exit`, `out` | .035·w, centre | |

Returns `{ el, body, frame, media, videoTime(lt) }`. Cues: `whoosh`, `click` per toggle.

```js
add(K.kit.player(w, { at: 0, y: 1080, w: 900, ratio: 1.15, clip: 'assets/clips/c3294', tag: 'Hecho por North Pearl',
  meta: 'Aurora Café · Astro · 2026', title: 'Así quedó *la web*', duration: 92, start: 21, pauseAt: [2.1], playAt: [2.8] }));
```

## 13 · `K.kit.button(parent, opts)` — CTA pill

Entrance `'grow'`: pops in as a circle holding the icon, then extends leftwards revealing the label (blur + rise);
`'pop'`: whole pill pops. Press = squash (x .95 / y .9) + icon nudge + ring; shine sweeps after the entrance and every
`shineEvery` s; optional idle pulse.

| option | default | |
|---|---|---|
| `text` | `'Escríbenos'` | markup ok |
| `wordSpace` | `.12` | extra word spacing (em) — the display face's tracking eats its narrow space |
| `icon` | `'arrow'` | ICON key (`'whatsapp' 'link' 'play' 'sparkle'`…), emoji, `<svg>`, `null` = text only |
| `style` | `'accent'` | `'accent' 'dark' 'light' 'lime' 'hot' 'whatsapp' 'outline'` |
| `size` | 70 / 46 | font px (height 1.95·size) |
| `x`, `y`, `s` | W/2, .66·H / .7·H, 1 | animatable |
| `enter` | `'grow'` | `'pop'` |
| `pressAt` | — | time or array |
| `shine` / `shineEvery` | `[at+.75]` / — | array of times, `false`; repeat period |
| `pulse` | false | gentle breathing |
| `out` | — | collapses to the circle, pops away |

Returns `{ el, w, h, iconAt(lt?) → [x, y] }` — `iconAt` = centre of the icon circle (pill centre without icon): aim the
cursor's press there. Cues: `pop` at `at`, `click` + `cta` per press.

```js
const bt = add(K.kit.button(w, { at: .5, y: 1130, text: 'Escríbenos', style: 'dark', pressAt: [2.0], shineEvery: 1.6 }));
const [ix, iy] = bt.iconAt();
add(K.kit.cursor(w, { path: [[1.2, 900, 1440], [1.92, ix + 4, iy + 10]], clicks: [2.0], shape: 'hand', out: 2.9 }));
add(K.kit.button(w, { at: 2.4, y: 1470, text: 'Abrir chat', icon: 'whatsapp', style: 'whatsapp', size: 52 }));
add(K.kit.button(w, { at: .3, text: 'Link en la bio', icon: 'link', style: 'lime' }));
```

---

## Helpers

`K.kit.uiHelpers = { media, rich, fmtNum, ICON }` — `media(box, opts, w, h)` (the src/clip/build/scroll filler used
by every device; returns `{ el, update(lt), prepare, scrollY(lt), fullH() }`), `rich(markup)` → escaped HTML with
`*serif*`, `fmtNum(v, decimals, sep)`, `ICON` (SVG strings: signal wifi battery lock reload chevL chevR sparkle search
arrowUp arrow play pause volume full link whatsapp).

## Recipes

* **Website hero shot**: laptop `enter: 'open'` + slow `ry` turn + `scroll` after 1.4 s; badge sticker on a lid corner;
  tilted ticker under it on a colour block.
* **"Rediseño" before/after**: browser with `load: [t0, t1]` (old → new) then `lighthouse` with `from`.
* **AI/search moment**: searchBar typing the client's need with a push-in (`s`) → chips (`chipLabel: 'IDEA'`) → cursor
  clicks `buttonAt(submitAt)`.
* **Mobile scroll**: phone `scroll` in two moves + two `cursor` `'touch'` swipes timed to them (see cursor snippet).
* **Hold that still breathes**: `float: { amp: 9, hz: .3, rot: .8 }` on cards/devices after a dealt entrance.
* **Into the screen**: phone/browser `out` with `exit: 'zoom'` at a cut (×7 into the camera) and start the next scene
  full-frame on the same content.
* **CTA end card**: button `grow` + cursor hand pressing it + label `'LINK EN LA BIO'` style `'dot'` + badge `play`.

## Determinism notes (learned while building — applies to any kit code)

Checked with `node tools/capture.mjs engine/demos/ui.html <dir> --serve . --check-determinism` (passes). Things that
broke seek-order determinism in the engine's preserve-3d world, and what this file does instead:
* An element whose transform alternates between scaled and *pure-translation* matrices (e.g. `scale(1.14)` →
  `translateY(0) scale(1)`) together with opacity/filter renders history-dependently. Every transform written here
  ends with `scale(1.00001)` (invisible) so it is never a pure translation.
* `translate3d(...)` on scrolling/marquee content inside a 3D-tilted device → use 2D `translate()`.
* SVG content overflowing its element box (`overflow: visible`) under a scaling parent → size the SVG box to its content.
* `stroke-dasharray` draw-on for gauge arcs → explicit arc path geometry.
* `border-radius: 50%` circles under scaling parents → `radial-gradient(circle closest-side, …)` discs.
* Box-shadowed pills inside a *continuously* scaling/rotating/sub-pixel-drifting parent → the cloud holds still by
  default (`drift` opt-in). Centred boxes use even pixel sizes so their edges land on whole pixels.
* Thin bars at fractional pixel positions under opacity fades → snap to integer px.
* (correctness) `clip-path: inset(… %)` on a scrolled page whose content is an absolutely-positioned image has a 0-px
  box → everything is clipped. The browser load wipe clips a fixed-size, non-scrolling wrapper instead.
* Text whose glyphs overhang its own transformed box (negative tracking, italic) → pad the box (`padding:0 .08em;
  margin:0 -.08em`) and set `transform: none` once a word has settled.
