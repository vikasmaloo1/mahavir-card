// Renders add-on assets (packaging + festival) and the profile grid preview.
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { render } from './templates.mjs';
import { addons } from './addons.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const HTML = path.join(__dirname, 'html');
const CSS = fs.readFileSync(path.join(__dirname, 'design-system.css'), 'utf8');
const CHROME = fs.existsSync('/usr/bin/google-chrome') ? '/usr/bin/google-chrome' : '/root/bin/chromium';
const doc = (inner) => `<!doctype html><html><head><meta charset="utf-8"><style>${CSS}</style></head><body style="margin:0">${inner}</body></html>`;

async function renderAsset(browser, a){
  const inner = render(a);
  const htmlPath = path.join(HTML, (a.folder.split('-')[0]) + '_' + a.file.replace(/\.png$/, '') + '.html');
  fs.writeFileSync(htmlPath, doc(inner));
  const isStory = /story|reel-cover/.test(a.layout);
  const W = 1080, H = isStory ? 1920 : 1350;
  const p = await browser.newPage();
  await p.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
  await p.goto('file://' + htmlPath, { waitUntil: 'networkidle0', timeout: 60000 });
  try { await p.evaluate(async () => { await document.fonts.ready; }); } catch {}
  await new Promise(r=>setTimeout(r, 350));
  const el = await p.$('.canvas');
  const outDir = path.join(ROOT, a.folder);
  fs.mkdirSync(outDir, { recursive: true });
  await el.screenshot({ path: path.join(outDir, a.file) });
  await p.close();
  return path.join(a.folder, a.file);
}

// Profile grid preview — first 12 grid posts (newest top-left), cropped to IG 4:5 tiles.
const GRID = [
  ['02-FEED-POSTS','post-01.png'],['01-LAUNCH-CAROUSEL','page-01.png'],['02-FEED-POSTS','post-02.png'],
  ['04-REELS','reel-08.png'],['03-CAROUSELS','c1-page-01.png'],['02-FEED-POSTS','post-03.png'],
  ['02-FEED-POSTS','post-04.png'],['04-REELS','reel-05.png'],['02-FEED-POSTS','post-05.png'],
  ['03-CAROUSELS','c4-page-01.png'],['02-FEED-POSTS','post-06.png'],['02-FEED-POSTS','post-07.png'],
];

async function buildGridPreview(browser){
  const tiles = GRID.map(([f,n])=>`<div class="tile"><img src="file://${path.join(ROOT,f,n)}"></div>`).join('');
  const inner = `<div class="wrap">
    <div class="bar">
      <div class="ph"><img src="file://${path.join(__dirname,'assets','logo.jpeg')}"></div>
      <div class="who"><b>mahavircard2011</b><span>Mahavir Card · Printing in Ahmedabad · 25+ yrs</span></div>
    </div>
    <div class="grid">${tiles}</div>
    <div class="foot">Profile grid preview · first 12 posts · mahavircard.in</div>
  </div>`;
  const css = `*{margin:0;box-sizing:border-box;font-family:'Archivo',sans-serif}
    .wrap{width:1092px;background:#F1EADB;padding:40px 40px 30px}
    .bar{display:flex;align-items:center;gap:22px;padding:6px 6px 30px}
    .ph{width:104px;height:104px;border-radius:50%;overflow:hidden;background:#0E1B2E;flex:none;border:3px solid #B5883F}
    .ph img{width:100%;height:100%;object-fit:cover}
    .who b{font-family:'Fraunces',serif;font-weight:600;font-size:34px;color:#0E1B2E;display:block}
    .who span{font-family:'IBM Plex Mono',monospace;font-size:16px;letter-spacing:.06em;color:#3C5670;margin-top:6px;display:block}
    .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}
    .tile{position:relative;width:100%;aspect-ratio:4/5;overflow:hidden;background:#0E1B2E}
    .tile img{width:100%;height:100%;object-fit:cover;display:block}
    .foot{margin-top:22px;font-family:'IBM Plex Mono',monospace;font-size:16px;letter-spacing:.14em;color:#3C5670;text-align:center;text-transform:uppercase}`;
  const html = `<!doctype html><html><head><meta charset="utf-8">
    <style>@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,300..700&family=Archivo:wght@400;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap');${css}</style>
    </head><body>${inner}</body></html>`;
  const htmlPath = path.join(HTML, '_grid-preview.html');
  fs.writeFileSync(htmlPath, html);
  const p = await browser.newPage();
  await p.setViewport({ width: 1092, height: 1600, deviceScaleFactor: 1 });
  await p.goto('file://'+htmlPath, { waitUntil:'networkidle0', timeout:60000 });
  try { await p.evaluate(async () => { await document.fonts.ready; }); } catch {}
  await new Promise(r=>setTimeout(r, 400));
  const el = await p.$('.wrap');
  const out = path.join(ROOT, 'GRID-PREVIEW-FIRST-12.png');
  await el.screenshot({ path: out });
  await p.close();
  return out;
}

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new',
    args: ['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage','--force-color-profile=srgb'] });
  console.log('> rendering', addons.length, 'add-on assets…');
  for (const a of addons){ const rel = await renderAsset(browser, a); console.log('  ', rel); }
  console.log('> building grid preview…');
  const g = await buildGridPreview(browser);
  console.log('  ', g);
  await browser.close();
  console.log('DONE.');
})().catch(e=>{ console.error(e); process.exit(1); });
