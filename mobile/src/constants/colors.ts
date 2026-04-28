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
