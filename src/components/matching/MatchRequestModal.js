import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { matchingAPI } from '../../services/api';
import { toast } from 'react-toastify';
import '../../styles/Modal.css';

const MEETING_REASONS = [
  { value: 'coffee', label: '☕ Coffee & Chat', emoji: '☕' },
  { value: 'lunch', label: '🍽️ Grab Lunch', emoji: '🍽️' },
  { value: 'walk', label: '🚶 Take a Walk', emoji: '🚶' },
  { value: 'drink', label: '🍺 Have a Drink', emoji: '🍺' },
  { value: 'workout', label: '💪 Workout Together', emoji: '💪' },
  { value: 'explore', label: '🗺️ Explore Area', emoji: '🗺️' },
  { value: 'study', label: '📚 Study Session', emoji: '📚' },
  { value: 'networking', label: '🤝 Networking', emoji: '🤝' },
  { value: 'hobby', label: '🎨 Share Hobbies', emoji: '🎨' },
  { value: 'other', label: '📝 Other', emoji: '📝' }
];

const MatchRequestModal = ({ targetUser, onClose }) => {
  const [selectedReason, setSelectedReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedReason) {
      toast.error('Please select a reason for meeting');
      return;
    }

    const reason = selectedReason === 'other' ? customReason : 
                  MEETING_REASONS.find(r => r.value === selectedReason)?.label || selectedReason;

    if (selectedReason === 'other' && !customReason.trim()) {
      toast.error('Please describe your reason for meeting');
      return;
    }

    setLoading(true);
    
    try {
      const response = await matchingAPI.sendMatchRequest(targetUser.id, reason);
      
      if (response.data) {
        toast.success(`Match request sent to ${targetUser.name}!`);
        onClose();
      }
    } catch (error) {
      console.error('Match request error:', error);
      const message = error.response?.data?.error || 'Failed to send match request';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const modalVariants = {
    hidden: { opacity: 0, scale: 0.8, y: 50 },
    visible: { 
      opacity: 1, 
      scale: 1, 
      y: 0,
      transition: { type: "spring", damping: 25, stiffness: 300 }
    },
    exit: { 
      opacity: 0, 
      scale: 0.8, 
      y: 50,
      transition: { duration: 0.2 }
    }
  };

  const reasonVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: (i) => ({
      opacity: 1,
      x: 0,
      transition: { delay: i * 0.05, duration: 0.3 }
    }),
    hover: { scale: 1.02, transition: { duration: 0.2 } }
  };

  return (
    <motion.div
      className="modal-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="modal match-request-modal"
        variants={modalVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2>Send Match Request</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="modal-content">
          <div className="target-user-info">
            <img 
              src={targetUser?.profilePhoto || '/default-avatar.png'} 
              alt={targetUser?.name}
              className="user-avatar-large"
            />
            <div className="user-details">
              <h3>{targetUser?.name}</h3>
              <p>You want to meet with {targetUser?.name}</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="match-request-form">
            <div className="form-section">
              <label>What would you like to do together?</label>
              <div className="meeting-reasons">
                {MEETING_REASONS.map((reason, index) => (
                  <motion.div
                    key={reason.value}
                    className={`reason-option ${selectedReason === reason.value ? 'selected' : ''}`}
                    variants={reasonVariants}
                    initial="hidden"
                    animate="visible"
                    whileHover="hover"
                    custom={index}
                    onClick={() => setSelectedReason(reason.value)}
                  >
                    <input
                      type="radio"
                      name="reason"
                      value={reason.value}
                      checked={selectedReason === reason.value}
                      onChange={(e) => setSelectedReason(e.target.value)}
                      hidden
                    />
                    <span className="reason-emoji">{reason.emoji}</span>
                    <span className="reason-label">{reason.label.replace(/^[^\s]+\s/, '')}</span>
                  </motion.div>
                ))}
              </div>
            </div>

            {selectedReason === 'other' && (
              <motion.div 
                className="form-section"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <label htmlFor="customReason">Describe what you'd like to do:</label>
                <textarea
                  id="customReason"
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  placeholder="Tell them what you have in mind..."
                  maxLength={200}
                  rows="3"
                />
                <span className="char-count">{customReason.length}/200</span>
              </motion.div>
            )}

            <div className="modal-actions">
              <motion.button
                type="button"
                onClick={onClose}
                className="btn btn-secondary"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Cancel
              </motion.button>
              <motion.button
                type="submit"
                className="btn btn-primary"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                disabled={loading || !selectedReason}
              >
                {loading ? (
                  <span className="btn-loading">
                    <div className="spinner"></div>
                    Sending...
                  </span>
                ) : (
                  `Send Request to ${targetUser?.name}`
                )}
              </motion.button>
            </div>
          </form>

          <div className="match-request-info">
            <div className="info-item">
              <span className="info-icon">🎯</span>
              <span>A meeting point will be calculated between you two</span>
            </div>
            <div className="info-item">
              <span className="info-icon">⏰</span>
              <span>They have 24 hours to respond</span>
            </div>
            <div className="info-item">
              <span className="info-icon">🔒</span>
              <span>Your location is only shared after they accept</span>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default MatchRequestModal;