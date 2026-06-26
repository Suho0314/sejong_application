# Railway Backend Deployment

This guide prepares the NestJS API in `backend/` for Railway. Railway account login,
dashboard changes, domain creation, deployment, and secret entry must be performed by
an authorized project member.

## 1. Connect the repository

1. In Railway, create a new project and choose **Deploy from GitHub repo**.
2. Connect the repository `zor125/Sejong_Application`.
3. Configure the service with these values:

| Setting | Value |
| --- | --- |
| Deploy Branch | `main` |
| Root Directory | `backend` |
| Build Command | `npm ci && npm run build` |
| Start Command | `npm run start` |

The server reads Railway's injected `PORT` and listens on `0.0.0.0`. Do not hard-code
an operating-system port in Railway Variables.

## 2. Configure Railway Variables

Add the following variables in the backend service's **Variables** section. Enter real
secrets only in Railway, never in source files, screenshots, issue comments, or Git.

| Variable | Required | Example format / purpose |
| --- | --- | --- |
| `NODE_ENV` | Yes | `production` |
| `DATABASE_URL` | Yes | Supabase PostgreSQL connection URI |
| `JWT_SECRET` | Yes | Long, cryptographically random secret |
| `JWT_ACCESS_TOKEN_TTL_SECONDS` | Yes | `3600` |
| `CORS_ORIGIN` | Yes for browser clients | Comma-separated exact web origins |
| `PORT` | No | Railway injects this automatically |

`SUPABASE_URL` and `SUPABASE_ANON_KEY` are not used in the current architecture. The
frontends call the backend through `VITE_API_BASE_URL`; only the backend connects to
Supabase PostgreSQL through `DATABASE_URL`.

Example CORS value after the frontends are deployed:

```text
https://your-admin.vercel.app,https://your-student-web.vercel.app
```

Include the scheme (`https://`) and hostname only, without a path. A trailing slash is
accepted and normalized, but omitting it keeps the value unambiguous. Do not use `*`.
When an additional Vercel domain is introduced, append its exact origin with a comma and
redeploy the backend.

### Supabase `DATABASE_URL` notes

- Copy the PostgreSQL connection URI from the Supabase project's connection settings.
- Choose the direct connection or Supabase pooler according to the project's network and
  connection requirements.
- URL-encode reserved characters in the database password before placing it in the URI.
- The backend enables SSL for Supabase hostnames; keep the complete Supabase URI intact.
- Never commit the URI or database password to `.env.example`, GitHub, or documentation.

## 3. Create the public domain

1. Open the Railway backend service.
2. Open **Settings** and find **Networking / Public Networking**.
3. Select **Generate Domain**.
4. Keep the generated HTTPS domain for frontend API configuration and health checks.

After the Admin Web and Student App web build have public URLs, add their exact origins
to `CORS_ORIGIN`. Native mobile requests generally do not send a browser `Origin` header,
while Expo Web and Vercel deployments do and therefore must be listed.

## 4. Verify the health endpoint

The public health check does not expose the database URL, JWT secret, or internal
configuration. Replace the placeholder with the generated Railway domain:

```bash
curl -i https://YOUR_RAILWAY_DOMAIN/api/health
```

A healthy deployment returns HTTP `200` and the existing public health payload. Railway
may also be configured to use `/api/health` as its service health-check path.

## 5. Deployment safety checklist

- The deploy branch is `main`, and the service root is `backend`.
- Build and start commands match this document exactly.
- `NODE_ENV`, `DATABASE_URL`, `JWT_SECRET`, JWT TTL, and `CORS_ORIGIN` are set in Railway.
- `PORT` is left to Railway.
- The actual `.env`, database URL, database password, and JWT secret are not committed.
- `/api/health` returns `200` from the generated HTTPS domain.
- Browser frontends are listed explicitly in `CORS_ORIGIN`; wildcard CORS is not used.

## 6. Kakao student login settings

Add these values directly in Railway Variables. Do not commit real Kakao keys.

- `KAKAO_REST_API_KEY`: Kakao Developers REST API key.
- `KAKAO_CLIENT_SECRET`: optional Kakao client secret if enabled in Kakao Developers.
- `KAKAO_ALLOWED_REDIRECT_URIS`: comma-separated exact redirect URIs allowed by the backend.

Register redirect URIs in Kakao Developers for each runtime:

- Student App Web / Vercel: `https://YOUR_STUDENT_APP_DOMAIN`
- Local Expo Web: `http://localhost:8081`
- Local Vite Web if used: `http://localhost:5173`
- Native app deep link: `nursing-student-app://kakao/oauth`

Set this Student App environment variable only when a fixed redirect URI is needed:

- `EXPO_PUBLIC_KAKAO_REDIRECT_URI`

OAuth safety rules:

- Keep `KAKAO_ALLOWED_REDIRECT_URIS` in sync with Kakao Developers redirect URIs.
- Use exact URI values only. Do not use wildcards, prefix matching, or arbitrary subdomain patterns.
- The Student App creates an OAuth `state` value per login attempt and verifies it before calling the backend callback API.
- Do not log Kakao authorization codes, access tokens, refresh tokens, client secrets, or raw state values.
