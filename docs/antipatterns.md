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

## 9. Parsing request body in the controller
```ts
// ❌ controller owns HTTP parsing — mixes transport and business logic
async createUser(request: Request): Promise<Response> {
  const body = await request.json()
  // ...
}

// ✅ route handler parses; controller receives plain data
// route.ts
export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return ApiError.validationError('Invalid JSON body').toResponse()
  }
  return userController.createUser(body)
}

// user.controller.ts
async createUser(body: unknown): Promise<Response> {
  const result = createUserSchema.safeParse(body)
  // ...
}
```

## 10. Zod schemas defined in the controller
```ts
// ❌ validation schema lives in the controller — not reusable, wrong layer
// controllers/user/user.controller.ts
const createUserSchema = z.object({ ... })

// ✅ schema lives in entities, imported by controller
// entities/user/user.schema.ts
export const createUserSchema = z.object({ ... })

// controllers/user/user.controller.ts
import { createUserSchema } from '../../entities/user/user.schema'
```

## 11. TypeScript parameter property shorthand in classes
```ts
// ❌ hides the dependency — property declaration is implicit
export class UserController {
  constructor(private readonly userService: IUserService) {}
}

// ✅ explicit property declaration — dependency is visible at a glance
export class UserController {
  private readonly userService: IUserService

  constructor(userService: IUserService) {
    this.userService = userService
  }
}
```

## 12. Passing full Request to GET/DELETE handlers
```ts
// ❌ controller signature leaks HTTP transport concerns
async findUserById(request: Request, params: { id: string }): Promise<Response>

// ✅ route extracts what is needed; controller receives plain values
// route handler
export async function GET(_req: Request, { params }) {
  const { id } = await params
  return userController.findUserById(id)
}

// controller
async findUserById(id: string): Promise<Response>
```
