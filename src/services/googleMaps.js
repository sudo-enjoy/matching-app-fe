import { Loader } from '@googlemaps/js-api-loader';

class GoogleMapsService {
  constructor() {
    this.loader = new Loader({
      apiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY,
      version: 'weekly',
      libraries: ['places', 'geometry', 'geocoding']
    });
    this.google = null;
    this.map = null;
    this.markers = new Map();
    this.infoWindows = new Map();
    this.directionsService = null;
    this.directionsRenderer = null;
    this.geocoder = null;
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
      this.geocoder = new this.google.maps.Geocoder();
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

  createUserMarker(user, isCurrentUser = false) {
    const position = {
      lat: user.location.coordinates[1],
      lng: user.location.coordinates[0]
    };

    // Google Maps pin path (similar to default marker shape)
    const pinPath = 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z';

    // Determine colors based on user type and status
    let fillColor, strokeColor;
    if (isCurrentUser) {
      fillColor = '#4285F4'; // Blue for current user
      strokeColor = '#1967D2';
    } else {
      const isOnline = user.isOnline !== false;
      fillColor = isOnline ? '#34A853' : '#EA4335'; // Green for online, Red for offline
      strokeColor = isOnline ? '#188038' : '#C5221F';
    }

    const markerOptions = {
      position,
      map: this.map,
      title: user.name,
      icon: {
        path: pinPath,
        fillColor: fillColor,
        fillOpacity: 1,
        strokeColor: strokeColor,
        strokeWeight: 1,
        scale: 1.5,
        anchor: new this.google.maps.Point(12, 24),
        labelOrigin: new this.google.maps.Point(12, 10)
      },
      label: {
        text: isCurrentUser ? 'ME' : (user.name ? user.name.charAt(0).toUpperCase() : '?'),
        color: '#ffffff',
        fontSize: '11px',
        fontWeight: 'bold'
      },
      zIndex: isCurrentUser ? 1000 : 100,
      animation: isCurrentUser ? this.google.maps.Animation.DROP : null
    };

    const marker = new this.google.maps.Marker(markerOptions);

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

    return `
      <div class="info-window">
        <div class="user-avatar">
          <img src="${user.profilePhoto || '/default-avatar.png'}" alt="${user.name}" />
        </div>
        <div class="user-info">
          <h3>${user.name}</h3>
          <p class="user-bio">${user.bio || 'No bio available'}</p>
          <div class="user-stats">
            <span class="match-count">${user.matchCount || 0} matches</span>
            <span class="meet-count">${user.actualMeetCount || 0} meets</span>
          </div>
          <button class="match-button" onclick="window.dispatchEvent(new CustomEvent('requestMatch', {detail: {userId: '${user.id || user._id}', name: '${user.name}'}}))">
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
    const pinPath = 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z';

    const icon = {
      path: pinPath,
      fillColor: '#FFD700',
      fillOpacity: 1,
      strokeColor: '#FFA500',
      strokeWeight: 1,
      scale: 1.8,
      anchor: new this.google.maps.Point(12, 24),
      labelOrigin: new this.google.maps.Point(12, 10)
    };

    const marker = this.createMarker(position, {
      icon,
      title: 'Meeting Point',
      label: {
        text: '🤝',
        fontSize: '12px'
      },
      animation: this.google.maps.Animation.DROP,
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

  async reverseGeocode(lat, lng) {
    if (!this.geocoder) {
      throw new Error('Geocoder not initialized');
    }

    return new Promise((resolve, reject) => {
      this.geocoder.geocode(
        { location: { lat, lng } },
        (results, status) => {
          if (status === 'OK' && results && results.length > 0) {
            const result = results[0];
            const address = {
              formatted: result.formatted_address,
              street: '',
              city: '',
              state: '',
              country: '',
              postal_code: ''
            };

            // Parse components for more detailed address info
            result.address_components.forEach(component => {
              const types = component.types;
              if (types.includes('street_number') || types.includes('route')) {
                address.street += component.long_name + ' ';
              } else if (types.includes('locality') || types.includes('administrative_area_level_2')) {
                address.city = component.long_name;
              } else if (types.includes('administrative_area_level_1')) {
                address.state = component.short_name;
              } else if (types.includes('country')) {
                address.country = component.long_name;
              } else if (types.includes('postal_code')) {
                address.postal_code = component.long_name;
              }
            });

            address.street = address.street.trim();
            resolve(address);
          } else {
            reject(new Error(`Geocoding failed: ${status}`));
          }
        }
      );
    });
  }
}

export default new GoogleMapsService();