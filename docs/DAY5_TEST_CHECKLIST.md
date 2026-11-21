# Day 5 Local Test Checklist — Offers & Coupons

## 1. Setup and automated tests

Workspace verification before handoff: 51/51 backend unit tests passed; backend JavaScript syntax checks passed; frontend JS/JSX syntax parsing passed. A full Vite production build and live browser integration could not be verified in the build workspace and must be checked locally.

From `backend`:

```powershell
npm install
npm test
npm run dev
```

From a separate terminal, `frontend`:

```powershell
npm install
npm run build
npm run dev
```

## 2. Owner offer management

- Sign in as a `business_owner`.
- Open **Offers & Coupons** in the sidebar.
- Create a percentage offer (e.g. `FIRST15`, 15%, minimum booking ₹200, valid today through a future date).
- Check the offer appears with active status and the code is normalized uppercase.
- Edit the offer and pause it; check it can no longer be applied.
- Try duplicate coupon codes in the same organization; duplicate should return a clear conflict error.
- Create a fixed discount and test it on a public booking.
- Try a discount over 100%, invalid dates, negative amounts and unknown service IDs; server should reject them.

## 3. Public booking coupon flow

- Enable Public Booking under Settings and open the public booking link in a private/incognito browser.
- Verify public-visible active offer cards appear.
- Select a service and enter a valid email or phone number.
- Apply a valid coupon. Confirm the quote is server-calculated and total updates.
- Change service or contact and ensure the coupon result is cleared/revalidation is required.
- Confirm booking with the coupon. The confirmation page should show base price, discount and final price.
- Verify the owner dashboard contains the appointment and stored price is the discounted final price.
- Try an expired, paused, unknown, service-restricted, minimum-value-ineligible and first-visit-ineligible coupon; each must be rejected.
- If a usage limit is configured to 1, make the first booking, then confirm the next attempt is rejected.
- Verify all displayed prices use INR formatting.

## 4. Security and tenant checks

- Authenticated owner sees only offers for their organization.
- A non-owner role cannot create/update/pause offers.
- A coupon from another organization cannot be validated against this business's public booking page.
- The public browser must not be able to choose its own discount amount or final price; backend recomputes it from the offer record.

## 5. Report back

Share the full `npm test` output and `npm run build` result. Then test offer creation and one valid/invalid coupon from the browser; keep API keys and customer personal details private.
