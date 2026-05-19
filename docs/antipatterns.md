# Antipatterns — never do these

## 1. Logic in UI components
```tsx
// ❌ fetching in component
export function OrderBook() {
  const [data, setData] = useState(null)
  useEffect(() => { fetch('/api/order-book').then(...) }, [])
  return <div>{data}</div>
}

// ✅ hook handles it
export function OrderBook() {
  const { bestBid, bestAsk, isLoading } = useOrderBook('BTC-USDT')
  return <div>{bestBid}</div>
}
```

## 2. Bare fetcher — no withErrorHandling
```ts
// ❌ unhandled errors, inconsistent error shape
export const fetchOrderBook = async (pair: string) => {
  return apiClient.get(`/order-book/${pair}`)
}

// ✅ always wrap
export const fetchOrderBook = withErrorHandling(
  async (pair: string): Promise<OrderBook> => {
    const data = await apiClient.get<OrderBookDto>(`/order-book/${pair}`)
    return mapOrderBookToModel(data)
  }
)
```

## 3. Inline fetcher in useSWR
```ts
// ❌ untestable, no error handling, no mapping
useSWR('/order-book', () => fetch('/order-book').then(r => r.json()))

// ✅ named, wrapped, typed
useSWR(['orderBook', pair], () => fetchOrderBook(pair))
```

## 4. Raw DTO leaking into hook or UI
```ts
// ❌ hook receives raw API shape
const { data } = useSWR(['orderBook', pair], () =>
  apiClient.get<OrderBookDto>(`/order-book/${pair}`)
)
// data.trading_pair — snake_case, string numbers in UI

// ✅ mapToModel inside the fetcher, hook receives domain model
const { data } = useOrderBookData(pair)
// data.pair, data.bids[0].price — camelCase, proper types
```

## 5. mapToModel called in the hook or component
```ts
// ❌ mapping is the fetcher's responsibility
function useOrderBook(pair: string) {
  const { data } = useSWR(['orderBook', pair], () => fetchOrderBook(pair))
  return mapOrderBookToModel(data) // wrong layer
}

// ✅ fetcher returns the model, hook consumes it
function useOrderBook(pair: string) {
  const { data, isLoading, error } = useOrderBookData(pair)
  const bestBid = useMemo(() => data?.bids[0], [data])
  return { bestBid, isLoading, error }
}
```

## 6. Cross-slice deep imports
```ts
// ❌ bypasses public API
import { orderSchema } from '@/entities/order/model/schemas'

// ✅ use index.ts
import { orderSchema } from '@/entities/order'
```

## 7. Importing upward (layer violation)
```ts
// ❌ shared importing from features
// shared/ui/Button.tsx
import { useAuth } from '@/features/auth'
```

## 8. Fat pages
```tsx
// ❌ all logic in the page
export default function TradingPage() {
  const [orders, setOrders] = useState([])
  // 200 lines of logic...
}

// ✅ page is pure composition
export default function TradingPage() {
  return (
    <TradingLayout>
      <OrderBookWidget pair="BTC-USDT" />
      <TradeFormWidget />
    </TradingLayout>
  )
}
```
