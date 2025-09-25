import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { matchingAPI } from '../../services/api';
import { toast } from 'react-toastify';
import { useLocation } from '../../contexts/LocationContext';
import GoogleMapsService from '../../services/googleMaps';
import MeetingPointsService from '../../services/meetingPointsService';
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
  const { currentLocation } = useLocation();
  const [selectedReason, setSelectedReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [selectedMeetingPoint, setSelectedMeetingPoint] = useState(null);
  const [meetingPoints, setMeetingPoints] = useState([]);
  const [loadingPoints, setLoadingPoints] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showOnMap, setShowOnMap] = useState(false);
  const [step, setStep] = useState(1); // 1: Select reason, 2: Select meeting point
  const modalRef = useRef(null);

  // Load meeting points when reason is selected
  useEffect(() => {
    if (selectedReason && targetUser && currentLocation) {
      fetchMeetingPoints();
      setStep(2); // Move to step 2
    }
  }, [selectedReason]);

  // Handle meeting point marker clicks from map
  useEffect(() => {
    const handleMarkerSelection = (event) => {
      const point = event.detail;
      setSelectedMeetingPoint(point);
      setShowOnMap(false);
      toast.success(`Selected: ${point.name}`);
    };

    window.addEventListener('meetingPointSelected', handleMarkerSelection);
    return () => {
      window.removeEventListener('meetingPointSelected', handleMarkerSelection);
    };
  }, []);

  // Clean up map markers when modal closes
  useEffect(() => {
    return () => {
      MeetingPointsService.clearMeetingMarkers();
    };
  }, []);

  const fetchMeetingPoints = async () => {
    if (!targetUser?.location || !currentLocation) {
      console.log('Missing location data');
      toast.warning('Location data not available for meeting point suggestions');

      // Generate basic fallback points even without full location data
      const basicPoints = [
        {
          id: 'basic-1',
          name: 'Central Meeting Point',
          address: 'Convenient location for meeting',
          location: { lat: 0, lng: 0 },
          distanceToUser: '0.5',
          distanceToTarget: '0.5',
          walkingTimeUser: 6,
          walkingTimeTarget: 6,
          isFallback: true
        },
        {
          id: 'basic-2',
          name: 'Public Meeting Spot',
          address: 'Safe and accessible location',
          location: { lat: 0.001, lng: 0.001 },
          distanceToUser: '0.7',
          distanceToTarget: '0.7',
          walkingTimeUser: 8,
          walkingTimeTarget: 8,
          isFallback: true
        },
        {
          id: 'basic-3',
          name: 'Community Center',
          address: 'Central community location',
          location: { lat: -0.001, lng: 0.001 },
          distanceToUser: '0.6',
          distanceToTarget: '0.6',
          walkingTimeUser: 7,
          walkingTimeTarget: 7,
          isFallback: true
        }
      ];

      setMeetingPoints(basicPoints);
      setSelectedMeetingPoint(basicPoints[0]);
      return;
    }

    setLoadingPoints(true);
    try {
      console.log('Fetching meeting points for:', selectedReason);

      // Initialize service with Google Maps
      MeetingPointsService.setGoogle(GoogleMapsService.google, GoogleMapsService.map);

      const userLocation = {
        lat: currentLocation.lat,
        lng: currentLocation.lng
      };

      const targetLocation = {
        lat: targetUser.location.coordinates[1],
        lng: targetUser.location.coordinates[0]
      };

      console.log('User location:', userLocation);
      console.log('Target location:', targetLocation);

      const points = await MeetingPointsService.findMeetingPoints(
        userLocation,
        targetLocation,
        selectedReason
      );

      console.log('Received meeting points:', points);

      if (points && points.length > 0) {
        setMeetingPoints(points);
        setSelectedMeetingPoint(points[0]); // Auto-select first point
      } else {
        // Ensure we always have some points
        const fallbackPoints = MeetingPointsService.getFallbackMeetingPoints(
          userLocation,
          targetLocation,
          selectedReason
        );
        setMeetingPoints(fallbackPoints);
        setSelectedMeetingPoint(fallbackPoints[0]);
      }
    } catch (error) {
      console.error('Error fetching meeting points:', error);

      // Generate emergency fallback points
      const emergencyPoints = [
        {
          id: 'emergency-1',
          name: `${selectedReason === 'coffee' ? 'Coffee' : 'Meeting'} Point A`,
          address: 'Central meeting location',
          location: currentLocation,
          distanceToUser: '0.1',
          distanceToTarget: '0.5',
          walkingTimeUser: 1,
          walkingTimeTarget: 6,
          isFallback: true
        },
        {
          id: 'emergency-2',
          name: `${selectedReason === 'coffee' ? 'Cafe' : 'Meeting'} Point B`,
          address: 'Alternative meeting spot',
          location: { lat: currentLocation.lat + 0.001, lng: currentLocation.lng + 0.001 },
          distanceToUser: '0.2',
          distanceToTarget: '0.4',
          walkingTimeUser: 2,
          walkingTimeTarget: 5,
          isFallback: true
        },
        {
          id: 'emergency-3',
          name: `${selectedReason === 'coffee' ? 'Central Cafe' : 'Hub'} Point C`,
          address: 'Convenient meetup location',
          location: { lat: currentLocation.lat - 0.001, lng: currentLocation.lng + 0.001 },
          distanceToUser: '0.3',
          distanceToTarget: '0.3',
          walkingTimeUser: 4,
          walkingTimeTarget: 4,
          isFallback: true
        }
      ];

      setMeetingPoints(emergencyPoints);
      setSelectedMeetingPoint(emergencyPoints[0]);
      toast.warning('Using suggested meeting locations');
    } finally {
      setLoadingPoints(false);
    }
  };

  const handleSelectFromList = (point) => {
    setSelectedMeetingPoint(point);
    // Show on map immediately
    MeetingPointsService.clearMeetingMarkers();
    MeetingPointsService.selectMeetingPoint(point);
    toast.success(`Meeting point selected: ${point.name}`);

    // Close modal after a short delay to show the selection
    setTimeout(() => {
      onClose();
    }, 1500);
  };

  const handleShowAllOnMap = () => {
    if (meetingPoints.length === 0) return;

    setShowOnMap(true);

    // Prepare user locations for the map display
    const userLocation = currentLocation ? {
      lat: currentLocation.lat,
      lng: currentLocation.lng
    } : null;

    const targetLocation = targetUser?.location ? {
      lat: targetUser.location.coordinates[1],
      lng: targetUser.location.coordinates[0]
    } : null;

    // Display all meeting points on the map with user locations
    MeetingPointsService.displayMeetingPoints(
      meetingPoints,
      (point) => {
        setSelectedMeetingPoint(point);
        setShowOnMap(false);
        toast.success(`Selected: ${point.name}`);
      },
      userLocation,
      targetLocation
    );

    // Close modal to see the map
    onClose();
    toast.info('Meeting points displayed on map. Click a marker to select.');
  };

  const handleBackToReasons = () => {
    setStep(1);
    setSelectedReason('');
    setMeetingPoints([]);
    setSelectedMeetingPoint(null);
    MeetingPointsService.clearMeetingMarkers();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedReason) {
      toast.error('Please select a reason for meeting');
      return;
    }

    if (step === 2 && !selectedMeetingPoint && meetingPoints.length > 0) {
      toast.error('Please select a meeting point');
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
      // Include meeting point in request if available
      const requestData = {
        targetUserId: targetUser.id || targetUser._id,
        meetingReason: reason,
        meetingPoint: selectedMeetingPoint ? {
          name: selectedMeetingPoint.name,
          address: selectedMeetingPoint.address,
          location: selectedMeetingPoint.location
        } : null
      };

      const response = await matchingAPI.sendMatchRequest(
        requestData.targetUserId,
        requestData.meetingReason
      );

      if (response.data) {
        toast.success(`Match request sent to ${targetUser.name}!`);

        // If a meeting point was selected, keep it on the map
        if (selectedMeetingPoint) {
          MeetingPointsService.selectMeetingPoint(selectedMeetingPoint);
        }

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
        ref={modalRef}
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
          {/* User Info Section */}
          <div className="target-user-info">
            <img
              src={targetUser?.profilePhoto || '/default-avatar.png'}
              alt={targetUser?.name}
              className="user-avatar-large"
            />
            <div className="user-details">
              <h3>{targetUser?.name}</h3>
              <p>
                {step === 1 ? 'Select a meeting activity' : 'Choose a meeting location'}
              </p>
            </div>
          </div>

          {/* Progress Indicator */}
          <div className="modal-progress-steps">
            <div className={`progress-step ${step >= 1 ? 'active' : ''}`}>
              <span className="step-number">1</span>
              <span className="step-label">Choose Activity</span>
            </div>
            <div className="progress-line" />
            <div className={`progress-step ${step >= 2 ? 'active' : ''}`}>
              <span className="step-number">2</span>
              <span className="step-label">Select Location</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="match-request-form">
            {/* Step 1: Select Meeting Reason */}
            {step === 1 && (
              <AnimatePresence mode="wait">
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="form-section"
                >
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

                  {selectedReason === 'other' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="custom-reason-input"
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
                </motion.div>
              </AnimatePresence>
            )}

            {/* Step 2: Select Meeting Point */}
            {step === 2 && (
              <AnimatePresence mode="wait">
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="form-section meeting-points-section"
                >
                  <div className="meeting-points-header">
                    <label>Select a Meeting Point</label>
                    <div className="header-actions">
                      <button
                        type="button"
                        className="back-btn"
                        onClick={handleBackToReasons}
                      >
                        ← Back
                      </button>
                      <button
                        type="button"
                        className="show-on-map-btn"
                        onClick={handleShowAllOnMap}
                        disabled={loadingPoints || meetingPoints.length === 0}
                      >
                        📍 Show All on Map
                      </button>
                    </div>
                  </div>

                  {loadingPoints ? (
                    <div className="loading-points">
                      <div className="spinner"></div>
                      <span>Finding convenient locations...</span>
                    </div>
                  ) : meetingPoints.length > 0 ? (
                    <div className="meeting-points-list">
                      {meetingPoints.map((point, index) => (
                        <motion.div
                          key={point.id}
                          className={`meeting-point-item ${
                            selectedMeetingPoint?.id === point.id ? 'selected' : ''
                          }`}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          onClick={() => setSelectedMeetingPoint(point)}
                        >
                          <div className="point-number">{index + 1}</div>

                          <div className="point-info">
                            <div className="point-name">
                              {point.name}
                              {point.rating && (
                                <span className="point-rating">
                                  ⭐ {point.rating}
                                </span>
                              )}
                            </div>

                            <div className="point-address">{point.address}</div>

                            <div className="point-distances">
                              <span className="distance-badge">
                                👤 You: {point.distanceToUser} km
                                <span className="walking-time">
                                  ({MeetingPointsService.formatWalkingTime(point.walkingTimeUser)})
                                </span>
                              </span>
                              <span className="distance-badge">
                                👥 {targetUser.name}: {point.distanceToTarget} km
                                <span className="walking-time">
                                  ({MeetingPointsService.formatWalkingTime(point.walkingTimeTarget)})
                                </span>
                              </span>
                            </div>

                            {point.isOpen !== null && (
                              <span className={`open-status ${point.isOpen ? 'open' : 'closed'}`}>
                                {point.isOpen ? '🟢 Open now' : '🔴 Closed'}
                              </span>
                            )}
                          </div>

                          <button
                            type="button"
                            className="select-point-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectFromList(point);
                            }}
                          >
                            Select & View
                          </button>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <div className="no-meeting-points">
                      <p>No meeting points available</p>
                      <button
                        type="button"
                        className="back-btn"
                        onClick={handleBackToReasons}
                      >
                        ← Choose Different Activity
                      </button>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            )}

            {/* Action Buttons */}
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

              {step === 1 ? (
                <motion.button
                  type="button"
                  className="btn btn-primary"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={!selectedReason || (selectedReason === 'other' && !customReason.trim())}
                  onClick={() => {
                    if (selectedReason) {
                      setStep(2);
                    }
                  }}
                >
                  Next: Choose Location →
                </motion.button>
              ) : (
                <motion.button
                  type="submit"
                  className="btn btn-primary"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={loading || (!selectedMeetingPoint && meetingPoints.length > 0)}
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
              )}
            </div>
          </form>

          {/* Info Section */}
          <div className="match-request-info">
            <div className="info-item">
              <span className="info-icon">🎯</span>
              <span>Meeting point will be marked on the map</span>
            </div>
            <div className="info-item">
              <span className="info-icon">⏰</span>
              <span>They have 24 hours to respond</span>
            </div>
            <div className="info-item">
              <span className="info-icon">🔒</span>
              <span>Your exact location is only shared after they accept</span>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default MatchRequestModal;