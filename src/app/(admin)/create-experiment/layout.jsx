'use client';

import Sidebar from '@/components/sidebar.jsx'; 

import './layout.css'; 

export default function CreateExperimentLayout({ children }) {
  return (
  
    <div className="layout">
      <aside className="sidebar">
        <h2 className="sidebar-title">Experiment Setup</h2>
        <Sidebar />
      </aside>

      <main className="main-content">
        {children}
      </main>
    </div>
 
  );
}
