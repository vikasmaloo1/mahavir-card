// MAHAVIR CARD — build pipeline
// Renders every content asset to a pixel-exact PNG using headless Chrome,
// captures live mahavircard.in screenshots, and assembles the carousel PDF.

import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { render, brand } from './templates.mjs';
import { assets } from './content.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const HTML = path.join(__dirname, 'html');
const CSS = fs.readFileSync(path.join(__dirname, 'design-system.css'), 'utf8');
const CHROME = fs.existsSync('/usr/bin/google-chrome') ? '/usr/bin/google-chrome' : '/root/bin/chromium';

fs.mkdirSync(HTML, { recursive: true });
fs.mkdirSync(path.join(__dirname, 'website-screens'), { recursive: true });

const doc = (inner) => `<!doctype html><html><head><meta charset="utf-8"><style>${CSS}</style></head><body style="margin:0">${inner}</body></html>`;

async function captureWebsite(browser){
  const shots = [
    { url: 'https://mahavircard.in/', file: 'home-top.png', y: 0 },
    { url: 'https://mahavircard.in/', file: 'home-categories.png', y: 1750 },
    { url: 'https://mahavircard.in/products', file: 'products-top.png', y: 0 },
  ];
  for (const s of shots){
    try{
      const p = await browser.newPage();
      await p.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
      await p.goto(s.url, { waitUntil: 'networkidle2', timeout: 45000 });
      await new Promise(r=>setTimeout(r,1500));
      if (s.y) await p.evaluate(y=>window.scrollTo(0,y), s.y);
      await new Promise(r=>setTimeout(r,1200));
      await p.screenshot({ path: path.join(__dirname, 'website-screens', s.file) });
      await p.close();
      console.log('  captured', s.file);
    }catch(e){ console.log('  ! website capture failed for', s.file, '-', e.message); }
  }
}

async function renderAsset(browser, a){
  const inner = render(a);
  const htmlPath = path.join(HTML, a.id + '.html');
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

async function buildCarouselPDF(browser){
  const dir = path.join(ROOT, '01-LAUNCH-CAROUSEL');
  const pages = fs.readdirSync(dir).filter(f=>/^page-\d+\.png$/.test(f)).sort();
  if(!pages.length) return null;
  const imgs = pages.map(f=>`<div class="pg"><img src="file://${path.join(dir,f)}"></div>`).join('');
  const html = `<!doctype html><html><head><style>
    @page{size:1080px 1350px;margin:0;} *{margin:0;padding:0;}
    .pg{width:1080px;height:1350px;overflow:hidden;page-break-after:always;}
    .pg img{width:1080px;height:1350px;display:block;}
  </style></head><body>${imgs}</body></html>`;
  const tmp = path.join(HTML, '_carousel-pdf.html');
  fs.writeFileSync(tmp, html);
  const p = await browser.newPage();
  await p.goto('file://'+tmp, { waitUntil:'networkidle0' });
  const out = path.join(dir, 'Mahavir-Card-Launch-Carousel.pdf');
  await p.pdf({ path: out, width:'1080px', height:'1350px', printBackground:true, pageRanges:`1-${pages.length}` });
  await p.close();
  return out;
}

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new',
    args: ['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage','--force-color-profile=srgb'] });

  console.log('> capturing live website…');
  await captureWebsite(browser);

  console.log('> rendering', assets.length, 'assets…');
  let n = 0;
  for (const a of assets){
    const rel = await renderAsset(browser, a);
    n++; console.log(`  [${String(n).padStart(3,' ')}/${assets.length}] ${rel}`);
  }

  console.log('> assembling carousel PDF…');
  const pdf = await buildCarouselPDF(browser);
  console.log('  PDF:', pdf);

  await browser.close();
  console.log('DONE. Rendered', n, 'images.');
})().catch(e=>{ console.error(e); process.exit(1); });
