// utils/formatters.ts

// Funkcja do skracania długich tekstów (np. recenzji lub opisów filmów)
export const truncateText = (text: string, maxLength: number): string => {
  if (!text) return "";
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + "...";
};

// Funkcja do ładnego formatowania oceny (np. 4.5/5)
export const formatRating = (rating: number | undefined | null): string => {
  if (!rating || rating === 0) return "Brak ocen";
  return `${rating.toFixed(1)}/5 ★`;
};
