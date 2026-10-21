// pageinfo — load a Katana film page headless and dump what the render pipeline needs from it.
// usage: node pageinfo.mjs <page.html> <out.json> [--root <dir>]
// Writes { comp: window.__comp, cues: window.__cues, errors: window.__errors(), qa: window.__qa() }.
// The page is served over http from --root (default: the Katana folder) so fonts, clips and canvases behave as in capture.
import { writeFileSync } from 'node:fs';
import { resolve, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { launch, serveStatic } from './cdp.mjs';

const args = process.argv.slice(2);
const ri = args.indexOf('--root');
const root = resolve(ri >= 0 ? args[ri + 1] : resolve(dirname(fileURLToPath(import.meta.url)), '..'));
const [pageArg, outArg] = args.filter((a, i) => !a.startsWith('--') && (ri < 0 || i !== ri + 1));
if (!pageArg || !outArg) { console.error('usage: node pageinfo.mjs <page.html> <out.json> [--root dir]'); process.exit(1); }
const qi = pageArg.indexOf('?');
const page = resolve(qi >= 0 ? pageArg.slice(0, qi) : pageArg), query = qi >= 0 ? pageArg.slice(qi) : '';
const srv = await serveStatic(root);
const url = `${srv.url}/${relative(root, page).split('\\').join('/')}${query}`;
const b = await launch({ width: 1080, height: 1920 });
try {
  const p = await b.newPage(url, { width: 1080, height: 1920, loadTimeoutMs: 60000 });
  const ok = await p.waitFor('window.__comp && window.__cues ? true : null', { timeoutMs: 60000, intervalMs: 150 });
  if (!ok) throw new Error('page did not expose __comp/__cues:\n  ' + p.errors().slice(-8).join('\n  '));
  await p.waitReady({ timeoutMs: 60000 });
  const info = await p.evaluate('({ comp: window.__comp, cues: window.__cues, errors: window.__errors ? window.__errors() : [], qa: window.__qa ? window.__qa() : [] })');
  info.pageErrors = p.errors();
  writeFileSync(resolve(outArg), JSON.stringify(info, null, 1));
  const n = (info.cues && info.cues.cues || []).length;
  console.log(`pageinfo: ${info.comp.width}x${info.comp.height} @ ${info.comp.fps} fps, ${info.comp.duration} s · ${n} cues · ${info.errors.length + info.pageErrors.length} errors`);
  for (const e of [...info.errors, ...info.pageErrors]) console.log('  ! ' + e);
} finally { await b.close(); srv.close(); }
