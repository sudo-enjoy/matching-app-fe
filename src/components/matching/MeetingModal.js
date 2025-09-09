import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { matchingAPI } from '../../services/api';
import { useLocation } from '../../contexts/LocationContext';
import GoogleMapsService from '../../services/googleMaps';
import { toast } from 'react-toastify';
import '../../styles/Modal.css';

const MeetingModal = ({ meetingData, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [directions, setDirections] = useState(null);
  const { currentLocation, getDirections } = useLocation();

  useEffect(() => {
    if (currentLocation && meetingData?.meetingPoint) {
      const meetingLocation = {
        lat: meetingData.meetingPoint.coordinates[1],
        lng: meetingData.meetingPoint.coordinates[0]
      };
      
      const directionsData = getDirections(meetingLocation);
      setDirections(directionsData);
    }
  }, [currentLocation, meetingData, getDirections]);

  const handleConfirmMeeting = async () => {
    if (!meetingData?.meetingId) return;
    
    setLoading(true);
    
    try {
      await matchingAPI.confirmMeeting(meetingData.meetingId);
      setConfirmed(true);
      toast.success('✅ Meeting confirmed! Waiting for the other person...');
    } catch (error) {
      console.error('Meeting confirmation error:', error);
      const message = error.response?.data?.error || 'Failed to confirm meeting';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleGetDirections = async () => {
    if (!meetingData?.meetingPoint) return;

    const meetingLocation = {
      lat: meetingData.meetingPoint.coordinates[1],
      lng: meetingData.meetingPoint.coordinates[0]
    };

    try {
      const result = await GoogleMapsService.calculateRoute(currentLocation, meetingLocation);
      GoogleMapsService.displayRoute(result);
      toast.success('📍 Directions displayed on map');
      onClose();
    } catch (error) {
      console.error('Directions error:', error);
      toast.error('Failed to get directions');
    }
  };

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatWalkingTime = (minutes) => {
    if (minutes < 60) {
      return `${minutes} min walk`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m walk`;
  };

  const getOtherPersonName = () => {
    return meetingData?.targetUser?.name || meetingData?.requester?.name || 'Other person';
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

  if (!meetingData) return null;

  return (
    <motion.div
      className="modal-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="modal meeting-modal"
        variants={modalVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2>🎉 Match Confirmed!</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="modal-content">
          <motion.div 
            className="success-animation"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", damping: 10 }}
          >
            <div className="success-icon">🎯</div>
            <h3>You're meeting {getOtherPersonName()}!</h3>
          </motion.div>

          <div className="meeting-info">
            <div className="meeting-detail">
              <span className="detail-icon">📍</span>
              <div className="detail-content">
                <span className="detail-label">Meeting Point</span>
                <span className="detail-value">
                  {meetingData.meetingPoint?.address || 'Custom location'}
                </span>
                {directions && (
                  <span className="detail-extra">
                    {Math.round(directions.distance)}m away • {formatWalkingTime(directions.walkingTime)}
                  </span>
                )}
              </div>
            </div>

            <div className="meeting-detail">
              <span className="detail-icon">⏰</span>
              <div className="detail-content">
                <span className="detail-label">Meeting Time</span>
                <span className="detail-value">
                  {meetingData.scheduledTime ? formatTime(meetingData.scheduledTime) : 'ASAP'}
                </span>
                <span className="detail-extra">You have 30 minutes to meet up</span>
              </div>
            </div>

            <div className="meeting-detail">
              <span className="detail-icon">💡</span>
              <div className="detail-content">
                <span className="detail-label">Activity</span>
                <span className="detail-value">{meetingData.meetingReason || 'Casual meetup'}</span>
              </div>
            </div>
          </div>

          <div className="meeting-actions">
            <motion.button
              onClick={handleGetDirections}
              className="btn btn-primary"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              🗺️ Get Directions
            </motion.button>

            <motion.button
              onClick={handleConfirmMeeting}
              className={`btn ${confirmed ? 'btn-success' : 'btn-secondary'}`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              disabled={loading || confirmed}
            >
              {loading ? (
                <span className="btn-loading">
                  <div className="spinner"></div>
                  Confirming...
                </span>
              ) : confirmed ? (
                '✅ Confirmed!'
              ) : (
                '📍 I\'m Here'
              )}
            </motion.button>
          </div>

          <div className="meeting-progress">
            <h4>Meeting Progress</h4>
            <div className="progress-steps">
              <div className="progress-step completed">
                <div className="step-icon">✅</div>
                <span>Match Accepted</span>
              </div>
              <div className={`progress-step ${confirmed ? 'completed' : 'current'}`}>
                <div className="step-icon">{confirmed ? '✅' : '⏳'}</div>
                <span>You Arrive</span>
              </div>
              <div className="progress-step">
                <div className="step-icon">⏳</div>
                <span>{getOtherPersonName()} Arrives</span>
              </div>
              <div className="progress-step">
                <div className="step-icon">🎉</div>
                <span>Meeting Complete!</span>
              </div>
            </div>
          </div>

          <div className="safety-reminders">
            <h4>🛡️ Safety Reminders</h4>
            <ul>
              <li>Meet in a public, well-lit area</li>
              <li>Let someone know where you're going</li>
              <li>Trust your instincts - leave if you feel uncomfortable</li>
              <li>Keep your phone charged and accessible</li>
            </ul>
          </div>

          <div className="emergency-contact">
            <p>Need help? Contact emergency services or use the report feature in the app.</p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default MeetingModal;