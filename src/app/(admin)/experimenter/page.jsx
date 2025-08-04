"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FiPlus, FiEdit, FiSettings, FiTrash, FiDownload, FiX, FiPlay, FiPause} from "react-icons/fi";
import { AlertTriangle } from "lucide-react";
import { useAuth } from "@/app/Authcontext/Authcontext.js";
import { showSuccess, showError } from "../../../../lib/toast.js";
import "./page.css";

// Custom Confirmation Modal Component
function DeleteConfirmationModal({ isOpen, experiment, onConfirm, onCancel }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>Delete Experiment</h3>
          <button onClick={onCancel} className="modal-close">
            <FiX />
          </button>
        </div>
        
        <div className="modal-body">
          <div className="warning-icon">
            <AlertTriangle size={48} color="#ef4444" />
          </div>
          <p>Are you sure you want to delete the experiment:</p>
          <p className="experiment-name">"{experiment?.name}"</p>
          <div className="warning-text">
            <p><strong>⚠️ Warning:</strong> Please export your data before deleting.</p>
            <p>This action cannot be undone and all experiment data will be permanently lost.</p>
          </div>
        </div>
        
        <div className="modal-actions">
          <button onClick={onCancel} className="btn-secondary">
            Cancel
          </button>
          <button onClick={onConfirm} className="btn-danger">
            Delete Experiment
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const [userName, setUserName] = useState("Experimenter");
  const [experiments, setExperiments] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [experimentToDelete, setExperimentToDelete] = useState(null);

  useEffect(() => {
    if (user) {
      setUserName(user.name || "Experimenter");
      fetchExperiments();
    }
  }, [user]);

  const fetchExperiments = async () => {
    if (!user?.email) return;
    
    try {
      const response = await fetch('/api/experiments', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'user-email': user.email
        }
      });

      if (response.ok) {
        const experimentsData = await response.json();
        setExperiments(experimentsData);
      } else {
        console.error('Failed to fetch experiments');
        // Fallback to localStorage for compatibility
        const storedExperiments = JSON.parse(localStorage.getItem("experiments") || "[]");
        setExperiments(storedExperiments);
      }
    } catch (error) {
      console.error('Error fetching experiments:', error);
      // Fallback to localStorage for compatibility
      const storedExperiments = JSON.parse(localStorage.getItem("experiments") || "[]");
      setExperiments(storedExperiments);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => router.push("/create-experiment");

  // NEW: Handle edit - redirect to create-experiment with experimentId
  const handleEdit = (experimentId) => {
    router.push(`/create-experiment?experimentId=${experimentId}`);
  };

 

  const handleToggleActive = async (id, currentStatus) => {
    try {
      const response = await fetch(`/api/experiments/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'user-email': user.email
        },
        body: JSON.stringify({ 
          isActive: !currentStatus 
        })
      });

      if (response.ok) {
        const result = await response.json();
        
        // Update local state - set all experiments to inactive, then set the target one
        const updatedExperiments = experiments.map(exp => ({
          ...exp,
          isActive: exp.id === id ? !currentStatus : false
        }));
        
        setExperiments(updatedExperiments);
        
        const statusText = !currentStatus ? 'activated' : 'deactivated';
        showSuccess(`Experiment "${result.name}" ${statusText} successfully!`);
        
        if (!currentStatus) {
          showSuccess('This experiment is now live for participants!');
        }
      } else {
        const error = await response.json();
        showError(error.message || 'Failed to update experiment status');
      }
    } catch (error) {
      console.error('Error toggling experiment status:', error);
      showError('Network error. Please try again.');
    }
  };

  const handleDeleteClick = (id) => {
    const experiment = experiments.find((exp) => exp.id === id);
    if (!experiment) return;
    
    // Prevent deletion of active experiments
    if (experiment.isActive) {
      showError('Cannot delete an active experiment. Please deactivate it first.');
      return;
    }
    
    setExperimentToDelete(experiment);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!experimentToDelete) return;

    try {
      const response = await fetch(`/api/experiments/${experimentToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'user-email': user.email
        }
      });

      if (response.ok) {
        // Remove from local state
        const updated = experiments.filter((exp) => exp.id !== experimentToDelete.id);
        setExperiments(updated);
        
        // Close modal and reset state
        setShowDeleteModal(false);
        setExperimentToDelete(null);
        
        // Show success toast
        showSuccess(`Experiment "${experimentToDelete.name}" deleted successfully!`);
      } else {
        const error = await response.json();
        showError(error.message || 'Failed to delete experiment');
      }
    } catch (error) {
      console.error('Error deleting experiment:', error);
      showError('Network error. Please try again.');
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
    setExperimentToDelete(null);
  };

  const handleExport = (id) => {
    const experiment = experiments.find((exp) => exp.id === id);
    if (!experiment) return;

    const headers = [
      "Experiment Name",
      "Player Name", 
      "Puzzle",
      "Correct",
      "Advice Shown",
      "Advice Taken",
      "Time Taken (s)"
    ];

    const rows = (experiment.sessions || [])
      .flatMap(session =>
        (session.attempts || []).map(attempt => [
          experiment.name,
          session.playerName,
          attempt.puzzleName,
          attempt.correct ? "Yes" : "No",
          attempt.adviceShown ? "Yes" : "No",
          attempt.adviceTaken ? "Yes" : "No",
          attempt.timeTaken || ""
        ])
      );

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${experiment.name.replace(/\s+/g, "_")}_data.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="dashboard">
        <main className="dashboard-main">
          <div className="loading-state">Loading experiments...</div>
        </main>
      </div>
    );
  }

  // Sort experiments - active first, then by creation date
  const sortedExperiments = [...experiments].sort((a, b) => {
    if (a.isActive && !b.isActive) return -1;
    if (!a.isActive && b.isActive) return 1;
    return new Date(b.created_at) - new Date(a.created_at);
  });

  return (
    <div className="dashboard">
      <main className="dashboard-main">
        <div className="create-wrapper">
          <button onClick={handleCreate} className="create-btn">
            <FiPlus /> Create New Experiment
          </button>
        </div>

        <h2 className="section-title">
          Experiments List 
          {experiments.some(exp => exp.isActive) && (
            <span className="active-indicator">
              • {experiments.find(exp => exp.isActive)?.name} is currently active
            </span>
          )}
        </h2>

        {experiments.length === 0 ? (
          <div className="no-exp">
            <p>No experiments created yet.</p>
            <p>Click "Create New Experiment" to get started!</p>
          </div>
        ) : (
          <div className="experiment-list-container">
            <ul className="experiment-list">
              {sortedExperiments.map((exp) => (
                <li key={exp.id} className={`experiment-item ${exp.isActive ? 'active-experiment' : ''}`}>
                  <div className="experiment-info">
                    <span className="experiment-name">{exp.name}</span>
                    <span className={`status-badge ${exp.isActive ? 'active' : 'inactive'}`}>
                      {exp.isActive ? 'ACTIVE' : 'Inactive'}
                    </span>
                  </div>
                  
                  <div className="experiment-actions">
                    <button 
                      onClick={() => handleToggleActive(exp.id, exp.isActive)} 
                      className={`action-btn ${exp.isActive ? 'deactivate' : 'activate'}`}
                      title={exp.isActive ? 'Deactivate experiment' : 'Make this experiment active'}
                    >
                      {exp.isActive ? (
                        <>
                          <FiPause /> Deactivate
                        </>
                      ) : (
                        <>
                          <FiPlay /> Activate
                        </>
                      )}
                    </button>
                    
                    {/* UPDATED: Edit button now redirects to create-experiment flow */}
                    <button 
                      onClick={() => handleEdit(exp.id)} 
                      className="action-btn edit"
                      title="Edit experiment"
                    >
                      <FiEdit /> Edit
                    </button>
                    
                    
                    <button 
                      onClick={() => handleExport(exp.id)} 
                      className="action-btn export"
                      title="Export experiment data"
                    >
                      <FiDownload /> Export
                    </button>
                    
                    <button 
                      onClick={() => handleDeleteClick(exp.id)} 
                      className="action-btn delete"
                      disabled={exp.isActive}
                      title={exp.isActive ? 'Cannot delete active experiment' : 'Delete experiment'}
                    >
                      <FiTrash /> Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </main>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        experiment={experimentToDelete}
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
      />
    </div>
  );
}