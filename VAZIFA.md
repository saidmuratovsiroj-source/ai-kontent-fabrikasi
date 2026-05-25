# AI Kontent Fabrikasi — Loyiha Vazifasi (Рой агентов)

---

## Loyiha nomi
**AI Kontent Fabrikasi** — YouTube uchun sun'iy intellekt yordamida kontent ishlab chiqarish tizimi (Agent Swarm).

---

## Kiruvchi ma'lumot (Вход)
Foydalanuvchi tomonidan beriladigan:
- YouTube video mavzusi yoki g'oya
- Maqsadli auditoriya haqida qisqacha ma'lumot
- Qo'shimcha ko'rsatmalar (ixtiyoriy)

## Chiquvchi ma'lumot (Выход)
Tizim avtomatik ravishda quyidagilarni tayyorlaydi:

| # | Natija | Javobgar agent |
|---|---|---|
| 1 | **To'liq Research (Tadqiqot)** — mavzu bo'yicha faktlar, statistika, raqobatchilar tahlili | Research Agent |
| 2 | **Video Strukturasi** — kirish, asosiy qism, xulosa, CTA | Стратег |
| 3 | **Tayyor Ssenariy** — to'liq, ovoz berish uchun tayyor matn | Scenarist |
| 4 | **Oblojka Konsepsiyasi** — sarlavha, rang sxemasi, vizual g'oya | Dizayner |
| 5 | **Telegram Postlari** — video e'loni + 3 ta qo'shimcha post | Scenarist |

---

## Agentlar ro'yxati

### 1. Стратег (Orkestrator / Планировщик)
- **Rol:** Barcha agentlarni boshqaradi, ish tartibini belgilaydi
- **Vazifa:** Foydalanuvchi so'rovini qabul qilib, rejani tuzadi va vazifalarni taqsimlaydi
- **Til:** Rus tili
- **Model:** `claude-opus-4-7`
- **Holat:** ✅ Bazada mavjud

### 2. Research Agent (Tadqiqotchi)
- **Rol:** Mavzu bo'yicha chuqur qidiruv va tahlil
- **Vazifa:** Faktlar, statistika, manba yig'ish, raqobatchilar videolarini tahlil qilish
- **Til:** Rus tili
- **Model:** `claude-sonnet-4-6`
- **Holat:** 🔲 Yaratilishi kerak

### 3. Critic (Kritik)
- **Rol:** Sifat nazorati
- **Vazifa:** Research va ssenariyni tekshirish, zaif joylarni aniqlash, yaxshilash takliflari
- **Til:** Rus tili
- **Model:** `claude-sonnet-4-6`
- **Holat:** 🔲 Yaratilishi kerak

### 4. Scenarist (Stsenariychi)
- **Rol:** Kontent yozuvchi
- **Vazifa:** Research asosida video ssenariy va Telegram postlari yozish
- **Til:** Rus tili
- **Model:** `claude-opus-4-7`
- **Holat:** 🔲 Yaratilishi kerak

### 5. Designer (Dizayner)
- **Rol:** Vizual konsepsiya
- **Vazifa:** Oblojka g'oyasi, sarlavha varianlari, rang va kompozitsiya tavsiyalari
- **Til:** Rus tili
- **Model:** `claude-sonnet-4-6`
- **Holat:** 🔲 Yaratilishi kerak

---

## Swarm ish jarayoni (Pipeline)

```
Foydalanuvchi (g'oya/mavzu)
        │
        ▼
  [Стратег] ← reja tuzadi
        │
        ├──▶ [Research Agent] → tadqiqot natijasi
        │           │
        │           ▼
        │      [Critic] → tekshiruv + tuzatish
        │           │
        ▼           ▼
  [Scenarist] ← research + kritika asosida
        │
        ├──▶ Video ssenariy
        ├──▶ Telegram postlari
        │
        ▼
  [Designer] → oblojka konsepsiyasi
        │
        ▼
  [Стратег] → yakuniy yig'ish va foydalanuvchiga taqdim
```

---

## O'zbekcha interfeys qoidalari

1. **Navigatsiya va tugmalar** — O'zbek tilida (Boshqaruv paneli, Agentlar, Kontent, Sozlamalar)
2. **Texnik xabarlar va xatolar** — O'zbek tilida
3. **Agent javobi** — Rus tilida (agentlar faqat rus tilida ishlaydi)
4. **Kod va API** — Ingliz tilida (standart)
5. **Sana formati** — `DD.MM.YYYY` (O'zbekiston standarti)

---

## Texnologiyalar

| Qatlam | Texnologiya |
|---|---|
| Frontend | Next.js 14, TypeScript, Tailwind CSS |
| Backend | Node.js + Express, TypeScript |
| Ma'lumotlar bazasi | PostgreSQL + Prisma ORM |
| AI | Anthropic Claude API |
| Monorepo | npm Workspaces + Turborepo |

---

## Bajarilganlar va keyingi qadamlar

### ✅ Tugallangan
- Monorepo strukturasi
- Express backend (`/api/health`, `/api/chat`)
- Next.js frontend (dashboard, sidebar, chat UI)
- PostgreSQL baza + Prisma migratsiyasi
- Стратег agenti (bazada, chat orqali ishlaydi)

### 🔲 Keyingi qadamlar
1. Research Agent — bazaga qo'shish + endpoint
2. Critic Agent — bazaga qo'shish + endpoint
3. Scenarist Agent — bazaga qo'shish + endpoint
4. Designer Agent — bazaga qo'shish + endpoint
5. Swarm Pipeline — agentlarni birlashtiruvchi orkestratsiya logikasi
6. `POST /api/run` — to'liq pipeline endpoint
7. Frontend — pipeline natijalarini ko'rsatuvchi sahifa
