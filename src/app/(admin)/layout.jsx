'use client';
import './admin.css';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/Authcontext/Authcontext';
import AdminNavbar from './components/adminnavbar.jsx';

export default function AdminLayout({ children }) {
  const { user, isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    // Only proceed when loading is complete
    if (!loading) {
      if (!isAuthenticated) {
        // Clear any stale state and redirect to login
        setAuthReady(false);
        router.replace('/login');
      } else {
        // User is authenticated, ready to show admin content
        setAuthReady(true);
      }
    }
  }, [loading, isAuthenticated, router]);

  // Show loading while auth is being determined
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-900">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  // Don't render admin content if not authenticated or not ready
  if (!isAuthenticated || !authReady) {
    return null;
  }

  return (
    <div className="admin-root">
      <AdminNavbar userName={user?.name || 'Experimenter'} />
      <main>{children}</main>
    </div>
  );
}