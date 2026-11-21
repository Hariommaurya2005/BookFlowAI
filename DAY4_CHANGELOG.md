# Day 4 Change Log — INR Currency + Customer Cancellation

## Currency consistency
- Added/used a shared INR formatter in the frontend so service prices, public booking, booking management, customer spend, dashboards and revenue charts consistently display Indian Rupees. Whole-number prices do not show unnecessary decimals; fractional values preserve two decimal places.
- Server-side formatting now uses a shared currency utility for appointment confirmation emails and AI insights. AI monetary text is normalized for common `$`, `USD`, and `dollar(s)` amount forms because the current product treats stored prices as INR.
- Dashboard revenue icon now uses an Indian rupee icon instead of a dollar icon. Service create/update responses and service schema use INR for the current India-focused version.

## Customer cancellation
- Added organization cancellation policy with a configurable notice window (1–720 hours, default 24).
- Public bookings receive an unguessable private booking-management token. Only its SHA-256 hash is stored; the raw token is provided only to the customer in the post-booking response/email.
- Customer can view the booking through the private link and request cancellation without a BookFlow login.
- More than the configured notice window before start: request automatically cancels. At or inside the window: request becomes pending and requires business review. Appointments already started/past cannot be cancelled through the public link.
- Business owners/receptionists can approve or reject requests from the Appointments page. Customer and owner notifications are attempted, with real-time refresh events for the business dashboard.
- Public booking token failures no longer trigger normal owner-session refresh/login redirect behavior.
- Socket.IO creation event now sends a minimal refresh payload rather than a Mongoose document that contains the management token hash.

## Verification
- Backend unit tests: 46/46 passed in the workspace; run `npm test` in `backend` to reproduce.
- Backend syntax: run `node --check` on `backend/src` files.
- Backend source/test JavaScript syntax: passed. Frontend JavaScript/JSX parser check: 39 files parsed without syntax diagnostics.
- Frontend production build: not verified in this workspace because frontend dependencies were not installed here; run `npm install` and `npm run build` in `frontend` on the target PC.
- Full local cancellation and pricing flow needs manual browser verification before treating it as end-to-end complete.

## Known limitations
- Customer management links are bearer links: anyone holding the secret link can view/manage that booking, so customers should keep the link private.
- Multi-instance atomic booking/cancellation race protection, payment processing/refunds and OTP-based contact verification are not implemented in this phase.
