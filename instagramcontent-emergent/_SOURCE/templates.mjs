// MAHAVIR CARD — editorial layout templates -> HTML
// Each template returns the inner markup of a .canvas element.

export const brand = {
  name: 'Mahavir Card',
  web: 'mahavircard.in',
  phone: '+91 94263 71150',
  email: 'mahavircard2011@gmail.com',
  addr: 'Khadia Golwad, Opp. Jain Digamber Mandir · Ahmedabad-01',
  cityline: 'Ahmedabad · Gujarat',
  est: '25+ Years in Print',
};

const A = p => (p && (p.startsWith('website-screens/') ? `../${p}` : `../assets/${p}`));
const crops = `<div class="crop tl"><i class="h"></i><i class="v"></i></div><div class="crop tr"><i class="h"></i><i class="v"></i></div><div class="crop bl"><i class="h"></i><i class="v"></i></div><div class="crop br"><i class="h"></i><i class="v"></i></div>`;

const logo = () => `<div class="logomark"><img src="${A('logo.jpeg')}" alt=""><div class="wm"><b>Mahavir Card</b><span>Commercial Print · Ahmedabad</span></div></div>`;
const reg = () => `<div class="reg"><b></b></div>`;
const cmyk = () => `<div class="cmyk"><span class="s1"></span><span class="s2"></span><span class="s3"></span><span class="s4"></span></div>`;
const meta = (page='') => `<div class="metabar"><div style="display:flex;flex-direction:column;gap:12px">${cmyk()}<span class="web">${brand.web}</span></div><span class="pageno">${page}</span></div>`;
const img = (src, fb='home-hero-printing.jpg') => `<img src="${A(src)}" onerror="this.onerror=null;this.src='${A(fb)}'">`;

// ---------- FEED / CAROUSEL (1080x1350) ----------

function hero(d){
  return `<div class="canvas dark L-hero">
    <div class="photo">${img(d.img)}</div>
    <div class="${d.scrim||'scrim-b'}"></div>${crops}
    <div class="pad">
      <div class="top">${logo()}${reg()}</div>
      <div class="stack">
        <div class="kicker">${d.kicker||''}</div>
        <h1 class="display" style="font-size:${d.size||148}px;margin-top:30px">${d.title}</h1>
        ${d.sub?`<p class="sub">${d.sub}</p>`:''}
      </div>
      ${meta(d.page||'')}
    </div></div>`;
}

function poster(d){
  return `<div class="canvas L-poster">${crops}
    <div class="pad">
      <div class="top">${logo()}${reg()}</div>
      <div class="center">
        <div class="kicker">${d.kicker||''}</div>
        <h1 class="display" style="font-size:${d.size||132}px;margin-top:30px;color:var(--ink)">${d.title}</h1>
        ${d.sub?`<p class="sub">${d.sub}</p>`:''}
      </div>
      ${meta(d.page||'')}
    </div></div>`;
}

function split(d){
  return `<div class="canvas L-split ${d.side||'left'}">
    <div class="imgcol">${img(d.img)}</div>
    <div class="txtcol">
      <div class="kicker plain" style="color:var(--brass)">${d.kicker||''}</div>
      <h2 class="display" style="font-size:${d.size||84}px">${d.title}</h2>
      ${d.body?`<p class="body">${d.body}</p>`:''}
      ${d.spec?`<div class="spec">${d.spec.map(r=>`<div class="row"><span class="k">${r[0]}</span><span>${r[1]}</span></div>`).join('')}</div>`:''}
      ${meta(d.page||'')}
    </div>${crops}</div>`;
}

function grid(d){
  return `<div class="canvas L-grid">${crops}
    <div class="pad">
      <div class="head">
        <div><div class="kicker">${d.kicker||''}</div><h2 class="display" style="font-size:${d.size||90}px;margin-top:24px">${d.title}</h2></div>
        ${reg()}
      </div>
      <div class="grid">
        ${d.cells.map(c=>`<div class="cell ${c.cls||''}">${img(c.img)}<div class="cap"><b>${c.label}</b><span>${c.meta||''}</span></div></div>`).join('')}
      </div>
      ${meta(d.page||'')}
    </div></div>`;
}

function macro(d){
  return `<div class="canvas ${d.dark?'dark':''} L-macro">${crops}
    <div class="imgwrap">${img(d.img)}<div class="badge">${logo()}</div></div>
    <div class="strip">
      <div class="kicker">${d.kicker||''}</div>
      <h2 class="display" style="font-size:${d.size||70}px;color:${d.dark?'var(--paper)':'var(--ink)'}">${d.title}</h2>
      ${d.caption?`<p class="body" style="font-size:22px;margin-top:18px;max-width:820px">${d.caption}</p>`:''}
      <div class="foot"><div class="hair" style="margin-bottom:22px"></div><div style="display:flex;justify-content:space-between;align-items:center"><span class="tag">${d.spec||''}</span><span class="web" style="font-family:var(--mono);letter-spacing:.14em">${brand.web}</span></div></div>
    </div></div>`;
}

function num(d){
  return `<div class="canvas ${d.dark?'dark':''} L-num">${crops}
    <div class="pad">
      <div class="top" style="display:flex;justify-content:space-between;align-items:flex-start">${logo()}${reg()}</div>
      <div style="margin:auto 0">
        <div class="kicker">${d.kicker||''}</div>
        <div class="fig" style="font-size:${d.figsize||360}px;color:${d.dark?'var(--paper)':'var(--ink)'};margin:18px 0">${d.fig}<span class="u" style="font-size:${(d.figsize||360)*0.16}px;color:var(--brass);display:block;margin-top:10px">${d.unit||''}</span></div>
      </div>
      <div>${d.cap?`<p class="cap">${d.cap}</p>`:''}${meta(d.page||'')}</div>
    </div></div>`;
}

function steps(d){
  return `<div class="canvas ${d.dark?'dark':''} L-steps">${crops}
    <div class="pad">
      <div class="top" style="display:flex;justify-content:space-between;align-items:flex-start">
        <div><div class="kicker">${d.kicker||''}</div><h2 class="display" style="font-size:${d.size||80}px;margin-top:24px;color:${d.dark?'var(--paper)':'var(--ink)'}">${d.title}</h2></div>${reg()}
      </div>
      <div class="list">
        ${d.steps.map((s,i)=>`<div class="step"><div class="n">${s.n||String(i+1).padStart(2,'0')}</div><div><div class="h" style="color:${d.dark?'var(--paper)':'var(--ink)'}">${s.h}</div>${s.b?`<div class="b">${s.b}</div>`:''}</div></div>`).join('')}
      </div>
      ${meta(d.page||'')}
    </div></div>`;
}

function web(d){
  return `<div class="canvas L-web">${crops}
    <div class="pad">
      <div class="top" style="display:flex;justify-content:space-between;align-items:flex-start">
        <div><div class="kicker">${d.kicker||''}</div><h2 class="display" style="font-size:${d.size||88}px;margin-top:24px">${d.title}</h2></div>${reg()}
      </div>
      <div class="frame"><div class="bar"><i></i><i></i><i></i><span class="url">${d.url||'https://mahavircard.in'}</span></div>${img(d.img,'visiting-card-promo.jpg')}</div>
      ${d.note?`<p class="body" style="margin-top:30px;font-size:22px">${d.note}</p>`:''}
      ${meta(d.page||'')}
    </div></div>`;
}

function cta(d){
  return `<div class="canvas dark L-cta">
    <div class="photo">${img(d.img,'premium-card-category.jpg')}</div><div class="scrim-full"></div>${crops}
    <div class="pad">
      <div class="top" style="display:flex;justify-content:space-between;align-items:flex-start">${logo()}${reg()}</div>
      <div style="margin:auto 0 0 0">
        <div class="kicker" style="color:var(--brass-soft)">${d.kicker||''}</div>
        <h2 class="display" style="font-size:${d.size||118}px;margin-top:24px;color:var(--paper)">${d.title}</h2>
        <div class="rows">${d.rows.map(r=>`<div class="r"><span class="lab">${r.lab}</span><span class="val">${r.val}</span></div>`).join('')}</div>
      </div>
      ${meta(d.page||'')}
    </div></div>`;
}

// ---------- STORIES / REEL COVERS (1080x1920) ----------

function storyType(d){
  return `<div class="canvas story ${d.dark?'dark':''}">${crops}
    <div class="pad">
      <div class="top" style="display:flex;justify-content:space-between;align-items:flex-start">${logo()}${reg()}</div>
      <div style="margin:auto 0">
        ${d.pill?`<div class="badge-pill" style="margin-bottom:40px">${d.pill}</div>`:''}
        <div class="kicker">${d.kicker||''}</div>
        <h1 class="display" style="font-size:${d.size||126}px;margin-top:28px;color:${d.dark?'var(--paper)':'var(--ink)'}">${d.title}</h1>
        ${d.sub?`<p class="body" style="font-size:28px;margin-top:34px;max-width:820px">${d.sub}</p>`:''}
      </div>
      ${d.tap?`<div class="tap" style="margin-bottom:20px">${d.tap}<span class="arrow">&#8594;</span></div>`:''}
      ${meta(d.page||'')}
    </div></div>`;
}

function storyPhoto(d){
  return `<div class="canvas story dark">
    <div class="photo">${img(d.img)}</div><div class="scrim-b"></div>${crops}
    <div class="pad">
      <div class="top" style="display:flex;justify-content:space-between;align-items:flex-start">${logo()}${reg()}</div>
      <div style="margin-top:auto">
        ${d.pill?`<div class="badge-pill" style="margin-bottom:34px">${d.pill}</div>`:''}
        <div class="kicker" style="color:var(--brass-soft)">${d.kicker||''}</div>
        <h1 class="display" style="font-size:${d.size||110}px;margin-top:26px;color:var(--paper)">${d.title}</h1>
        ${d.sub?`<p class="body" style="font-size:27px;margin-top:26px;color:var(--paper);opacity:.9;max-width:820px">${d.sub}</p>`:''}
      </div>
      ${d.tap?`<div class="tap" style="color:var(--paper);margin:36px 0 12px">${d.tap}<span class="arrow">&#8594;</span></div>`:''}
      ${meta(d.page||'')}
    </div></div>`;
}

function storyPoll(d){
  return `<div class="canvas story ${d.dark?'dark':''}">${crops}
    <div class="pad">
      <div class="top" style="display:flex;justify-content:space-between;align-items:flex-start">${logo()}${reg()}</div>
      <div style="margin:auto 0">
        <div class="kicker">${d.kicker||''}</div>
        <h1 class="display" style="font-size:${d.size||96}px;margin-top:28px;color:${d.dark?'var(--paper)':'var(--ink)'}">${d.title}</h1>
        <div class="poll">${d.options.map((o,i)=>`<div class="opt ${i===0?'hot':''}">${o}</div>`).join('')}</div>
        ${d.note?`<p class="body" style="font-size:24px;margin-top:34px">${d.note}</p>`:''}
      </div>
      ${meta(d.page||'')}
    </div></div>`;
}

function storyQuestion(d){
  return `<div class="canvas story ${d.dark?'dark':''}">${crops}
    <div class="pad">
      <div class="top" style="display:flex;justify-content:space-between;align-items:flex-start">${logo()}${reg()}</div>
      <div style="margin:auto 0">
        <div class="kicker">${d.kicker||''}</div>
        <h1 class="display" style="font-size:${d.size||100}px;margin-top:28px;color:${d.dark?'var(--paper)':'var(--ink)'}">${d.title}</h1>
        <div class="qbox">${d.qbox||'Type your answer…'}</div>
        ${d.note?`<p class="body" style="font-size:24px;margin-top:30px">${d.note}</p>`:''}
      </div>
      ${meta(d.page||'')}
    </div></div>`;
}

function reelCover(d){
  return `<div class="canvas story dark">
    <div class="photo">${img(d.img)}</div><div class="${d.scrim||'scrim-full'}"></div>${crops}
    <div class="pad">
      <div class="top" style="display:flex;justify-content:space-between;align-items:flex-start">${logo()}<div class="badge-pill" style="color:var(--brass-soft);border-color:var(--brass-soft)">&#9658; Reel</div></div>
      <div style="margin:auto 0">
        <div class="kicker" style="color:var(--brass-soft)">${d.kicker||''}</div>
        <h1 class="display" style="font-size:${d.size||132}px;margin-top:26px;color:var(--paper)">${d.title}</h1>
        ${d.sub?`<p class="body" style="font-size:27px;margin-top:26px;color:var(--paper);opacity:.92;max-width:840px">${d.sub}</p>`:''}
      </div>
      ${meta(d.page||'')}
    </div></div>`;
}

function festival(d){
  const acc = d.accent || 'var(--brass)';
  const fg = d.dark ? 'var(--paper)' : 'var(--ink)';
  return `<div class="canvas ${d.dark?'dark':''} L-fest">${crops}
    <div class="pad">
      <div class="top" style="display:flex;justify-content:space-between;align-items:flex-start">${logo()}${reg()}</div>
      <div style="margin:auto 0">
        <div style="height:2px;width:120px;background:${acc};margin-bottom:34px"></div>
        <div class="kicker" style="color:${acc}">${d.greeting||''}</div>
        <h1 class="display" style="font-size:${d.size||150}px;margin-top:26px;color:${fg}">${d.title}</h1>
        ${d.offer?`<p class="body" style="font-size:26px;line-height:1.5;margin-top:34px;max-width:820px;color:${fg}">${d.offer}</p>`:''}
        <div style="margin-top:38px;display:flex;gap:14px;align-items:center">
          <span style="width:10px;height:10px;border-radius:50%;background:${acc};display:inline-block"></span>
          <span class="tag" style="color:${acc}">${d.tag||'Cards · Stationery · Packaging'}</span>
        </div>
      </div>
      ${meta(d.page||'')}
    </div></div>`;
}

const MAP = { hero, poster, split, grid, macro, num, steps, web, cta, festival,
  'story-type':storyType, 'story-photo':storyPhoto, 'story-poll':storyPoll, 'story-question':storyQuestion, 'reel-cover':reelCover };

export function render(asset){
  const fn = MAP[asset.layout];
  if(!fn) throw new Error('Unknown layout: '+asset.layout);
  return fn(asset.data);
}
