import { Loader } from '@googlemaps/js-api-loader';

class GoogleMapsService {
  constructor() {
    this.loader = new Loader({
      apiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY,
      version: 'weekly',
      libraries: ['places', 'geometry']
    });
    this.google = null;
    this.map = null;
    this.markers = new Map();
    this.infoWindows = new Map();
    this.directionsService = null;
    this.directionsRenderer = null;
  }

  async initialize() {
    try {
      this.google = await this.loader.load();
      this.directionsService = new this.google.maps.DirectionsService();
      this.directionsRenderer = new this.google.maps.DirectionsRenderer({
        suppressMarkers: false,
        polylineOptions: {
          strokeColor: '#667eea',
          strokeWeight: 4,
          strokeOpacity: 0.8
        }
      });

      // Add global function for info window onclick handlers
      if (!window.handleMatchRequest) {
        window.handleMatchRequest = (tempId) => {
          const userData = window.tempUserData && window.tempUserData[tempId];
          if (userData) {
            window.dispatchEvent(new CustomEvent('requestMatchWithData', { detail: userData }));
            // Clean up temporary data
            delete window.tempUserData[tempId];
          } else {
            console.error('User data not found for tempId:', tempId);
          }
        };
      }

      return this.google;
    } catch (error) {
      console.error('Failed to load Google Maps:', error);
      throw error;
    }
  }

  createMap(element, options = {}) {
    if (!this.google) {
      throw new Error('Google Maps not initialized');
    }

    const defaultOptions = {
      zoom: 15,
      center: { lat: 0, lng: 0 },
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      styles: [
        {
          featureType: 'poi',
          elementType: 'labels',
          stylers: [{ visibility: 'off' }]
        },
        {
          featureType: 'transit',
          elementType: 'labels',
          stylers: [{ visibility: 'off' }]
        }
      ]
    };

    this.map = new this.google.maps.Map(element, { ...defaultOptions, ...options });
    this.directionsRenderer.setMap(this.map);

    return this.map;
  }

  createMarker(position, options = {}) {
    if (!this.google || !this.map) {
      throw new Error('Google Maps not initialized or map not created');
    }

    const marker = new this.google.maps.Marker({
      position,
      map: this.map,
      ...options
    });

    return marker;
  }

  createLocationPin(color, isCurrentUser = false) {
    if (!this.google || !this.google.maps) {
      throw new Error('Google Maps not initialized');
    }

    // Create SVG location pin
    const size = isCurrentUser ? 50 : 44;
    const svg = `
      <svg width="${size}" height="${size}" viewBox="0 0 24 36" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"
              fill="${color}" stroke="white" stroke-width="2"/>
        <circle cx="12" cy="9" r="3" fill="white"/>
      </svg>
    `;

    return {
      url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg),
      scaledSize: new this.google.maps.Size(size, size),
      anchor: new this.google.maps.Point(size / 2, size)
    };
  }

  createUserMarker(user, isCurrentUser = false, isWithinRadius = false) {
    const position = {
      lat: user.location.coordinates[1],
      lng: user.location.coordinates[0]
    };

    let markerOptions = {
      title: user.name,
      zIndex: isCurrentUser ? 1000 : (isWithinRadius ? 200 : 100)
    };

    if (isCurrentUser) {
      // Use red location pin for current user
      markerOptions.icon = this.createLocationPin('#EA4335', true);
    } else {
      // Use blue location pins for nearby users
      markerOptions.icon = this.createLocationPin('#4285F4', false);
    }

    const marker = this.createMarker(position, markerOptions);

    const infoWindow = new this.google.maps.InfoWindow({
      content: this.createInfoWindowContent(user, isCurrentUser)
    });

    marker.addListener('click', () => {
      this.closeAllInfoWindows();
      infoWindow.open(this.map, marker);
    });

    this.markers.set(user.id || user._id, marker);
    this.infoWindows.set(user.id || user._id, infoWindow);

    return marker;
  }

  createInfoWindowContent(user, isCurrentUser = false) {
    if (isCurrentUser) {
      return `
        <div class="sophisticated-modal current-user-modal">
        <div class="modal-backdrop"></div>
          <div class="modal-content">
            <div class="modal-header">
              <div class="avatar-container">
                <div class="avatar-ring">
                  <img src="${user.profilePhoto || 'https://randomuser.me/api/portraits/men/32.jpg'}" alt="${user.name}" class="user-avatar" />
                </div>
                <div class="online-indicator pulsing"></div>
              </div>
              <div class="user-details">
                <h3 class="user-name">${user.name}</h3>
                <span class="user-badge current-user">あなた</span>
              </div>
            </div>
            <div class="modal-body">
              <div class="bio-section">
                <p class="user-bio">${user.bio || '自己紹介がありません'}</p>
              </div>
            </div>
          </div>
        </div>
        ${this.getModalStyles()}
      `;
    }

    // Store user data temporarily and use a simple ID reference
    const tempId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    if (!window.tempUserData) window.tempUserData = {};
    window.tempUserData[tempId] = {
      id: user.id || user._id,
      name: user.name || '',
      location: user.location,
      profilePhoto: user.profilePhoto,
      bio: user.bio || 'No bio available'
    };

    return `
      <div class="sophisticated-modal user-modal">
        <div class="modal-backdrop"></div>
        <div class="modal-content">
          <div class="modal-header">
            <div class="avatar-container">
              <div class="avatar-ring">
                <img src="${user.profilePhoto || 'https://randomuser.me/api/portraits/men/32.jpg'}" alt="${user.name || 'User'}" class="user-avatar" />
              </div>
              <div class="online-indicator pulsing"></div>
            </div>
            <div class="user-details">
              <h3 class="user-name">${user.name || 'User'}</h3>
              
            </div>
          </div>
          <div class="modal-body">
            <div class="bio-section">
              <div class="bio-label">
                <span class="bio-icon">📝</span>
                <span>自己紹介</span>
              </div>
              <p class="user-bio">${user.bio || '自己紹介がありません'}</p>
            </div>
            <div class="action-section">
              <button class="modern-match-button" onclick="window.handleMatchRequest && window.handleMatchRequest('${tempId}')">
                <span class="button-gradient"></span>
                <span class="button-content">
                  <span class="button-text">リクエストを送信</span>
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
      ${this.getModalStyles()}
    `;
  }

  getModalStyles() {
    return `
      <style>
        .sophisticated-modal {
          min-width: 200px;
          max-width: 420px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif;
          position: relative;
          overflow: hidden;
          border-radius: 20px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.25), 0 8px 32px rgba(0, 0, 0, 0.15);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .modal-backdrop {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(135deg,
            rgba(255, 255, 255, 0.95) 0%,
            rgba(248, 250, 255, 0.95) 50%,
            rgba(240, 245, 255, 0.95) 100%);
          z-index: 1;
        }

        .modal-content {
          position: relative;
          z-index: 2;
          padding: 0;
          background: transparent;
        }

        .modal-header {
          display: flex;
          align-items: center;
          background: linear-gradient(135deg,
            rgba(255, 255, 255, 0.8) 0%,
            rgba(248, 250, 255, 0.6) 100%);
          border-bottom: 1px solid rgba(0, 0, 0, 0.05);
        }

        .avatar-container {
          position: relative;
          margin-right: 16px;
        }

        .avatar-ring {
          position: relative;
          width: 72px;
          height: 72px;
          border-radius: 50%;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 3px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .user-avatar {
          width: 66px;
          height: 66px;
          border-radius: 50%;
          object-fit: cover;
          transition: all 0.3s ease;
          border: 2px solid white;
        }

        .user-avatar:hover {
          transform: scale(1.05);
        }

        .online-indicator {
          position: absolute;
          bottom: 4px;
          right: 4px;
          width: 20px;
          height: 20px;
          background: #34c759;
          border: 3px solid white;
          border-radius: 50%;
          box-shadow: 0 2px 8px rgba(52, 199, 89, 0.4);
        }

        .online-indicator.pulsing {
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0% { transform: scale(1); box-shadow: 0 2px 8px rgba(52, 199, 89, 0.4); }
          50% { transform: scale(1.1); box-shadow: 0 4px 16px rgba(52, 199, 89, 0.6); }
          100% { transform: scale(1); box-shadow: 0 2px 8px rgba(52, 199, 89, 0.4); }
        }

        .user-details {
          flex: 1;
        }

        .user-name {
          margin: 0 0 8px 0;
          font-size: 22px;
          font-weight: 700;
          color: #1a1a1a;
          letter-spacing: -0.5px;
          line-height: 1.2;
        }

        .user-badge {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 16px;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .user-badge.current-user {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
        }

        .stats-container {
          display: flex;
          gap: 6px;
          margin-top: 6px;
        }

        .stat-item {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          background: rgba(255, 255, 255, 0.6);
          border-radius: 12px;
          border: 1px solid rgba(0, 0, 0, 0.05);
        }

        .stat-icon {
          font-size: 16px;
        }

        .stat-value {
          font-size: 14px;
          font-weight: 600;
          color: #555;
        }

        .modal-body {
          padding: 20px 24px 24px 24px;
        }

        .bio-section {
          margin-bottom: 20px;
        }

        .bio-label {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 12px;
          font-size: 14px;
          font-weight: 600;
          color: #666;
        }

        .bio-icon {
          font-size: 16px;
        }

        .user-bio {
          margin: 0;
          font-size: 15px;
          line-height: 1.5;
          color: #444;
          background: linear-gradient(135deg,
            rgba(255, 255, 255, 0.8) 0%,
            rgba(248, 250, 255, 0.8) 100%);
          padding: 16px;
          border-radius: 14px;
          border: 1px solid rgba(0, 0, 0, 0.05);
          border-left: 4px solid #667eea;
        }

        .action-section {
          margin-top: 20px;
        }

        .modern-match-button {
          position: relative;
          width: 100%;
          border: none;
          border-radius: 16px;
          padding: 0;
          cursor: pointer;
          overflow: hidden;
          transition: all 0.3s ease;
          box-shadow: 0 6px 20px rgba(102, 126, 234, 0.3);
        }

        .modern-match-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 32px rgba(102, 126, 234, 0.4);
        }

        .modern-match-button:active {
          transform: translateY(-1px);
        }

        .button-gradient {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          z-index: 1;
        }

        .button-content {
          position: relative;
          z-index: 2;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 16px 24px;
          color: white;
          font-size: 16px;
          font-weight: 600;
          letter-spacing: -0.3px;
        }

        .button-icon {
          font-size: 20px;
        }

        .button-text {
          font-weight: 700;
        }

        .sophisticated-modal.current-user-modal .modal-header {
          background: linear-gradient(135deg,
            rgba(66, 133, 244, 0.1) 0%,
            rgba(102, 126, 234, 0.1) 100%);
        }

        .sophisticated-modal.current-user-modal .avatar-ring {
          background: linear-gradient(135deg, #4285f4 0%, #667eea 100%);
        }
      </style>
    `;
  }

  updateUserMarker(userId, newPosition, userData) {
    const marker = this.markers.get(userId);
    if (marker) {
      const position = {
        lat: newPosition.coordinates[1],
        lng: newPosition.coordinates[0]
      };
      marker.setPosition(position);

      const infoWindow = this.infoWindows.get(userId);
      if (infoWindow && userData) {
        infoWindow.setContent(this.createInfoWindowContent(userData));
      }
    }
  }

  removeUserMarker(userId) {
    const marker = this.markers.get(userId);
    const infoWindow = this.infoWindows.get(userId);

    if (marker) {
      marker.setMap(null);
      this.markers.delete(userId);
    }

    if (infoWindow) {
      infoWindow.close();
      this.infoWindows.delete(userId);
    }
  }

  clearAllUserMarkers() {
    this.markers.forEach((marker, userId) => {
      // Preserve current-user and meeting-related user markers
      if (!userId.includes('current-user') && !userId.includes('meeting-current-user') && !userId.includes('meeting-target-user')) {
        marker.setMap(null);
      }
    });
    this.infoWindows.forEach((infoWindow, userId) => {
      // Preserve current-user and meeting-related user markers
      if (!userId.includes('current-user') && !userId.includes('meeting-current-user') && !userId.includes('meeting-target-user')) {
        infoWindow.close();
      }
    });

    // Keep current user, meeting current user, and meeting target user markers
    const preserveMarkers = new Map();
    const preserveWindows = new Map();

    ['current-user', 'meeting-current-user', 'meeting-target-user'].forEach(key => {
      const marker = this.markers.get(key);
      const window = this.infoWindows.get(key);
      if (marker) {
        preserveMarkers.set(key, marker);
      }
      if (window) {
        preserveWindows.set(key, window);
      }
    });

    this.markers.clear();
    this.infoWindows.clear();

    // Restore preserved markers
    preserveMarkers.forEach((marker, key) => {
      this.markers.set(key, marker);
    });
    preserveWindows.forEach((window, key) => {
      this.infoWindows.set(key, window);
    });
  }

  fitMapToShowAllUsers(users, currentLocation) {
    if (!this.map || !this.google || users.length === 0) return;

    const bounds = new this.google.maps.LatLngBounds();

    // Include current location
    if (currentLocation) {
      bounds.extend(new this.google.maps.LatLng(currentLocation.lat, currentLocation.lng));
    }

    // Include all user locations
    users.forEach(user => {
      if (user.location && user.location.coordinates) {
        bounds.extend(new this.google.maps.LatLng(
          user.location.coordinates[1],
          user.location.coordinates[0]
        ));
      }
    });

    this.map.fitBounds(bounds);

    // Add some padding and ensure minimum zoom level
    setTimeout(() => {
      if (this.map.getZoom() > 15) {
        this.map.setZoom(15);
      }
    }, 100);
  }

  closeAllInfoWindows() {
    this.infoWindows.forEach(infoWindow => infoWindow.close());
  }

  async calculateRoute(origin, destination) {
    if (!this.directionsService) {
      throw new Error('Directions service not initialized');
    }

    return new Promise((resolve, reject) => {
      this.directionsService.route({
        origin,
        destination,
        travelMode: this.google.maps.TravelMode.WALKING
      }, (result, status) => {
        if (status === 'OK') {
          resolve(result);
        } else {
          reject(new Error(`Directions request failed: ${status}`));
        }
      });
    });
  }

  displayRoute(directionsResult) {
    if (!this.directionsRenderer) {
      throw new Error('Directions renderer not initialized');
    }

    this.directionsRenderer.setDirections(directionsResult);
  }

  clearRoute() {
    if (this.directionsRenderer) {
      this.directionsRenderer.setDirections({ routes: [] });
    }
  }

  createMeetingPointMarker(position, meetingInfo) {
    const icon = {
      url: '/icons/meeting-point.png',
      scaledSize: new this.google.maps.Size(50, 50),
      anchor: new this.google.maps.Point(25, 50)
    };

    const marker = this.createMarker(position, {
      icon,
      title: 'Meeting Point',
      zIndex: 500
    });

    const infoWindow = new this.google.maps.InfoWindow({
      content: `
        <div class="meeting-point-info">
          <h3>🎯 Meeting Point</h3>
          <p>${meetingInfo.address || 'Custom location'}</p>
          <p><strong>Reason:</strong> ${meetingInfo.reason}</p>
          ${meetingInfo.scheduledTime ? `<p><strong>Time:</strong> ${new Date(meetingInfo.scheduledTime).toLocaleString()}</p>` : ''}
          <div class="meeting-actions">
            <button onclick="window.dispatchEvent(new CustomEvent('getDirections', {detail: {lat: ${position.lat}, lng: ${position.lng}}}))">
              Get Directions
            </button>
            <button onclick="window.dispatchEvent(new CustomEvent('confirmMeeting', {detail: {meetingId: '${meetingInfo.meetingId}'}}))">
              I'm Here
            </button>
          </div>
        </div>
      `
    });

    marker.addListener('click', () => {
      this.closeAllInfoWindows();
      infoWindow.open(this.map, marker);
    });

    return marker;
  }

  async findNearbyPlaces(location, type = 'restaurant') {
    if (!this.google) {
      throw new Error('Google Maps not initialized');
    }

    const service = new this.google.maps.places.PlacesService(this.map);

    return new Promise((resolve, reject) => {
      service.nearbySearch({
        location,
        radius: 1000,
        type
      }, (results, status) => {
        if (status === this.google.maps.places.PlacesServiceStatus.OK) {
          resolve(results);
        } else {
          reject(new Error(`Places search failed: ${status}`));
        }
      });
    });
  }

  centerOnLocation(position, zoom = 15) {
    if (this.map) {
      this.map.setCenter(position);
      this.map.setZoom(zoom);
    }
  }

  updateCurrentUserLocation(userId, newLocation) {
    // Remove existing marker for current user
    this.removeUserMarker(userId);

    // Create new marker at updated location
    const user = {
      id: userId,
      name: "You",
      location: {
        coordinates: [newLocation.lng, newLocation.lat]
      }
    };

    this.createUserMarker(user, true);
    this.centerOnLocation(newLocation, 15);
  }

  fitBounds(bounds) {
    if (this.map) {
      this.map.fitBounds(bounds);
    }
  }

  getBounds() {
    return this.map ? this.map.getBounds() : null;
  }

  addClickListener(callback) {
    if (this.map) {
      this.map.addListener('click', callback);
    }
  }

  addIdleListener(callback) {
    if (this.map) {
      this.map.addListener('idle', callback);
    }
  }
}

export default new GoogleMapsService();