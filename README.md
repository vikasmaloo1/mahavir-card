# Mahavir Card

Mahavir Card is one Next.js App Router application for a commercial printing business. The browser talks only to Next.js Route Handlers; Drizzle and Neon PostgreSQL remain server-side. Authentication is provided by Better Auth, and payments remain behind Razorpay/COD provider abstractions.

## Local UI

```powershell
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Next.js provides hot reload automatically; no separate watcher is required.

Main routes:

| Route | Purpose |
| --- | --- |
| `/` | Storefront homepage |
| `/products` | Product catalogue and filters |
| `/catalog/[slug]` | Product configuration and live pricing |
| `/quote` | Quote basket and request form |
| `/login` | Customer/admin email or mobile-password login |
| `/account` | Customer account shell |
| `/admin` | Admin operations dashboard |
| `/api-docs` | Interactive Swagger UI |

## Setup

```powershell
npm.cmd install
Copy-Item .env.example .env.local
npm run db:migrate
npm run db:seed
npm run dev
```

Set only real secret values in `.env.local`; it is not committed. `DATABASE_URL` is the pooled Neon URL used by the application. `DATABASE_URL_UNPOOLED` is the direct Neon URL used by Drizzle migrations.

```env
DATABASE_URL="your-pooled-neon-url"
DATABASE_URL_UNPOOLED="your-direct-neon-url"
BETTER_AUTH_SECRET="long-random-secret"
BETTER_AUTH_URL="http://localhost:3000"
```

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start local development at `http://localhost:3000` |
| `npm run build` | Create the production build |
| `npm run start` | Run the production build locally |
| `npm run lint` | Run ESLint |
| `npm run db:check` | Validate Drizzle migration history |
| `npm run db:generate` | Generate a schema migration after schema edits |
| `npm run db:migrate` | Apply tracked migrations using the direct Neon URL |
| `npm run db:seed` | Seed repeatable catalogue and PDF price rules |
| `npm run admin:bootstrap` | Create the first active admin |
| `npm run api:docs` | Print the local Swagger UI location and validate the OpenAPI source loads |
| `npm run storage:verify` | Run a real R2 upload/download/cleanup smoke test |
| `npm run storage:api-verify` | Exercise authenticated image, PDF, and CDR storage APIs against the local server |
| `npm run test:storage` | Test file policies, signatures, size limits, and key sanitization |

## Project Navigation

The repository intentionally stays compact: modules are grouped by responsibility without moving stable code into empty layers.

| Location | What lives there |
| --- | --- |
| `src/app` | App Router pages, layouts, and route segments |
| `src/app/api` | All backend HTTP APIs, grouped into public/customer routes and `admin` routes |
| `src/app/api/auth` | Better Auth Route Handler integration |
| `src/components` | Reusable storefront, account, form, and admin-facing UI pieces |
| `src/lib/api.ts` | Shared API response and Zod error helpers |
| `src/lib/auth.ts` / `auth-client.ts` | Better Auth server/client configuration |
| `src/lib/db` | Drizzle schema and Neon/Postgres connection access |
| `src/lib/permissions.ts` | CUSTOMER/ADMIN session and authorization helpers |
| `src/lib/validation.ts` | Zod request schemas |
| `src/lib/payment-service.ts` | Razorpay/COD payment provider abstraction |
| `src/lib/storage` | Typed Cloudflare R2 object-storage abstraction and file policies |
| `src/lib/openapi.ts` | OpenAPI document used by Swagger UI |
| `src/lib/phone.ts` | Shared Indian mobile-number normalization |
| `scripts` | Explicit one-off developer commands: seed, admin bootstrap, API docs |
| `drizzle` | Versioned SQL migrations and Drizzle metadata |

Client Components may call HTTP APIs and use `auth-client.ts`. They must not import Drizzle, database pools, server auth, payment providers, storage credentials, or secret environment variables. Server-only modules are explicitly guarded to enforce that boundary.

## Roles And Login

There are only two application roles:

- `CUSTOMER`: can access only their own account data and customer workflows.
- `ADMIN`: can access administration APIs and manage active admin accounts.

Both customers and admins can sign in at `/login` using email/password or an attached Indian mobile number/password. Customer sign-up uses email/password and can attach a mobile number. No SMS verification provider is configured yet, so phone numbers are not treated as verified.

Create the first admin after migrations:

```powershell
$env:INITIAL_ADMIN_NAME="Mahavir Owner"
$env:INITIAL_ADMIN_EMAIL="owner@example.com"
$env:INITIAL_ADMIN_PHONE="9876543210"
$env:INITIAL_ADMIN_PASSWORD="use-a-long-password"
npm run admin:bootstrap
```

## API Documentation

All backend APIs are Next.js Route Handlers. Open [http://localhost:3000/api-docs](http://localhost:3000/api-docs) for interactive Swagger UI, or read the raw document at `/api/openapi`.

Public `GET` endpoints, such as `/api/health`, `/api/categories`, and `/api/products`, can be opened directly in a browser. Use Postman or Insomnia for `POST`, `PATCH`, and `DELETE` requests. Do not put database connection strings or auth secrets in API clients.

Useful endpoints:

| Method | Endpoint | Access |
| --- | --- | --- |
| `GET` | `/api/health` | Public smoke check |
| `GET` | `/api/products?q=` | Public catalogue |
| `GET` | `/api/categories` | Public catalogue |
| `POST` | `/api/pricing/calculate` | Public server-side calculation |
| `POST` | `/api/inquiries` | Public inquiry |
| `POST` | `/api/quotes` | Public/customer quote request |
| `GET`, `POST` | `/api/orders` | Customer-owned records or admin |
| `POST` | `/api/artworks/upload-url` | Authenticated customer; authorize private CDR upload |
| `POST` | `/api/artworks/[id]/finalize` | Authenticated customer; verify R2 object and save metadata |
| `GET` | `/api/artworks/[id]/download` | Authorized customer/admin; short-lived signed download |
| `GET`, `POST`, `PATCH`, `DELETE` | `/api/admin/*` | Active admin only |

Every endpoint returns one of these shapes:

```json
{ "success": true, "data": {} }
```

```json
{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "Validation failed" } }
```

Swagger documents methods, auth requirements, path/query parameters, request bodies, common errors, and key workflow status enums. It intentionally excludes secrets and database implementation details.

## Pricing, Artwork, Payments

`PRICE_LIST_2026.pdf` is the source of the seeded development price rows. The seed contains 6 categories, 25 products, and 89 PDF-derived pricing rules. React never calculates prices directly; it calls `/api/pricing/calculate`.

Only `.cdr` customer artwork is accepted. The browser requests a short-lived signed upload URL, uploads directly to private R2 storage with genuine byte progress, and calls the finalization endpoint. Finalization checks the actual R2 object before marking artwork ready for review. CDR files are never exposed through permanent public URLs.

The payment model supports `RAZORPAY` and `COD`. It creates pending intents and does not pretend that a Razorpay payment completed. Configure a real Razorpay provider and webhook verification before enabling online payments.

## GitHub Workflow

Use a simple feature-branch workflow:

```powershell
git checkout -b feature/<name>
npm run dev
npm run lint
npm run build
git add .
git commit -m "feat: describe the change"
git push -u origin feature/<name>
```

Create a GitHub pull request, review the Vercel Preview Deployment, then merge into `main` for production.

## Vercel Deployment

Vercel Git integration is the deployment system. Use `main` as the Production Branch; every non-main branch receives a Preview Deployment.

1. Push this repository to GitHub.
2. In Vercel, choose **Add New Project** and import the repository.
3. Confirm the Next.js framework is detected.
4. Add environment variables for the selected Vercel environment.
5. Deploy and open the Preview or Production URL.
6. Check `/api/health` and `/api-docs`.
7. Test customer login, admin login, pricing, a quote request, and the order/payment workflow.

Set separate values for Development, Preview, and Production:

| Variable | Development | Preview | Production |
| --- | --- | --- | --- |
| `DATABASE_URL` | Local/dev Neon branch pooled URL | Preview Neon branch pooled URL | Production pooled URL |
| `DATABASE_URL_UNPOOLED` | Local/dev direct URL | Preview direct URL | Production direct URL for migrations only |
| `BETTER_AUTH_SECRET` | Unique local secret | Unique preview secret | Unique production secret |
| `BETTER_AUTH_URL` | `http://localhost:3000` | Current Vercel preview URL | `https://mahavircard.in` |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` | Test keys when enabled | Test keys | Live keys |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_ENDPOINT` | Development R2 credentials | Preview credentials | Production credentials |
| `R2_IMAGE_MAX_BYTES`, `R2_DOCUMENT_MAX_BYTES` | Optional limits | Optional limits | Optional limits |
| Email credentials | Development provider credentials | Preview credentials | Production credentials |

Use the pooled Neon URL for Vercel runtime traffic and the direct URL for Drizzle migrations. Test migrations on a production-like Neon branch before applying them to production.

## Cloudflare R2 Storage

R2 is the single persistent object store. PostgreSQL contains storage keys and metadata only; it never contains image, CDR, invoice, or quotation binaries. Product/category images and active branding assets are delivered through application routes. Artwork and business documents stay private and are downloaded only after an ownership or ADMIN check creates a 5–15 minute signed URL.

Object keys are generated by the server and use these namespaces:

```text
products/{productId}/images/{unique-file-name}
categories/{categoryId}/images/{unique-file-name}
branding/logo/{unique-file-name}
branding/assets/{unique-file-name}
artwork/{customerId}/{quoteOrOrderId}/{unique-file-name}
quotes/{quoteId}/{unique-file-name}
invoices/{customerId}/{invoiceId}/{unique-file-name}
documents/{entityType}/{entityId}/{unique-file-name}
```

Set the five `R2_*` connection variables from `.env.example` in `.env.local`. In Vercel, add the same server-only variables under **Project > Settings > Environment Variables** for Development, Preview, and Production. None may use a `NEXT_PUBLIC_` prefix.

Direct browser CDR uploads require an R2 bucket CORS policy. Add the exact deployed origins you use; do not use `*` for authenticated production uploads:

```json
[
  {
    "AllowedOrigins": [
      "http://localhost:3000",
      "https://mahavircard.in",
      "https://www.mahavircard.in"
    ],
    "AllowedMethods": ["PUT", "GET", "HEAD"],
    "AllowedHeaders": ["Content-Type"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

Add each Vercel Preview origin that needs direct uploads. The R2 bucket itself remains private. Run `npm run storage:verify` after configuring an environment; the command uploads two temporary private objects, verifies server and signed transfers, and removes both objects.

Admin storage controls live at `/admin/storage`. Product images are managed inside each product's **Images** tab. Category images, branding assets, invoices, quotations, and other PDFs are managed in the storage workspace. Generated PDF code should call `storeGeneratedDocument()` and retain only the returned metadata.

## Custom Domain

After connecting the Vercel project, go to **Project > Settings > Domains** and add:

- `mahavircard.in`
- `www.mahavircard.in`

Use the exact DNS records Vercel shows for the project. Do not copy generic records from documentation. Make `mahavircard.in` the canonical domain and configure Vercel to redirect the alternate host to it.

## Verification Checklist

Before a release, run:

```powershell
npm run lint
npm run build
npm run db:check
npm run db:seed
npm run dev
```

Then open `http://localhost:3000`, verify `GET /api/health`, review `/api-docs`, test both login flows, price calculation, quote creation, admin access, and the payment workflow.
