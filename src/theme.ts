export const colors = {
  // 파스텔 메인 컬러
  primary: "#A8C5DA",        // 파스텔 블루
  primaryDark: "#7AAFC4",    // 진한 파스텔 블루
  primaryLight: "#D6EAF4",   // 연한 파스텔 블루

  secondary: "#F4A8C0",      // 파스텔 핑크
  secondaryLight: "#FDE0EA", // 연한 파스텔 핑크

  accent: "#A8DAC5",         // 파스텔 그린
  accentLight: "#D6F4EA",    // 연한 파스텔 그린

  yellow: "#F4D9A8",         // 파스텔 옐로우
  yellowLight: "#FDF0D6",    // 연한 파스텔 옐로우

  // 중립
  white: "#FFFFFF",
  background: "#F7F9FC",     // 배경
  card: "#FFFFFF",
  border: "#E8EEF4",
  divider: "#EEF2F7",

  // 텍스트
  text: "#1A2332",
  textSecondary: "#6B7A8D",
  textTertiary: "#9AAAB8",

  // 상태
  danger: "#F47B7B",
  dangerLight: "#FDE8E8",
  success: "#7BC4A0",
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
};

export const typography = {
  heading1: { fontSize: 26, fontWeight: "900" as const, color: "#1A2332" },
  heading2: { fontSize: 20, fontWeight: "800" as const, color: "#1A2332" },
  heading3: { fontSize: 16, fontWeight: "700" as const, color: "#1A2332" },
  body: { fontSize: 14, fontWeight: "400" as const, color: "#1A2332" },
  caption: { fontSize: 12, fontWeight: "400" as const, color: "#6B7A8D" },
  label: { fontSize: 13, fontWeight: "600" as const, color: "#6B7A8D" },
};