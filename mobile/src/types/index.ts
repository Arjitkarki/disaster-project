export type Severity = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
export type Lifecycle = 'REPORTED' | 'VERIFIED' | 'ACTIVE' | 'RESOLVED';

export interface Zone {
  id: string;
  name: string;
  district: string;
  municipality?: string;
}

export interface Incident {
  id: string;
  title: string;
  description: string;
  severity: Severity;
  lifecycle: Lifecycle;
  zone: Zone;
  latitude: number;
  longitude: number;
  reported_at: string;
  updated_at: string;
}

export interface ReportCreate {
  description: string;
  latitude: number;
  longitude: number;
  image_url?: string;
}

export interface ReportResponse {
  id: string;
  description: string;
  latitude: number;
  longitude: number;
  image_url?: string;
  submitted_at: string;
  lifecycle: Lifecycle;
}
