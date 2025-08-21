'use client';
/* game page code place in the /game/[level]/page.jsx - UPDATED FOR COUNTERBALANCING */
import { useState, useCallback, useRef, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Newboard from '../../../../components/Newboard.jsx';

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
  
  // NEW: Counterbalancing debug info
  const [counterbalancingInfo, setCounterbalancingInfo] = useState(null);

  // Load experiment data and session info
  useEffect(() => {
    const loadExperimentData = async () => {
      try {
        setLoading(true);
        
        // Get player session data from sessionStorage
        const storedSessionId = sessionStorage.getItem('sessionId');
        const storedPlayerName = sessionStorage.getItem('playerName');
        
        if (!storedSessionId || !storedPlayerName) {
          console.error('No session data found, redirecting to home');
          router.push('/');
          return;
        }
        
        setSessionId(parseInt(storedSessionId));
        setPlayerName(storedPlayerName);
        
        console.log(`Loading experiment for player: ${storedPlayerName}, level: ${level}`);
        
        // Fetch active experiment with player context for counterbalancing
        const response = await fetch(`/api/experiments/active?playerName=${encodeURIComponent(storedPlayerName)}`);
        if (!response.ok) {
          throw new Error('No active experiment found');
        }
        
        const experimentData = await response.json();
        console.log('Experiment data received:', experimentData);
        
        if (!experimentData.active) {
          throw new Error('No active experiment available');
        }
        
        // Store counterbalancing debug info
        if (experimentData.debug) {
          setCounterbalancingInfo(experimentData.debug);
          console.log('Counterbalancing info:', experimentData.debug);
        }
        
        setExperiment(experimentData);
        
        // Find the condition (set) based on level parameter
        // Frontend still uses level index, but gets randomised conditions
        const levelIndex = parseInt(level) - 1;
        const selectedCondition = experimentData.conditions[levelIndex];
        
        if (!selectedCondition) {
          throw new Error(`Set ${level} not found (available sets: 1-${experimentData.conditions.length})`);
        }
        
        console.log(`Selected condition for Set ${level}:`, {
          conditionId: selectedCondition.id,
          conditionName: selectedCondition.name,
          originalOrder: selectedCondition.originalOrder,
          puzzleCount: selectedCondition.puzzles.length
        });
        
        setCondition(selectedCondition);
        setPuzzles(selectedCondition.puzzles);
        
      } catch (err) {
        console.error('Error loading experiment data:', err);
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
      console.log(`Starting puzzle ${currentIndex + 1}:`, {
        puzzleId: puzzles[currentIndex].id,
        fen: puzzles[currentIndex].fen,
        hasAdvice: !!puzzles[currentIndex].advice
      });
      
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
    console.log('Move submitted:', { move, moveDetails });
    
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
      console.log('Move recorded as BEFORE advice:', move);
    } else {
      // This is a move after advice was shown
      setMoveAfterAdvice(move);
      const postTime = Math.floor((Date.now() - adviceShownTimeRef.current) / 1000);
      setPostAdviceTime(postTime);
      console.log('Move recorded as AFTER advice:', move);
    }
    
    // Stop timer
    stopTimer();
    setGameState('moved');
    
    // Auto-show advice after 1 second if advice exists AND not already shown
    setTimeout(() => {
      if (currentPuzzle.advice && !adviceAlreadyShown) {
        console.log('Auto-showing advice for puzzle:', currentPuzzle.id);
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
        console.log('No advice to show or already shown');
        setGameState('advice-shown');
      }
    }, 1000);
  }, [currentPuzzle, isTimerEnabled, stopTimer, startTimer, adviceAlreadyShown]);

  // Handle undo with proper state reset
  const handleUndo = useCallback(() => {
    console.log('Undo requested');
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
      console.log('Undoing AFTER advice move');
    } else if (!adviceAlreadyShown && moveBeforeAdvice) {
      // We're undoing a "before advice" move
      setMoveBeforeAdvice(null);
      setPreAdviceTime(0);
      setMoveAfterAdvice(null);
      console.log('Undoing BEFORE advice move');
    }
    
    // Reset current move state
    setGameState('waiting');
    setCurrentMove(null);
    setUserMoveDetails(null);
    
    // Don't hide advice if it was already shown
    if (!adviceAlreadyShown) {
      setAdviceVisible(false);
    }
    
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
    
    console.log('Submitting move for puzzle:', currentPuzzle.id);
    
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
    
    console.log('Final move analysis:', {
      finalMoveBeforeAdvice,
      finalMoveAfterAdvice,
      correctMove: currentPuzzle.correct_move,
      moveMatchesAdvice,
      finalPreAdviceTime,
      finalPostAdviceTime
    });
    
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
      console.log('Response submission result:', result);
      
      if (!response.ok) {
        if (response.status === 409) {
          console.warn('Response already exists for this puzzle');
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
      console.error('Error saving response:', error);
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
      console.log(`Completed all puzzles in Set ${level}`);
      router.push('/welcome');
      return;
    }
    
    // Move to next puzzle
    console.log(`Moving to puzzle ${currentIndex + 2} of ${puzzles.length}`);
    setCurrentIndex(prev => prev + 1);
  }, [stopTimer, currentIndex, puzzles.length, router, level]);

  // Handle skip with proper time recording
  const handleSkipPuzzle = useCallback(async () => {
    if (!sessionId || !currentPuzzle) {
      return;
    }

    console.log('Skipping puzzle:', currentPuzzle.id);

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
        console.warn('Error saving skip response:', result);
        // Continue anyway
      }
    } catch (error) {
      console.warn('Error saving skip response:', error);
      // Continue anyway
    }
    
    // Move to next puzzle
    handleNextPuzzle();
  }, [sessionId, currentPuzzle, timeExceeded, handleNextPuzzle, adviceVisible, 
      adviceAlreadyShown, adviceRequested, undoUsed, moveHistory, stopTimer,
      preAdviceTime, postAdviceTime, moveBeforeAdvice, moveAfterAdvice]);

  // Handle manual advice request
  const handleShowAdvice = useCallback(() => {
    console.log('Manual advice request');
    
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
    if (!timeLimit) return 'text-blue-400';
    const progress = currentTimer / timeLimit;
    if (progress >= 1) return 'text-red-500';
    if (progress >= 0.8) return 'text-orange-400';
    if (progress >= 0.6) return 'text-yellow-400';
    return 'text-green-400';
  };

  // Get confidence color based on percentage
  const getConfidenceColor = (confidence) => {
    const percentage = confidence * 100;
    if (percentage >= 70) return 'bg-green-500';
    if (percentage >= 40) return 'bg-yellow-500';
    return 'bg-red-500';
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
        return adviceVisible ? 'Advice shown. Make your move or submit.' : 'Drag and drop a piece to make your move';
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
        return adviceVisible ? 'text-green-300' : 'text-blue-300';
      case 'moved':
        return 'text-yellow-300';
      case 'advice-shown':
        return 'text-green-300';
      case 'submitted':
        return 'text-purple-300';
      default:
        return 'text-gray-300';
    }
  };

  const highlightSquares = getHighlightSquares();
  const adviceFormat = getAdviceFormat();

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <p className="text-lg">Loading experiment...</p>
          <p className="text-sm text-gray-400 mt-2">Player: {playerName || 'Unknown'} | Set: {level}</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
        <div className="text-center">
          <p className="text-red-400 text-lg mb-4">Error: {error}</p>
          <p className="text-gray-400 text-sm mb-4">Player: {playerName} | Set: {level}</p>
          <button
            onClick={() => router.push('/welcome')}
            className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded"
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
      <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
        <div className="text-center">
          <p className="text-lg">No puzzles available for this set.</p>
          <p className="text-gray-400 text-sm">Condition: {condition?.name} | Puzzles: {puzzles.length}</p>
          <button
            onClick={() => router.push('/welcome')}
            className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded mt-4"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-white max-w-6xl mx-auto p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Set {level}</h1>
          <p className="text-sm text-gray-400">
            Session: {sessionId} | Player: {playerName} | Puzzle: {currentPuzzle?.id}
            {/* Enhanced debug info for counterbalancing */}
            {condition && (
              <span className="ml-2 text-yellow-400">
                (Condition: {condition.name} #{condition.id})
              </span>
            )}
          </p>
          {/* Show counterbalancing debug info if available */}
          {counterbalancingInfo && (
            <p className="text-xs text-purple-400 mt-1">
              Debug: {counterbalancingInfo.conditionOrder.map(c => `${c.name}(#${c.id})`).join(' → ')}
            </p>
          )}
        </div>
        <div className="text-right">
          <p className="text-yellow-300 text-lg">
            Puzzle {currentIndex + 1} of {puzzles.length}
          </p>
          <div className="w-48 bg-gray-700 rounded-full h-2 mt-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentIndex + 1) / puzzles.length) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Timer Display - Only show current timer */}
      {isTimerEnabled && (
        <div className="bg-gray-800 p-4 rounded-lg border-2 border-blue-500">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="text-center">
                <p className="text-sm text-gray-300">Current Timer</p>
                <p className={`text-2xl font-bold ${getTimerColor()}`}>
                  {formatTime(currentTimer)}
                  {timeLimit && (
                    <span className="text-sm text-gray-400 ml-2">
                      / {formatTime(timeLimit)}
                    </span>
                  )}
                </p>
                {timeExceeded && (
                  <p className="text-red-400 text-sm font-semibold">⚠️ Time Exceeded!</p>
                )}
              </div>
              
              {timeLimit && (
                <div className="flex-1 max-w-xs">
                  <div className="w-full bg-gray-700 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full transition-all duration-300 ${
                        timeExceeded ? 'bg-red-500' : 
                        currentTimer / timeLimit >= 0.8 ? 'bg-orange-500' :
                        currentTimer / timeLimit >= 0.6 ? 'bg-yellow-500' : 'bg-green-500'
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
        <div className="bg-gray-800 p-3 rounded-lg border border-gray-600">
          <p className="text-gray-400 text-center">
            ⏱️ Timer disabled for this set
          </p>
        </div>
      )}

      <div className="bg-gray-800 p-4 rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/chessplayer.png" alt="Human" width={52} height={52}  className="scale-140 w-auto h-auto"/>
            <div>
              <p className="text-lg font-semibold">{sideToMove} to move</p>
              {currentMove && (
                <p className="text-blue-300 text-sm">Your move: {currentMove.move}</p>
              )}
              {undoUsed && (
                <p className="text-orange-300 text-sm">⚠️ Undo used</p>
              )}
            </div>
          </div>
          <div className="text-right">
            <p className={`text-sm font-medium ${getStatusColor()}`}>
              {getStatusMessage()}
            </p>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Newboard
            key={`puzzle-${currentIndex}`}
            fen={currentPuzzle.fen}
            boardWidth={500}
            onMoveSubmit={handleMoveSubmit}
            onUndo={handleUndo}
            isLocked={gameState === 'submitted'}
            highlightSquares={highlightSquares}
            showAdvice={adviceVisible}
          />
        </div>

        <div className="space-y-4">
          {(gameState === 'waiting' && !adviceVisible) && (
            <div className="bg-gray-800 p-6 rounded-lg">
              <h3 className="text-xl font-semibold mb-4">Actions</h3>
              <div className="space-y-3">
                <button
                  onClick={handleShowAdvice}
                  className="w-full bg-yellow-600 hover:bg-yellow-700 px-4 py-3 rounded-lg font-semibold transition-colors"
                >
                  💡 Show Advice
                </button>
                <button
                  onClick={handleSkipPuzzle}
                  className="w-full bg-gray-600 hover:bg-gray-700 px-4 py-3 rounded-lg font-semibold transition-colors"
                >
                  ⏭️ Skip Puzzle
                </button>
              </div>
            </div>
          )}

          {gameState === 'moved' && (
            <div className="bg-gray-800 p-6 rounded-lg">
              <h3 className="text-xl font-semibold mb-4 text-yellow-400">Move Analysis</h3>
              <div className="space-y-3">
                <div className="bg-yellow-900/30 p-4 rounded border border-yellow-500">
                  <p className="text-yellow-300">
                    ♟️ Your move: <strong>{currentMove?.move}</strong>
                  </p>
                  {userMoveDetails && (
                    <p className="text-yellow-200 text-sm mt-1">
                      {userMoveDetails.from} → {userMoveDetails.to}
                    </p>
                  )}
                </div>
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400"></div>
                  <span className="ml-2 text-yellow-300">Analyzing position...</span>
                </div>
              </div>
            </div>
          )}

          {/* Show advice panel after move is made (if advice exists) */}
          {gameState === 'advice-shown' && currentMove && currentPuzzle.advice && (
            <div className="bg-gray-800 p-6 rounded-lg">
              <h3 className="text-xl font-semibold mb-4 text-green-400">Chess Advice</h3>
              
              <div className="space-y-4">
                <div className="bg-blue-900/30 p-3 rounded border border-blue-500">
                  <p className="text-blue-300 text-sm">
                    Your move: {currentMove.move}
                  </p>
                </div>

                <div className="bg-green-900/30 p-4 rounded border border-green-500">
                  <p className="text-green-400 font-semibold">
                    🎯 Recommended: {currentPuzzle.advice.text}
                  </p>
                </div>

                {adviceFormat.includes('confidence') && currentPuzzle.advice.confidence && (
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <p className="text-sm text-gray-300">
                        Confidence
                      </p>
                      <p className="text-sm font-bold text-white">
                        {Math.round(currentPuzzle.advice.confidence * 100)}%
                      </p>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-4">
                      <div
                        className={`h-4 rounded-full transition-all duration-500 ${getConfidenceColor(currentPuzzle.advice.confidence)}`}
                        style={{ width: `${currentPuzzle.advice.confidence * 100}%` }}
                      />
                    </div>
                  </div>
                )}

                {adviceFormat.includes('explanation') && currentPuzzle.advice.explanation && (
                  <div className="bg-purple-900/20 p-4 rounded border border-purple-400">
                    <p className="text-purple-200 italic">💭 {currentPuzzle.advice.explanation}</p>
                  </div>
                )}

                {adviceFormat.includes('reliability') && currentPuzzle.advice.reliability && (
                  <div className="bg-orange-900/20 p-3 rounded border border-orange-400">
                    <p className="text-orange-200 text-sm">
                      📊 Reliability: <span className="font-semibold">{currentPuzzle.advice.reliability}</span>
                    </p>
                  </div>
                )}

                <button
                  onClick={handleSubmitMove}
                  className="w-full bg-green-600 hover:bg-green-700 px-4 py-3 rounded-lg font-semibold transition-colors"
                >
                  ✅ Submit Move
                </button>
              </div>
            </div>
          )}

          {/* Simple submit panel when no advice is available */}
          {gameState === 'advice-shown' && currentMove && !currentPuzzle.advice && (
            <div className="bg-gray-800 p-6 rounded-lg">
              <h3 className="text-xl font-semibold mb-4 text-blue-400">Your Move</h3>
              
              <div className="space-y-4">
                <div className="bg-blue-900/30 p-3 rounded border border-blue-500">
                  <p className="text-blue-300 text-sm">
                    Move: {currentMove.move}
                  </p>
                </div>

                <button
                  onClick={handleSubmitMove}
                  className="w-full bg-green-600 hover:bg-green-700 px-4 py-3 rounded-lg font-semibold transition-colors"
                >
                  ✅ Submit Move
                </button>
              </div>
            </div>
          )}

          {gameState === 'submitted' && (
            <div className="bg-gray-800 p-6 rounded-lg">
              <h3 className="text-xl font-semibold mb-4 text-purple-400">Move Submitted!</h3>
              <div className="text-center space-y-4">
                <div className="bg-purple-900/30 p-4 rounded border border-purple-500">
                  <p className="text-purple-300">✨ Great job! Moving to next puzzle...</p>
                </div>
                <div className="flex items-center justify-center">
                  <div className="animate-pulse rounded-full h-3 w-3 bg-purple-400 mr-2"></div>
                  <div className="animate-pulse rounded-full h-3 w-3 bg-purple-400 mr-2"></div>
                  <div className="animate-pulse rounded-full h-3 w-3 bg-purple-400"></div>
                </div>
                <button
                  onClick={handleNextPuzzle}
                  className="bg-purple-600 hover:bg-purple-700 px-6 py-2 rounded-lg font-semibold transition-colors"
                >
                  Next Puzzle Now →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-gray-800 p-4 rounded-lg">
        <div className="grid md:grid-cols-4 gap-4 text-sm">
          <div className="flex items-center text-blue-300">
            <span className="w-3 h-3 bg-blue-500 rounded-full mr-2"></span>
            Waiting for move
          </div>
          <div className="flex items-center text-yellow-300">
            <span className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></span>
            Analyzing move
          </div>
          <div className="flex items-center text-green-300">
            <span className="w-3 h-3 bg-green-500 rounded-full mr-2"></span>
            Advice shown
          </div>
          <div className="flex items-center text-purple-300">
            <span className="w-3 h-3 bg-purple-500 rounded-full mr-2"></span>
            Move submitted
          </div>
        </div>
      </div>
    </div>
  );
}