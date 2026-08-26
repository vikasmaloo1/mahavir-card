UPDATE "user" AS "users"
SET "role" = CASE WHEN "admins"."status" = 'ACTIVE' THEN 'ADMIN' ELSE 'CUSTOMER' END
FROM "admins"
WHERE "admins"."userId" = "users"."id";
