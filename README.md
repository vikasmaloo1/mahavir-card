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
| `/catalog` | Product catalogue and filters |
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
| `src/lib/storage.ts` | Artwork object-storage abstraction |
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
| `GET`, `POST` | `/api/artworks` | Authenticated customer/admin; CDR metadata only |
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

Only `.cdr` artwork metadata is accepted. Storage remains abstracted behind `src/lib/storage.ts`; configure a real provider before production uploads.

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
| Storage/email credentials | Development provider credentials | Preview credentials | Production credentials |

Use the pooled Neon URL for Vercel runtime traffic and the direct URL for Drizzle migrations. Test migrations on a production-like Neon branch before applying them to production.

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
