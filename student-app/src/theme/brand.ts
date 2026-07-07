export const brandColors = {
  primary: '#0B9444',
  primaryDark: '#087437',
  primaryLight: '#E7F6EC',
  primarySoft: '#F3FBF5',
  background: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceMuted: '#F7F9F7',
  textPrimary: '#1A1F1B',
  textSecondary: '#66706A',
  border: '#DCE6DF',
  success: '#0B9444',
  danger: '#D14343',
  warning: '#C98A16',
  kakao: '#FEE500',
  kakaoText: '#171717',
} as const;

export const brand = {
  colors: brandColors,
  radius: {
    card: 20,
    button: 16,
    pill: 999,
  },
} as const;
