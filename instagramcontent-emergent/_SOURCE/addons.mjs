// Add-on content: Packaging set + Festival templates.
// Rendered by build-addons.mjs (does not re-render the core 90).
export const addons = [];
const push = (folder, file, layout, data) => addons.push({ folder, file, layout, data });

/* ---------- 11 · PACKAGING SET ----------
   NOTE: uses placeholder generated print-craft photos (gen-billbook / gen-packing-slips /
   gen-packaging). Swap these for real Mahavir Card photos once available. */
const P = '11-PACKAGING-SET';
push(P,'post-01.png','hero',{img:'gen-packaging2.jpg',scrim:'scrim-full',kicker:'Packaging & labels',size:110,
  title:'Boxes, bags<br>& labels.',sub:'Branded packaging, carrier bags and label rolls — printed and finished with your cards.',page:'On request'});
push(P,'post-02.png','split',{img:'gen-billbook2.jpg',side:'left',kicker:'Bill books & slips',size:74,
  title:'Bill books,<br>packing slips.',
  body:'Numbered bill books, invoice books and packing slips — carbonless or single, bound the way your counter needs them. On request.',
  spec:[['Formats','Bill book · Slip pad'],['Binding','Stitched · Padded'],['Quote','Send qty & size']]});
push(P,'story-01.png','story-photo',{img:'gen-packaging2.jpg',pill:'On request',kicker:'Packaging',size:104,title:'Pack it<br>in your<br>brand.',tap:'Send requirement'});
push(P,'story-02.png','story-photo',{img:'gen-billbook2.jpg',kicker:'Business forms',size:100,title:'Packing<br>slips &<br>bill books.',sub:'Numbered, bound, ready for the counter.'});
push(P,'story-03.png','story-type',{dark:true,kicker:'Custom quote',size:112,title:'Bill book?<br>Boxes?',sub:'Send size, quantity and binding — we\u2019ll quote it.',tap:'DM us'});

/* ---------- 12 · FESTIVAL TEMPLATES (Ahmedabad calendar) ----------
   Editorial, type-led. Offer copy is a placeholder — edit before posting. */
const F = '12-FESTIVAL';
push(F,'diwali.png','festival',{dark:true,accent:'#D19A46',greeting:'Shubh Deepawali',size:168,
  title:'Diwali.',offer:'Festive cards, gift-box labels and stationery — book your Diwali printing early to beat the rush.',tag:'Cards · Boxes · Stationery'});
push(F,'uttarayan.png','festival',{accent:'#2E86C1',greeting:'Happy Uttarayan',size:150,
  title:'Kai Po Che!',offer:'Ahmedabad\u2019s festival of kites. Festive labels, flyers and packaging for the season.',tag:'Flyers · Labels · Packaging'});
push(F,'navratri.png','festival',{dark:true,accent:'#B23A48',greeting:'Jai Mataji · Navratri',size:150,
  title:'Nine nights.',offer:'Passes, entry cards, flyers and pass-books printed in time for Navratri.',tag:'Passes · Flyers · Cards'});
push(F,'holi.png','festival',{accent:'#C0397A',greeting:'Happy Holi',size:180,
  title:'Rang.',offer:'Bright, bold printing for the festival of colours — event flyers, labels and cards.',tag:'Flyers · Labels · Cards'});
push(F,'rakshabandhan.png','festival',{accent:'#B5883F',greeting:'Raksha Bandhan',size:132,
  title:'Tie the<br>knot.',offer:'Gift-box labels and packaging for the Rakhi season — get them printed early.',tag:'Labels · Boxes · Tags'});
push(F,'gujarati-new-year.png','festival',{dark:true,accent:'#8296A9',greeting:'Bestu Varas · Saal Mubarak',size:126,
  title:'Fresh start.',offer:'New year, new stationery. Reorder your visiting cards and letterheads for the year ahead.',tag:'Cards · Letterhead · Stationery'});
