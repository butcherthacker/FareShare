/**
 * Message-related type definitions
 */

export interface SendMessageRequest {
  recipient_user_id: string; // UUID
  message: string;
  ride_id?: string; // UUID
}

export interface SendMessageResponse {
  success: boolean;
  message: string;
  sent_to: string;
  sent_at: string;
}

export interface RideParticipant {
  id: string; // UUID
  name: string;
  email?: string; // Optional - only included for admins or when privacy settings allow
  role: 'Driver' | 'Passenger';
}

export interface RideParticipantsResponse {
  ride_id: number;
  ride_details: {
    origin: string;
    destination: string;
    departure_time: string;
  };
  participants: RideParticipant[];
}
