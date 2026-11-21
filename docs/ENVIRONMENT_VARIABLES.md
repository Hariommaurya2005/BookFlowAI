# BookFlow AI — Environment Variables

The complete Day 12 ZIP includes `backend/.env` and `frontend/.env` with local-development defaults, plus `.env.example` templates. The backend file contains unique development-only JWT secrets and a local MongoDB URI; SMTP, Groq and Super Admin bootstrap values are blank. Replace values as needed for your machine. Never commit real `.env` files, API keys, SMTP passwords, database credentials, or production JWT secrets.

```bash
# Optional: reset local config from templates (this overwrites the included local .env files)
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

On Windows PowerShell, the equivalent optional reset is `Copy-Item backend/.env.example backend/.env` and `Copy-Item frontend/.env.example frontend/.env`. If you do this, generate two new JWT secrets as described below.

## Backend (`backend/.env`)

| Variable | Required? | Purpose / production guidance |
|---|---|---|
| `NODE_ENV` | Yes in production | Set to `production`; enables strict runtime configuration checks and production-safe logging/errors. |
| `PORT` | Hosting platform supplies it | Local default is `5000`. Do not hard-code a hosted port. |
| `MONGO_URI` | Yes | MongoDB connection string for the BookFlow database. Use a dedicated database user with a strong password. |
| `JWT_ACCESS_SECRET` | Yes | Unique random secret, at least 32 characters. |
| `JWT_REFRESH_SECRET` | Yes | A different unique random secret, at least 32 characters. |
| `JWT_ACCESS_EXPIRE` | Recommended | Defaults to `15m` in the supplied example. |
| `JWT_REFRESH_EXPIRE` | Recommended | Defaults to `7d` in the supplied example. |
| `CLIENT_URL` | Yes in production | Exact public frontend origin, using HTTPS, e.g. `https://your-app.vercel.app`. It is used for CORS, Socket.IO CORS, verification/reset links and booking links. Do not append an API path. |
| `TRUST_PROXY` | Hosting-dependent | Set to `1` only when deployed behind a trusted reverse proxy such as Render. Keep `0` locally. |
| `SMTP_HOST` | Optional for core API; required for email delivery | SMTP server hostname. |
| `SMTP_PORT` | Optional for core API; required for email delivery | Use `587` with STARTTLS for the current transporter configuration. |
| `SMTP_USER` / `SMTP_PASS` | Optional for core API; required for email delivery | SMTP credentials or provider app password. |
| `FROM_EMAIL` / `FROM_NAME` | Required for correctly branded email | Sender identity accepted by the configured SMTP provider. |
| `GROQ_API_KEY` | Optional | Server-side Groq key. Do not create a `VITE_GROQ_API_KEY` variable or expose this key to the browser. Without it, AI endpoints may return labelled deterministic/rule-based fallbacks. |
| `GROQ_MODEL` | Optional | Model ID supported by the current Groq account/API. Confirm availability before changing it. |
| `REQUIRE_WORK_EMAIL` | Optional | Keep `false` for the public portfolio demo. Set `true` only when the desired B2B email-domain policy is configured. Keep it aligned with the frontend setting. |
| `PLATFORM_ADMIN_EMAIL` | One-time bootstrap only | Used by `npm run superadmin:bootstrap`; do not leave a bootstrap password in the long-lived service environment. |
| `PLATFORM_ADMIN_PASSWORD` | One-time bootstrap only | Must be at least 14 characters. Supply only for the one-time CLI bootstrap and remove it afterwards. |
| `PLATFORM_ADMIN_NAME` | One-time bootstrap only | Optional display name for the platform Super Admin. |

The API's `/health` endpoint confirms that the HTTP server is responding. It is not a MongoDB, SMTP, Groq, or Socket.IO deep-health test.

## Frontend (`frontend/.env`)

| Variable | Required? | Purpose |
|---|---|---|
| `VITE_API_URL` | Yes in production | Full backend API base URL ending in `/api/v1`, e.g. `https://your-api.onrender.com/api/v1`. |
| `VITE_SOCKET_URL` | Yes for live events | Backend origin only, e.g. `https://your-api.onrender.com`. Do not append `/api/v1`. |
| `VITE_REQUIRE_WORK_EMAIL` | Optional | Keep `false` for the public portfolio demo; align with backend `REQUIRE_WORK_EMAIL`. |

Vite variables prefixed with `VITE_` are embedded into the browser bundle at build time. They are public configuration, not secrets. Rebuild/redeploy the frontend after changing them.

## Generate local JWT secrets

Run this twice and use two different outputs:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Do not use sample values from documentation as real secrets.
