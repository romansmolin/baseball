# FSD architecture

## Layers (top → bottom, imports flow downward)

| Layer    | Purpose                                    |
|----------|--------------------------------------------|
| app      | Providers, router, global config           |
| pages    | Route-level composition only               |
| widgets  | Standalone UI blocks (e.g. OrderBook)      |
| features | User interactions, business logic slices   |
| entities | Domain models, types, entity-level hooks   |
| shared   | UI kit, utils, apiClient, TS types         |

`processes` layer is REMOVED — business flows belong in `features`.

## Slice structure
Every feature or entity slice contains:
```
feature/
├── ui/           ← React components (pure, no logic)
├── model/        ← hooks, store slices, selectors
├── api/          ← fetchers, mappers, DTO types
└── index.ts      ← public API (named exports only)
```

## Public API rule
External code imports ONLY from `index.ts`.
Never: `import { x } from '@/features/auth/model/useAuth'`
Always: `import { useAuth } from '@/features/auth'`

## Naming conventions
- Components: `PascalCase`
- Hooks: `useFeatureName` (e.g. `useOrderBook`)
- Fetchers: `fetchResourceVerb` (e.g. `fetchOrderBook`, `fetchUserProfile`)
- Mappers: `map{Entity}ToModel`, `map{Entity}ToDto`
- Store slices: `featureSlice` (Zustand)
