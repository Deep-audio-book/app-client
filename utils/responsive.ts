import { useWindowDimensions } from "react-native";

const BASE_WIDTH = 390;
const BASE_HEIGHT = 844;

export function useResponsive() {
  const { width, height } = useWindowDimensions();

  const scale = width / BASE_WIDTH;
  const verticalScale = height / BASE_HEIGHT;

  return {
    width,
    height,
    scale,
    verticalScale,
  };
}