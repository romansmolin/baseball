# Data mappers — mapToModel and mapToDto

## Boundary rule

The frontend never touches raw API response shapes.
The API never receives raw domain model objects.

```
API response (DTO)  →  mapToModel  →  domain model  →  hook / UI
hook / UI  →  domain model  →  mapToDto  →  API request (DTO)
```

Raw DTO types are defined in `feature/api/types.ts`.
Domain model types are defined in `feature/model/types.ts`.
Mappers live alongside the fetcher in `feature/api/mappers.ts`.

## mapToModel — inbound

Called inside the fetcher, immediately after the HTTP response.

```ts
// entities/order-book/api/mappers.ts
import type { OrderBookDto, OrderBookEntryDto } from './types'
import type { OrderBook, OrderBookEntry } from '../model/types'

export function mapOrderBookToModel(dto: OrderBookDto): OrderBook {
  return {
    pair: dto.trading_pair,
    bids: dto.bids.map(mapEntryToModel),
    asks: dto.asks.map(mapEntryToModel),
    updatedAt: new Date(dto.updated_at),
  }
}

function mapEntryToModel(dto: OrderBookEntryDto): OrderBookEntry {
  return {
    price: Number(dto.price),
    quantity: Number(dto.qty),
  }
}
```

## mapToDto — outbound

Called inside the fetcher, before the HTTP request body is sent.

```ts
// features/place-order/api/mappers.ts
import type { Order } from '@/entities/order'
import type { CreateOrderDto } from './types'

export function mapOrderToDto(order: Order): CreateOrderDto {
  return {
    trading_pair: order.pair,
    side: order.side,
    qty: String(order.quantity),
    limit_price: order.price != null ? String(order.price) : undefined,
    client_order_id: order.clientId,
  }
}
```

## Naming conventions
- `map{Entity}ToModel(dto)` — inbound
- `map{Entity}ToDto(model)` — outbound
- Both are pure functions: no side effects, no async, no imports from React

## DTO types

DTO types mirror the exact API contract — snake_case, string numbers,
ISO date strings. They live in `feature/api/types.ts` and are never
imported outside the `api/` folder.

```ts
// entities/order-book/api/types.ts
export interface OrderBookDto {
  trading_pair: string
  bids: OrderBookEntryDto[]
  asks: OrderBookEntryDto[]
  updated_at: string        // ISO 8601
}

export interface OrderBookEntryDto {
  price: string             // string number from exchange API
  qty: string
}
```

## Testing mappers

Mappers are pure functions — test them directly with Vitest, no mocks needed.

```ts
// entities/order-book/api/mappers.test.ts
import { mapOrderBookToModel } from './mappers'

it('converts string prices to numbers', () => {
  const dto = {
    trading_pair: 'BTC-USDT',
    bids: [{ price: '42000.50', qty: '0.5' }],
    asks: [],
    updated_at: '2024-01-01T00:00:00Z',
  }
  const model = mapOrderBookToModel(dto)
  expect(model.bids[0].price).toBe(42000.50)
  expect(model.bids[0].price).toBeTypeOf('number')
})
```
