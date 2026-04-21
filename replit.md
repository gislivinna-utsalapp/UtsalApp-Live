# ÚtsalApp — Íslenskt Útsalaapp

Mobile-first PWA á íslensku þar sem verslanir birta útsalur og notendur leita að þeim.

## Tæknileg uppsetning

- **Frontend**: React + Vite + Tailwind CSS + shadcn/ui
- **Backend**: Express.js (TypeScript)
- **Gagnageymsla**: JSON-skrá (`database.json`) + PostgreSQL fyrir greiningar
- **Auth**: JWT (bcrypt lykilorðahashar)
- **PWA**: manifest.json + service worker

## Lykilskrár

| Skrá | Lýsing |
|---|---|
| `server/routes.ts` | Allar API leiðir |
| `server/storage-db.ts` | JSON-gagnageymsla (IStorage útfærsla) |
| `server/session-tracker.ts` | UUID-cookie, PG atburðaskráning, getDbSummary |
| `server/search-analyzer.ts` | Íslenskt NLP (hreim-felling, staðarheitaorðabók) |
| `client/src/pages/` | Allar síður (Home, Post, Store, Admin, AnalyticsDashboard, osv.) |
| `client/src/lib/auth.tsx` | AuthContext, TOKEN_KEY=`utsalapp_token` |
| `client/src/lib/api.ts` | `apiFetch` — bætir við Bearer token sjálfkrafa |
| `database.json` | JSON gagnagrunnsúr (notendur, verslanir, færslur) |
| `shared/schema.ts` | Drizzle schema (User, Store, SalePost, Image, osv.) |

## Umhverfisbreytur

- `JWT_SECRET` = `eitthvað_sterkt_leyndarmál` (nauðsynlegt)
- `SESSION_SECRET` — session middleware
- `DATABASE_URL` — PostgreSQL fyrir greiningar (interactions tafla)

## Admin aðgangur

- **Netfang**: `gisli@utsalapp.is`
- **Lykilorð**: `utsalapp123`
- **Admin slóðir**: `/admin`, `/admin/analytics`

## Kynningargögn (Demo Data)

5 verslanir með 13 færslur:
- **Krónan** — matvorur (3 færslur)
- **Elko** — raftæki (3 færslur)
- **Hagkaup** — fatnaður (2 færslur)
- **Skrúður** — húsgögn (2 færslur)
- **66°North** — fatnaður (3 færslur)

## Greiningar (Analytics)

- `/admin/analytics/summary` — PG + minni-minni sameinað (viðvarandi)
- `/admin/analytics/events` — minni-minni (hraðar, hreinsast við endurræsingu)
- `/admin/analytics/db` — PostgreSQL (varanleg)
- `interactions` tafla í PostgreSQL: session_id, event_type, target, path, method, timestamp, meta (JSONB)

## Mynd-format í posts

Þrjár mismunandi uppbyggingar studdar í `mapPostToFrontend()`:
1. `images: [{url, alt}]` — ný uppbygging (frá seed-data og nýjum færslum)
2. `imageUrls: [string]` — eldra format
3. `imageUrl: string` — elsta format

## Keyrsla

Þjónustan þjónar bæði frontend og backend á port 5000 (Vite í þróun, `client/dist/` í framleiðslu). Keyra `npm run build` og endurræsa eftir frontend-breytingar.
