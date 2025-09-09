import React, { createContext, useContext, useEffect, useState } from 'react';
import io from 'socket.io-client';
import { useAuth } from './AuthContext';
import { toast } from 'react-toastify';

const SocketContext = createContext();

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState(new Map());
  const [matchRequests, setMatchRequests] = useState([]);
  const [currentMatches, setCurrentMatches] = useState([]);

  useEffect(() => {
    if (isAuthenticated && user) {
      const token = localStorage.getItem('authToken');
      
      const newSocket = io(process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000', {
        auth: { token },
        transports: ['websocket', 'polling']
      });

      newSocket.on('connect', () => {
        console.log('Socket connected:', newSocket.id);
        setConnected(true);
      });

      newSocket.on('disconnect', () => {
        console.log('Socket disconnected');
        setConnected(false);
      });

      newSocket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        setConnected(false);
      });

      newSocket.on('userOnline', (data) => {
        setOnlineUsers(prev => new Map(prev.set(data.userId, {
          id: data.userId,
          name: data.name,
          location: data.location,
          profilePhoto: data.profilePhoto,
          isOnline: true,
          lastSeen: new Date()
        })));
      });

      newSocket.on('userOffline', (data) => {
        setOnlineUsers(prev => {
          const updated = new Map(prev);
          if (updated.has(data.userId)) {
            updated.set(data.userId, {
              ...updated.get(data.userId),
              isOnline: false,
              lastSeen: new Date(data.lastSeen)
            });
          }
          return updated;
        });
      });

      newSocket.on('userLocationUpdate', (data) => {
        setOnlineUsers(prev => {
          const updated = new Map(prev);
          if (updated.has(data.userId)) {
            updated.set(data.userId, {
              ...updated.get(data.userId),
              location: data.location,
              lastSeen: new Date()
            });
          }
          return updated;
        });
      });

      newSocket.on('newMatchRequest', (data) => {
        setMatchRequests(prev => [...prev, data]);
        toast.info(`New match request from ${data.requester.name}`, {
          onClick: () => window.dispatchEvent(new CustomEvent('showMatchRequest', { detail: data }))
        });
      });

      newSocket.on('matchAccepted', (data) => {
        setCurrentMatches(prev => [...prev, data]);
        toast.success(`${data.targetUser.name} accepted your match request!`, {
          onClick: () => window.dispatchEvent(new CustomEvent('showMatch', { detail: data }))
        });
      });

      newSocket.on('matchRejected', (data) => {
        toast.error('Your match request was declined');
      });

      newSocket.on('matchConfirmed', (data) => {
        setCurrentMatches(prev => [...prev, data]);
        toast.success('Match confirmed! Meeting details available.', {
          onClick: () => window.dispatchEvent(new CustomEvent('showMatch', { detail: data }))
        });
      });

      newSocket.on('meetingConfirmed', (data) => {
        if (data.bothConfirmed) {
          toast.success('Both parties confirmed the meeting!');
        } else {
          toast.info(`${data.confirmedBy} confirmed the meeting`);
        }
      });

      newSocket.on('userApproachingMeeting', (data) => {
        toast.info(`${data.userName} is approaching the meeting point`);
      });

      newSocket.on('locationShared', (data) => {
        toast.info(`${data.senderName} shared their location with you`);
        window.dispatchEvent(new CustomEvent('locationShared', { detail: data }));
      });

      newSocket.on('locationShareExpired', (data) => {
        window.dispatchEvent(new CustomEvent('locationShareExpired', { detail: data }));
      });

      newSocket.on('ping', () => {
        newSocket.emit('pong');
      });

      setSocket(newSocket);

      return () => {
        newSocket.close();
      };
    } else {
      if (socket) {
        socket.close();
        setSocket(null);
        setConnected(false);
        setOnlineUsers(new Map());
        setMatchRequests([]);
        setCurrentMatches([]);
      }
    }
  }, [isAuthenticated, user]);

  const updateLocation = (lat, lng) => {
    if (socket && connected) {
      socket.emit('updateLocation', { lat, lng });
    }
  };

  const joinRoom = (roomId) => {
    if (socket && connected) {
      socket.emit('joinRoom', roomId);
    }
  };

  const leaveRoom = (roomId) => {
    if (socket && connected) {
      socket.emit('leaveRoom', roomId);
    }
  };

  const sendMessage = (roomId, message, targetUserId) => {
    if (socket && connected) {
      socket.emit('sendMessage', { roomId, message, targetUserId });
    }
  };

  const notifyApproachingMeeting = (matchId, targetUserId, distance) => {
    if (socket && connected) {
      socket.emit('approachingMeeting', { matchId, targetUserId, distance });
    }
  };

  const requestLocationShare = (targetUserId) => {
    if (socket && connected) {
      socket.emit('requestLocationShare', targetUserId);
    }
  };

  const shareLocation = (targetUserId, location, duration = 300000) => {
    if (socket && connected) {
      socket.emit('shareLocation', { targetUserId, location, duration });
    }
  };

  const removeMatchRequest = (matchId) => {
    setMatchRequests(prev => prev.filter(req => req.matchId !== matchId));
  };

  const value = {
    socket,
    connected,
    onlineUsers: Array.from(onlineUsers.values()),
    matchRequests,
    currentMatches,
    updateLocation,
    joinRoom,
    leaveRoom,
    sendMessage,
    notifyApproachingMeeting,
    requestLocationShare,
    shareLocation,
    removeMatchRequest
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};