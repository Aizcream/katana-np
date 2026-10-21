#!/usr/bin/env node
// Higgsfield REST API client (https://docs.higgsfield.ai). Node 22+, no npm deps.
// Spends the prepaid API balance (console / open.higgsfield.ai billing), not the higgsfield.ai account credits the MCP uses.
//
// usage: node hf-api.mjs <command> [args]
//   check                                  verify credentials with a free estimate call
//   models [filter]                        list documented endpoints (references/models.tsv)
//   schema <endpoint>                      print the endpoint's input schema from the official docs
//   estimate <endpoint> <json|@file>       cost of one request (free, nothing is generated)
//   submit <endpoint> <json|@file> [--wait] [--out dir] [--yes]
//                                          estimate, then submit; without --yes it stops after the estimate
//   status <request_id>                    one status read
//   wait <request_id> [--out dir] [--timeout s]   poll until terminal, optionally download outputs
//   cancel <request_id>                    cancel while still queued (refunded)
//   upload <file>                          presigned upload → prints the public_url to pass as image_url/video_url/…
//   download <request_id> <dir>            download every output URL of a completed request
//
// Credentials: HF_KEY_ID + HF_KEY_SECRET (or HF_API_KEY="id:secret") from the environment,
// else ~/.config/higgsfield/credentials.env. The secret is never printed.
// Every submission is appended to ./hf-ledger.jsonl (time, endpoint, request_id, estimate, status) so spend stays auditable.

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';

const BASE = 'https://api.higgsfield.ai';
const HERE = path.dirname(new URL(import.meta.url).pathname);
const CATALOG = path.join(HERE, '..', 'references', 'models.tsv');
const TERMINAL = new Set(['completed', 'failed', 'nsfw', 'canceled']);
const MIME = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif', '.wav': 'audio/wav', '.mp4': 'video/mp4' };

function die(msg, code = 1) { console.error(msg); process.exit(code); }

function credentials() {
  let { HF_KEY_ID: id, HF_KEY_SECRET: secret, HF_API_KEY: both } = process.env;
  if (!(id && secret) && !both) {
    const file = path.join(os.homedir(), '.config', 'higgsfield', 'credentials.env');
    if (fs.existsSync(file)) {
      for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
        const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/);
        if (!m) continue;
        if (m[1] === 'HF_KEY_ID') id ||= m[2];
        if (m[1] === 'HF_KEY_SECRET') secret ||= m[2];
        if (m[1] === 'HF_API_KEY') both ||= m[2];
      }
    }
  }
  if (!(id && secret) && both) [id, secret] = both.split(':');
  if (!(id && secret)) die('No Higgsfield API credentials: set HF_KEY_ID/HF_KEY_SECRET or write ~/.config/higgsfield/credentials.env');
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))
    die(`The key ID is not a valid UUID (groups ${id.split('-').map(g => g.length).join('-')}, expected 8-4-4-4-12): it was probably copied incompletely.`);
  return `Key ${id}:${secret}`;
}

async function api(method, url, body, extraHeaders = {}) {
  const headers = { Authorization: credentials(), ...extraHeaders };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  for (let attempt = 0; ; attempt++) {
    let res;
    try {
      res = await fetch(url.startsWith('http') ? url : BASE + url, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
    } catch (e) {
      if (attempt < 4) { await sleep(1000 * 2 ** attempt); continue; }
      throw e;
    }
    // 5xx: safe to retry (submissions carry an Idempotency-Key, so a retry never double-charges)
    if (res.status >= 500 && attempt < 4) { await sleep(1000 * 2 ** attempt + Math.random() * 500); continue; }
    const text = await res.text();
    let json; try { json = text ? JSON.parse(text) : {}; } catch { json = { raw: text }; }
    if (!res.ok) {
      const hint = { 401: 'invalid credentials', 403: 'insufficient API balance', 404: 'endpoint or request not found for this account', 422: 'validation failed (check `schema`)', 423: 'model temporarily blocked', 503: 'model disabled or not ready' }[res.status] || '';
      die(`HTTP ${res.status}${hint ? ` (${hint})` : ''} ${method} ${url}\n${JSON.stringify(json.detail ?? json, null, 2)}\ncorrelation-id: ${res.headers.get('x-correlation-id') || '-'}`, 2);
    }
    return json;
  }
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

// Token-priced models (e.g. Seedance 2.5) answer with a rate description instead of a fixed number.
function describeEstimate(est) {
  if (est.type === 'description') return `estimate (rate before the account discount, not a fixed price): ${est.pricing_description}`;
  const off = est.discount ? ` (discount listed: ${est.discount.percentage}%, $${est.discount.usd})` : '';
  return `estimate: ${est.credits} credits ≈ $${est.usd}${off}`;
}

function readParams(arg) {
  if (!arg) die('missing JSON parameters (inline JSON or @file.json)');
  const src = arg.startsWith('@') ? fs.readFileSync(arg.slice(1), 'utf8') : arg;
  try { return JSON.parse(src); } catch (e) { die(`invalid JSON parameters: ${e.message}`); }
}

function flags(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--wait' || a === '--yes') out[a.slice(2)] = true;
    else if (a === '--out' || a === '--timeout') out[a.slice(2)] = argv[++i];
    else out._.push(a);
  }
  return out;
}

function ledger(entry) {
  fs.appendFileSync(path.resolve('hf-ledger.jsonl'), JSON.stringify({ time: new Date().toISOString(), ...entry }) + '\n');
}

function outputUrls(r) {
  const urls = [];
  const take = v => { if (v && typeof v === 'object' && typeof v.url === 'string') urls.push(v.url); };
  for (const [k, v] of Object.entries(r)) {
    if (['status_url', 'cancel_url'].includes(k)) continue;
    if (Array.isArray(v)) v.forEach(take); else take(v);
  }
  return [...new Set(urls)];
}

async function download(r, dir) {
  fs.mkdirSync(dir, { recursive: true });
  const files = [];
  for (const [i, url] of outputUrls(r).entries()) {
    const ext = path.extname(new URL(url).pathname) || '';
    const file = path.join(dir, `${r.request_id}${outputUrls(r).length > 1 ? `_${i}` : ''}${ext}`);
    for (let attempt = 0; ; attempt++) {
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
        break;
      } catch (e) {
        if (attempt >= 4) die(`download failed for ${url}: ${e.message}`);
        await sleep(2000 * 2 ** attempt);
      }
    }
    files.push(file);
    console.log(`saved ${file}`);
  }
  return files;
}

async function wait(id, { out, timeout = 1800 } = {}) {
  const t0 = Date.now();
  let delay = 2000, last = '';
  for (;;) {
    const r = await api('GET', `/requests/${id}/status`);
    if (r.status !== last) { console.error(`[${((Date.now() - t0) / 1000).toFixed(0)}s] ${id} ${r.status}`); last = r.status; }
    if (TERMINAL.has(r.status)) {
      ledger({ event: 'final', request_id: id, status: r.status, outputs: outputUrls(r), error: r.error });
      if (r.status === 'completed' && out) await download(r, out);
      return r;
    }
    if ((Date.now() - t0) / 1000 > Number(timeout)) die(`timeout after ${timeout}s; still ${r.status}. Resume with: wait ${id}`, 3);
    await sleep(delay + Math.random() * 500);
    delay = Math.min(delay * 1.5, 10000);
  }
}

const [cmd, ...rest] = process.argv.slice(2);
const f = flags(rest);

switch (cmd) {
  case 'check': {
    const est = await api('POST', '/estimate/higgsfield-ai/soul/v2/standard', { prompt: 'credential check' });
    console.log(`credentials OK · sample estimate (Soul V2, 1 image): ${est.credits} credits ≈ $${est.usd}`);
    break;
  }
  case 'models': {
    const rows = fs.readFileSync(CATALOG, 'utf8').trim().split('\n').slice(1).map(l => l.split('\t'));
    const q = (f._[0] || '').toLowerCase();
    for (const [ep, title] of rows) if (!q || (ep + title).toLowerCase().includes(q)) console.log(`${ep.padEnd(52)} ${title}`);
    break;
  }
  case 'schema': {
    const ep = f._[0] || die('usage: schema <endpoint>');
    const row = fs.readFileSync(CATALOG, 'utf8').split('\n').map(l => l.split('\t')).find(r => r[0] === ep);
    if (!row?.[2]) die(`unknown endpoint ${ep}; see \`models\``);
    const md = await (await fetch(row[2])).text();
    const start = md.indexOf('## Usage notes') >= 0 ? md.indexOf('## Usage notes') : md.indexOf('## Input schema');
    const end = md.indexOf('<Accordion title="Complete JSON schema">');
    const body = md.slice(start, end > start ? end : undefined);
    const schema = body.slice(body.indexOf('## Input schema'));
    const notes = body.indexOf('## Input schema') > 0 ? body.slice(0, body.indexOf('## Quick start') > 0 ? body.indexOf('## Quick start') : body.indexOf('## Input schema')) : '';
    console.log(`${row[1]}\nPOST ${BASE}/${ep}\ndocs: ${row[2]}\n\n${(notes + schema).replace(/<\/?ParamField[^>]*>/g, m => m.startsWith('</') ? '' : m.replace(/<ParamField\s+/, '• ').replace(/\s*\/?>$/, ''))}`);
    break;
  }
  case 'estimate': {
    const [ep, p] = f._;
    const est = await api('POST', `/estimate/${ep}`, readParams(p));
    console.log(JSON.stringify(est));
    break;
  }
  case 'submit': {
    const [ep, p] = f._;
    const params = readParams(p);
    const est = await api('POST', `/estimate/${ep}`, params);
    console.error(describeEstimate(est));
    if (!f.yes) { console.error('not submitted: rerun with --yes once the cost is approved'); process.exit(4); }
    const idem = crypto.randomUUID();
    const r = await api('POST', `/${ep}`, params, { 'Idempotency-Key': idem });
    ledger({ event: 'submit', endpoint: ep, request_id: r.request_id, idempotency_key: idem, estimate: est, params });
    console.log(JSON.stringify({ request_id: r.request_id, status: r.status, estimate_usd: est.usd ?? 'rate-priced, see estimate' }));
    if (f.wait) {
      const fin = await wait(r.request_id, { out: f.out, timeout: f.timeout });
      console.log(JSON.stringify({ request_id: fin.request_id, status: fin.status, outputs: outputUrls(fin), error: fin.error }));
      if (fin.status !== 'completed') process.exit(5);
    }
    break;
  }
  case 'status': {
    const r = await api('GET', `/requests/${f._[0] || die('usage: status <request_id>')}/status`);
    console.log(JSON.stringify({ request_id: r.request_id, status: r.status, outputs: outputUrls(r), error: r.error }));
    break;
  }
  case 'wait': {
    const r = await wait(f._[0] || die('usage: wait <request_id>'), { out: f.out, timeout: f.timeout });
    console.log(JSON.stringify({ request_id: r.request_id, status: r.status, outputs: outputUrls(r), error: r.error }));
    if (r.status !== 'completed') process.exit(5);
    break;
  }
  case 'cancel': {
    await api('POST', `/requests/${f._[0] || die('usage: cancel <request_id>')}/cancel`);
    ledger({ event: 'cancel', request_id: f._[0] });
    console.log('canceled');
    break;
  }
  case 'upload': {
    const file = f._[0] || die('usage: upload <file>');
    const type = MIME[path.extname(file).toLowerCase()] || die(`unsupported file type ${path.extname(file)} (jpeg/png/webp/gif/wav/mp4)`);
    const up = await api('POST', '/files/generate-upload-url', { content_type: type });
    const res = await fetch(up.upload_url, { method: 'PUT', headers: up.upload_headers, body: fs.readFileSync(file) });
    if (!res.ok) die(`upload PUT failed: HTTP ${res.status} ${await res.text()}`);
    console.log(up.public_url);
    break;
  }
  case 'download': {
    const [id, dir] = f._;
    const r = await api('GET', `/requests/${id}/status`);
    if (r.status !== 'completed') die(`request is ${r.status}, nothing to download`);
    await download(r, dir || '.');
    break;
  }
  default:
    console.log(fs.readFileSync(new URL(import.meta.url), 'utf8').split('\n').filter(l => l.startsWith('//')).map(l => l.slice(3)).join('\n'));
    if (cmd && cmd !== 'help') process.exit(1);
}
