import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { userAPI } from '../../services/api';
import { toast } from 'react-toastify';
import '../../styles/Profile.css';

const Profile = () => {
  const { user, updateUser, logout } = useAuth();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    bio: user?.bio || '',
    profilePhoto: user?.profilePhoto || '',
    address: user?.address || ''
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await userAPI.updateProfile(formData);
      updateUser(response.data.user);
      toast.success('Profile updated successfully!');
      setEditing(false);
    } catch (error) {
      console.error('Profile update error:', error);
      toast.error('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      name: user?.name || '',
      bio: user?.bio || '',
      profilePhoto: user?.profilePhoto || '',
      address: user?.address || ''
    });
    setEditing(false);
  };

  return (
    <div className="profile-container">
      <motion.div 
        className="profile-card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="profile-header">
          <div className="profile-avatar-section">
            <div className="avatar-container">
              <img 
                src={formData.profilePhoto || '/default-avatar.png'} 
                alt="Profile"
                className="profile-avatar-large"
              />
              {editing && (
                <button className="change-photo-btn">
                  📷
                </button>
              )}
            </div>
            {!editing && (
              <div className="profile-stats">
                <div className="stat">
                  <span className="stat-number">{user?.matchCount || 0}</span>
                  <span className="stat-label">Matches</span>
                </div>
                <div className="stat">
                  <span className="stat-number">{user?.actualMeetCount || 0}</span>
                  <span className="stat-label">Meetings</span>
                </div>
              </div>
            )}
          </div>
          
          <div className="profile-actions">
            {editing ? (
              <div className="edit-actions">
                <button 
                  onClick={handleCancel}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSubmit}
                  className="btn btn-primary"
                  disabled={loading}
                >
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            ) : (
              <button 
                onClick={() => setEditing(true)}
                className="btn btn-outline"
              >
                ✏️ Edit Profile
              </button>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="profile-form">
          <div className="form-section">
            <label htmlFor="name">Name</label>
            {editing ? (
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Your full name"
              />
            ) : (
              <div className="profile-field-display">{user?.name}</div>
            )}
          </div>

          <div className="form-section">
            <label htmlFor="bio">Bio</label>
            {editing ? (
              <textarea
                id="bio"
                name="bio"
                value={formData.bio}
                onChange={handleInputChange}
                placeholder="Tell others about yourself..."
                rows="4"
                maxLength="500"
              />
            ) : (
              <div className="profile-field-display">
                {user?.bio || 'No bio added yet'}
              </div>
            )}
            {editing && (
              <span className="char-count">{formData.bio.length}/500</span>
            )}
          </div>

          <div className="form-section">
            <label htmlFor="address">Address</label>
            {editing ? (
              <textarea
                id="address"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                placeholder="Your address"
                rows="2"
              />
            ) : (
              <div className="profile-field-display">{user?.address}</div>
            )}
          </div>

          <div className="form-section">
            <label>Gender</label>
            <div className="profile-field-display">
              {user?.gender?.charAt(0).toUpperCase() + user?.gender?.slice(1)}
            </div>
          </div>

          <div className="form-section">
            <label>Phone Number</label>
            <div className="profile-field-display">
              {user?.phoneNumber}
              <span className="verified-badge">✅ Verified</span>
            </div>
          </div>
        </form>

        <div className="profile-footer">
          <button 
            onClick={logout}
            className="btn btn-danger"
          >
            🚪 Sign Out
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default Profile;