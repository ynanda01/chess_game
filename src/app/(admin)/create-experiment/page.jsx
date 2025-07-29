'use client';
import './page.css';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function CreateExperimentPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) {
      alert('Please enter experiment name');
      return;
    }

    try {
      setLoading(true);

      // ✅ When backend is ready, uncomment the following:
      /*
      const response = await fetch('/api/create-experiment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, description }),
      });

      if (response.ok) {
        const experiment = await response.json();
        
        // Mark step 1 as completed
        if (window.markStepCompleted) {
          await window.markStepCompleted(1);
        }

        // Navigate to conditions page with experiment ID
        router.push(`/create-experiment/conditions?experimentId=${experiment.id}`);
      } else {
        throw new Error('Failed to create experiment');
      }
      */

      // 🧪 Temporary mock: simulate success and navigate with dummy ID
      const dummyExperiment = { id: 'temp123' };

      if (window.markStepCompleted) {
        await window.markStepCompleted(1);
      }

      router.push(`/create-experiment/conditions?experimentId=${dummyExperiment.id}`);

    } catch (error) {
      console.error('Error creating experiment:', error);
      alert('Failed to create experiment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-experiment-page">
      <h1 className="page-heading">Create New Experiment</h1>

      <div className="experiment-inputs">
        <label className="inputs">Name</label>
        <input
          className="inputs-field"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Experiment Name"
          disabled={loading}
        />
      </div>

      <div className="experiment-inputs">
        <label className="inputs">Description</label>
        <input
          className="inputs-field"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Brief Description"
          disabled={loading}
        />
      </div>

      <div className="buttons">
        <button
          className="back-button"
          onClick={() => router.back()}
          disabled={loading}
        >
          Back
        </button>

        <button
          className="create-button"
          onClick={handleSubmit}
          disabled={!name.trim() || loading}
        >
          {loading ? 'Creating...' : 'Create'}
        </button>
      </div>
    </div>
  );
}
