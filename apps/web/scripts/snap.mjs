// npm run snap -- <name> [quality]
// Renders the My World welcome view at 1536×688 in headless Chrome (the Chrome already installed
// on this machine, over the DevTools protocol) and saves screenshots/<name>.png.
// Needs the dev server running (npm run dev). The camera is the journey's start, never moved.
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';

const name = process.argv[2] ?? 'current';
const quality = process.argv[3] ?? 'high';
const W = 1536;
const H = 688;
const URL = process.env.SNAP_URL ?? `http://localhost:5173/?style=travel&quality=${quality}`;
const CHROME = [
  process.env.CHROME,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
].find((p) => p && existsSync(p));
if (!CHROME) throw new Error('Chrome not found. Set CHROME=/path/to/chrome.');

const out = resolve('screenshots');
mkdirSync(out, { recursive: true });
const port = 9300 + Math.floor(Math.random() * 500);
const profile = resolve(tmpdir(), `snap-profile-${port}`);
const proc = spawn(CHROME, [
  '--headless=new',
  `--remote-debugging-port=${port}`,
  `--user-data-dir=${profile}`,
  '--enable-unsafe-swiftshader',
  '--ignore-gpu-blocklist',
  '--use-angle=swiftshader',
  `--window-size=${W},${H}`,
  'about:blank',
]);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let ws;
for (let i = 0; i < 120 && !ws; i++) {
  try {
    const tabs = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
    const page = tabs.find((t) => t.type === 'page');
    const sock = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((r, j) => ((sock.onopen = r), (sock.onerror = j)));
    ws = sock;
  } catch {
    await sleep(500);
  }
}
let id = 0;
const pending = new Map();
const errors = [];
ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) {
    pending.get(m.id)(m);
    pending.delete(m.id);
  } else if (m.method === 'Runtime.exceptionThrown') errors.push(JSON.stringify(m.params.exceptionDetails).slice(0, 300));
  else if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errors.push(m.params.args.map((a) => a.value ?? a.description).join(' ').slice(0, 300));
};
const send = (method, params = {}) =>
  new Promise((r) => {
    const i = ++id;
    pending.set(i, r);
    ws.send(JSON.stringify({ id: i, method, params }));
  });
const evalJs = async (expr) => (await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true })).result?.result?.value;

await send('Runtime.enable');
await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url: URL });
for (let i = 0; i < 150; i++) {
  await sleep(1000);
  if (await evalJs(`!!document.querySelector('.mw-silent')`)) break;
}
await evalJs(`document.querySelector('.mw-silent')?.click(); 1`);
// Let the intro fade, the ripple settle and the environment map build.
await sleep(Number(process.env.SNAP_WAIT ?? 9000));
const shot = await send('Page.captureScreenshot', { format: 'png' });
writeFileSync(resolve(out, `${name}.png`), Buffer.from(shot.result.data, 'base64'));
console.log(`saved screenshots/${name}.png`);
if (errors.length) console.log('console errors:\n' + errors.join('\n'));
proc.kill();
process.exit(0);
