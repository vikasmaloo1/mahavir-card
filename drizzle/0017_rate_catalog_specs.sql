-- Keep artwork dimensions aligned with the corresponding RATE.xlsx tab.
-- Sheet 3 does not provide artwork dimensions, so it must not inherit Sheet 1 values.
UPDATE "artwork_requirements" AS requirement
SET
  "designWidth" = source."designWidth",
  "designHeight" = source."designHeight",
  "safeAreaWidth" = source."safeAreaWidth",
  "safeAreaHeight" = source."safeAreaHeight",
  "finalWidth" = source."finalWidth",
  "finalHeight" = source."finalHeight",
  "updatedAt" = now()
FROM (
  SELECT
    product.id AS "productId",
    CASE
      WHEN product.slug IN ('nt-single', 'nt-front-back', 'tearable-single-side', 'tearable-front-back-without-lamination', 'tearable-front-back-with-lamination') THEN 90.000
      WHEN product.slug IN ('400-gsm-thermal-matt-single-front-back', '350-gsm-thermal-matt-texture', '400-gsm-thermal-matt-single-side-uv', '400-gsm-thermal-matt-front-back-uv') THEN 92.000
      WHEN product.slug LIKE 'premium-%' THEN 93.500
      ELSE NULL
    END AS "designWidth",
    CASE
      WHEN product.slug IN ('nt-single', 'nt-front-back', 'tearable-single-side', 'tearable-front-back-without-lamination', 'tearable-front-back-with-lamination') THEN 53.000
      WHEN product.slug IN ('400-gsm-thermal-matt-single-front-back', '350-gsm-thermal-matt-texture', '400-gsm-thermal-matt-single-side-uv', '400-gsm-thermal-matt-front-back-uv') THEN 54.000
      WHEN product.slug LIKE 'premium-%' THEN 54.000
      ELSE NULL
    END AS "designHeight",
    CASE WHEN product.slug IN (
      'nt-single', 'nt-front-back', 'tearable-single-side', 'tearable-front-back-without-lamination', 'tearable-front-back-with-lamination',
      '400-gsm-thermal-matt-single-front-back', '350-gsm-thermal-matt-texture', '400-gsm-thermal-matt-single-side-uv', '400-gsm-thermal-matt-front-back-uv'
    ) OR product.slug LIKE 'premium-%' THEN 83.000 ELSE NULL END AS "safeAreaWidth",
    CASE WHEN product.slug IN (
      'nt-single', 'nt-front-back', 'tearable-single-side', 'tearable-front-back-with-lamination', 'tearable-front-back-without-lamination',
      '400-gsm-thermal-matt-single-front-back', '350-gsm-thermal-matt-texture', '400-gsm-thermal-matt-single-side-uv', '400-gsm-thermal-matt-front-back-uv'
    ) OR product.slug LIKE 'premium-%' THEN 47.000 ELSE NULL END AS "safeAreaHeight",
    CASE WHEN product.slug LIKE 'premium-%' THEN 90.000 ELSE NULL END AS "finalWidth",
    CASE WHEN product.slug LIKE 'premium-%' THEN 53.000 ELSE NULL END AS "finalHeight"
  FROM products AS product
  WHERE product."productReference" LIKE 'RATE.xlsx/%'
) AS source
WHERE requirement."productId" = source."productId";

UPDATE products
SET
  description = CASE slug
    WHEN 'art-card-single-side' THEN '250 GSM · single side'
    WHEN 'art-card-both-side' THEN '250 GSM · both sides · minimum 50 sq in'
    WHEN 'art-card-both-side-lamination' THEN '250 GSM · both sides · lamination'
  END,
  "shortDescription" = CASE slug
    WHEN 'art-card-single-side' THEN '250 GSM · single side'
    WHEN 'art-card-both-side' THEN '250 GSM · both sides · minimum 50 sq in'
    WHEN 'art-card-both-side-lamination' THEN '250 GSM · both sides · lamination'
  END,
  "updatedAt" = now()
WHERE slug IN ('art-card-single-side', 'art-card-both-side', 'art-card-both-side-lamination');
