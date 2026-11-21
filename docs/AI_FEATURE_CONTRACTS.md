# BookFlow AI — AI Feature Contracts

BookFlow AI uses one reusable server-side Groq transport (`backend/src/services/aiService.js`) for several distinct product tasks. Shared transport is normal architecture; each feature has its own route, input facts, prompt, output contract, UI location and fallback. Never describe a fallback result as a live LLM response. Inspect the response's `aiPowered` flag.

## 1. Smart Appointment Assistant (authenticated workspace)
- **UI:** AI Assistant page.
- **Purpose:** interpret a manager's preferred date/time and suggest real slots for a selected staff member and service.
- **Input:** natural-language request, selected staff/service and organization timezone.
- **LLM output:** structured date, after-time and preferred-time fields.
- **Backend authority:** tenant-scoped records, staff schedule, leave, service duration, past-time rules and overlapping bookings.
- **Does not:** summarize customers or create a booking without the owner/user selecting a slot.

## 2. Customer Summary
- **UI:** Customers list → AI Summary; Customer Detail → Generate AI Summary.
- **Purpose:** explain one customer's visit history and offer a relevant follow-up suggestion.
- **Input:** that customer's own calculated visit/spend/service/attendance facts.
- **LLM output:** short visit insight and recommended action.
- **Backend authority:** calculations and customer/tenant access. Model must not invent spend, visits, service preference or dates.

## 3. Dashboard Business Insights
- **UI:** Dashboard → AI Business Insights, with refresh and visible error/fallback state.
- **Purpose:** explain organization-level KPIs and suggest operational actions.
- **Input:** calculated current/previous month revenue, booking volume, cancellation/no-show rates and top service.
- **LLM output:** a small set of distinct, evidence-based insights with category, observation and action.
- **Backend authority:** all counts, amounts and change percentages. Model must not invent values or claim a trend if comparison data is missing.

## 4. Staff Summary
- **UI:** Staff page → AI Summary on a staff card.
- **Purpose:** give an operational workload brief, not rank employees.
- **Input:** staff-scoped booking totals/statuses, scheduled/booked hours, current-month completed revenue and top completed service.
- **LLM output:** short workload summary plus one scheduling action.
- **Backend authority:** metrics and organization access. No unsupported productivity, quality or customer-sentiment scores.

## 5. Offer Recommendations
- **UI:** Offers & Coupons → AI offer ideas.
- **Purpose:** propose three promotion drafts based on aggregate recent bookings, service prices, customer count, active offers, cancellation count and top services.
- **LLM output:** audience, offer title, discount type/value, minimum value, rationale and guardrail.
- **Backend authority:** clamps recommendations to defined discount bounds. Ideas are drafts; no offer is saved or sent automatically. Owner reviews and saves through the existing offers API.

## 6. Public Booking AI Assistant
- **UI:** Public booking page → “Need help finding a time?”
- **Purpose:** let a customer describe a preferred day/time in plain language and see real available slots.
- **Input:** public business slug, selected active service, optional selected staff and natural-language time request.
- **LLM output:** date/time preference only.
- **Backend authority:** public business lookup, active service/staff, schedule, leave, service duration, past-slot filtering and slot generation. The AI action only suggests slots; customer must choose one and explicitly confirm the booking form.

## 7. Customer Retention Assistant
- **UI:** AI Assistant page → Customer Retention Assistant.
- **Purpose:** segment customer records for a business follow-up review: at-risk, loyal, returning or new/no completed visits.
- **Input:** aggregate segment counts go to the LLM; per-customer names/metrics are prepared by backend for the authenticated workspace UI and are not sent to the LLM prompt.
- **LLM output:** aggregate retention summary and segment-level recommended actions.
- **Backend authority:** completed visit counts, spend, last completed visit and the 30+ day at-risk rule. No messages are automatically sent; owner must review consent and choose any outreach mechanism.

## Shared operational behavior
- `GROQ_API_KEY` stays only in backend environment configuration.
- `GROQ_MODEL` controls the selected Groq model.
- Missing/placeholder keys, provider errors, malformed outputs and rate limits must not expose secrets or crash the application. Where a deterministic fallback is available, `aiPowered` remains `false` and the UI must label it clearly.
- Tests with mocked provider calls verify service behavior, not real account/API availability. Live Groq verification still requires the user's configured key and a real request.
