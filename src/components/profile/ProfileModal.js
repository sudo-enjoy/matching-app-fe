import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import '../../styles/Modal.css';

const ProfileModal = ({ onClose }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleViewFullProfile = () => {
    navigate('/profile');
    onClose();
  };

  const handleLogout = () => {
    logout();
    onClose();
  };

  const modalVariants = {
    hidden: { opacity: 0, scale: 0.8, y: 50 },
    visible: { 
      opacity: 1, 
      scale: 1, 
      y: 0,
      transition: { type: "spring", damping: 25, stiffness: 300 }
    },
    exit: { 
      opacity: 0, 
      scale: 0.8, 
      y: 50,
      transition: { duration: 0.2 }
    }
  };

  return (
    <motion.div
      className="modal-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="modal profile-modal-quick"
        variants={modalVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2>Your Profile</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="modal-content">
          <div className="quick-profile-info">
            <img 
              src={user?.profilePhoto || '/default-avatar.png'} 
              alt="Profile"
              className="user-avatar-large"
            />
            <div className="user-details">
              <h3>{user?.name}</h3>
              <p className="user-phone">{user?.phoneNumber} ✅</p>
              <p className="user-bio">{user?.bio || 'No bio added yet'}</p>
            </div>
          </div>

          <div className="profile-stats-row">
            <div className="stat">
              <span className="stat-number">{user?.matchCount || 0}</span>
              <span className="stat-label">Total Matches</span>
            </div>
            <div className="stat">
              <span className="stat-number">{user?.actualMeetCount || 0}</span>
              <span className="stat-label">Meetings</span>
            </div>
          </div>

          <div className="profile-actions">
            <motion.button
              onClick={handleViewFullProfile}
              className="btn btn-primary btn-full"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              ✏️ Edit Profile
            </motion.button>
            
            <motion.button
              onClick={handleLogout}
              className="btn btn-secondary btn-full"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              🚪 Sign Out
            </motion.button>
          </div>

          <div className="app-info">
            <h4>MatchApp v1.0</h4>
            <p>Connect with people nearby and meet in real life</p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default ProfileModal;