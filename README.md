# Fab Intelligence

1. `docker compose up -d db`  (PostgreSQL on localhost:5432)
2. `cd server && cp .env.example .env` then set JWT_SECRET (`openssl rand -hex 32`)
3. `npm install && npm run migrate`
4. `npm run create-user -- you@example.com "Your Name" admin` and open the printed link to set your password
5. `npm run dev` (API on :4000), leave it running
6. In a second terminal, in the project root: `npm install && npm run dev`, then open http://localhost:5173

## Using Supabase instead of Docker
Skip step 1. In your Supabase project click Connect, choose Session pooler, copy the string, and use it as DATABASE_URL in server/.env (replace [YOUR-PASSWORD]). Set DATABASE_SSL=true. Then continue from step 2 (npm install, npm run migrate).
