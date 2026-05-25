<!-- QOIDA #1: Barcha kod, interfeys, DB — 100% O'zbek tili (lotin alifbosi). Hech qachon rus tili ishlatilmasin. -->

# AI Kontent Fabrikasi — Loyiha Xotirasi

## Loyiha haqida
Bu loyiha Full-stack AI Swarm (Kontent Fabrikasi) — sun'iy intellekt yordamida kontent ishlab chiqarish tizimi.
To'liq reja: `VAZIFA.md` faylida. Interfeys: **O'zbek tilida**, agentlar javobi: **O'zbek tilida**.

## Maqsad (Oxirigacha bitirish rejasi)
Foydalanuvchi YouTube mavzusini beradi → tizim avtomatik ravishda:
1. **Стратег** reja tuzadi
2. **Research Agent** tadqiqot o'tkazadi
3. **Critic** sifatni tekshiradi
4. **Scenarist** ssenariy yozadi
5. **Designer** oblojka konsepsiyasini tayyorlaydi
6. Стратег yakuniy natijani foydalanuvchiga taqdim etadi

## Texnologiyalar stack'i
| Qatlam | Texnologiya |
|---|---|
| Frontend | Next.js 14 (TypeScript, Tailwind CSS) — port 3000 |
| Backend | Node.js + Express (TypeScript) — port 4000 |
| Ma'lumotlar bazasi | PostgreSQL 18 (Postgres.app) |
| ORM | Prisma |
| Monorepo | Turborepo + npm workspaces |
| AI | Anthropic Claude API (`@anthropic-ai/sdk`) |

## Papkalar strukturasi
```
AI-Kontent fabrikasi/
├── apps/
│   ├── web/                   ← Next.js frontend
│   │   └── src/
│   │       ├── app/agents/    ← Chat UI (Стратег)
│   │       └── components/    ← ChatInterface, Sidebar...
│   └── api/
│       └── src/
│           ├── config/env.ts
│           ├── db/db.ts       ← pg pool (healthcheck)
│           ├── lib/prisma.ts  ← Prisma singleton
│           └── routes/
│               ├── health.ts  ← GET /api/health
│               └── chat.ts    ← POST /api/chat
├── db/
│   └── prisma/
│       ├── schema.prisma      ← agents, runs, tasks, chat_messages
│       └── seed.ts            ← Стратег agenti
├── VAZIFA.md                  ← TO'LIQ LOYIHA REJASI
├── .env                       ← maxfiy sozlamalar (git'ga tushmaydi)
└── package.json               ← ildiz, npm workspaces
```

## Agentlar holati
| Agent | Rol | Model | Baza | Endpoint |
|---|---|---|---|---|
| Стратег | Orkestrator | claude-opus-4-7 | ✅ | ✅ `/api/chat` |
| Research Agent | Tadqiqotchi | claude-sonnet-4-6 | 🔲 | 🔲 |
| Critic | Sifat nazorati | claude-sonnet-4-6 | 🔲 | 🔲 |
| Scenarist | Kontent yozuvchi | claude-opus-4-7 | 🔲 | 🔲 |
| Designer | Vizual konsepsiya | claude-sonnet-4-6 | 🔲 | 🔲 |

## Keyingi qadamlar (VAZIFA.md ga mos)
1. [ ] 4 ta yangi agentni seed orqali bazaga qo'shish
2. [ ] `POST /api/run` — swarm pipeline endpoint
3. [ ] Orkestratsiya logikasi (agentlar ketma-ket va parallel ishlashi)
4. [ ] Frontend — pipeline natijalarini ko'rsatuvchi sahifa (`/content`)
5. [ ] Kontent arxivi — `runs` jadvali orqali

## Loyiha qoidalari
1. Hech qachon `.env` faylini git'ga qo'shma.
2. TypeScript majburiy — `any` tipdan qochish kerak.
3. API endpointlar RESTful standartida yoziladi.
4. Ma'lumotlar bazasi o'zgarishlari faqat Prisma migratsiyalar orqali.
5. `npm install` da xato bo'lsa: `npm install --cache /tmp/npm-cache`

## Muhit o'zgaruvchilari
- `DATABASE_URL=postgresql://macbookair@localhost:5432/kontent_fabrikasi`
- `BACKEND_PORT=4000`
- `ANTHROPIC_API_KEY` — Anthropic console dan
- `NEXT_PUBLIC_API_URL=http://localhost:4000`

## Serverlarni ishga tushirish
```bash
# Backend
export PATH="/Applications/Postgres.app/Contents/Versions/latest/bin:$PATH"
export DATABASE_URL="postgresql://macbookair@localhost:5432/kontent_fabrikasi"
export BACKEND_PORT=4000
cd apps/api && nohup ../../node_modules/.bin/tsx src/index.ts > /tmp/api-server.log 2>&1 &

# Frontend
cd apps/web && nohup ../../node_modules/.bin/next dev -p 3000 > /tmp/web-server.log 2>&1 &
```
