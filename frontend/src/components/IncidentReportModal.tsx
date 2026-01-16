/**
 * IncidentReportModal Component
 * Modal dialog for reporting incidents between users with confirmed bookings
 */

import { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import type { IncidentCategory } from '../types';

interface IncidentReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportedUser: {
    id: string;
    name: string;
    role: 'driver' | 'passenger';
  };
  rideId: string;
  bookingId: string;
  onSubmit: (category: IncidentCategory, description: string) => Promise<void>;
  loading: boolean;
  error: string | null;
}

const categories: { value: IncidentCategory; label: string; description: string }[] = [
  {
    value: 'safety',
    label: 'Safety Concern',
    description: 'Dangerous driving, vehicle safety issues, or threatening behavior'
  },
  {
    value: 'harassment',
    label: 'Harassment',
    description: 'Inappropriate comments, unwanted advances, or hostile behavior'
  },
  {
    value: 'property',
    label: 'Property Damage/Theft',
    description: 'Damage to personal belongings or vehicle, theft, or vandalism'
  },
  {
    value: 'other',
    label: 'Other',
    description: 'Other concerns not covered by the above categories'
  }
];

export default function IncidentReportModal({
  isOpen,
  onClose,
  reportedUser,
  rideId,
  bookingId,
  onSubmit,
  loading,
  error
}: IncidentReportModalProps) {
  const [selectedCategory, setSelectedCategory] = useState<IncidentCategory>('safety');
  const [description, setDescription] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!description.trim() || description.trim().length < 10) {
      return;
    }

    await onSubmit(selectedCategory, description.trim());
    setSubmitted(true);
    
    // Close modal after short delay if successful
    setTimeout(() => {
      if (!error) {
        handleClose();
      }
    }, 1500);
  };

  const handleClose = () => {
    setSelectedCategory('safety');
    setDescription('');
    setSubmitted(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              zIndex: 1090,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                width: '90%',
                maxWidth: '600px',
                maxHeight: '90vh',
                overflow: 'auto',
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                backdropFilter: 'blur(8px)',
              }}
              className="rounded-xl shadow-2xl"
            >
              <div className="bg-white rounded-xl shadow-2xl" style={{ backgroundColor: 'transparent' }}>
              {/* Header */}
              <div className="bg-red-600 text-white px-6 py-4 rounded-t-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-6 h-6" />
                  <h2 className="text-xl font-bold">Report Incident</h2>
                </div>
                <button
                  onClick={handleClose}
                  className="text-white hover:bg-red-700 rounded-full p-1 transition-colors"
                  aria-label="Close modal"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6">
                {submitted && !error ? (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">Report Submitted</h3>
                    <p className="text-gray-600">
                      Your incident report has been submitted and will be reviewed by our team.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit}>
                    {/* Warning Notice */}
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                      <p className="text-sm text-yellow-800">
                        <strong>Important:</strong> Incident reports are taken seriously and reviewed by our team. 
                        Please only file reports for legitimate safety or conduct concerns.
                      </p>
                    </div>

                    {/* Reported User Info */}
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Reporting About
                      </label>
                      <div className="bg-gray-50 rounded-lg p-3 flex items-center gap-3">
                        <div className="w-10 h-10 bg-linear-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
                          {reportedUser.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{reportedUser.name}</p>
                          <p className="text-sm text-gray-600 capitalize">{reportedUser.role}</p>
                        </div>
                      </div>
                    </div>

                    {/* Category Selection */}
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        Incident Category *
                      </label>
                      <div className="space-y-2">
                        {categories.map((cat) => (
                          <label
                            key={cat.value}
                            className="flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all"
                            style={{
                              borderColor: selectedCategory === cat.value ? '#dc2626' : 'var(--color-secondary)',
                              backgroundColor: selectedCategory === cat.value ? '#fef2f2' : 'white'
                            }}
                          >
                            <input
                              type="radio"
                              name="category"
                              value={cat.value}
                              checked={selectedCategory === cat.value}
                              onChange={(e) => setSelectedCategory(e.target.value as IncidentCategory)}
                              className="mt-1"
                            />
                            <div className="flex-1">
                              <p className="font-semibold text-gray-900">{cat.label}</p>
                              <p className="text-sm text-gray-600">{cat.description}</p>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Description */}
                    <div className="mb-6">
                      <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                        Description * (minimum 10 characters)
                      </label>
                      <textarea
                        id="description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Please provide detailed information about what happened..."
                        rows={6}
                        className="w-full px-4 py-3 border rounded-lg resize-none focus:outline-none focus:ring-2"
                        style={{
                          borderColor: 'var(--color-secondary)',
                          minHeight: '150px'
                        }}
                        required
                        minLength={10}
                        maxLength={2000}
                      />
                      <div className="flex justify-between mt-2">
                        <p className="text-sm text-gray-500">
                          {description.length < 10 && description.length > 0
                            ? `${10 - description.length} more characters required`
                            : ''}
                        </p>
                        <p className="text-sm text-gray-500">{description.length}/2000</p>
                      </div>
                    </div>

                    {/* Error Message */}
                    {error && (
                      <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
                        <p className="text-sm text-red-800">{error}</p>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-3 mt-6">
                      <button
                        type="button"
                        onClick={handleClose}
                        className="flex-1 px-4 py-2 rounded-lg font-semibold hover:opacity-90"
                        style={{
                          border: '1px solid var(--color-secondary)',
                          color: 'var(--color-primary)'
                        }}
                        disabled={loading}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={loading || !description.trim() || description.trim().length < 10}
                        className="flex-1 px-4 py-2 rounded-lg font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
                        style={{ backgroundColor: '#dc2626' }}
                      >
                        {loading ? 'Submitting...' : 'Submit Report'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
