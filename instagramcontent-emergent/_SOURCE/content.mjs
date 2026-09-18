// MAHAVIR CARD — content model. Every asset is grounded in verified
// facts from mahavircard.in (categories, GSM, finishes, turnaround, MOQ).
// Facts: Est. ~1998 (25+ yrs) · Khadia Golwad, Opp. Jain Digamber Mandir,
// Ahmedabad-01 · +91 94263 71150 · mahavircard2011@gmail.com · capacity 500–50,000+.

export const assets = [];
const push = (folder, file, layout, data) => assets.push({ id: (folder.split('-')[0]) + '_' + file.replace(/\.png$/, ''), folder, file, layout, data });

const BRASS = 'color:var(--brass-soft)';

/* ============================================================
   01 — FLAGSHIP LAUNCH CAROUSEL (12 pages, 4:5)
   ============================================================ */
const C = '01-LAUNCH-CAROUSEL';
push(C,'page-01.png','hero',{img:'visiting-card-promo.jpg',kicker:'Ahmedabad · Since 1998',size:146,
  title:`Mahavir Card.<br><span style="${BRASS}">Now online.</span>`,
  sub:'Twenty-five years of commercial printing — now with live pricing and online ordering.',page:'01 / 12'});
push(C,'page-02.png','num',{kicker:'Est. 1998 · Khadia Golwad',fig:'25+',figsize:320,unit:'Years in print',
  cap:"Two and a half decades pressing ink onto paper for Ahmedabad's businesses, agencies and trade printers.",page:'02 / 12'});
push(C,'page-03.png','grid',{kicker:'The catalogue',title:'What we print',page:'03 / 12',cells:[
  {img:'visiting-card-category.jpg',label:'Visiting Cards',meta:'NT · Thermal · Spot UV',cls:'wide'},
  {img:'premium-card-category.jpg',label:'Premium',meta:'Velvet · Foil'},
  {img:'art-card-category.jpg',label:'Art Cards',meta:'250 GSM'},
  {img:'letterhead-envelope-category.jpg',label:'Letterhead',meta:'+ Envelope'},
  {img:'brochure-category.jpg',label:'Brochures',meta:'Trifold · A8'},
  {img:'leaflet-category.jpg',label:'Leaflets',meta:'130 / 170 GSM'},
  {img:'sticker-category.jpg',label:'Stickers',meta:'Avery · Vinyl'},
  {img:'gen-cmyk-sheet.jpg',label:'Custom',meta:'On request'}]});
push(C,'page-04.png','split',{img:'visiting-card-promo.jpg',side:'left',kicker:'01 · Visiting Cards',size:78,
  title:'Visiting cards,<br>done properly.',
  body:'Standard, tearable, thermal-matt, textured and spot-UV cards on heavy stock, with clean corner cuts.',
  spec:[['Stock','250–400 GSM'],['Finishes','Matt · Velvet · Spot UV'],['Min. qty','1,000'],['Turnaround','1–2 days']],page:'04 / 12'});
push(C,'page-05.png','split',{img:'velvet-gold-foil-pair.jpg',side:'right',kicker:'02 · Premium & Art',size:78,
  title:'Velvet, foil<br>& raised UV.',
  body:'Round-cut 400 GSM velvet cards with metallic gold-foil edges and drip-off finishes. Corner cut as standard.',
  spec:[['Premium','400 GSM Velvet'],['Accents','Gold Foil · Drip-off'],['Art card','250 GSM'],['Turnaround','7–10 days']],page:'05 / 12'});
push(C,'page-06.png','split',{img:'alabaster-stationery.jpg',side:'left',kicker:'03 · Business Stationery',size:78,
  title:'Stationery<br>that matches.',
  body:'Letterheads and envelopes in Alabaster and SS-finish papers — a consistent identity across every touchpoint. Bill books & packing slips on request.',
  spec:[['Papers','Alabaster · SS Finish'],['Formats','Letterhead · Envelope'],['Also','On request'],['Turnaround','4–5 days']],page:'06 / 12'});
push(C,'page-07.png','macro',{img:'trifold-brochure-open.jpg',kicker:'04 · Commercial print',size:66,
  title:'Fold, flyer, label.',
  caption:'250 GSM art-card brochures (A4 trifold & A8), 130/170 GSM art-paper leaflets, and Avery / standard adhesive stickers priced by the square inch.',
  spec:'Brochures · Leaflets · Stickers'});
push(C,'page-08.png','poster',{kicker:"Don't see it on the website?",size:118,
  title:'If it can be<br>printed, ask.',
  sub:"The online catalogue is only a selection. Send your dimensions and artwork — packaging, labels, bespoke stationery, bulk jobs — and we'll quote it from our Ahmedabad press.",page:'08 / 12'});
push(C,'page-09.png','split',{img:'gen-card-stack.jpg',side:'right',kicker:'05 · For printers & resellers',size:70,
  title:'You bring<br>the customer.<br>We print.',
  body:'Trade and reseller jobs handled at our press with pre-press file checks and insured dispatch. Your client stays yours.',
  spec:[['For','Printers · Resellers'],['Send','CDR · Specs · Qty'],['Capacity','500 – 50,000+'],['Dispatch','Insured courier']],page:'09 / 12'});
push(C,'page-10.png','web',{img:'website-screens/home-top.png',url:'https://mahavircard.in',size:84,
  kicker:'06 · The website',title:'See it. Spec it.<br>Price it.',
  note:'Browse the catalogue, configure paper and finish, and get live pricing with itemised GST — all on mahavircard.in.',page:'10 / 12'});
push(C,'page-11.png','steps',{kicker:'From file to finished',title:'How ordering works',size:74,page:'11 / 12',steps:[
  {h:'Choose your product',b:'Visiting cards, brochures, stickers, letterheads.'},
  {h:'Customise the specs',b:'Quantity, paper stock, finish and size.'},
  {h:'Upload your CDR',b:'Print-ready CorelDRAW file with safe bleed.'},
  {h:'Confirm the order',b:'Live pricing with an itemised GST breakdown.'},
  {h:'Print & dispatch',b:'Press run, quality check, courier or counter pickup.'}]});
push(C,'page-12.png','cta',{img:'premium-card-category.jpg',kicker:'Ahmedabad · Gujarat',size:112,
  title:"Let's print<br>something.",rows:[
  {lab:'Call',val:'+91 94263 71150'},
  {lab:'Web',val:'mahavircard.in'},
  {lab:'Email',val:'mahavircard2011@gmail.com'},
  {lab:'Visit',val:'Khadia Golwad, Ahmedabad'}],page:'12 / 12'});

/* ============================================================
   02 — FEED POSTS (10, 4:5)
   ============================================================ */
const F = '02-FEED-POSTS';
push(F,'post-01.png','hero',{img:'home-hero-printing.jpg',kicker:'Now online',size:120,
  title:'Mahavir Card<br>is online.',sub:'Live pricing, online specs and ordering at mahavircard.in.',page:'Launch'});
push(F,'post-02.png','num',{dark:true,kicker:'Since 1998',fig:'25+',figsize:320,unit:'Years of print',
  cap:"Serving Ahmedabad's businesses, one job at a time.",page:'Mahavir Card'});
push(F,'post-03.png','macro',{dark:true,img:'spot-uv-closeup.jpg',kicker:'Visiting cards',size:66,
  title:'Detail you<br>can feel.',caption:'Thermal-matt cards with selective spot-UV gloss on 400 GSM stock.',spec:'01 · Visiting Cards'});
push(F,'post-04.png','split',{img:'premium-card-category.jpg',side:'right',kicker:'Premium cards',size:76,
  title:'The premium<br>edge.',body:'400 GSM velvet with gilt gold edges. Corner cut as standard.',
  spec:[['Stock','400 GSM'],['Finish','Velvet · Foil edge'],['Min. qty','500']]});
push(F,'post-05.png','split',{img:'corporate-envelopes-set.jpg',side:'left',kicker:'Letterhead & Envelope',size:76,
  title:'Business,<br>on paper.',body:'Matching letterheads and envelopes in Alabaster and SS-finish papers.',
  spec:[['Papers','Alabaster · SS'],['Turnaround','4–5 days']]});
push(F,'post-06.png','hero',{img:'trifold-brochure-open.jpg',kicker:'Commercial print',size:118,
  title:'Say more,<br>fold it well.',sub:'250 GSM art-card brochures — A4 trifold & A8 formats.',page:'06 · Brochures'});
push(F,'post-07.png','macro',{img:'diecut-stickers.jpg',kicker:'Stickers & labels',size:66,
  title:'Stick with it.',caption:'Avery & standard adhesive stickers, kiss-cut or die-cut, priced by the square inch.',spec:'07 · Stickers'});
push(F,'post-08.png','poster',{kicker:"Don't see it on the website?",size:120,
  title:'Ask us to<br>print it.',sub:'Packaging, labels, bulk and bespoke jobs — send your specs for a quick quote.',page:'Custom printing'});
push(F,'post-09.png','hero',{img:'gen-press-sheet.jpg',scrim:'scrim-full',kicker:'For printers & resellers',size:112,
  title:'Keep the client.<br>We\u2019ll print.',sub:'Trade jobs pressed, checked and dispatched from Ahmedabad. 500 to 50,000+.',page:'B2B'});
push(F,'post-10.png','macro',{dark:true,img:'gen-cmyk-sheet.jpg',kicker:'Inside the press',size:66,
  title:'Colour,<br>controlled.',caption:'Every sheet is checked for registration and colour before it goes to press.',spec:'Pre-press'});

/* ============================================================
   03 — EDUCATIONAL CAROUSELS (8 × 5 pages)
   ============================================================ */
const E = '03-CAROUSELS';
const carousel = (cid, pages) => pages.forEach((p,i)=>push(E, `${cid}-page-${String(i+1).padStart(2,'0')}.png`, p.layout, {...p.data, page:`${String(i+1).padStart(2,'0')} / ${String(pages.length).padStart(2,'0')}`}));

carousel('c1',[ // 5 mistakes before sending artwork
  {layout:'hero',data:{img:'gen-cmyk-sheet.jpg',kicker:'Pre-press · Guide',size:104,title:'5 mistakes<br>before you<br>send to print'}},
  {layout:'steps',data:{kicker:'Files',title:'Set it up right',size:74,steps:[
    {h:'RGB colour left in the file',b:'Screens use RGB, presses use CMYK. Convert first, or colours shift.'},
    {h:'No bleed added',b:'Extend artwork 3 mm past the trim so no white slivers appear.'}]}},
  {layout:'steps',data:{kicker:'Type & images',title:'Before you export',size:74,steps:[
    {h:'Fonts not converted to curves',b:'Outline text so it prints exactly as designed.'},
    {h:'Low-resolution images',b:'Use 300 DPI at final size — 72 DPI web images print blurry.'}]}},
  {layout:'poster',data:{kicker:'Mistake 05',size:106,title:'Exporting the<br>wrong file.',sub:'Send a print-ready CorelDRAW (.cdr) with bleed, curves and 300 DPI images — the way our press needs it.'}},
  {layout:'cta',data:{img:'premium-card-category.jpg',kicker:'Get it right the first time',size:104,title:'Send it right,<br>print once.',rows:[{lab:'Upload',val:'mahavircard.in'},{lab:'Ask',val:'+91 94263 71150'}]}},
]);
carousel('c2',[ // RGB vs CMYK
  {layout:'poster',data:{kicker:'Colour · Guide',size:132,title:'RGB<br>vs CMYK',sub:'Why your screen and your print never quite match — and what to send.'}},
  {layout:'split',data:{img:'gen-cmyk-sheet.jpg',side:'left',kicker:'The difference',size:74,title:'RGB is light.<br>CMYK is ink.',body:'Screens mix Red-Green-Blue light. Presses mix Cyan-Magenta-Yellow-Black ink. The ink range is smaller, so bright screen colours can dull in print.'}},
  {layout:'steps',data:{kicker:'What to expect',title:'On press',size:76,steps:[
    {h:'Bright blues & greens shift',b:'Vivid RGB tones flatten when converted late.'},
    {h:'Convert early, on purpose',b:'Set CMYK yourself so you approve the result — not the press.'}]}},
  {layout:'num',data:{dark:true,kicker:'CMYK',fig:'K',figsize:420,unit:'the key plate',cap:"The 'K' in CMYK is the black key plate — it keeps text crisp and shadows deep."}},
  {layout:'cta',data:{img:'velvet-gold-foil-pair.jpg',kicker:'Print with confidence',size:112,title:'Send CMYK.<br>Sleep easy.',rows:[{lab:'Files',val:'.cdr · CMYK · 300 DPI'},{lab:'Web',val:'mahavircard.in'}]}},
]);
carousel('c3',[ // Why bleed matters
  {layout:'hero',data:{img:'gen-press-sheet.jpg',kicker:'Pre-press · Guide',size:120,title:'Why bleed<br>matters'}},
  {layout:'split',data:{img:'gen-card-stack.jpg',side:'right',kicker:'The reason',size:74,title:"Cutting isn't<br>perfect.",body:'Guillotine blades move by fractions of a millimetre. Without bleed, that tiny shift shows up as thin white edges on your cards.'}},
  {layout:'steps',data:{kicker:'The fix',title:'The 3 mm rule',size:78,steps:[
    {h:'Extend to 3 mm bleed',b:'Push background colour past the trim line.'},
    {h:'Keep text in the safe zone',b:'Pull important content 4–5 mm inside the edge.'}]}},
  {layout:'poster',data:{kicker:'In short',size:124,title:'Bleed hides<br>the cut.',sub:'It costs nothing to add — and saves a costly reprint.'}},
  {layout:'cta',data:{img:'premium-card-category.jpg',kicker:'We\u2019ll handle the press',size:100,title:"Set the bleed.<br>We'll do the rest.",rows:[{lab:'Ask',val:'+91 94263 71150'},{lab:'Web',val:'mahavircard.in'}]}},
]);
carousel('c4',[ // Paper & finish guide
  {layout:'hero',data:{img:'gen-paper-swatch.jpg',kicker:'Materials · Guide',size:120,title:'Paper &<br>finish guide'}},
  {layout:'split',data:{img:'velvet-raised-uv-macro.jpg',side:'left',kicker:'Start with weight',size:74,title:'Weight<br>first.',body:'250 GSM feels professional. 350–400 GSM feels premium and holds a corner cut. Heavier stock reads as serious.',spec:[['Standard','250–300 GSM'],['Premium','350–400 GSM']]}},
  {layout:'grid',data:{kicker:'Finishes',title:'Pick a feel',size:82,cells:[
    {img:'thermal-matt-400.jpg',label:'Thermal Matt',meta:'Soft, no glare'},
    {img:'spot-uv-closeup.jpg',label:'Spot UV',meta:'Selective gloss'},
    {img:'velvet-gold-foil-pair.jpg',label:'Gold Foil',meta:'Metallic edge'},
    {img:'velvet-raised-uv-macro.jpg',label:'Velvet',meta:'400 GSM touch'},
    {img:'dripoff-hybrid-card.jpg',label:'Drip-off',meta:'Matt + gloss'},
    {img:'round-corner-card.jpg',label:'Corner Cut',meta:'Rounded'}]}},
  {layout:'num',data:{dark:true,kicker:'Our heaviest stock',fig:'400',figsize:300,unit:'GSM velvet',cap:'Round-cut, foil-ready, and unmistakable in hand.'}},
  {layout:'cta',data:{img:'premium-card-category.jpg',kicker:'Configure it online',size:104,title:'Feel the<br>difference.',rows:[{lab:'Configure',val:'mahavircard.in'},{lab:'Visit',val:'Khadia Golwad, Ahmedabad'}]}},
]);
carousel('c5',[ // How to choose a visiting card
  {layout:'poster',data:{kicker:"Buyer's · Guide",size:104,title:'How to choose<br>a visiting card',sub:'Four questions before you print a thousand.'}},
  {layout:'steps',data:{kicker:'Start here',title:'Impression & weight',size:74,steps:[
    {h:'What impression?',b:'Corporate and clean, or premium and tactile?'},
    {h:'How heavy?',b:'250 GSM everyday, 400 GSM for a statement.'}]}},
  {layout:'steps',data:{kicker:'Then decide',title:'Finish & shape',size:74,steps:[
    {h:'Which finish?',b:'Matt for calm, spot-UV for contrast, foil for luxury.'},
    {h:'Any corner cut?',b:'Rounded corners feel modern and premium.'}]}},
  {layout:'split',data:{img:'round-corner-card.jpg',side:'right',kicker:'Match the brand',size:70,title:'Make it<br>fit you.',body:'A law firm and a design studio should not print the same card. Stock and finish are part of your message.'}},
  {layout:'cta',data:{img:'velvet-gold-foil-pair.jpg',kicker:'Still deciding?',size:118,title:'Not sure?<br>Ask us.',rows:[{lab:'WhatsApp',val:'+91 94263 71150'},{lab:'Web',val:'mahavircard.in'}]}},
]);
carousel('c6',[ // Sticker printing basics
  {layout:'hero',data:{img:'diecut-stickers.jpg',kicker:'Stickers · Guide',size:104,title:'Sticker<br>printing<br>basics'}},
  {layout:'steps',data:{kicker:'Two big choices',title:'Material & cut',size:76,steps:[
    {h:'Avery or standard',b:'Avery vinyl lasts outdoors; standard adhesive suits indoor labels.'},
    {h:'Kiss-cut or die-cut',b:'Kiss-cut peels off a sheet; die-cut is a single shaped sticker.'}]}},
  {layout:'split',data:{img:'avery-vinyl-sticker.jpg',side:'left',kicker:'How it\u2019s priced',size:74,title:'Priced by<br>the inch.',body:'Stickers are quoted by finished square-inch area, with minimums and a blade charge for custom shapes.'}},
  {layout:'poster',data:{kicker:'Send us three things',size:110,title:'Size, shape,<br>quantity.',sub:'Add your artwork with bleed and we\u2019ll quote it from the press.'}},
  {layout:'cta',data:{img:'textured-card-350.jpg',kicker:'Label it properly',size:118,title:'Ready to<br>print?',rows:[{lab:'Quote',val:'mahavircard.in/quote'},{lab:'Call',val:'+91 94263 71150'}]}},
]);
carousel('c7',[ // What to send for a custom quote
  {layout:'poster',data:{kicker:'Custom · Checklist',size:110,title:'What to send<br>for a quote',sub:'Five details that get you an accurate price, fast.'}},
  {layout:'steps',data:{kicker:'The essentials',title:'Tell us what & how many',size:70,steps:[
    {h:'Product & quantity',b:'What it is, and how many.'},
    {h:'Size & dimensions',b:'Flat and folded, in mm or inches.'}]}},
  {layout:'steps',data:{kicker:'And the rest',title:'The finishing details',size:70,steps:[
    {h:'Paper / material & finish',b:'GSM, lamination, foil, UV.'},
    {h:'Artwork status',b:'Ready .cdr, or design needed.'},
    {h:'Delivery city & date',b:'For dispatch and timeline.'}]}},
  {layout:'macro',data:{dark:true,img:'gen-cmyk-sheet.jpg',kicker:'Custom printing',size:62,title:'The clearer<br>the brief…',caption:'…the faster and more accurate the quote. Screenshots and references are welcome.',spec:'Custom printing'}},
  {layout:'cta',data:{img:'premium-card-category.jpg',kicker:'One message is enough',size:120,title:'Send it<br>over.',rows:[{lab:'Email',val:'mahavircard2011@gmail.com'},{lab:'Web',val:'mahavircard.in/quote'}]}},
]);
carousel('c8',[ // What resellers should send when outsourcing
  {layout:'hero',data:{img:'gen-press-sheet.jpg',kicker:'Trade · Checklist',size:104,title:'Outsourcing<br>a print job?',sub:'What to send so it runs first time.'}},
  {layout:'steps',data:{kicker:'For a clean run',title:'Send print-ready',size:74,steps:[
    {h:'Print-ready CDR',b:'Bleed added, fonts to curves, 300 DPI.'},
    {h:'Exact specs',b:'Stock, finish, size, quantity.'}]}},
  {layout:'steps',data:{kicker:'For smooth delivery',title:'Plan the handover',size:74,steps:[
    {h:'Ship-to details',b:"Plain packaging if it's for your client."},
    {h:'Deadline',b:'So we can schedule the press run.'}]}},
  {layout:'split',data:{img:'gen-card-stack.jpg',side:'right',kicker:'Quietly behind you',size:70,title:'Your client<br>stays yours.',body:'We\u2019re the press behind your brand — pre-press checks, quality control and insured dispatch.'}},
  {layout:'cta',data:{img:'velvet-gold-foil-pair.jpg',kicker:'Open a trade line',size:104,title:"Let's set up<br>a trade line.",rows:[{lab:'Call',val:'+91 94263 71150'},{lab:'Web',val:'mahavircard.in'}]}},
]);

/* ============================================================
   04 — REEL COVERS (8, 9:16)
   ============================================================ */
const R = '04-REELS';
push(R,'reel-01.png','reel-cover',{img:'gen-cmyk-sheet.jpg',kicker:'Studio',size:118,title:'Inside<br>the press.',sub:'Where colour gets controlled.'});
push(R,'reel-02.png','reel-cover',{img:'gen-press-sheet.jpg',kicker:'Process',size:118,title:'Paper to<br>finished.',sub:'Print · cut · fold · dispatch.'});
push(R,'reel-03.png','reel-cover',{img:'gen-card-stack.jpg',kicker:'Making',size:118,title:'A thousand<br>cards, cut.',sub:'One clean run.'});
push(R,'reel-04.png','reel-cover',{img:'diecut-stickers.jpg',kicker:'Stickers',size:126,title:'Kiss-cut,<br>peeled.',sub:'Avery & vinyl labels.'});
push(R,'reel-05.png','reel-cover',{img:'velvet-gold-foil-pair.jpg',kicker:'Detail',size:130,title:'Foil,<br>up close.',sub:'400 GSM velvet + gold.'});
push(R,'reel-06.png','reel-cover',{img:'gen-paper-swatch.jpg',kicker:'Behind the scenes',size:120,title:'One day.<br>Many jobs.',sub:'A day inside the press.'});
push(R,'reel-07.png','reel-cover',{img:'corporate-envelopes-set.jpg',kicker:'Trade',size:104,title:'The press<br>behind your<br>brand.',sub:'For printers & resellers.'});
push(R,'reel-08.png','reel-cover',{img:'home-hero-printing.jpg',kicker:'Launch',size:104,title:'Now on<br>mahavircard.in',sub:'Live pricing, online orders.'});

/* ============================================================
   05 — STORY TEMPLATES (20, 9:16)
   ============================================================ */
const S = '05-STORIES';
push(S,'story-01.png','story-photo',{img:'home-hero-printing.jpg',pill:'New',kicker:'Now live',size:118,title:"We're<br>online.",sub:'mahavircard.in',tap:'Tap to visit'});
push(S,'story-02.png','story-photo',{img:'premium-card-category.jpg',pill:'Premium',kicker:'Spotlight',size:110,title:'Velvet +<br>gold foil.',tap:'See finishes'});
push(S,'story-03.png','story-photo',{img:'gen-cmyk-sheet.jpg',kicker:'Behind the scenes',size:104,title:'Checking<br>colour.',sub:'Every sheet, before press.'});
push(S,'story-04.png','story-photo',{img:'gen-press-sheet.jpg',kicker:'Process',size:108,title:'Paper →<br>print → cut.'});
push(S,'story-05.png','story-poll',{kicker:'Your call',size:104,title:'Matt or<br>gloss?',options:['Matt','Gloss'],note:'Tap to vote.'});
push(S,'story-06.png','story-question',{dark:true,kicker:'Ask us anything',size:96,title:'What should<br>we print<br>next?',qbox:'Tell us…'});
push(S,'story-07.png','story-type',{dark:true,pill:'Tip 01',kicker:'Print tip',size:120,title:'Add 3 mm<br>bleed.',sub:'So the cut never shows a white edge.'});
push(S,'story-08.png','story-type',{kicker:'Custom',size:118,title:"Don't see it?<br>Ask us.",tap:'Send requirement'});
push(S,'story-09.png','story-poll',{dark:true,kicker:'For the trade',size:88,title:'Do you<br>outsource<br>print jobs?',options:['Yes','Sometimes']});
push(S,'story-10.png','story-type',{dark:true,kicker:'Custom quote',size:120,title:'Send your<br>specs.',sub:'Product · size · quantity · deadline.',tap:'DM us'});
push(S,'story-11.png','story-photo',{img:'visiting-card-promo.jpg',kicker:'Order online',size:110,title:'Live<br>pricing.',tap:'mahavircard.in'});
push(S,'story-12.png','story-type',{kicker:'Say hello',size:112,title:'+91 94263<br>71150',sub:'Khadia Golwad, Ahmedabad-01',pill:'Call / WhatsApp'});
push(S,'story-13.png','story-photo',{img:'gen-paper-swatch.jpg',kicker:'Ahmedabad',size:110,title:'Printed<br>in Khadia.',sub:'Opp. Jain Digamber Mandir.'});
push(S,'story-14.png','story-photo',{img:'velvet-raised-uv-macro.jpg',pill:'New job',kicker:'Just finished',size:108,title:'Fresh off<br>the press.'});
push(S,'story-15.png','story-photo',{img:'gen-foil-macro.jpg',kicker:'Material',size:120,title:'400 GSM.<br>Feel it.'});
push(S,'story-16.png','story-poll',{kicker:'Help us pick',size:96,title:'Which<br>finish?',options:['Spot UV','Gold Foil']});
push(S,'story-17.png','story-type',{dark:true,pill:'Good to know',kicker:'FAQ',size:104,title:'Minimum<br>order?',sub:'Visiting cards from 1,000. Premium from 500.'});
push(S,'story-18.png','story-type',{kicker:'Get a price',size:118,title:'Request a<br>quote.',tap:'mahavircard.in/quote'});
push(S,'story-19.png','story-type',{dark:true,kicker:'Running low?',size:118,title:'Time to<br>reorder.',sub:'We keep your specs on file.',tap:'Reorder'});
push(S,'story-20.png','story-photo',{img:'gen-press-sheet.jpg',kicker:'This week',size:108,title:'On the<br>press.',sub:'Cards, brochures, stickers.'});
