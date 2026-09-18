// Renders Instagram Highlight cover icons (square, circle-safe) + a second
// profile grid preview for posts 13–24. Run after the core + add-on builds.
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const HTML = path.join(__dirname, 'html');
const CHROME = fs.existsSync('/usr/bin/google-chrome') ? '/usr/bin/google-chrome' : '/root/bin/chromium';
const BRASS = '#CBA55E', PAPER = '#F1EADB', INK = '#0E1B2E';

// simple line icons (viewBox 0 0 100 100), stroke = brass
const ICONS = {
  website: `<circle cx="50" cy="50" r="30"/><ellipse cx="50" cy="50" rx="13" ry="30"/><line x1="20" y1="50" x2="80" y2="50"/><path d="M26 35 h48"/><path d="M26 65 h48"/>`,
  cards:   `<rect x="20" y="30" width="46" height="30" rx="5"/><rect x="34" y="42" width="46" height="30" rx="5"/><line x1="40" y1="52" x2="64" y2="52"/><line x1="40" y1="60" x2="56" y2="60"/>`,
  premium: `<path d="M30 44 L50 72 L70 44"/><path d="M30 44 L38 30 H62 L70 44 Z"/><line x1="38" y1="30" x2="44" y2="44"/><line x1="62" y1="30" x2="56" y2="44"/><line x1="50" y1="44" x2="50" y2="72"/><line x1="30" y1="44" x2="70" y2="44"/><path d="M76 26 l2 5 l5 2 l-5 2 l-2 5 l-2 -5 l-5 -2 l5 -2 z" fill="${BRASS}" stroke="none"/>`,
  b2b:     `<path d="M26 42 H70 M62 34 L70 42 L62 50"/><path d="M74 58 H30 M38 50 L30 58 L38 66"/>`,
  contact: `<path d="M34 26 h12 l5 14 -7 5 q6 11 17 17 l5 -7 14 5 v12 q0 4 -4 4 q-46 -3 -50 -50 q0 -4 4 -4 z"/>`,
  stationery: `<rect x="22" y="30" width="56" height="40" rx="3"/><path d="M22 34 L50 56 L78 34"/>`,
  stickers: `<path d="M28 28 h44 v30 l-16 16 h-28 z"/><path d="M72 58 l-16 16 v-16 z"/><path d="M40 44 h20 M40 52 h12"/>`,
  faq: `<path d="M24 30 h52 a5 5 0 0 1 5 5 v24 a5 5 0 0 1 -5 5 h-28 l-14 12 v-12 h-10 a5 5 0 0 1 -5 -5 v-24 a5 5 0 0 1 5 -5 z"/><text x="50" y="55" font-size="26" font-family="Georgia,serif" text-anchor="middle" fill="${BRASS}" stroke="none">?</text>`,
};
const COVERS = [
  ['website','Website'],['cards','Cards'],['premium','Premium'],['b2b','B2B'],['contact','Contact'],
  ['stationery','Stationery'],['stickers','Stickers'],['faq','FAQ'],
];

function coverHTML(key){
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    *{margin:0;box-sizing:border-box}
    .c{width:1080px;height:1080px;background:${INK};position:relative;display:flex;align-items:center;justify-content:center;overflow:hidden}
    .c::before{content:"";position:absolute;inset:0;background:radial-gradient(60% 60% at 50% 42%,rgba(203,165,94,.10),transparent 70%)}
    .ring{position:absolute;width:1000px;height:1000px;border:1.5px solid rgba(203,165,94,.28);border-radius:50%}
    .ring2{position:absolute;width:1040px;height:1040px;border:1px dashed rgba(241,234,219,.14);border-radius:50%}
    svg{width:420px;height:420px;fill:none;stroke:${BRASS};stroke-width:4;stroke-linecap:round;stroke-linejoin:round;position:relative}
    .dot{position:absolute;bottom:150px;left:50%;transform:translateX(-50%);display:flex;gap:8px}
    .dot i{width:9px;height:9px;border-radius:50%}
  </style></head><body>
    <div class="c"><div class="ring2"></div><div class="ring"></div>
      <svg viewBox="0 0 100 100">${ICONS[key]}</svg>
      <div class="dot"><i style="background:#1FA4D6"></i><i style="background:#D4318A"></i><i style="background:#EEC419"></i><i style="background:#141414"></i></div>
    </div>
  </body></html>`;
}

async function renderCover(browser, key, out){
  const htmlPath = path.join(HTML, '_hl_'+key+'.html');
  fs.writeFileSync(htmlPath, coverHTML(key));
  const p = await browser.newPage();
  await p.setViewport({ width:1080, height:1080, deviceScaleFactor:1 });
  await p.goto('file://'+htmlPath, { waitUntil:'networkidle0', timeout:60000 });
  await new Promise(r=>setTimeout(r,250));
  const el = await p.$('.c');
  await el.screenshot({ path: out });
  await p.close();
}

const GRID2 = [
  ['03-CAROUSELS','c2-page-01.png'],['02-FEED-POSTS','post-08.png'],['04-REELS','reel-04.png'],
  ['02-FEED-POSTS','post-09.png'],['03-CAROUSELS','c8-page-01.png'],['03-CAROUSELS','c6-page-01.png'],
  ['02-FEED-POSTS','post-10.png'],['03-CAROUSELS','c7-page-01.png'],['03-CAROUSELS','c5-page-01.png'],
  ['04-REELS','reel-01.png'],['03-CAROUSELS','c3-page-01.png'],['04-REELS','reel-06.png'],
];

async function buildGrid(browser, list, title, out){
  const tiles = list.map(([f,n])=>`<div class="tile"><img src="file://${path.join(ROOT,f,n)}"></div>`).join('');
  const css = `*{margin:0;box-sizing:border-box;font-family:'Archivo',sans-serif}
    .wrap{width:1092px;background:${PAPER};padding:40px 40px 30px}
    .bar{display:flex;align-items:center;gap:22px;padding:6px 6px 30px}
    .ph{width:104px;height:104px;border-radius:50%;overflow:hidden;background:${INK};flex:none;border:3px solid ${BRASS}}
    .ph img{width:100%;height:100%;object-fit:cover}
    .who b{font-family:'Fraunces',serif;font-weight:600;font-size:34px;color:${INK};display:block}
    .who span{font-family:'IBM Plex Mono',monospace;font-size:16px;letter-spacing:.06em;color:#3C5670;margin-top:6px;display:block}
    .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}
    .tile{position:relative;width:100%;aspect-ratio:4/5;overflow:hidden;background:${INK}}
    .tile img{width:100%;height:100%;object-fit:cover;display:block}
    .foot{margin-top:22px;font-family:'IBM Plex Mono',monospace;font-size:16px;letter-spacing:.14em;color:#3C5670;text-align:center;text-transform:uppercase}`;
  const html = `<!doctype html><html><head><meta charset="utf-8">
    <style>@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,300..700&family=Archivo:wght@400;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap');${css}</style></head>
    <body><div class="wrap">
      <div class="bar"><div class="ph"><img src="file://${path.join(__dirname,'assets','logo.jpeg')}"></div>
      <div class="who"><b>mahavircard2011</b><span>Mahavir Card · Printing in Ahmedabad · 25+ yrs</span></div></div>
      <div class="grid">${tiles}</div>
      <div class="foot">${title}</div>
    </div></body></html>`;
  const htmlPath = path.join(HTML, '_grid2.html');
  fs.writeFileSync(htmlPath, html);
  const p = await browser.newPage();
  await p.setViewport({ width:1092, height:1600, deviceScaleFactor:1 });
  await p.goto('file://'+htmlPath, { waitUntil:'networkidle0', timeout:60000 });
  try { await p.evaluate(async()=>{await document.fonts.ready;}); } catch {}
  await new Promise(r=>setTimeout(r,400));
  const el = await p.$('.wrap');
  await el.screenshot({ path: out });
  await p.close();
}

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless:'new',
    args:['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage','--force-color-profile=srgb'] });
  const dir = path.join(ROOT, '13-HIGHLIGHT-COVERS');
  fs.mkdirSync(dir, { recursive:true });
  console.log('> highlight covers…');
  for (const [key,label] of COVERS){ const out = path.join(dir, key+'.png'); await renderCover(browser, key, out); console.log('  ', label, '→', path.basename(out)); }
  console.log('> grid preview 13–24…');
  await buildGrid(browser, GRID2, 'Profile grid preview · posts 13–24 · mahavircard.in', path.join(ROOT,'GRID-PREVIEW-13-24.png'));
  console.log('  GRID-PREVIEW-13-24.png');
  await browser.close();
  console.log('DONE.');
})().catch(e=>{ console.error(e); process.exit(1); });
