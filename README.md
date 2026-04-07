# Setup:

## Frontend:

```bash
cd frontend
npm install #first-time setup
npm run dev
```

## Backend:

```bash
cd backend/HearthHaven.API
dotnet build #optional
dotnet run
```

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
