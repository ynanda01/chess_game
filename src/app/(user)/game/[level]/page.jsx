'use client';
import { useState, useCallback, useRef, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Newboard from '../../../../components/Newboard.jsx';
import './page.css';

export default function LevelPage() {
  const { level } = useParams();
  const router = useRouter();
  
  // Experiment and puzzle states
  const [experiment, setExperiment] = useState(null);
  const [condition, setCondition] = useState(null);
  const [puzzles, setPuzzles] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Game states with proper move tracking
  const [gameState, setGameState] = useState('waiting'); // 'waiting', 'moved', 'advice-shown', 'submitted'
  const [moveHistory, setMoveHistory] = useState([]);
  const [currentMove, setCurrentMove] = useState(null);
  const [userMoveDetails, setUserMoveDetails] = useState(null);
  
  // Move tracking for before/after advice
  const [moveBeforeAdvice, setMoveBeforeAdvice] = useState(null);
  const [moveAfterAdvice, setMoveAfterAdvice] = useState(null);
  const [adviceVisible, setAdviceVisible] = useState(false);
  const [adviceRequested, setAdviceRequested] = useState(false);
  const [adviceAlreadyShown, setAdviceAlreadyShown] = useState(false);
  const [undoUsed, setUndoUsed] = useState(false);
  
  // Timer states (hidden from UI but tracked for backend)
  const [preAdviceTime, setPreAdviceTime] = useState(0);
  const [postAdviceTime, setPostAdviceTime] = useState(0);
  const [currentTimer, setCurrentTimer] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const [timeExceeded, setTimeExceeded] = useState(false);
  
  // Timer refs
  const timerRef = useRef(null);
  const startTimeRef = useRef(null);
  const puzzleStartTimeRef = useRef(null);
  const adviceShownTimeRef = useRef(null);

  // Session data
  const [sessionId, setSessionId] = useState(null);
  const [playerName, setPlayerName] = useState('');

  // Load experiment data and session info
  useEffect(() => {
    const loadExperimentData = async () => {
      try {
        setLoading(true);
        
        // Get player session data from sessionStorage
        const storedSessionId = sessionStorage.getItem('sessionId');
        const storedPlayerName = sessionStorage.getItem('playerName');
        
        if (!storedSessionId || !storedPlayerName) {
          router.push('/');
          return;
        }
        
        setSessionId(parseInt(storedSessionId));
        setPlayerName(storedPlayerName);
        
        // Fetch active experiment with player context for counterbalancing
        const response = await fetch(`/api/experiments/active?playerName=${encodeURIComponent(storedPlayerName)}`);
        if (!response.ok) {
          throw new Error('No active experiment found');
        }
        
        const experimentData = await response.json();
        
        if (!experimentData.active) {
          throw new Error('No active experiment available');
        }
        
        setExperiment(experimentData);
        
        // Find the condition (set) based on level parameter
        const levelIndex = parseInt(level) - 1;
        const selectedCondition = experimentData.conditions[levelIndex];
        
        if (!selectedCondition) {
          throw new Error(`Set ${level} not found (available sets: 1-${experimentData.conditions.length})`);
        }
        
        setCondition(selectedCondition);
        setPuzzles(selectedCondition.puzzles);
        
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadExperimentData();
  }, [level, router]);

  // Reset puzzle state when index changes
  useEffect(() => {
    if (puzzles[currentIndex]) {
      setGameState('waiting');
      setMoveHistory([]);
      setCurrentMove(null);
      setUserMoveDetails(null);
      
      // Reset move tracking
      setMoveBeforeAdvice(null);
      setMoveAfterAdvice(null);
      setAdviceVisible(false);
      setAdviceRequested(false);
      setAdviceAlreadyShown(false);
      setUndoUsed(false);
      
      // Reset times
      setPreAdviceTime(0);
      setPostAdviceTime(0);
      setCurrentTimer(0);
      setTimeExceeded(false);
      
      // Start timer for new puzzle
      puzzleStartTimeRef.current = Date.now();
      if (isTimerEnabled) {
        startTimer();
      }
    }
  }, [currentIndex, puzzles]);

  // Get current puzzle and its settings
  const currentPuzzle = puzzles[currentIndex];
  const sideToMove = currentPuzzle ? (currentPuzzle.fen.includes(' w ') ? 'White' : 'Black') : '';
  
  // Determine timer settings
  const isTimerEnabled = condition ? 
    (condition.timerEnabled !== null ? condition.timerEnabled : experiment?.timerEnabled) : false;
  const timeLimit = condition ? 
    (condition.timeLimit !== null ? condition.timeLimit : experiment?.timeLimit) : null;

  // Timer function
  const startTimer = useCallback(() => {
    if (!isTimerEnabled) return;
    
    startTimeRef.current = Date.now();
    setTimerActive(true);
    
    timerRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      setCurrentTimer(elapsed);
      
      // Check time limit
      if (timeLimit && elapsed >= timeLimit) {
        setTimeExceeded(true);
      }
    }, 100);
  }, [isTimerEnabled, timeLimit]);

  // Stop timer
  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setTimerActive(false);
  }, []);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // Handle move submission with proper before/after advice tracking
  const handleMoveSubmit = useCallback(async (move, moveDetails) => {
    // Calculate time taken for this move
    const moveTime = Math.floor((Date.now() - puzzleStartTimeRef.current) / 1000);
    
    // Create move record
    const moveRecord = {
      move: move,
      moveDetails: moveDetails,
      time_taken: moveTime,
      timestamp: Date.now(),
      was_undone: false
    };
    
    // Add to move history
    setMoveHistory(prev => [...prev, moveRecord]);
    setCurrentMove(moveRecord);
    setUserMoveDetails(moveDetails);
    
    // Determine if this is before or after advice
    if (!adviceAlreadyShown) {
      // This is the first move, before any advice shown
      setMoveBeforeAdvice(move);
      setPreAdviceTime(moveTime);
      setMoveAfterAdvice(null);
    } else {
      // This is a move after advice was shown
      setMoveAfterAdvice(move);
      const postTime = Math.floor((Date.now() - adviceShownTimeRef.current) / 1000);
      setPostAdviceTime(postTime);
    }
    
    // Stop timer
    stopTimer();
    setGameState('moved');
    
    // Auto-show advice after 1 second if advice exists AND not already shown
    setTimeout(() => {
      if (currentPuzzle.advice && !adviceAlreadyShown) {
        setGameState('advice-shown');
        setAdviceVisible(true);
        setAdviceAlreadyShown(true);
        adviceShownTimeRef.current = Date.now();
        
        // Start post-advice timer
        if (isTimerEnabled) {
          startTimer();
        }
      } else {
        // No advice available OR advice already shown
        setGameState('advice-shown');
      }
    }, 1000);
  }, [currentPuzzle, isTimerEnabled, stopTimer, startTimer, adviceAlreadyShown]);

  // Handle undo with proper state reset
  const handleUndo = useCallback(() => {
    setUndoUsed(true);
    
    // Mark the last move as undone in history
    if (currentMove) {
      setMoveHistory(prev => 
        prev.map(move => 
          move.timestamp === currentMove.timestamp 
            ? { ...move, was_undone: true }
            : move
        )
      );
    }
    
    // Reset move tracking based on which move we're undoing
    if (adviceAlreadyShown && moveAfterAdvice) {
      // We're undoing an "after advice" move
      setMoveAfterAdvice(null);
      setPostAdviceTime(0);
    } else if (!adviceAlreadyShown && moveBeforeAdvice) {
      // We're undoing a "before advice" move
      setMoveBeforeAdvice(null);
      setPreAdviceTime(0);
      setMoveAfterAdvice(null);
    }
    
    // Reset current move state - go back to waiting
    setGameState('waiting');
    setCurrentMove(null);
    setUserMoveDetails(null);
    
    // Reset current timer
    setCurrentTimer(0);
    puzzleStartTimeRef.current = Date.now();
    
    if (isTimerEnabled) {
      stopTimer();
      startTimer();
    }
  }, [currentMove, isTimerEnabled, stopTimer, startTimer, adviceAlreadyShown, moveBeforeAdvice, moveAfterAdvice]);

  // Handle submit move with proper data tracking
  const handleSubmitMove = useCallback(async () => {
    if (!sessionId || !currentPuzzle) {
      alert('Session error: Missing session or puzzle data. Please refresh and try again.');
      return;
    }
    
    stopTimer();
    setGameState('submitted');
    
    // Use the tracked moves directly
    let finalMoveBeforeAdvice = moveBeforeAdvice;
    let finalMoveAfterAdvice = moveAfterAdvice;
    let finalPreAdviceTime = preAdviceTime;
    let finalPostAdviceTime = postAdviceTime;
    
    // Edge case handling if we have a current move but no proper tracking
    if (currentMove && !finalMoveBeforeAdvice && !finalMoveAfterAdvice) {
      if (adviceAlreadyShown) {
        finalMoveAfterAdvice = currentMove.move;
        if (adviceShownTimeRef.current) {
          finalPostAdviceTime = Math.floor((Date.now() - adviceShownTimeRef.current) / 1000);
        }
      } else {
        finalMoveBeforeAdvice = currentMove.move;
        finalPreAdviceTime = Math.floor((Date.now() - puzzleStartTimeRef.current) / 1000);
      }
    }
    
    // Determine if move matches advice
    const finalMove = finalMoveAfterAdvice || finalMoveBeforeAdvice;
    const moveMatchesAdvice = currentPuzzle.correct_move && finalMove === currentPuzzle.correct_move;
    
    // Prepare complete data for backend
    const responseData = {
      sessionId: parseInt(sessionId),
      puzzleId: parseInt(currentPuzzle.id),
      moveBeforeAdvice: finalMoveBeforeAdvice,
      timeBeforeAdvice: finalPreAdviceTime,
      moveAfterAdvice: finalMoveAfterAdvice,
      timeAfterAdvice: finalPostAdviceTime,
      adviceShown: adviceVisible || adviceAlreadyShown,
      adviceRequested: adviceRequested,
      moveMatchesAdvice: moveMatchesAdvice,
      undoUsed: undoUsed,
      timeExceeded: timeExceeded,
      skipped: false,
      moves: moveHistory.map((move, index) => ({
        move: move.move,
        time_taken: move.time_taken,
        was_undone: move.was_undone
      }))
    };
    
    try {
      const response = await fetch('/api/player-responses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(responseData),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        if (response.status === 409) {
          // Continue anyway
        } else if (response.status === 404 && result.message === 'Session not found') {
          alert('Session error: Your session was not found. Please restart the game.');
          router.push('/');
          return;
        } else {
          throw new Error(result.message || 'Failed to save response');
        }
      }
      
    } catch (error) {
      alert('Warning: Your response may not have been saved. Please continue.');
    }
    
    // Auto advance to next puzzle after 2 seconds
    setTimeout(() => {
      handleNextPuzzle();
    }, 2000);
  }, [sessionId, currentPuzzle, moveBeforeAdvice, moveAfterAdvice, preAdviceTime, postAdviceTime,
      currentMove, timeExceeded, stopTimer, adviceVisible, adviceAlreadyShown, adviceRequested, 
      undoUsed, moveHistory, router]);

  const handleNextPuzzle = useCallback(() => {
    stopTimer();
    
    if (currentIndex + 1 >= puzzles.length) {
      // All puzzles completed in this set
      router.push('/welcome');
      return;
    }
    
    // Move to next puzzle
    setCurrentIndex(prev => prev + 1);
  }, [stopTimer, currentIndex, puzzles.length, router]);

  // Handle skip with proper time recording
  const handleSkipPuzzle = useCallback(async () => {
    if (!sessionId || !currentPuzzle) {
      return;
    }

    // Calculate total time spent on this puzzle before skipping
    const totalTimeSpent = Math.floor((Date.now() - puzzleStartTimeRef.current) / 1000);
    
    // Stop timer
    stopTimer();

    // Determine time allocation based on current state
    let skipPreAdviceTime = preAdviceTime;
    let skipPostAdviceTime = postAdviceTime;
    
    if (!adviceAlreadyShown) {
      // Advice was never shown, all time goes to "before advice"
      skipPreAdviceTime = totalTimeSpent;
      skipPostAdviceTime = 0;
    } else if (adviceShownTimeRef.current) {
      // Advice was shown, calculate post-advice time
      skipPostAdviceTime = Math.floor((Date.now() - adviceShownTimeRef.current) / 1000);
    }

    // Record skip in database with proper time tracking
    const responseData = {
      sessionId: parseInt(sessionId),
      puzzleId: parseInt(currentPuzzle.id),
      moveBeforeAdvice: moveBeforeAdvice,
      timeBeforeAdvice: skipPreAdviceTime,
      moveAfterAdvice: moveAfterAdvice || '',
      timeAfterAdvice: skipPostAdviceTime,
      adviceShown: adviceVisible || adviceAlreadyShown,
      adviceRequested: adviceRequested,
      moveMatchesAdvice: false,
      undoUsed: undoUsed,
      timeExceeded: timeExceeded,
      skipped: true,
      moves: moveHistory.map((move, index) => ({
        move: move.move,
        time_taken: move.time_taken,
        was_undone: move.was_undone
      }))
    };
    
    try {
      const response = await fetch('/api/player-responses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(responseData),
      });
      
      const result = await response.json();
      
      if (!response.ok && response.status !== 409) {
        // Continue anyway
      }
    } catch (error) {
      // Continue anyway
    }
    
    // Move to next puzzle
    handleNextPuzzle();
  }, [sessionId, currentPuzzle, timeExceeded, handleNextPuzzle, adviceVisible, 
      adviceAlreadyShown, adviceRequested, undoUsed, moveHistory, stopTimer,
      preAdviceTime, postAdviceTime, moveBeforeAdvice, moveAfterAdvice]);

  // Handle manual advice request
  const handleShowAdvice = useCallback(() => {
    // If no move made yet, record time spent thinking before requesting advice
    if (!currentMove) {
      const preTime = Math.floor((Date.now() - puzzleStartTimeRef.current) / 1000);
      setPreAdviceTime(preTime);
    }
    
    setAdviceRequested(true);
    setAdviceAlreadyShown(true);
    
    stopTimer();
    setGameState('advice-shown');
    setAdviceVisible(true);
    adviceShownTimeRef.current = Date.now();
    
    // Start post-advice timer
    if (isTimerEnabled) {
      startTimer();
    }
  }, [currentMove, isTimerEnabled, stopTimer, startTimer]);

  // Get highlight squares for advice
  const getHighlightSquares = useCallback(() => {
    if (!adviceVisible || !currentPuzzle?.advice?.text) {
      return [];
    }
    
    const adviceText = currentPuzzle.advice.text.trim();
    
    // Method 1: Direct coordinate notation like "e2e4"
    if (adviceText.length === 4 && /^[a-h][1-8][a-h][1-8]$/.test(adviceText)) {
      return [adviceText.slice(0, 2), adviceText.slice(2, 4)];
    }
    
    // Method 2: Arrow notation like "Qh6 → g7" or "h6→g7"
    const arrowMatch = adviceText.match(/([a-h][1-8])\s*(?:→|->|to)\s*([a-h][1-8])/i);
    if (arrowMatch) {
      return [arrowMatch[1], arrowMatch[2]];
    }
    
    // Method 3: Extract all square coordinates and use first two
    const squares = adviceText.match(/[a-h][1-8]/g);
    if (squares && squares.length >= 2) {
      return [squares[0], squares[1]];
    }
    
    // Method 4: Single square (destination only)
    if (squares && squares.length === 1) {
      return [squares[0]];
    }
    
    // Method 5: Try to parse standard chess notation
    const pieceMove = adviceText.match(/[KQRBN]?[a-h]?[1-8]?x?([a-h][1-8])(\+|#)?/);
    if (pieceMove) {
      return [pieceMove[1]];
    }
    
    return [];
  }, [adviceVisible, currentPuzzle]);

  // Format time display
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Get timer color based on time limit
  const getTimerColor = () => {
    if (!timeLimit) return 'blue';
    const progress = currentTimer / timeLimit;
    if (progress >= 1) return 'red';
    if (progress >= 0.8) return 'orange';
    if (progress >= 0.6) return 'yellow';
    return 'green';
  };

  // Get confidence color based on percentage
  const getConfidenceColor = (confidence) => {
    const percentage = confidence * 100;
    if (percentage >= 70) return 'bg-green';
    if (percentage >= 40) return 'bg-yellow';
    return 'bg-red';
  };

  // Parse advice format
  const getAdviceFormat = () => {
    if (!condition) return [];
    const format = condition.adviceformat || experiment?.adviceformat || '';
    return format.split(',').map(f => f.trim());
  };

  const getStatusMessage = () => {
    switch (gameState) {
      case 'waiting':
        return adviceAlreadyShown ? 'Advice shown. Make your move or submit.' : 'Drag and drop a piece to make your move';
      case 'moved':
        return 'Move made! Analyzing...';
      case 'advice-shown':
        return 'Here\'s the recommended move. Submit to continue.';
      case 'submitted':
        return 'Great! Moving to next puzzle...';
      default:
        return '';
    }
  };

  const getStatusColor = () => {
    switch (gameState) {
      case 'waiting':
        return adviceAlreadyShown ? 'green' : 'blue';
      case 'moved':
        return 'yellow';
      case 'advice-shown':
        return 'green';
      case 'submitted':
        return 'purple';
      default:
        return 'gray';
    }
  };

  const highlightSquares = getHighlightSquares();
  const adviceFormat = getAdviceFormat();

  // Loading state
  if (loading) {
    return (
      <div className="loading">
        <div>
          <div className="spinner"></div>
          <p className="big-text">Loading experiment...</p>
          <p className="small-text">Player: {playerName || 'Unknown'} | Set: {level}</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="loading">
        <div>
          <p className="error">Error: {error}</p>
          <p className="small-text">Player: {playerName} | Set: {level}</p>
          <button
            onClick={() => router.push('/welcome')}
            className="btn btn-skip"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  // No puzzle state
  if (!currentPuzzle) {
    return (
      <div className="loading">
        <div>
          <p className="big-text">No puzzles available for this set.</p>
          <p className="small-text">Condition: {condition?.name} | Puzzles: {puzzles.length}</p>
          <button
            onClick={() => router.push('/welcome')}
            className="btn btn-skip"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="wrapper">
      <div className="main">
        <div className="header">
          <div>
            <h1 className="title">Set {level}</h1>
            <p className="info">
              Session: {sessionId} | Player: {playerName} | Puzzle: {currentPuzzle?.id}
            </p>
          </div>
          <div className="progress">
            <p className="progress-text">
              Puzzle {currentIndex + 1} of {puzzles.length}
            </p>
            <div className="bar">
              <div
                className="fill"
                style={{ width: `${((currentIndex + 1) / puzzles.length) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Timer Display - Only show current timer */}
        {isTimerEnabled && (
          <div className="timer">
            <div className="timer-row">
              <div className="timer-left">
                <div className="clock">
                  <p className="clock-label">Current Timer</p>
                  <p className={`clock-time ${getTimerColor()}`}>
                    {formatTime(currentTimer)}
                    {timeLimit && (
                      <span className="time-left">
                        / {formatTime(timeLimit)}
                      </span>
                    )}
                  </p>
                  {timeExceeded && (
                    <p className="warning">⚠️ Time Exceeded!</p>
                  )}
                </div>
                
                {timeLimit && (
                  <div className="timer-bar">
                    <div className="timer-track">
                      <div
                        className={`timer-progress ${
                          timeExceeded ? 'bg-red' : 
                          currentTimer / timeLimit >= 0.8 ? 'bg-orange' :
                          currentTimer / timeLimit >= 0.6 ? 'bg-yellow' : 'bg-green'
                        }`}
                        style={{ width: `${Math.min((currentTimer / timeLimit) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Timer Disabled Message */}
        {!isTimerEnabled && (
          <div className="no-timer">
            <p>⏱️ Timer disabled for this set</p>
          </div>
        )}

        <div className="status">
          <div className="status-row">
            <div className="player">
              <Image src="/chessplayer.png" alt="Human" width={52} height={52} className="avatar"/>
              <div>
                <p className="player-name">{sideToMove} to move</p>
                {currentMove && (
                  <p className="move">Your move: {currentMove.move}</p>
                )}
                {undoUsed && (
                  <p className="undo-warning">⚠️ Undo used</p>
                )}
              </div>
            </div>
            <div>
              <p className={`message ${getStatusColor()}`}>
                {getStatusMessage()}
              </p>
            </div>
          </div>
        </div>

        <div className="grid">
          <div className="board">
            <Newboard
              key={`puzzle-${currentIndex}`}
              fen={currentPuzzle.fen}
              boardWidth={500}
              onMoveSubmit={handleMoveSubmit}
              onUndo={handleUndo}
              isLocked={gameState === 'submitted'}
              highlightSquares={highlightSquares}
              showAdvice={adviceVisible || adviceAlreadyShown}
            />
          </div>

          <div className="panel-content">
            {/* Actions panel - only show when waiting and no advice shown yet */}
            {(gameState === 'waiting' && !adviceAlreadyShown) && (
              <div className="panel">
                <h3>Actions</h3>
                <div className="actions">
                  {/* Only show "Show Advice" button if current puzzle has advice */}
                  {currentPuzzle?.advice && (
                    <button
                      onClick={handleShowAdvice}
                      className="btn btn-advice"
                    >
                      💡 Show Advice
                    </button>
                  )}
                  <button
                    onClick={handleSkipPuzzle}
                    className="btn btn-skip"
                  >
                    ⏭️ Skip Puzzle
                  </button>
                </div>
              </div>
            )}

            {/* Advice panel for waiting state when advice was already shown (after undo) */}
            {gameState === 'waiting' && adviceAlreadyShown && currentPuzzle.advice && (
              <div className="panel advice">
                <h3>Chess Advice</h3>
                
                <div className="panel-content">
                  <div className="recommendation">
                    <p>🎯 Recommended: {currentPuzzle.advice.text}</p>
                  </div>

                  {/* CONFIDENCE */}
                  {(adviceFormat.includes('full') || adviceFormat.includes('confidence')) && currentPuzzle.advice.confidence && (
                    <div>
                      <div className="confidence-row">
                        <p className="confidence-label">Confidence</p>
                        <p className="confidence-score">
                          {Math.round(currentPuzzle.advice.confidence * 1)}%
                        </p>
                      </div>
                      <div className="confidence-bar">
                        <div
                          className={`confidence-fill ${getConfidenceColor(currentPuzzle.advice.confidence)}`}
                          style={{ width: `${currentPuzzle.advice.confidence * 100}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* EXPLANATION */}
                  {(adviceFormat.includes('full') || adviceFormat.includes('explanation')) && currentPuzzle.advice.explanation && (
                    <div className="explanation">
                      <p>💭 {currentPuzzle.advice.explanation}</p>
                    </div>
                  )}

                  <div className="msg-info">
                    <p>💡 Advice is shown. Make your move on the board.</p>
                  </div>
                </div>
              </div>
            )}

            {gameState === 'moved' && (
              <div className="panel analysis">
                <h3>Move Analysis</h3>
                <div className="panel-content">
                  <div className="move-box">
                    <p className="move-text">
                      ♟️ Your move: <strong>{currentMove?.move}</strong>
                    </p>
                    {userMoveDetails && (
                      <p className="move-detail">
                        {userMoveDetails.from} → {userMoveDetails.to}
                      </p>
                    )}
                  </div>
                  <div className="analyzing">
                    <div className="analyzing-spinner"></div>
                    <span>Analyzing position...</span>
                  </div>
                </div>
              </div>
            )}

            {/* Show advice panel after move is made OR when manually requested */}
            {gameState === 'advice-shown' && currentPuzzle.advice && (
              <div className="panel advice">
                <h3>Chess Advice</h3>
                
                <div className="panel-content">
                  {/* Only show "Your move" section if a move was actually made */}
                  {currentMove && (
                    <div className="move-display">
                      <p>Your move: {currentMove.move}</p>
                    </div>
                  )}

                  <div className="recommendation">
                    <p>🎯 Recommended: {currentPuzzle.advice.text}</p>
                  </div>

                  {/* CONFIDENCE - Show if format is 'full' OR includes 'confidence' */}
                  {(adviceFormat.includes('full') || adviceFormat.includes('confidence')) && currentPuzzle.advice.confidence && (
                    <div>
                      <div className="confidence-row">
                        <p className="confidence-label">Confidence</p>
                        <p className="confidence-score">
                          {Math.round(currentPuzzle.advice.confidence * 1)}%
                        </p>
                      </div>
                      <div className="confidence-bar">
                        <div
                          className={`confidence-fill ${getConfidenceColor(currentPuzzle.advice.confidence)}`}
                          style={{ width: `${currentPuzzle.advice.confidence * 1}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* EXPLANATION - Show if format is 'full' OR includes 'explanation' */}
                  {(adviceFormat.includes('full') || adviceFormat.includes('explanation')) && currentPuzzle.advice.explanation && (
                    <div className="explanation">
                      <p>💭 {currentPuzzle.advice.explanation}</p>
                    </div>
                  )}

                  {/* Show different buttons based on whether a move was made */}
                  {currentMove ? (
                    <button
                      onClick={handleSubmitMove}
                      className="btn btn-submit"
                    >
                      ✅ Submit Move
                    </button>
                  ) : (
                    <div className="msg-wait">
                      <p>💡 Advice shown. Now make your move on the board.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Simple submit panel when no advice is available */}
            {gameState === 'advice-shown' && currentMove && !currentPuzzle.advice && (
              <div className="panel your-move">
                <h3>Your Move</h3>
                
                <div className="panel-content">
                  <div className="move-display">
                    <p>Move: {currentMove.move}</p>
                  </div>

                  <button
                    onClick={handleSubmitMove}
                    className="btn btn-submit"
                  >
                    ✅ Submit Move
                  </button>
                </div>
              </div>
            )}

            {gameState === 'submitted' && (
              <div className="panel submitted">
                <h3>Move Submitted!</h3>
                <div className="submitted-content">
                  <div className="success-msg">
                    <p>✨ Great job! Moving to next puzzle...</p>
                  </div>
                  <div className="dots">
                    <div className="dot"></div>
                    <div className="dot"></div>
                    <div className="dot"></div>
                  </div>
                  <button
                    onClick={handleNextPuzzle}
                    className="btn btn-next"
                  >
                    Next Puzzle Now →
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="legend">
          <div className="legend-grid">
            <div className="legend-item">
              <span className="legend-dot bg-blue"></span>
              Waiting for move
            </div>
            <div className="legend-item">
              <span className="legend-dot bg-yellow"></span>
              Analyzing move
            </div>
            <div className="legend-item">
              <span className="legend-dot bg-green"></span>
              Advice shown
            </div>
            <div className="legend-item">
              <span className="legend-dot bg-purple"></span>
              Move submitted
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}