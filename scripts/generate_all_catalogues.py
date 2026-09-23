import os
import subprocess
import base64
import fitz

BASE_DIR = r"c:\Users\Vikas\Desktop\mahavir-card"
OUTPUT_DIR = os.path.join(BASE_DIR, "public")
CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
if not os.path.exists(CHROME_PATH):
    CHROME_PATH = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"

def get_b64(rel_path):
    full_path = os.path.join(BASE_DIR, rel_path)
    if not os.path.exists(full_path):
        return ""
    with open(full_path, "rb") as f:
        data = f.read()
    ext = os.path.splitext(full_path)[1].lower().replace(".", "")
    if ext == "jpg": ext = "jpeg"
    return f"data:image/{ext};base64,{base64.b64encode(data).decode('utf-8')}"

# Load Photos
LOGO = get_b64("public/images/mahavir-card-logo.jpeg")

# Visiting Cards
NT_SINGLE = get_b64("public/images/products/nt-single.jpg")
NT_FB = get_b64("public/images/products/nt-front-back.jpg")
TEAR_SINGLE = get_b64("public/images/products/tearable-single.jpg")
TEAR_UNLAM = get_b64("public/images/products/tearable-card-natural.jpg")
TEAR_LAM = get_b64("public/images/products/tearable-fb-lam.jpg")
THERM_400 = get_b64("public/images/products/thermal-matt-400.jpg")
TEXT_350 = get_b64("public/images/products/textured-card-350.jpg")
THERM_UV_S = get_b64("public/images/products/thermal-single-uv.jpg")
THERM_UV_FB = get_b64("public/images/products/thermal-fb-uv.jpg")

# Premium Cards
VELVET_PLAIN = get_b64("public/images/products/velvet-foil-card.jpg")
VELVET_UV_S = get_b64("public/images/products/thermal-single-uv.jpg")
VELVET_UV_FB = get_b64("public/images/products/velvet-raised-uv-macro.jpg")
VELVET_FOIL_S = get_b64("public/images/products/velvet-single-foil.jpg")
VELVET_FOIL_FB = get_b64("public/images/products/velvet-gold-foil-pair.jpg")
DRIPOFF_FB = get_b64("public/images/products/dripoff-hybrid-card.jpg")

# Art Card
ART_SINGLE = get_b64("public/images/products/art-card.jpg")
ART_BOTH = get_b64("public/images/products/art-card-both-side.jpg")
ART_LAM = get_b64("public/images/products/art-card-lamination.jpg")

# Stationery
LH_ALABASTER = get_b64("public/images/products/letterhead-100-alabaster.jpg")
LH_SS_80 = get_b64("public/images/products/letterhead-80-gsm-ss.jpg")
LH_SS_100 = get_b64("public/images/products/letterhead-100-ss.jpg")
LH_ALABASTER_FB = get_b64("public/images/products/letterhead-envelope-duo.jpg")
ENV_ALABASTER = get_b64("public/images/products/alabaster-envelope-100.jpg")
ENV_SS_80 = get_b64("public/images/products/envelope-80-ss.jpg")
ENV_SS_100 = get_b64("public/images/products/envelope-100-ss.jpg")
COVER_A4 = get_b64("public/images/products/a4-art-paper-cover.jpg")

# Brochures
BROCH_A4_S = get_b64("public/images/products/brochure-unlaminated-matte.jpg")
BROCH_A4_FB = get_b64("public/images/products/brochure-unlaminated-matte.jpg")
BROCH_A4_LAM = get_b64("public/images/products/trifold-brochure-open.jpg")
BROCH_A8_S = get_b64("public/images/products/a8-mini-brochure.jpg")
BROCH_A8_FB = get_b64("public/images/products/a8-mini-brochure.jpg")
BROCH_A8_LAM = get_b64("public/images/products/trifold-brochure.jpg")

# Leaflets & Stickers
FLYER_130_S = get_b64("public/images/products/flyer-130-art-paper.jpg")
FLYER_130_FB = get_b64("public/images/products/leaflet.jpg")
FLYER_170 = get_b64("public/images/products/flyer-170-art-paper.jpg")
STICKER_UNLAM = get_b64("public/images/products/diecut-stickers.jpg")
STICKER_LAM = get_b64("public/images/products/sticker-sheet-kisscut.jpg")
AVERY_UNLAM = get_b64("public/images/products/avery-vinyl-sticker.jpg")
AVERY_LAM = get_b64("public/images/products/avery-vinyl-sticker.jpg")

# Commercial
COMM_BOOKS = get_b64("public/images/products/luxury-brochures-ad.jpg")
COMM_DIARIES = get_b64("public/images/products/executive-diaries-ad.jpg")
COMM_RECEIPTS = get_b64("public/images/products/letterhead-envelope-duo.jpg")
COMM_FOLDERS = get_b64("public/images/products/presentation-folder-ad.jpg")
COMM_BOXES = get_b64("public/images/products/packaging-boxes-ad.jpg")
COMM_BAGS = get_b64("public/images/products/paper-bags-ad.jpg")
COMM_FILES = get_b64("public/images/products/medical-file-folder-ad.jpg")
COMM_PASSES = get_b64("public/images/products/gold-edge-luxury-card.jpg")

def get_css():
    return """
<style>
@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@700;800;900&family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');

@page {
  size: A4 portrait;
  margin: 12mm 10mm 12mm 10mm;
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
  -webkit-print-color-adjust: exact !important;
  print-color-adjust: exact !important;
}

body {
  font-family: 'Plus Jakarta Sans', sans-serif;
  color: #0f172a;
  background-color: #ffffff;
  font-size: 11px;
  line-height: 1.35;
}

.pdf-page {
  width: 100%;
  height: 271mm;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  page-break-after: always;
  break-after: page;
  position: relative;
  overflow: hidden;
}

.pdf-page:last-child {
  page-break-after: auto;
  break-after: auto;
}

.page-head {
  border-bottom: 2px solid #09192e;
  padding-bottom: 8px;
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
}
.brand-lockup {
  display: flex;
  align-items: center;
  gap: 10px;
}
.brand-lockup img {
  width: 38px;
  height: 38px;
  border-radius: 6px;
  border: 1px solid #cbd5e1;
  object-fit: cover;
}
.brand-lockup h2 {
  font-family: 'Cinzel', serif;
  font-size: 18px;
  font-weight: 900;
  color: #09192e;
  line-height: 1.1;
  letter-spacing: 0.5px;
}
.brand-lockup p {
  font-size: 9px;
  font-weight: 800;
  color: #c59b27;
  text-transform: uppercase;
  letter-spacing: 1px;
}
.head-meta {
  text-align: right;
  font-size: 9.5px;
  color: #475569;
}
.phone-pill {
  background: #09192e;
  color: #ffffff;
  padding: 2px 8px;
  border-radius: 4px;
  font-weight: 800;
  font-size: 10px;
  display: inline-block;
  margin-bottom: 2px;
}

.category-banner {
  margin: 10px 0 12px 0;
  background: #f8fafc;
  border-left: 4px solid #c59b27;
  padding: 6px 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-radius: 0 6px 6px 0;
}
.category-banner h3 {
  font-size: 13px;
  font-weight: 900;
  color: #09192e;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.category-banner span {
  font-size: 9.5px;
  font-weight: 700;
  color: #64748b;
}

.products-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
  flex: 1;
}

.product-item {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 9px;
  display: flex;
  gap: 10px;
  page-break-inside: avoid;
  break-inside: avoid;
}
.prod-photo {
  width: 105px;
  height: 98px;
  border-radius: 6px;
  overflow: hidden;
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  flex-shrink: 0;
}
.prod-photo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.prod-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}
.prod-body h4 {
  font-size: 11.5px;
  font-weight: 800;
  color: #09192e;
  line-height: 1.25;
}
.prod-body p.summary {
  font-size: 9px;
  color: #64748b;
  margin-top: 2px;
  line-height: 1.3;
}
.tag-row {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin: 4px 0;
}
.tag-row span {
  font-size: 8.5px;
  font-weight: 700;
  background: #f1f5f9;
  color: #334155;
  padding: 1.5px 5px;
  border-radius: 3px;
}

/* Pricing Box (Used in Rate Catalogue) */
.rate-box {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 5px;
  padding: 4px 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.rate-box .trade-val {
  font-size: 9.5px;
  font-weight: 800;
  color: #065f46;
}
.rate-box .retail-val {
  font-size: 9.5px;
  font-weight: 800;
  color: #1e40af;
}
.rate-box .range-val {
  font-size: 12px;
  font-weight: 900;
  color: #09192e;
}

/* Showroom Box (Used in Showroom Catalogue — 100% No Prices!) */
.showroom-box {
  background: #fdf6e7;
  border: 1px solid #f5deb3;
  border-radius: 5px;
  padding: 4px 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.showroom-box .sample-tag {
  font-size: 9px;
  font-weight: 800;
  color: #854d0e;
  text-transform: uppercase;
}
.showroom-box .inquire-cta {
  font-size: 9px;
  font-weight: 800;
  color: #09192e;
}

.page-foot {
  border-top: 1px solid #cbd5e1;
  padding-top: 7px;
  margin-top: 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 9px;
  color: #64748b;
}
.page-foot strong { color: #09192e; }
.page-foot .page-counter {
  font-family: 'Cinzel', serif;
  font-weight: 800;
  color: #c59b27;
  font-size: 10px;
}
</style>
"""

def render_header(cat_name, is_showroom):
    mode_text = "SHOWROOM SAMPLE DIRECTORY (CLIENT SPEC EDITION)" if is_showroom else "WHOLESALE & RETAIL RATE DIRECTORY"
    return f"""
    <div class="page-head">
      <div class="brand-lockup">
        <img src="{LOGO}" alt="Logo" />
        <div>
          <h2>MAHAVIR CARD</h2>
          <p>{mode_text}</p>
        </div>
      </div>
      <div class="head-meta">
        <div class="phone-pill">📞 Direct Press: +91 79847 52154</div><br />
        <span>Khadia Golwad, Ahmedabad · GSTIN: <strong>24AIUPJ2271L1ZV</strong></span>
      </div>
    </div>
    <div class="category-banner">
      <h3>{cat_name}</h3>
      <span>{"Sample Finishes & Specifications" if is_showroom else "Direct Trade B2B & Retail Rates"} · Ahmedabad Press</span>
    </div>
    """

def render_footer(page_num, total_pages, is_showroom):
    note = "Showroom Edition · Custom Quote via WhatsApp: <strong>+91 79847 52154</strong>" if is_showroom else "Orders via WhatsApp: <strong>+91 79847 52154</strong> · Standard Batch: 1,000 pcs"
    return f"""
    <div class="page-foot">
      <div>
        <strong>Mahavir Card</strong> · {note} · CDR in Curves
      </div>
      <div class="page-counter">Page {page_num:02d} / {total_pages:02d}</div>
    </div>
    """

def render_product_card(title, desc, img, specs, is_showroom, trade="", retail="", range_val="", unit_label="1,000 pcs"):
    spec_tags = "".join([f"<span>{s}</span>" for s in specs])
    if is_showroom:
        bottom_block = f"""
        <div class="showroom-box">
          <div class="sample-tag">★ Showroom Display Sample</div>
          <div class="inquire-cta">Inquire on WhatsApp ➔</div>
        </div>
        """
    else:
        bottom_block = f"""
        <div class="rate-box">
          <div>
            <div class="trade-val">💼 Trade: {trade}</div>
            <div class="retail-val">🏪 Retail: {retail}</div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 8px; color: #64748b; font-weight: 700;">RANGE ({unit_label})</div>
            <div class="range-val">{range_val}</div>
          </div>
        </div>
        """

    return f"""
    <div class="product-item">
      <div class="prod-photo">
        <img src="{img}" alt="{title}" />
      </div>
      <div class="prod-body">
        <div>
          <h4>{title}</h4>
          <p class="summary">{desc}</p>
          <div class="tag-row">{spec_tags}</div>
        </div>
        {bottom_block}
      </div>
    </div>
    """

def build_cover(is_showroom):
    mode_badge = "★ CLIENT SHOWROOM EDITION · 100% PRIVATE SAMPLES" if is_showroom else "★ 2026 COMMERCIAL TRADE & RETAIL DIRECTORY"
    title_sub = "Commercial Offset Printing & Luxury Finishes" if is_showroom else "Commercial Offset Printing & Complete Rate Directory"
    desc = (
        "Explore our complete production line of commercial visiting cards, luxury velvet embellishments, executive stationery suites, folded brochures, packaging cartons, and custom fabrication services."
        if is_showroom else
        "Complete technical specifications, paper GSM grades, surface embellishments, and transparent B2B Wholesale & Retail price ranges for printers, corporate houses, agencies & resellers."
    )
    return f"""
    <div class="pdf-page" style="background: radial-gradient(circle at 80% 20%, #0d223f 0%, #061120 70%); color: #ffffff; padding: 40px 30px; justify-content: space-between;">
      <div>
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #c59b27; padding-bottom: 16px;">
          <div style="display: flex; align-items: center; gap: 14px;">
            <img src="{LOGO}" style="width: 56px; height: 56px; border-radius: 10px; border: 2px solid #c59b27;" />
            <div>
              <h1 style="font-family: 'Cinzel', serif; font-size: 28px; font-weight: 900; letter-spacing: 1px; color: #ffffff;">MAHAVIR CARD</h1>
              <p style="font-size: 11px; font-weight: 700; letter-spacing: 2px; color: #c59b27; text-transform: uppercase;">Commercial Offset Printing Hub · Ahmedabad</p>
            </div>
          </div>
          <div style="text-align: right; background: rgba(197, 155, 39, 0.15); border: 1px solid #c59b27; padding: 6px 14px; border-radius: 6px;">
            <div style="font-size: 9px; font-weight: 800; color: #c59b27; text-transform: uppercase;">Official Release</div>
            <div style="font-size: 12px; font-weight: 900; color: #ffffff;">2026 DIRECTORY</div>
          </div>
        </div>

        <div style="margin-top: 30px;">
          <div style="display: inline-block; background: #c59b27; color: #061120; font-size: 10.5px; font-weight: 900; text-transform: uppercase; padding: 3px 12px; border-radius: 15px; letter-spacing: 1px; margin-bottom: 12px;">
            {mode_badge}
          </div>
          <h2 style="font-size: 34px; font-weight: 900; line-height: 1.15; color: #ffffff; letter-spacing: -0.5px;">
            {title_sub}
          </h2>
          <p style="font-size: 13.5px; color: #94a3b8; margin-top: 10px; max-width: 650px; line-height: 1.5;">
            {desc}
          </p>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin: 20px 0;">
        <div style="border-radius: 8px; overflow: hidden; border: 1px solid rgba(197, 155, 39, 0.3); height: 160px; position: relative;">
          <img src="{VELVET_FOIL_FB}" style="width: 100%; height: 100%; object-fit: cover;" />
          <div style="position: absolute; bottom: 0; left: 0; right: 0; background: linear-gradient(to top, rgba(6,17,32,0.95), transparent); padding: 12px 8px 6px 8px; font-size: 10px; font-weight: 800; color: #ffffff; text-align: center;">Velvet Touch &amp; Gold Foil</div>
        </div>
        <div style="border-radius: 8px; overflow: hidden; border: 1px solid rgba(197, 155, 39, 0.3); height: 160px; position: relative;">
          <img src="{LH_ALABASTER_FB}" style="width: 100%; height: 100%; object-fit: cover;" />
          <div style="position: absolute; bottom: 0; left: 0; right: 0; background: linear-gradient(to top, rgba(6,17,32,0.95), transparent); padding: 12px 8px 6px 8px; font-size: 10px; font-weight: 800; color: #ffffff; text-align: center;">Executive Stationery Suite</div>
        </div>
        <div style="border-radius: 8px; overflow: hidden; border: 1px solid rgba(197, 155, 39, 0.3); height: 160px; position: relative;">
          <img src="{BROCH_A4_LAM}" style="width: 100%; height: 100%; object-fit: cover;" />
          <div style="position: absolute; bottom: 0; left: 0; right: 0; background: linear-gradient(to top, rgba(6,17,32,0.95), transparent); padding: 12px 8px 6px 8px; font-size: 10px; font-weight: 800; color: #ffffff; text-align: center;">Tri-Fold Product Catalogues</div>
        </div>
      </div>

      <div>
        <div style="display: flex; gap: 10px; margin-bottom: 16px;">
          <div style="background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); padding: 8px 14px; border-radius: 6px; font-size: 10px; font-weight: 700; color: #e2e8f0;">⚡ <strong>25+ Years</strong> Legacy</div>
          <div style="background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); padding: 8px 14px; border-radius: 6px; font-size: 10px; font-weight: 700; color: #e2e8f0;">📦 <strong>1,000 Pcs</strong> Standard Runs</div>
          <div style="background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); padding: 8px 14px; border-radius: 6px; font-size: 10px; font-weight: 700; color: #e2e8f0;">🚚 <strong>Pan-India</strong> Dispatch</div>
          <div style="background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); padding: 8px 14px; border-radius: 6px; font-size: 10px; font-weight: 700; color: #e2e8f0;">🎨 <strong>CorelDRAW (.CDR)</strong> Queue</div>
        </div>

        <div style="background: rgba(255,255,255,0.05); border: 1.5px solid #c59b27; border-radius: 10px; padding: 14px 20px; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <div style="font-size: 9.5px; text-transform: uppercase; font-weight: 800; color: #c59b27; letter-spacing: 1px;">Direct Press Helpline &amp; WhatsApp</div>
            <div style="font-size: 22px; font-weight: 900; color: #ffffff; margin-top: 2px;">+91 79847 52154 <span style="font-size: 14px; font-weight: 500; color: #94a3b8;">/ +91 94263 71150</span></div>
          </div>
          <div style="text-align: right; font-size: 10px; color: #cbd5e1; line-height: 1.4;">
            <span>📍 Khadia Golwad, Opp. Jain Digamber Mandir, Ahmedabad</span><br />
            <span>🌐 <strong>www.mahavircard.in</strong> · ✉️ mahavircard2011@gmail.com</span>
          </div>
        </div>
      </div>
    </div>
    """

def generate_catalogue_html(is_showroom):
    html_pages = [build_cover(is_showroom)]

    # Page 2: Visiting Cards - Standard & Tearable
    p2_cards = [
        render_product_card("NT Single", "Non-Tearable synthetic card with waterproof single-side print.", NT_SINGLE, ["Waterproof", "Synthetic NT", "Single Side", "2-3 Days"], is_showroom, "₹270", "₹240", "₹240 – ₹270"),
        render_product_card("NT Front Back", "Non-Tearable synthetic card with both sides offset print.", NT_FB, ["Waterproof", "Synthetic NT", "Front & Back", "3-4 Days"], is_showroom, "₹320", "₹280", "₹280 – ₹320"),
        render_product_card("Tearable Single Side (250 GSM)", "High-bulk 250 GSM coated art card single-side printing.", TEAR_SINGLE, ["250 GSM Art Card", "Single Side", "Economical", "2-3 Days"], is_showroom, "₹240", "₹210", "₹210 – ₹240"),
        render_product_card("Tearable Front Back Unlaminated", "250 GSM coated art card front-back print without lamination.", TEAR_UNLAM, ["250 GSM Art Card", "Natural Unlaminated", "Front & Back", "3-4 Days"], is_showroom, "₹350", "₹300", "₹300 – ₹350"),
        render_product_card("Tearable Front Back Laminated", "250 GSM coated art card with dual side gloss/matt thermal film.", TEAR_LAM, ["250 GSM Art Card", "Thermal Laminated", "Durable", "4-5 Days"], is_showroom, "₹350", "₹320", "₹320 – ₹350"),
    ]
    corner_box = """
    <div class="product-item" style="background: #f8fafc; border: 1.5px dashed #cbd5e1; justify-content: center; align-items: center; text-align: center; padding: 14px;">
      <div>
        <h4 style="color: #09192e; font-size: 12px;">Precision Hydraulic Corner Punching</h4>
        <p style="font-size: 9.5px; color: #64748b; margin-top: 3px;">Smooth rounded corners available on all visiting cards for premium executive presentation.</p>
        <div style="margin-top: 8px; font-weight: 800; font-size: 11px; color: #c59b27;">Helpline: +91 79847 52154</div>
      </div>
    </div>
    """
    html_pages.append(f"""
    <div class="pdf-page">
      <div>
        {render_header("Category 01: Commercial Visiting Cards (Standard & Tearable)", is_showroom)}
        <div class="products-grid">
          {p2_cards[0]}{p2_cards[1]}{p2_cards[2]}{p2_cards[3]}{p2_cards[4]}{corner_box}
        </div>
      </div>
      {render_footer(2, 12, is_showroom)}
    </div>
    """)

    # Page 3: Visiting Cards - 400 GSM Thermal Matt & Texture
    p3_cards = [
        render_product_card("400 GSM Thermal Matt Single + Front Back", "Heavyweight 400 GSM board with imported soft thermal matt lamination.", THERM_400, ["400 GSM Extra Stiff", "Thermal Matt", "Same Rate S/FB", "4-5 Days"], is_showroom, "₹420", "₹480", "₹420 – ₹480"),
        render_product_card("350 GSM Thermal Matt Texture", "Premium textured embossed surface with matt thermal coating.", TEXT_350, ["350 GSM Texture Board", "Subtle Grain", "Executive Feel", "4-5 Days"], is_showroom, "₹800", "₹700", "₹700 – ₹800"),
        render_product_card("400 GSM Thermal Matt Single Side UV", "400 GSM matt board with high-gloss raised Spot UV on front side.", THERM_UV_S, ["400 GSM Board", "Single Spot UV", "Selective Gloss", "5-7 Days"], is_showroom, "₹520", "₹570", "₹520 – ₹570"),
        render_product_card("400 GSM Thermal Matt Front Back UV", "Heavy 400 GSM matt card with high-gloss raised Spot UV on both sides.", THERM_UV_FB, ["400 GSM Board", "Dual Spot UV", "Maximum Contrast", "5-7 Days"], is_showroom, "₹620", "₹690", "₹620 – ₹690"),
    ]
    p3_note = f"""
    <div style="background: #09192e; color: #ffffff; border-radius: 6px; padding: 10px 16px; margin-top: 10px; display: flex; justify-content: space-between; align-items: center;">
      <div style="font-size: 10px; line-height: 1.4;">
        <strong style="color: #c59b27;">Spot UV Guidelines:</strong> Supply Spot UV mask in 100% Solid Black (K:100) on a separate CorelDRAW page. Convert all fonts to curves.
      </div>
      <div style="font-size: 10.5px; font-weight: 800; color: #ffffff; white-space: nowrap; margin-left: 14px;">
        Helpline: +91 79847 52154
      </div>
    </div>
    """
    html_pages.append(f"""
    <div class="pdf-page">
      <div>
        {render_header("Category 01 (Cont.): Heavy 400 GSM Thermal Matt & Spot UV", is_showroom)}
        <div class="products-grid" style="grid-template-rows: repeat(2, 1fr);">
          {p3_cards[0]}{p3_cards[1]}{p3_cards[2]}{p3_cards[3]}
        </div>
        {p3_note}
      </div>
      {render_footer(3, 12, is_showroom)}
    </div>
    """)

    # Page 4: Premium Velvet & Luxury Embellishments
    p4_cards = [
        render_product_card("400 GSM Velvet Soft-Touch", "Silky velvet thermal film with luxurious peach-skin touch on 400 GSM.", VELVET_PLAIN, ["400 GSM Board", "Velvet Lamination", "Round Cut Free", "5-7 Days"], is_showroom, "₹800", "₹950", "₹800 – ₹950"),
        render_product_card("400 GSM Velvet Single Side UV", "Silky velvet feel paired with high-gloss raised Spot UV highlights.", VELVET_UV_S, ["Velvet Touch", "Single Spot UV", "High Contrast", "5-7 Days"], is_showroom, "₹900", "₹1,050", "₹900 – ₹1,050"),
        render_product_card("400 GSM Velvet Front Back UV", "Velvet soft-touch lamination with dual-side precision raised Spot UV.", VELVET_UV_FB, ["Dual Spot UV", "Velvet Touch", "Executive Luxury", "5-7 Days"], is_showroom, "₹1,000", "₹1,150", "₹1,000 – ₹1,150"),
        render_product_card("400 GSM Velvet Single Side Foil", "Velvet texture with precision metallic hot-stamped gold or silver foil.", VELVET_FOIL_S, ["Gold / Silver Foil", "Single Side Stamp", "Metallic Shine", "7-10 Days"], is_showroom, "₹1,100", "₹1,250", "₹1,100 – ₹1,250"),
        render_product_card("400 GSM Velvet Front Back Foil", "Velvet finish with metallic hot foil stamping on both front and back.", VELVET_FOIL_FB, ["Dual Side Foil", "Ultra Luxury", "Collector Grade", "7-10 Days"], is_showroom, "₹1,400", "₹1,550", "₹1,400 – ₹1,550"),
        render_product_card("400 GSM Drip-Off Hybrid Varnish", "Hybrid textured gloss-and-sand drip-off effect with micro tactile depth.", DRIPOFF_FB, ["Hybrid Drip-Off", "Dual Varnish", "Scratch Proof", "5-7 Days"], is_showroom, "₹1,200", "₹1,350", "₹1,200 – ₹1,350"),
    ]
    html_pages.append(f"""
    <div class="pdf-page">
      <div>
        {render_header("Category 02: Premium Velvet & Embellished Luxury Cards", is_showroom)}
        <div class="products-grid">
          {p4_cards[0]}{p4_cards[1]}{p4_cards[2]}{p4_cards[3]}{p4_cards[4]}{p4_cards[5]}
        </div>
      </div>
      {render_footer(4, 12, is_showroom)}
    </div>
    """)

    # Page 5: Art Cards & Custom Area Offset
    p5_cards = [
        render_product_card("250 GSM Art Card Single Side", "Economical commercial offset printing on high-grade 250 GSM art card.", ART_SINGLE, ["250 GSM Board", "Single Side", "Custom Dimensions", "3-4 Days"], is_showroom, "30 paise", "28 paise", "28 – 30 paise", "sq.in"),
        render_product_card("250 GSM Art Card Both Side", "High-speed 4-color offset reproduction on both sides of 250 GSM art card.", ART_BOTH, ["250 GSM Board", "Dual Side", "Custom Dimensions", "3-4 Days"], is_showroom, "35 paise", "32 paise", "32 – 35 paise", "sq.in"),
        render_product_card("250 GSM Art Card Both Side Lamination", "Full color front and back print with durable thermal lamination film.", ART_LAM, ["250 GSM Board", "Both Side Laminated", "High Rigidity", "4-5 Days"], is_showroom, "42 paise", "38 paise", "38 – 42 paise", "sq.in"),
    ]
    p5_formula = (
        """
        <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 14px 18px; margin-top: 14px;">
          <h4 style="font-size: 12px; font-weight: 800; color: #09192e; text-transform: uppercase;">
            📐 Custom Dimension &amp; Area Specification Matrix
          </h4>
          <p style="font-size: 10px; color: #475569; margin-top: 4px; line-height: 1.5;">
            250 GSM Art Card allows bespoke dimensional cutting for hangtags, tickets, bookmarks, and oversized brand cards. Contact our estimation desk on WhatsApp for exact area quotations.
          </p>
          <div style="margin-top: 8px; font-size: 10px; color: #09192e; font-weight: 700;">
            Minimum Area: 7.5 Sq.Inches · Gang-run batch sizes starting from 1,000 pcs · Direct helpline: +91 79847 52154
          </div>
        </div>
        """ if is_showroom else
        """
        <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 14px 18px; margin-top: 14px;">
          <h4 style="font-size: 12px; font-weight: 800; color: #09192e; text-transform: uppercase;">
            📐 Square-Inch Area Pricing Formula &amp; Cutting Matrix
          </h4>
          <div style="background: #09192e; color: #c59b27; padding: 8px 14px; border-radius: 5px; font-family: monospace; font-size: 11px; font-weight: 800; margin: 8px 0;">
            Cost = [ Width (in) × Height (in) ] × Rate Per Sq.Inch × Quantity (min. 1,000 pcs) + Blade Charge
          </div>
          <ul style="list-style: square; margin-left: 18px; font-size: 9.5px; color: #334155; line-height: 1.5;">
            <li><strong>Minimum Billable Area:</strong> 7.5 Square Inches per unit.</li>
            <li><strong>Minimum Batch Charge:</strong> ₹250 to ₹350 depending on lamination finish.</li>
            <li><strong>Half Blade Cutting Charge:</strong> ₹50 per 1,000 pcs for multi-up ganged sheets.</li>
          </ul>
        </div>
        """
    )
    html_pages.append(f"""
    <div class="pdf-page">
      <div>
        {render_header("Category 03: Art Card Offset Printing & Sheet Fabrication", is_showroom)}
        <div class="products-grid" style="grid-template-columns: repeat(3, 1fr);">
          {p5_cards[0]}{p5_cards[1]}{p5_cards[2]}
        </div>
        {p5_formula}
      </div>
      {render_footer(5, 12, is_showroom)}
    </div>
    """)

    # Page 6: Corporate Stationery Suites
    p6_cards = [
        render_product_card("100 GSM Alabaster Letterhead", "Rich textured virgin high-bulk paper for executive stationery.", LH_ALABASTER, ["100 GSM Alabaster", "Single Side", "Laser/Inkjet Safe", "3-4 Days"], is_showroom, "₹1,250", "₹1,350", "₹1,250 – ₹1,350"),
        render_product_card("80 GSM SS Finish Letterhead", "Crisp white bond paper with super-smooth offset calibration.", LH_SS_80, ["80 GSM SS Finish", "Super Smooth", "Crisp White", "3-4 Days"], is_showroom, "₹1,200", "₹1,300", "₹1,200 – ₹1,300"),
        render_product_card("100 GSM SS Finish Letterhead", "Heavyweight 100 GSM super-smooth paper for executive corporate files.", LH_SS_100, ["100 GSM SS Finish", "High Brightness", "Executive Weight", "3-4 Days"], is_showroom, "₹1,350", "₹1,450", "₹1,350 – ₹1,450"),
        render_product_card("100 GSM Alabaster Front-Back", "Double-side printing on luxury Alabaster bond for terms & agreements.", LH_ALABASTER_FB, ["100 GSM Alabaster", "Front & Back", "Zero Show-Through", "4-5 Days"], is_showroom, "₹2,200", "₹2,400", "₹2,200 – ₹2,400"),
        render_product_card("100 GSM Alabaster Envelope", "Matching Alabaster 100 GSM executive envelope with peel-and-seal strip.", ENV_ALABASTER, ["100 GSM Alabaster", "Peel & Seal", "9.5 × 4.25 in", "4-5 Days"], is_showroom, "₹1,550", "₹1,650", "₹1,550 – ₹1,650"),
        render_product_card("A4 130 GSM Art Paper Cover", "Heavy envelope jacket to mail full A4 proposals & certificates without folding.", COVER_A4, ["130 GSM Art Paper", "Full A4 Size", "Secure Flap", "4-5 Days"], is_showroom, "₹2,300", "₹2,500", "₹2,300 – ₹2,500"),
    ]
    html_pages.append(f"""
    <div class="pdf-page">
      <div>
        {render_header("Category 04: Corporate Stationery Suites — Letterheads & Envelopes", is_showroom)}
        <div class="products-grid">
          {p6_cards[0]}{p6_cards[1]}{p6_cards[2]}{p6_cards[3]}{p6_cards[4]}{p6_cards[5]}
        </div>
      </div>
      {render_footer(6, 12, is_showroom)}
    </div>
    """)

    # Page 7: Marketing Brochures
    p7_cards = [
        render_product_card("250 GSM A4 Single Side Brochure", "Single-sided 4-color offset flyer on 250 GSM coated art card.", BROCH_A4_S, ["250 GSM Art Card", "Single Side", "8.5 × 11.25 in", "4-5 Days"], is_showroom, "₹2,800", "₹2,600", "₹2,600 – ₹2,800"),
        render_product_card("250 GSM A4 Both Side Unlaminated", "Dual-side print on 250 GSM art card without lamination, bi-fold/tri-fold ready.", BROCH_A4_FB, ["250 GSM Art Card", "Both Side Print", "Crease Friendly", "4-5 Days"], is_showroom, "₹3,300", "₹3,000", "₹3,000 – ₹3,300"),
        render_product_card("250 GSM A4 Both Side Laminated", "Dual-side print with full thermal lamination for premium product catalogues.", BROCH_A4_LAM, ["250 GSM Board", "Dual Laminated", "Tear Proof", "5-7 Days"], is_showroom, "₹3,800", "₹3,500", "₹3,500 – ₹3,800"),
        render_product_card("250 GSM A8 Tearable Single Side", "Pocket sized mini-brochure (8.5 × 5.5 in) on 250 GSM card.", BROCH_A8_S, ["250 GSM Art Card", "A8 Pocket Size", "Single Side", "4-5 Days"], is_showroom, "₹1,400", "₹1,300", "₹1,300 – ₹1,400"),
        render_product_card("250 GSM A8 Tearable Front-Back", "Pocket-sized brochure with full 4-color printing on front and back.", BROCH_A8_FB, ["250 GSM Art Card", "A8 Pocket Size", "Front & Back", "4-5 Days"], is_showroom, "₹1,650", "₹1,500", "₹1,500 – ₹1,650"),
        render_product_card("250 GSM A8 Lamination Front-Back", "Pocket brochure with dual-side thermal lamination for durable menu cards & guides.", BROCH_A8_LAM, ["250 GSM Board", "Dual Laminated", "A8 Size", "4-5 Days"], is_showroom, "₹1,900", "₹1,800", "₹1,800 – ₹1,900"),
    ]
    html_pages.append(f"""
    <div class="pdf-page">
      <div>
        {render_header("Category 05: Marketing Brochures & Pamphlets (A4 & A8 Formats)", is_showroom)}
        <div class="products-grid">
          {p7_cards[0]}{p7_cards[1]}{p7_cards[2]}{p7_cards[3]}{p7_cards[4]}{p7_cards[5]}
        </div>
      </div>
      {render_footer(7, 12, is_showroom)}
    </div>
    """)

    # Page 8: Leaflets & Stickers
    p8_cards = [
        render_product_card("A4 130 GSM Art Paper Single Side", "Lightweight commercial promotional flyers for mass distribution.", FLYER_130_S, ["130 GSM Art Paper", "Single Side", "8.5 × 11.25 in", "4-5 Days"], is_showroom, "₹1,800", "₹1,700", "₹1,700 – ₹1,800"),
        render_product_card("A4 130 GSM Art Paper Front-Back", "Dual-side commercial pamphlets for product launches & inserts.", FLYER_130_FB, ["130 GSM Art Paper", "Front & Back", "Full 4-Color", "2-3 Days"], is_showroom, "₹2,400", "₹2,200", "₹2,200 – ₹2,400"),
        render_product_card("A4 170 GSM Art Paper S/FB", "Heavyweight glossy flyer paper for high-end corporate handouts.", FLYER_170, ["170 GSM Art Paper", "Glossy Finish", "Same Rate S/FB", "4-5 Days"], is_showroom, "₹2,600", "₹2,400", "₹2,400 – ₹2,600"),
        render_product_card("Sticker Without Lamination (80/90)", "Paper-backed self-adhesive sticker paper with sharp offset printing.", STICKER_UNLAM, ["80/90 GSM Sticker", "Unlaminated", "Per Sq.Inch", "4-5 Days"], is_showroom, "35 paise", "33 paise", "33 – 35 paise", "sq.in"),
        render_product_card("Sticker With Lamination (80/90)", "Self-adhesive paper sticker with glossy thermal lamination film.", STICKER_LAM, ["80/90 GSM Sticker", "Laminated", "Water Resistant", "4-5 Days"], is_showroom, "40 paise", "37 paise", "37 – 40 paise", "sq.in"),
        render_product_card("Avery Vinyl Sticker Laminated", "Heavy-duty waterproof outdoor vinyl sticker with high tack adhesive.", AVERY_LAM, ["Avery Vinyl", "100% Waterproof", "Tear Proof", "7-10 Days"], is_showroom, "50 paise", "46 paise", "46 – 50 paise", "sq.in"),
    ]
    html_pages.append(f"""
    <div class="pdf-page">
      <div>
        {render_header("Category 06 & 07: Promotional Leaflets & Packaging Stickers", is_showroom)}
        <div class="products-grid">
          {p8_cards[0]}{p8_cards[1]}{p8_cards[2]}{p8_cards[3]}{p8_cards[4]}{p8_cards[5]}
        </div>
      </div>
      {render_footer(8, 12, is_showroom)}
    </div>
    """)

    # Page 9: Custom Commercial Printing I
    p9_cards = [
        render_product_card("1. Books & Multi-Page Catalogues", "Product manuals, annual reports, souvenir magazines with perfect or saddle binding.", COMM_BOOKS, ["Maplitho / Art Paper", "Perfect / Wire-O", "Spot UV Cover", "5-7 Days"], is_showroom),
        render_product_card("2. Custom Corporate Diaries", "PU leatherette executive planners with foil debossing and silk bookmark ribbon.", COMM_DIARIES, ["PU Leatherette", "Gold Deboss", "Yearly / Daily", "7-10 Days"], is_showroom),
        render_product_card("3. Carbonless Bill Books & Challans", "Self-copy duplicate/triplicate receipt books with red numbering & micro-perforation.", COMM_RECEIPTS, ["55-60 GSM NCR", "6-Digit Numbered", "Stiff Strawboard", "3-5 Days"], is_showroom),
        render_product_card("4. Presentation Folders & Kits", "350-400 GSM imported art card presentation jackets with die-cut card slits.", COMM_FOLDERS, ["350-400 GSM Card", "Card Slit Pocket", "Thermal Matt/UV", "4-6 Days"], is_showroom),
    ]
    p9_note = """
    <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px 14px; margin-top: 10px; display: flex; justify-content: space-between; align-items: center;">
      <div style="font-size: 10px; color: #475569;">
        <strong style="color: #09192e;">Custom Fabrications:</strong> Tailored to exact corporate requirements, paper weights, binding techniques and finish effects.
      </div>
      <div style="font-size: 10.5px; font-weight: 800; color: #09192e;">
        WhatsApp: +91 79847 52154
      </div>
    </div>
    """
    html_pages.append(f"""
    <div class="pdf-page">
      <div>
        {render_header("Custom Commercial Printing & Publications — Section I", is_showroom)}
        <div class="products-grid" style="grid-template-rows: repeat(2, 1fr);">
          {p9_cards[0]}{p9_cards[1]}{p9_cards[2]}{p9_cards[3]}
        </div>
        {p9_note}
      </div>
      {render_footer(9, 12, is_showroom)}
    </div>
    """)

    # Page 10: Custom Commercial Printing II
    p10_cards = [
        render_product_card("5. Packaging Boxes & Monocartons", "Laser die-cut product packaging on 300-450 GSM FBB board with window patching.", COMM_BOXES, ["300-450 GSM FBB", "Auto-Lock Bottom", "PET Window", "7-10 Days"], is_showroom),
        render_product_card("6. Branded Paper Bags & Totes", "170-300 GSM laminated carry bags with twisted paper or braided cotton rope handles.", COMM_BAGS, ["170-300 GSM Art", "Bottom Card Base", "Eyelet Riveted", "6-8 Days"], is_showroom),
        render_product_card("7. Hospital & Medical OPD Files", "Laminated case history folders with high-strength cobra clips & internal document flaps.", COMM_FILES, ["300 GSM Laminated", "Cobra Plastic Clip", "Prescription Slit", "4-6 Days"], is_showroom),
        render_product_card("8. Security Vouchers & Event Passes", "Barcoded passes with anti-counterfeiting guilloche, consecutive numbering & scratch foil.", COMM_PASSES, ["Variable Barcode", "Scratch-Off Latex", "Counterfoil Tear", "3-5 Days"], is_showroom),
    ]
    p10_note = """
    <div style="background: #09192e; color: #ffffff; border-radius: 6px; padding: 10px 14px; margin-top: 10px; display: flex; justify-content: space-between; align-items: center;">
      <div style="font-size: 10px; line-height: 1.4;">
        <strong style="color: #c59b27;">Specialty Embellishments:</strong> Laser die-punching, hybrid drip-off, metallic foils, micro-perforations, and security pantographs.
      </div>
      <div style="font-size: 10.5px; font-weight: 800; color: #ffffff;">
        Helpline: +91 79847 52154
      </div>
    </div>
    """
    html_pages.append(f"""
    <div class="pdf-page">
      <div>
        {render_header("Custom Commercial Printing & Packaging — Section II", is_showroom)}
        <div class="products-grid" style="grid-template-rows: repeat(2, 1fr);">
          {p10_cards[0]}{p10_cards[1]}{p10_cards[2]}{p10_cards[3]}
        </div>
        {p10_note}
      </div>
      {render_footer(10, 12, is_showroom)}
    </div>
    """)

    # Page 11: Production Guidelines & Master Directory Table
    if is_showroom:
        table_html = """
        <table style="width: 100%; border-collapse: collapse; font-size: 9px; margin-top: 8px;">
          <thead>
            <tr style="background: #09192e; color: #ffffff;">
              <th style="padding: 5px 6px; text-align: left;">Product Name</th>
              <th style="padding: 5px 6px; text-align: left;">Category</th>
              <th style="padding: 5px 6px; text-align: left;">Standard Size</th>
              <th style="padding: 5px 6px; text-align: left;">Paper & Finish Grade</th>
              <th style="padding: 5px 6px; text-align: left;">Turnaround</th>
            </tr>
          </thead>
          <tbody>
            <tr><td><strong>NT Single Side</strong></td><td>Visiting Card</td><td>90 × 53 mm</td><td>Waterproof Synthetic Non-Tearable</td><td>2-3 Days</td></tr>
            <tr><td><strong>NT Front Back</strong></td><td>Visiting Card</td><td>90 × 53 mm</td><td>Waterproof Synthetic Non-Tearable</td><td>3-4 Days</td></tr>
            <tr><td><strong>Tearable Art Card 250 GSM</strong></td><td>Visiting Card</td><td>90 × 53 mm</td><td>250 GSM High-Bulk Coated Art Card</td><td>2-3 Days</td></tr>
            <tr><td><strong>400 GSM Thermal Matt</strong></td><td>Visiting Card</td><td>92 × 54 mm</td><td>400 GSM Heavy Board + Thermal Matt Film</td><td>4-5 Days</td></tr>
            <tr><td><strong>350 GSM Thermal Matt Texture</strong></td><td>Visiting Card</td><td>92 × 54 mm</td><td>350 GSM Textured Board + Thermal Matt</td><td>4-5 Days</td></tr>
            <tr><td><strong>400 GSM Single / Dual Spot UV</strong></td><td>Visiting Card</td><td>92 × 54 mm</td><td>400 GSM Board + Selective High Gloss UV</td><td>5-7 Days</td></tr>
            <tr><td><strong>400 GSM Velvet Soft-Touch</strong></td><td>Premium Card</td><td>90 × 53 mm</td><td>400 GSM Board + Velvet Soft Touch Film</td><td>5-7 Days</td></tr>
            <tr><td><strong>400 GSM Velvet + Gold Foil</strong></td><td>Premium Card</td><td>90 × 53 mm</td><td>Velvet Soft Touch + Hot Stamped Gold Foil</td><td>7-10 Days</td></tr>
            <tr><td><strong>400 GSM Drip-Off Hybrid Varnish</strong></td><td>Premium Card</td><td>90 × 53 mm</td><td>Dual Hybrid Gloss & Sand Surface Texture</td><td>5-7 Days</td></tr>
            <tr><td><strong>100 GSM Alabaster Letterhead</strong></td><td>Stationery</td><td>A4 Size</td><td>100 GSM Textured Alabaster Bond Paper</td><td>3-4 Days</td></tr>
            <tr><td><strong>80 / 100 GSM SS Finish Letterhead</strong></td><td>Stationery</td><td>A4 Size</td><td>Super Smooth Bright White Bond Paper</td><td>3-4 Days</td></tr>
            <tr><td><strong>100 GSM Alabaster Envelope</strong></td><td>Stationery</td><td>9.5 × 4.25 in</td><td>100 GSM Matching Alabaster with Peel & Seal</td><td>4-5 Days</td></tr>
            <tr><td><strong>A4 250 GSM Marketing Brochure</strong></td><td>Brochure</td><td>8.5 × 11.25 in</td><td>250 GSM Art Card (Laminated / Unlaminated)</td><td>4-5 Days</td></tr>
            <tr><td><strong>A8 Pocket Mini-Brochure</strong></td><td>Brochure</td><td>8.5 × 5.5 in</td><td>250 GSM Art Card (Creased / Folded)</td><td>4-5 Days</td></tr>
            <tr><td><strong>A4 130 / 170 GSM Art Leaflets</strong></td><td>Leaflet</td><td>8.5 × 11.25 in</td><td>130 / 170 GSM Coated Gloss Art Paper</td><td>3-4 Days</td></tr>
            <tr><td><strong>Self-Adhesive Labels & Avery Vinyl</strong></td><td>Sticker</td><td>Custom Area</td><td>Waterproof Outdoor Grade High Tack Vinyl</td><td>5-7 Days</td></tr>
          </tbody>
        </table>
        """
    else:
        table_html = """
        <table style="width: 100%; border-collapse: collapse; font-size: 8.5px; margin-top: 8px;">
          <thead>
            <tr style="background: #09192e; color: #ffffff;">
              <th style="padding: 5px 6px; text-align: left;">Product Name</th>
              <th style="padding: 5px 6px; text-align: left;">Category</th>
              <th style="padding: 5px 6px; text-align: left;">Standard Size</th>
              <th style="padding: 5px 6px; text-align: left;">B2B Wholesale</th>
              <th style="padding: 5px 6px; text-align: left;">Standard Retail</th>
              <th style="padding: 5px 6px; text-align: left;">Turnaround</th>
            </tr>
          </thead>
          <tbody>
            <tr><td><strong>NT Single Side</strong></td><td>Visiting Card</td><td>90 × 53 mm</td><td style="color:#065f46;font-weight:800;">₹270</td><td style="color:#1e40af;font-weight:800;">₹240</td><td>2-3 Days</td></tr>
            <tr><td><strong>NT Front Back</strong></td><td>Visiting Card</td><td>90 × 53 mm</td><td style="color:#065f46;font-weight:800;">₹320</td><td style="color:#1e40af;font-weight:800;">₹280</td><td>3-4 Days</td></tr>
            <tr><td><strong>Tearable Single Side 250 GSM</strong></td><td>Visiting Card</td><td>90 × 53 mm</td><td style="color:#065f46;font-weight:800;">₹240</td><td style="color:#1e40af;font-weight:800;">₹210</td><td>2-3 Days</td></tr>
            <tr><td><strong>Tearable Front Back Unlam</strong></td><td>Visiting Card</td><td>90 × 53 mm</td><td style="color:#065f46;font-weight:800;">₹350</td><td style="color:#1e40af;font-weight:800;">₹300</td><td>3-4 Days</td></tr>
            <tr><td><strong>Tearable Front Back Lam</strong></td><td>Visiting Card</td><td>90 × 53 mm</td><td style="color:#065f46;font-weight:800;">₹350</td><td style="color:#1e40af;font-weight:800;">₹320</td><td>4-5 Days</td></tr>
            <tr><td><strong>400 GSM Thermal Matt Single / FB</strong></td><td>Visiting Card</td><td>92 × 54 mm</td><td style="color:#065f46;font-weight:800;">₹420</td><td style="color:#1e40af;font-weight:800;">₹480</td><td>4-5 Days</td></tr>
            <tr><td><strong>350 GSM Thermal Matt Texture</strong></td><td>Visiting Card</td><td>92 × 54 mm</td><td style="color:#065f46;font-weight:800;">₹800</td><td style="color:#1e40af;font-weight:800;">₹700</td><td>4-5 Days</td></tr>
            <tr><td><strong>400 GSM Thermal Matt Single UV</strong></td><td>Visiting Card</td><td>92 × 54 mm</td><td style="color:#065f46;font-weight:800;">₹520</td><td style="color:#1e40af;font-weight:800;">₹570</td><td>5-7 Days</td></tr>
            <tr><td><strong>400 GSM Thermal Matt Front Back UV</strong></td><td>Visiting Card</td><td>92 × 54 mm</td><td style="color:#065f46;font-weight:800;">₹620</td><td style="color:#1e40af;font-weight:800;">₹690</td><td>5-7 Days</td></tr>
            <tr><td><strong>400 GSM Velvet Soft-Touch</strong></td><td>Premium Card</td><td>90 × 53 mm</td><td style="color:#065f46;font-weight:800;">₹800</td><td style="color:#1e40af;font-weight:800;">₹950</td><td>5-7 Days</td></tr>
            <tr><td><strong>400 GSM Velvet Single Spot UV</strong></td><td>Premium Card</td><td>90 × 53 mm</td><td style="color:#065f46;font-weight:800;">₹900</td><td style="color:#1e40af;font-weight:800;">₹1,050</td><td>5-7 Days</td></tr>
            <tr><td><strong>400 GSM Velvet Dual Spot UV</strong></td><td>Premium Card</td><td>90 × 53 mm</td><td style="color:#065f46;font-weight:800;">₹1,000</td><td style="color:#1e40af;font-weight:800;">₹1,150</td><td>5-7 Days</td></tr>
            <tr><td><strong>400 GSM Velvet Single Gold Foil</strong></td><td>Premium Card</td><td>90 × 53 mm</td><td style="color:#065f46;font-weight:800;">₹1,100</td><td style="color:#1e40af;font-weight:800;">₹1,250</td><td>7-10 Days</td></tr>
            <tr><td><strong>400 GSM Velvet Dual Gold Foil</strong></td><td>Premium Card</td><td>90 × 53 mm</td><td style="color:#065f46;font-weight:800;">₹1,400</td><td style="color:#1e40af;font-weight:800;">₹1,550</td><td>7-10 Days</td></tr>
            <tr><td><strong>400 GSM Drip-Off Hybrid Varnish</strong></td><td>Premium Card</td><td>90 × 53 mm</td><td style="color:#065f46;font-weight:800;">₹1,200</td><td style="color:#1e40af;font-weight:800;">₹1,350</td><td>5-7 Days</td></tr>
            <tr><td><strong>100 GSM Alabaster Letterhead</strong></td><td>Stationery</td><td>A4 Size</td><td style="color:#065f46;font-weight:800;">₹1,250</td><td style="color:#1e40af;font-weight:800;">₹1,350</td><td>3-4 Days</td></tr>
            <tr><td><strong>80 GSM SS Finish Letterhead</strong></td><td>Stationery</td><td>A4 Size</td><td style="color:#065f46;font-weight:800;">₹1,200</td><td style="color:#1e40af;font-weight:800;">₹1,300</td><td>3-4 Days</td></tr>
            <tr><td><strong>100 GSM Alabaster Envelope</strong></td><td>Stationery</td><td>9.5 × 4.25 in</td><td style="color:#065f46;font-weight:800;">₹1,550</td><td style="color:#1e40af;font-weight:800;">₹1,650</td><td>4-5 Days</td></tr>
            <tr><td><strong>A4 250 GSM Single Side Brochure</strong></td><td>Brochure</td><td>8.5 × 11.25 in</td><td style="color:#065f46;font-weight:800;">₹2,800</td><td style="color:#1e40af;font-weight:800;">₹2,600</td><td>4-5 Days</td></tr>
            <tr><td><strong>A4 250 GSM Dual Side Laminated</strong></td><td>Brochure</td><td>8.5 × 11.25 in</td><td style="color:#065f46;font-weight:800;">₹3,800</td><td style="color:#1e40af;font-weight:800;">₹3,500</td><td>5-7 Days</td></tr>
            <tr><td><strong>A4 130 GSM Single Side Leaflet</strong></td><td>Leaflet</td><td>8.5 × 11.25 in</td><td style="color:#065f46;font-weight:800;">₹1,800</td><td style="color:#1e40af;font-weight:800;">₹1,700</td><td>4-5 Days</td></tr>
            <tr><td><strong>A4 130 GSM Front-Back Leaflet</strong></td><td>Leaflet</td><td>8.5 × 11.25 in</td><td style="color:#065f46;font-weight:800;">₹2,400</td><td style="color:#1e40af;font-weight:800;">₹2,200</td><td>2-3 Days</td></tr>
            <tr><td><strong>Avery Vinyl Sticker Laminated</strong></td><td>Sticker</td><td>Square-Inch</td><td style="color:#065f46;font-weight:800;">50 paise/in²</td><td style="color:#1e40af;font-weight:800;">46 paise/in²</td><td>7-10 Days</td></tr>
          </tbody>
        </table>
        """

    html_pages.append(f"""
    <div class="pdf-page">
      <div>
        {render_header("Technical Production Guidelines & Product Directory Index", is_showroom)}
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 8px;">
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px 10px;">
            <div style="font-size: 10px; font-weight: 800; color: #09192e; text-transform: uppercase;">1. Artwork Format</div>
            <p style="font-size: 8.5px; color: #475569; margin-top: 2px;">CorelDRAW (.CDR) converted to curves (Ctrl+Q). Embed linked assets.</p>
          </div>
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px 10px;">
            <div style="font-size: 10px; font-weight: 800; color: #09192e; text-transform: uppercase;">2. Color Profile</div>
            <p style="font-size: 8.5px; color: #475569; margin-top: 2px;">CMYK color mode with minimum 300 DPI image resolution.</p>
          </div>
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px 10px;">
            <div style="font-size: 10px; font-weight: 800; color: #09192e; text-transform: uppercase;">3. Bleed Margins</div>
            <p style="font-size: 8.5px; color: #475569; margin-top: 2px;">Keep text 3mm inside cutting lines. Extend background 2mm for full bleed.</p>
          </div>
        </div>
        {table_html}
      </div>
      {render_footer(11, 12, is_showroom)}
    </div>
    """)

    # Page 12: Back Cover - Bank Remittance & Dispatch
    back_block = (
        f"""
        <div style="margin-top: 20px;">
          <h3 style="font-size: 14px; font-weight: 800; color: #c59b27; text-transform: uppercase; margin-bottom: 10px;">
            📋 Showroom Sample Inquiries &amp; Custom Job Queue
          </h3>
          <div style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.12); border-radius: 8px; padding: 14px 18px; font-size: 10.5px; color: #cbd5e1; line-height: 1.6;">
            <p>For custom commercial publications, custom size runs, specialty foil stamp dies, or retail quotes:</p>
            <div style="display: flex; gap: 14px; margin-top: 8px;">
              <span>• Send CorelDRAW (.CDR) files directly to our press queue.</span>
              <span>• Instant paper sample verifications available at our Ahmedabad press facility.</span>
            </div>
          </div>
        </div>
        """ if is_showroom else
        f"""
        <div style="margin-top: 18px;">
          <h3 style="font-size: 13px; font-weight: 800; color: #c59b27; text-transform: uppercase; margin-bottom: 8px;">
            🏦 Official Bank Remittance Details (NEFT / RTGS / IMPS)
          </h3>
          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px;">
            <div style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.12); border-radius: 8px; padding: 12px 14px; font-size: 10px;">
              <div style="font-size: 11px; font-weight: 800; color: #ffffff; margin-bottom: 3px;">B2B Trade Current Account</div>
              <div>Beneficiary: <strong>MAHAVIR CARD &amp; PAPER CUTTING</strong></div>
              <div>Bank of Baroda · Ahmedabad(M) Branch</div>
              <div style="font-family: monospace; font-size: 11px; font-weight: 900; color: #ffffff; margin-top: 4px;">A/C: 12410200000662</div>
              <div style="font-family: monospace; color: #94a3b8;">IFSC: BARB0GANAHM</div>
              <div style="color: #c59b27; font-size: 9px; margin-top: 3px;">UPI: mahavircard2011-4@oksbi</div>
            </div>
            <div style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.12); border-radius: 8px; padding: 12px 14px; font-size: 10px;">
              <div style="font-size: 11px; font-weight: 800; color: #ffffff; margin-bottom: 3px;">Retail / General Account</div>
              <div>Beneficiary: <strong>MAHAVIR CARD</strong></div>
              <div>Bank of Baroda · Ahmedabad(M) Branch</div>
              <div style="font-family: monospace; font-size: 11px; font-weight: 900; color: #ffffff; margin-top: 4px;">A/C: 03280200003947</div>
              <div style="font-family: monospace; color: #94a3b8;">IFSC: BARB0GANAHM</div>
              <div style="color: #c59b27; font-size: 9px; margin-top: 3px;">UPI: mahavircard2011-2@oksbi</div>
            </div>
          </div>
        </div>
        """
    )

    html_pages.append(f"""
    <div class="pdf-page" style="background: #061120; color: #ffffff; padding: 36px 30px; justify-content: space-between;">
      <div>
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid rgba(197, 155, 39, 0.4); padding-bottom: 12px;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <img src="{LOGO}" style="width: 44px; height: 44px; border-radius: 8px; border: 1.5px solid #c59b27;" />
            <div>
              <h2 style="font-family: 'Cinzel', serif; font-size: 20px; font-weight: 900; color: #ffffff;">MAHAVIR CARD</h2>
              <p style="font-size: 9.5px; font-weight: 700; color: #c59b27; text-transform: uppercase;">Official Settlement & Dispatch Directory</p>
            </div>
          </div>
          <div style="text-align: right; font-size: 9.5px; color: #cbd5e1;">
            GSTIN: <strong style="color: #ffffff;">24AIUPJ2271L1ZV</strong>
          </div>
        </div>

        {back_block}

        <div style="margin-top: 18px;">
          <h3 style="font-size: 13px; font-weight: 800; color: #c59b27; text-transform: uppercase; margin-bottom: 6px;">
            🚚 Scheduled Transport &amp; Parcel Dispatch
          </h3>
          <div style="background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 12px 16px; font-size: 10px; color: #cbd5e1; line-height: 1.5;">
            <p>Daily scheduled evening handovers to regional and pan-India courier/cargo transport hubs:</p>
            <div style="display: flex; gap: 14px; margin-top: 6px;">
              <span>• <strong>Gujarat:</strong> Same-day / next-day delivery via ST Cargo, Eagle, Maruti.</span>
              <span>• <strong>Rajasthan:</strong> 24-48 hrs via Shrinath, Chirag, VRL.</span>
              <span>• <strong>Pan-India:</strong> Tracked air &amp; surface cargo.</span>
            </div>
          </div>
        </div>
      </div>

      <div style="background: linear-gradient(135deg, rgba(197, 155, 39, 0.2), rgba(9, 25, 46, 0.8)); border: 1.5px solid #c59b27; border-radius: 10px; padding: 16px 20px; display: flex; justify-content: space-between; align-items: center;">
        <div>
          <div style="font-size: 9.5px; text-transform: uppercase; font-weight: 900; color: #c59b27; letter-spacing: 1px;">Direct Press Orders &amp; Artwork Helpline</div>
          <div style="font-size: 22px; font-weight: 900; color: #ffffff; margin-top: 2px;">
            +91 79847 52154
          </div>
          <div style="font-size: 10.5px; color: #cbd5e1; margin-top: 2px;">
            Alternate: +91 94263 71150 · Email: mahavircard2011@gmail.com
          </div>
        </div>
        <div style="text-align: right; color: #ffffff;">
          <div style="font-size: 10px; font-weight: 700; color: #c59b27;">Mahavir Card Offset Press Hub</div>
          <div style="font-size: 9px; color: #cbd5e1; margin-top: 2px;">Khadia Golwad, Opp. Jain Digamber Mandir, Ahmedabad - 380001</div>
          <div style="font-size: 13px; font-weight: 900; color: #ffffff; margin-top: 4px;">www.mahavircard.in</div>
        </div>
      </div>
    </div>
    """)

    full_html = f"""<!DOCTYPE html><html><head><meta charset="utf-8">{get_css()}</head><body>{"".join(html_pages)}</body></html>"""
    return full_html

def generate_pdf(is_showroom, out_pdf_path):
    html_content = generate_catalogue_html(is_showroom)
    temp_html_path = os.path.abspath(os.path.join(OUTPUT_DIR, "_temp_print.html"))
    with open(temp_html_path, "w", encoding="utf-8") as f:
        f.write(html_content)

    abs_out_pdf = os.path.abspath(out_pdf_path)
    cmd = [
        CHROME_PATH,
        "--headless=new",
        "--disable-gpu",
        "--no-pdf-header-footer",
        f"--print-to-pdf={abs_out_pdf}",
        temp_html_path
    ]
    res = subprocess.run(cmd, capture_output=True, text=True)
    if os.path.exists(temp_html_path):
        os.remove(temp_html_path)

    if res.returncode == 0 and os.path.exists(abs_out_pdf):
        doc = fitz.open(abs_out_pdf)
        pages_count = len(doc)
        size_bytes = os.path.getsize(abs_out_pdf)
        doc.close()
        print(f"[OK] Generated {abs_out_pdf} ({pages_count} pages, {size_bytes:,} bytes)")
    else:
        print(f"Error generating {abs_out_pdf}: {res.stderr}")

def main():
    print("Generating Vector Native PDF Catalogues with Chrome Headless Skia Engine...")
    
    # 1. Rate Catalogue (With Wholesale B2B, Retail & Ranges)
    rate_pdf = os.path.join(OUTPUT_DIR, "mahavir-card-rate-catalogue.pdf")
    generate_pdf(is_showroom=False, out_pdf_path=rate_pdf)

    # 2. Showroom Catalogue (100% NO PRICES!)
    showroom_pdf = os.path.join(OUTPUT_DIR, "mahavir-card-showroom-catalogue.pdf")
    generate_pdf(is_showroom=True, out_pdf_path=showroom_pdf)

    # 3. Default Catalogue alias
    default_pdf = os.path.join(OUTPUT_DIR, "mahavir-card-catalogue.pdf")
    generate_pdf(is_showroom=False, out_pdf_path=default_pdf)

    print("\n[ALL DONE] Generated Rate Catalogue, Showroom Catalogue & Default Catalogue.")

if __name__ == "__main__":
    main()
