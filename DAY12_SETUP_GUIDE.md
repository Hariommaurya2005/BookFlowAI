# Day 12 Setup Guide

1. Extract the updated ZIP.
2. Push the full `bookflow/` folder to a private or public GitHub repository. Do not add real `.env` files.
3. Read `docs/DEPLOYMENT_GUIDE.md` before creating provider services.
4. For Render Blueprint deployment, use the root `render.yaml`; supply your own `MONGO_URI` and `CLIENT_URL`.
5. For Vercel, import the same repo and set the project Root Directory to `frontend`. Set `VITE_API_URL`, `VITE_SOCKET_URL`, and `VITE_REQUIRE_WORK_EMAIL` in the Vercel project settings.
6. Read `docs/ENVIRONMENT_VARIABLES.md` before entering secrets.
7. Complete `docs/RELEASE_CHECKLIST.md` and record which manual checks actually passed.

Do not treat the existence of deployment configuration as a deployed application. Payment gateway integration remains intentionally deferred.
