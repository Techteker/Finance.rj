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

Daily check-in eligibility and streak rollover use the `Asia/Kolkata` calendar day (IST), including the midnight boundary. The streak and check-in date are committed atomically with the reward credit.

The function verifies the caller's Appwrite user JWT before using its server API key. Configure the function's built-in API key scopes for users.read and the required database/document read-write operations. It owns all balance mutations. Never expose the API key or signing secret in Vite variables.

Actions: `wallet`, `check-in`, `start-read`, `read` (signed ticket; minimum reading duration enforced), and `withdraw`. Withdrawals are created as `pending` requests only; this function does not transfer money. A trusted admin must review and pay them.

## Important deployment/schema requirements
The existing `users`, `reward_events`, and `withdrawals` collections must exist. Keep their collection permissions closed to public/client writes. The function uses its server API key for reads and writes. The app's wallet UI must fetch balances through the `wallet` action rather than directly reading the private `users` collection.


Reward credits and withdrawal debits use Appwrite database transactions. The reward event and wallet update commit together; withdrawal balance debit and pending request commit together. Do not downgrade `node-appwrite` below 32.x without replacing these transaction calls.


## Referral rewards

The private `referrals` collection is required in `newsfeed_main` with document security enabled and no public permissions. Required attributes:
- `referrerId` (string, required)
- `referredUserId` (string, required; unique index)
- `referralCode` (string, required)
- `status` (string, required: `pending` or `rewarded`)
- `createdAt` (datetime, optional)
- `rewardedAt` (datetime, optional)

Add indexes on `users.referralCode`, `referrerId,status`, and `referredUserId,status`. The server function alone reads and writes referral records.

Registration captures `/register?ref=CODE`. The first authenticated wallet request records the attribution, rejecting self-referrals and duplicate attribution. When the referred account completes its first eligible 20-second article read, one Appwrite transaction credits 1,000 coins to each account, adds both reward events, and marks the referral rewarded. Deterministic event IDs and the unique referred-user index prevent duplicate payouts.

At the default `COIN_RUPEES=0.01`, each 1,000-coin referral reward is ₹10; this conversion remains configurable through the function environment.
