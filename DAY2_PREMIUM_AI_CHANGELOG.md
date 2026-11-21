# BookFlow AI — Premium UI, Work Email Policy and LLM Integration

## What changed

### Authentication and email policy
- Added a configurable frontend/backend email policy. Public showcase mode accepts any valid email by default; B2B mode blocks common consumer mailbox domains. Both modes are enforced consistently on frontend validation and backend routes.
- Normalized login, registration, and password-reset email values to lowercase/trimmed form.
- Registration checks duplicate organization addresses and duplicate account emails before creating a new workspace.
- Increased new and reset password minimum length to eight characters and added confirm-password validation in the reset form.
- Added an email-verification frontend route that calls the existing backend verification endpoint.
- Changed the login “Keep me signed in” option to select between localStorage (persistent) and sessionStorage (current tab/session), updated the Axios refresh-token interceptor to work with either store, and fixed Socket.IO to read the token from the same storage helper.
- Enforced the configured email policy on existing protected HTTP sessions and Socket.IO connections; when B2B mode is enabled, a disallowed account is logged out by the frontend policy interceptor.

### Premium UI and responsive behavior
- Replaced the blue palette with a shared violet/indigo brand, teal accent, cleaner backgrounds, updated component borders/shadows, and more consistent button/input states.
- Replaced the split-screen Login page with a single centered, responsive sign-in card, subtle orbit animation, minimal useful copy, password visibility toggle, field validation, loading state, forgot-password link, and sign-up link. Register stays a single responsive form card.
- Updated Sidebar and Navbar styling, created a responsive mobile navigation drawer, and added route-entry transitions.
- Added reduced-motion support for users who disable animation.
- Applied the shared component styling across existing application pages and updated dashboard/analytics chart colors.
- Refreshed forgot/reset password pages to use the same design language.

### AI features
- Added `backend/src/services/aiService.js`, a server-side Groq Chat Completions client using `GROQ_API_KEY` and `GROQ_MODEL`. The API key is never sent to React.
- Updated appointment intent parsing to use Groq strict structured JSON when configured, while keeping backend date validation, staff/service checks, working-hour/leave validation, and overlap checks authoritative.
- Updated customer summaries: backend computes visit/spend/service facts; Groq only generates the human-readable summary from those facts.
- Updated dashboard insights: MongoDB calculates the business metrics; Groq writes the explanation and must not invent metrics. Rule-based/calculated fallbacks remain if no key is set or the provider is unavailable.
- Improved the AI Assistant UI so a user selects a customer, staff member, and service; checks availability in natural language; and explicitly clicks an available slot to create a booking through the normal appointment API.
- Added AI API environment examples to `backend/.env.example`.

### Other fixes
- Removed deprecated `useNewUrlParser` and `useUnifiedTopology` Mongoose connection options.
- Enabled React Router's v7 transition/splat-path future flags to silence the corresponding migration warnings on compatible React Router 6 versions.
- Updated README with AI setup and configurable email-policy notes.

## Environment setup

Merge these two entries into the existing `backend/.env` without overwriting its MongoDB/JWT/SMTP settings:

```env
GROQ_API_KEY=your_groq_api_key
GROQ_MODEL=openai/gpt-oss-20b
```

Get the key through the Groq console at https://console.groq.com/keys. Keep it on the backend only. SMTP credentials are still required for actual email delivery; MongoDB credentials are also still required for the database. An AI key alone does not configure either service.

## Verification performed in the build workspace

- Backend JavaScript syntax checks: passed.
- Frontend JS/JSX parse checks on 36 files: passed.
- Frontend relative import checks: no missing imports detected.
- Backend unit tests: 24/24 passed in the build workspace after email-policy tests were added.
- Full Vite production build and live integration tests were not run because frontend dependency installation timed out in the environment. Verify these after `npm install` on your machine.

## Known limitations

- Work-email validation is a practical blocklist of common personal providers, not proof of company ownership. An unusual personal mail provider may still pass unless added to the blocklist.
- Real Groq responses require a valid API key, model access, available quota, and network access. Without them the app deliberately shows a fallback, not a fabricated claim that the model responded.
- SMTP configuration is still needed to actually deliver registration verification, reset-password, appointment confirmation, and reminder email.
- The appointment creation endpoint performs pre-insert conflict validation but cannot fully guarantee race-free simultaneous bookings without a production database-supported reservation/locking strategy.


## Follow-up: single-panel login and public showcase sign-in

- Removed the split-screen marketing/dashboard-preview composition from Login. The new single centered card has a brief headline, an abstract animated orbit mark, subtle ambient background motion, email/password fields, remember-me, forgot-password, and create-account actions. No fake dashboard numbers are shown.
- Login, registration, and password-reset email placeholders and validation now follow `VITE_REQUIRE_WORK_EMAIL`.
- Backend email policy is governed by `REQUIRE_WORK_EMAIL`. Both flags default to `false` for the portfolio showcase so valid Gmail/Outlook/custom addresses can register and sign in. Set both flags to `true` for B2B-only deployments.
- Updated setup guide and README to explain the two flags.
- Added unit tests for public mode and B2B-only mode. Backend suite: 24/24 passing. Frontend JS/JSX syntax and CSS parse checks pass; full Vite build remains to be verified after installing frontend dependencies.
