import GoogleMapsService from './googleMaps';

class MeetingPointsService {
  constructor() {
    this.google = null;
    this.placesService = null;
    this.map = null;
    this.meetingMarkers = [];
    this.selectedMeetingPoint = null;
  }

  setGoogle(google, map) {
    this.google = google;
    this.map = map;
    if (map && google) {
      this.placesService = new google.maps.places.PlacesService(map);
    }

    // Add global function for meeting point selection
    if (!window.handleMeetingPointSelection) {
      window.handleMeetingPointSelection = (pointData) => {
        window.dispatchEvent(new CustomEvent('meetingPointSelected', { detail: pointData }));
      };
    }
  }

  // Calculate midpoint between two locations
  calculateMidpoint(location1, location2) {
    const lat = (location1.lat + location2.lat) / 2;
    const lng = (location1.lng + location2.lng) / 2;
    return { lat, lng };
  }

  // Calculate distance between two points in km
  calculateDistance(location1, location2) {
    if (!this.google || !location1 || !location2) {
      // Fallback to simple Euclidean distance approximation
      const latDiff = location1.lat - location2.lat;
      const lngDiff = location1.lng - location2.lng;
      const distance = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff) * 111; // Rough km approximation
      return Math.max(distance, 0.1); // Minimum 100m
    }

    try {
      const point1 = new this.google.maps.LatLng(location1.lat, location1.lng);
      const point2 = new this.google.maps.LatLng(location2.lat, location2.lng);

      return this.google.maps.geometry.spherical.computeDistanceBetween(point1, point2) / 1000;
    } catch (error) {
      console.error('Error calculating distance:', error);
      // Fallback calculation
      const latDiff = location1.lat - location2.lat;
      const lngDiff = location1.lng - location2.lng;
      const distance = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff) * 111;
      return Math.max(distance, 0.1);
    }
  }

  // Find convenient meeting points between two users based on meeting reason
  async findMeetingPoints(userLocation, targetLocation, meetingType = 'coffee') {
    console.log('Finding meeting points for:', meetingType, userLocation, targetLocation);

    const midpoint = this.calculateMidpoint(userLocation, targetLocation);
    const distance = this.calculateDistance(userLocation, targetLocation);

    console.log('Midpoint:', midpoint, 'Distance between users:', distance.toFixed(2), 'km');

    // Always start with fallback points to ensure we have something
    let meetingPoints = this.getFallbackMeetingPoints(userLocation, targetLocation, meetingType);

    // If Google Maps services are available, try to enhance with real places
    if (this.google && this.placesService) {
      try {
        // Adjust search radius based on distance between users
        const searchRadius = Math.min(Math.max(distance * 500, 1000), 10000); // 1km to 10km
        console.log('Search radius:', searchRadius, 'meters');

        // Define place types based on meeting reason
        const placeTypesByReason = {
          coffee: ['cafe', 'restaurant', 'bakery'],
          lunch: ['restaurant', 'cafe', 'meal_takeaway'],
          walk: ['park', 'tourist_attraction', 'point_of_interest'],
          drink: ['bar', 'restaurant', 'night_club'],
          workout: ['gym', 'park', 'spa'],
          explore: ['tourist_attraction', 'museum', 'shopping_mall'],
          study: ['library', 'cafe', 'university'],
          networking: ['cafe', 'restaurant', 'shopping_mall'],
          hobby: ['park', 'shopping_mall', 'store'],
          other: ['restaurant', 'cafe', 'park']
        };

        const placeTypes = placeTypesByReason[meetingType] || placeTypesByReason.coffee;
        console.log('Searching for place types:', placeTypes);

        const allPlaces = [];

        // Search for each place type with expanded search
        for (const type of placeTypes) {
          const places = await this.searchNearbyPlaces(midpoint, searchRadius, type);
          console.log(`Found ${places.length} places for type: ${type}`);
          allPlaces.push(...places);
        }

        // Remove duplicates
        const uniquePlaces = Array.from(
          new Map(allPlaces.map(place => [place.place_id, place])).values()
        );

        console.log(`Total unique places found: ${uniquePlaces.length}`);

        if (uniquePlaces.length > 0) {
          // Score and sort places
          const scoredPlaces = uniquePlaces.map(place => {
            const placeLocation = {
              lat: place.geometry.location.lat(),
              lng: place.geometry.location.lng()
            };

            const distanceToUser = this.calculateDistance(userLocation, placeLocation);
            const distanceToTarget = this.calculateDistance(targetLocation, placeLocation);
            const distanceDifference = Math.abs(distanceToUser - distanceToTarget);

            // Calculate fairness score (lower difference is better)
            const fairnessScore = 1 / (1 + distanceDifference);
            const ratingScore = (place.rating || 3) / 5;
            const totalScore = fairnessScore * 0.7 + ratingScore * 0.3;

            return {
              id: place.place_id,
              name: place.name,
              address: place.vicinity || place.formatted_address || 'Address not available',
              location: placeLocation,
              rating: place.rating || null,
              priceLevel: place.price_level || null,
              photos: place.photos ? place.photos.slice(0, 1) : [],
              types: place.types,
              distanceToUser: distanceToUser.toFixed(2),
              distanceToTarget: distanceToTarget.toFixed(2),
              walkingTimeUser: Math.round(distanceToUser * 12), // ~5km/h walking
              walkingTimeTarget: Math.round(distanceToTarget * 12),
              isOpen: place.opening_hours?.open_now || null,
              totalScore,
              icon: place.icon,
              isReal: true
            };
          });

          // Sort by score
          scoredPlaces.sort((a, b) => b.totalScore - a.totalScore);

          // Replace fallback points with real places (keep at least 3 total)
          const realPlaces = scoredPlaces.slice(0, 5);

          // Combine real places with fallback to ensure minimum 3
          if (realPlaces.length >= 3) {
            meetingPoints = realPlaces;
          } else {
            // Mix real places with fallback points
            meetingPoints = [...realPlaces, ...meetingPoints.slice(0, 5 - realPlaces.length)];
          }
        }
      } catch (error) {
        console.error('Error searching for real places:', error);
        // meetingPoints already contains fallback points
      }
    } else {
      console.log('Google Maps services not available, using fallback points only');
    }

    console.log(`Returning ${meetingPoints.length} meeting points:`, meetingPoints.map(p => p.name));
    return meetingPoints;
  }

  // Fallback meeting points when Places API fails
  getFallbackMeetingPoints(userLocation, targetLocation, meetingType = 'coffee') {
    const midpoint = this.calculateMidpoint(userLocation, targetLocation);
    const distance = this.calculateDistance(userLocation, targetLocation);

    // Activity-specific fallback names
    const fallbackNames = {
      coffee: [
        'Central Cafe Spot',
        'Midpoint Coffee Meeting',
        'Convenient Coffee Location',
        'Halfway Coffee Point',
        'Central Meeting Spot'
      ],
      lunch: [
        'Midpoint Restaurant Area',
        'Central Dining Location',
        'Lunch Meeting Point',
        'Convenient Restaurant Spot',
        'Central Food Court Area'
      ],
      walk: [
        'Scenic Walking Area',
        'Central Park Space',
        'Walking Path Meetup',
        'Green Space Meeting',
        'Nature Walk Starting Point'
      ],
      drink: [
        'Central Bar District',
        'Nightlife Meeting Point',
        'Social Hub Location',
        'Entertainment Area',
        'Central Pub Area'
      ],
      workout: [
        'Fitness Meeting Point',
        'Exercise Area',
        'Active Lifestyle Hub',
        'Workout Zone',
        'Sports Center Area'
      ],
      explore: [
        'Exploration Starting Point',
        'Discovery Hub',
        'Cultural District',
        'Tourist Area',
        'Adventure Meetup Point'
      ],
      study: [
        'Study Group Location',
        'Academic Meeting Point',
        'Learning Hub',
        'Quiet Study Area',
        'Educational Center'
      ],
      networking: [
        'Business District',
        'Professional Hub',
        'Networking Center',
        'Commercial Area',
        'Business Meeting Point'
      ],
      hobby: [
        'Creative Hub',
        'Activity Center',
        'Community Space',
        'Hobby Meetup Point',
        'Interest Group Location'
      ],
      other: [
        'Central Meeting Point',
        'Convenient Location',
        'Midway Spot',
        'General Meetup Area',
        'Central Hub'
      ]
    };

    const names = fallbackNames[meetingType] || fallbackNames.other;

    // Generate points around midpoint with varied distances
    const points = [];
    const offsets = [
      { lat: 0, lng: 0, description: 'Perfect center point between both locations' },
      { lat: 0.003, lng: 0.001, description: 'Slightly northeast of center' },
      { lat: -0.002, lng: 0.003, description: 'Southeast of midpoint' },
      { lat: 0.001, lng: -0.003, description: 'West of center point' },
      { lat: -0.001, lng: -0.001, description: 'Southwest of midpoint' }
    ];

    offsets.forEach((offset, index) => {
      const location = {
        lat: midpoint.lat + offset.lat,
        lng: midpoint.lng + offset.lng
      };

      const distanceToUser = this.calculateDistance(userLocation, location);
      const distanceToTarget = this.calculateDistance(targetLocation, location);

      points.push({
        id: `fallback-${meetingType}-${index}`,
        name: names[index],
        address: offset.description,
        location,
        distanceToUser: distanceToUser.toFixed(2),
        distanceToTarget: distanceToTarget.toFixed(2),
        walkingTimeUser: Math.round(distanceToUser * 12),
        walkingTimeTarget: Math.round(distanceToTarget * 12),
        isFallback: true,
        rating: null,
        isOpen: null,
        totalScore: 0.5 - (index * 0.1), // Slight preference for earlier points
        meetingType
      });
    });

    console.log(`Generated ${points.length} fallback points for ${meetingType}`);
    return points;
  }

  // Search nearby places using Google Places API
  searchNearbyPlaces(location, radius, type) {
    if (!this.placesService || !this.google) {
      console.warn('Places service not available');
      return Promise.resolve([]);
    }

    return new Promise((resolve, reject) => {
      const request = {
        location: new this.google.maps.LatLng(location.lat, location.lng),
        radius: radius,
        type: type
      };

      console.log(`Searching for ${type} within ${radius}m of`, location);

      this.placesService.nearbySearch(request, (results, status) => {
        console.log(`Places search for ${type} returned status: ${status}, found: ${results ? results.length : 0} results`);

        if (status === this.google.maps.places.PlacesServiceStatus.OK) {
          resolve(results.slice(0, 20)); // Increased limit for better selection
        } else if (status === this.google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
          console.log(`No ${type} places found in radius`);
          resolve([]);
        } else {
          console.warn(`Places search failed for ${type}: ${status}`);
          resolve([]);
        }
      });
    });
  }

  // Display meeting point markers on the map
  displayMeetingPoints(meetingPoints, onMarkerClick, userLocation = null, targetLocation = null) {
    this.clearMeetingMarkers();

    meetingPoints.forEach((point, index) => {
      const marker = new this.google.maps.Marker({
        position: point.location,
        map: this.map,
        title: point.name,
        animation: this.google.maps.Animation.DROP,
        icon: {
          url: point.isFallback
            ? 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png'
            : 'https://maps.google.com/mapfiles/ms/icons/green-dot.png',
          scaledSize: new this.google.maps.Size(40, 40)
        },
        zIndex: 100 + index
      });

      // Create info window with select button
      const infoWindow = new this.google.maps.InfoWindow({
        content: this.createMeetingPointInfo(point, index + 1, true)
      });

      marker.addListener('click', () => {
        this.meetingMarkers.forEach(m => m.infoWindow.close());
        infoWindow.open(this.map, marker);
      });

      this.meetingMarkers.push({ marker, infoWindow, point });
    });

    // Create/update current user marker
    if (userLocation) {
      this.ensureCurrentUserMarker(userLocation);
    }

    // Create/update target user marker
    if (targetLocation) {
      this.ensureTargetUserMarker(targetLocation);
    }

    // Fit map to show all meeting points and user locations
    if (meetingPoints.length > 0) {
      const bounds = new this.google.maps.LatLngBounds();

      // Add meeting points to bounds
      meetingPoints.forEach(point => {
        bounds.extend(point.location);
      });

      // Add user locations to bounds
      if (userLocation) {
        bounds.extend(new this.google.maps.LatLng(userLocation.lat, userLocation.lng));
      }
      if (targetLocation) {
        bounds.extend(new this.google.maps.LatLng(targetLocation.lat, targetLocation.lng));
      }

      this.map.fitBounds(bounds);

      // Ensure minimum zoom level for readability
      this.google.maps.event.addListenerOnce(this.map, 'bounds_changed', () => {
        if (this.map.getZoom() > 15) {
          this.map.setZoom(15);
        }
      });
    }
  }

  // Create info window content for meeting point
  createMeetingPointInfo(point, number, showSelectButton = false) {
    // Store point data temporarily for button click
    let buttonHtml = '';
    if (showSelectButton) {
      const tempId = `point_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      if (!window.tempPointData) window.tempPointData = {};
      window.tempPointData[tempId] = point;

      buttonHtml = `
        <button
          onclick="window.handleMeetingPointSelection && window.handleMeetingPointSelection(window.tempPointData['${tempId}'])"
          style="
            margin-top: 12px;
            padding: 8px 16px;
            background: #667eea;
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
            width: 100%;
            transition: all 0.3s ease;
          "
          onmouseover="this.style.background='#764ba2'"
          onmouseout="this.style.background='#667eea'"
        >
          Select This Location
        </button>
      `;
    }

    return `
      <div style="padding: 12px; max-width: 280px;">
        <h4 style="margin: 0 0 8px 0; color: #333; font-size: 16px;">
          ${number}. ${point.name}
        </h4>
        <p style="margin: 4px 0; color: #666; font-size: 13px; line-height: 1.4;">
          ${point.address}
        </p>
        ${point.rating ? `
          <div style="margin: 6px 0; color: #f39c12; font-size: 14px;">
            ⭐ ${point.rating}
          </div>
        ` : ''}
        <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #eee;">
          <div style="font-size: 12px; color: #666; line-height: 1.4;">
            <div style="margin-bottom: 4px;">👤 You: ${point.distanceToUser} km (${this.formatWalkingTime(point.walkingTimeUser)})</div>
            <div>👥 Them: ${point.distanceToTarget} km (${this.formatWalkingTime(point.walkingTimeTarget)})</div>
          </div>
        </div>
        ${!point.isFallback && point.isOpen !== null ? `
          <div style="margin-top: 6px; font-size: 12px; color: ${point.isOpen ? '#27ae60' : '#e74c3c'};">
            ${point.isOpen ? '🟢 Open now' : '🔴 Closed'}
          </div>
        ` : ''}
        ${buttonHtml}
      </div>
    `;
  }

  // Select and highlight a meeting point
  selectMeetingPoint(point) {
    this.selectedMeetingPoint = point;

    // Clear all markers first
    this.clearMeetingMarkers();

    // Create a prominent marker for selected point
    const marker = new this.google.maps.Marker({
      position: point.location,
      map: this.map,
      title: `Meeting Point: ${point.name}`,
      animation: this.google.maps.Animation.BOUNCE,
      icon: {
        path: this.google.maps.SymbolPath.CIRCLE,
        scale: 15,
        fillColor: '#4CAF50',
        fillOpacity: 0.9,
        strokeColor: '#ffffff',
        strokeWeight: 3,
        strokeOpacity: 1
      },
      zIndex: 1000
    });

    // Stop bouncing after 3 seconds
    setTimeout(() => {
      marker.setAnimation(null);
    }, 3000);

    // Create detailed info window
    const infoWindow = new this.google.maps.InfoWindow({
      content: `
        <div style="padding: 12px; max-width: 280px;">
          <h3 style="margin: 0 0 10px 0; color: #4CAF50;">
            📍 Selected Meeting Point
          </h3>
          <h4 style="margin: 0 0 8px 0; color: #333;">
            ${point.name}
          </h4>
          <p style="margin: 4px 0; color: #666;">
            ${point.address}
          </p>
          <div style="margin-top: 10px; padding: 8px; background: #f5f5f5; border-radius: 4px;">
            <div style="font-size: 13px; color: #555;">
              <div>📍 Your distance: ${point.distanceToUser} km</div>
              <div>🚶 Walking time: ${point.walkingTimeUser} min</div>
            </div>
          </div>
        </div>
      `
    });

    // Auto open info window
    infoWindow.open(this.map, marker);

    this.meetingMarkers.push({ marker, infoWindow, point });

    // Center map to show the meeting point
    this.map.panTo(point.location);
    this.map.setZoom(15);

    return marker;
  }

  // Clear all meeting markers from the map (but preserve user markers)
  clearMeetingMarkers() {
    this.meetingMarkers.forEach(({ marker, infoWindow }) => {
      infoWindow.close();
      marker.setMap(null);
    });
    this.meetingMarkers = [];
  }

  // Clear all markers including user markers
  clearAllMarkers() {
    this.clearMeetingMarkers();

    if (this.currentUserMarker) {
      this.currentUserMarker.setMap(null);
      this.currentUserMarker = null;
      // Remove from GoogleMapsService if it was registered
      if (GoogleMapsService.markers) {
        GoogleMapsService.markers.delete('meeting-current-user');
      }
    }

    if (this.targetUserMarker) {
      this.targetUserMarker.setMap(null);
      this.targetUserMarker = null;
      // Remove from GoogleMapsService if it was registered
      if (GoogleMapsService.markers) {
        GoogleMapsService.markers.delete('meeting-target-user');
      }
    }

    if (this.currentUserInfoWindow) {
      this.currentUserInfoWindow.close();
      this.currentUserInfoWindow = null;
      // Remove from GoogleMapsService if it was registered
      if (GoogleMapsService.infoWindows) {
        GoogleMapsService.infoWindows.delete('meeting-current-user');
      }
    }

    if (this.targetUserInfoWindow) {
      this.targetUserInfoWindow.close();
      this.targetUserInfoWindow = null;
      // Remove from GoogleMapsService if it was registered
      if (GoogleMapsService.infoWindows) {
        GoogleMapsService.infoWindows.delete('meeting-target-user');
      }
    }
  }

  // Ensure current user marker is visible on the map
  ensureCurrentUserMarker(userLocation) {
    // Check if GoogleMapsService already has a current-user marker
    const existingGoogleMarker = GoogleMapsService.markers && GoogleMapsService.markers.get('current-user');

    if (existingGoogleMarker) {
      // Use the existing GoogleMapsService marker, just update its style to be more prominent
      this.currentUserMarker = existingGoogleMarker;
      existingGoogleMarker.setIcon({
        path: this.google.maps.SymbolPath.CIRCLE,
        scale: 10,
        fillColor: '#4285F4',
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 3,
        strokeOpacity: 1
      });
      existingGoogleMarker.setZIndex(1000);
      return;
    }

    // Remove existing current user marker if it exists
    if (this.currentUserMarker) {
      this.currentUserMarker.setMap(null);
    }

    // Create distinctive current user marker (small blue circle) and register it in GoogleMapsService
    this.currentUserMarker = new this.google.maps.Marker({
      position: { lat: userLocation.lat, lng: userLocation.lng },
      map: this.map,
      title: 'Your Location (Meeting Points)',
      icon: {
        path: this.google.maps.SymbolPath.CIRCLE,
        scale: 10,
        fillColor: '#4285F4',
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 3,
        strokeOpacity: 1
      },
      zIndex: 1000 // High z-index to appear above other markers
    });

    // Register this marker in GoogleMapsService to prevent it from being cleared
    if (GoogleMapsService.markers) {
      GoogleMapsService.markers.set('meeting-current-user', this.currentUserMarker);
    }

    // Create simple info window for current user
    const infoWindow = new this.google.maps.InfoWindow({
      content: `
        <div style="padding: 8px; text-align: center;">
          <div style="font-weight: bold; color: #4285F4; margin-bottom: 4px;">📍 Your Location</div>
          <div style="font-size: 12px; color: #666;">Current position</div>
        </div>
      `
    });

    this.currentUserMarker.addListener('click', () => {
      this.meetingMarkers.forEach(m => m.infoWindow.close());
      if (this.targetUserInfoWindow) this.targetUserInfoWindow.close();
      infoWindow.open(this.map, this.currentUserMarker);
    });

    this.currentUserInfoWindow = infoWindow;

    // Also register the info window
    if (GoogleMapsService.infoWindows) {
      GoogleMapsService.infoWindows.set('meeting-current-user', infoWindow);
    }
  }

  // Ensure target user marker is visible on the map
  ensureTargetUserMarker(targetLocation, targetName = 'Other User') {
    // Remove existing target user marker if it exists
    if (this.targetUserMarker) {
      this.targetUserMarker.setMap(null);
      // Remove from GoogleMapsService if it was registered
      if (GoogleMapsService.markers) {
        GoogleMapsService.markers.delete('meeting-target-user');
      }
      if (GoogleMapsService.infoWindows) {
        GoogleMapsService.infoWindows.delete('meeting-target-user');
      }
    }

    // Create distinctive target user marker (small orange circle)
    this.targetUserMarker = new this.google.maps.Marker({
      position: { lat: targetLocation.lat, lng: targetLocation.lng },
      map: this.map,
      title: targetName + "'s Location",
      icon: {
        path: this.google.maps.SymbolPath.CIRCLE,
        scale: 9,
        fillColor: '#FF6B35',
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 2,
        strokeOpacity: 1
      },
      zIndex: 999 // High z-index but below current user
    });

    // Register this marker in GoogleMapsService to prevent it from being cleared
    if (GoogleMapsService.markers) {
      GoogleMapsService.markers.set('meeting-target-user', this.targetUserMarker);
    }

    // Create simple info window for target user
    const infoWindow = new this.google.maps.InfoWindow({
      content: `
        <div style="padding: 8px; text-align: center;">
          <div style="font-weight: bold; color: #FF6B35; margin-bottom: 4px;">👤 ${targetName}</div>
          <div style="font-size: 12px; color: #666;">Meeting partner location</div>
        </div>
      `
    });

    this.targetUserMarker.addListener('click', () => {
      this.meetingMarkers.forEach(m => m.infoWindow.close());
      if (this.currentUserInfoWindow) this.currentUserInfoWindow.close();
      infoWindow.open(this.map, this.targetUserMarker);
    });

    this.targetUserInfoWindow = infoWindow;

    // Also register the info window
    if (GoogleMapsService.infoWindows) {
      GoogleMapsService.infoWindows.set('meeting-target-user', infoWindow);
    }
  }

  // Get selected meeting point
  getSelectedMeetingPoint() {
    return this.selectedMeetingPoint;
  }

  // Format walking time
  formatWalkingTime(minutes) {
    if (minutes < 60) {
      return `${minutes} min`;
    } else {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
    }
  }

  // Format price level
  formatPriceLevel(priceLevel) {
    if (!priceLevel) return '';
    return '$'.repeat(priceLevel);
  }
}

export default new MeetingPointsService();