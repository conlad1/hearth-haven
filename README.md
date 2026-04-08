# Hearth Haven

The Hearth Haven / The Hearth Project codebase is a full-stack web application for outreach, donations, case support, and public information. The frontend is a React + Vite single-page app, and the backend is an ASP.NET Core API with Entity Framework Core and ASP.NET Identity.

## What This Repository Contains

- A public website for The Hearth Project.
- Authenticated workflows for outreach, donors, case management, and supporting records.
- An ASP.NET Core API with database-backed identity and operational data.
- SEO, crawler, and LLM guidance files that ship with the frontend build.
- Example configuration files that describe required secrets without exposing the real values.

## Tech Stack

- Frontend: React 19, TypeScript, Vite, Tailwind CSS, Lucide icons.
- Backend: ASP.NET Core, ASP.NET Identity, Entity Framework Core, SQL Server.
- Tooling: Vite build pipeline, sitemap generator script, ESLint, .NET CLI.

## Repository Layout

```text
hearth-haven.sln
backend/HearthHaven.API/      # ASP.NET Core API
frontend/                     # React + Vite frontend
source_data/                  # Seed data and schema assets
DataDictionary.md             # Data dictionary reference
Project_Instructions.md       # Project-specific notes
README.md                     # This guide
```

## Application Surface

Public routes currently include:

- `/`
- `/impact`
- `/login`
- `/register`
- `/cases`
- `/donate`
- `/donors`
- `/outreach`
- `/privacy`
- `/terms`
- `/teapot`

## Prerequisites

- Node.js 20 or newer.
- npm 10 or newer.
- .NET SDK 10.x.
- SQL Server or Azure SQL Database.
- Git.

If you plan to use EF Core CLI commands, install `dotnet-ef` globally or use the version bundled with the SDK:

```bash
dotnet tool install --global dotnet-ef
```

## Configuration Philosophy

This repository follows a simple rule: tracked files describe the shape of configuration, but real secrets live outside the repository.

What is committed:

- Source code.
- Sanitized `appsettings` files.
- Example environment files.
- Public SEO and crawler files.
- Documentation.

What is not committed:

- Real connection strings.
- Real API keys used by your environment.
- Build output like `bin`, `obj`, and `dist`.

## Secrets Management Model

### Backend

The backend reads configuration through ASP.NET Core’s normal configuration pipeline. The app expects a connection string named `AZURE_SQL_CONNECTIONSTRING`.

The lookup order is the standard ASP.NET Core order:

1. `appsettings.json`
2. `appsettings.{Environment}.json`
3. User secrets in development
4. Environment variables
5. Command-line overrides

For this repository:

- `backend/HearthHaven.API/appsettings.json` is tracked, but the connection string value is blank.
- `backend/HearthHaven.API/appsettings.Development.json` is tracked, but the connection string value is blank.
- `backend/HearthHaven.API/appsettings.Development.example.json` shows the expected shape.
- `backend/HearthHaven.API/HearthHaven.API.csproj` includes a `UserSecretsId` so local secrets can be stored outside the repo.

The actual secret value should come from one of these sources:

- Local development: .NET user secrets.
- Local or CI runtime: environment variables.
- Production: hosted app settings, Key Vault, or another secrets manager.

The environment variable name for the connection string is:

```text
ConnectionStrings__AZURE_SQL_CONNECTIONSTRING
```

ASP.NET Core maps `__` to `:`. That means the environment variable above feeds the same configuration key that `builder.Configuration.GetConnectionString("AZURE_SQL_CONNECTIONSTRING")` reads.

### Frontend

The frontend uses Vite environment variables.

Only variables prefixed with `VITE_` are exposed to the browser. Because they are public at build/runtime, they must never contain true secrets.

Tracked frontend config files:

- `frontend/.env.example` documents the public variables the app expects.
- `frontend/.env.production` contains public production defaults such as the API base URL.
- `frontend/.env` and `frontend/.env.local` are local-only files and are ignored.

Current frontend environment variables:

- `VITE_API_BASE_URL` — public API base URL used by the React app.
- `VITE_WEB3FORMS_ACCESS_KEY` — the contact-form key used by the landing page.

Important detail: anything available in the browser is not secret. If a value must remain confidential, it should move behind the backend instead of being exposed through a Vite variable.

## Local Setup

### 1. Clone the repository

```bash
git clone <repo-url>
cd hearth-haven
```

### 2. Set up the backend configuration

The backend should get its connection string from user secrets or environment variables, not from a committed secret value.

Example using user secrets:

```bash
cd backend/HearthHaven.API
dotnet user-secrets set "ConnectionStrings:AZURE_SQL_CONNECTIONSTRING" "Server=localhost;Database=hearth-haven-dev;Trusted_Connection=True;TrustServerCertificate=True;"
```

If you prefer environment variables, set:

```text
ConnectionStrings__AZURE_SQL_CONNECTIONSTRING=Server=localhost;Database=hearth-haven-dev;Trusted_Connection=True;TrustServerCertificate=True;
```

If you use Azure SQL, replace the example connection string with your real Azure SQL connection string and store it in the secret manager or host settings.

### 3. Set up the frontend environment

Copy the example file to a local file and fill in the values:

```bash
cd frontend
copy .env.example .env.local
```

On macOS/Linux, use:

```bash
cp .env.example .env.local
```

Update `.env.local` with your local API base URL and your Web3Forms key.

### 4. Install dependencies

Frontend:

```bash
cd frontend
npm install
```

Backend restore is handled automatically by `dotnet run` or `dotnet build`, but you can run:

```bash
cd backend/HearthHaven.API
dotnet restore
```

### 5. Start the backend

```bash
cd backend/HearthHaven.API
dotnet run
```

If the connection string is missing, the app fails fast with a clear error. That is intentional so nobody accidentally runs with a half-configured data layer.

### 6. Start the frontend

```bash
cd frontend
npm run dev
```

The frontend assumes the API base URL is set in `VITE_API_BASE_URL`.

## Database Setup

The backend uses Entity Framework Core with SQL Server.

### Initial development database

If you are starting from scratch, point the connection string at a local SQL Server instance, SQL Server Express, or Azure SQL.

Typical EF Core workflow:

```bash
cd backend/HearthHaven.API
dotnet ef migrations add InitialCreate
dotnet ef database update
```

If migrations already exist, use `dotnet ef database update` to apply them.

### Production database

In production, the database connection string should come from the host’s secret store or from a managed secret reference such as Azure Key Vault. Do not paste the production connection string into a tracked file.

## Backend Security Details

The authentication stack uses ASP.NET Identity.

- Passwords are hashed by Identity before storage.
- Password creation now requires:
	- at least 14 characters
	- at least one lowercase letter
	- at least one uppercase letter
	- at least one number
	- at least one special character
- Login uses lockout-on-failure so repeated bad attempts can be rate-limited by the Identity lockout settings.

Client-side password hints in the registration form are only a usability improvement. The backend remains the source of truth.

## Frontend Environment Details

The frontend reads public runtime values at build time.

Example `frontend/.env.example` values:

```text
VITE_API_BASE_URL=http://localhost:7052
VITE_WEB3FORMS_ACCESS_KEY=replace-with-your-web3forms-access-key
```

Notes:

- `VITE_API_BASE_URL` points the React app at the API.
- `VITE_WEB3FORMS_ACCESS_KEY` is used by the contact form on the landing page.
- Because `VITE_` variables are embedded in the client bundle, they are public configuration, not confidential secrets.

## Cookie Consent Behavior

The cookie banner stores acceptance in a browser cookie so the site remembers the choice on future visits.

Behavior summary:

- Only essential cookies are presented.
- No analytics cookies are offered or collected.
- The banner records acceptance once and does not keep reappearing.
- A localStorage fallback is retained for compatibility, but the cookie is the primary persistence layer.

## SEO and Crawlers

The public SEO/crawler files live in `frontend/public/` and are copied into the frontend build output.

- `robots.txt`
- `llms.txt`
- `sitemap.xml`

The sitemap is generated automatically before each frontend build by:

- `frontend/scripts/generate-sitemap.mjs`
- the `prebuild` script in `frontend/package.json`

Production domain references use `https://the-hearth-project.org`.

If that domain changes again, update:

- `frontend/scripts/generate-sitemap.mjs`
- `frontend/public/robots.txt`
- `frontend/public/llms.txt`
- any source pages that mention the canonical domain

Then rerun the frontend build so `sitemap.xml` is regenerated.

## Build and Verification

### Frontend build

```bash
cd frontend
npm run build
```

This runs the sitemap generator first and then produces the production bundle.

### Backend build

```bash
cd backend/HearthHaven.API
dotnet build
```

### End-to-end local check

1. Start the backend.
2. Start the frontend.
3. Open the site in a browser.
4. Verify registration rejects weak passwords before submit.
5. Verify the server still rejects invalid passwords if the client misses something.
6. Accept the cookie banner once and reload the page to confirm it stays hidden.
7. Open the public SEO files and confirm the canonical domain is `the-hearth-project.org`.

## Deployment Notes

The deployment model should keep secrets in the hosting platform, not in GitHub.

### Backend deployment

- Set `ConnectionStrings__AZURE_SQL_CONNECTIONSTRING` in the host’s environment or secret manager.
- If you use Azure, prefer App Service settings or Key Vault references.
- Do not commit a production connection string.

### Frontend deployment

- Set `VITE_API_BASE_URL` to the deployed API URL.
- Set `VITE_WEB3FORMS_ACCESS_KEY` only in the build/deployment environment, or move the contact form behind the backend if you want to remove browser exposure entirely.
- Rebuild the frontend after changing environment values because Vite injects them at build time.

### Build artifact handling

The repository ignores generated build output. You should deploy the freshly built frontend bundle, not a stale checked-in `dist` directory.

## Troubleshooting

### The backend fails at startup

Most likely causes:

- `AZURE_SQL_CONNECTIONSTRING` is missing.
- The connection string is invalid.
- SQL Server cannot be reached from the current machine.

### The frontend cannot reach the API

Check:

- `VITE_API_BASE_URL` points at the running backend.
- CORS allows the frontend origin.
- The backend is running on the URL you expect.

### Registration rejects a password

Make sure the password includes all required categories and is at least 14 characters long.

### The contact form says it is not configured

Set `VITE_WEB3FORMS_ACCESS_KEY` in the frontend environment.

### The sitemap still shows the old domain

Run the frontend build again so the prebuild sitemap script regenerates `frontend/public/sitemap.xml`.

## Contribution Workflow

1. Create a branch.
2. Make a focused change.
3. Run the relevant builds.
4. Check that no secret files or build artifacts are staged.
5. Open a pull request.

Useful commands:

```bash
git status
git add .
git commit -m "Describe the change"
git push origin <branch-name>
```

## Git Hygiene

The root `.gitignore` is intended to keep the repository clean by excluding:

- build output
- environment overrides
- local secrets
- `.DS_Store`
- generated solution artifacts

The canonical solution file remains tracked in GitHub.

## Notes for Future Work

- If a future feature needs true server-side secrets, route it through the backend instead of exposing it in the browser.
- If the public domain changes again, update the canonical URL in the source files and regenerate the sitemap.
- If password requirements change, update both the ASP.NET Identity policy and the frontend password hint helper at the same time.
