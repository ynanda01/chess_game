'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/app/Authcontext/Authcontext.js';
import Manualchessboard from '../../../../components/manualchessboard.jsx';
import ConfirmDialog from '../../../../components/confirmdialog/confirmdialog.jsx';
import { FaEdit, FaTrash, FaCheckCircle, FaExclamationTriangle, FaInfoCircle, FaTimes } from 'react-icons/fa';
import './page.css';

// Custom Dialog Component
const CustomDialog = ({ 
  show, 
  onClose, 
  title, 
  message, 
  type = 'info', // 'success', 'error', 'warning', 'info'
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

export default function PuzzlePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const experimentId = searchParams.get('experimentId');
  const conditionId = searchParams.get('conditionId');

  const [fen, setFen] = useState('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
  const [correctMove, setCorrectMove] = useState('');
  const [adviceFormat, setAdviceFormat] = useState('none');
  const [advice, setAdvice] = useState('');
  const [confidence, setConfidence] = useState('');
  const [explanation, setExplanation] = useState('');
  const [reliability, setReliability] = useState('none');
  const [puzzleList, setPuzzleList] = useState([]);
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleteIndex, setDeleteIndex] = useState(null);
  const [editIndex, setEditIndex] = useState(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [condition, setCondition] = useState(null);
  const [experiment, setExperiment] = useState(null);
  
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

  // Load condition and experiment data, and existing puzzles
  useEffect(() => {
    const loadData = async () => {
      if (!experimentId || !conditionId || !user?.id) {
        if (!authLoading) {
          showDialog('error', 'Missing Information', 'Missing experiment or condition ID', 
            <button 
              className="dialog-ok-btn" 
              onClick={() => {
                hideDialog();
                router.push('/create-experiment');
              }}
            >
              Go to Experiments
            </button>
          );
        }
        return;
      }

      try {
        setInitialLoading(true);

        // Fetch experiment data
        const expResponse = await fetch(`/api/create-experiment?experimentId=${experimentId}`);
        const expResult = await expResponse.json();

        if (expResponse.ok) {
          const experimentData = expResult.experiment;

          // Check if user owns this experiment
          if (experimentData.experimenterId !== user.id) {
            showDialog('error', 'Access Denied', 'You are not authorized to edit this experiment',
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

          // Fetch condition data
          const condResponse = await fetch(`/api/conditions/${conditionId}`);
          const condResult = await condResponse.json();

          if (condResponse.ok) {
            const conditionData = condResult.condition;
            setCondition(conditionData);

            // Set advice format from condition
            if (conditionData.adviceformat) {
              setAdviceFormat(conditionData.adviceformat);
            }

            // Fetch existing puzzles for this condition
            const puzzlesResponse = await fetch(`/api/puzzles?conditionId=${conditionId}`);
            const puzzlesResult = await puzzlesResponse.json();

            if (puzzlesResponse.ok && puzzlesResult.puzzles) {
              // Convert backend puzzle format to frontend format
              const formattedPuzzles = puzzlesResult.puzzles.map(puzzle => ({
                id: puzzle.id,
                fen: puzzle.fen,
                correctMove: puzzle.correct_move,
                advice: puzzle.advice?.text || '',
                confidence: puzzle.advice?.confidence?.toString() || '',
                explanation: puzzle.advice?.explanation || '',
                reliability: puzzle.advice?.reliability === 'High' ? 'very' :
                            puzzle.advice?.reliability === 'Moderate' ? 'moderate' :
                            puzzle.advice?.reliability === 'Poor' ? 'poor' : 'none',
                order: puzzle.order
              }));

              // Sort by order
              formattedPuzzles.sort((a, b) => a.order - b.order);
              setPuzzleList(formattedPuzzles);
            }

          } else {
            showDialog('error', 'Failed to Load', 'Failed to load condition data',
              <button 
                className="dialog-ok-btn" 
                onClick={() => {
                  hideDialog();
                  router.push(`/create-experiment/conditions?experimentId=${experimentId}`);
                }}
              >
                Back to Conditions
              </button>
            );
          }

        } else {
          showDialog('error', 'Failed to Load', 'Failed to load experiment data',
            <button 
              className="dialog-ok-btn" 
              onClick={() => {
                hideDialog();
                router.push('/create-experiment');
              }}
            >
              Back to Experiments
            </button>
          );
        }

      } catch (error) {
        showDialog('error', 'Connection Error', 'Error loading experiment data. Please try again.',
          <button 
            className="dialog-ok-btn" 
            onClick={() => {
              hideDialog();
              router.push('/create-experiment');
            }}
          >
            Back to Experiments
          </button>
        );
      } finally {
        setInitialLoading(false);
      }
    };

    if (user?.id) {
      loadData();
    }
  }, [experimentId, conditionId, user?.id, router, authLoading]);

  const resetForm = () => {
    setFen('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
    setCorrectMove('');
    setAdvice('');
    setConfidence('');
    setExplanation('');
    setReliability('none');
    setEditIndex(null);
  };

  const handleAddPuzzle = () => {
    if (!fen || !correctMove) {
      showDialog('warning', 'Missing Information', 'Please enter at least FEN and Correct Move to add a puzzle.');
      return;
    }

    const newPuzzle = {
      fen,
      correctMove,
      advice,
      confidence,
      explanation,
      reliability,
      order: editIndex !== null ? puzzleList[editIndex].order : puzzleList.length + 1
    };

    if (editIndex !== null) {
      const updatedList = [...puzzleList];
      updatedList[editIndex] = { ...updatedList[editIndex], ...newPuzzle };
      setPuzzleList(updatedList);
      setEditIndex(null);
      showDialog('success', 'Puzzle Updated', 'Puzzle has been successfully updated!');
    } else {
      setPuzzleList([...puzzleList, newPuzzle]);
      showDialog('success', 'Puzzle Added', 'New puzzle has been added to the list!');
    }

    resetForm();
  };

  const handleDeleteClick = (index) => {
    setDeleteIndex(index);
    setShowConfirm(true);
  };

  const confirmDelete = () => {
    const updated = puzzleList.filter((_, i) => i !== deleteIndex);
    setPuzzleList(updated);
    setShowConfirm(false);
    setDeleteIndex(null);
    if (editIndex === deleteIndex) {
      resetForm();
    }
    showDialog('success', 'Puzzle Deleted', 'Puzzle has been successfully removed from the list.');
  };

  const cancelDelete = () => {
    setShowConfirm(false);
    setDeleteIndex(null);
  };

  const handleEditClick = (index) => {
    const p = puzzleList[index];
    setFen(p.fen);
    setCorrectMove(p.correctMove);
    setAdvice(p.advice);
    setConfidence(p.confidence);
    setExplanation(p.explanation);
    setReliability(p.reliability);
    setEditIndex(index);
  };

  const handleSavePuzzles = async () => {
    if (puzzleList.length === 0) {
      showDialog('warning', 'No Puzzles to Save', 'Please add at least one puzzle before saving.');
      return;
    }

    try {
      setLoading(true);

      const response = await fetch('/api/puzzles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          conditionId: parseInt(conditionId),
          puzzles: puzzleList
        }),
      });

      const result = await response.json();

      if (response.ok) {
        showDialog('success', 'Puzzles Saved Successfully', 
          `Successfully saved ${puzzleList.length} puzzles for condition: ${condition?.name}`,
          <button 
            className="dialog-ok-btn" 
            onClick={() => {
              hideDialog();
              router.push(`/create-experiment/conditions?experimentId=${experimentId}`);
            }}
          >
            OK
          </button>
        );
      } else {
        throw new Error(result.message || 'Failed to save puzzles');
      }
    } catch (error) {
      showDialog('error', 'Save Failed', `Failed to save puzzles: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleBackToConditions = () => {
    if (puzzleList.length > 0) {
      showDialog('warning', 'Unsaved Changes', 
        'You have unsaved puzzles. Are you sure you want to leave without saving?',
        <div className="dialog-actions-group">
          <button className="dialog-secondary-btn" onClick={hideDialog}>
            Stay Here
          </button>
          <button 
            className="dialog-danger-btn" 
            onClick={() => {
              hideDialog();
              router.push(`/create-experiment/conditions?experimentId=${experimentId}`);
            }}
          >
            Leave Without Saving
          </button>
        </div>
      );
    } else {
      router.push(`/create-experiment/conditions?experimentId=${experimentId}`);
    }
  };

  const handleViewExistingConditions = () => {
    router.push(`/create-experiment/review?experimentId=${experimentId}`);
  };

  // Show loading while checking authentication or loading initial data
  if (authLoading || initialLoading) {
    return (
      <div className="puzzle-container">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render if not authenticated (will redirect)
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="puzzle-container">
      {/* Experiment and Condition Info Header */}
      {experiment && condition && (
        <div className="experiment-condition-info">
          <h2 className="experiment-title">{experiment.name}</h2>
          <div className="condition-info-header">
            <h3 className="condition-title">Condition: {condition.name}</h3>
            {condition.description && (
              <p className="condition-description">{condition.description}</p>
            )}
            <div className="condition-settings">
              <span>Advice: {condition.adviceformat || 'none'}</span>
              <span>Timer: {condition.timerEnabled ? `${condition.timeLimit}s` : 'disabled'}</span>
            </div>
          </div>
        </div>
      )}

      <h1 className="heading-title">Add Puzzles to Condition</h1>

      {/* Container 2: Form Container - White Background */}
      <div className="puzzle-form-container">
        <div className="puzzle-form">
          <div className="form-left">
            <label>FEN *</label>
            <input
              type="text"
              value={fen}
              onChange={(e) => setFen(e.target.value)}
              className="input-field"
              placeholder="Enter FEN position"
              disabled={loading}
            />

            <label>Correct Move *</label>
            <input
              type="text"
              value={correctMove}
              onChange={(e) => setCorrectMove(e.target.value)}
              className="input-field"
              placeholder="e.g., e2e4, Nf3, O-O"
              disabled={loading}
            />

            <div className="chessboard-box">
              <Manualchessboard fen={fen} />
            </div>
          </div>

          <div className="form-right">
            {adviceFormat !== 'none' && (
              <>
                <label>Advice</label>
                <input
                  type="text"
                  value={advice}
                  onChange={(e) => setAdvice(e.target.value)}
                  className="input-field"
                  placeholder="Enter advice text"
                  disabled={loading}
                />
              </>
            )}

            {adviceFormat === 'full' && (
              <>
                <label>Confidence (%)</label>
                <input
                  type="number"
                  value={confidence}
                  onChange={(e) => setConfidence(e.target.value)}
                  className="input-field"
                  placeholder="0-100"
                  min="0"
                  max="100"
                  disabled={loading}
                />

                <label>Explanation</label>
                <textarea
                  value={explanation}
                  onChange={(e) => setExplanation(e.target.value)}
                  className="input-field"
                  placeholder="Explain why this move is correct"
                  rows={4}
                  disabled={loading}
                />
              </>
            )}

            {adviceFormat !== 'none' && (
              <>
                <label>Advice Reliability</label>
                <select
                  value={reliability}
                  onChange={(e) => setReliability(e.target.value)}
                  className="input-field"
                  disabled={loading}
                >
                  <option value="none">None</option>
                  <option value="poor">Poor</option>
                  <option value="moderate">Moderately Reliable</option>
                  <option value="very">Very Reliable</option>
                </select>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Container 3: Enhanced Puzzle List Section */}
      {puzzleList.length > 0 && (
        <div className="puzzle-list-container">
          <div className="puzzle-list">
            <h3>Added Puzzles ({puzzleList.length})</h3>
            {puzzleList.map((p, i) => (
              <div key={i} className="puzzle-item">
                <div className="puzzle-details">
                  <div className="puzzle-number">#{i + 1}</div>
                  <div className="puzzle-info">
                    <div><strong>FEN:</strong> {p.fen.substring(0, 50)}...</div>
                    <div><strong>Correct Move:</strong> {p.correctMove}</div>
                    {p.advice && (
                      <div><strong>Advice:</strong> {p.advice}</div>
                    )}
                    {p.confidence && (
                      <div><strong>Confidence:</strong> {p.confidence}%</div>
                    )}
                    {p.reliability !== 'none' && (
                      <div><strong>Reliability:</strong> {p.reliability}</div>
                    )}
                  </div>
                </div>
                <div className="puzzle-actions">
                  <button 
                    className="edit-btn" 
                    onClick={() => handleEditClick(i)}
                    disabled={loading}
                  >
                    <FaEdit /> Edit
                  </button>
                  <button 
                    className="delete-btn" 
                    onClick={() => handleDeleteClick(i)}
                    disabled={loading}
                  >
                    <FaTrash /> Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Container 4: Enhanced Bottom Action Section */}
      <div className="buttons-container">
        <div className="buttons">
          <button 
            className="back-button" 
            onClick={handleBackToConditions}
            disabled={loading}
          >
            Back to Conditions
          </button>
          
          {/* Show "Review Experiment" if puzzles exist */}
          {puzzleList.length > 0 && (
            <button
              onClick={handleViewExistingConditions}
              className="review-button"
              disabled={loading}
            >
              Review & Submit
            </button>
          )}
          
          <button 
            className="add-button" 
            onClick={handleAddPuzzle}
            disabled={loading || !fen || !correctMove}
          >
            {editIndex !== null ? 'Update Puzzle' : 'Add Puzzle'}
          </button>
          
          <button
            className="save-button"
            disabled={puzzleList.length === 0 || loading}
            onClick={handleSavePuzzles}
          >
            {loading ? 'Saving...' : `Save ${puzzleList.length} Puzzles`}
          </button>
        </div>

        {/* Helper text similar to condition page */}
        <div className="additional-actions">
          <p className="helper-text">
            After saving puzzles to this condition, you can add more conditions or review your experiment.
          </p>
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

      {/* Confirm Dialog for Delete */}
      {showConfirm && (
        <ConfirmDialog
          show={showConfirm}
          onConfirm={confirmDelete}
          onClose={cancelDelete}
          message="Are you sure you want to delete this puzzle?"
        />
      )}
    </div>
  );
}