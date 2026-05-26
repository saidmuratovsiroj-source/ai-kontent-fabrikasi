// Test holatlari — tests/ papkasidagi ta'riflar bilan bir xil
export type TestHolat = {
  id:     string;
  raqam:  number;
  mavzu:  string;
  tavsif: string;
  mezonlar: {
    minSozlar:        number;
    maxSozlar:        number;
    minSarlavhalar:   number;
    minMuqovaGoyalar: number;
    faqatOzbek:       boolean;
  };
};

export type MezonNatija = {
  nom:           string;
  utdi:          boolean;
  haqiqiyQiymat: string;
  talab:         string;
};

export type ValidationNatija = {
  testId:            string;
  mavzu:             string;
  umummuvaffaqiyat:  boolean;
  mezonlar:          MezonNatija[];
};

// ── 5 ta test holati ──────────────────────────────────────────────────────────
export const TEST_HOLATLARI: TestHolat[] = [
  {
    id:     "test-chatgpt-vs-claude",
    raqam:  1,
    mavzu:  "ChatGPT vs Claude: qaysi sun'iy intellekt yaxshiroq?",
    tavsif: "Ikki yirik AI platformasini solishtirish — imkoniyatlar, narx, foydalanish holatlari",
    mezonlar: { minSozlar: 1500, maxSozlar: 2500, minSarlavhalar: 3, minMuqovaGoyalar: 2, faqatOzbek: true },
  },
  {
    id:     "test-elektr-avtomobil",
    raqam:  2,
    mavzu:  "O'zbekistonda elektr avtomobillari: imkoniyatlar va muammolar",
    tavsif: "BYD, Tesla, Chevrolet Equinox EV — O'zbekiston bozorida elektromobil tendensiyalari",
    mezonlar: { minSozlar: 1500, maxSozlar: 2500, minSarlavhalar: 3, minMuqovaGoyalar: 2, faqatOzbek: true },
  },
  {
    id:     "test-instagram-reels",
    raqam:  3,
    mavzu:  "Instagram Reels algoritmi 2025: qanday viral bo'lish mumkin?",
    tavsif: "Reels ko'rinish mexanizmlari, optimal vaqtlar, hashtag strategiyasi va tahlil vositalari",
    mezonlar: { minSozlar: 1500, maxSozlar: 2500, minSarlavhalar: 3, minMuqovaGoyalar: 2, faqatOzbek: true },
  },
  {
    id:     "test-telegram-biznes",
    raqam:  4,
    mavzu:  "Telegram biznes kanali: 0 dan 10 000 obunachigacha qanday yetish mumkin?",
    tavsif: "Kanaldan pul ishlash strategiyalari, kontent rejasi, reklama va hamkorlik tizimi",
    mezonlar: { minSozlar: 1500, maxSozlar: 2500, minSarlavhalar: 3, minMuqovaGoyalar: 2, faqatOzbek: true },
  },
  {
    id:     "test-ai-marketing",
    raqam:  5,
    mavzu:  "AI bilan marketing xarajatlarini 70% kamaytirdim: real tajriba",
    tavsif: "ChatGPT, Midjourney, Claude yordamida kontent, reklama va SMM jarayonlarini avtomatlashtirish",
    mezonlar: { minSozlar: 1500, maxSozlar: 2500, minSarlavhalar: 3, minMuqovaGoyalar: 2, faqatOzbek: true },
  },
];

// ── Tekshirish mantiq'i ───────────────────────────────────────────────────────
function sozSana(matn: string): number {
  return matn.trim().split(/\s+/).filter(Boolean).length;
}

function kirilBormi(matn: string): boolean {
  return /[Ѐ-ӿ]/.test(matn);
}

function sarlavhaSana(matn: string): number {
  return (matn.match(/^#{1,3}\s.+/gm) ?? []).length;
}

function muqovaGoyaSana(thumbnail: string): number {
  const topildi = (thumbnail.match(/konsepsiya\s*\d+/gi) ?? []).length;
  if (topildi > 0) return topildi;
  return (thumbnail.match(/^##\s/gm) ?? []).length;
}

function inglizJumlaDetect(matn: string): boolean {
  const sozlar = ["\\bthe\\b", "\\bthat\\b", "\\bthis\\b", "\\bthey\\b", "\\btheir\\b",
                  "\\bwhich\\b", "\\bhave\\b", "\\bbeen\\b", "\\bwere\\b", "\\bfrom\\b"];
  const regex = new RegExp(sozlar.join("|"), "gi");
  return (matn.match(regex) ?? []).length > 4;
}

function manbasizStatAniqla(matn: string): { bor: boolean; foizSoni: number } {
  const foizlar = (matn.match(/\d[\d.,]*\s*%/g) ?? []).length;
  if (foizlar < 3) return { bor: false, foizSoni: foizlar };
  const manbaKalimalar = /bo['']yicha|ma['']lumot|tadqiqot|hisobot|manba|manbaga|research|study|survey|ko['']ra|aytiladi/gi;
  const manbalar       = (matn.match(manbaKalimalar) ?? []).length;
  return { bor: manbalar < Math.ceil(foizlar / 2), foizSoni: foizlar };
}

export function tekshir(
  test:      TestHolat,
  script:    string,
  thumbnail: string
): ValidationNatija {
  const m = test.mezonlar;
  const mezonlar: MezonNatija[] = [];

  // 1. Ssenariy uzunligi
  const sozSoni = sozSana(script);
  mezonlar.push({
    nom:           "Ssenariy uzunligi",
    utdi:          sozSoni >= m.minSozlar && sozSoni <= m.maxSozlar,
    haqiqiyQiymat: `${sozSoni} so'z`,
    talab:         `${m.minSozlar}–${m.maxSozlar} so'z`,
  });

  // 2. Kiril (rus) harfi yo'q
  const kirilYoq = !kirilBormi(script) && !kirilBormi(thumbnail);
  mezonlar.push({
    nom:           "Kiril (rus) harfi yo'q",
    utdi:          kirilYoq,
    haqiqiyQiymat: kirilYoq ? "Topilmadi ✓" : "⚠️ Kiril harflari topildi",
    talab:         "Faqat lotin alifbosi",
  });

  // 3. Ingliz jumlalari yo'q
  const inglizBor = inglizJumlaDetect(script) || inglizJumlaDetect(thumbnail);
  mezonlar.push({
    nom:           "Ingliz jumlasi yo'q",
    utdi:          !inglizBor,
    haqiqiyQiymat: inglizBor ? "⚠️ Ingliz jumla belgilari topildi" : "Topilmadi ✓",
    talab:         "Faqat o'zbek tili + texnik atamalar",
  });

  // 4. Sarlavhalar soni
  const sarlavhaSoni = sarlavhaSana(script);
  mezonlar.push({
    nom:           "Sarlavhalar soni",
    utdi:          sarlavhaSoni >= m.minSarlavhalar,
    haqiqiyQiymat: `${sarlavhaSoni} ta`,
    talab:         `kamida ${m.minSarlavhalar} ta`,
  });

  // 5. Muqova g'oyalari soni
  const muqovaSoni = muqovaGoyaSana(thumbnail);
  mezonlar.push({
    nom:           "Muqova g'oyalari",
    utdi:          muqovaSoni >= m.minMuqovaGoyalar,
    haqiqiyQiymat: `${muqovaSoni} ta`,
    talab:         `kamida ${m.minMuqovaGoyalar} ta`,
  });

  // 6. Statistikalar asosli
  const statNatija = manbasizStatAniqla(script);
  mezonlar.push({
    nom:           "Statistikalar asosli",
    utdi:          !statNatija.bor,
    haqiqiyQiymat: statNatija.bor
      ? `⚠️ ${statNatija.foizSoni} ta foiz — manba yetarli emas`
      : statNatija.foizSoni > 0
        ? `${statNatija.foizSoni} ta foiz — manbalar bor ✓`
        : "Foiz statistika topilmadi ✓",
    talab:         "Har bir % ko'rsatkich manba bilan",
  });

  return {
    testId:           test.id,
    mavzu:            test.mavzu,
    umummuvaffaqiyat: mezonlar.every((n) => n.utdi),
    mezonlar,
  };
}
