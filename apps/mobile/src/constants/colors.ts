export const DarkColors = {
  bg: '#0C0C0C',
  surface: '#1A1A1A',
  surfaceHigh: '#222222',
  border: '#2A2A2A',
  primary: '#3182F6',
  primaryDim: '#1A3D7A',
  textPrimary: '#FFFFFF',
  textSecondary: '#8E8E93',
  textTertiary: '#48484A',
  tabBar: '#111111',
  tabBarBorder: '#2A2A2A',
  bookmark: '#F59E0B',
  searchBg: '#1C1C1E',
  success: '#34C759',
  danger: '#FF3B30',
} as const;

export const LightColors = {
  bg: '#F9FAFB',
  surface: '#FFFFFF',
  surfaceHigh: '#FFFFFF',
  border: '#E5E7EB',
  primary: '#3182F6',
  primaryDim: '#EFF6FF',
  textPrimary: '#111827',
  textSecondary: '#6B7280',
  textTertiary: '#D1D5DB',
  tabBar: '#FFFFFF',
  tabBarBorder: '#E5E7EB',
  bookmark: '#F59E0B',
  searchBg: '#F3F4F6',
  success: '#34C759',
  danger: '#FF3B30',
} as const;

// Legacy alias — kept for backward compatibility during migration
export const Colors = DarkColors;
