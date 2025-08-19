'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/app/Authcontext/Authcontext.js';
import { 
  FaEdit, 
  FaPlus, 
  FaClock, 
  FaPuzzlePiece, 
  FaLightbulb,
  FaCheckCircle,
  FaExclamationTriangle,
  FaCheck,
  FaInfoCircle,
  FaTimes,
  FaChevronDown,
  FaChevronUp
} from 'react-icons/fa';
import './page.css';

// Custom Dialog Component
const CustomDialog = ({ 
  show, 
  onClose, 
  title, 
  message, 
  type = 'info', 
  showCloseButton = true,
  actions = null 
}) => {
  if (!show) return null;

  const getIcon = () => {
    switch (type) {
      case 'success': return <FaCheckCircle className="dialog-icon success" />;
      case 'error': return <FaExclamationTriangle className="dialog-icon error" />;
      case 'warning': return <FaExclamationTriangle className="dialog-icon warning" />;
      default: return <FaInfoCircle className="dialog-icon info" />;
    }
  };

  return (
    <div className="custom-dialog-overlay" onClick={onClose}>
      <div className={`custom-dialog ${type}`} onClick={(e) => e.stopPropagation()}>
        <div className="custom-dialog-header">
          <div className="dialog-title-container">
            {getIcon()}
            <h3 className="dialog-title">{title}</h3>
          </div>
          {showCloseButton && (
            <button className="dialog-close-btn" onClick={onClose}>
              <FaTimes />
            </button>
          )}
        </div>
        
        <div className="custom-dialog-content">
          <p className="dialog-message">{message}</p>
        </div>
        
        <div className="custom-dialog-actions">
          {actions || (
            <button className="dialog-ok-btn" onClick={onClose}>
              OK
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default function ReviewPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const experimentId = searchParams.get('experimentId');

  const [experiment, setExperiment] = useState(null);
  const [conditions, setConditions] = useState([]);
  const [puzzles, setPuzzles] = useState({});
  const [loading, setLoading] = useState(true);
  const [expandedConditions, setExpandedConditions] = useState(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Dialog states
  const [dialog, setDialog] = useState({
    show: false,
    type: 'info',
    title: '',
    message: '',
    actions: null
  });

  const showDialog = (type, title, message, actions = null) => {
    setDialog({
      show: true,
      type,
      title,
      message,
      actions
    });
  };

  const hideDialog = () => {
    setDialog({
      show: false,
      type: 'info',
      title: '',
      message: '',
      actions: null
    });
  };

  // Check authentication
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  // Load all data for review
  useEffect(() => {
    const loadReviewData = async () => {
      if (!experimentId || !user?.email) {
        if (!authLoading) {
          showDialog('error', 'Missing Information', 'Missing experiment ID or user data',
            <button 
              className="dialog-ok-btn" 
              onClick={() => {
                hideDialog();
                router.push('/experimenter');
              }}
            >
              Go to Dashboard
            </button>
          );
        }
        return;
      }

      try {
        setLoading(true);

        const headers = {
          'Content-Type': 'application/json',
          'user-email': user.email
        };

        // Load experiment data
        const expResponse = await fetch(`/api/create-experiment?experimentId=${experimentId}`, {
          headers,
          cache: 'no-store'
        });
        const expResult = await expResponse.json();

        if (!expResponse.ok) {
          throw new Error(expResult.message || 'Failed to load experiment');
        }

        const experimentData = expResult.experiment;

        // Check if user owns this experiment
        if (experimentData.experimenterId !== user.id) {
          showDialog('error', 'Access Denied', 'You are not authorized to view this experiment',
            <button 
              className="dialog-ok-btn" 
              onClick={() => {
                hideDialog();
                router.push('/experimenter');
              }}
            >
              Go to Dashboard
            </button>
          );
          return;
        }

        setExperiment(experimentData);

        // Load conditions
        const conditionsResponse = await fetch(`/api/conditions?experimentId=${experimentId}`, {
          headers,
          cache: 'no-store'
        });
        
        if (conditionsResponse.ok) {
          const conditionsResult = await conditionsResponse.json();
          const conditionsData = conditionsResult.conditions || [];
          setConditions(conditionsData);

          setPuzzles({});

          // Load puzzles for each condition
          const puzzlesData = {};
          for (const condition of conditionsData) {
            try {
              const puzzlesResponse = await fetch(`/api/puzzles?conditionId=${condition.id}`, {
                headers,
                cache: 'no-store'
              });
              
              if (puzzlesResponse.ok) {
                const puzzlesResult = await puzzlesResponse.json();
                puzzlesData[condition.id] = puzzlesResult.puzzles || [];
              } else {
                puzzlesData[condition.id] = [];
              }
            } catch (error) {
              puzzlesData[condition.id] = [];
            }
          }
          
          setPuzzles(puzzlesData);
        } else {
          setConditions([]);
          setPuzzles({});
        }

      } catch (error) {
        showDialog('error', 'Loading Error', 'Error loading experiment data. Please try again.',
          <button 
            className="dialog-ok-btn" 
            onClick={() => {
              hideDialog();
              router.push('/experimenter');
            }}
          >
            Go to Dashboard
          </button>
        );
      } finally {
        setLoading(false);
      }
    };

    if (user?.email && experimentId) {
      loadReviewData();
    }
  }, [experimentId, user?.email, router, authLoading]);

  // Enhanced refresh data when component becomes visible or page focus
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && user?.email && experimentId) {
        refreshData();
      }
    };

    const handlePageFocus = () => {
      if (user?.email && experimentId) {
        refreshData();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handlePageFocus);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handlePageFocus);
    };
  }, [user?.email, experimentId]);

  // Also refresh when the component mounts after navigation
  useEffect(() => {
    const handleRouteChange = () => {
      setTimeout(() => {
        if (user?.email && experimentId) {
          refreshData();
        }
      }, 100);
    };

    handleRouteChange();

    window.addEventListener('popstate', handleRouteChange);
    
    return () => {
      window.removeEventListener('popstate', handleRouteChange);
    };
  }, [user?.email, experimentId]);

  const refreshData = async () => {
    if (!user?.email || !experimentId) return;
    
    try {
      setRefreshing(true);
      
      const headers = {
        'Content-Type': 'application/json',
        'user-email': user.email
      };

      // Reload conditions
      const conditionsResponse = await fetch(`/api/conditions?experimentId=${experimentId}&t=${Date.now()}`, {
        headers,
        cache: 'no-store'
      });
      
      if (conditionsResponse.ok) {
        const conditionsResult = await conditionsResponse.json();
        const conditionsData = conditionsResult.conditions || [];
        setConditions(conditionsData);

        // Reload puzzles for each condition with cache busting
        const puzzlesData = {};
        for (const condition of conditionsData) {
          try {
            const puzzlesResponse = await fetch(`/api/puzzles?conditionId=${condition.id}&t=${Date.now()}`, {
              headers,
              cache: 'no-store'
            });
            
            if (puzzlesResponse.ok) {
              const puzzlesResult = await puzzlesResponse.json();
              puzzlesData[condition.id] = puzzlesResult.puzzles || [];
            } else {
              puzzlesData[condition.id] = [];
            }
          } catch (error) {
            console.error(`Error loading puzzles for condition ${condition.id}:`, error);
            puzzlesData[condition.id] = [];
          }
        }
        
        setPuzzles(puzzlesData);
        console.log('Data refreshed successfully');
      }
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const toggleConditionExpansion = (conditionId) => {
    const newExpanded = new Set(expandedConditions);
    if (newExpanded.has(conditionId)) {
      newExpanded.delete(conditionId);
    } else {
      newExpanded.add(conditionId);
    }
    setExpandedConditions(newExpanded);
  };

  const handleEditExperiment = () => {
    router.push(`/create-experiment?experimentId=${experimentId}`);
  };

  const handleEditCondition = (conditionId) => {
    sessionStorage.setItem('reviewPageReturn', window.location.href);
    router.push(`/create-experiment/conditions?experimentId=${experimentId}&conditionId=${conditionId}&mode=edit`);
  };

  const handleEditPuzzles = (conditionId) => {
    sessionStorage.setItem('reviewPageReturn', window.location.href);
    router.push(`/create-experiment/puzzles?experimentId=${experimentId}&conditionId=${conditionId}`);
  };

  const handleAddCondition = () => {
    router.push(`/create-experiment/conditions?experimentId=${experimentId}`);
  };

  const handleSubmitExperiment = async () => {
    // Validation
    if (conditions.length === 0) {
      showDialog('warning', 'Missing Conditions', 'Cannot submit experiment without conditions. Please add at least one condition.');
      return;
    }

    const conditionsWithoutPuzzles = conditions.filter(c => 
      !puzzles[c.id] || puzzles[c.id].length === 0
    );
    
    if (conditionsWithoutPuzzles.length > 0) {
      const conditionNames = conditionsWithoutPuzzles.map(c => c.name).join(', ');
      showDialog('warning', 'Missing Puzzles', `Cannot submit experiment. The following conditions have no puzzles: ${conditionNames}`);
      return;
    }

    showDialog('info', 'Confirm Submission', 'Are you sure you want to submit this experiment? It will be saved and you can publish it later from the dashboard.',
      <div className="dialog-actions-group">
        <button className="dialog-secondary-btn" onClick={hideDialog}>
          Cancel
        </button>
        <button 
          className="dialog-ok-btn" 
          onClick={() => {
            hideDialog();
            submitExperiment();
          }}
        >
          Submit Experiment
        </button>
      </div>
    );
  };

  const submitExperiment = async () => {
    try {
      setSubmitting(true);
      
      showDialog('success', 'Experiment Submitted!', 'Experiment submitted successfully! Redirecting to dashboard...',
        <button 
          className="dialog-ok-btn" 
          onClick={() => {
            hideDialog();
            router.push('/experimenter');
          }}
        >
          Go to Dashboard
        </button>
      );

      setTimeout(() => {
        router.push('/experimenter');
      }, 2000);

    } catch (error) {
      showDialog('error', 'Submission Failed', `Failed to submit experiment: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleBackToExperimenter = () => {
    router.push('/experimenter');
  };

  // Show loading while checking authentication or loading data
  if (authLoading || loading) {
    return (
      <div className="review-container">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p className="loading-text">Loading experiment data...</p>
        </div>
      </div>
    );
  }

  // Don't render if not authenticated (will redirect)
  if (!isAuthenticated) {
    return null;
  }

  const totalPuzzles = Object.values(puzzles).reduce((sum, conditionPuzzles) => 
    sum + conditionPuzzles.length, 0);
  const canSubmit = conditions.length > 0 && totalPuzzles > 0 && 
    conditions.every(c => puzzles[c.id] && puzzles[c.id].length > 0);

  return (
    <div className="review-container">
      {/* Main Header */}
      <div className="main-header">
        <div className="header-content">
          <div className="header-text">
            <h1 className="main-title">
              Review Your Experiment
            </h1>
            <p className="main-subtitle">
              Review all settings and content before submitting
            </p>
          </div>
        </div>
      </div>

      {/* Experiment Overview Card */}
      {experiment && (
        <div className="experiment-overview-card">
          <div className="experiment-header">
            <div className="experiment-info">
              <div className="experiment-title-section">
                <h2 className="experiment-title">
                  {experiment.name}
                </h2>
                <button
                  onClick={handleEditExperiment}
                  className="edit-experiment-btn"
                  title="Edit experiment details"
                >
                  <FaEdit />
                  Edit
                </button>
              </div>
              {experiment.description && (
                <p className="experiment-description">
                  {experiment.description}
                </p>
              )}
            </div>
            
            <div className="stats-section">
              <div className="stat-card">
                <div className="stat-number">
                  {conditions.length}
                </div>
                <div className="stat-label">
                  Conditions
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-number">
                  {totalPuzzles}
                </div>
                <div className="stat-label">
                  Puzzles
                </div>
              </div>
            </div>
          </div>


        </div>
      )}

      {/* Conditions Section */}
      <div className="conditions-section">
        <div className="conditions-header">
          <h3 className="conditions-title">
            Experimental Conditions
          </h3>
          <div className="conditions-actions">
            <button 
              onClick={handleAddCondition}
              className="add-condition-btn"
            >
              <FaPlus />
              Add Condition
            </button>
          </div>
        </div>

        {conditions.length === 0 ? (
          <div className="no-conditions">
            <FaPuzzlePiece className="no-conditions-icon" />
            <h4 className="no-conditions-title">
              No Conditions Added
            </h4>
            <p className="no-conditions-text">
              Add at least one experimental condition to continue
            </p>
            <button 
              onClick={handleAddCondition}
              className="first-condition-btn"
            >
              <FaPlus />
              Add First Condition
            </button>
          </div>
        ) : (
          <div className="conditions-list">
            {conditions.map((condition, index) => {
              const conditionPuzzles = puzzles[condition.id] || [];
              const isExpanded = expandedConditions.has(condition.id);
              
              return (
                <div key={condition.id} className="condition-card">
                  <div className="condition-main">
                    <div className="condition-content">
                      <div className="condition-number">
                        {index + 1}
                      </div>
                      <div className="condition-details">
                        <h4 className="condition-name">
                          {condition.name}
                        </h4>
                        {condition.description && (
                          <p className="condition-description">
                            {condition.description}
                          </p>
                        )}
                        <div className="condition-tags">
                          <span className="advice-tag">
                            <FaLightbulb />
                            {condition.adviceformat || experiment?.adviceformat || 'Text'}
                          </span>
                          <span className="timer-tag">
                            <FaClock />
                            {condition.timerEnabled !== null 
                              ? (condition.timerEnabled ? `${condition.timeLimit}s` : 'Disabled')
                              : (experiment?.timerEnabled ? `${experiment.timeLimit}s` : 'Disabled')
                            }
                          </span>
                          <span className={`puzzles-tag ${conditionPuzzles.length === 0 ? 'no-puzzles' : 'has-puzzles'}`}>
                            <FaPuzzlePiece />
                            {conditionPuzzles.length} Puzzles
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="condition-actions">
                      <button
                        onClick={() => toggleConditionExpansion(condition.id)}
                        className="show-puzzles-btn"
                      >
                        {isExpanded ? <FaChevronUp /> : <FaChevronDown />}
                        Show Puzzles
                      </button>
                      <button
                        onClick={() => handleEditCondition(condition.id)}
                        className="edit-condition-btn"
                      >
                        <FaEdit />
                        Edit Condition
                      </button>
                      <button
                        onClick={() => handleEditPuzzles(condition.id)}
                        className="manage-puzzles-btn"
                      >
                        <FaPuzzlePiece />
                        Edit Puzzles
                      </button>
                    </div>
                  </div>

                  {/* Expanded Puzzles View */}
                  {isExpanded && (
                    <div className="puzzles-section">
                      {conditionPuzzles.length === 0 ? (
                        <div className="no-puzzles-warning">
                          <FaExclamationTriangle className="warning-icon" />
                          <p className="warning-text">
                            No puzzles added yet. This condition needs puzzles to be valid.
                          </p>
                          <button 
                            onClick={() => handleEditPuzzles(condition.id)}
                            className="add-puzzles-btn"
                          >
                            <FaPlus />
                            Add Puzzles
                          </button>
                        </div>
                      ) : (
                        <div className="puzzles-grid">
                          {conditionPuzzles.map((puzzle, idx) => {
                            return (
                              <div key={`${puzzle.id}-${puzzle.order}-${Date.now()}`} className="puzzle-card">
                                <div className="puzzle-header">
                                  <span className="puzzle-order">
                                    Puzzle #{puzzle.order}
                                  </span>
                                  <span className="correct-move">
                                    {puzzle.correct_move}
                                  </span>
                                </div>
                                
                                <div className="puzzle-content">
                                  <div className="puzzle-field">
                                    <label className="field-label">
                                      Position (FEN):
                                    </label>
                                    <div className="fen-display">
                                      {puzzle.fen}
                                    </div>
                                  </div>
                                  
                                  <div className="puzzle-field">
                                    <label className="field-label">
                                      Correct Move:
                                    </label>
                                    <div className="move-display">
                                      {puzzle.correct_move}
                                    </div>
                                  </div>
                                  
                                  {/* Enhanced Advice Rendering */}
                                  {(() => {
                                    const adviceFormat = condition.adviceformat || experiment?.adviceformat || 'none';
                                    
                                    if (adviceFormat === 'none') {
                                      return null;
                                    }
                                    
                                    if (adviceFormat === 'text' || adviceFormat === 'format') {
                                      return puzzle.advice?.text ? (
                                        <div className="puzzle-field">
                                          <label className="field-label">
                                            <FaLightbulb className="field-icon" />
                                            Advice:
                                          </label>
                                          <div className="advice-display">
                                            {puzzle.advice.text}
                                          </div>
                                        </div>
                                      ) : null;
                                    }
                                    
                                    if (adviceFormat === 'full' || adviceFormat === 'three_inputs') {
                                      const hasAdvice = puzzle.advice?.text;
                                      const hasConfidence = puzzle.advice?.confidence !== null && puzzle.advice?.confidence !== undefined;
                                      const hasReliability = puzzle.advice?.reliability;
                                      const hasExplanation = puzzle.advice?.explanation;
                                      
                                      if (!hasAdvice && !hasConfidence && !hasReliability && !hasExplanation) {
                                        return (
                                          <div className="no-advice-warning">
                                            No advice data available for this puzzle
                                          </div>
                                        );
                                      }
                                      
                                      return (
                                        <div className="full-advice-section">
                                          {hasAdvice && (
                                            <div className="puzzle-field">
                                              <label className="field-label">
                                                <FaLightbulb className="field-icon" />
                                                Advice:
                                              </label>
                                              <div className="advice-display">
                                                {puzzle.advice.text}
                                              </div>
                                            </div>
                                          )}
                                          
                                          {(hasConfidence || hasReliability) && (
                                            <div className="puzzle-field">
                                              <label className="field-label">
                                                <FaCheck className="field-icon" />
                                                {hasConfidence ? 'Confidence:' : 'Reliability:'}
                                              </label>
                                              <div className="confidence-display">
                                                {hasConfidence ? 
                                                  (typeof puzzle.advice.confidence === 'number' ? 
                                                    `${(puzzle.advice.confidence * 1).toFixed(1)}%` : 
                                                    puzzle.advice.confidence
                                                  ) : 
                                                  puzzle.advice.reliability
                                                }
                                              </div>
                                            </div>
                                          )}
                                          
                                          {hasExplanation && (
                                            <div className="puzzle-field">
                                              <label className="field-label">
                                                <FaInfoCircle className="field-icon" />
                                                Explanation:
                                              </label>
                                              <div className="explanation-display">
                                                {puzzle.advice.explanation}
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      );
                                    }
                                    
                                    return puzzle.advice?.text ? (
                                      <div className="puzzle-field">
                                        <label className="field-label">
                                          <FaLightbulb className="field-icon" />
                                          Advice:
                                        </label>
                                        <div className="advice-display">
                                          {puzzle.advice.text}
                                        </div>
                                      </div>
                                    ) : null;
                                  })()}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Submit Section */}
      <div className="submit-section">
        <div className="submit-card">
          {!canSubmit && (
            <div className="submit-warning">
              <h4 className="warning-title">
                <FaExclamationTriangle />
                Issues to Fix Before Submission
              </h4>
              <div className="warning-list">
                {conditions.length === 0 && (
                  <div className="warning-item">
                    <span className="warning-emoji">⚠️</span>
                    Add at least one experimental condition
                  </div>
                )}
                {conditions.some(c => !puzzles[c.id] || puzzles[c.id].length === 0) && (
                  <div className="warning-item">
                    <span className="warning-emoji">⚠️</span>
                    Add puzzles to all conditions
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="submit-actions">
            <button 
              onClick={handleBackToExperimenter}
              className="back-btn"
            >
              <span>Back to Dashboard</span>
            </button>

            <button
              onClick={handleSubmitExperiment}
              disabled={submitting || !canSubmit}
              className={`submit-btn ${canSubmit ? 'enabled' : 'disabled'}`}
            >
              {submitting ? (
                <>
                  <div className="spinner"></div>
                  Submitting...
                </>
              ) : (
                <>
                  <FaCheck />
                  Submit Experiment
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Custom Dialog */}
      <CustomDialog
        show={dialog.show}
        onClose={hideDialog}
        type={dialog.type}
        title={dialog.title}
        message={dialog.message}
        actions={dialog.actions}
      />
    </div>
  );
}