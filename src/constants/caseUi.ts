/**
 * CASE Delivery premium UI tokens
 * Orange brand, white surfaces, soft elevation — campus quick commerce
 */
export const CaseUi = {
  orange: '#FF5A00',
  orangeSoft: '#FFF1E8',
  orangeDeep: '#E04E00',
  orangeGlow: 'rgba(255,90,0,0.18)',
  ink: '#0F0F0F',
  muted: '#6F6F6F',
  line: '#ECECEC',
  field: '#F6F6F6',
  white: '#FFFFFF',
  success: '#16A34A',
  successSoft: '#DCFCE7',
  danger: '#DC2626',
  radius: {
    sm: 10,
    md: 14,
    lg: 18,
    xl: 22,
    xxl: 28,
    pill: 999,
  },
  cardShadow: {
    shadowColor: '#0F0F0F',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  softShadow: {
    shadowColor: '#0F0F0F',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  liftShadow: {
    shadowColor: '#FF5A00',
    shadowOpacity: 0.22,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
} as const;

/** Keep Blinkit alias for gradual migration */
export const Blinkit = {
  green: CaseUi.success,
  greenSoft: CaseUi.successSoft,
  yellow: CaseUi.orange,
  yellowSoft: CaseUi.orangeSoft,
  tagBg: CaseUi.orangeSoft,
  cardBorder: CaseUi.line,
  softGrey: CaseUi.field,
  muted: CaseUi.muted,
  ink: CaseUi.ink,
  searchShadow: CaseUi.softShadow,
  cardShadow: CaseUi.cardShadow,
  pillTab: CaseUi.cardShadow,
} as const;
