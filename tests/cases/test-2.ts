import type { TestHolat } from "../validate";

const test2: TestHolat = {
  id:     "test-elektr-avtomobil",
  raqam:  2,
  mavzu:  "O'zbekistonda elektr avtomobillari: imkoniyatlar va muammolar",
  tavsif: "BYD, Tesla, Chevrolet Equinox EV — O'zbekiston bozorida elektromobil tendensiyalari",
  mezonlar: {
    minSozlar:        1500,
    maxSozlar:        2500,
    minSarlavhalar:   3,
    minMuqovaGoyalar: 2,
    faqatOzbek:       true,
  },
};

export default test2;
