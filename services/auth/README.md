# @aahar/auth
This document contains all the design and architectural decisions made for the auth service.

## Design
The core auth design is to allow multi sessions using JWT (signed using a Ed25519 key pair) as validation keys. The multi session is realized using a Redis Set whichs stores the refresh tokens for all sessions.

All constants (such as expiration durations) are defined in `[config.ts](./src/config.ts)`.

### 1. RequestOtp
This is to request a new OTP. 

The OTP model contains 3 associated keys: `otp:userId`, `otp:throttle:userId` and `otp:cooldown:userId`:

- `otp:userId` is the OTP itself. This is a hash which contains the `code` (the 6 digit OTP), and `attempts`. `attempts` is the number of times a **failed verification was encountered** on the VerifyOtp message. This is to prevent bruteforcing of the OTP. Since it is 6 digits only, it can be easily bruteforced. To prevent this, a hard limit exists on the failed attempts a user can make submitting their OTP. Once this limit is hit, the OTP for the phone number is deleted.

- `otp:throttle:userId` basically counts the amount of times an OTP has been sent to the user. This helps prevent abuse of the SMS dispatcher by preventing the user from requesting too many OTPs. If the user hits the limit of the maximum OTPs that can be requested in an hour, they are ratelimited for 2 hours before being able to request another OTP.

- `otp:cooldown:userId` is the amount of duration between OTP requests. An OTP can only be requested if this cooldown does not exist.

### 2. VerifyOtp
Validates the phone number, and prevents brute forcing by failing when failed attempts exceed the limit defined (as mentioned previously).

The flow then is as follwoing:
- creates a user (if the corresponding phone number doesn't already exist. otherwise, it runs a DO UPDATE on the `updatedAt` field so postgres returns a record even if the user already exists. using a do nothing clause would mean that postgres returns nothing, and a second select command will have to be used to check for an existing user)

- generates refresh and access tokens (signed using a Ed25519 key pair): the access token is JWS containing the user ID and role as the payload, with a 15 minute expiration duration by default. The refresh token is a 32 byte entropy. The refresh token is not a JWT by design: since it will never be used to store any user related payload or used for authentication/authorization, it is a random string to avoid unnecessary JWT Signature Verification overhead. It is to be noted that refresh tokens are single use only. Once the access token expires, the refresh token will be sent to generate a new pair of refresh and access tokens. This prevents unwanted access if someone gains access to a refresh token.

- updates the redis records: deletes otp, otp cooldown, but **not otp:throttle** (this allows anyone to generate OTPs upto the limit, and when the limit is to be triggered, enter the correct OTP, and repeat this, abusing the SMS system). The refresh token is sha256 hashed and created, and added to a `user:sessions:userId` set. 

### 3. Refresh Token
Issues new set of tokens for when the access token expires.

The flow operates as follows:
- Hashes the incoming token, executes GETDEL on the hash (for atomicity) and checks if GETDEL returns something. If it does not, it means the provided token was wrong/expired. Fetches user from the database and regenerates tokens with the corresponding data.
- Then executes the following series of redis commands:
  1. `SREM` removes the consumed token hash from `user:sessions:<userId>`.
  2. `SET` stores the new `refreshToken:<newHash>` mapped to `userId` with a 30-day TTL.
  3. `SADD` registers the new hash into `user:sessions:<userId>`.
  4. `EXPIRE` refreshes the 30-day TTL on the `user:sessions:<userId>` set.

## Layout

```text
services/auth/
├── src/
│   ├── db/
│   │   ├── database.ts         # Kysely instance & connection pool
│   │   ├── migrations/         # Schema migrations
│   │   └── types.ts            # Kysely Database interface
│   ├── redis/
│   │   └── client.ts           # Dragonfly Connection (ioredis)
│   ├── handlers/
│   │   └── auth.ts             # ConnectRPC router implementation (AuthService)
│   ├── services/
│   │   ├── token.service.ts    # JWT handling
│   └── server.ts               # HTTP/2 server initialization
├── package.json
├── tsconfig.json
└── tsdown.config.ts
```