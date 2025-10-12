import React from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import "../../styles/Modal.css";

const ProfileModal = ({ onClose }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleViewFullProfile = () => {
    navigate("/profile");
    onClose();
  };

  const handleLogout = () => {
    navigate("/map");
    onClose();
  };

  const modalVariants = {
    hidden: { opacity: 0, scale: 0.8, y: 50 },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: { type: "spring", damping: 25, stiffness: 300 },
    },
    exit: {
      opacity: 0,
      scale: 0.8,
      y: 50,
      transition: { duration: 0.2 },
    },
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
          <h2>あなたのプロフィール</h2>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-content">
          <div className="quick-profile-info">
            <div className="profile-left">
              <img
                src={
                  user?.profilePhoto ||
                  "https://randomuser.me/api/portraits/men/32.jpg"
                }
                alt="プロフィール"
                className="user-avatar-large"
              />
            </div>
            <div className="profile-right">
              <div className="user-info-section">
                <div className="user-name-row">
                  <svg
                    className="user-icon"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                  </svg>
                  <h3 className="user-name">You</h3>
                </div>
                <div className="user-phone-row">
                  <svg
                    className="phone-icon"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
                  </svg>
                  <p className="user-phone">未設定</p>
                </div>
                <div className="user-location-row">
                  <svg
                    className="location-icon"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                  </svg>
                  <span className="location-text">未設定</span>
                </div>
              </div>
            </div>
          </div>

          <div className="profile-stats-row">
            <div className="stat">
              <span className="stat-number">{user?.matchCount || 0}</span>
              <span className="stat-label">総マッチ数</span>
            </div>
            <div className="stat">
              <span className="stat-number">{user?.actualMeetCount || 0}</span>
              <span className="stat-label">実際の出会い</span>
            </div>
          </div>

          <div className="profile-actions">
            <motion.button
              onClick={handleViewFullProfile}
              className="btn btn-primary btn-full"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              プロフィールを編集
            </motion.button>

            <motion.button
              onClick={handleLogout}
              className="btn btn-secondary btn-full"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              サインアウト
            </motion.button>
          </div>

          <div className="app-info">
            <h4>マッチアプリ v1.0</h4>
            <p>近くの人々と繋がり、実際に出会いましょう</p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default ProfileModal;
