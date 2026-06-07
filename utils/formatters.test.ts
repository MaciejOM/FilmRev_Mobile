// utils/__tests__/formatters.test.ts
import { formatRating, truncateText } from "@/utils/formatters";

describe("Funkcje formatujące (formatters.ts)", () => {
  describe("truncateText", () => {
    it("dodaje wielokropek, gdy tekst przekracza limit", () => {
      const longText = "Bardzo długi opis filmu o superbohaterach";
      expect(truncateText(longText, 12)).toBe("Bardzo długi...");
    });

    it("zwraca oryginalny tekst, jeśli jest krótszy niż limit", () => {
      expect(truncateText("Krótki", 10)).toBe("Krótki");
    });

    it("obsługuje pusty string bez wyrzucania błędu", () => {
      expect(truncateText("", 10)).toBe("");
    });
  });

  describe("formatRating", () => {
    it("formuje liczbę do jednego miejsca po przecinku", () => {
      expect(formatRating(4)).toBe("4.0/5 ★");
      expect(formatRating(3.5)).toBe("3.5/5 ★");
    });

    it('zwraca "Brak ocen" dla oceny 0 lub wartości null', () => {
      expect(formatRating(0)).toBe("Brak ocen");
      expect(formatRating(null)).toBe("Brak ocen");
    });
  });
});
