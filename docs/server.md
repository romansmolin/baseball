# Server-side conventions

## Layer structure

```
server/
├── entities/       ← Zod schemas, inferred body types
├── models/         ← TypeScript domain interfaces (no Zod)
├── repositories/   ← Prisma access, domain error translation
├── services/       ← Business logic, thin delegation
├── controllers/    ← Validation, orchestration, response building
├── errors/         ← ApiError, ErrorCode, repository errors
├── lib/            ← Prisma singleton
└── shared/         ← Pure utilities (crypto, omit, db helpers)
```

## Request flow

```
Route handler → parse body / extract params → Controller → Service → Repository
```

Each layer has a single responsibility:

| Layer | Responsibility |
|---|---|
| Route handler | Parse `request.json()`, extract path/query params, catch JSON errors |
| Controller | Zod validation, build domain input, strip sensitive fields from response |
| Service | Business rules, orchestration across repositories |
| Repository | Prisma queries, translate Prisma errors to domain errors |

## Route handlers

Route handlers own all HTTP parsing. They never own validation logic.

**GET / DELETE** — extract only the parameters they need, pass primitives to the controller:
```ts
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    return userController.findUserById(id)
}
```

**POST / PUT** — parse the body, catch JSON errors, pass `unknown` to the controller:
```ts
export async function POST(request: Request) {
    let body: unknown

    try {
        body = await request.json()
    } catch {
        return ApiError.validationError('Invalid JSON body').toResponse()
    }

    return userController.createUser(body)
}
```

## Controllers

Controllers receive pre-parsed data from the route and never touch `request.json()`.

Controller method signatures follow the same split: read operations take primitives, write operations take `unknown` body plus any path params:
```ts
interface IUserController {
    findUserById(id: string): Promise<Response>
    findUserByEmail(email: string): Promise<Response>
    createUser(body: unknown): Promise<Response>
    updateUserById(body: unknown, id: string): Promise<Response>
    deleteUserById(id: string): Promise<Response>
}
```

## Zod schemas

Schemas live in `server/entities/{entity}/{entity}.schema.ts`. They are imported by controllers, never defined inside them.

```ts
// server/entities/user/user.schema.ts
export const createUserSchema = z.object({ ... })
export type CreateUserBody = z.infer<typeof createUserSchema>
```

Parse with `safeParse` and return the first issue message on failure:
```ts
const result = createUserSchema.safeParse(body)
if (!result.success) {
    return ApiError.validationError(result.error.issues[0].message).toResponse()
}
```

## Class constructor style

Always declare properties explicitly — never use TypeScript parameter property shorthand:

```ts
// ✅
export class UserController implements IUserController {
    private readonly userService: IUserService

    constructor(userService: IUserService) {
        this.userService = userService
    }
}
```

## Password policy

`password` is required on user creation — it cannot be omitted or undefined. OAuth association is handled by a separate provider-linking endpoint, not by making password optional in the registration schema.

## Error handling

Controllers have a private `handleError` method that maps domain errors to HTTP responses. The mapping is:

| Domain error | HTTP status | Error code |
|---|---|---|
| `UserNotFoundError` | 404 | `USER_NOT_FOUND` |
| `UserAlreadyExistsError` | 409 | `USER_ALREADY_EXISTS` |
| `ApiError` | passthrough | passthrough |
| unknown | 500 | `INTERNAL_ERROR` |

All error responses share the same shape:
```json
{ "error": { "code": "ERROR_CODE", "message": "..." } }
```

## Sensitive fields

Strip `passwordHash` from every response using the `omit` utility — never include it in a JSON response, even accidentally:

```ts
return Response.json(omit(user, 'passwordHash'))
```
