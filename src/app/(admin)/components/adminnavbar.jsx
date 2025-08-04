'use client';
import { useState } from 'react';
import { useAuth } from '@/app/Authcontext/Authcontext';
import { useRouter } from 'next/navigation';
import { FiLogOut, FiUser, FiX } from 'react-icons/fi';
import ProfileSidebar from './profilesidebar/profile'; // Import your ProfileSidebar component

export default function AdminNavbar({ userName }) {
  const { logout } = useAuth();
  const router = useRouter();
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false); // Add profile sidebar state

  const handleLogout = () => {
    setShowLogoutDialog(true);
  };

  const confirmLogout = () => {
    logout();
    setShowLogoutDialog(false);
  };

  const cancelLogout = () => {
    setShowLogoutDialog(false);
  };

  const handleProfile = () => {
    setIsProfileOpen(true); // Open profile sidebar instead of navigating
  };

  const handleProfileClose = () => {
    setIsProfileOpen(false); // Close profile sidebar
  };

  return (
    <>
      <nav className="navbar">
        <div className="navbar-left">
          <img src="/logo.svg" alt="Logo" className="navbar-logo" />
        </div>
                
        <div className="navbar-center">
          <span className="welcome-text">Welcome, {userName}</span>
        </div>
                
        <div className="navbar-actions">
          <button 
            className="icon-btn profile"
            onClick={handleProfile}
            title="Profile"
          >
            <FiUser />
            <span className="btn-label">Profile</span>
          </button>
          <button 
            className="icon-btn logout"
            onClick={handleLogout}
            title="Logout"
          >
            <FiLogOut />
            <span className="btn-label">Logout</span>
          </button>
        </div>
      </nav>

      {/* Profile Sidebar */}
      <ProfileSidebar 
        isOpen={isProfileOpen} 
        onClose={handleProfileClose} 
      />

      {/* Custom Logout Confirmation Dialog */}
      {showLogoutDialog && (
        <div className="dialog-overlay">
          <div className="dialog-box">
            <div className="dialog-header">
              <h3>Confirm Logout</h3>
              <button className="close-btn" onClick={cancelLogout}>
                <FiX />
              </button>
            </div>
            <div className="dialog-content">
              <p>Are you sure you want to logout?</p>
            </div>
            <div className="dialog-actions">
              <button className="cancel-btn" onClick={cancelLogout}>
                Cancel
              </button>
              <button className="confirm-btn" onClick={confirmLogout}>
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}