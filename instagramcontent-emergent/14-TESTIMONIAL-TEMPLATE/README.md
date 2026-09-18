# 14 · Testimonial Template

Reusable quote-card templates for **real customer feedback**. They ship **empty** — with bracketed placeholders, not quotes.

> ⚠️ **Only ever fill these with genuine, permission-given customer feedback.** Do not invent quotes, names or businesses. Keep the customer's own wording; get a quick "ok to share?" first.

## Files
| File | Format | Style |
|------|--------|-------|
| `testimonial-feed-paper.png` | Feed 1080×1350 | Ivory / light |
| `testimonial-feed-ink.png` | Feed 1080×1350 | Deep navy / dark |
| `testimonial-story.png` | Story 1080×1920 | Ivory / light |

## How to fill
1. Replace `[ … ]` in the quote with the customer's actual words (trim for length, don't change meaning).
2. Replace the attribution `— [ Name ] · [ Business ] · [ City ]` with real details (or "— A regular client, Ahmedabad" if they prefer to stay unnamed).
3. Edit the text in `_SOURCE/addons.mjs` (the `14-TESTIMONIAL-TEMPLATE` block) and re-run `_SOURCE/build-addons.mjs`, **or** open the matching file in `_SOURCE/html/` and edit the text directly before re-rendering.

**Caption idea:** *A note from [Business], one of the Ahmedabad businesses we print for. Thank you 🙏 — mahavircard.in*
