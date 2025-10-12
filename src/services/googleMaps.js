import { Loader } from "@googlemaps/js-api-loader";

class GoogleMapsService {
  constructor() {
    this.loader = new Loader({
      apiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY,
      version: "weekly",
      libraries: ["places", "geometry"],
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
          strokeColor: "#667eea",
          strokeWeight: 4,
          strokeOpacity: 0.8,
        },
      });

      // Add global function for info window onclick handlers
      if (!window.handleMatchRequest) {
        window.handleMatchRequest = (tempId) => {
          const userData = window.tempUserData && window.tempUserData[tempId];
          if (userData) {
            window.dispatchEvent(
              new CustomEvent("requestMatchWithData", { detail: userData })
            );
            // Clean up temporary data
            delete window.tempUserData[tempId];
          } else {
            console.error("User data not found for tempId:", tempId);
          }
        };
      }

      // Make GoogleMapsService available globally for close button
      window.googleMapsService = this;

      return this.google;
    } catch (error) {
      console.error("Failed to load Google Maps:", error);
      throw error;
    }
  }

  createMap(element, options = {}) {
    if (!this.google) {
      throw new Error("Google Maps not initialized");
    }

    const defaultOptions = {
      zoom: 15,
      center: { lat: 0, lng: 0 },
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      styles: [
        {
          featureType: "poi",
          elementType: "labels",
          stylers: [{ visibility: "off" }],
        },
        {
          featureType: "transit",
          elementType: "labels",
          stylers: [{ visibility: "off" }],
        },
      ],
    };

    this.map = new this.google.maps.Map(element, {
      ...defaultOptions,
      ...options,
    });
    this.directionsRenderer.setMap(this.map);

    // Add click event listener to close all info windows when clicking on the map
    this.google.maps.event.addListener(this.map, "click", () => {
      this.closeAllInfoWindows();
    });

    return this.map;
  }

  createMarker(position, options = {}) {
    if (!this.google || !this.map) {
      throw new Error("Google Maps not initialized or map not created");
    }

    const marker = new this.google.maps.Marker({
      position,
      map: this.map,
      ...options,
    });

    return marker;
  }

  createLocationPin(color, isCurrentUser = false) {
    if (!this.google || !this.google.maps) {
      throw new Error("Google Maps not initialized");
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
      url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg),
      scaledSize: new this.google.maps.Size(size, size),
      anchor: new this.google.maps.Point(size / 2, size),
    };
  }

  createUserMarker(user, isCurrentUser = false, isWithinRadius = false) {
    const position = {
      lat: user.location.coordinates[1],
      lng: user.location.coordinates[0],
    };

    let markerOptions = {
      title: user.name,
      zIndex: isCurrentUser ? 1000 : isWithinRadius ? 200 : 100,
    };

    if (isCurrentUser) {
      // Use red location pin for current user
      markerOptions.icon = this.createLocationPin("#EA4335", true);
    } else {
      // Use blue location pins for nearby users
      markerOptions.icon = this.createLocationPin("#4285F4", false);
    }

    const marker = this.createMarker(position, markerOptions);

    const infoWindow = new this.google.maps.InfoWindow({
      content: this.createInfoWindowContent(user, isCurrentUser),
    });

    marker.addListener("click", () => {
      this.closeAllInfoWindows();
      infoWindow.open(this.map, marker);
    });

    this.markers.set(user.id || user._id, marker);
    this.infoWindows.set(user.id || user._id, infoWindow);

    return marker;
  }

  createInfoWindowContent(user, isCurrentUser = false) {
    console.log("aaaaaaaaa", user);

    if (isCurrentUser) {
      return `
      <div class="sophisticated-modal user-modal">
        <div class="modal-content1">
          <div class="modal-header1">
            <div class="avatar-container">
              <div class="avatar-ring">
                <img src="${
                  user.profilePhoto ||
                  "https://randomuser.me/api/portraits/men/32.jpg"
                }" alt="${user.name || "User"}" class="user-avatar" />
              </div>
              <div class="online-indicator pulsing"></div>
            </div>
            <div class="user-details">
              <h3 class="user-name">${user.name || "User"}</h3>
            </div>
            <button class="modal-close-btn" onclick="window.googleMapsService && window.googleMapsService.closeAllInfoWindows()" style="position: absolute; top: 10px; right: 10px; background: none; border: none; font-size: 18px; cursor: pointer; color: #666; z-index: 10; width: 30px; height: 30px; border-radius: 50%; background: rgba(255,255,255,0.8); display: flex; align-items: center; justify-content: center;">✕</button>
          </div>
          <div class="modal-body">
            <div class="user-info-section">
              <div class="info-item">
                <span class="info-label">性別:</span>
                <span class="info-value">${user.gender || "未設定"}</span>
              </div>
              <div class="info-item">
                <span class="info-label">電話番号:</span>
                <span class="info-value">${user.phoneNumber || "未設定"}</span>
              </div>
              <div class="info-item">
                <span class="info-label">住所:</span>
                <span class="info-value">${user.address || "未設定"}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      ${this.getModalStyles()}
      `;
    }

    // Store user data temporarily and use a simple ID reference
    const tempId = `user_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    if (!window.tempUserData) window.tempUserData = {};

    // Debug: Log user data to see what fields are available
    console.log("User data for modal:", user);
    console.log("Phone number field:", user.phoneNumber);
    console.log("All user fields:", Object.keys(user));

    window.tempUserData[tempId] = {
      id: user.id || user._id,
      name: user.name || "",
      location: user.location,
      profilePhoto: user.profilePhoto,
      gender: user.gender || "",
      phoneNumber: user.phoneNumber || "",
      address: user.address || "",
    };

    return `
      <div class="sophisticated-modal user-modal">
        <div class="modal-content1">
          <div class="modal-header1">
            <div class="profile-left">
              <img src="${
                user.profilePhoto ||
                "https://randomuser.me/api/portraits/men/32.jpg"
              }" alt="${user.name || "User"}" class="user-avatar" />
            </div>
            <div class="profile-right">
              <div class="user-info-section">
                <div class="user-name-row">
                  <svg class="user-icon" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                  </svg>
                  <h3 class="user-name">${user.name || "Unknown User"}</h3>
                </div>
                <div class="user-phone-row">
                  <svg class="phone-icon" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
                  </svg>
                  <p class="user-phone">${user.phoneNumber || "2222222222"}</p>
                </div>
                <div class="user-location-row">
                  <svg class="location-icon" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                  </svg>
                  <span class="location-text">${
                    user.address || "nara city"
                  }</span>
                </div>
              </div>
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
           min-width: 235px;
           max-width: 235px;
           width: 235px;
           font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif;
           position: relative;
           overflow: hidden;
           border-radius: 0;
           box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
           background: #374151;
           animation: modalSlideIn 0.4s cubic-bezier(0.4, 0, 0.2, 1);
         }

        @keyframes modalSlideIn {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .modal-backdrop {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(135deg,
            rgba(255, 255, 255, 0.98) 0%,
            rgba(248, 250, 255, 0.98) 25%,
            rgba(240, 245, 255, 0.98) 50%,
            rgba(235, 242, 255, 0.98) 75%,
            rgba(230, 240, 255, 0.98) 100%);
          z-index: 1;
        }

        .modal-content1 {
          position: relative;
          z-index: 2;
          padding: 0px;
          background: transparent;
        }
         .modal-header1 {
           display: flex;
           align-items: flex-start;
           gap: 12px;
           padding: 10px;
         }

         .profile-left {
           flex-shrink: 0;
           display: flex;
           flex-direction: column;
           align-items: center;
         }

         .profile-right {
           flex: 1;
           display: flex;
           flex-direction: column;
           justify-content: flex-start;
         }

         .user-info-section {
           width: 100%;
         }

         .user-avatar {
           width: 60px;
           height: 60px;
           border-radius: 50%;
           object-fit: cover;
           border: 2px solid #ffffff;
           box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
         }

         .user-name-row, .user-phone-row, .user-location-row {
           display: flex;
           align-items: center;
           gap: 6px;
           margin-bottom: 6px;
         }

         .user-icon, .phone-icon, .location-icon {
           color: #9ca3af;
           flex-shrink: 0;
         }

         .user-name {
           margin: 0;
           font-size: 14px;
           font-weight: 700;
           color: #ffffff;
           white-space: nowrap;
           overflow: hidden;
           text-overflow: ellipsis;
           max-width: 160px;
         }

         .user-phone {
           margin: 0;
           font-size: 12px;
           color: #d1d5db;
           white-space: nowrap;
           overflow: hidden;
           text-overflow: ellipsis;
           max-width: 160px;
         }

         .location-text {
           font-size: 12px;
           color: #d1d5db;
           white-space: nowrap;
           overflow: hidden;
           text-overflow: ellipsis;
           max-width: 160px;
         }



        /* Hide Google Maps default close button */
        .gm-style-iw-chr {
          display: none !important;
        }

        /* Remove padding from Google Maps elements */
        .gm-style {
          padding: 0 !important;
        }

         .gm-style-iw-c {
           padding: 0 !important;
           max-width: 235px !important;
           overflow: hidden !important;
         }

         .gm-style-iw-d {
           overflow: hidden !important;
           max-width: 235px !important;
         }

        /* Ensure no scrollbars appear */
        .gm-style-iw {
          overflow: hidden !important;
        }

        .modern-match-button {
          position: relative;
          width: 100%;
          border: none;
          border-radius: 16px;
          padding: 0;
          cursor: pointer;
          overflow: hidden;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 6px 20px rgba(74, 193, 224, 0.4);
          animation: buttonPulse 2s ease-in-out infinite alternate;
        }

        .modern-match-button:hover {
          transform: translateY(-3px);
          box-shadow: 0 16px 40px rgba(74, 193, 224, 0.5);
          animation: none;
        }

        .modern-match-button:active {
          transform: translateY(-1px);
        }

        @keyframes buttonPulse {
          from {
            box-shadow: 0 6px 20px rgba(74, 193, 224, 0.4);
          }
          to {
            box-shadow: 0 8px 28px rgba(74, 193, 224, 0.6);
          }
        }

        .button-gradient {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(135deg, #4AC1E0 0%, #f54d6a 100%);
          z-index: 1;
        }

        .button-content {
          position: relative;
          z-index: 2;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 14px 20px;
          color: white;
          font-size: 15px;
          font-weight: 700;
          letter-spacing: -0.3px;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
        }

        .button-icon {
          font-size: 20px;
        }

        .button-text {
          font-weight: 700;
        }

        .sophisticated-modal.current-user-modal .modal-header {
          background: linear-gradient(135deg,
            rgba(74, 193, 224, 0.1) 0%,
            rgba(245, 77, 106, 0.1) 100%);
        }

        .sophisticated-modal.current-user-modal .avatar-ring {
          background: linear-gradient(135deg, #4AC1E0 0%, #f54d6a 100%);
        }
      </style>
    `;
  }

  updateUserMarker(userId, newPosition, userData) {
    const marker = this.markers.get(userId);
    if (marker) {
      const position = {
        lat: newPosition.coordinates[1],
        lng: newPosition.coordinates[0],
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
      if (
        !userId.includes("current-user") &&
        !userId.includes("meeting-current-user") &&
        !userId.includes("meeting-target-user")
      ) {
        marker.setMap(null);
      }
    });
    this.infoWindows.forEach((infoWindow, userId) => {
      // Preserve current-user and meeting-related user markers
      if (
        !userId.includes("current-user") &&
        !userId.includes("meeting-current-user") &&
        !userId.includes("meeting-target-user")
      ) {
        infoWindow.close();
      }
    });

    // Keep current user, meeting current user, and meeting target user markers
    const preserveMarkers = new Map();
    const preserveWindows = new Map();

    ["current-user", "meeting-current-user", "meeting-target-user"].forEach(
      (key) => {
        const marker = this.markers.get(key);
        const window = this.infoWindows.get(key);
        if (marker) {
          preserveMarkers.set(key, marker);
        }
        if (window) {
          preserveWindows.set(key, window);
        }
      }
    );

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
      bounds.extend(
        new this.google.maps.LatLng(currentLocation.lat, currentLocation.lng)
      );
    }

    // Include all user locations
    users.forEach((user) => {
      if (user.location && user.location.coordinates) {
        bounds.extend(
          new this.google.maps.LatLng(
            user.location.coordinates[1],
            user.location.coordinates[0]
          )
        );
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
    this.infoWindows.forEach((infoWindow) => infoWindow.close());
  }

  async calculateRoute(origin, destination) {
    if (!this.directionsService) {
      throw new Error("Directions service not initialized");
    }

    return new Promise((resolve, reject) => {
      this.directionsService.route(
        {
          origin,
          destination,
          travelMode: this.google.maps.TravelMode.WALKING,
        },
        (result, status) => {
          if (status === "OK") {
            resolve(result);
          } else {
            reject(new Error(`Directions request failed: ${status}`));
          }
        }
      );
    });
  }

  displayRoute(directionsResult) {
    if (!this.directionsRenderer) {
      throw new Error("Directions renderer not initialized");
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
      url: "/icons/meeting-point.png",
      scaledSize: new this.google.maps.Size(50, 50),
      anchor: new this.google.maps.Point(25, 50),
    };

    const marker = this.createMarker(position, {
      icon,
      title: "Meeting Point",
      zIndex: 500,
    });

    const infoWindow = new this.google.maps.InfoWindow({
      content: `
        <div class="meeting-point-info">
          <h3>🎯 Meeting Point</h3>
          <p>${meetingInfo.address || "Custom location"}</p>
          <p><strong>Reason:</strong> ${meetingInfo.reason}</p>
          ${
            meetingInfo.scheduledTime
              ? `<p><strong>Time:</strong> ${new Date(
                  meetingInfo.scheduledTime
                ).toLocaleString()}</p>`
              : ""
          }
          <div class="meeting-actions">
            <button onclick="window.dispatchEvent(new CustomEvent('getDirections', {detail: {lat: ${
              position.lat
            }, lng: ${position.lng}}}))">
              Get Directions
            </button>
            <button onclick="window.dispatchEvent(new CustomEvent('confirmMeeting', {detail: {meetingId: '${
              meetingInfo.meetingId
            }'}}))">
              I'm Here
            </button>
          </div>
        </div>
      `,
    });

    marker.addListener("click", () => {
      this.closeAllInfoWindows();
      infoWindow.open(this.map, marker);
    });

    return marker;
  }

  async findNearbyPlaces(location, type = "restaurant") {
    if (!this.google) {
      throw new Error("Google Maps not initialized");
    }

    const service = new this.google.maps.places.PlacesService(this.map);

    return new Promise((resolve, reject) => {
      service.nearbySearch(
        {
          location,
          radius: 1000,
          type,
        },
        (results, status) => {
          if (status === this.google.maps.places.PlacesServiceStatus.OK) {
            resolve(results);
          } else {
            reject(new Error(`Places search failed: ${status}`));
          }
        }
      );
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
        coordinates: [newLocation.lng, newLocation.lat],
      },
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
      this.map.addListener("click", callback);
    }
  }

  addIdleListener(callback) {
    if (this.map) {
      this.map.addListener("idle", callback);
    }
  }

  closeAllInfoWindows() {
    this.infoWindows.forEach((infoWindow) => {
      infoWindow.close();
    });
  }
}

export default new GoogleMapsService();
