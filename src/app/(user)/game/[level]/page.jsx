'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import Image from 'next/image';
import Newboard from '../../../../components/newboard';

const MOCK_PUZZLES = [
  {
    fen: '8/5k2/3p4/1p1Pp2p/pP2Pp1P/P4P1K/8/8 b - - 99 50',
    advice: {
      text: 'e7e5',
      confidence: 0.8,
      explanation: 'This opens up the center and allows for good piece development.'
    },
    condition: {
      advice_format: ['confidence', 'explanation'],
      timer_enabled: true, // Experimenter can control this
      time_limit: 30 // Optional time limit in seconds (null for no limit)
    }
  },
  {
    fen: '4k2r/6r1/8/8/8/8/3R4/R3K3 w Qk - 0 1',
    advice: {
      text: 'g8f6',
      confidence: 0.65,
      explanation: 'Develops a knight to a natural square and prepares for castling.'
    },
    condition: {
      advice_format: ['confidence', 'explanation'],
      timer_enabled: false, // Timer disabled for this puzzle
      time_limit: null
    }
  },
  {
    fen: '8/8/8/4p1K1/2k1P3/8/8/8 b - - 0 1',
    advice: {
      text: 'b1c3',
      confidence: 0.45,
      explanation: 'Develops the knight and supports the central pawn.'
    },
    condition: {
      advice_format: ['confidence', 'explanation'],
      timer_enabled: true,
      time_limit: 60 // 60 second limit
    }
  }
];

export default function LevelPage() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [gameState, setGameState] = useState('waiting'); // 'waiting', 'moved', 'advice-shown', 'submitted'
  const [userMove, setUserMove] = useState(null);
  const [userMoveDetails, setUserMoveDetails] = useState(null);
  const [adviceVisible, setAdviceVisible] = useState(false);
  
  // Timer states
  const [preAdviceTime, setPreAdviceTime] = useState(0); // Time before advice (seconds)
  const [postAdviceTime, setPostAdviceTime] = useState(0); // Time after advice (seconds)
  const [currentTimer, setCurrentTimer] = useState(0); // Current running timer
  const [timerActive, setTimerActive] = useState(false);
  const [timeExceeded, setTimeExceeded] = useState(false);
  
  // Timer refs
  const timerRef = useRef(null);
  const startTimeRef = useRef(null);
  const puzzleStartTimeRef = useRef(null);
  const adviceShownTimeRef = useRef(null);

  const puzzle = MOCK_PUZZLES[currentIndex];
  const sideToMove = puzzle.fen.includes(' w ') ? 'White' : 'Black';
  const isTimerEnabled = puzzle.condition.timer_enabled;
  const timeLimit = puzzle.condition.time_limit;

  // Start timer when puzzle begins
  useEffect(() => {
    if (gameState === 'waiting') {
      startTimer();
      puzzleStartTimeRef.current = Date.now();
      setTimeExceeded(false);
    }
  }, [currentIndex, gameState]);

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
    }, 100); // Update every 100ms for smooth display
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

  const handleMoveSubmit = useCallback((move, moveDetails) => {
    // Record pre-advice time (mandatory)
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

  const handleSubmitMove = useCallback(() => {
    // Record post-advice time (mandatory)
    if (adviceShownTimeRef.current) {
      const postTime = Math.floor((Date.now() - adviceShownTimeRef.current) / 1000);
      setPostAdviceTime(postTime);
    }
    
    stopTimer();
    setGameState('submitted');
    
    // Log timing data (this would be sent to your backend)
    const timingData = {
      puzzleIndex: currentIndex,
      preAdviceTime: preAdviceTime,
      postAdviceTime: adviceShownTimeRef.current ? 
        Math.floor((Date.now() - adviceShownTimeRef.current) / 1000) : 0,
      userMove: userMove,
      adviceMove: puzzle.advice.text,
      timerEnabled: isTimerEnabled,
      timeLimit: timeLimit,
      timeExceeded: timeExceeded
    };
    
    console.log('Timing Data:', timingData);
    
    // Auto advance to next puzzle after 2 seconds
    setTimeout(() => {
      handleNextPuzzle();
    }, 2000);
  }, [currentIndex, preAdviceTime, userMove, puzzle.advice.text, isTimerEnabled, timeLimit, timeExceeded, stopTimer]);

  const handleNextPuzzle = useCallback(() => {
    stopTimer();
    setGameState('waiting');
    setUserMove(null);
    setUserMoveDetails(null);
    setAdviceVisible(false);
    setPreAdviceTime(0);
    setPostAdviceTime(0);
    setCurrentTimer(0);
    setTimeExceeded(false);
    setCurrentIndex((prev) => (prev + 1) % MOCK_PUZZLES.length);
  }, [stopTimer]);

  const handleSkipPuzzle = useCallback(() => {
    stopTimer();
    setGameState('waiting');
    setUserMove(null);
    setUserMoveDetails(null);
    setAdviceVisible(false);
    setPreAdviceTime(0);
    setPostAdviceTime(0);
    setCurrentTimer(0);
    setTimeExceeded(false);
    setCurrentIndex((prev) => (prev + 1) % MOCK_PUZZLES.length);
  }, [stopTimer]);

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

  // Extract from/to squares from advice - Better parsing for different formats
  const getHighlightSquares = useCallback(() => {
    if (!adviceVisible || !puzzle.advice.text) return [];
    
    const adviceText = puzzle.advice.text;
    
    // Handle coordinate notation like "e2e4"
    if (adviceText.length === 4 && /^[a-h][1-8][a-h][1-8]$/.test(adviceText)) {
      return [adviceText.slice(0, 2), adviceText.slice(2, 4)];
    }
    
    // Handle algebraic notation like "Nf6", "e4", "O-O", etc.
    if (adviceText.length >= 2) {
      // Simple pawn moves like "e4"
      if (/^[a-h][1-8]$/.test(adviceText)) {
        return [adviceText];
      }
      
      // Knight moves like "Nf6"
      if (/^N[a-h][1-8]$/.test(adviceText)) {
        return [adviceText.slice(1)];
      }
      
      // Bishop moves like "Bc4"  
      if (/^B[a-h][1-8]$/.test(adviceText)) {
        return [adviceText.slice(1)];
      }
      
      // Rook moves like "Rd1"
      if (/^R[a-h][1-8]$/.test(adviceText)) {
        return [adviceText.slice(1)];
      }
      
      // Queen moves like "Qd4"
      if (/^Q[a-h][1-8]$/.test(adviceText)) {
        return [adviceText.slice(1)];
      }
      
      // King moves like "Kh1"
      if (/^K[a-h][1-8]$/.test(adviceText)) {
        return [adviceText.slice(1)];
      }
    }
    
    return [];
  }, [adviceVisible, puzzle.advice.text]);

  const highlightSquares = getHighlightSquares();

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

  // Get confidence color based on percentage
  const getConfidenceColor = (confidence) => {
    const percentage = confidence * 100;
    if (percentage >= 70) return 'bg-green-500';
    if (percentage >= 40) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="space-y-6 text-white max-w-6xl mx-auto p-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Level 1</h1>
        <div className="text-right">
          <p className="text-yellow-300 text-lg">
            Puzzle {currentIndex + 1} of {MOCK_PUZZLES.length}
          </p>
          <div className="w-48 bg-gray-700 rounded-full h-2 mt-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentIndex + 1) / MOCK_PUZZLES.length) * 100}%` }}
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
            ⏱️ Timer disabled for this puzzle
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
            fen={puzzle.fen}
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

          {(gameState === 'advice-shown' || adviceVisible) && (
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
                    🎯 Recommended: {puzzle.advice.text}
                  </p>
                </div>

                {puzzle.condition.advice_format.includes('confidence') && (
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <p className="text-sm text-gray-300">
                        Confidence
                      </p>
                      <p className="text-sm font-bold text-white">
                        {Math.round(puzzle.advice.confidence * 100)}%
                      </p>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-4">
                      <div
                        className={`h-4 rounded-full transition-all duration-500 ${getConfidenceColor(puzzle.advice.confidence)}`}
                        style={{ width: `${puzzle.advice.confidence * 100}%` }}
                      />
                    </div>
                  </div>
                )}

                {puzzle.condition.advice_format.includes('explanation') && (
                  <div className="bg-purple-900/20 p-4 rounded border border-purple-400">
                    <p className="text-purple-200 italic">💭 {puzzle.advice.explanation}</p>
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


// 'use client';

// import { useEffect, useState } from 'react';
// import { useParams } from 'next/navigation';
// import Manualchessboard from '@/components/manualchessboard';
// import Image from 'next/image';

// export default function LevelPage() {
//   const { level } = useParams();
//   const [sessionId, setSessionId] = useState(null);
//   const [puzzles, setPuzzles] = useState([]);
//   const [currentIndex, setCurrentIndex] = useState(0);
//   const [showAdvice, setShowAdvice] = useState(false);
//   const [moveBeforeAdvice, setMoveBeforeAdvice] = useState(null);

//   useEffect(() => {
//     const id = localStorage.getItem('sessionId');
//     if (!id) return;
//     setSessionId(id);

//     const fetchPuzzles = async () => {
//       const res = await fetch(`/api/puzzles?level=${level}&sessionId=${id}`);
//       const data = await res.json();
//       setPuzzles(data);
//     };

//     fetchPuzzles();
//   }, [level]);

//   if (!puzzles.length) return <p className="text-white">Loading puzzles...</p>;

//   const puzzle = puzzles[currentIndex];
//   const sideToMove = puzzle.fen.includes(' w ') ? 'White' : 'Black';

//   const handleSubmitMove = (move) => {
//     setMoveBeforeAdvice(move);
//     setShowAdvice(true);
//   };

//   const handleNextPuzzle = () => {
//     setShowAdvice(false);
//     setMoveBeforeAdvice(null);
//     setCurrentIndex((prev) => prev + 1);
//   };

//   return (
//     <div className="space-y-6">
//       <h1 className="text-3xl font-bold">Level {level}</h1>
//       <p className="text-yellow-300">Puzzle {currentIndex + 1} of {puzzles.length}</p>

//       <div className="flex items-center gap-3">
//         <Image src="/human-icon.png" alt="Human" width={32} height={32} />
//         <p className="text-lg">{sideToMove} to move</p>
//       </div>

//       <Manualchessboard
//         fen={puzzle.fen}
//         boardWidth={500}
//         onMoveSubmit={handleSubmitMove}
//         isLocked={showAdvice}
//         highlightMove={showAdvice ? puzzle.advice.text : null}
//       />

//       {showAdvice && (
//         <div className="mt-6 space-y-3">
//           <h3 className="text-xl font-semibold">Advice</h3>
//           <p className="text-green-400">Recommended Move: {puzzle.advice.text}</p>

//           {puzzle.condition.advice_format.includes('confidence') && (
//             <div className="w-full bg-gray-700 rounded h-4">
//               <div className="bg-green-500 h-4 rounded" style={{ width: `${puzzle.advice.confidence * 100}%` }}></div>
//             </div>
//           )}

//           {puzzle.condition.advice_format.includes('explanation') && (
//             <p className="text-gray-200 italic">{puzzle.advice.explanation}</p>
//           )}

//           <button onClick={handleNextPuzzle} className="bg-blue-600 px-4 py-2 rounded mt-4">
//             Next Puzzle
//           </button>
//         </div>
//       )}
//     </div>
//   );
// }
