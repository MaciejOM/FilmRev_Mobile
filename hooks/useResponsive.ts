import { useWindowDimensions } from "react-native";

// Centralny hook odpowiadający za responsywność (RWD) całej aplikacji.
export function useResponsive() {
  const { width, height } = useWindowDimensions();

  // Tablety (szerokość >= 600px) dostają 4 kolumny siatki, telefony 3.
  const isTablet = width >= 600;

  const numGridColumns = isTablet ? 4 : 3;

  const backdropHeight = Math.round(height * 0.45);

  // Liczy dokładną szerokość kafelka w pikselach,
  // uwzględniając padding i odstępy, dzięki czemu siatka nie rozjeżdża się na tabletach.
  const gridItemWidth = (
    paddingH: number,
    gap: number,
    cols = numGridColumns,
  ) => (width - paddingH * 2 - gap * (cols - 1)) / cols;

  return {
    width,
    height,
    isTablet,
    numGridColumns,
    backdropHeight,
    gridItemWidth,
  };
}
