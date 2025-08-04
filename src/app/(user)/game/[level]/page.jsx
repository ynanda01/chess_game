
'use client';
/* game page code place in the /game/[level]/page.jsx */
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
  
  // Game states
  const [gameState, setGameState] = useState('waiting'); // 'waiting', 'moved', 'advice-shown', 'submitted'
  const [userMove, setUserMove] = useState(null);
  const [userMoveDetails, setUserMoveDetails] = useState(null);
  const [adviceVisible, setAdviceVisible] = useState(false);
  
  // Timer states
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
        
        // Get player session data
        const storedSessionId = localStorage.getItem('sessionId');
        const storedPlayerName = localStorage.getItem('playerName');
        
        if (!storedSessionId || !storedPlayerName) {
          router.push('/');
          return;
        }
        
        setSessionId(storedSessionId);
        setPlayerName(storedPlayerName);
        
        // Fetch active experiment
        const response = await fetch('/api/experiments/active');
        if (!response.ok) {
          throw new Error('No active experiment found');
        }
        
        const experimentData = await response.json();
        
        if (!experimentData.active) {
          throw new Error('No active experiment available');
        }
        
        setExperiment(experimentData);
        
        // Find the condition (set) based on level parameter
        const levelIndex = parseInt(level) - 1; // Convert level (1-5) to index (0-4)
        const selectedCondition = experimentData.conditions[levelIndex];
        
        if (!selectedCondition) {
          throw new Error(`Set ${level} not found`);
        }
        
        setCondition(selectedCondition);
        setPuzzles(selectedCondition.puzzles);
        
      } catch (err) {
        console.error('Error loading experiment:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadExperimentData();
  }, [level, router]);

  // Get current puzzle and its settings
  const currentPuzzle = puzzles[currentIndex];
  const sideToMove = currentPuzzle ? (currentPuzzle.fen.includes(' w ') ? 'White' : 'Black') : '';
  
  // Determine timer settings (condition overrides experiment defaults)
  const isTimerEnabled = condition ? 
    (condition.timerEnabled !== null ? condition.timerEnabled : experiment?.timerEnabled) : false;
  const timeLimit = condition ? 
    (condition.timeLimit !== null ? condition.timeLimit : experiment?.timeLimit) : null;

  // Start timer when puzzle begins
  useEffect(() => {
    if (gameState === 'waiting' && currentPuzzle) {
      startTimer();
      puzzleStartTimeRef.current = Date.now();
      setTimeExceeded(false);
    }
  }, [currentIndex, gameState, currentPuzzle]);

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

  const handleMoveSubmit = useCallback(async (move, moveDetails) => {
    // Record pre-advice time
    const preTime = Math.floor((Date.now() - puzzleStartTimeRef.current) / 1000);
    setPreAdviceTime(preTime);
    
    stopTimer();
    setUserMove(move);
    setUserMoveDetails(moveDetails);
    setGameState('moved');
    
    // Auto-show advice after 1 second
    setTimeout(() => {
      setGameState('advice-shown');
      setAdviceVisible(true);
      adviceShownTimeRef.current = Date.now();
      
      // Start post-advice timer
      if (isTimerEnabled) {
        startTimer();
      }
    }, 1000);
  }, [isTimerEnabled, stopTimer, startTimer]);

  const handleUndo = useCallback(() => {
    setGameState('waiting');
    setUserMove(null);
    setUserMoveDetails(null);
    
    // Reset and restart pre-advice timer
    setPreAdviceTime(0);
    setPostAdviceTime(0);
    setCurrentTimer(0);
    puzzleStartTimeRef.current = Date.now();
    
    if (isTimerEnabled) {
      stopTimer();
      startTimer();
    }
  }, [isTimerEnabled, stopTimer, startTimer]);

  const handleSubmitMove = useCallback(async () => {
    // Record post-advice time
    if (adviceShownTimeRef.current) {
      const postTime = Math.floor((Date.now() - adviceShownTimeRef.current) / 1000);
      setPostAdviceTime(postTime);
    }
    
    stopTimer();
    setGameState('submitted');
    
    // Prepare data to send to backend
    const responseData = {
      sessionId: sessionId,
      puzzleId: currentPuzzle.id,
      moveBeforeAdvice: null, // Since we auto-show advice after move
      timeBeforeAdvice: preAdviceTime,
      moveAfterAdvice: userMove,
      timeAfterAdvice: adviceShownTimeRef.current ? 
        Math.floor((Date.now() - adviceShownTimeRef.current) / 1000) : 0,
      adviceShown: true,
      adviceRequested: false,
      moveMatchesAdvice: userMove === currentPuzzle.correct_move,
      undoUsed: false,
      timeExceeded: timeExceeded,
      skipped: false
    };
    
    try {
      // Send response to backend
      await fetch('/api/player-responses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(responseData),
      });
      
      console.log('Response saved:', responseData);
    } catch (error) {
      console.error('Error saving response:', error);
    }
    
    // Auto advance to next puzzle after 2 seconds
    setTimeout(() => {
      handleNextPuzzle();
    }, 2000);
  }, [sessionId, currentPuzzle, preAdviceTime, userMove, timeExceeded, stopTimer]);

  const handleNextPuzzle = useCallback(() => {
    stopTimer();
    
    if (currentIndex + 1 >= puzzles.length) {
      // All puzzles completed in this set
      router.push('/welcome');
      return;
    }
    
    // Move to next puzzle
    setGameState('waiting');
    setUserMove(null);
    setUserMoveDetails(null);
    setAdviceVisible(false);
    setPreAdviceTime(0);
    setPostAdviceTime(0);
    setCurrentTimer(0);
    setTimeExceeded(false);
    setCurrentIndex(prev => prev + 1);
  }, [stopTimer, currentIndex, puzzles.length, router]);

  const handleSkipPuzzle = useCallback(async () => {
    // Record skip in database
    const responseData = {
      sessionId: sessionId,
      puzzleId: currentPuzzle.id,
      moveBeforeAdvice: null,
      timeBeforeAdvice: Math.floor((Date.now() - puzzleStartTimeRef.current) / 1000),
      moveAfterAdvice: '',
      timeAfterAdvice: 0,
      adviceShown: false,
      adviceRequested: false,
      moveMatchesAdvice: false,
      undoUsed: false,
      timeExceeded: timeExceeded,
      skipped: true
    };
    
    try {
      await fetch('/api/player-responses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(responseData),
      });
    } catch (error) {
      console.error('Error saving skip:', error);
    }
    
    handleNextPuzzle();
  }, [sessionId, currentPuzzle, timeExceeded, handleNextPuzzle]);

  const handleShowAdvice = useCallback(() => {
    // Record pre-advice time when manually showing advice
    const preTime = Math.floor((Date.now() - puzzleStartTimeRef.current) / 1000);
    setPreAdviceTime(preTime);
    
    stopTimer();
    setGameState('advice-shown');
    setAdviceVisible(true);
    adviceShownTimeRef.current = Date.now();
    
    // Start post-advice timer
    if (isTimerEnabled) {
      startTimer();
    }
  }, [isTimerEnabled, stopTimer, startTimer]);

  // Get highlight squares for advice
  const getHighlightSquares = useCallback(() => {
    if (!adviceVisible || !currentPuzzle?.advice?.text) return [];
    
    const adviceText = currentPuzzle.advice.text;
    
    // Handle coordinate notation like "e2e4"
    if (adviceText.length === 4 && /^[a-h][1-8][a-h][1-8]$/.test(adviceText)) {
      return [adviceText.slice(0, 2), adviceText.slice(2, 4)];
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
        return 'Drag and drop a piece to make your move';
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
        return 'text-blue-300';
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

      {/* Timer Display */}
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
            
            <div className="text-right text-sm">
              <div className="flex gap-6">
                <div>
                  <p className="text-gray-400">Pre-Advice Time</p>
                  <p className="text-blue-400 font-semibold">
                    {preAdviceTime > 0 ? formatTime(preAdviceTime) : '--:--'}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400">Post-Advice Time</p>
                  <p className="text-green-400 font-semibold">
                    {postAdviceTime > 0 ? formatTime(postAdviceTime) : '--:--'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Timer Disabled Message */}
      {!isTimerEnabled && (
        <div className="bg-gray-800 p-3 rounded-lg border border-gray-600">
          <p className="text-gray-400 text-center">
            ⏱️ Timer disabled for this set
            {preAdviceTime > 0 && (
              <span className="ml-4 text-blue-400">
                Pre-advice: {formatTime(preAdviceTime)}
              </span>
            )}
            {postAdviceTime > 0 && (
              <span className="ml-4 text-green-400">
                Post-advice: {formatTime(postAdviceTime)}
              </span>
            )}
          </p>
        </div>
      )}

      <div className="bg-gray-800 p-4 rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/human-icon.png" alt="Human" width={32} height={32} />
            <div>
              <p className="text-lg font-semibold">{sideToMove} to move</p>
              {userMove && (
                <p className="text-blue-300 text-sm">Your move: {userMove}</p>
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
          {gameState === 'waiting' && (
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
              <div className="mt-4 p-3 bg-blue-900/20 rounded border border-blue-400">
                <p className="text-blue-200 text-sm">
                  <strong>How to play:</strong> Click and drag any of your pieces to a valid square to make a move.
                  {isTimerEnabled && (
                    <>
                      <br />
                      <strong>Timer:</strong> Your thinking time is being recorded.
                      {timeLimit && (
                        <> Time limit: {formatTime(timeLimit)}</>
                      )}
                    </>
                  )}
                </p>
              </div>
            </div>
          )}

          {gameState === 'moved' && (
            <div className="bg-gray-800 p-6 rounded-lg">
              <h3 className="text-xl font-semibold mb-4 text-yellow-400">Move Analysis</h3>
              <div className="space-y-3">
                <div className="bg-yellow-900/30 p-4 rounded border border-yellow-500">
                  <p className="text-yellow-300">
                    ♟️ Your move: <strong>{userMove}</strong>
                  </p>
                  {userMoveDetails && (
                    <p className="text-yellow-200 text-sm mt-1">
                      {userMoveDetails.from} → {userMoveDetails.to}
                    </p>
                  )}
                  {preAdviceTime > 0 && (
                    <p className="text-blue-300 text-sm mt-2">
                      ⏱️ Thinking time: {formatTime(preAdviceTime)}
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

          {(gameState === 'advice-shown' || adviceVisible) && currentPuzzle.advice && (
            <div className="bg-gray-800 p-6 rounded-lg">
              <h3 className="text-xl font-semibold mb-4 text-green-400">Chess Advice</h3>
              
              <div className="space-y-4">
                {userMove && (
                  <div className="bg-blue-900/30 p-3 rounded border border-blue-500">
                    <p className="text-blue-300 text-sm">
                      Your move: {userMove}
                      {preAdviceTime > 0 && (
                        <span className="ml-2 text-blue-400">
                          (⏱️ {formatTime(preAdviceTime)})
                        </span>
                      )}
                    </p>
                  </div>
                )}

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

                {gameState === 'advice-shown' && (
                  <button
                    onClick={handleSubmitMove}
                    className="w-full bg-green-600 hover:bg-green-700 px-4 py-3 rounded-lg font-semibold transition-colors"
                  >
                    ✅ Submit Move
                  </button>
                )}
              </div>
            </div>
          )}

          {gameState === 'submitted' && (
            <div className="bg-gray-800 p-6 rounded-lg">
              <h3 className="text-xl font-semibold mb-4 text-purple-400">Move Submitted!</h3>
              <div className="text-center space-y-4">
                <div className="bg-purple-900/30 p-4 rounded border border-purple-500">
                  <p className="text-purple-300">✨ Great job! Moving to next puzzle...</p>
                  {(preAdviceTime > 0 || postAdviceTime > 0) && (
                    <div className="mt-3 text-sm space-y-1">
                      {preAdviceTime > 0 && (
                        <p className="text-blue-300">
                          Pre-advice time: {formatTime(preAdviceTime)}
                        </p>
                      )}
                      {postAdviceTime > 0 && (
                        <p className="text-green-300">
                          Post-advice time: {formatTime(postAdviceTime)}
                        </p>
                      )}
                    </div>
                  )}
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