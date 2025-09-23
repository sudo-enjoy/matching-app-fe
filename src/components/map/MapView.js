import React, { useEffect, useRef, useState } from 'react';
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
  const { user, logout } = useAuth();
  const { currentLocation, getNearbyUsers, getAllUsers, nearbyUsers, seedUsers } = useLocation();
  const { connected, onlineUsers, matchRequests, updateLocation } = useSocket();
  
  const [mapLoaded, setMapLoaded] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showMatchRequest, setShowMatchRequest] = useState(false);
  const [showMatchResponse, setShowMatchResponse] = useState(null);
  const [showMeeting, setShowMeeting] = useState(null);
  const [showProfile, setShowProfile] = useState(false);
  const [userPanelExpanded, setUserPanelExpanded] = useState(false);

  useEffect(() => {
    const initializeMap = async () => {
      try {
        await GoogleMapsService.initialize();
        
        if (mapRef.current && currentLocation) {
          GoogleMapsService.createMap(mapRef.current, {
            center: { lat: currentLocation.lat, lng: currentLocation.lng },
            zoom: 15
          });
          
          GoogleMapsService.createUserMarker({
            id: user.id,
            name: user.name,
            location: {
              coordinates: [currentLocation.lng, currentLocation.lat]
            },
            profilePhoto: user.profilePhoto,
            bio: user.bio,
            matchCount: user.matchCount,
            actualMeetCount: user.actualMeetCount
          }, true);
          
          setMapLoaded(true);
          loadAllUsers();
        }
      } catch (error) {
        console.error('Failed to initialize map:', error);
      }
    };

    if (currentLocation && user) {
      initializeMap();
    }
  }, [currentLocation, user]);

  useEffect(() => {
    if (mapLoaded && currentLocation) {
      updateLocation(currentLocation.lat, currentLocation.lng);
    }
  }, [currentLocation, mapLoaded, updateLocation]);

  useEffect(() => {
    if (mapLoaded) {
      updateMapMarkers();
    }
  }, [onlineUsers, nearbyUsers, mapLoaded]);

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

  const loadAllUsers = async () => {
    try {
      const users = await getAllUsers();
      // After loading all users, update the markers
      if (users && users.length > 0) {
        updateMapMarkers();
      }
    } catch (error) {
      console.error('Failed to load all users:', error);
    }
  };

  const loadNearbyUsers = async () => {
    try {
      const users = await getNearbyUsers(10000);
      // After loading nearby users, update the markers
      if (users && users.length > 0) {
        updateMapMarkers();
      }
    } catch (error) {
      console.error('Failed to load nearby users:', error);
    }
  };

  const updateMapMarkers = () => {
    const allUsers = [...nearbyUsers, ...onlineUsers];
    const uniqueUsers = allUsers.reduce((acc, user) => {
      const id = user.id || user._id;
      // Don't add the current user to the markers
      if (!acc.find(u => (u.id || u._id) === id) && id !== user.id) {
        acc.push(user);
      }
      return acc;
    }, []);

    console.log('Updating markers for users:', uniqueUsers);

    uniqueUsers.forEach(user => {
      if (user.location && user.location.coordinates) {
        const existingMarker = GoogleMapsService.markers.get(user.id || user._id);
        if (existingMarker) {
          GoogleMapsService.updateUserMarker(user.id || user._id, user.location, user);
        } else {
          GoogleMapsService.createUserMarker(user);
        }
      }
    });
  };

  const handleLocationRefresh = () => {
    if (currentLocation) {
      GoogleMapsService.centerOnLocation({
        lat: currentLocation.lat,
        lng: currentLocation.lng
      }, 15);
      loadAllUsers();
    }
  };

  const handleSeedUsers = async () => {
    await seedUsers();
    // After seeding, load all users to show them on the map
    setTimeout(() => {
      loadAllUsers();
    }, 1000);
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

  const toggleUserPanel = () => {
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
              src={user.profilePhoto || '/default-avatar.png'} 
              alt="Profile" 
              className="profile-avatar"
            />
          </motion.button>
          <div className="location-info">
            <h2>MatchApp</h2>
            <span className={`connection-status ${connected ? 'connected' : 'disconnected'}`}>
              {connected ? '🟢 Connected' : '🔴 Offline'}
            </span>
          </div>
        </div>
        
        <div className="header-right">
          <motion.button
            className="refresh-btn"
            onClick={handleLocationRefresh}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            🔄
          </motion.button>
          <motion.button
            className="logout-btn"
            onClick={logout}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            🚪
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
        >
          {userPanelExpanded ? '▼' : '▲'} 
          Users ({onlineUsers.length + nearbyUsers.length})
        </motion.button>
      </div>

      <AnimatePresence>
        {userPanelExpanded && (
          <UserPanel
            users={[...nearbyUsers, ...onlineUsers]}
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