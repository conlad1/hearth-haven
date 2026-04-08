# Setup:

## Frontend:

```bash
cd frontend
npm install #first-time setup
npm run dev
```

Optional production check:

```bash
npm run build
```

## Backend:

```bash
cd backend/HearthHaven.API
dotnet build #optional
dotnet run
```

Optional backend compile check:

```bash
dotnet build
```

# Routes Added/Updated

- `/outreach` (logged-in outreach analytics dashboard)
- `/privacy` (GDPR-oriented privacy policy)
- `/terms` (terms of service)
- `/teapot` (frontend teapot page backed by live HTTP 418 endpoint)

# GDPR + Cookie Consent

- Cookie preferences are managed with an Essential + Analytics consent banner.
- Essential cookies are always enabled.
- Analytics cookies are disabled by default until user consent.

# SEO/Crawler Files

These files are stored under `frontend/public/` and copied into build output root:

- `robots.txt`
- `llms.txt`
- `sitemap.xml`

Sitemap is auto-generated before every frontend build using:

- `frontend/scripts/generate-sitemap.mjs`
- `frontend/package.json` script: `prebuild`

If you want sitemap updates on every push, ensure your push pipeline runs `npm run build` for the frontend.

# Domain Reminder

The current domain used in policy and SEO files is a temporary placeholder:

- `https://hearthhaven.tylermitton.com`

Update this domain in the following files once the production URL is finalized:

- `frontend/scripts/generate-sitemap.mjs`
- `frontend/public/robots.txt`
- `frontend/public/llms.txt`
- `frontend/public/sitemap.xml` (or regenerate via build)

# GitHub:

```bash
git add .
git commit -m "my change"
git push origin your-branch
# Go to GitHub
# Make a pull request into the dev branch
```

**Other:**

```bash
git pull origin dev # before you push or after others make their edits
git restore . # undo all uncommitted changes
git branch # check which branch you're on
git status # check which changes you're made (good if you only want to commit a few files)
git checkout -b your-branch-name # create a new branch
```
