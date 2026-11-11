# ADR-003: Own email and password authentication over Node crypto

- **Status:** Proposed
- **Date:** 2026-11-11
- **Decision owner:** Davi

## Context

On the public internet the shared app password (AG1 to AG3) is not enough. The owner chose accounts that own profiles, signed in with email and password only, with sign-up closed (PRD AU1 to AU8, D30).

Facts:

- The scope is small: sign in, sign out, change password, a CLI to create an account and reset its password, and a per-email rate limit. No sign-up, no reset by email, no social login, no 2FA.
- The app runs on serverless functions, so rate-limit counters and sign-in tokens must live in Postgres, not in memory.
- The repository already signs and compares tokens with Node `crypto` in constant time (`src/server/auth.ts`).
- The API is the contract (N1): auth endpoints belong under `/api/v1` with the shared error format.

## Options considered

1. **Better Auth with its Drizzle adapter.** Tested hashing, sign-in state, origin checks and rate limiting, plus `disableSignUp`. It brings its own `/api/auth/*` routes outside `/api/v1`, four tables of its own (one called `account` that means a sign-in method, which collides with our account), and a large dependency to keep up to date for three features we would use.
2. **Auth.js credentials provider.** Its documentation discourages password sign-in, and keeps password sign-ins in JWTs unless you work around it, so they cannot be revoked server-side.
3. **Own code over Node `crypto` and Postgres.** No dependency; fits `/api/v1`, the layers and our names; we own security-sensitive code.
4. **A hosted identity service** (Clerk, Neon Auth). A new service and vendor for two accounts.

## Decision

Option 3:

- Passwords: `crypto.scrypt` with a 16-byte random salt per password; the stored value records the parameters, so they can be raised later. Minimum length is a `src/shared` constant (12).
- Sign-in tokens: 32 random bytes from `crypto.randomBytes`, sent in the httpOnly, Secure, SameSite=Lax cookie `flipside_sign_in`; only the SHA-256 hash is stored, in `sign_in_tokens`, with an expiry. Sign-out and password changes delete rows, so tokens can be revoked. They are not called sessions, which in this project means practice sessions only (`docs/GLOSSARY.md`).
- Rate limit: failed attempts per email counted in `sign_in_attempts` over a 15-minute window.
- One function in `src/server` resolves the sign-in token; `getCurrentProfile` calls it and checks that the profile belongs to the token's account. `src/proxy.ts` only redirects requests with no cookie.

If reset by email, 2FA or passkeys are needed later, re-evaluate Better Auth then; that is a new ADR.

## Enforcement

- Unit tests for hashing, token handling and the rate-limit window; integration tests for every AC27 to AC31 case, including a profile id from another account in the cookie and in `X-Profile-Id`.
- The feature-gate reviewer checks the implementation against OWASP's session management and password storage guidance.
- The sign-in cookie name lives in one module, as `PROFILE_COOKIE` does; this is a reviewer check until a lint rule exists.

## Consequences

- Easier: one API style, no extra tables beyond the three in PRD section 10, nothing new to upgrade.
- Harder: every auth change is our code to write and review; a forgotten password needs the CLI.
- Risk accepted: a flaw in our own auth code (PRD R14), mitigated by small scope, standard primitives, tests and review.

## Weakest assumption

That the scope stays this small. If the owner wants sign-up, reset by email or a second factor, the cost of our own code grows quickly and Better Auth becomes the better trade.
