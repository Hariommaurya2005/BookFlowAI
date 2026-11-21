# Day 5 Changelog — Offers & Coupons

## New backend capabilities
- Added organization-scoped Offer model and unique `(organizationId, code)` constraint.
- Added authenticated offer list API; create/edit/pause mutations require `business_owner` or `super_admin` and are audit-logged.
- Added eligibility rules for active status, validity window, total usage limit, optional service restrictions, minimum booking value, first-visit rule and per-customer redemption cap.
- Added shared discount calculation for percentage and fixed amounts, optional max-discount cap, and rounding to two decimal places.
- Added public coupon validation API. Coupon preview is informational; the booking endpoint evaluates the coupon again on submission.
- Booking endpoint reserves a global redemption count atomically when a total usage limit exists; if appointment insertion fails, it releases that reservation.
- Appointment records now store `basePrice`, `discountAmount`, `offerId`, `couponCode`; `price` is the final price after discount.
- Public offer cards can appear on business booking pages when the owner enables public visibility.
- Confirmation emails and public booking/management views display discount details.

## New frontend capabilities
- Added premium Offers & Coupons owner page with create/edit/pause, code copy, usage counters, service targeting, first-visit option, public visibility and date/usage limits.
- Added coupon code validation/apply UI to public booking, recalculated totals and discount details on confirmation.
- Added Offers & Coupons navigation route.

## Testing
- `backend/test/offerRules.test.js` covers code normalization, format, discount calculations, caps and payload validation.
- Full backend test suite results are reported separately after execution in this workspace.
- Frontend production build and live MongoDB/Groq/email integration require local verification if dependencies/services are not available here.

## Known limitations
- There is no payment gateway. Offers only calculate a price adjustment; no payment is collected.
- Global limited-usage coupon counts are atomically reserved; concurrent per-customer redemption may still require a transaction/unique redemption record for strict production guarantees.
- Coupon redemption count is recorded when a booking is created and is not automatically refunded when a booking is later cancelled.
- Public customers can use a private booking-management token link; keep such links secret.
