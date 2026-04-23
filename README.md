# SirMamun — Café Inventory Management

React + NestJS + PostgreSQL. Deploys to Vercel (frontend) + Render (backend + DB).

---

## Local Development

### Prerequisites
- Node 18+
- PostgreSQL running locally

### Setup

```bash
git clone <your-repo>
cd sirmamun

# Install all workspaces
npm install

# API env
cp apps/api/.env.example apps/api/.env
# Edit apps/api/.env with your local DB credentials

# Web env (leave VITE_API_URL blank for local dev — proxied automatically)
cp apps/web/.env.example apps/web/.env.local
```

### Run

```bash
# Terminal 1 — API (http://localhost:3000)
npm run api

# Terminal 2 — Web (http://localhost:3001)
npm run web
```

The API auto-creates all tables on first run (`synchronize: true`).

---

## Deploy to Production

### Step 1 — Push to GitHub

```bash
git init
git add .
git commit -m "initial commit"
git remote add origin https://github.com/YOUR_USERNAME/sirmamun.git
git push -u origin main
```

### Step 2 — Deploy Backend on Render

1. Go to [render.com](https://render.com) → New → Blueprint
2. Connect your GitHub repo
3. Render reads `render.yaml` and creates:
   - **sirmamun-api** web service (NestJS)
   - **sirmamun-db** PostgreSQL database (free tier)
4. All DB env vars are wired automatically via the blueprint
5. Wait ~3 minutes for first deploy
6. Copy your API URL: `https://sirmamun-api.onrender.com`

### Step 3 — Deploy Frontend on Vercel

1. Go to [vercel.com](https://vercel.com) → New Project
2. Import your GitHub repo
3. Set **Root Directory** to `apps/web`
4. Add environment variable:
   - `VITE_API_URL` = `https://sirmamun-api.onrender.com`
5. Deploy

That's it. Share the Vercel URL with your staff.

---

## Project Structure

```
sirmamun/
├── apps/
│   ├── api/                  # NestJS backend
│   │   └── src/
│   │       ├── entities/     # TypeORM entities (4 tables)
│   │       ├── bootstrap/    # GET /api/bootstrap — loads all app state
│   │       ├── locations/    # POST/DELETE /api/locations
│   │       ├── items/        # POST/PUT/DELETE /api/items
│   │       └── stock/        # PUT /api/stock/:id, POST /api/transfer, etc.
│   └── web/                  # Vite + React frontend
│       └── src/
│           ├── api.js        # All HTTP calls in one place
│           └── App.jsx       # Full UI — same as the artifact, API-connected
├── render.yaml               # Render blueprint (API + DB)
└── package.json              # npm workspaces root
```

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/bootstrap` | All locations, items, stock, log (300 entries) |
| POST | `/api/locations` | Create location |
| DELETE | `/api/locations/:id` | Delete location (fails if stock exists) |
| POST | `/api/items` | Create item |
| PUT | `/api/items/:id` | Update item |
| DELETE | `/api/items/:id` | Delete item + its stock rows |
| POST | `/api/stock` | Add item to a location with initial qty |
| PUT | `/api/stock/:id` | Adjust stock qty (logs the change) |
| POST | `/api/stock/batch` | Bulk adjust — used by stock count mode |
| POST | `/api/transfer` | Transfer qty between locations (logs it) |
| POST | `/api/import` | CSV bulk import |

---

## Coming Next

- [ ] Staff auth (JWT, email/password)
- [ ] Per-employee location visibility
- [ ] Role-based permissions (staff vs manager)
- [ ] Push/email alerts for low stock
