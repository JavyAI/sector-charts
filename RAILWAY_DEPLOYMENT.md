# Railway Backend Deployment Guide

## Quick Start

The S&P 500 Sector Valuations Dashboard backend is ready to deploy to Railway.

### Prerequisites
- Railway account (you already have one)
- GitHub account with this repo connected
- Environment variables configured in Railway

### Deployment Steps

#### 1. Connect Repository to Railway
1. Log in to [railway.app](https://railway.app)
2. Create a new project
3. Click "Deploy from GitHub"
4. Select this repository: `sector-charts`
5. Choose the branch: `main`

#### 2. Configure Environment Variables

In Railway's **Environment** tab, set:

```
NODE_ENV=production
PORT=3000
DATABASE_PATH=/data/sectors.db
POLYGON_API_KEY=<your_polygon_api_key>
CACHE_TTL_HOURS=24
POLYGON_RATE_LIMIT_REQUESTS=600
POLYGON_RATE_LIMIT_WINDOW_MS=60000
CORS_ORIGIN=<your_frontend_url>
```

**Important CORS_ORIGIN:**
- If frontend is local: `http://localhost:5173` (won't work for production)
- If frontend is hosted: `https://yourdomain.com`
- You can add multiple origins: `http://localhost:5173,https://yourdomain.com`

#### 3. Configure Volumes (Optional but Recommended)

For persistent SQLite database storage:
1. In Railway dashboard, click **Add Volume**
2. Mount path: `/data`
3. This ensures your database persists across deployments

If you skip this, the database will be reset on each Railway restart.

#### 4. Deploy

Railway automatically deploys on git push to `main`. You can also:
1. Click the **Deploy** button in the Railway dashboard
2. Choose `main` branch
3. Wait for build to complete (usually 2-3 minutes)

#### 5. Verify Deployment

Once deployed, Railway provides a public URL (e.g., `https://sector-charts-prod-abc123.railway.app`).

Test the API:
```bash
curl https://sector-charts-prod-abc123.railway.app/api/sectors?date=2026-04-11
```

You should get a JSON response with sector data.

### Database Seeding on Railway

The database starts empty on first deployment. To seed it with initial data:

**Option 1: Via API** (when data pipeline is ready)
- Implement an API endpoint that calls the seed logic
- Call it once: `POST /api/admin/seed`

**Option 2: Via SSH/Railway CLI** (advanced)
```bash
railway shell
cd backend && npm run seed
```

**Option 3: Manual Data Entry**
- Integrate with Polygon.io API to fetch real data instead of seeding

### Monitoring

Railway provides logs in the **Logs** tab. Monitor for:
- `Database initialized at /data/sectors.db` (good startup)
- API request counts and response times
- Any CORS errors (check `CORS_ORIGIN` config)

### Troubleshooting

**"Port already in use"**
- Railway automatically assigns a port; your `PORT` env var is ignored. The app listens on `process.env.PORT` which Railway injects.

**"Cannot find module"**
- Ensure build command is correct: `cd backend && npm install && npm run build`
- Check that `backend/package.json` has all dependencies

**"CORS errors in browser"**
- Verify `CORS_ORIGIN` is set to your frontend's URL
- Include protocol: `https://` (not just the domain)

**"Database connection failed"**
- If no volume: database is in-memory; data is lost on restart
- Add a volume mounted at `/data` for persistence
- Ensure `DATABASE_PATH=/data/sectors.db` in env vars

### Updating the Backend

Simply push to `main` and Railway redeploys automatically:
```bash
git push origin main
```

No manual re-deployment needed.

### Scaling

- **Horizontal**: If you need multiple instances, Railway handles load balancing automatically
- **Database**: SQLite is single-writer; for multi-instance deployments, migrate to PostgreSQL

## Configuring Private Constituents Source

The backend fetches the S&P 500 constituent list from a private GitHub repo (`javyai/sector-data`) using the GitHub REST API. You must configure a GitHub Personal Access Token so the backend can read from that private repo.

### Step 1: Create a GitHub Personal Access Token

**Option A — Classic token (simpler):**
1. Go to https://github.com/settings/tokens/new
2. Set a note, e.g. "sector-charts constituents read"
3. Set expiration as desired
4. Under **Scopes**, check **`repo`** (grants read access to all private repos)
5. Click **Generate token** and copy the value (starts with `ghp_`)

**Option B — Fine-grained token (more secure, recommended):**
1. Go to https://github.com/settings/personal-access-tokens/new
2. Set a name, e.g. "sector-charts constituents"
3. Under **Repository access**, select **Only select repositories** → choose `javyai/sector-data`
4. Under **Permissions → Repository permissions**, set **Contents** to **Read-only**
5. Click **Generate token** and copy the value (starts with `github_pat_`)

### Step 2: Set Environment Variables on Railway

In Railway's **Environment** tab (or via CLI), add:

```
GITHUB_TOKEN=<your_token_from_step_1>
CONSTITUENTS_REPO=javyai/sector-data
CONSTITUENTS_FILE_PATH=constituents.csv
```

Via Railway CLI:
```bash
cd /Users/javyai/AIProjects/sector-charts
railway variables --set "CONSTITUENTS_REPO=javyai/sector-data" --set "CONSTITUENTS_FILE_PATH=constituents.csv"
# Set GITHUB_TOKEN manually in the Railway dashboard (do not paste tokens in shell history)
```

### Step 3: Verify the Integration

Once deployed with the token set, trigger a refresh:
```bash
curl -X POST https://<your-railway-url>/api/constituents/refresh
```

You should get back a JSON response confirming ~500 constituents were loaded from the private repo.

### Updating Your Constituent List

To add, remove, or modify constituents:
1. Edit `constituents.csv` in https://github.com/javyai/sector-data
2. Commit and push
3. Call `POST /api/constituents/refresh` to pull in the changes

---

## Frontend Hosting (Not Required — You'll Keep It Local)

Your frontend runs locally on `http://localhost:5173` (dev) or can be built and served locally.

If you later want to host the frontend:
- Vercel: `vercel deploy` (recommended for React/Vite)
- GitHub Pages: `npm run build && git push` (free but requires CI/CD setup)
- Railway: Deploy as a separate project with `npm run preview`

## Next Steps

1. Log in to Railway
2. Create a new project
3. Follow steps 1-5 above
4. Test the API with the provided URL
5. Update your frontend `.env` to point to the Railway API URL

Example `.env` for frontend after Railway deploy:
```
VITE_API_URL=https://sector-charts-prod-abc123.railway.app/api
```

Then update `frontend/src/services/api.ts` to use `VITE_API_URL` environment variable.

---

**Questions?** Check Railway's [docs](https://docs.railway.app) or contact Railway support.
