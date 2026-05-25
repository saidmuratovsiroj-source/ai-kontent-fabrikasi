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
  // "KONSEPSIYA N" yoki "## ... N" shaklini qidiradi
  const topildi = (thumbnail.match(/konsepsiya\s*\d+/gi) ?? []).length;
  if (topildi > 0) return topildi;
  // Fallback: thumbnail ichidagi ## sarlavhalarini sana
  return (thumbnail.match(/^##\s/gm) ?? []).length;
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

  // 2. Faqat o'zbek tili (kiril harfi yo'q)
  const kirilYoq = !kirilBormi(script) && !kirilBormi(thumbnail);
  mezonlar.push({
    nom:           "Faqat o'zbek tili",
    utdi:          kirilYoq,
    haqiqiyQiymat: kirilYoq ? "Kiril harfi topilmadi ✓" : "⚠️ Kiril harflari topildi",
    talab:         "Faqat lotin alifbosi",
  });

  // 3. Sarlavhalar soni
  const sarlavhaSoni = sarlavhaSana(script);
  mezonlar.push({
    nom:           "Sarlavhalar soni",
    utdi:          sarlavhaSoni >= m.minSarlavhalar,
    haqiqiyQiymat: `${sarlavhaSoni} ta`,
    talab:         `kamida ${m.minSarlavhalar} ta`,
  });

  // 4. Muqova g'oyalari soni
  const muqovaSoni = muqovaGoyaSana(thumbnail);
  mezonlar.push({
    nom:           "Muqova g'oyalari",
    utdi:          muqovaSoni >= m.minMuqovaGoyalar,
    haqiqiyQiymat: `${muqovaSoni} ta`,
    talab:         `kamida ${m.minMuqovaGoyalar} ta`,
  });

  return {
    testId:           test.id,
    mavzu:            test.mavzu,
    umummuvaffaqiyat: mezonlar.every((n) => n.utdi),
    mezonlar,
  };
}
