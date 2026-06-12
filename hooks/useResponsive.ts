import { useWindowDimensions } from "react-native";

/**
 * Centralised responsive values derived from the current window size.
 * Orientation is locked to portrait, so width is constant per device —
 * but values still adapt correctly across phone sizes and tablets.
 */
export function useResponsive() {
  const { width, height } = useWindowDimensions();

  const isTablet = width >= 600;

  // Number of columns for poster grids (3 on phones, 4 on tablets)
  const numGridColumns = isTablet ? 4 : 3;

  // Backdrop height for film detail header (45 % of screen height)
  const backdropHeight = Math.round(height * 0.45);

  /**
   * Calculates the exact pixel width for a single grid item so items fill
   * the row precisely regardless of column count or padding.
   *
   * @param paddingH  horizontal padding on BOTH sides of the grid container
   * @param gap       gap between columns
   * @param cols      override column count (defaults to numGridColumns)
   */
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
