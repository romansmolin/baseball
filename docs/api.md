# API layer — SWR + fetchers + error handling

## withErrorHandling HOC

Every fetcher is wrapped with `withErrorHandling`. No bare async function
ever reaches useSWR directly.

```ts
// shared/api/withErrorHandling.ts
import { ApiError } from '@/shared/api/ApiError'

export function withErrorHandling<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>
): (...args: TArgs) => Promise<TResult> {
  return async (...args) => {
    try {
      return await fn(...args)
    } catch (err) {
      throw ApiError.from(err)
    }
  }
}
```

```ts
// shared/api/ApiError.ts
export class ApiError extends Error {
  constructor(
    public readonly code: string,
    public readonly message: string,
    public readonly status?: number
  ) {
    super(message)
  }

  static from(err: unknown): ApiError {
    if (err instanceof ApiError) return err
    if (err instanceof Response)
      return new ApiError('HTTP_ERROR', err.statusText, err.status)
    if (err instanceof Error)
      return new ApiError('UNKNOWN', err.message)
    return new ApiError('UNKNOWN', 'An unexpected error occurred')
  }
}
```

## Fetcher functions

Fetchers live in `feature/api/` or `entity/api/`.
They are pure async functions wrapped with `withErrorHandling`.
`mapToModel` is applied inside the fetcher — raw types never leave this file.

```ts
// entities/order-book/api/fetchOrderBook.ts
import { withErrorHandling } from '@/shared/api/withErrorHandling'
import { apiClient } from '@/shared/api/apiClient'
import { mapOrderBookToModel } from './mappers'
import type { OrderBook } from '../model/types'
import type { OrderBookDto } from './types'

export const fetchOrderBook = withErrorHandling(
  async (pair: string): Promise<OrderBook> => {
    const data = await apiClient.get<OrderBookDto>(`/order-book/${pair}`)
    return mapOrderBookToModel(data)
  }
)
```

For mutations, `mapToDto` is applied before the request:

```ts
// features/place-order/api/createOrder.ts
import { withErrorHandling } from '@/shared/api/withErrorHandling'
import { apiClient } from '@/shared/api/apiClient'
import { mapOrderToDto } from './mappers'
import type { Order } from '@/entities/order'
import type { CreateOrderDto } from './types'

export const createOrder = withErrorHandling(
  async (order: Order): Promise<void> => {
    const dto = mapOrderToDto(order)
    await apiClient.post<CreateOrderDto>('/orders', dto)
  }
)
```

## SWR hooks

SWR hooks wrap one fetcher. They live in `model/`.
The fetcher is already wrapped — no extra try/catch here.

```ts
// entities/order-book/model/useOrderBookData.ts
export function useOrderBookData(pair: string) {
  return useSWR(
    ['orderBook', pair],
    () => fetchOrderBook(pair),   // already withErrorHandling-wrapped
    { refreshInterval: 2000 }
  )
}
```

Error is always an `ApiError` instance — type it explicitly:

```ts
const { data, error, isLoading } = useOrderBookData(pair)
// error: ApiError | undefined
```

## Key conventions
- Array keys: `['resource', param]`
- Null key to conditionally disable: `enabled ? ['key', id] : null`
- Shared SWR config in `shared/api/swrConfig.ts`

## Mutation pattern

```ts
const { trigger } = useSWRMutation(
  ['orders'],
  (_, { arg }: { arg: Order }) => createOrder(arg)
  // mapToDto happens inside createOrder
)
```
