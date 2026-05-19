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

## Reference docs

-   Architecture & FSD: @docs/architecture.md
-   Custom hooks patterns: @docs/hooks.md
-   API / SWR / fetchers: @docs/api.md
-   Data mappers (mapToModel / mapToDto): @docs/mappers.md
-   What NOT to do: @docs/antipatterns.md
