# Custom hooks

## Separation of concerns
The hook is the logic boundary between UI and data.

```
UI component       →  receives props, renders JSX
custom hook        →  state, derived values, callbacks, SWR calls
fetcher function   →  HTTP, no React dependency
```

## Hook anatomy
```ts
// model/useOrderBook.ts
export function useOrderBook(pair: string) {
  const { data, isLoading, error } = useOrderBookData(pair) // SWR hook

  const bestBid = useMemo(() => data?.bids[0], [data])
  const bestAsk = useMemo(() => data?.asks[0], [data])

  return { bestBid, bestAsk, isLoading, error }
}
```

## Rules
- One hook per concern — don't build "god hooks"
- Hooks return plain values and callbacks — never JSX
- Side effects belong in hooks, not components
- Hooks that wrap SWR are named `useXData` — hooks with
  derived logic are named `useX`
- `error` is always typed as `ApiError | undefined`

## Testing
Hooks are tested with `renderHook` from `@testing-library/react`.
Test the hook in isolation — the UI component is never involved.
