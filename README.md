# Mahavir Card

Mahavir Card is a Next.js App Router application for a commercial printing and packaging business. It combines a customer-facing storefront with a validated API foundation for products, categories, quotes, orders, leads, and artwork metadata.

## Local setup

Install dependencies and create a local environment file:

```powershell
npm.cmd install
Copy-Item .env.example .env.local
```

Set these values in `.env.local`:

```env
DATABASE_URL="your-pooled-neon-connection-string"
DATABASE_URL_UNPOOLED="your-direct-neon-connection-string"
BETTER_AUTH_SECRET="a-long-random-secret"
BETTER_AUTH_URL="http://localhost:3000"
```

Use the pooled URL for the application and the direct URL for Drizzle migrations. The direct URL is optional for local development, but recommended for Neon deployments.

## Database commands

```powershell
npm.cmd run db:generate
npm.cmd run db:migrate
```

The schema lives in `src/lib/db/schema.ts`. Better Auth uses the `user`, `session`, `account`, and `verification` tables defined there, while the remaining tables hold Mahavir Card business data.

## Run and verify

```powershell
npm.cmd run dev
npm.cmd run lint
npm.cmd run build
```

The API is served from the same Next.js application under `/api`. Better Auth is available at `/api/auth/*`. Admin-only mutations use the authenticated user role stored by Better Auth; new accounts default to `CUSTOMER`.

## Deployment

Deploy the repository to Vercel and add the four environment variables from `.env.local` to the project settings. Run the migration against the production Neon branch before opening the storefront to customers.
