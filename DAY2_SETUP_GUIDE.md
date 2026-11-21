# BookFlow AI — Day 2 Setup Guide

This update contains the premium UI, configurable email policy for public demos or B2B-only deployments, a backend-only Groq client, and AI-backed flows with deterministic fallbacks. It does not contain real secrets.

## 1. Use the updated project safely

1. Extract this ZIP into a new folder. Do not delete your previous project yet.
2. If you already configured a `backend/.env`, copy it into the updated `bookflow/backend/` folder, but verify every value before running. Your earlier log showed `Invalid namespace specified: bookflownpm test.users`; do **not** preserve that invalid database name. For your local MongoDB, set `MONGO_URI=mongodb://localhost:27017/bookflow` exactly, with no extra text. Keep JWT secrets and `CLIENT_URL`; preserve SMTP values only if they are valid.
3. Add the AI variables below to `backend/.env`. Never put an AI provider key in `frontend/.env`.

```env
GROQ_API_KEY=your_real_groq_api_key
GROQ_MODEL=openai/gpt-oss-20b
```

Create a key in the Groq console at https://console.groq.com/keys. The configured default model `openai/gpt-oss-20b` is listed in Groq's supported models and supports strict structured output. See https://console.groq.com/docs/models and https://console.groq.com/docs/structured-outputs. Keep the key in backend/.env only.

## 2. Keep the frontend API configuration local

`frontend/.env.example` includes `VITE_API_URL` and `VITE_SOCKET_URL`. For local development, these should point to the backend at `http://localhost:5000`. The Vite proxy also supports the default relative `/api/v1` API path. Do not set an AI key in frontend variables because Vite variables can be exposed in browser code.

## 3. Install and test the backend

Open a terminal in `bookflow/backend`:

```powershell
npm install
npm test
npm run dev
```

The backend should report MongoDB connected and listen on port 5000. Open `http://localhost:5000/health` and expect a JSON response with `status: "ok"`. If you see `EADDRINUSE`, another backend is already using port 5000: stop the duplicate process with Ctrl+C and keep only one backend running. If registration/login returns a 500, check the **backend terminal**; the earlier `bookflownpm test` namespace error is a malformed database name, not a registration UI problem.

## 4. Install and run the frontend

Open a second terminal in `bookflow/frontend`:

```powershell
npm install
npm run dev
```

Open the local URL Vite prints (typically `http://localhost:5173`).

## 5. Configure email policy for public showcase mode

For a portfolio/demo deployment, allow Gmail and other valid email addresses. Add these variables to the real `.env` files (not just `.env.example`):

Backend `backend/.env`:
```env
REQUIRE_WORK_EMAIL=false
```

Frontend `frontend/.env`:
```env
VITE_REQUIRE_WORK_EMAIL=false
```

Restart both servers after changing environment variables. The backend and frontend flags should match. Public showcase mode (`false`) accepts any syntactically valid email address. For a B2B-only deployment, set both to `true`; common personal providers are then blocked in frontend validation and backend register/login/password-reset/protected-session/socket checks. This is a practical domain blocklist, not proof of company ownership.

## 6. AI behavior and fallbacks

- `POST /api/v1/ai/suggest`: Groq parses date/time intent when `GROQ_API_KEY` is configured; backend staff/service validation and availability calculation remain authoritative.
- `GET /api/v1/ai/customer-summary/:customerId`: backend computes customer facts; Groq generates the narrative.
- `GET /api/v1/ai/insights`: MongoDB computes business metrics; Groq generates the wording, not the numbers.
- Without a valid key or if the provider is unavailable, these features use their documented deterministic fallback. Check `aiPowered` in the API response to see whether an LLM actually responded.

## 7. Services that need their own credentials

An AI key does not configure everything else. MongoDB still needs `MONGO_URI`; email verification, password resets, appointment emails and reminders need SMTP settings (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, and `FROM_EMAIL`). Socket.IO uses the backend URL and the authenticated access token.

## Verification record

- Backend unit tests: 24/24 passed in the build workspace after configurable-email-policy tests were added.
- Frontend JavaScript/JSX syntax transpile: 36 files checked, no syntax errors.
- Frontend relative imports: 36 files scanned, no missing relative imports.
- Full Vite production build and live MongoDB/SMTP/Groq integration could not be verified in this workspace because frontend dependencies were not installed here. Run the steps above on your PC; do not treat the project as fully production-tested until those integrations are checked.
