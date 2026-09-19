import os
import subprocess
import base64
from PIL import Image
import fitz  # PyMuPDF

OUTPUT_DIR = r"C:\Users\Vikas\Desktop\mahavir-card\instagramcontent-gpt\01-first-booklet"
os.makedirs(OUTPUT_DIR, exist_ok=True)

CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
if not os.path.exists(CHROME_PATH):
    CHROME_PATH = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"

BASE_DIR = r"c:\Users\Vikas\Desktop\mahavir-card"

def get_b64_image(rel_path):
    full_path = os.path.join(BASE_DIR, rel_path)
    if not os.path.exists(full_path):
        print(f"Warning: image not found {full_path}")
        return ""
    with open(full_path, "rb") as f:
        data = f.read()
    ext = os.path.splitext(full_path)[1].lower().replace(".", "")
    if ext == "jpg": ext = "jpeg"
    return f"data:image/{ext};base64,{base64.b64encode(data).decode('utf-8')}"

# Pre-load base64 images
LOGO_B64 = get_b64_image(r"public\images\mahavir-card-logo.jpeg")
P1_VELVET_B64 = get_b64_image(r"instagram-content\p1_velvet_gold_foil.jpg")
P1_SPOTUV_B64 = get_b64_image(r"instagram-content\p1_spot_uv.jpg")
P1_DRIPOFF_B64 = get_b64_image(r"instagram-content\p1_dripoff.jpg")
P1_ROUND_B64 = get_b64_image(r"instagram-content\p1_round_corner.jpg")
P2_STACK_B64 = get_b64_image(r"instagram-content\p2_visiting_stack.jpg")
P2_TEXTURED_B64 = get_b64_image(r"instagram-content\p2_textured.jpg")
P2_NT_B64 = get_b64_image(r"instagram-content\p2_nt_single.jpg")
P2_THERMAL_B64 = get_b64_image(r"instagram-content\p2_thermal_matt.jpg")
P3_BROCHURE_B64 = get_b64_image(r"instagram-content\p3_brochure.jpg")
P3_LETTERHEAD_B64 = get_b64_image(r"instagram-content\p3_letterhead.jpg")
P3_ENVELOPE_B64 = get_b64_image(r"instagram-content\p3_envelope.jpg")
P3_DUO_B64 = get_b64_image(r"instagram-content\p3_duo.jpg")
P4_DIECUT_B64 = get_b64_image(r"instagram-content\p4_diecut.jpg")
P4_AVERY_B64 = get_b64_image(r"instagram-content\p4_avery.jpg")
P4_KISSCUT_B64 = get_b64_image(r"instagram-content\p4_kisscut.jpg")
P5_HERO_B64 = get_b64_image(r"instagram-content\p5_hero.jpg")
P5_NATURAL_B64 = get_b64_image(r"instagram-content\launch_post_concept_story_landscape_natural.png")
BANNER_STATIONERY_B64 = get_b64_image(r"public\images\banners\banner-stationery-suite.jpg")

CSS_GLOBAL = """
@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700;800;900&family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=Playfair+Display:ital,wght@0,600;0,700;0,800;1,600&display=swap');

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
  -webkit-font-smoothing: antialiased;
}

body {
  width: 1080px;
  height: 1350px;
  overflow: hidden;
  background-color: #0A192F;
  font-family: 'Plus Jakarta Sans', sans-serif;
  color: #0F172A;
  position: relative;
}

.booklet-page {
  width: 1080px;
  height: 1350px;
  padding: 52px 60px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  position: relative;
  background: #FAF7F2;
}

.theme-navy {
  background: #09192E;
  color: #FFFFFF;
}

.theme-navy-deep {
  background: #061120;
  color: #FFFFFF;
}

.theme-ivory {
  background: #FAF7F2;
  color: #0F172A;
}

.theme-white {
  background: #FFFFFF;
  color: #0F172A;
}

/* Folio Headers */
.folio-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1.5px solid rgba(15, 23, 42, 0.12);
  padding-bottom: 16px;
  margin-bottom: 20px;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 2px;
  text-transform: uppercase;
}

.theme-navy .folio-header,
.theme-navy-deep .folio-header {
  border-bottom: 1.5px solid rgba(255, 255, 255, 0.15);
  color: #94A3B8;
}

.folio-tag {
  color: #C59B27;
  display: flex;
  align-items: center;
  gap: 8px;
}

.folio-page-num {
  font-family: monospace;
  font-size: 14px;
  letter-spacing: 1px;
}

/* Footers */
.folio-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 1.5px solid rgba(15, 23, 42, 0.1);
  padding-top: 16px;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  color: #64748B;
}

.theme-navy .folio-footer,
.theme-navy-deep .folio-footer {
  border-top: 1.5px solid rgba(255, 255, 255, 0.12);
  color: #94A3B8;
}

.gold-accent {
  color: #C59B27;
}

/* Shadows */
.shadow-luxury {
  box-shadow: 0 24px 48px -12px rgba(9, 25, 46, 0.28), 0 4px 12px rgba(9, 25, 46, 0.08);
}

.shadow-card {
  box-shadow: 0 16px 32px -8px rgba(9, 25, 46, 0.14), 0 2px 6px rgba(9, 25, 46, 0.04);
}

.border-subtle {
  border: 1px solid rgba(15, 23, 42, 0.1);
}

.border-gold {
  border: 1.5px solid rgba(197, 155, 39, 0.4);
}
"""

def generate_pages_html():
    pages = []

    # ─────────────────────────────────────────────────────────────────────────
    # PAGE 1: COVER
    # ─────────────────────────────────────────────────────────────────────────
    p1 = f"""<!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><style>{CSS_GLOBAL}</style></head>
    <body>
      <div class="booklet-page theme-navy-deep" style="background: radial-gradient(circle at 80% 20%, #152A4A 0%, #061120 70%);">
        
        <div class="folio-header">
          <div class="folio-tag">
            <span style="display:inline-block; width:8px; height:8px; background:#C59B27; border-radius:50%;"></span>
            MAHAVIR CARD PRINT STUDIO
          </div>
          <div class="folio-page-num">VOL. 01 / 2026</div>
        </div>

        <div style="display: flex; flex-direction: column; gap: 30px;">
          
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <div style="display: flex; align-items: center; gap: 18px;">
              <img src="{LOGO_B64}" style="width: 72px; height: 72px; border-radius: 50%; border: 2.5px solid #C59B27; object-fit: cover;" />
              <div>
                <span style="font-size: 12px; font-weight: 800; letter-spacing: 3px; color: #C59B27; text-transform: uppercase;">AHMEDABAD &bull; EST. 2011</span>
                <p style="font-size: 15px; font-weight: 600; color: #E2E8F0; margin-top: 2px;">Khadia Golwad Commercial Press</p>
              </div>
            </div>
            <div style="background: rgba(197, 155, 39, 0.15); border: 1px solid rgba(197, 155, 39, 0.4); padding: 8px 18px; border-radius: 100px;">
              <span style="color: #F8FAFC; font-size: 12px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase;">FLAGSHIP BOOKLET</span>
            </div>
          </div>

          <div>
            <h1 style="font-family: 'Cinzel', serif; font-size: 64px; font-weight: 800; letter-spacing: 4px; color: #FFFFFF; line-height: 1.05; margin-bottom: 14px;">
              MAHAVIR<br/><span style="color: #C59B27;">CARD</span>
            </h1>
            <p style="font-size: 24px; font-weight: 600; color: #CBD5E1; letter-spacing: 0.5px;">
              25+ Years of Printing Experience
            </p>
          </div>

          <!-- Hero Image Trio Showcase -->
          <div style="position: relative; height: 530px; margin-top: 6px;">
            <div style="position: absolute; left: 0; top: 0; width: 620px; height: 490px; border-radius: 24px; overflow: hidden; border: 2px solid rgba(255,255,255,0.2);" class="shadow-luxury">
              <img src="{P1_VELVET_B64}" style="width: 100%; height: 100%; object-fit: cover;" />
              <div style="position: absolute; inset: 0; background: linear-gradient(180deg, rgba(0,0,0,0) 60%, rgba(6,17,32,0.85) 100%);"></div>
              <div style="position: absolute; bottom: 24px; left: 24px;">
                <span style="background: #C59B27; color: #061120; font-size: 11px; font-weight: 800; letter-spacing: 1.5px; padding: 4px 10px; border-radius: 6px; text-transform: uppercase;">PREMIUM SPECIALTY</span>
                <p style="color: #FFFFFF; font-size: 18px; font-weight: 700; margin-top: 6px;">Velvet Touch &amp; Metallic Gold Stamp</p>
              </div>
            </div>

            <div style="position: absolute; right: 0; top: 30px; width: 360px; height: 260px; border-radius: 20px; overflow: hidden; border: 2px solid rgba(197, 155, 39, 0.5);" class="shadow-luxury">
              <img src="{P1_SPOTUV_B64}" style="width: 100%; height: 100%; object-fit: cover;" />
              <div style="position: absolute; top: 12px; right: 12px; background: rgba(6,17,32,0.85); backdrop-filter: blur(8px); padding: 5px 12px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.2);">
                <span style="color: #F1F5F9; font-size: 11px; font-weight: 700;">Spot UV Raised Finish</span>
              </div>
            </div>

            <div style="position: absolute; right: 20px; bottom: 10px; width: 340px; height: 210px; border-radius: 20px; overflow: hidden; border: 2px solid rgba(255,255,255,0.2);" class="shadow-luxury">
              <img src="{P1_DRIPOFF_B64}" style="width: 100%; height: 100%; object-fit: cover;" />
              <div style="position: absolute; bottom: 12px; left: 12px; background: rgba(6,17,32,0.85); padding: 5px 12px; border-radius: 8px;">
                <span style="color: #CBD5E1; font-size: 11px; font-weight: 700;">Drip-Off Hybrid Sand Finish</span>
              </div>
            </div>
          </div>

          <div style="background: rgba(255,255,255,0.06); border: 1.5px solid rgba(197, 155, 39, 0.4); border-radius: 18px; padding: 20px 28px; display: flex; align-items: center; justify-content: space-between;">
            <div>
              <span style="color: #C59B27; font-size: 12px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase;">NOW LIVE ONLINE</span>
              <p style="color: #FFFFFF; font-size: 20px; font-weight: 700; font-family: 'Cinzel', serif; margin-top: 2px;">mahavircard.in</p>
            </div>
            <div style="text-align: right;">
              <span style="color: #94A3B8; font-size: 12px;">Instant Pricing &bull; CDR Upload</span>
              <p style="color: #E2E8F0; font-size: 13px; font-weight: 600;">Explore the Digital Catalogue &rarr;</p>
            </div>
          </div>

        </div>

        <div class="folio-footer">
          <div>COMMERCIAL OFFSET &amp; DIGITAL</div>
          <div>SWIPE TO READ BOOKLET &rarr;</div>
        </div>

      </div>
    </body>
    </html>
    """
    pages.append(("01-cover", p1))

    # ─────────────────────────────────────────────────────────────────────────
    # PAGE 2: OUR STORY
    # ─────────────────────────────────────────────────────────────────────────
    p2 = f"""<!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><style>{CSS_GLOBAL}</style></head>
    <body>
      <div class="booklet-page theme-ivory">
        
        <div class="folio-header">
          <div class="folio-tag">
            <span style="display:inline-block; width:8px; height:8px; background:#0A192F; border-radius:50%;"></span>
            HERITAGE &amp; CRAFT
          </div>
          <div class="folio-page-num">02 / 12</div>
        </div>

        <div style="display: flex; flex-direction: column; gap: 26px;">
          
          <div>
            <span style="font-size: 13px; font-weight: 800; letter-spacing: 3px; color: #C59B27; text-transform: uppercase;">ESTABLISHED IN KHADIA, AHMEDABAD</span>
            <h2 style="font-family: 'Playfair Display', serif; font-size: 46px; font-weight: 800; color: #09192E; line-height: 1.15; margin-top: 6px;">
              25+ Years.<br/>One Printing Business.
            </h2>
          </div>

          <div style="position: relative; height: 500px; border-radius: 22px; overflow: hidden;" class="shadow-luxury border-subtle">
            <img src="{P5_HERO_B64}" style="width: 100%; height: 100%; object-fit: cover;" />
            <div style="position: absolute; inset: 0; background: linear-gradient(180deg, rgba(0,0,0,0) 50%, rgba(9,25,46,0.85) 100%);"></div>
            <div style="position: absolute; bottom: 24px; left: 28px; right: 28px; display: flex; justify-content: space-between; align-items: flex-end;">
              <div>
                <p style="color: #FFFFFF; font-size: 19px; font-weight: 700;">Mahavir Card Studio &amp; Color Precision Desk</p>
                <p style="color: #CBD5E1; font-size: 13px; margin-top: 2px;">Pantone Matching, Heavy Art Paper &amp; Luxury Foil Tooling</p>
              </div>
              <span style="background: rgba(255,255,255,0.2); backdrop-filter: blur(8px); color: #FFF; font-size: 11px; font-weight: 700; padding: 6px 14px; border-radius: 100px; border: 1px solid rgba(255,255,255,0.3);">EST. 2011</span>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1.15fr 0.85fr; gap: 28px; align-items: center;">
            <p style="font-size: 16px; line-height: 1.65; color: #334155; font-weight: 500;">
              Since 2011, Mahavir Card has operated from the historic commercial printing hub of Khadia Golwad, Ahmedabad. Built on over 25 years of master pressman experience, we serve as the dependable production backbone for businesses, graphic designers, and print resellers all over India.
            </p>
            <div style="background: #FFFFFF; border-radius: 18px; padding: 22px 24px; border-left: 4px solid #09192E;" class="shadow-card border-subtle">
              <span style="font-size: 28px; font-family: 'Cinzel', serif; font-weight: 800; color: #09192E; display: block; line-height: 1;">25+ YRS</span>
              <p style="font-size: 13px; font-weight: 600; color: #64748B; margin-top: 6px; line-height: 1.4;">
                Press craftsmanship ensuring sharp registration, faithful colors, and paper integrity.
              </p>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px;">
            <div style="background: #FFFFFF; padding: 18px; border-radius: 14px;" class="border-subtle">
              <span style="font-size: 11px; font-weight: 800; color: #C59B27; letter-spacing: 1.5px; text-transform: uppercase;">LOCATION</span>
              <p style="font-size: 14px; font-weight: 700; color: #09192E; margin-top: 4px;">Khadia, Ahmedabad</p>
            </div>
            <div style="background: #FFFFFF; padding: 18px; border-radius: 14px;" class="border-subtle">
              <span style="font-size: 11px; font-weight: 800; color: #C59B27; letter-spacing: 1.5px; text-transform: uppercase;">SPECIALIZATION</span>
              <p style="font-size: 14px; font-weight: 700; color: #09192E; margin-top: 4px;">Commercial Offset &amp; Card</p>
            </div>
            <div style="background: #FFFFFF; padding: 18px; border-radius: 14px;" class="border-subtle">
              <span style="font-size: 11px; font-weight: 800; color: #C59B27; letter-spacing: 1.5px; text-transform: uppercase;">REACH</span>
              <p style="font-size: 14px; font-weight: 700; color: #09192E; margin-top: 4px;">All Over India</p>
            </div>
          </div>

        </div>

        <div class="folio-footer">
          <div>MAHAVIRCARD.IN &bull; EST. AHMEDABAD</div>
          <div>SWIPE FOR CAPABILITIES &rarr;</div>
        </div>

      </div>
    </body>
    </html>
    """
    pages.append(("02-story", p2))

    # ─────────────────────────────────────────────────────────────────────────
    # PAGE 3: WHAT WE PRINT
    # ─────────────────────────────────────────────────────────────────────────
    p3 = f"""<!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><style>{CSS_GLOBAL}</style></head>
    <body>
      <div class="booklet-page theme-navy" style="background: #08172B;">
        
        <div class="folio-header">
          <div class="folio-tag">
            <span style="display:inline-block; width:8px; height:8px; background:#C59B27; border-radius:50%;"></span>
            CORE CAPABILITIES
          </div>
          <div class="folio-page-num">03 / 12</div>
        </div>

        <div style="display: flex; flex-direction: column; gap: 24px;">
          
          <div>
            <span style="font-size: 12px; font-weight: 800; letter-spacing: 3px; color: #C59B27; text-transform: uppercase;">FULL COMMERCIAL SPECTRUM</span>
            <h2 style="font-family: 'Playfair Display', serif; font-size: 42px; font-weight: 700; color: #FFFFFF; line-height: 1.15; margin-top: 6px;">
              Printing for Businesses.<br/>Printing for Everyday Work.
            </h2>
          </div>

          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-top: 6px;">
            
            <div style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.12); border-radius: 18px; padding: 20px; display: flex; gap: 18px; align-items: center;">
              <img src="{P2_STACK_B64}" style="width: 88px; height: 88px; border-radius: 12px; object-fit: cover;" />
              <div>
                <span style="color: #C59B27; font-size: 11px; font-weight: 800; letter-spacing: 1px;">01. CARDS</span>
                <h3 style="color: #FFFFFF; font-size: 18px; font-weight: 700; margin: 3px 0;">Visiting Cards</h3>
                <p style="color: #94A3B8; font-size: 12px;">Thermal Matt, NT, Metallic, Texture</p>
              </div>
            </div>

            <div style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.12); border-radius: 18px; padding: 20px; display: flex; gap: 18px; align-items: center;">
              <img src="{P1_SPOTUV_B64}" style="width: 88px; height: 88px; border-radius: 12px; object-fit: cover;" />
              <div>
                <span style="color: #C59B27; font-size: 11px; font-weight: 800; letter-spacing: 1px;">02. LUXURY</span>
                <h3 style="color: #FFFFFF; font-size: 18px; font-weight: 700; margin: 3px 0;">Premium Finishes</h3>
                <p style="color: #94A3B8; font-size: 12px;">Spot UV, Drip-Off, Gold Foil, 350 GSM</p>
              </div>
            </div>

            <div style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.12); border-radius: 18px; padding: 20px; display: flex; gap: 18px; align-items: center;">
              <img src="{P3_LETTERHEAD_B64}" style="width: 88px; height: 88px; border-radius: 12px; object-fit: cover;" />
              <div>
                <span style="color: #C59B27; font-size: 11px; font-weight: 800; letter-spacing: 1px;">03. IDENTITY</span>
                <h3 style="color: #FFFFFF; font-size: 18px; font-weight: 700; margin: 3px 0;">Office Stationery</h3>
                <p style="color: #94A3B8; font-size: 12px;">Alabaster Letterheads &amp; Envelopes</p>
              </div>
            </div>

            <div style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.12); border-radius: 18px; padding: 20px; display: flex; gap: 18px; align-items: center;">
              <img src="{P3_BROCHURE_B64}" style="width: 88px; height: 88px; border-radius: 12px; object-fit: cover;" />
              <div>
                <span style="color: #C59B27; font-size: 11px; font-weight: 800; letter-spacing: 1px;">04. MARKETING</span>
                <h3 style="color: #FFFFFF; font-size: 18px; font-weight: 700; margin: 3px 0;">Brochures &amp; Flyers</h3>
                <p style="color: #94A3B8; font-size: 12px;">Tri-fold, Bi-fold, Art Paper Leaflets</p>
              </div>
            </div>

            <div style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.12); border-radius: 18px; padding: 20px; display: flex; gap: 18px; align-items: center;">
              <img src="{P4_DIECUT_B64}" style="width: 88px; height: 88px; border-radius: 12px; object-fit: cover;" />
              <div>
                <span style="color: #C59B27; font-size: 11px; font-weight: 800; letter-spacing: 1px;">05. PACKAGING</span>
                <h3 style="color: #FFFFFF; font-size: 18px; font-weight: 700; margin: 3px 0;">Custom Stickers</h3>
                <p style="color: #94A3B8; font-size: 12px;">Avery Vinyl, Die-Cut &amp; Kiss-Cut</p>
              </div>
            </div>

            <div style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.12); border-radius: 18px; padding: 20px; display: flex; gap: 18px; align-items: center;">
              <img src="{P3_DUO_B64}" style="width: 88px; height: 88px; border-radius: 12px; object-fit: cover;" />
              <div>
                <span style="color: #C59B27; font-size: 11px; font-weight: 800; letter-spacing: 1px;">06. BESPOKE</span>
                <h3 style="color: #FFFFFF; font-size: 18px; font-weight: 700; margin: 3px 0;">Commercial Press</h3>
                <p style="color: #94A3B8; font-size: 12px;">Bill Books, Folders, Heavy Volume</p>
              </div>
            </div>

          </div>

          <div style="background: rgba(197, 155, 39, 0.12); border: 1px solid rgba(197, 155, 39, 0.3); border-radius: 14px; padding: 18px 24px; text-align: center; margin-top: 8px;">
            <p style="color: #E2E8F0; font-size: 14px; font-weight: 600;">
              All categories available with automated pricing calculations at <strong style="color: #C59B27;">mahavircard.in</strong>
            </p>
          </div>

        </div>

        <div class="folio-footer">
          <div>CATALOGUE OVERVIEW</div>
          <div>SWIPE FOR VISITING CARDS &rarr;</div>
        </div>

      </div>
    </body>
    </html>
    """
    pages.append(("03-capabilities", p3))

    # ─────────────────────────────────────────────────────────────────────────
    # PAGE 4: VISITING CARDS
    # ─────────────────────────────────────────────────────────────────────────
    p4 = f"""<!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><style>{CSS_GLOBAL}</style></head>
    <body>
      <div class="booklet-page theme-ivory">
        
        <div class="folio-header">
          <div class="folio-tag">
            <span style="display:inline-block; width:8px; height:8px; background:#0A192F; border-radius:50%;"></span>
            COLLECTION 01 / CARDS
          </div>
          <div class="folio-page-num">04 / 12</div>
        </div>

        <div style="display: flex; flex-direction: column; gap: 24px;">
          
          <div>
            <span style="font-size: 12px; font-weight: 800; letter-spacing: 3px; color: #C59B27; text-transform: uppercase;">PRECISION OFFSET PRODUCTION</span>
            <h2 style="font-family: 'Playfair Display', serif; font-size: 44px; font-weight: 800; color: #09192E; line-height: 1.15; margin-top: 6px;">
              Your First Impression,<br/>Printed.
            </h2>
            <p style="font-size: 16px; color: #475569; margin-top: 8px; font-weight: 500;">
              Heavyweight board, tactile laminations, and razor-sharp die trims for executive identities.
            </p>
          </div>

          <div style="display: grid; grid-template-columns: 1.2fr 0.8fr; gap: 20px; height: 480px;">
            <div style="border-radius: 20px; overflow: hidden; position: relative;" class="shadow-luxury border-subtle">
              <img src="{P2_STACK_B64}" style="width: 100%; height: 100%; object-fit: cover;" />
              <div style="position: absolute; bottom: 16px; left: 16px; background: rgba(9,25,46,0.85); backdrop-filter: blur(8px); padding: 6px 14px; border-radius: 8px;">
                <span style="color: #FFFFFF; font-size: 12px; font-weight: 700;">Precision Trimmed Stacks</span>
              </div>
            </div>

            <div style="display: flex; flex-direction: column; gap: 20px;">
              <div style="flex: 1; border-radius: 18px; overflow: hidden; position: relative;" class="shadow-card border-subtle">
                <img src="{P2_TEXTURED_B64}" style="width: 100%; height: 100%; object-fit: cover;" />
                <div style="position: absolute; top: 12px; right: 12px; background: rgba(255,255,255,0.9); padding: 4px 10px; border-radius: 6px;">
                  <span style="color: #09192E; font-size: 11px; font-weight: 800;">Linen Texture</span>
                </div>
              </div>
              <div style="flex: 1; border-radius: 18px; overflow: hidden; position: relative;" class="shadow-card border-subtle">
                <img src="{P1_ROUND_B64}" style="width: 100%; height: 100%; object-fit: cover;" />
                <div style="position: absolute; bottom: 12px; right: 12px; background: rgba(9,25,46,0.85); padding: 4px 10px; border-radius: 6px;">
                  <span style="color: #C59B27; font-size: 11px; font-weight: 700;">Round Corner Die</span>
                </div>
              </div>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px;">
            <div style="background: #FFFFFF; border-radius: 14px; padding: 16px; border: 1px solid rgba(15,23,42,0.08);" class="shadow-card">
              <p style="font-size: 14px; font-weight: 800; color: #09192E;">Thermal Matt</p>
              <p style="font-size: 11px; color: #64748B; margin-top: 4px;">Velvety, glare-free executive finish.</p>
            </div>
            <div style="background: #FFFFFF; border-radius: 14px; padding: 16px; border: 1px solid rgba(15,23,42,0.08);" class="shadow-card">
              <p style="font-size: 14px; font-weight: 800; color: #09192E;">Non-Tearable</p>
              <p style="font-size: 11px; color: #64748B; margin-top: 4px;">Waterproof &amp; ultra-durable synthetic.</p>
            </div>
            <div style="background: #FFFFFF; border-radius: 14px; padding: 16px; border: 1px solid rgba(15,23,42,0.08);" class="shadow-card">
              <p style="font-size: 14px; font-weight: 800; color: #09192E;">Textured Paper</p>
              <p style="font-size: 11px; color: #64748B; margin-top: 4px;">Subtle laid &amp; metallic grain stock.</p>
            </div>
            <div style="background: #FFFFFF; border-radius: 14px; padding: 16px; border: 1px solid rgba(15,23,42,0.08);" class="shadow-card">
              <p style="font-size: 14px; font-weight: 800; color: #09192E;">Round Corner</p>
              <p style="font-size: 11px; color: #64748B; margin-top: 4px;">3mm &amp; 6mm precision radius punch.</p>
            </div>
          </div>

        </div>

        <div class="folio-footer">
          <div>STANDARDS: 300 GSM TO 350 GSM</div>
          <div>SWIPE FOR PREMIUM FINISHES &rarr;</div>
        </div>

      </div>
    </body>
    </html>
    """
    pages.append(("04-visiting-cards", p4))

    # ─────────────────────────────────────────────────────────────────────────
    # PAGE 5: PREMIUM + ART CARDS
    # ─────────────────────────────────────────────────────────────────────────
    p5 = f"""<!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><style>{CSS_GLOBAL}</style></head>
    <body>
      <div class="booklet-page theme-navy-deep" style="background: #061120;">
        
        <div class="folio-header">
          <div class="folio-tag">
            <span style="display:inline-block; width:8px; height:8px; background:#C59B27; border-radius:50%;"></span>
            SPECIALTY FINISHES
          </div>
          <div class="folio-page-num">05 / 12</div>
        </div>

        <div style="display: flex; flex-direction: column; gap: 24px;">
          
          <div>
            <span style="font-size: 12px; font-weight: 800; letter-spacing: 3px; color: #C59B27; text-transform: uppercase;">SPECIAL EFFECTS &amp; EMBELLISHMENTS</span>
            <h2 style="font-family: 'Playfair Display', serif; font-size: 44px; font-weight: 800; color: #FFFFFF; line-height: 1.15; margin-top: 6px;">
              For When the Card<br/><span style="color: #C59B27;">Needs to Stand Out.</span>
            </h2>
            <p style="font-size: 15px; color: #94A3B8; margin-top: 6px;">
              Elevate brand perception with dimensional spot coatings, micro-textured varnish, and hot gold foil stamping.
            </p>
          </div>

          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; height: 500px;">
            
            <div style="background: rgba(255,255,255,0.04); border: 1.5px solid rgba(255,255,255,0.12); border-radius: 20px; overflow: hidden; display: flex; flex-direction: column;">
              <div style="height: 310px; overflow: hidden; position: relative;">
                <img src="{P1_SPOTUV_B64}" style="width: 100%; height: 100%; object-fit: cover;" />
                <span style="position: absolute; top: 12px; left: 12px; background: #061120; color: #C59B27; font-size: 10px; font-weight: 800; padding: 4px 8px; border-radius: 4px;">RAISED GLOSS</span>
              </div>
              <div style="padding: 20px; flex: 1; display: flex; flex-direction: column; justify-content: space-between;">
                <div>
                  <h3 style="color: #FFFFFF; font-size: 18px; font-weight: 700;">Spot UV Gloss</h3>
                  <p style="color: #94A3B8; font-size: 12px; margin-top: 6px; line-height: 1.4;">High-gloss varnish over matte background for tactile contrast.</p>
                </div>
                <span style="font-size: 11px; font-weight: 700; color: #C59B27; text-transform: uppercase;">Single &amp; Both Sides</span>
              </div>
            </div>

            <div style="background: rgba(255,255,255,0.04); border: 1.5px solid rgba(197, 155, 39, 0.4); border-radius: 20px; overflow: hidden; display: flex; flex-direction: column;">
              <div style="height: 310px; overflow: hidden; position: relative;">
                <img src="{P1_VELVET_B64}" style="width: 100%; height: 100%; object-fit: cover;" />
                <span style="position: absolute; top: 12px; left: 12px; background: #C59B27; color: #061120; font-size: 10px; font-weight: 800; padding: 4px 8px; border-radius: 4px;">LUXURY STAMP</span>
              </div>
              <div style="padding: 20px; flex: 1; display: flex; flex-direction: column; justify-content: space-between;">
                <div>
                  <h3 style="color: #FFFFFF; font-size: 18px; font-weight: 700;">Velvet + Gold Foil</h3>
                  <p style="color: #94A3B8; font-size: 12px; margin-top: 6px; line-height: 1.4;">Silky soft-touch base laminated with metallic stamped gold foil.</p>
                </div>
                <span style="font-size: 11px; font-weight: 700; color: #C59B27; text-transform: uppercase;">350 GSM Art Board</span>
              </div>
            </div>

            <div style="background: rgba(255,255,255,0.04); border: 1.5px solid rgba(255,255,255,0.12); border-radius: 20px; overflow: hidden; display: flex; flex-direction: column;">
              <div style="height: 310px; overflow: hidden; position: relative;">
                <img src="{P1_DRIPOFF_B64}" style="width: 100%; height: 100%; object-fit: cover;" />
                <span style="position: absolute; top: 12px; left: 12px; background: #061120; color: #C59B27; font-size: 10px; font-weight: 800; padding: 4px 8px; border-radius: 4px;">HYBRID TEXTURE</span>
              </div>
              <div style="padding: 20px; flex: 1; display: flex; flex-direction: column; justify-content: space-between;">
                <div>
                  <h3 style="color: #FFFFFF; font-size: 18px; font-weight: 700;">Drip-Off Hybrid</h3>
                  <p style="color: #94A3B8; font-size: 12px; margin-top: 6px; line-height: 1.4;">Micro-sand texture with glistening clear varnish highlights.</p>
                </div>
                <span style="font-size: 11px; font-weight: 700; color: #C59B27; text-transform: uppercase;">Modern Offset Effect</span>
              </div>
            </div>

          </div>

          <div style="background: rgba(255,255,255,0.06); border-radius: 14px; padding: 18px 24px; display: flex; align-items: center; justify-content: space-between; border: 1px solid rgba(255,255,255,0.1);">
            <div style="display: flex; align-items: center; gap: 12px;">
              <span style="color: #C59B27; font-size: 20px;">&#9733;</span>
              <p style="color: #E2E8F0; font-size: 13px; font-weight: 600;">Custom die-punched shapes, double-thick duplexing &amp; edge gilding available upon quote.</p>
            </div>
            <span style="color: #C59B27; font-size: 12px; font-weight: 700; text-transform: uppercase;">MAHAVIRCARD.IN</span>
          </div>

        </div>

        <div class="folio-footer">
          <div>SPECIALTY FINISHES COLLECTION</div>
          <div>SWIPE FOR STATIONERY &rarr;</div>
        </div>

      </div>
    </body>
    </html>
    """
    pages.append(("05-premium-art", p5))

    # ─────────────────────────────────────────────────────────────────────────
    # PAGE 6: BUSINESS STATIONERY
    # ─────────────────────────────────────────────────────────────────────────
    p6 = f"""<!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><style>{CSS_GLOBAL}</style></head>
    <body>
      <div class="booklet-page theme-ivory">
        
        <div class="folio-header">
          <div class="folio-tag">
            <span style="display:inline-block; width:8px; height:8px; background:#0A192F; border-radius:50%;"></span>
            CORPORATE SUITE
          </div>
          <div class="folio-page-num">06 / 12</div>
        </div>

        <div style="display: flex; flex-direction: column; gap: 24px;">
          
          <div>
            <span style="font-size: 12px; font-weight: 800; letter-spacing: 3px; color: #C59B27; text-transform: uppercase;">CONSISTENT CORPORATE IDENTITY</span>
            <h2 style="font-family: 'Playfair Display', serif; font-size: 44px; font-weight: 800; color: #09192E; line-height: 1.15; margin-top: 6px;">
              The Printing Your Business<br/>Uses Every Day.
            </h2>
            <p style="font-size: 15px; color: #475569; margin-top: 6px; font-weight: 500;">
              Laser-compatible letterhead stocks, matching window/non-window envelopes, and branded business collateral.
            </p>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; height: 480px;">
            <div style="border-radius: 20px; overflow: hidden; position: relative;" class="shadow-luxury border-subtle">
              <img src="{P3_LETTERHEAD_B64}" style="width: 100%; height: 100%; object-fit: cover;" />
              <div style="position: absolute; bottom: 16px; left: 16px; background: rgba(9,25,46,0.85); padding: 6px 14px; border-radius: 8px;">
                <span style="color: #FFFFFF; font-size: 12px; font-weight: 700;">Alabaster &amp; SS Letterheads</span>
              </div>
            </div>
            <div style="border-radius: 20px; overflow: hidden; position: relative;" class="shadow-luxury border-subtle">
              <img src="{P3_ENVELOPE_B64}" style="width: 100%; height: 100%; object-fit: cover;" />
              <div style="position: absolute; bottom: 16px; left: 16px; background: rgba(9,25,46,0.85); padding: 6px 14px; border-radius: 8px;">
                <span style="color: #FFFFFF; font-size: 12px; font-weight: 700;">Executive Envelopes</span>
              </div>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px;">
            <div style="background: #FFFFFF; padding: 20px; border-radius: 16px;" class="shadow-card border-subtle">
              <span style="color: #C59B27; font-size: 11px; font-weight: 800; letter-spacing: 1px;">PAPER STOCKS</span>
              <p style="font-size: 15px; font-weight: 800; color: #09192E; margin-top: 4px;">80 &amp; 100 GSM</p>
              <p style="font-size: 12px; color: #64748B; margin-top: 4px;">Sunshine Super, Alabaster &amp; Royal Executive paper.</p>
            </div>
            <div style="background: #FFFFFF; padding: 20px; border-radius: 16px;" class="shadow-card border-subtle">
              <span style="color: #C59B27; font-size: 11px; font-weight: 800; letter-spacing: 1px;">ENVELOPE SIZES</span>
              <p style="font-size: 15px; font-weight: 800; color: #09192E; margin-top: 4px;">9&times;4, 10&times;4.5, A4</p>
              <p style="font-size: 12px; color: #64748B; margin-top: 4px;">Custom flap gluing with Peel &amp; Seal options.</p>
            </div>
            <div style="background: #FFFFFF; padding: 20px; border-radius: 16px;" class="shadow-card border-subtle">
              <span style="color: #C59B27; font-size: 11px; font-weight: 800; letter-spacing: 1px;">PRINTER COMPATIBLE</span>
              <p style="font-size: 15px; font-weight: 800; color: #09192E; margin-top: 4px;">Laser &amp; Inkjet Safe</p>
              <p style="font-size: 12px; color: #64748B; margin-top: 4px;">Engineered to run smooth without curling or smudge.</p>
            </div>
          </div>

        </div>

        <div class="folio-footer">
          <div>CORPORATE IDENTITY PRINTING</div>
          <div>SWIPE FOR BROCHURES &rarr;</div>
        </div>

      </div>
    </body>
    </html>
    """
    pages.append(("06-stationery", p6))

    # ─────────────────────────────────────────────────────────────────────────
    # PAGE 7: BROCHURES + LEAFLETS
    # ─────────────────────────────────────────────────────────────────────────
    p7 = f"""<!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><style>{CSS_GLOBAL}</style></head>
    <body>
      <div class="booklet-page theme-navy" style="background: #09192E;">
        
        <div class="folio-header">
          <div class="folio-tag">
            <span style="display:inline-block; width:8px; height:8px; background:#C59B27; border-radius:50%;"></span>
            MARKETING PRINTS
          </div>
          <div class="folio-page-num">07 / 12</div>
        </div>

        <div style="display: flex; flex-direction: column; gap: 24px;">
          
          <div>
            <span style="font-size: 12px; font-weight: 800; letter-spacing: 3px; color: #C59B27; text-transform: uppercase;">EDITORIAL &amp; COMMERCIAL FOLDING</span>
            <h2 style="font-family: 'Playfair Display', serif; font-size: 44px; font-weight: 800; color: #FFFFFF; line-height: 1.15; margin-top: 6px;">
              More Space to<br/><span style="color: #C59B27;">Tell Your Story.</span>
            </h2>
            <p style="font-size: 15px; color: #94A3B8; margin-top: 6px;">
              From high-impact marketing flyers to comprehensive multi-fold corporate brochures.
            </p>
          </div>

          <div style="position: relative; height: 500px; border-radius: 22px; overflow: hidden; border: 1.5px solid rgba(255,255,255,0.15);" class="shadow-luxury">
            <img src="{P3_BROCHURE_B64}" style="width: 100%; height: 100%; object-fit: cover;" />
            <div style="position: absolute; inset: 0; background: linear-gradient(180deg, rgba(0,0,0,0) 55%, rgba(6,17,32,0.88) 100%);"></div>
            <div style="position: absolute; bottom: 24px; left: 28px; right: 28px; display: flex; justify-content: space-between; align-items: flex-end;">
              <div>
                <p style="color: #FFFFFF; font-size: 20px; font-weight: 700;">Precision Folded Tri-Fold &amp; Bi-Fold</p>
                <p style="color: #CBD5E1; font-size: 13px; margin-top: 2px;">Machine creased to prevent fiber cracking on solid ink folds.</p>
              </div>
              <span style="background: #C59B27; color: #061120; font-size: 11px; font-weight: 800; padding: 6px 14px; border-radius: 8px;">130 &bull; 170 GSM</span>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px;">
            <div style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); padding: 18px; border-radius: 14px;">
              <span style="color: #C59B27; font-size: 11px; font-weight: 800; letter-spacing: 1px;">STANDARD SIZES</span>
              <p style="color: #FFF; font-size: 15px; font-weight: 700; margin-top: 4px;">A4, A5, A8 Pocket</p>
              <p style="color: #94A3B8; font-size: 12px; margin-top: 2px;">Tri-fold, accordion &amp; gate folds.</p>
            </div>
            <div style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); padding: 18px; border-radius: 14px;">
              <span style="color: #C59B27; font-size: 11px; font-weight: 800; letter-spacing: 1px;">COATING OPTIONS</span>
              <p style="color: #FFF; font-size: 15px; font-weight: 700; margin-top: 4px;">Gloss &amp; Matt Lamination</p>
              <p style="color: #94A3B8; font-size: 12px; margin-top: 2px;">Protection against scuff &amp; handling.</p>
            </div>
            <div style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); padding: 18px; border-radius: 14px;">
              <span style="color: #C59B27; font-size: 11px; font-weight: 800; letter-spacing: 1px;">PRESS QUANTITIES</span>
              <p style="color: #FFF; font-size: 15px; font-weight: 700; margin-top: 4px;">500 to 50,000+ Runs</p>
              <p style="color: #94A3B8; font-size: 12px; margin-top: 2px;">High speed offset accuracy &amp; sharp detail.</p>
            </div>
          </div>

        </div>

        <div class="folio-footer">
          <div>MARKETING COLLATERAL PRODUCTION</div>
          <div>SWIPE FOR STICKERS &rarr;</div>
        </div>

      </div>
    </body>
    </html>
    """
    pages.append(("07-brochure-leaflet", p7))

    # ─────────────────────────────────────────────────────────────────────────
    # PAGE 8: STICKERS
    # ─────────────────────────────────────────────────────────────────────────
    p8 = f"""<!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><style>{CSS_GLOBAL}</style></head>
    <body>
      <div class="booklet-page theme-ivory">
        
        <div class="folio-header">
          <div class="folio-tag">
            <span style="display:inline-block; width:8px; height:8px; background:#0A192F; border-radius:50%;"></span>
            LABEL &amp; PACKAGING
          </div>
          <div class="folio-page-num">08 / 12</div>
        </div>

        <div style="display: flex; flex-direction: column; gap: 24px;">
          
          <div>
            <span style="font-size: 12px; font-weight: 800; letter-spacing: 3px; color: #C59B27; text-transform: uppercase;">SELF-ADHESIVE VINYL &amp; PAPER</span>
            <h2 style="font-family: 'Playfair Display', serif; font-size: 44px; font-weight: 800; color: #09192E; line-height: 1.15; margin-top: 6px;">
              Small Format.<br/>Big Visibility.
            </h2>
            <p style="font-size: 15px; color: #475569; margin-top: 6px; font-weight: 500;">
              Branding stickers, bottle labels, product packaging seals, and die-cut specialty decals.
            </p>
          </div>

          <div style="display: grid; grid-template-columns: 1.1fr 0.9fr; gap: 20px; height: 480px;">
            <div style="border-radius: 20px; overflow: hidden; position: relative;" class="shadow-luxury border-subtle">
              <img src="{P4_DIECUT_B64}" style="width: 100%; height: 100%; object-fit: cover;" />
              <div style="position: absolute; bottom: 16px; left: 16px; background: rgba(9,25,46,0.85); padding: 6px 14px; border-radius: 8px;">
                <span style="color: #FFFFFF; font-size: 12px; font-weight: 700;">Custom Shape Die-Cutting</span>
              </div>
            </div>

            <div style="display: flex; flex-direction: column; gap: 20px;">
              <div style="flex: 1; border-radius: 18px; overflow: hidden; position: relative;" class="shadow-card border-subtle">
                <img src="{P4_AVERY_B64}" style="width: 100%; height: 100%; object-fit: cover;" />
                <div style="position: absolute; top: 12px; right: 12px; background: rgba(255,255,255,0.95); padding: 4px 10px; border-radius: 6px;">
                  <span style="color: #09192E; font-size: 11px; font-weight: 800;">Avery Self-Adhesive</span>
                </div>
              </div>
              <div style="flex: 1; border-radius: 18px; overflow: hidden; position: relative;" class="shadow-card border-subtle">
                <img src="{P4_KISSCUT_B64}" style="width: 100%; height: 100%; object-fit: cover;" />
                <div style="position: absolute; bottom: 12px; right: 12px; background: rgba(9,25,46,0.85); padding: 4px 10px; border-radius: 6px;">
                  <span style="color: #C59B27; font-size: 11px; font-weight: 700;">Sheet Kiss-Cut Format</span>
                </div>
              </div>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px;">
            <div style="background: #FFFFFF; padding: 18px; border-radius: 14px;" class="shadow-card border-subtle">
              <span style="color: #C59B27; font-size: 11px; font-weight: 800; letter-spacing: 1px;">SUBSTRATE</span>
              <p style="color: #09192E; font-size: 15px; font-weight: 800; margin-top: 4px;">Avery Vinyl &amp; Chromo</p>
              <p style="color: #64748B; font-size: 12px; margin-top: 2px;">Water-resistant &amp; oil-proof options.</p>
            </div>
            <div style="background: #FFFFFF; padding: 18px; border-radius: 14px;" class="shadow-card border-subtle">
              <span style="color: #C59B27; font-size: 11px; font-weight: 800; letter-spacing: 1px;">CUSTOM SHAPES</span>
              <p style="color: #09192E; font-size: 15px; font-weight: 800; margin-top: 4px;">Any Outline / Shape</p>
              <p style="color: #64748B; font-size: 12px; margin-top: 2px;">Circles, squares, logos &amp; contour cuts.</p>
            </div>
            <div style="background: #FFFFFF; padding: 18px; border-radius: 14px;" class="shadow-card border-subtle">
              <span style="color: #C59B27; font-size: 11px; font-weight: 800; letter-spacing: 1px;">FINISHES</span>
              <p style="color: #09192E; font-size: 15px; font-weight: 800; margin-top: 4px;">Gloss &amp; Matt Film</p>
              <p style="color: #64748B; font-size: 12px; margin-top: 2px;">Rich color saturation &amp; crisp edges.</p>
            </div>
          </div>

        </div>

        <div class="folio-footer">
          <div>LABELS &amp; PACKAGING ESSENTIALS</div>
          <div>SWIPE FOR CUSTOM PRINTING &rarr;</div>
        </div>

      </div>
    </body>
    </html>
    """
    pages.append(("08-stickers", p8))

    # ─────────────────────────────────────────────────────────────────────────
    # PAGE 9: CUSTOM PRINTING (NO LARGE MACHINE PHOTOS)
    # ─────────────────────────────────────────────────────────────────────────
    p9 = f"""<!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><style>{CSS_GLOBAL}</style></head>
    <body>
      <div class="booklet-page theme-navy-deep" style="background: #061120;">
        
        <div class="folio-header">
          <div class="folio-tag">
            <span style="display:inline-block; width:8px; height:8px; background:#C59B27; border-radius:50%;"></span>
            BESPOKE &amp; COMMERCIAL
          </div>
          <div class="folio-page-num">09 / 12</div>
        </div>

        <div style="display: flex; flex-direction: column; gap: 26px;">
          
          <div>
            <span style="font-size: 12px; font-weight: 800; letter-spacing: 3px; color: #C59B27; text-transform: uppercase;">BEYOND THE STANDARD CATALOGUE</span>
            <h2 style="font-family: 'Playfair Display', serif; font-size: 46px; font-weight: 800; color: #FFFFFF; line-height: 1.15; margin-top: 6px;">
              Don't See What<br/><span style="color: #C59B27;">You Need?</span>
            </h2>
            <p style="font-size: 16px; color: #CBD5E1; margin-top: 10px; line-height: 1.6; max-width: 820px;">
              Our website features our most popular products, but our Khadia press studio produces bespoke commercial jobs every day. Have a unique size, paper stock, or volume requirement? We quote and produce to your exact specifications.
            </p>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; height: 380px;">
            <div style="border-radius: 20px; overflow: hidden; position: relative; border: 1.5px solid rgba(255,255,255,0.15);" class="shadow-luxury">
              <img src="{P3_DUO_B64}" style="width: 100%; height: 100%; object-fit: cover;" />
              <div style="position: absolute; bottom: 16px; left: 16px; background: rgba(6,17,32,0.85); padding: 6px 14px; border-radius: 8px;">
                <span style="color: #FFFFFF; font-size: 12px; font-weight: 700;">Custom Multi-Part Sets &amp; Forms</span>
              </div>
            </div>
            <div style="border-radius: 20px; overflow: hidden; position: relative; border: 1.5px solid rgba(255,255,255,0.15);" class="shadow-luxury">
              <img src="{P5_NATURAL_B64}" style="width: 100%; height: 100%; object-fit: cover;" />
              <div style="position: absolute; bottom: 16px; left: 16px; background: rgba(6,17,32,0.85); padding: 6px 14px; border-radius: 8px;">
                <span style="color: #C59B27; font-size: 12px; font-weight: 700;">Branded Corporate Collections</span>
              </div>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px;">
            <div style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); padding: 18px; border-radius: 14px;">
              <p style="color: #C59B27; font-size: 12px; font-weight: 800;">01</p>
              <p style="color: #FFFFFF; font-size: 15px; font-weight: 700; margin-top: 4px;">Bill Books &amp; NCR</p>
              <p style="color: #94A3B8; font-size: 11px; margin-top: 4px;">Numbered carbonless duplicate &amp; triplicate books.</p>
            </div>
            <div style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); padding: 18px; border-radius: 14px;">
              <p style="color: #C59B27; font-size: 12px; font-weight: 800;">02</p>
              <p style="color: #FFFFFF; font-size: 15px; font-weight: 700; margin-top: 4px;">Medical Files</p>
              <p style="color: #94A3B8; font-size: 11px; margin-top: 4px;">Laminated hospital folders with clip pockets.</p>
            </div>
            <div style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); padding: 18px; border-radius: 14px;">
              <p style="color: #C59B27; font-size: 12px; font-weight: 800;">03</p>
              <p style="color: #FFFFFF; font-size: 15px; font-weight: 700; margin-top: 4px;">Packaging Sleeves</p>
              <p style="color: #94A3B8; font-size: 11px; margin-top: 4px;">Custom paper boxes, tags &amp; carton sleeves.</p>
            </div>
            <div style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); padding: 18px; border-radius: 14px;">
              <p style="color: #C59B27; font-size: 12px; font-weight: 800;">04</p>
              <p style="color: #FFFFFF; font-size: 15px; font-weight: 700; margin-top: 4px;">Special Sizes</p>
              <p style="color: #94A3B8; font-size: 11px; margin-top: 4px;">Bespoke dimensions &amp; specialty imported papers.</p>
            </div>
          </div>

          <div style="background: rgba(197, 155, 39, 0.15); border: 1.5px solid rgba(197, 155, 39, 0.4); border-radius: 14px; padding: 16px 24px; display: flex; align-items: center; justify-content: space-between;">
            <p style="color: #FFFFFF; font-size: 14px; font-weight: 600;">Share your artwork or technical specs with our estimating team for a direct quote.</p>
            <span style="color: #C59B27; font-size: 13px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase;">REQUEST QUOTE &rarr;</span>
          </div>

        </div>

        <div class="folio-footer">
          <div>CUSTOM COMMERCIAL ESTIMATION</div>
          <div>SWIPE FOR B2B PARTNERS &rarr;</div>
        </div>

      </div>
    </body>
    </html>
    """
    pages.append(("09-custom-printing", p9))

    # ─────────────────────────────────────────────────────────────────────────
    # PAGE 10: FOR PRINTERS & RESELLERS (EDITORIAL & CLEAN PRODUCT SAMPLES)
    # ─────────────────────────────────────────────────────────────────────────
    p10 = f"""<!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><style>{CSS_GLOBAL}</style></head>
    <body>
      <div class="booklet-page theme-ivory">
        
        <div class="folio-header">
          <div class="folio-tag">
            <span style="display:inline-block; width:8px; height:8px; background:#0A192F; border-radius:50%;"></span>
            TRADE &amp; B2B PARTNER
          </div>
          <div class="folio-page-num">10 / 12</div>
        </div>

        <div style="display: flex; flex-direction: column; gap: 24px;">
          
          <div>
            <span style="font-size: 12px; font-weight: 800; letter-spacing: 3px; color: #C59B27; text-transform: uppercase;">FOR DESIGNERS, AGENCIES &amp; REGIONAL PRINTERS</span>
            <h2 style="font-family: 'Playfair Display', serif; font-size: 44px; font-weight: 800; color: #09192E; line-height: 1.15; margin-top: 6px;">
              You Bring the Customer.<br/>We Handle the Production.
            </h2>
            <p style="font-size: 15px; color: #475569; margin-top: 6px; font-weight: 500;">
              Need a dependable production press partner with transparent wholesale pricing and direct pre-press inspection?
            </p>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 22px; height: 500px;">
            <div style="border-radius: 20px; overflow: hidden; position: relative;" class="shadow-luxury border-subtle">
              <img src="{P5_HERO_B64}" style="width: 100%; height: 100%; object-fit: cover;" />
              <div style="position: absolute; inset: 0; background: linear-gradient(180deg, rgba(0,0,0,0) 60%, rgba(9,25,46,0.9) 100%);"></div>
              <div style="position: absolute; bottom: 20px; left: 20px;">
                <p style="color: #FFFFFF; font-size: 17px; font-weight: 700;">Consistent Production &amp; Strict Quality</p>
                <p style="color: #CBD5E1; font-size: 12px; margin-top: 2px;">Daily production schedules with color verification.</p>
              </div>
            </div>

            <div style="display: flex; flex-direction: column; justify-content: space-between; gap: 14px;">
              
              <div style="background: #FFFFFF; padding: 18px 20px; border-radius: 14px; border-left: 4px solid #C59B27;" class="shadow-card border-subtle">
                <h3 style="color: #09192E; font-size: 16px; font-weight: 800;">Wholesale Trade Rates</h3>
                <p style="color: #64748B; font-size: 12px; margin-top: 4px;">Exclusive B2B tier pricing unlocked upon registering your verified business account.</p>
              </div>

              <div style="background: #FFFFFF; padding: 18px 20px; border-radius: 14px; border-left: 4px solid #09192E;" class="shadow-card border-subtle">
                <h3 style="color: #09192E; font-size: 16px; font-weight: 800;">Direct CorelDRAW (.CDR) Upload</h3>
                <p style="color: #64748B; font-size: 12px; margin-top: 4px;">Upload native design files directly on the website with pre-press guideline inspection.</p>
              </div>

              <div style="background: #FFFFFF; padding: 18px 20px; border-radius: 14px; border-left: 4px solid #09192E;" class="shadow-card border-subtle">
                <h3 style="color: #09192E; font-size: 16px; font-weight: 800;">Blind Dispatch Available</h3>
                <p style="color: #64748B; font-size: 12px; margin-top: 4px;">Discreet neutral packaging for agencies and print resellers all over India.</p>
              </div>

              <div style="background: #09192E; padding: 18px 20px; border-radius: 14px;" class="shadow-card">
                <span style="color: #C59B27; font-size: 11px; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase;">TRADE ACCOUNT ENROLLMENT</span>
                <p style="color: #FFFFFF; font-size: 14px; font-weight: 700; margin-top: 2px;">Select 'Business (B2B)' when signing up on mahavircard.in</p>
              </div>

            </div>
          </div>

          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px;">
            <div style="background: #FFFFFF; padding: 14px 18px; border-radius: 12px; text-align: center;" class="border-subtle">
              <span style="font-size: 11px; font-weight: 800; color: #64748B;">ORDERS DISPATCHED</span>
              <p style="font-size: 16px; font-weight: 800; color: #09192E; margin-top: 2px;">All Over India</p>
            </div>
            <div style="background: #FFFFFF; padding: 14px 18px; border-radius: 12px; text-align: center;" class="border-subtle">
              <span style="font-size: 11px; font-weight: 800; color: #64748B;">FILE SUPPORT</span>
              <p style="font-size: 16px; font-weight: 800; color: #09192E; margin-top: 2px;">CDR, PDF, AI, TIFF</p>
            </div>
            <div style="background: #FFFFFF; padding: 14px 18px; border-radius: 12px; text-align: center;" class="border-subtle">
              <span style="font-size: 11px; font-weight: 800; color: #64748B;">SUPPORT DESK</span>
              <p style="font-size: 16px; font-weight: 800; color: #09192E; margin-top: 2px;">+91 94263 71150</p>
            </div>
          </div>

        </div>

        <div class="folio-footer">
          <div>TRADE &amp; RESELLER PROGRAM</div>
          <div>SWIPE FOR WEBSITE LAUNCH &rarr;</div>
        </div>

      </div>
    </body>
    </html>
    """
    pages.append(("10-b2b-partner", p10))

    # ─────────────────────────────────────────────────────────────────────────
    # PAGE 11: WEBSITE LAUNCH (RICH MOCKUP & LIVE FEATURES)
    # ─────────────────────────────────────────────────────────────────────────
    p11 = f"""<!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><style>{CSS_GLOBAL}</style></head>
    <body>
      <div class="booklet-page theme-navy" style="background: #09192E;">
        
        <div class="folio-header">
          <div class="folio-tag">
            <span style="display:inline-block; width:8px; height:8px; background:#C59B27; border-radius:50%;"></span>
            DIGITAL PLATFORM
          </div>
          <div class="folio-page-num">11 / 12</div>
        </div>

        <div style="display: flex; flex-direction: column; gap: 24px;">
          
          <div>
            <span style="font-size: 12px; font-weight: 800; letter-spacing: 3px; color: #C59B27; text-transform: uppercase;">INSTANT ORDERING PORTAL</span>
            <h2 style="font-family: 'Playfair Display', serif; font-size: 44px; font-weight: 800; color: #FFFFFF; line-height: 1.15; margin-top: 6px;">
              Mahavir Card<br/><span style="color: #C59B27;">Is Now Online.</span>
            </h2>
            <p style="font-size: 15px; color: #94A3B8; margin-top: 6px;">
              Calculate live prices, upload CDR artwork, track print runs, and download GST tax invoices.
            </p>
          </div>

          <div style="background: #061120; border: 2px solid rgba(197, 155, 39, 0.4); border-radius: 20px; overflow: hidden; padding: 26px;" class="shadow-luxury">
            
            <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 16px; margin-bottom: 22px;">
              <div style="display: flex; gap: 8px;">
                <span style="width: 11px; height: 11px; border-radius: 50%; background: #EF4444;"></span>
                <span style="width: 11px; height: 11px; border-radius: 50%; background: #F59E0B;"></span>
                <span style="width: 11px; height: 11px; border-radius: 50%; background: #10B981;"></span>
              </div>
              <div style="background: rgba(255,255,255,0.08); padding: 6px 28px; border-radius: 100px; font-family: monospace; font-size: 14px; color: #CBD5E1; letter-spacing: 0.5px;">
                https://mahavircard.in
              </div>
              <div style="color: #C59B27; font-size: 12px; font-weight: 800; letter-spacing: 1px;">ONLINE</div>
            </div>

            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 18px;">
              
              <div style="background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); padding: 22px; border-radius: 16px;">
                <span style="color: #C59B27; font-size: 18px; font-weight: 800;">01</span>
                <h3 style="color: #FFF; font-size: 17px; font-weight: 700; margin-top: 6px;">Live Price Calculator</h3>
                <p style="color: #94A3B8; font-size: 13px; margin-top: 4px; line-height: 1.4;">Select quantity, card type, lamination, and corner finish to calculate exact pricing instantly.</p>
              </div>

              <div style="background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); padding: 22px; border-radius: 16px;">
                <span style="color: #C59B27; font-size: 18px; font-weight: 800;">02</span>
                <h3 style="color: #FFF; font-size: 17px; font-weight: 700; margin-top: 6px;">Direct CDR &amp; PDF Upload</h3>
                <p style="color: #94A3B8; font-size: 13px; margin-top: 4px; line-height: 1.4;">Upload native CorelDRAW files with pre-press guideline &amp; dimensions verification.</p>
              </div>

              <div style="background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); padding: 22px; border-radius: 16px;">
                <span style="color: #C59B27; font-size: 18px; font-weight: 800;">03</span>
                <h3 style="color: #FFF; font-size: 17px; font-weight: 700; margin-top: 6px;">Real-Time Job Tracking</h3>
                <p style="color: #94A3B8; font-size: 13px; margin-top: 4px; line-height: 1.4;">Track live progress from pre-press approval to offset printing, finishing, and dispatch.</p>
              </div>

              <div style="background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); padding: 22px; border-radius: 16px;">
                <span style="color: #C59B27; font-size: 18px; font-weight: 800;">04</span>
                <h3 style="color: #FFF; font-size: 17px; font-weight: 700; margin-top: 6px;">1-Click Fast Reordering</h3>
                <p style="color: #94A3B8; font-size: 13px; margin-top: 4px; line-height: 1.4;">Easily repeat print runs from saved customer jobs and past invoices with a single click.</p>
              </div>

            </div>

          </div>

          <div style="background: rgba(255,255,255,0.06); border-radius: 16px; padding: 20px 26px; display: flex; align-items: center; justify-content: space-between; border: 1px solid rgba(255,255,255,0.12);">
            <div>
              <p style="color: #E2E8F0; font-size: 16px; font-weight: 700;">Visit from mobile or desktop browser</p>
              <p style="color: #94A3B8; font-size: 13px; margin-top: 2px;">Fast customer registration with Email OTP verification</p>
            </div>
            <span style="background: #C59B27; color: #061120; font-size: 13px; font-weight: 800; padding: 10px 22px; border-radius: 10px;">VISIT MAHAVIRCARD.IN &rarr;</span>
          </div>

        </div>

        <div class="folio-footer">
          <div>ONLINE PRINTING EXPERIENCE</div>
          <div>SWIPE FOR CONTACT &amp; LOCATION &rarr;</div>
        </div>

      </div>
    </body>
    </html>
    """
    pages.append(("11-website-launch", p11))

    # ─────────────────────────────────────────────────────────────────────────
    # PAGE 12: FINAL CTA & CONTACT
    # ─────────────────────────────────────────────────────────────────────────
    p12 = f"""<!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><style>{CSS_GLOBAL}</style></head>
    <body>
      <div class="booklet-page theme-navy-deep" style="background: radial-gradient(circle at 50% 30%, #173054 0%, #061120 80%);">
        
        <div class="folio-header">
          <div class="folio-tag">
            <span style="display:inline-block; width:8px; height:8px; background:#C59B27; border-radius:50%;"></span>
            CONNECT WITH US
          </div>
          <div class="folio-page-num">12 / 12</div>
        </div>

        <div style="display: flex; flex-direction: column; align-items: center; text-align: center; gap: 32px; margin-top: 20px;">
          
          <img src="{LOGO_B64}" style="width: 110px; height: 110px; border-radius: 50%; border: 3px solid #C59B27; object-fit: cover;" class="shadow-luxury" />

          <div>
            <span style="font-size: 13px; font-weight: 800; letter-spacing: 4px; color: #C59B27; text-transform: uppercase;">START YOUR NEXT PRINT RUN</span>
            <h1 style="font-family: 'Cinzel', serif; font-size: 56px; font-weight: 900; color: #FFFFFF; letter-spacing: 3px; line-height: 1.1; margin-top: 10px;">
              LET'S PRINT<br/><span style="color: #C59B27;">SOMETHING.</span>
            </h1>
          </div>

          <div style="background: rgba(255,255,255,0.06); border: 1.5px solid rgba(197, 155, 39, 0.5); border-radius: 24px; padding: 36px 44px; width: 100%; max-width: 880px;" class="shadow-luxury">
            
            <div style="display: grid; grid-template-columns: 1.1fr 0.9fr; gap: 32px; text-align: left;">
              
              <div>
                <span style="color: #C59B27; font-size: 11px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase;">PRESS LOCATION</span>
                <p style="color: #FFFFFF; font-size: 16px; font-weight: 700; margin-top: 6px; line-height: 1.45;">
                  Mahavir Card<br/>
                  Khadia Golwad, Opp. Jain Digamber Mandir,<br/>
                  Ahmedabad - 380001, Gujarat
                </p>
              </div>

              <div>
                <span style="color: #C59B27; font-size: 11px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase;">PHONE &amp; WHATSAPP</span>
                <p style="color: #FFFFFF; font-size: 21px; font-weight: 800; margin-top: 6px; font-family: monospace;">
                  +91 94263 71150
                </p>
                <p style="color: #94A3B8; font-size: 12px; margin-top: 2px;">Direct Pre-Press &amp; Estimations Desk</p>
              </div>

              <div>
                <span style="color: #C59B27; font-size: 11px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase;">ONLINE STOREFRONT</span>
                <p style="color: #FFFFFF; font-size: 19px; font-weight: 700; margin-top: 6px; font-family: 'Cinzel', serif;">
                  mahavircard.in
                </p>
              </div>

              <div>
                <span style="color: #C59B27; font-size: 11px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase;">EMAIL INQUIRIES</span>
                <p style="color: #FFFFFF; font-size: 16px; font-weight: 700; margin-top: 6px;">
                  mahavircard2011@gmail.com
                </p>
              </div>

            </div>

          </div>

          <div style="max-width: 700px;">
            <p style="color: #CBD5E1; font-size: 16px; font-weight: 500; line-height: 1.6;">
              For custom jobs, agency bulk printing, or specialty substrate inquiries, visit our website or send us your requirement directly.
            </p>
            <div style="margin-top: 18px;">
              <span style="background: rgba(197, 155, 39, 0.2); border: 1px solid #C59B27; color: #F8FAFC; font-size: 12px; font-weight: 700; letter-spacing: 1.5px; padding: 10px 24px; border-radius: 100px; text-transform: uppercase;">
                &#9733; SAVE THIS CAROUSEL FOR YOUR NEXT PRINT ORDER
              </span>
            </div>
          </div>

        </div>

        <div class="folio-footer">
          <div>MAHAVIR CARD &bull; AHMEDABAD</div>
          <div>END OF BOOKLET &bull; THANK YOU</div>
        </div>

      </div>
    </body>
    </html>
    """
    pages.append(("12-contact", p12))

    return pages

def render_pages():
    pages = generate_pages_html()
    rendered_pngs = []
    temp_html = os.path.join(OUTPUT_DIR, "_temp_render.html")
    temp_screenshot = os.path.join(OUTPUT_DIR, "_temp_shot.png")

    print(f"Rendering {len(pages)} pages using Chrome headless...")

    for name, html in pages:
        with open(temp_html, "w", encoding="utf-8") as f:
            f.write(html)

        cmd = [
            CHROME_PATH,
            "--headless=new",
            "--disable-gpu",
            "--force-device-scale-factor=1",
            "--window-size=1080,1350",
            f"--screenshot={temp_screenshot}",
            f"file:///{temp_html}"
        ]
        res = subprocess.run(cmd, capture_output=True, text=True)
        if res.returncode != 0 or not os.path.exists(temp_screenshot):
            print(f"Error rendering {name}: {res.stderr}")
            continue

        target_png = os.path.join(OUTPUT_DIR, f"{name}.png")
        with Image.open(temp_screenshot) as img:
            cropped = img.crop((0, 0, 1080, 1350))
            cropped.save(target_png, "PNG", optimize=True)
        
        rendered_pngs.append(target_png)
        print(f"[OK] Rendered: {name}.png ({os.path.getsize(target_png):,} bytes)")

    # Clean up temp files
    if os.path.exists(temp_html): os.remove(temp_html)
    if os.path.exists(temp_screenshot): os.remove(temp_screenshot)

    # Generate PDF Booklet
    if rendered_pngs:
        pdf_path = os.path.join(OUTPUT_DIR, "MAHAVIR-CARD-FIRST-BOOKLET.pdf")
        doc = fitz.open()
        for png in rendered_pngs:
            img_doc = fitz.open(png)
            rect = img_doc[0].rect
            pdf_bytes = img_doc.convert_to_pdf()
            img_doc.close()
            img_pdf = fitz.open("pdf", pdf_bytes)
            page = doc.new_page(width=rect.width, height=rect.height)
            page.show_pdf_page(rect, img_pdf, 0)
            img_pdf.close()
        doc.save(pdf_path)
        doc.close()
        print(f"[OK] Created PDF Booklet: {pdf_path} ({os.path.getsize(pdf_path):,} bytes)")

    # Write CAPTION.md
    caption_content = '''# Instagram Launch Post Caption

25+ years of offset press experience in Ahmedabad. Now online at mahavircard.in. 🏛️🖨️

Swipe through our complete print studio booklet to explore:
▪️ Visiting Cards (Thermal Matt, Non-Tearable, Linen Texture, Round Corners)
▪️ Premium Finishes (Raised Spot UV, Drip-Off Hybrid, Velvet Touch & Metallic Gold Stamp)
▪️ Business Stationery (Alabaster Letterheads & Executive Matching Envelopes)
▪️ Brochures, Folded Leaflets & Product Packaging Stickers
▪️ Commercial Custom Printing & B2B Trade Reseller Support

Our new instant ordering portal gives you live rate calculations, direct CorelDRAW (.CDR) artwork inspection, and real-time order tracking.

🌐 Explore the full catalogue: https://mahavircard.in/
📍 Khadia Golwad, Opp. Jain Digamber Mandir, Ahmedabad
📞 Estimations & Inquiries: +91 94263 71150

📌 Save this post for your next printing requirement.
💬 Have a custom job or bulk inquiry? Send us a DM or visit mahavircard.in.
'''
    with open(os.path.join(OUTPUT_DIR, "CAPTION.md"), "w", encoding="utf-8") as f:
        f.write(caption_content)
    print("[OK] Created CAPTION.md")

    # Write HASHTAGS.md
    hashtags_content = '''# Hashtags for Flagship Booklet Carousel

#MahavirCard #AhmedabadPrinting #OffsetPrinting #CommercialPrinting #VisitingCards #VisitingCardDesign #SpotUV #GoldFoil #BrochurePrinting #CustomStickers #BusinessStationery #PrintHouse #AhmedabadBusiness #Khadia #PrintReseller #B2BPrinting #PrintShopIndia
'''
    with open(os.path.join(OUTPUT_DIR, "HASHTAGS.md"), "w", encoding="utf-8") as f:
        f.write(hashtags_content)
    print("[OK] Created HASHTAGS.md")

    # Write DESIGN-NOTES.md
    notes_content = '''# Mahavir Card — First Flagship Booklet Design Notes

## Visual Concept & Art Direction
- **Identity:** High-end print editorial catalogue adapted for Instagram's 4:5 portrait format (1080 × 1350 px).
- **Color Palette:** Deep Heritage Navy (`#061120`, `#09192E`), Architectural Ivory (`#FAF7F2`), Warm Gold Stamp (`#C59B27`), and Crisp White.
- **Typography:**
  - Headlines: Classic luxury serif (*Cinzel* & *Playfair Display*) paired with bold geometric sans (*Plus Jakarta Sans*).
  - Folios & Metrics: Monospace micro-typography for page numbers and technical print specs.
- **Imagery:** 100% genuine Mahavir Card photography featuring authentic shop exterior, close-up luxury finishes (Velvet Gold Foil, Spot UV, Drip-off), paper textures, and actual production stacks.

## Carousel Page Structure & Flow
1. **01-cover.png** — Hero introduction with luxury print trio showcase, 25+ years experience callout, and website launch badge.
2. **02-story.png** — Heritage and 25+ year press story set in Khadia, Ahmedabad with genuine shopfront photography.
3. **03-capabilities.png** — Comprehensive overview of the 6 core product categories.
4. **04-visiting-cards.png** — Visiting card finishes (Thermal Matt, NT, Texture, Round Corner).
5. **05-premium-art.png** — Special embellishments (Spot UV Gloss, Velvet Gold Foil, Drip-off Hybrid).
6. **06-stationery.png** — Executive stationery suite (Alabaster Letterheads & Envelopes).
7. **07-brochure-leaflet.png** — Marketing brochures, folding styles, and creasing precision.
8. **08-stickers.png** — Avery vinyl labels, die-cut shapes, and kiss-cut sheets.
9. **09-custom-printing.png** — Custom commercial printing (Bill books, medical files, packaging).
10. **10-b2b-partner.png** — Strategic trade partnership program for design agencies & print brokers.
11. **11-website-launch.png** — Live website features (Price calculator, CDR upload, order tracking).
12. **12-contact.png** — Complete contact information, address, phone/WhatsApp, email, and CTA.
'''
    with open(os.path.join(OUTPUT_DIR, "DESIGN-NOTES.md"), "w", encoding="utf-8") as f:
        f.write(notes_content)
    print("[OK] Created DESIGN-NOTES.md")

if __name__ == "__main__":
    render_pages()
