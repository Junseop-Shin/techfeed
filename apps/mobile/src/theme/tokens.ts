export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const typography = {
  h1: { fontSize: 22, fontWeight: '700' as const, lineHeight: 30 },
  h2: { fontSize: 19, fontWeight: '700' as const, lineHeight: 26 },
  h3: { fontSize: 16, fontWeight: '600' as const, lineHeight: 22 },
  body: { fontSize: 15, fontWeight: '400' as const, lineHeight: 22 },
  bodySmall: { fontSize: 14, fontWeight: '400' as const, lineHeight: 20 },
  caption: { fontSize: 12, fontWeight: '400' as const, lineHeight: 16 },
  label: { fontSize: 11, fontWeight: '500' as const, lineHeight: 15 },
} as const;

export const radius = {
  sm: 4,
  md: 8,
  lg: 12,
  pill: 20,
} as const;

export const TYPE_BADGE_COLORS: Record<string, string> = {
  blog: '#3B82F6',
  youtube: '#EF4444',
  job: '#22C55E',
};
