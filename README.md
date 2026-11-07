# Clinic – Patient CRUD (3-tier demo)

| Tier | Tech | Folder |
|------|------|--------|
| Presentation | Vanilla JS (DOM API) + HTML + Bootstrap 5 | `client/` |
| Application | Node.js + Express REST API | `server/` |
| Data | PostgreSQL 17 (Docker Compose) | `db/`, `docker-compose.yml` |

```
Browser (client/)  --fetch JSON-->  Express (:3000/api)  --pg driver/SQL-->  PostgreSQL (:5432)
```

## Patient model

| Field | Type | Rules |
|-------|------|-------|
| `id` | serial | PK |
| `first_name`, `last_name` | varchar(50) | required |
| `date_of_birth` | date | required, not in the future (age is computed in the UI) |
| `gender` | varchar | `male` / `female` / `other` |
| `blood_type` | varchar(3) | optional, `A+ … O-` |
| `email` | varchar(100) | optional, unique |
| `phone` | varchar(20) | optional |
| `created_at`, `updated_at` | timestamptz | automatic |

## Run it

```bash
# 1. Database (schema + 5 seed patients come from db/init.sql)
docker compose up -d
#    5432 already in use? -> DB_PORT=5433 docker compose up -d   and set PGPORT=5433 in server/.env

# 2. API
cd server
cp .env.example .env
npm install
npm run dev            # http://localhost:3000

# 3. Client
open http://localhost:3000   # Express also serves client/
```

You can also open `client/index.html` with VS Code Live Server; CORS is enabled and the client
calls `http://localhost:3000/api` when it is not served from port 3000.

`init.sql` runs only when the volume is first created. To reset the data: `docker compose down -v && docker compose up -d`.

## REST API

| Method | URL | Description | Success |
|--------|-----|-------------|---------|
| GET | `/api/patients?q=` | List (optional search on name/email) | 200 |
| GET | `/api/patients/:id` | Get one | 200 / 404 |
| POST | `/api/patients` | Create | 201 + `Location` |
| PUT | `/api/patients/:id` | Update | 200 / 404 |
| DELETE | `/api/patients/:id` | Delete | 204 / 404 |
| GET | `/api/health` | API + DB check | 200 / 503 |

Validation errors return `400 { error, errors: { field: message } }`, and a duplicate email returns `409`.

```bash
curl -X POST localhost:3000/api/patients -H 'Content-Type: application/json' \
  -d '{"first_name":"Ada","last_name":"Lovelace","date_of_birth":"1990-12-10","gender":"female","blood_type":"A-"}'
```

## Things to point out in the demo

- **Client**: `api.js` (data access with `fetch`) is separate from `app.js` (DOM). Rows are built with
  `createElement`/`textContent`, which prevents XSS. One delegated click listener handles every row button.
  Search is debounced. Forms are checked with the Constraint Validation API, and server errors are
  mapped onto Bootstrap `is-invalid` fields.
- **Server**: express.Router, a central error handler that maps Postgres error codes (unique violation → 409),
  and validation repeated on the server. All SQL is parameterized (`$1, $2…`), so it is safe from SQL injection.
- **DB**: `CHECK` constraints and a `UNIQUE` constraint act as the last line of defence.
