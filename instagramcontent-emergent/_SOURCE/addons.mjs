// Add-on content: Packaging set + Festival templates.
// Rendered by build-addons.mjs (does not re-render the core 90).
export const addons = [];
const push = (folder, file, layout, data) => addons.push({ folder, file, layout, data });

/* ---------- 11 · PACKAGING SET (typographic — no product photos) ----------
   Kept intentionally photo-free: we don't have real photos of Mahavir Card
   packaging/bill books, so these are editorial type templates, not fake product shots. */
const P = '11-PACKAGING-SET';
push(P,'post-01.png','poster',{kicker:'Packaging & labels · On request',size:112,
  title:'We print<br>the box too.',
  sub:'Custom boxes, carrier bags, label rolls and wraps — printed and finished to match your cards. Send your sizes and we\u2019ll quote it from the press.',page:'Custom'});
push(P,'post-02.png','steps',{kicker:'Business forms · On request',title:'Bill books &<br>packing slips.',size:66,page:'Custom',steps:[
  {h:'Numbered bill & invoice books'},
  {h:'Carbonless or single copy'},
  {h:'Stitched or padded binding'},
  {h:'Packing-slip pads for dispatch'}]});
push(P,'story-01.png','story-type',{dark:true,pill:'On request',kicker:'Packaging',size:112,title:'We print<br>the box too.',sub:'Boxes · bags · label rolls · wraps.',tap:'Send requirement'});
push(P,'story-02.png','story-type',{pill:'On request',kicker:'Business forms',size:100,title:'Bill books &<br>packing slips.',sub:'Numbered, bound, ready for the counter.'});
push(P,'story-03.png','story-type',{dark:true,kicker:'Custom quote',size:110,title:'Box? Bag?<br>Bill book?',sub:'Send size, quantity and binding — we\u2019ll quote it.',tap:'DM us'});

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

/* ---------- 14 · TESTIMONIAL TEMPLATE (empty — fill with REAL feedback only) ---------- */
const T = '14-TESTIMONIAL-TEMPLATE';
push(T,'testimonial-feed-paper.png','testimonial',{kicker:'In their words',size:60,
  quote:'[ Add a real customer\u2019s words here \u2014 keep it short, and in their own voice. ]',
  attrib:'\u2014 [ Name ]  \u00b7  [ Business ]  \u00b7  [ Ahmedabad ]'});
push(T,'testimonial-feed-ink.png','testimonial',{dark:true,kicker:'In their words',size:60,
  quote:'[ Paste genuine feedback here. Never edit the customer\u2019s meaning. ]',
  attrib:'\u2014 [ Name ]  \u00b7  [ Business ]  \u00b7  [ City ]'});
push(T,'testimonial-story.png','testimonial-story',{pill:'Client feedback',kicker:'In their words',size:64,
  quote:'[ Add a real quote here. ]',attrib:'\u2014 [ Name ] \u00b7 [ Business ]',tap:'More reviews'});

/* ---------- 15 · WEEKLY TEMPLATE ("On the Press This Week" — add a real photo/video) ---------- */
const W = '15-WEEKLY-TEMPLATE';
push(W,'on-the-press-feed.png','weekly',{title:'On the press,<br>this week.'});
push(W,'on-the-press-story.png','weekly-story',{title:'On the press,<br>this week.'});
