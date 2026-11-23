# FORWORD Rewards Appwrite Function

Runtime: Node.js 22. Entrypoint: `src/main.js`.

## Required function environment variables (all server-side)
- `APPWRITE_ENDPOINT`
- `APPWRITE_PROJECT_ID`
- `APPWRITE_DATABASE_ID=newsfeed_main`
- `REWARDS_SIGNING_SECRET` (long random secret, at least 32 characters)
- `APPWRITE_FUNCTION_API_KEY` is injected by the Appwrite Functions runtime; the function uses it for server-side database access. Do not add it as a Vite variable.

Optional configuration:
- `CHECKIN_COINS=5`
- `READ_COINS=1`
- `READ_SECONDS=20`
- `COIN_RUPEES=0.01`
- `MIN_WITHDRAWAL=100`

The function verifies the caller's Appwrite user JWT before using its server API key. Configure the function's built-in API key scopes for users.read and the required database/document read-write operations. It owns all balance mutations. Never expose the API key or signing secret in Vite variables.

Actions: `wallet`, `check-in`, `start-read`, `read` (signed ticket; minimum reading duration enforced), and `withdraw`. Withdrawals are created as `pending` requests only; this function does not transfer money. A trusted admin must review and pay them.

## Important deployment/schema requirements
The existing `users`, `reward_events`, and `withdrawals` collections must exist. Keep their collection permissions closed to public/client writes. The function uses its server API key for reads and writes. The app's wallet UI must fetch balances through the `wallet` action rather than directly reading the private `users` collection.
