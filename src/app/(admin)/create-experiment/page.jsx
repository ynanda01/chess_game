// Updated create experiment page component with edit functionality
'use client';
import './page.css';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/app/Authcontext/Authcontext.js';

export default function CreateExperimentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading, isAuthenticated } = useAuth();
  
  // Check if we're editing an existing experiment
  const experimentId = searchParams.get('experimentId');
  const isEditing = !!experimentId;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loadingExperiment, setLoadingExperiment] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [loading, isAuthenticated, router]);

  // Load existing experiment data if editing
  useEffect(() => {
    const loadExperimentData = async () => {
      if (!experimentId || !user?.id) return;

      try {
        setLoadingExperiment(true);
        console.log('🔄 Loading experiment data for ID:', experimentId);

        const response = await fetch(`/api/create-experiment?experimentId=${experimentId}`);
        const result = await response.json();

        if (response.ok) {
          const experiment = result.experiment;
          console.log('✅ Loaded experiment:', experiment);

          // Check if user owns this experiment
          if (experiment.experimenterId !== user.id) {
            alert('You are not authorized to edit this experiment');
            router.push('/experimenter');
            return;
          }

          // Populate form with existing data
          setName(experiment.name);
          setDescription(experiment.description || '');
        } else {
          console.error('❌ Failed to load experiment:', result.message);
          alert('Failed to load experiment data');
          router.push('/experimenter');
        }
      } catch (error) {
        console.error('❌ Error loading experiment:', error);
        alert('Error loading experiment data');
        router.push('/experimenter');
      } finally {
        setLoadingExperiment(false);
      }
    };

    if (isEditing && user?.id) {
      loadExperimentData();
    }
  }, [experimentId, user?.id, router, isEditing]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      alert('Please enter experiment name');
      return;
    }

    if (!user?.id) {
      alert('User not authenticated');
      return;
    }

    try {
      setSubmitting(true);

      const requestData = { 
        name, 
        description,
        experimenterId: user.id
      };

      // If editing, include experimentId
      if (isEditing) {
        requestData.experimentId = experimentId;
      }

      console.log('📤 Sending request:', requestData);

      const response = await fetch('/api/create-experiment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      const result = await response.json();

      if (response.ok) {
        console.log('✅ Success:', result);

        // Mark step 1 as completed
        if (window.markStepCompleted) {
          await window.markStepCompleted(1);
        }

        // Navigate to conditions page with experiment ID
        const expId = result.experiment.id;
        router.push(`/create-experiment/conditions?experimentId=${expId}`);
      } else {
        throw new Error(result.message || 'Failed to save experiment');
      }

    } catch (error) {
      console.error('❌ Error saving experiment:', error);
      alert(`Failed to save experiment: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Show loading while checking authentication or loading experiment
  if (loading || loadingExperiment) {
    return (
      <div className="create-experiment-page">
        <div>Loading...</div>
      </div>
    );
  }

  // Don't render if not authenticated (will redirect)
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="create-experiment-page">
      <h1 className="page-heading">
        {isEditing ? 'Edit Experiment' : 'Create New Experiment'}
      </h1>

      <div className="experiment-inputs">
        <label className="inputs">Name</label>
        <input
          className="inputs-field"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Experiment Name"
          disabled={submitting}
        />
      </div>

      <div className="experiment-inputs">
        <label className="inputs">Description</label>
        <input
          className="inputs-field"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Brief Description"
          disabled={submitting}
        />
      </div>

      <div className="buttons">
        <button
          className="back-button"
          onClick={() => router.back()}
          disabled={submitting}
        >
          Back
        </button>

        <button
          className="create-button"
          onClick={handleSubmit}
          disabled={!name.trim() || submitting}
        >
          {submitting ? (isEditing ? 'Updating...' : 'Creating...') : (isEditing ? 'Update' : 'Create')}
        </button>
      </div>
    </div>
  );
}