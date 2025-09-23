import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { userAPI } from '../services/api';
import { toast } from 'react-toastify';

const LocationContext = createContext();

export const useLocation = () => {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
};

export const LocationProvider = ({ children }) => {
  const [currentLocation, setCurrentLocation] = useState(null);
  const [locationPermission, setLocationPermission] = useState(null);
  const [watchId, setWatchId] = useState(null);
  const [nearbyUsers, setNearbyUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  const requestLocationPermission = useCallback(async () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by this browser');
      return false;
    }

    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000
        });
      });

      const location = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy
      };

      setCurrentLocation(location);
      setLocationPermission('granted');
      
      await updateLocationOnServer(location.lat, location.lng);
      return true;
    } catch (error) {
      console.error('Location permission error:', error);
      setLocationPermission('denied');
      
      if (error.code === 1) {
        toast.error('Location permission denied. Please enable location access in your browser settings.');
      } else if (error.code === 2) {
        toast.error('Location unavailable. Please check your GPS settings.');
      } else {
        toast.error('Location request timeout. Please try again.');
      }
      
      return false;
    }
  }, []);

  const startLocationTracking = useCallback(() => {
    if (!navigator.geolocation || locationPermission !== 'granted') {
      return;
    }

    const id = navigator.geolocation.watchPosition(
      (position) => {
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy
        };

        setCurrentLocation(prevLocation => {
          if (!prevLocation || 
              Math.abs(prevLocation.lat - location.lat) > 0.0001 ||
              Math.abs(prevLocation.lng - location.lng) > 0.0001) {
            updateLocationOnServer(location.lat, location.lng);
            return location;
          }
          return prevLocation;
        });
      },
      (error) => {
        console.error('Location tracking error:', error);
      },
      {
        enableHighAccuracy: true,
        timeout: 30000,
        maximumAge: 60000
      }
    );

    setWatchId(id);
  }, [locationPermission]);

  const stopLocationTracking = useCallback(() => {
    if (watchId) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }
  }, [watchId]);

  const updateLocationOnServer = async (lat, lng) => {
    try {
      await userAPI.updateLocation(lat, lng);
    } catch (error) {
      console.error('Failed to update location on server:', error);
    }
  };

  const seedUsers = async () => {
    try {
      setLoading(true);
      const response = await userAPI.seedUsers();
      toast.success('Test users created successfully!');
      return response.data;
    } catch (error) {
      console.error('Error seeding users:', error);
      toast.error('Failed to create test users');
    } finally {
      setLoading(false);
    }
  };

  const getAllUsers = async () => {
    try {
      setLoading(true);
      const response = await userAPI.getAllUsers();
      const users = response.data?.users || [];
      setNearbyUsers(users);
      toast.success(`Loaded ${users.length} users`);
      return users;
    } catch (error) {
      console.error('Error fetching all users:', error);
      toast.error('Failed to load users');
      return [];
    } finally {
      setLoading(false);
    }
  };

  const getNearbyUsers = async (radius = 10000) => {
    if (!currentLocation) {
      toast.error('Location not available');
      return;
    }

    try {
      setLoading(true);

      const response = await userAPI.getNearbyUsers(
        currentLocation.lat,
        currentLocation.lng,
        radius
      );

      const users = response.data || [];
      setNearbyUsers(users);
      toast.success(`Found ${users.length} nearby users within ${radius/1000}km`);
      return users;
    } catch (error) {
      console.error('Error fetching nearby users:', error);
      toast.error('Failed to load nearby users');
      return [];
    } finally {
      setLoading(false);
    }
  };

  const calculateDistance = (lat1, lng1, lat2, lng2) => {
    const R = 6371e3;
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lng2-lng1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
  };

  const getDirections = (destination) => {
    if (!currentLocation || !destination) {
      return null;
    }

    const distance = calculateDistance(
      currentLocation.lat,
      currentLocation.lng,
      destination.lat,
      destination.lng
    );

    const walkingTime = Math.ceil(distance / 83.33);

    return {
      distance: Math.round(distance),
      walkingTime,
      origin: currentLocation,
      destination
    };
  };

  useEffect(() => {
    if (locationPermission === 'granted') {
      startLocationTracking();
    }

    return () => stopLocationTracking();
  }, [locationPermission, startLocationTracking, stopLocationTracking]);

  const value = {
    currentLocation,
    locationPermission,
    nearbyUsers,
    loading,
    requestLocationPermission,
    startLocationTracking,
    stopLocationTracking,
    seedUsers,
    getAllUsers,
    getNearbyUsers,
    calculateDistance,
    getDirections,
    updateLocationOnServer
  };

  return (
    <LocationContext.Provider value={value}>
      {children}
    </LocationContext.Provider>
  );
};