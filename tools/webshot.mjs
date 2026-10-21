// webshot — screenshot a public web page with headless Chrome (for browser mockups, project walls, before/after).
// usage: node webshot.mjs <url> <out.png> [--w 1440] [--h 900] [--mobile] [--full] [--wait 2.5] [--scroll-load] [--max-h 12000]
//   --mobile       390×844 viewport @ dpr 3 with an iPhone user agent
//   --full         full-page capture (tall image; use it with K.kit.browser scroll keyframes)
//   --scroll-load  scroll to the bottom first so lazy images load
// Read-only: loads the page like a visitor would; no clicks, no forms, no cookies kept (throwaway profile).
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { launch } from './cdp.mjs';

const a = process.argv.slice(2);
const get = (k, d) => { const i = a.indexOf(k); return i >= 0 ? a[i + 1] : d; };
const has = (k) => a.includes(k);
const [url, out] = a.filter((x, i) => !x.startsWith('--') && !['--w', '--h', '--wait', '--max-h'].includes(a[i - 1]));
if (!url || !out) { console.error('usage: node webshot.mjs <url> <out.png> [--w 1440] [--h 900] [--mobile] [--full] [--wait 2.5] [--scroll-load]'); process.exit(1); }
const mobile = has('--mobile');
const W = mobile ? 390 : +get('--w', 1440), H = mobile ? 844 : +get('--h', 900), dpr = mobile ? 3 : 1;
const b = await launch({ width: W, height: H });
try {
  const p = await b.newPage('about:blank', { width: W, height: H, dpr });
  if (mobile) {
    await p.send('Emulation.setUserAgentOverride', { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' });
    await p.send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: dpr, mobile: true });
  }
  await p.goto(url);
  await new Promise((r) => setTimeout(r, 1000 * +get('--wait', 2.5)));
  if (has('--scroll-load') || has('--full')) {
    await p.evaluate(`(async () => { for (let y = 0; y < document.documentElement.scrollHeight; y += innerHeight * .8) { scrollTo(0, y); await new Promise(r => setTimeout(r, 180)); } scrollTo(0, 0); await new Promise(r => setTimeout(r, 600)); })()`, { timeoutMs: 60000 });
  }
  let clip;
  if (has('--full')) {
    const fh = Math.min(+get('--max-h', 12000), await p.evaluate('Math.max(document.documentElement.scrollHeight, document.body.scrollHeight)'));
    await p.send('Emulation.setDeviceMetricsOverride', { width: W, height: fh, deviceScaleFactor: dpr, mobile });
    await new Promise((r) => setTimeout(r, 800));
    clip = { x: 0, y: 0, width: W, height: fh, scale: 1 };
  }
  const buf = await p.screenshot({ format: 'png', clip });
  writeFileSync(resolve(out), buf);
  const title = await p.evaluate('document.title').catch(() => '');
  console.log(`webshot: ${url} → ${out} (${W}×${clip ? clip.height : H} @${dpr}x) "${title}"`);
} finally { await b.close(); }
