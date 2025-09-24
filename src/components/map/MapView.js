import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { useLocation } from '../../contexts/LocationContext';
import { useSocket } from '../../contexts/SocketContext';
import GoogleMapsService from '../../services/googleMaps';
import UserPanel from './UserPanel';
import MatchRequestModal from '../matching/MatchRequestModal';
import MatchResponseModal from '../matching/MatchResponseModal';
import MeetingModal from '../matching/MeetingModal';
import ProfileModal from '../profile/ProfileModal';
import '../../styles/MapView.css';

const MapView = () => {
  const mapRef = useRef(null);
  const loadingUsersRef = useRef(false);
  const { user, logout } = useAuth();
  const { currentLocation, getNearbyUsers, getAllUsers, nearbyUsers, seedUsers, loading } = useLocation();
  const { connected, onlineUsers, matchRequests, updateLocation } = useSocket();

  const [mapLoaded, setMapLoaded] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showMatchRequest, setShowMatchRequest] = useState(false);
  const [showMatchResponse, setShowMatchResponse] = useState(null);
  const [showMeeting, setShowMeeting] = useState(null);
  const [showProfile, setShowProfile] = useState(false);
  const [userPanelExpanded, setUserPanelExpanded] = useState(false);
  const [usersWithinRadius, setUsersWithinRadius] = useState([]);
  const [radiusUserCount, setRadiusUserCount] = useState(0);

  // Define loadAllUsers first to avoid dependency issues
  const loadAllUsers = useCallback(async () => {
    if (loadingUsersRef.current) {
      return; // Prevent multiple simultaneous calls
    }
    try {
      loadingUsersRef.current = true;
      // await getAllUsers();
      // await getNearbyUsers(); 
      // The users are automatically stored in nearbyUsers by getAllUsers function
    } catch (error) {
      console.error('Failed to load all users:', error);
    } finally {
      loadingUsersRef.current = false;
    }
  }, [getAllUsers]);

  // Define updateMapMarkers
  const updateMapMarkers = useCallback(() => {
    nearbyUsers.forEach(user => {
      if (user.location && user.location.coordinates) {
        const existingMarker = GoogleMapsService.markers.get(user.id || user._id);
        if (existingMarker) {
          GoogleMapsService.updateUserMarker(user.id || user._id, user.location, user);
        } else {
          GoogleMapsService.createUserMarker(user);
        }
      }
    });
  }, [nearbyUsers]);

  useEffect(() => {
    const initializeMap = async () => {
      try {
        await GoogleMapsService.initialize();

        console.log(currentLocation.lng, '=========', currentLocation.lat);
        if (mapRef.current && currentLocation) {
          GoogleMapsService.createMap(mapRef.current, {
            center: { lat: currentLocation.lat, lng: currentLocation.lng },
            zoom: 15
          });
          // Create marker for current user with distinct styling
          GoogleMapsService.createUserMarker({
            id: user.id,
            name: `${user.name} (You)`,
            location: {
              coordinates: [currentLocation.lng, currentLocation.lat]
            },
            profilePhoto: user.profilePhoto,
            bio: user.bio,
            matchCount: user.matchCount,
            actualMeetCount: user.actualMeetCount,
            isCurrentUser: true
          }, true);

          setMapLoaded(true);
        }
      } catch (error) {
        console.error('Failed to initialize map:', error);
      }
    };

    if (currentLocation && user) {
      initializeMap();
    }
  }, [currentLocation, user]);

  // Load users within 100km radius
  const loadUsersWithinRadius = useCallback(async () => {
    if (!currentLocation) return;

    try {
      const users = await getNearbyUsers(100000); // 100km in meters
      // const users = await getAllUsers();
      console.log("Users=====", users);
      setUsersWithinRadius(users || []);
      setRadiusUserCount(users?.length || 0);
      return users;
    } catch (error) {
      console.error('Failed to load users within radius:', error);
      setUsersWithinRadius([]);
      setRadiusUserCount(0);
    }
  }, [currentLocation, getNearbyUsers]);

  // Load users when component mounts
  useEffect(() => {
    if (user && !loading) {
      loadAllUsers();
      loadUsersWithinRadius();
    }
  }, [user]); // Remove loadAllUsers and loading from dependencies to prevent infinite loop

  useEffect(() => {
    if (mapLoaded && currentLocation) {
      updateLocation(currentLocation.lat, currentLocation.lng);
    }
  }, [currentLocation, mapLoaded, updateLocation]);

  useEffect(() => {
    if (mapLoaded) {
      updateMapMarkers();
    }
  }, [mapLoaded, updateMapMarkers]);

  useEffect(() => {
    const handleMatchRequest = (event) => {
      const { userId, name } = event.detail;
      setSelectedUser({ id: userId, name });
      setShowMatchRequest(true);
    };

    const handleShowMatchRequest = (event) => {
      setShowMatchResponse(event.detail);
    };

    const handleShowMatch = (event) => {
      setShowMeeting(event.detail);
    };

    window.addEventListener('requestMatch', handleMatchRequest);
    window.addEventListener('showMatchRequest', handleShowMatchRequest);
    window.addEventListener('showMatch', handleShowMatch);

    return () => {
      window.removeEventListener('requestMatch', handleMatchRequest);
      window.removeEventListener('showMatchRequest', handleShowMatchRequest);
      window.removeEventListener('showMatch', handleShowMatch);
    };
  }, []);

  const loadNearbyUsers = async () => {
    try {
      await getNearbyUsers(10000);
    } catch (error) {
      console.error('Failed to load nearby users:', error);
    }
  };

  const handleSeedUsers = async () => {
    await seedUsers();
    // After seeding, load all users to show them on the map
    setTimeout(() => {
      loadAllUsers();
    }, 1000);
  };

  const handleLocationRefresh = () => {
    if (currentLocation) {
      GoogleMapsService.centerOnLocation({
        lat: currentLocation.lat,
        lng: currentLocation.lng
      }, 15);
      loadAllUsers();
      loadUsersWithinRadius();
    }
  };

  const handleMatchRequestClose = () => {
    setShowMatchRequest(false);
    setSelectedUser(null);
  };

  const handleMatchResponseClose = () => {
    setShowMatchResponse(null);
  };

  const handleMeetingClose = () => {
    setShowMeeting(null);
  };

  const toggleUserPanel = async () => {
    if (!userPanelExpanded) {
      // When opening the panel, refresh users within 100km
      const users = await loadUsersWithinRadius();

      // Clear all existing markers except current user
      GoogleMapsService.clearAllUserMarkers();

      // Create markers for users within 100km radius
      if (users && users.length > 0) {
        users.forEach(user => {
          if (user.location && user.location.coordinates) {
            GoogleMapsService.createUserMarker(user, false, true); // isWithinRadius = true
          }
        });

        // Fit map to show all users within radius
        GoogleMapsService.fitMapToShowAllUsers(users, currentLocation);
      }

      // Ensure current location marker is visible
      if (currentLocation && user) {
        GoogleMapsService.createUserMarker({
          id: 'current-user',
          name: 'You',
          location: {
            coordinates: [currentLocation.lng, currentLocation.lat]
          },
          profilePhoto: user.profilePhoto,
          bio: 'Your current location',
          isCurrentUser: true
        }, true);
      }
    } else {
      // When closing the panel, clear all user markers except current user
      GoogleMapsService.clearAllUserMarkers();

      // Re-center on current location
      if (currentLocation) {
        GoogleMapsService.centerOnLocation({
          lat: currentLocation.lat,
          lng: currentLocation.lng
        }, 15);
      }
    }
    setUserPanelExpanded(!userPanelExpanded);
  };

  if (!currentLocation) {
    return (
      <div className="map-loading">
        <div className="loading-content">
          <div className="loading-spinner"></div>
          <h3>Getting your location...</h3>
          <p>Please allow location access to continue</p>
        </div>
      </div>
    );
  }

  return (
    <div className="map-container">
      <div className="map-header">
        <div className="header-left">
          <motion.button
            className="menu-btn"
            onClick={() => setShowProfile(true)}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <img
              src="https://randomuser.me/api/portraits/men/32.jpg"
              alt="Profile"
              className="profile-avatar"
            />
          </motion.button>
          <span className={`connection-status ${connected ? 'connected' : 'disconnected'}`}>
            <span className="status-indicator"></span>
            {connected ? 'Connected' : 'Offline'}
          </span>
        </div>

        <div className="header-center">
          <h2>MatchApp</h2>
        </div>

        <div className="header-right">
          <motion.button
            className="refresh-btn"
            onClick={handleLocationRefresh}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            title="Refresh Location"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10"></polyline>
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
            </svg>
          </motion.button>
          <motion.button
            className="logout-btn"
            onClick={logout}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            title="Logout"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
          </motion.button>
        </div>
      </div>

      <div className="map-content">
        <div
          ref={mapRef}
          className="google-map"
          style={{ height: '100%', width: '100%' }}
        />

        <motion.button
          className="user-panel-toggle"
          onClick={toggleUserPanel}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          title="Click to show users within 100km"
        >
          {userPanelExpanded ? '▼' : '▲'}
          Users within 100km: {radiusUserCount}
        </motion.button>
      </div>

      <AnimatePresence>
        {userPanelExpanded && (
          <UserPanel
            users={usersWithinRadius}
            onClose={() => setUserPanelExpanded(false)}
            onUserSelect={setSelectedUser}
          />
        )}
      </AnimatePresence>

      {matchRequests.length > 0 && (
        <motion.div
          className="match-requests-indicator"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          whileHover={{ scale: 1.1 }}
          onClick={() => setShowMatchResponse(matchRequests[0])}
        >
          <span className="notification-badge">{matchRequests.length}</span>
          💌 Match Requests
        </motion.div>
      )}

      <AnimatePresence>
        {showMatchRequest && (
          <MatchRequestModal
            targetUser={selectedUser}
            onClose={handleMatchRequestClose}
          />
        )}

        {showMatchResponse && (
          <MatchResponseModal
            matchRequest={showMatchResponse}
            onClose={handleMatchResponseClose}
          />
        )}

        {showMeeting && (
          <MeetingModal
            meetingData={showMeeting}
            onClose={handleMeetingClose}
          />
        )}

        {showProfile && (
          <ProfileModal
            onClose={() => setShowProfile(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default MapView;