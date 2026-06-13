import { useWindowDimensions } from "react-native";

export function useResponsive() {
  const { width, height } = useWindowDimensions();

  const isTablet = width >= 600;

  const numGridColumns = isTablet ? 4 : 3;

  const backdropHeight = Math.round(height * 0.45);

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
