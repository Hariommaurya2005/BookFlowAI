# Day 10 — Integration & Security Hardening

## Implemented in this backup

### Authentication and session security
- Added `authVersion` to user records and included it in newly issued access/refresh tokens.
- Logout, password change and password reset now increment the session version and clear the stored refresh token.
- Protected HTTP APIs and Socket.IO connections reject stale access tokens immediately after session invalidation.
- Refresh-token verification now consistently returns `401` for expired, malformed and invalid tokens.
- Socket.IO validates the current organization status before accepting a connection; suspended organizations cannot continue using an already-issued socket token.

### API and request hardening
- Added separate IP-based rate limits: sign-in/refresh attempts are limited to 10 per 15 minutes; registration and account-recovery endpoints are limited to 5 per 15 minutes.
- Reduced JSON request bodies to 2 MB and URL-encoded bodies to 100 KB; URL-encoded parsing no longer supports nested object syntax.
- Added bounded pagination to customer and notification lists (maximum 100 rows per page, with a bounded page offset).
- Escaped customer search input before using it in MongoDB regular expressions and capped search input length at 100 characters.
- Added organization scope to customer appointment history and notification queries/mutations. Notification routes now require tenant context.
- Production error responses no longer expose unexpected internal 5xx error messages.
- Access-log URLs redact password-reset, email-verification and bearer-token query values.
- Added optional `TRUST_PROXY=1` support for IP-aware rate limiting behind a trusted hosting reverse proxy.

### Production startup guard
- Production startup now fails closed unless a MongoDB URI, distinct non-placeholder JWT secrets of at least 32 characters, and a public HTTPS `CLIENT_URL` are configured.
- Added test coverage for production configuration requirements and sensitive URL redaction.

## Verification performed

- Backend unit/security suite: **89/89 passed**.
- Backend JavaScript syntax checks: all `src`, `test`, and `scripts` JavaScript files passed `node --check`.
- Frontend files were not changed in Day 10.
- Full HTTP + MongoDB + Socket.IO integration tests were not run in this environment because project dependencies and a disposable test MongoDB instance are not available here.
- Production Vite build and browser regression testing remain user-side checks.

## Important user-side verification

1. Start MongoDB and run the backend; login, appointment, customer, notification, loyalty and subscription flows should still behave normally.
2. Login from two separate organizations and verify each organization can see only its own customer history, notifications, appointments, offers, loyalty data and business settings.
3. After logout, reuse the old access token; protected APIs should return `401`.
4. Repeat after changing a password and after completing a password reset; all previously issued sessions should be rejected.
5. Try a malformed refresh token and confirm the response is `401`, not `500`.
6. Try customer searches containing regex characters such as `.*`, `[`, `(` and `+`; they must be treated as literal text.
7. Request an oversized `limit`; responses must remain capped at 100 records.
8. Open Socket.IO with a current token; then try to join another organization's room and confirm it is rejected. Also test an inactive/suspended organization.
9. In production-mode configuration, try placeholder JWT secrets and an HTTP/localhost frontend URL; startup must stop with a configuration error. Use real HTTPS URL and separate random secrets to start successfully.
10. Inspect backend logs after password reset/email verification and verify raw tokens never appear.
11. Trigger the login/account-recovery rate limit and confirm excess requests receive `429`.
12. Complete the Day 9 loyalty sequence: earn, duplicate-completion prevention, redemption, cancellation refund, and organization isolation.

## Day 10 limitations / follow-up

- No live MongoDB or browser integration test was performed as part of this ZIP.
- Appointment slot conflict checks should be exercised under concurrent requests; cross-instance atomic reservation still needs a dedicated database-level strategy.
- Strict coupon usage concurrency protection remains a known follow-up from Day 5.
- Email delivery, reminder cron, live Groq calls, production hosting and mobile/browser regression must be verified with the real environment.
- Real payment processing remains intentionally deferred.
