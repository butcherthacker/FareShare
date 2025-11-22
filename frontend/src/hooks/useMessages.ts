/**
 * Custom hook for messaging functionality
 * Allows users to send messages via email to ride participants
 */

import { useState } from 'react';
import { apiRequest } from '../utils/api';
import type { SendMessageRequest, SendMessageResponse, RideParticipantsResponse } from '../types/message';

export const useMessages = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Send a message to another user via email
   */
  const sendMessage = async (
    recipientUserId: string,
    message: string,
    rideId?: string
  ): Promise<SendMessageResponse | null> => {
    setLoading(true);
    setError(null);

    try {
      const requestData: SendMessageRequest = {
        recipient_user_id: recipientUserId,
        message,
        ...(rideId && { ride_id: rideId })
      };

      console.log('Sending message with data:', requestData);
      console.log('recipientUserId type:', typeof recipientUserId, 'value:', recipientUserId);

      const response = await apiRequest<SendMessageResponse>(
        '/api/messages/send',
        {
          method: 'POST',
          body: JSON.stringify(requestData)
        }
      );

      return response;
    } catch (err: any) {
      // Handle validation errors (detail is an array)
      let errorMessage = 'Failed to send message';
      
      if (err.detail) {
        if (Array.isArray(err.detail)) {
          // FastAPI validation errors - extract first error message
          errorMessage = err.detail[0]?.msg || errorMessage;
        } else if (typeof err.detail === 'string') {
          errorMessage = err.detail;
        }
      }
      
      setError(errorMessage);
      console.error('Error sending message:', err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Get list of participants you can message for a specific ride
   */
  const getRideParticipants = async (
    rideId: number
  ): Promise<RideParticipantsResponse | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiRequest<RideParticipantsResponse>(
        `/api/messages/ride-participants/${rideId}`,
        {
          method: 'GET'
        }
      );

      return response;
    } catch (err: any) {
      // Handle validation errors (detail is an array)
      let errorMessage = 'Failed to get ride participants';
      
      if (err.detail) {
        if (Array.isArray(err.detail)) {
          // FastAPI validation errors - extract first error message
          errorMessage = err.detail[0]?.msg || errorMessage;
        } else if (typeof err.detail === 'string') {
          errorMessage = err.detail;
        }
      }
      
      setError(errorMessage);
      console.error('Error getting ride participants:', err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Clear any error messages
   */
  const clearError = () => {
    setError(null);
  };

  return {
    sendMessage,
    getRideParticipants,
    loading,
    error,
    clearError
  };
};
