// Updated ProfileSidebar.js
import { useState, useEffect } from 'react';
import { FiUser, FiMail, FiEdit3, FiX } from "react-icons/fi";
import { useAuth } from "@/app/Authcontext/Authcontext.js";
import './profile.css';

export default function ProfileSidebar({ isOpen, onClose }) {
  const { user, login } = useAuth(); // Get user from auth context
  const [userProfile, setUserProfile] = useState({});
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user?.email) return;
      
      setLoading(true);
      try {
        const response = await fetch('/api/profile', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'user-email': user.email
          }
        });

        if (response.ok) {
          const profileData = await response.json();
          setUserProfile(profileData);
          setEditForm(profileData);
        } else {
          // Fallback to user data from auth context
          const fallbackData = {
            firstName: user.name?.split(' ')[0] || '',
            lastName: user.name?.split(' ').slice(1).join(' ') || '',
            email: user.email,
            avatar: null
          };
          setUserProfile(fallbackData);
          setEditForm(fallbackData);
        }
      } catch (error) {
        console.error('Failed to fetch profile:', error);
        // Fallback to user data from auth context
        const fallbackData = {
          firstName: user.name?.split(' ')[0] || '',
          lastName: user.name?.split(' ').slice(1).join(' ') || '',
          email: user.email,
          avatar: null
        };
        setUserProfile(fallbackData);
        setEditForm(fallbackData);
      } finally {
        setLoading(false);
      }
    };

    if (isOpen && user) {
      fetchUserProfile();
    }
  }, [isOpen, user]);

  const handleInputChange = (field, value) => {
    setEditForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    if (!user?.email) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'user-email': user.email
        },
        body: JSON.stringify(editForm)
      });

      if (response.ok) {
        const updatedProfile = await response.json();
        setUserProfile(updatedProfile);
        setIsEditing(false);
        
        // Update auth context with new name
        const updatedUser = {
          ...user,
          name: `${updatedProfile.firstName} ${updatedProfile.lastName}`.trim(),
          email: updatedProfile.email
        };
        login(updatedUser);
        
        alert('Profile updated successfully!');
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Failed to update profile:', error);
      alert('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setEditForm(userProfile);
    setIsEditing(false);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="profile-backdrop"
        onClick={onClose}
      />
      
      {/* Sidebar */}
      <div className={`profile-sidebar ${isOpen ? 'profile-sidebar--open' : ''}`}>
        {/* Header */}
        <div className="profile-header">
          <h2 className="profile-title">Profile</h2>
          <button
            onClick={onClose}
            className="profile-close-btn"
            disabled={loading}
          >
            <FiX />
          </button>
        </div>

        {/* Profile Content */}
        <div className="profile-content">
          {loading ? (
            <div className="profile-loading">Loading...</div>
          ) : (
            <>
              {/* Avatar Section */}
              <div className="profile-avatar-section">
                <div className="profile-avatar">
                  {userProfile.avatar ? (
                    <img 
                      src={userProfile.avatar} 
                      alt="Profile" 
                      className="profile-avatar-img"
                    />
                  ) : (
                    <FiUser className="profile-avatar-icon" />
                  )}
                </div>
                <h3 className="profile-name">
                  {userProfile.firstName} {userProfile.lastName}
                </h3>
              </div>

              {/* Profile Details */}
              <div className="profile-details">
                {/* First Name */}
                <div className="profile-field">
                  <label className="profile-label">
                    First Name
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editForm.firstName || ''}
                      onChange={(e) => handleInputChange('firstName', e.target.value)}
                      className="profile-input"
                      disabled={loading}
                    />
                  ) : (
                    <div className="profile-field-display">
                      <FiUser className="profile-field-icon" />
                      <span className="profile-field-value">
                        {userProfile.firstName || 'Not provided'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Last Name */}
                <div className="profile-field">
                  <label className="profile-label">
                    Last Name
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editForm.lastName || ''}
                      onChange={(e) => handleInputChange('lastName', e.target.value)}
                      className="profile-input"
                      disabled={loading}
                    />
                  ) : (
                    <div className="profile-field-display">
                      <FiUser className="profile-field-icon" />
                      <span className="profile-field-value">
                        {userProfile.lastName || 'Not provided'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Email */}
                <div className="profile-field">
                  <label className="profile-label">
                    Email
                  </label>
                  {isEditing ? (
                    <input
                      type="email"
                      value={editForm.email || ''}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className="profile-input"
                      disabled={loading}
                    />
                  ) : (
                    <div className="profile-field-display">
                      <FiMail className="profile-field-icon" />
                      <span className="profile-field-value">
                        {userProfile.email || 'Not provided'}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="profile-actions">
                {isEditing ? (
                  <div className="profile-edit-actions">
                    <button
                      onClick={handleCancel}
                      className="profile-btn profile-btn--cancel"
                      disabled={loading}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSave}
                      className="profile-btn profile-btn--save"
                      disabled={loading}
                    >
                      {loading ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="profile-btn profile-btn--edit"
                    disabled={loading}
                  >
                    <FiEdit3 className="profile-btn-icon" />
                    Edit Profile
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}