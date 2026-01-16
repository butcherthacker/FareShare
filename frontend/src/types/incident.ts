/**
 * Incident Report Types
 * Type definitions for the incident reporting system.
 */

export type IncidentCategory = 'safety' | 'harassment' | 'property' | 'other';
export type IncidentStatus = 'open' | 'reviewed' | 'resolved' | 'dismissed';

export interface IncidentUserInfo {
  id: string;
  full_name: string;
}

export interface IncidentRideInfo {
  id: string;
  origin_label: string | null;
  destination_label: string | null;
  departure_time: string;
}

export interface Incident {
  id: string;
  reporter_id: string;
  reported_user_id: string;
  ride_id: string;
  booking_id: string;
  category: IncidentCategory;
  description: string;
  status: IncidentStatus;
  admin_notes?: string;
  created_at: string;
  updated_at: string;
  
  // Nested relationship data
  reporter?: IncidentUserInfo;
  reported_user?: IncidentUserInfo;
  ride?: IncidentRideInfo;
}

export interface IncidentAdminResponse extends Incident {
  admin_notes?: string;
}

export interface CreateIncidentRequest {
  reported_user_id: string;
  ride_id: string;
  booking_id: string;
  category: IncidentCategory;
  description: string;
}

export interface IncidentListResponse {
  incidents: Incident[];
  total: number;
  page: number;
  limit: number;
}

export interface IncidentCommentAuthor {
  id: string;
  full_name: string;
}

export interface IncidentComment {
  id: string;
  incident_id: string;
  author_id: string;
  comment_text: string;
  is_admin_comment: boolean;
  created_at: string;
  updated_at: string;
  author?: IncidentCommentAuthor;
}

export interface CreateIncidentCommentRequest {
  comment_text: string;
}
