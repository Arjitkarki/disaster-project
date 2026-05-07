import { Severity, Lifecycle } from '../types';

export const SeverityColors: Record<Severity, string> = {
  LOW: '#16A34A',
  MODERATE: '#D97706',
  HIGH: '#EA580C',
  CRITICAL: '#DC2626',
};

export const LifecycleColors: Record<Lifecycle, string> = {
  REPORTED: '#6B7280',
  VERIFIED: '#2563EB',
  ACTIVE: '#DC2626',
  RESOLVED: '#16A34A',
};

export const LightTheme = {
  bg:             '#F9FAFB',
  card:           '#FFFFFF',
  text:           '#111827',
  subtext:        '#6B7280',
  muted:          '#9CA3AF',
  border:         '#E5E7EB',
  pillBorder:     '#D1D5DB',
  sectionTitle:   '#374151',
  tipText:        '#374151',
  statLabel:      '#6B7280',
  activePillBg:   '#111827',
  activePillText: '#FFFFFF',
  inputBg:        '#FFFFFF',
  inputBorder:    '#E5E7EB',
  inputText:      '#111827',
  sheetBg:        '#FFFFFF',
  sheetCloseBg:   '#F3F4F6',
  searchBg:       '#FFFFFF',
  zoomBtnBg:      '#FFFFFF',
  zoomBtnText:    '#374151',
};

export const DarkTheme = {
  bg:             '#0F172A',
  card:           '#1E293B',
  text:           '#F1F5F9',
  subtext:        '#94A3B8',
  muted:          '#64748B',
  border:         '#334155',
  pillBorder:     '#475569',
  sectionTitle:   '#CBD5E1',
  tipText:        '#CBD5E1',
  statLabel:      '#94A3B8',
  activePillBg:   '#F1F5F9',
  activePillText: '#0F172A',
  inputBg:        '#1E293B',
  inputBorder:    '#334155',
  inputText:      '#F1F5F9',
  sheetBg:        '#1E293B',
  sheetCloseBg:   '#374151',
  searchBg:       '#1E293B',
  zoomBtnBg:      '#1E293B',
  zoomBtnText:    '#CBD5E1',
};

export type AppTheme = typeof LightTheme;
