import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { userAPI } from '../../services/api';
import { toast } from 'react-toastify';
import '../../styles/Profile.css';

const Profile = () => {
  const { user, updateUser, logout } = useAuth();
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
      toast.success('プロフィールが正常に更新されました！');
    } catch (error) {
      console.error('Profile update error:', error);
      toast.error('プロフィールの更新に失敗しました');
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
                src={formData.profilePhoto || 'https://randomuser.me/api/portraits/men/32.jpg'} 
                alt="プロフィール"
                className="profile-avatar-large"
              />
              <button className="change-photo-btn">
                変更
              </button>
            </div>
          </div>
          
          <div className="profile-actions">
            <div className="edit-actions">
              <button
                onClick={handleCancel}
                className="btn btn-secondary"
              >
                キャンセル
              </button>
              <button
                onClick={handleSubmit}
                className="btn btn-primary"
                disabled={loading}
              >
                {loading ? '保存中...' : '変更を保存'}
              </button>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="profile-form">
          <div className="form-section">
            <label htmlFor="name">名前</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="フルネームを入力してください"
            />
          </div>

          <div className="form-section">
            <label htmlFor="bio">自己紹介</label>
            <textarea
              id="bio"
              name="bio"
              value={formData.bio}
              onChange={handleInputChange}
              placeholder="自分について教えてください..."
              rows="4"
              maxLength="500"
            />
            <span className="char-count">{formData.bio.length}/500</span>
          </div>

          <div className="form-section">
            <label htmlFor="address">住所</label>
            <textarea
              id="address"
              name="address"
              value={formData.address}
              onChange={handleInputChange}
              placeholder="住所を入力してください"
              rows="2"
            />
          </div>

          <div className="form-section">
            <label>性別</label>
            <div className="profile-field-display">
              {user?.gender?.charAt(0).toUpperCase() + user?.gender?.slice(1)}
            </div>
          </div>

          <div className="form-section">
            <label>電話番号</label>
            <div className="profile-field-display">
              {user?.phoneNumber}
              <span className="verified-badge">認証済み</span>
            </div>
          </div>
        </form>

        <div className="profile-footer">
          <button
            onClick={logout}
            className="btn btn-danger"
          >
            サインアウト
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default Profile;