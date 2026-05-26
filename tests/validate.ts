// ── Test uchun umumiy tiplar ──────────────────────────────────────────────────
export type TestHolat = {
  id:     string;
  raqam:  number;
  mavzu:  string;
  tavsif: string;
  mezonlar: {
    minSozlar:         number;
    maxSozlar:         number;
    minSarlavhalar:    number;
    minMuqovaGoyalar:  number;
    faqatOzbek:        boolean;
  };
};

export type MezonNatija = {
  nom:            string;
  utdi:           boolean;
  haqiqiyQiymat:  string;
  talab:          string;
};

export type ValidationNatija = {
  testId:            string;
  mavzu:             string;
  umummuvaffaqiyat:  boolean;
  mezonlar:          MezonNatija[];
};

// ── Yordamchi funksiyalar ─────────────────────────────────────────────────────
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

// Ingliz jumlalari aniqlash (texnik atamalar emas, jumlalar)
function inglizJumlaDetect(matn: string): boolean {
  // Faqat o'zbek matinda uchramaydigan ingliz funksional so'zlari
  const sozlar = ["\\bthe\\b", "\\bthat\\b", "\\bthis\\b", "\\bthey\\b", "\\btheir\\b",
                  "\\bwhich\\b", "\\bhave\\b", "\\bbeen\\b", "\\bwere\\b", "\\bfrom\\b"];
  const regex = new RegExp(sozlar.join("|"), "gi");
  return (matn.match(regex) ?? []).length > 4;
}

// Manbasisz foiz statistikalarni aniqlash
function manbasizStatAniqla(matn: string): { bor: boolean; foizSoni: number } {
  const foizlar = (matn.match(/\d[\d.,]*\s*%/g) ?? []).length;
  if (foizlar < 3) return { bor: false, foizSoni: foizlar };
  const manbaKalimalar = /bo['']yicha|ma['']lumot|tadqiqot|hisobot|manba|manbaga|research|study|survey|ko['']ra|aytiladi/gi;
  const manbalar       = (matn.match(manbaKalimalar) ?? []).length;
  return { bor: manbalar < Math.ceil(foizlar / 2), foizSoni: foizlar };
}

// ── Asosiy tekshirish funksiyasi ──────────────────────────────────────────────
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

  // 6. Statistikalar asosli (foiz ko'rsatkichlari manba bilan)
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
