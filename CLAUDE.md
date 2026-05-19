# Project architecture

Stack: React, TypeScript, Next.js App Router, Zustand, SWR, Tailwind, Vitest.

Architecture is Feature Sliced Design (FSD). No `processes` layer.
Logic lives in custom hooks. UI components are pure renderers.
Data fetching uses SWR with separate fetcher functions.

## Key rules (enforced, no exceptions)

-   Import only from a slice's `index.ts` public API
-   Layers import downward only: pages → widgets → features → entities → shared
-   No fetch calls or effects inside UI components
-   Fetchers are standalone async functions — never inlined in useSWR
-   Every fetcher is wrapped with `withErrorHandling` — no exceptions
-   UI and hooks only receive domain models — never raw DTO shapes

## Naming conventions

-   Files and folders: `kebab-case` (e.g. `order-book/`, `use-order-book.ts`)
-   Components (JSX/TSX): `camelCase` file names for non-component files; component identifiers themselves remain `PascalCase`
-   API files: `{entity}.api.ts` (e.g. `order-book.api.ts`)
-   Service files: `{entity}.service.ts`
-   Constants files: `{entity}.const.ts`
-   Enum files: `{entity}.enum.ts`
-   Type files: `{entity}.type.ts`

## Database (Prisma + PostgreSQL)

After every change to `prisma/schema.prisma` — adding a model, adding/removing a field, changing a type or relation — run from the **project root**:

```bash
npx prisma migrate dev --name <describe-the-change>
```

This creates a timestamped SQL migration in `prisma/migrations/`, applies it to the local database, and regenerates the Prisma client in `src/generated/prisma/`.

Examples of good migration names: `add-user-model`, `add-league-table`, `user-add-avatar-url`.

Never edit migration files by hand. Never use `prisma db push` in development — always use `migrate dev` so the migration history stays intact.

## Server rules (enforced, no exceptions)

-   Route handlers parse `request.json()` — controllers never call it
-   GET and DELETE route handlers pass only extracted primitives (id, email) to controllers
-   Zod schemas live in `server/entities/{entity}/{entity}.schema.ts` — never in controllers
-   `password` is required on user creation — never optional
-   Classes use explicit property declarations, not TypeScript parameter property shorthand
-   Strip `passwordHash` from every response using `omit(user, 'passwordHash')`

## Reference docs

-   Architecture & FSD: @docs/architecture.md
-   Custom hooks patterns: @docs/hooks.md
-   API / SWR / fetchers: @docs/api.md
-   Data mappers (mapToModel / mapToDto): @docs/mappers.md
-   Server-side conventions: @docs/server.md
-   What NOT to do: @docs/antipatterns.md
