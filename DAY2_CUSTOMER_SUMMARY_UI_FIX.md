# Customer Summary UI Fix

## What changed
- Added a clearly labeled **AI Summary** action to each customer row in the Customers list.
- Selecting it opens that customer's detail page and automatically requests the customer-summary endpoint.
- Renamed the detail-page button to **Generate AI Summary** so the action is explicit.
- Existing `GET /api/v1/ai/customer-summary/:customerId` API and summary rendering are reused; no duplicate API or summary logic was added.

## How it works
1. The Customers page navigates to `/customers/:id` with a one-time router state flag.
2. CustomerDetail loads the selected customer.
3. Once the detail data is available, the page consumes and clears that one-time state and calls the existing summary API.
4. The summary card renders the generated/calculated summary, relationship stage, visit metrics and recommended follow-up.

## Verification
- Backend tests: 31 passed, 0 failed.
- Frontend JSX parser checks: run when creating this backup; see final assistant message for the result.
- Browser navigation and live Groq calls still require local verification.
