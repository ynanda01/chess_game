'use client';
import './page.css';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/app/Authcontext/Authcontext.js';
import { 
  AlertTriangle,
  FlaskConical,
  Target,
  CheckCircle,
  XCircle,
  Info,
  AlertCircle
} from 'lucide-react';
import { FaCheckCircle, FaExclamationTriangle, FaInfoCircle, FaTimes } from 'react-icons/fa';

// Enhanced Custom Dialog Component (matching puzzle page style)
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

export default function ConditionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const experimentId = searchParams.get('experimentId');

  const [conditionName, setConditionName] = useState('');
  const [conditionDescription, setConditionDescription] = useState('');
  const [adviceFormat, setAdviceFormat] = useState('');
  const [timeOption, setTimeOption] = useState('disable');
  const [timeLimit, setTimeLimit] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [experiment, setExperiment] = useState(null);
  const [existingConditions, setExistingConditions] = useState([]);
  
  // Delete confirmation dialog state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [conditionToDelete, setConditionToDelete] = useState(null);
  
  // Enhanced dialog state (matching puzzle page)
  const [dialog, setDialog] = useState({
    show: false,
    type: 'info',
    title: '',
    message: '',
    actions: null
  });
  
  // Edit state
  const [editIndex, setEditIndex] = useState(null);
  const [originalCondition, setOriginalCondition] = useState(null);

  // Enhanced dialog helper functions (matching puzzle page)
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

  const showSuccessMessage = (message) => {
    showDialog('success', 'Success!', message);
  };

  const showErrorMessage = (message) => {
    showDialog('error', 'Error', message);
  };

  const showWarningMessage = (message) => {
    showDialog('warning', 'Warning', message);
  };

  const showInfoMessage = (message) => {
    showDialog('info', 'Information', message);
  };

  // Check authentication
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  // Load experiment data and existing conditions
  useEffect(() => {
    const loadData = async () => {
      if (!experimentId || !user?.id) return;

      try {
        setLoadingData(true);

        // Load experiment data
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

          // Load existing conditions
          const conditionsResponse = await fetch(`/api/conditions?experimentId=${experimentId}`);
          if (conditionsResponse.ok) {
            const conditionsResult = await conditionsResponse.json();
            setExistingConditions(conditionsResult.conditions || []);
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
        setLoadingData(false);
      }
    };

    loadData();
  }, [experimentId, user?.id, router]);

  const resetForm = () => {
    setConditionName('');
    setConditionDescription('');
    setAdviceFormat('');
    setTimeOption('disable');
    setTimeLimit('');
    setEditIndex(null);
    setOriginalCondition(null);
  };

  const handleSaveCondition = async () => {
    if (!conditionName.trim() || !adviceFormat) {
      showErrorMessage('Please fill in all required fields');
      return;
    }

    if (!experimentId) {
      showDialog('error', 'Missing Information', 'No experiment ID found. Please start from the beginning.',
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
      return;
    }

    // Check for duplicate condition names (exclude current condition if editing)
    if (existingConditions.some((condition, index) => 
        condition.name.toLowerCase() === conditionName.toLowerCase() && index !== editIndex)) {
      showErrorMessage('A condition with this name already exists. Please choose a different name.');
      return;
    }

    // Validate time limit if enabled
    if (timeOption === 'enable' && (!timeLimit || parseInt(timeLimit) < 1)) {
      showErrorMessage('Please enter a valid time limit (minimum 1 second)');
      return;
    }

    try {
      setLoading(true);

      const conditionData = {
        experimentId: parseInt(experimentId),
        name: conditionName,
        description: conditionDescription || null,
        adviceformat: adviceFormat,
        timerEnabled: timeOption === 'enable',
        timeLimit: timeOption === 'enable' ? parseInt(timeLimit) : null,
      };

      if (editIndex !== null) {
        // Update existing condition
        const conditionId = existingConditions[editIndex].id;
        conditionData.order = existingConditions[editIndex].order;

        const response = await fetch(`/api/conditions/${conditionId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(conditionData),
        });

        const result = await response.json();

        if (response.ok) {
          // Update the condition in the list
          const updatedConditions = [...existingConditions];
          updatedConditions[editIndex] = { ...updatedConditions[editIndex], ...result.condition };
          setExistingConditions(updatedConditions);
          
          showSuccessMessage('Condition updated successfully!');
          resetForm();
        } else {
          throw new Error(result.message || 'Failed to update condition');
        }
      } else {

        // Create new condition
        conditionData.order = existingConditions.length + 1;

        const response = await fetch('/api/conditions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(conditionData),
        });

        const result = await response.json();

        if (response.ok) {
          // Navigate to puzzles page for THIS condition
          const conditionId = result.condition.id;
          router.push(`/create-experiment/puzzles?experimentId=${experimentId}&conditionId=${conditionId}`);
        } else {
          throw new Error(result.message || 'Failed to save condition');
        }
      }

    } catch (error) {
      showErrorMessage(`Failed to ${editIndex !== null ? 'update' : 'save'} condition: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleViewExistingConditions = () => {
    router.push(`/create-experiment/review?experimentId=${experimentId}`);
  };

  const handleEditCondition = (index) => {
    const condition = existingConditions[index];
    
    // Store original condition for potential cancel
    setOriginalCondition({
      name: conditionName,
      description: conditionDescription,
      adviceFormat: adviceFormat,
      timeOption: timeOption,
      timeLimit: timeLimit
    });
    
    // Populate form with condition data
    setConditionName(condition.name);
    setConditionDescription(condition.description || '');
    setAdviceFormat(condition.adviceformat || '');
    setTimeOption(condition.timerEnabled ? 'enable' : 'disable');
    setTimeLimit(condition.timeLimit ? condition.timeLimit.toString() : '');
    setEditIndex(index);
  };

  const handleCancelEdit = () => {
    if (originalCondition) {
      setConditionName(originalCondition.name);
      setConditionDescription(originalCondition.description);
      setAdviceFormat(originalCondition.adviceFormat);
      setTimeOption(originalCondition.timeOption);
      setTimeLimit(originalCondition.timeLimit);
    } else {
      resetForm();
    }
    setEditIndex(null);
    setOriginalCondition(null);
  };

  const handleAddPuzzlesToCondition = (conditionId) => {
    router.push(`/create-experiment/puzzles?experimentId=${experimentId}&conditionId=${conditionId}`);
  };

  // Show custom delete confirmation dialog
  const showDeleteConfirmation = (condition) => {
    setConditionToDelete(condition);
    setShowDeleteDialog(true);
  };

  // Hide delete confirmation dialog
  const hideDeleteConfirmation = () => {
    setShowDeleteDialog(false);
    setConditionToDelete(null);
  };

  // Handle actual deletion after confirmation
  const handleConfirmDelete = async () => {
    if (!conditionToDelete) return;

    try {
      const response = await fetch(`/api/conditions/${conditionToDelete.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Refresh conditions list
        const conditionsResponse = await fetch(`/api/conditions?experimentId=${experimentId}`);
        if (conditionsResponse.ok) {
          const conditionsResult = await conditionsResponse.json();
          setExistingConditions(conditionsResult.conditions || []);
        }
        
        hideDeleteConfirmation();
        showSuccessMessage(`Condition "${conditionToDelete.name}" has been deleted successfully!`);
      } else {
        const result = await response.json();
        throw new Error(result.message || 'Failed to delete condition');
      }
    } catch (error) {
      showErrorMessage(`Failed to delete condition: ${error.message}`);
    }
  };

  // Show loading while checking authentication or loading data
  if (authLoading || loadingData) {
    return (
      <div className="condition-page">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading experiment data... Please wait!!!</p>
        </div>
      </div>
    );
  }

  // Don't render if not authenticated (will redirect)
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="condition-page">
      {/* Enhanced Delete Confirmation Dialog */}
      {showDeleteDialog && (
        <div className="delete-overlay">
          <div className="delete-dialog">
            <div className="delete-dialog-header">
              <div className="dialog-title-container">
                <FaExclamationTriangle className="dialog-icon warning" />
                <h3>Confirm Deletion</h3>
              </div>
            </div>
            <div className="delete-dialog-content">
              <p>Are you sure you want to delete the condition <strong>"{conditionToDelete?.name}"</strong>?</p>
              <p className="warning-text">This will also delete all puzzles in this condition. This action cannot be undone.</p>
              
              {conditionToDelete?._count?.puzzles > 0 && (
                <div className="deletion-impact">
                  <p>This will delete:</p>
                  <ul>
                    <li>The condition "{conditionToDelete.name}"</li>
                    <li>{conditionToDelete._count.puzzles} puzzle(s) in this condition</li>
                  </ul>
                </div>
              )}
            </div>
            <div className="delete-dialog-actions">
              <div className="dialog-actions-group">
                <button 
                  className="dialog-secondary-btn"
                  onClick={hideDeleteConfirmation}
                >
                  Cancel
                </button>
                <button 
                  className="dialog-danger-btn"
                  onClick={handleConfirmDelete}
                >
                  Delete Condition
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Custom Dialog */}
      <CustomDialog
        show={dialog.show}
        onClose={hideDialog}
        type={dialog.type}
        title={dialog.title}
        message={dialog.message}
        actions={dialog.actions}
      />

      {/* Enhanced Experiment Info Header */}
      {experiment && (
        <div className="experiment-info-header">
          <div className="experiment-overview">
            <div className="experiment-icon">
              <FlaskConical size={32} />
            </div>
            <div className="experiment-details">
              <h2 className="experiment-title">{experiment.name}</h2>
              <p className="experiment-description">{experiment.description}</p>
              <div className="experiment-meta">
                <span className="meta-item">
                  <Target className="meta-icon" size={14} />
                  Conditions: {existingConditions.length}
                </span>
              </div>
            </div>
          </div>

          {existingConditions.length > 0 && (
            <div className="existing-conditions-section">
              <h3>Existing Conditions ({existingConditions.length})</h3>
              <div className="conditions-list">
                {existingConditions.map((condition) => (
                  <div key={condition.id} className="condition-card">
                    <div className="condition-info">
                      <h4>{condition.name}</h4>
                      {condition.description && (
                        <p className="condition-desc">{condition.description}</p>
                      )}
                      <div className="condition-details">
                        <span className="detail-badge advice-badge">
                          Advice: {condition.adviceformat || 'none'}
                        </span>
                        <span className="detail-badge timer-badge">
                          Timer: {condition.timerEnabled ? `${condition.timeLimit}s` : 'disabled'}
                        </span>
                        <span className="detail-badge puzzle-badge">
                          Puzzles: {condition._count?.puzzles || 0}
                        </span>
                      </div>
                    </div>
                    <div className="condition-actions">
                      <button 
                        className="edit-btn-small"
                        onClick={() => handleEditCondition(existingConditions.findIndex(c => c.id === condition.id))}
                        title="Edit this condition"
                        disabled={editIndex !== null}
                      >
                        Edit
                      </button>
                      <button 
                        className="puzzle-btn-small"
                        onClick={() => handleAddPuzzlesToCondition(condition.id)}
                        title={condition._count?.puzzles > 0 ? 'Edit puzzles in this condition' : 'Add puzzles to this condition'}
                        disabled={editIndex !== null}
                      >
                        {condition._count?.puzzles > 0 ? 'Edit Puzzles' : 'Add Puzzles'}
                      </button>
                      <button 
                        className="delete-btn-small"
                        onClick={() => showDeleteConfirmation(condition)}
                        title="Delete this condition"
                        disabled={editIndex !== null}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Condition Form */}
      <div className="condition-form-container">
        <h1 className="heading">
          {editIndex !== null 
            ? `Edit Condition: ${existingConditions[editIndex]?.name}` 
            : existingConditions.length === 0 
              ? 'Add First Condition' 
              : `Add New Condition`
          }
        </h1>

        <div className="condition-inputs">
          <label htmlFor="conditionName" className="inputs">Condition Name *</label>
          <input
            id="conditionName"
            className="inputs-field"
            value={conditionName}
            onChange={(e) => setConditionName(e.target.value)}
            placeholder={`e.g., ${existingConditions.length === 0 ? 'Control' : 'Treatment Group'}`}
            disabled={loading}
          />
          {existingConditions.length > 0 && editIndex === null && (
            <small className="field-hint">
              Make sure this name is different from existing conditions
            </small>
          )}
        </div>

        <div className="condition-inputs">
          <label htmlFor="conditionDescription" className="inputs">Description (Optional)</label>
          <textarea
            id="conditionDescription"
            className="inputs-field textarea-field"
            value={conditionDescription}
            onChange={(e) => setConditionDescription(e.target.value)}
            placeholder="Brief description of this condition..."
            rows={3}
            disabled={loading}
          />
        </div>

        <div className="condition-inputs">
          <p className="inputs">Advice Format *</p>
          <div className="radio-group">
            {[
              { value: 'none', label: 'No Advice' },
              { value: 'adviceOnly', label: 'Advice Only' },
              { value: 'full', label: 'Advice + Confidence + Explanation' }
            ].map((option) => (
              <label className="radio-option" key={option.value}>
                <input
                  type="radio"
                  name="advice"
                  value={option.value}
                  checked={adviceFormat === option.value}
                  onChange={() => setAdviceFormat(option.value)}
                  disabled={loading}
                />
                <span className="radio-label">
                  {option.label}
                </span>
              </label>
            ))}
          </div>
        </div>

        <div className="condition-inputs">
          <p className="inputs">Time Limit:</p>
          <div className="time-control">
            <select
              className="inputs-field time-select"
              value={timeOption}
              onChange={(e) => setTimeOption(e.target.value)}
              disabled={loading}
            >
              <option value="disable">Disable</option>
              <option value="enable">Enable</option>
            </select>

            {timeOption === 'enable' && (
              <input
                type="number"
                className="inputs-field time-input"
                placeholder="Seconds"
                value={timeLimit}
                onChange={(e) => setTimeLimit(e.target.value)}
                min="1"
                disabled={loading}
              />
            )}
          </div>
        </div>

        <div className="buttons">
          <button
            onClick={() => {
              if (editIndex !== null) {
                handleCancelEdit();
              } else {
                router.push(`/create-experiment?experimentId=${experimentId}`);
              }
            }}
            className="back-button"
            disabled={loading}
          >
            {editIndex !== null ? "Cancel Edit" : "Back"}
          </button>

          {/* Show "Review Experiment" if conditions exist and not editing */}
          {editIndex === null && existingConditions.length > 0 && (
            <button
              onClick={handleViewExistingConditions}
              className="review-button"
              disabled={loading}
            >
              Review & Submit
            </button>
          )}

          <button
            onClick={handleSaveCondition}
            disabled={
              !conditionName.trim() ||
              !adviceFormat ||
              loading ||
              (timeOption === "enable" &&
                (!timeLimit || parseInt(timeLimit) < 1))
            }
            className="save-button"
          >
            {loading
              ? editIndex !== null
                ? "Updating..."
                : "Saving..."
              : editIndex !== null
              ? "Update Condition"
              : "Save & Add Puzzles"}
          </button>
        </div>

        {/* Helper text */}
        {existingConditions.length > 0 && editIndex === null && (
          <div className="additional-actions">
            <p className="helper-text">
              After adding puzzles to this condition, you can add more conditions or review your experiment.
            </p>
          </div>
        )}

        {editIndex !== null && (
          <div className="additional-actions">
            <p className="helper-text">
              You are editing an existing condition. Changes will be saved immediately.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}