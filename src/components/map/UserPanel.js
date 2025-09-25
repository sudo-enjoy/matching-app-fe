import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from '../../contexts/LocationContext';
import '../../styles/UserPanel.css';

const UserPanel = ({ users, onClose, onUserSelect }) => {
  const { currentLocation, calculateDistance } = useLocation();
  const [filterGender, setFilterGender] = useState('all');
  const [sortBy, setSortBy] = useState('distance');

  const filteredUsers = users.filter(user => {
    if (filterGender !== 'all' && user.gender !== filterGender) {
      return false;
    }
    return true;
  });

  const sortedUsers = [...filteredUsers].sort((a, b) => {
    if (sortBy === 'distance' && currentLocation) {
      const distanceA = calculateDistance(
        currentLocation.lat, currentLocation.lng,
        a.location.coordinates[1], a.location.coordinates[0]
      );
      const distanceB = calculateDistance(
        currentLocation.lat, currentLocation.lng,
        b.location.coordinates[1], b.location.coordinates[0]
      );
      return distanceA - distanceB;
    }
    if (sortBy === 'matches') {
      return (b.matchCount || 0) - (a.matchCount || 0);
    }
    if (sortBy === 'name') {
      return a.name.localeCompare(b.name);
    }
    return 0;
  });

  const formatDistance = (user) => {
    if (!currentLocation || !user.location) return '';
    
    const distance = calculateDistance(
      currentLocation.lat, currentLocation.lng,
      user.location.coordinates[1], user.location.coordinates[0]
    );
    if (distance < 1000) {
      return `${Math.round(distance)}m離れています`;
    }
    return `${(distance / 1000).toFixed(1)}km離れています`;
  };

  const getTimeAgo = (lastSeen) => {
    if (!lastSeen) return '不明';

    const now = new Date();
    const seen = new Date(lastSeen);
    const diffMs = now - seen;
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'たった今';
    if (diffMins < 60) return `${diffMins}分前`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}時間前`;
    return `${Math.floor(diffMins / 1440)}日前`;
  };

  const handleUserClick = (user) => {
    onUserSelect(user);
    window.dispatchEvent(new CustomEvent('requestMatch', { 
      detail: { userId: user.id || user._id, name: user.name }
    }));
  };

  const panelVariants = {
    hidden: { y: "100%", opacity: 0 },
    visible: { 
      y: 0, 
      opacity: 1,
      transition: { type: "spring", damping: 25, stiffness: 300 }
    },
    exit: { 
      y: "100%", 
      opacity: 0,
      transition: { duration: 0.3 }
    }
  };

  const userItemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: (i) => ({
      opacity: 1,
      x: 0,
      transition: { delay: i * 0.05, duration: 0.3 }
    }),
    hover: { 
      scale: 1.02, 
      backgroundColor: "#f8f9ff",
      transition: { duration: 0.2 }
    }
  };

  return (
    <motion.div
      className="user-panel-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="user-panel"
        variants={panelVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="user-panel-header">
          <h3>近くの人々 ({sortedUsers.length})</h3>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="user-panel-filters">
          <div className="filter-group">
            <label>性別:</label>
            <select 
              value={filterGender} 
              onChange={(e) => setFilterGender(e.target.value)}
            >
              <option value="all">すべて</option>
              <option value="male">男性</option>
              <option value="female">女性</option>
              <option value="other">その他</option>
            </select>
          </div>
          
          <div className="filter-group">
            <label>並び替え:</label>
            <select 
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="distance">距離</option>
              <option value="matches">マッチ数</option>
              <option value="name">名前</option>
            </select>
          </div>
        </div>

        <div className="users-list">
          <AnimatePresence>
            {sortedUsers.length === 0 ? (
              <motion.div
                className="empty-state"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <div className="empty-icon">👥</div>
                <h4>ユーザーが見つかりません</h4>
                <p>フィルターを調整するか、後でもう一度確認してください</p>
              </motion.div>
            ) : (
              sortedUsers.map((user, index) => (
                <motion.div
                  key={user.id || user._id}
                  className="user-item"
                  variants={userItemVariants}
                  initial="hidden"
                  animate="visible"
                  whileHover="hover"
                  custom={index}
                  onClick={() => handleUserClick(user)}
                >
                  <div className="user-avatar-container">
                    <img 
                      src={user.profilePhoto || '/default-avatar.png'} 
                      alt={user.name}
                      className="user-avatar"
                    />
                    <div className={`status-indicator ${user.isOnline ? 'online' : 'offline'}`}>
                      {user.isOnline ? '🟢' : '⚫'}
                    </div>
                  </div>

                  <div className="user-info">
                    <div className="user-name-row">
                      <h4>{user.name}</h4>
                      <span className="user-gender">{user.gender}</span>
                    </div>
                    
                    <p className="user-bio">{user.bio || '自己紹介がありません'}</p>
                    
                    <div className="user-stats">
                      <span className="distance">{formatDistance(user)}</span>
                      <span className="matches">{user.matchCount || 0} マッチ</span>
                      <span className="meetings">{user.actualMeetCount || 0} 出会い</span>
                    </div>
                    
                    <div className="user-activity">
                      {user.isOnline ? (
                        <span className="online-status">🟢 オンライン中</span>
                      ) : (
                        <span className="offline-status">
                          最後に見た時間 {getTimeAgo(user.lastSeen)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="user-actions">
                    <motion.button
                      className="match-btn"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUserClick(user);
                      }}
                    >
                      💌
                    </motion.button>
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>

        <div className="user-panel-footer">
          <div className="legend">
            <div className="legend-item">
              <span className="legend-icon">🟢</span>
              <span>オンライン</span>
            </div>
            <div className="legend-item">
              <span className="legend-icon">⚫</span>
              <span>オフライン</span>
            </div>
            <div className="legend-item">
              <span className="legend-icon">💌</span>
              <span>マッチリクエストを送信</span>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default UserPanel;