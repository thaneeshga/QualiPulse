# Fab Intelligence

AI-assisted manufacturing quality dashboard. Upload an Excel file of production records and get validated data, defect analysis by product, shift, line and team, loss and profit estimates, anomaly detection, corrective-action tracking, reports, and optional AI answers about your data.

> **Status:** work in progress. The code type-checks for syntax, but the full app has not been through the checklist in [`TESTING.md`](TESTING.md) yet. Check numbers against your own data before relying on them.

## Features

- **Excel upload with validation:** drag and drop `.xlsx`, `.xls` or `.csv`. Detects invalid dates, invalid quantities, duplicates and blank cells, and never silently drops rows. You confirm the dataset before analysis runs.
- **Dashboard:** KPIs, daily trend, defect reasons, defect rate by product, shift comparison, production-line table.
- **Global filters:** date range, year, month, day, shift, team, production line, defect reason, and product search by name or code.
- **Pages:** Executive Overview, Product Intelligence, Production Analytics (streaks and calendar), Defect Intelligence, Shift & Workforce, Root Cause Analysis, Loss & Profit, AI Insights & Anomalies, Alerts & Actions, Improvement Tracking, Reports & Exports, Data Health, Upload Data, Ask AI.
- **Calculations:** defect rate, production streaks from consecutive dates, scrap, rework and downtime cost, estimated profit. Cost figures show "Cost data unavailable" when the data cannot support them. Nothing is invented.
- **Anomaly detection:** defect spikes, production drops and increases, compared with each product's own typical day.
- **Action workflow:** Open → Investigating → Action Taken → Resolved, plus before/after improvement tracking.
- **Reports:** daily, weekly, monthly, yearly, product, shift, defect, loss & profit, and management summary, as on-screen preview, PDF and Excel.
- **Accounts:** email and password sign-in, remember me, password reset, account lockout, roles (admin, manager, viewer).
- **Optional AI:** Ask AI chat, AI-written insights and root-cause hypotheses, with the API key kept on the server.

## Tech stack

| Layer | Tools |
| --- | --- |
| Frontend | React, TypeScript, Vite, Tailwind CSS, Recharts, Lucide React, SheetJS (xlsx), jsPDF |
| Backend | Node.js, Express, Zod, bcryptjs, JSON Web Tokens |
| Database | PostgreSQL (Docker or Supabase) |
| AI (optional) | Anthropic API, called from the server |

## How it fits together

```
Browser (React app)  <-->  Express API (server/)  <-->  PostgreSQL
                                   |
                                   +--> Anthropic API (optional)
```

The Excel file is read in the browser, checked, and saved through the API. Pages calculate their numbers in the browser from the loaded rows. AI features use a summary built from the database on the server.

## Getting started

### Prerequisites

- Node.js 18 or newer
- PostgreSQL, either through Docker or a free Supabase project

### 1. Get the code

```
git clone <your-repo-url>
cd <your-repo-folder>
```

### 2. Choose a database

**Option A: Docker**

```
docker compose up -d db
```

**Option B: Supabase**

1. Create a project at supabase.com and save the database password.
2. Click **Connect**, choose **Session pooler**, and copy the connection string.
3. Replace `[YOUR-PASSWORD]` in the string with your password.
4. In `server/.env` (step 3) set `DATABASE_URL` to that string and `DATABASE_SSL=true`.

### 3. Configure the server

```
cd server
cp .env.example .env        # Windows: copy .env.example .env
```

Edit `server/.env`:

| Variable | Required | Description |
| --- | --- | --- |
| `DATABASE_URL` | yes | PostgreSQL connection string |
| `JWT_SECRET` | yes | At least 32 random characters |
| `DATABASE_SSL` | for Supabase | Set to `true` for hosted databases |
| `DATABASE_CA_FILE` | no | Path to a CA certificate for stricter SSL |
| `APP_URL` | no | App address, default `http://localhost:5173` |
| `PORT` | no | API port, default `4000` |
| `SMTP_URL`, `MAIL_FROM` | no | Sends password-reset emails. Without it, the reset link prints in the server console in development |
| `ANTHROPIC_API_KEY` | no | Turns on the AI features |
| `ANTHROPIC_MODEL` | no | Model name, default `claude-sonnet-5-5` |

Make a secret with:

```
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 4. Create the tables and your account

```
npm install
npm run migrate
npm run create-user -- you@example.com "Your Name" admin
```

The last command prints a link. Open it in the browser later to set your password.

### 5. Run the server

```
npm run dev
```

The API runs on `http://localhost:4000`. Leave this terminal open.

### 6. Run the app

In a second terminal, in the project root:

```
npm install
npm run dev
```

Open `http://localhost:5173`, paste the link from step 4 to set your password, and sign in.

## Excel format

Required columns: **Date**, **Item Name**, **Production Quantity**, **Defect Quantity**.

Optional columns: Item Code, Defect Reason, Shift, Team, Production Line, Unit Production Cost, Selling Price, Rework Quantity, Downtime Hours.

Column names are matched flexibly. `S.No`, `Operator ID` and `Production Streak` are accepted but not used: streaks are calculated from dates, and operator-level views are not built yet.

## Scripts

| Where | Command | What it does |
| --- | --- | --- |
| root | `npm run dev` | Start the app |
| root | `npm run typecheck` | Check TypeScript |
| root | `npm run build` | Type-check and build |
| `server/` | `npm run dev` | Start the API with auto-reload |
| `server/` | `npm run migrate` | Create or update database tables |
| `server/` | `npm run create-user -- email "Name" role` | Create an account |
| `server/` | `npm run typecheck` | Check TypeScript |

## Project structure

```
src/                  React app: pages, calculations (lib.ts), insights, reports, API client
server/src/           Express API: auth, datasets, actions, AI routes, database digest
server/schema.sql     Database tables and access lockdown
docker-compose.yml    Local PostgreSQL
TESTING.md            Manual test checklist
```

## Security notes

- Passwords are hashed with bcrypt. Sessions use an httpOnly cookie. Accounts lock for 15 minutes after 5 failed sign-ins.
- Secrets live in `server/.env`, which is git-ignored. Never commit it, and never put keys in front-end code.
- Every table has row-level security enabled with no public access, so Supabase's public API cannot read your data.
- Uploads are validated by type, size and content on both the browser and the server.
- **AI and privacy:** when AI is enabled, a summary of your dataset (totals and breakdowns such as product and shift names, no individual records) is sent to the AI provider on each request. Check that this is allowed by your organization first.

## Known limitations

- Calculations run in the browser, which suits roughly 100,000 to 200,000 rows. Larger files need server-side calculation.
- Operator ID is not stored, so there are no operator-level views.
- There is no production-target column, so production target-vs-actual and production-below-target alerts are unavailable.
- Shift-performance-change and repeated-defect anomaly types are not built.
- No admin screen for users and no change-password screen. Use the Forgot password link.
- The server runs with `tsx` and is meant for local or internal use. A public deployment needs HTTPS, a process manager and your own hardening.

## Testing

Follow [`TESTING.md`](TESTING.md) after installing. Run `npm run typecheck` in both the root and `server/` first.

## License

Add a license before publishing, for example MIT.
