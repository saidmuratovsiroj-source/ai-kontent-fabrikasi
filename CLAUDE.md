<!-- QOIDA #1: Barcha kod, interfeys, DB — 100% O'zbek tili (lotin alifbosi). Hech qachon rus tili ishlatilmasin. -->

# AI Kontent Fabrikasi — Loyiha Xotirasi

## Nima bu tizim?

YouTube kontent ishlab chiqarishni avtomatlashtiruvchi 5 agentli AI swarm.
Foydalanuvchi mavzu beradi → tizim tadqiqot o'tkazadi → ssenariy yozadi → thumbnail g'oyalari tayyorlaydi → Telegram kanaliga yuboradi.

---

## Texnologiyalar stack'i

| Qatlam | Texnologiya | Port |
|---|---|---|
| Frontend | Next.js 14 (TypeScript, Tailwind CSS) | 3000 |
| Backend | Node.js + Express (TypeScript, tsx) | 4000 |
| Ma'lumotlar bazasi | PostgreSQL 18 (Postgres.app) + Prisma ORM | 5432 |
| AI | OpenRouter API (`openai` SDK) | — |
| Monitoring | Telegram Bot API | — |
| Monorepo | Turborepo + npm workspaces | — |

---

## 5 ta agent va ularning rollari

| Agent | DB ID | Model | Rol |
|---|---|---|---|
| Strateg | `00000000-…-0001` | `anthropic/claude-3.5-sonnet` | Mavzuni tahlil qiladi, reja tuzadi |
| Tadqiqotchi | `00000000-…-0002` | `openai/gpt-4o-mini` | Web qidiruv (Tavily/DDG), hisobot yozadi |
| Tanqidchi | `00000000-…-0003` | `openai/gpt-4o-mini` | Hisobot sifatini baholaydi (JSON, 1–10) |
| Ssenarist | `00000000-…-0004` | `anthropic/claude-3.5-sonnet` | To'liq video ssenariy yozadi |
| Dizayner | `00000000-…-0005` | `openai/gpt-4o-mini` | Thumbnail konsepsiyalari va sarlavhalar |

**Pipeline oqimi:** Strateg → Tadqiqotchi → Tanqidchi (↩ agar rad etsa, max 3 round) → Ssenarist → Dizayner → [Inson tasdiqlashi] → DB saqlash → Telegram

---

## Papkalar tuzilmasi

```
AI-Kontent fabrikasi/
├── apps/
│   ├── api/src/
│   │   ├── agents/          ← 5 agent (researchAgent, criticAgent, ...)
│   │   ├── config/env.ts    ← muhit o'zgaruvchilari
│   │   ├── lib/
│   │   │   ├── approvalQueue.ts   ← inson tasdiqlash mexanizmi
│   │   │   ├── openrouter.ts      ← OpenAI SDK → OpenRouter
│   │   │   └── tools/webSearch.ts ← Tavily/DuckDuckGo
│   │   ├── routes/
│   │   │   ├── pipelineStream.ts  ← SSE pipeline (asosiy)
│   │   │   ├── tests.ts           ← GET /api/tests, POST /api/test/validate
│   │   │   ├── runs.ts            ← GET /api/runs
│   │   │   ├── budget.ts          ← GET /api/budget
│   │   │   └── knowledge.ts       ← PDF yuklash
│   │   └── services/
│   │       ├── budget.ts      ← token narxlari, xarajat hisoblash
│   │       ├── telegram.ts    ← Telegram Bot API
│   │       └── testCases.ts   ← 5 ta sifat testi
│   └── web/src/app/
│       ├── page.tsx           ← /  Dashboard
│       ├── agents/page.tsx    ← /agents  Chat UI
│       ├── runs/page.tsx      ← /runs  Roy yugurishlari
│       ├── content/page.tsx   ← /content  Kontent arxivi
│       └── knowledge/page.tsx ← /knowledge  Bilim bazasi
├── db/prisma/
│   ├── schema.prisma          ← Agent, Run, UsageLog, KnowledgeItem...
│   ├── seed.ts                ← 5 agentni bazaga qo'shadi
│   └── migrations/            ← versiyalangan migratsiyalar
├── tests/
│   ├── cases/test-1…5.ts      ← 5 ta sifat testi ta'riflari
│   └── validate.ts            ← tekshiruv mantiqiy
├── scripts/
│   └── backup.sh              ← DB zaxira nusxasi
├── .env                       ← MAXFIY (git'ga tushmasin!)
├── .env.example               ← Namuna (placeholder qiymatlar)
└── CLAUDE.md                  ← ushbu fayl
```

---

## Muhit o'zgaruvchilari (.env)

```env
# Ma'lumotlar bazasi
DATABASE_URL=postgresql://macbookair@localhost:5432/kontent_fabrikasi

# Backend
BACKEND_PORT=4000

# OpenRouter (https://openrouter.ai/keys) — MAJBURIY
OPENROUTER_API_KEY=sk-or-v1-...

# Anthropic (to'g'ridan-to'g'ri, endi ishlatilmaydi)
ANTHROPIC_API_KEY=sk-ant-...

# Qidiruv (ixtiyoriy — yo'q bo'lsa DuckDuckGo ishlatiladi)
TAVILY_API_KEY=

# Telegram (ixtiyoriy)
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=@kanaling

# Byudjet boshlanish miqdori
BUDGET_START_USD=5.00

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:4000
```

---

## Serverlarni ishga tushirish

```bash
# 1. O'rnatish (birinchi marta)
npm install

# 2. .env faylini to'ldirish
cp .env.example .env
# .env ichida kamida OPENROUTER_API_KEY ni to'ldiring

# 3. Baza migratsiyasi va seed
export DATABASE_URL="postgresql://macbookair@localhost:5432/kontent_fabrikasi"
cd db && npx prisma migrate deploy && npx prisma db seed && cd ..

# 4. Ishga tushirish (ikkala server parallel)
npm run dev

# 5. Brauzerda ochish
# http://localhost:3000
```

---

## API endpointlar

| Method | Endpoint | Tavsif |
|---|---|---|
| GET | `/api/health` | Server holati |
| POST | `/api/pipeline/stream` | SSE pipeline (asosiy) |
| POST | `/api/pipeline/approve` | Inson tasdiqlash javobi |
| GET | `/api/runs` | Barcha yugurishlar |
| GET | `/api/budget` | Xarajat statistikasi |
| GET | `/api/tests` | Sifat test holatlari |
| POST | `/api/test/validate` | Test natijasini tekshirish |
| GET | `/api/knowledge` | Bilim bazasi |
| POST | `/api/knowledge/upload` | PDF yuklash |

---

## Muhim qoidalar

1. **Til:** Barcha kod, interfeys, DB yozuvlari, izohlar — 100% O'ZBEK TILIDA (lotin alifbosi)
2. **Xavfsizlik:** `.env` faylini hech qachon git'ga qo'shma
3. **TypeScript:** `any` tipdan qoching, `tsc --noEmit` o'tishi shart
4. **DB:** O'zgarishlar faqat Prisma migratsiyalar orqali
5. **Paketlar:** `npm install --cache /tmp/npm-cache` (xato bo'lsa)
6. **Commit:** har bir muhim o'zgarishdan keyin commit qiling

---

## Sifat nazorati (tests/ papkasi)

5 ta test holati mavjud. Har bir test tekshiradi:
- Ssenariy uzunligi: 1500–2500 so'z
- Til: faqat o'zbek tili (kiril harfi yo'q)
- Sarlavhalar soni: kamida 3 ta
- Muqova g'oyalari: kamida 2 ta

Dashboard'da "🧪 Sifat testlari" bo'limi orqali ishlatiladi.
