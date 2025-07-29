'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';

export default function Sidebar({ experimentId }) {
  const pathname = usePathname();
  const [completedSteps, setCompletedSteps] = useState([]);
  const [loading, setLoading] = useState(true);

  const steps = [
    { index: 1, name: 'Create Experiment', path: '/create-experiment' },
    { index: 2, name: 'Condition Page', path: '/create-experiment/conditions' },
    { index: 3, name: 'Puzzle Page', path: '/create-experiment/puzzles' },
    { index: 4, name: 'Review', path: '/create-experiment/review' },
  ];

  // Fetch completed steps from backend
  const fetchCompletedSteps = useCallback(async () => {
    if (!experimentId) {
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      const response = await fetch(`/api/experiments/${experimentId}/steps`);
      if (response.ok) {
        const data = await response.json();
        setCompletedSteps(data.completedSteps || []);
      } else {
        console.error('Failed to fetch completed steps');
      }
    } catch (error) {
      console.error('Error fetching completed steps:', error);
    } finally {
      setLoading(false);
    }
  }, [experimentId]);

  // Mark step as completed in backend
  const markStepCompleted = useCallback(async (stepIndex) => {
    if (!experimentId) return;

    try {
      const response = await fetch(`/api/experiments/${experimentId}/steps`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ stepIndex }),
      });

      if (response.ok) {
        const data = await response.json();
        setCompletedSteps(data.completedSteps || []);
      } else {
        console.error('Failed to mark step as completed');
      }
    } catch (error) {
      console.error('Error marking step as completed:', error);
    }
  }, [experimentId]);

  // Fetch completed steps on mount and when experimentId/pathname changes
  useEffect(() => {
    fetchCompletedSteps();
  }, [fetchCompletedSteps, pathname]);

  // Auto-mark previous step as completed when navigating to next step
  useEffect(() => {
    if (loading || !experimentId || completedSteps.length === 0) return;

    const currentStep = steps.find(step => step.path === pathname);
    if (currentStep && currentStep.index > 1) {
      const previousStepIndex = currentStep.index - 1;
      if (!completedSteps.includes(previousStepIndex)) {
        markStepCompleted(previousStepIndex);
      }
    }
  }, [pathname, completedSteps, loading, experimentId, markStepCompleted]);

  // Expose markStepCompleted function globally for other components to use
  useEffect(() => {
    if (experimentId && markStepCompleted) {
      window.markStepCompleted = markStepCompleted;
    }
    
    return () => {
      if (window.markStepCompleted) {
        delete window.markStepCompleted;
      }
    };
  }, [experimentId, markStepCompleted]);

  if (loading) {
    return (
      <nav className="step-wise">
        <div className="loading">Loading steps...</div>
      </nav>
    );
  }

  return (
    <nav className="step-wise">
      {steps.map(({ index, name, path }) => {
        const isActive = pathname === path;
        const isCompleted = completedSteps.includes(index);
        
        // Only allow navigation if previous step is completed or it's the first step
        const canNavigate = index === 1 || completedSteps.includes(index - 1);

        return (
          <Link
            key={path}
            href={canNavigate ? path : '#'}
            className={`step-link ${isActive ? 'active' : ''} ${!canNavigate ? 'disabled' : ''}`}
            onClick={(e) => {
              if (!canNavigate) {
                e.preventDefault();
              }
            }}
          >
            <div
              className={`step-icon ${isCompleted ? 'completed' : ''} ${isActive ? 'current' : ''}`}
            >
              {isCompleted ? '✓' : index}
            </div>
            <span className="step-label">{name}</span>
          </Link>
        );
      })}
    </nav>
  );
}