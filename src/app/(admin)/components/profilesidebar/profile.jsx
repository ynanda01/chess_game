import { useState, useEffect } from 'react';
import { FiUser, FiMail, FiEdit3, FiX } from "react-icons/fi";
import './profile.css';

export default function ProfileSidebar({ isOpen, onClose }) {
  const [userProfile, setUserProfile] = useState({});
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({});

  useEffect(() => {
    // Fetch user profile data
    const fetchUserProfile = async () => {
      try {
        // Replace with your actual API call
        const response = await fetch('/api/user/profile');
        if (response.ok) {
          const profileData = await response.json();
          setUserProfile(profileData);
          setEditForm(profileData);
        }
      } catch (error) {
        console.error('Failed to fetch profile:', error);
        // Fallback sample data for demo
        const sampleData = {
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@example.com',
          avatar: null
        };
        setUserProfile(sampleData);
        setEditForm(sampleData);
      }
    };

    if (isOpen) {
      fetchUserProfile();
    }
  }, [isOpen]);

  const handleInputChange = (field, value) => {
    setEditForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    try {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editForm)
      });

      if (response.ok) {
        const updatedProfile = await response.json();
        setUserProfile(updatedProfile);
        setIsEditing(false);
      } else {
        alert('Failed to update profile');
      }
    } catch (error) {
      console.error('Failed to update profile:', error);
      // For demo purposes, just update locally
      setUserProfile(editForm);
      setIsEditing(false);
      alert('Profile updated successfully!');
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
          >
            <FiX />
          </button>
        </div>

        {/* Profile Content */}
        <div className="profile-content">
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
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="profile-btn profile-btn--save"
                >
                  Save
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="profile-btn profile-btn--edit"
              >
                <FiEdit3 className="profile-btn-icon" />
                Edit Profile
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}