# [Drizzle-Orm](https://orm.drizzle.team/) playground

I just wanted to play and test.

Entities

```typescript
type User = {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  address: Address;
};

type Address = {
  id: number;
  street: string;
  city: string;
  province: string;
};
```

How to run?

```sh
# Install dependencies
pnpm install
# Generate DB
pnpm generate
# Run migrations
pnpm migrate
# Run test with UI
pnpm test
```
