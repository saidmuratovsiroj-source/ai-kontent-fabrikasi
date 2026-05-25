# AI Kontent Fabrikasi 🎬

YouTube kontent ishlab chiqarishni avtomatlashtiruvchi tizim. Mavzuni kiriting — tizim 5 ta AI agent yordamida tadqiqot o'tkazadi, video ssenariy yozadi va thumbnail g'oyalari tayyorlaydi. Barcha natijalar Telegram kanalingizga avtomatik yuboriladi.

---

## Talablar

- **Node.js** 20 yoki undan yuqori
- **PostgreSQL** 18 (macOS uchun [Postgres.app](https://postgresapp.com) tavsiya etiladi)
- **OpenRouter API kaliti** — [openrouter.ai/keys](https://openrouter.ai/keys) dan oling (bepul $5 kredit bilan boshlanadi)
- Ixtiyoriy: Tavily API kaliti (qidiruv sifati uchun), Telegram bot tokeni

---

## Noldan ishga tushirish (5 qadam)

**1. Repozitoriyani klonlash va o'rnatish**
```bash
git clone https://github.com/saidmuratovsiroj-source/ai-kontent-fabrikasi.git
cd ai-kontent-fabrikasi
npm install
```

**2. Muhit o'zgaruvchilarini sozlash**
```bash
cp .env.example .env
```
`.env` faylini oching va kamida quyidagini to'ldiring:
```
DATABASE_URL=postgresql://FOYDALANUVCHI@localhost:5432/kontent_fabrikasi
OPENROUTER_API_KEY=sk-or-v1-...
```

**3. Ma'lumotlar bazasini tayyorlash**
```bash
export DATABASE_URL="postgresql://FOYDALANUVCHI@localhost:5432/kontent_fabrikasi"
psql -c "CREATE DATABASE kontent_fabrikasi;"   # bazani yarating
cd db
npx prisma migrate deploy                       # jadvallarni yarating
npx prisma db seed                              # 5 agentni qo'shing
cd ..
```

**4. Serverlarni ishga tushirish**
```bash
npm run dev
```
Bu buyruq frontend (port 3000) va backend (port 4000) ni bir vaqtda ishga tushiradi.

**5. Brauzerda ochish**
```
http://localhost:3000
```

---

## Qanday ishlatish

**Asosiy jarayon:**
1. **Roy yugurishlari** sahifasiga o'ting (`/runs`)
2. Mavzu kiriting, masalan: *"Instagram reels algoritmi 2025"*
3. Ixtiyoriy: byudjet chegarasi belgilang ($0.10–$5.00)
4. **"Ishga tushirish"** tugmasini bosing
5. 5 agentning real-time ishlashini kuzating
6. Dizayner tugagach "Tasdiqlash" yoki "Bekor qilish" ni tanlang
7. Tasdiqlansangiz — ssenariy va thumbnail Telegram kanalingizga yuboriladi

**Sifat testlari:**
- Dashboard (`/`) sahifasida "🧪 Sifat testlari" bo'limini oching
- 5 ta tayyor mavzudan birini tanlang
- Pipeline ishlaydi va natija avtomatik tekshiriladi

---

## Mavjud sahifalar

| Sahifa | URL | Tavsif |
|---|---|---|
| Dashboard | `/` | Tizim holati, byudjet, sifat testlari |
| Agentlar | `/agents` | Strateg bilan chat |
| Roy yugurishlari | `/runs` | Yangi pipeline ishga tushirish |
| Kontent arxivi | `/content` | Barcha yaratilgan kontentlar |
| Bilim bazasi | `/knowledge` | PDF hujjat yuklash |

---

## Xarajat taxminlari

Bitta to'liq pipeline (tadqiqot + ssenariy + thumbnail):
- **~$0.05–$0.15** (OpenRouter narxlarida, 2025)
- Tadqiqotchi + Tanqidchi + Dizayner: `gpt-4o-mini` ($0.15/1M token)
- Strateg + Ssenarist: `claude-3.5-sonnet` ($3/1M token)

---

## Zaxira nusxa

```bash
npm run backup
```
`backups/YYYY-MM-DD.sql` faylida saqlanadi.

---

## Litsenziya

Shaxsiy foydalanish uchun. Savol va takliflar uchun: [GitHub Issues](https://github.com/saidmuratovsiroj-source/ai-kontent-fabrikasi/issues)
