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
      // Use a distinctive blue circle for current user
      markerOptions.icon = {
        path: this.google.maps.SymbolPath.CIRCLE,
        scale: 12,
        fillColor: '#4285F4',
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 3,
        strokeOpacity: 1
      };
    } else if (isWithinRadius) {
      // Use distinctive green markers for users within 100km radius
      markerOptions.icon = {
        path: this.google.maps.SymbolPath.CIRCLE,
        scale: 10,
        fillColor: '#34C759',
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 3,
        strokeOpacity: 1
      };
    } else {
      // Use default red marker for other users or custom icon if available
      try {
        markerOptions.icon = {
          url: '/icons/user-pin.png',
          scaledSize: new this.google.maps.Size(40, 40),
          anchor: new this.google.maps.Point(20, 40)
        };
      } catch (e) {
        // Fallback to default marker if custom icon fails
        markerOptions.icon = {
          path: this.google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: '#EA4335',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
          strokeOpacity: 1
        };
      }
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
        <div class="info-window current-user">
          <div class="user-avatar">
            <img src="${user.profilePhoto || '/default-avatar.png'}" alt="${user.name}" />
          </div>
          <div class="user-info">
            <h3>${user.name} (You)</h3>
            <p class="user-bio">${user.bio || 'No bio available'}</p>
          </div>
        </div>
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
      <div class="info-window">
        <div class="user-avatar">
          <img src="${user.profilePhoto || '/default-avatar.png'}" alt="${user.name || 'User'}" />
        </div>
        <div class="user-info">
          <h3>${user.name || 'User'}</h3>
          <p class="user-bio">${user.bio || 'No bio available'}</p>
          <div class="user-stats">
            <span class="match-count">${user.matchCount || 0} matches</span>
            <span class="meet-count">${user.actualMeetCount || 0} meets</span>
          </div>
          <button class="match-button" onclick="window.handleMatchRequest && window.handleMatchRequest('${tempId}')">
            Send Match Request
          </button>
        </div>
      </div>
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