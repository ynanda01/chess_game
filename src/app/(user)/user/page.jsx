// Player Puzzle Page (dynamic advice modes + mock fallback)
//  * If `puzzle` prop is undefined (no backend yet) we inject mock data so the component renders without errors.
//  * adviceMode: "only" | "confidence" | "explanation"

"use client";
import React, { useState, useEffect, useRef } from "react";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";
import { motion, AnimatePresence } from "framer-motion";
import { FaLightbulb, FaArrowRight, FaArrowLeft } from "react-icons/fa";

/**
 * @typedef {Object} Puzzle
 * @property {string} fen - FEN string for position
 * @property {string} move - Advice move (e.g., "Qh7+")
 * @property {number=} confidence - Confidence percentage (0‑100)
 * @property {string=} explanation - Explanation text
 * @property {"only"|"confidence"|"explanation"} adviceMode - determines what gets shown
 */

// 🔹 Mock puzzle used when no backend data supplied
const MOCK_PUZZLE = {
  fen: "r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 2 3", // simple Italian opening position
  move: "Bxf7+",
  confidence: 92,
  explanation: "Sacrificing the bishop lures the king out and leads to a winning attack.",
  adviceMode: "explanation",
};

export default function PlayerPuzzleScreen({
  playerName = "Player",
  puzzleIndex = 1,
  totalPuzzles = 10,
  puzzle = MOCK_PUZZLE, // 👉 default to mock if undefined
  onNext = () => {},
  onBack = () => {},
}) {
  const [feedback, setFeedback] = useState(null);
  const [timeLeft, setTimeLeft] = useState(60);
  const [game] = useState(new Chess(puzzle.fen));
  const timerRef = useRef(null);

  useEffect(() => {
    setTimeLeft(60);
    game.load(puzzle.fen);
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [puzzle, game]);

  const handleMoveSubmit = () => {
    const isCorrect = Math.random() > 0.5; // TODO validate
    setFeedback(isCorrect ? "✅ Great move!" : "⚠️ Not the best move – keep going!");
    clearInterval(timerRef.current);
    setTimeout(() => {
      setFeedback(null);
      onNext();
    }, 2000);
  };

  const renderAdvicePanel = () => {
    const { adviceMode, move, confidence, explanation } = puzzle;
    return (
      <section className="bg-white shadow rounded-lg p-6 border border-gray-200 w-[260px]">
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <FaLightbulb className="text-yellow-500" /> Advice
        </h2>
        <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg text-sm">
          <div className="mb-1">
            <span className="font-medium">Move:</span> {move}
          </div>
          {(adviceMode === "confidence" || adviceMode === "explanation") && (
            <div className="text-green-600 mb-2">Confidence: {confidence}%</div>
          )}
          {adviceMode === "explanation" && (
            <p className="mt-2 text-gray-700 text-xs">{explanation}</p>
          )}
        </div>
      </section>
    );
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-gray-900 p-6 font-sans flex flex-col items-center">
      <h1 className="text-2xl font-bold text-center">Welcome, {playerName}! 👋</h1>
      <div className="mt-6 mb-4 text-center bg-blue-50 px-4 py-2 rounded-full shadow inline-block font-medium text-blue-600">
        Puzzle {puzzleIndex} of {totalPuzzles}
      </div>

      <div className="grid lg:grid-cols-[280px_420px] gap-8 items-start">
        {renderAdvicePanel()}
        <div className="flex flex-col items-center">
          <div className="relative">
            <Chessboard
              id="PlayerBoard"
              position={puzzle.fen}
              arePiecesDraggable={true}
              onPieceDrop={(source, target) => {
                const move = game.move({ from: source, to: target, promotion: "q" });
                return !!move;
              }}
              boardWidth={420}
              customBoardStyle={{ borderRadius: "8px", boxShadow: "0 5px 15px rgba(0,0,0,0.1)" }}
            />
            <div className="absolute -top-4 -right-4 bg-red-500 text-white rounded-full px-4 py-1 text-sm font-semibold shadow-lg">
              ⏱ {timeLeft}s
            </div>
          </div>
          <button
            onClick={handleMoveSubmit}
            className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 rounded mt-4 w-52 shadow"
          >
            ✅ Submit Move
          </button>
          <AnimatePresence>
            {feedback && (
              <motion.div
                key="fb"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 12 }}
                className="mt-3 text-base font-medium"
              >
                {feedback}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="mt-8 flex gap-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 bg-gray-200 hover:bg-gray-300 text-gray-700 px-5 py-2 rounded-full shadow"
        >
          <FaArrowLeft /> Back
        </button>
        <button
          onClick={onNext}
          className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-5 py-2 rounded-full shadow"
        >
          Next <FaArrowRight />
        </button>
      </div>
    </div>
  );
}




// Please check the below for the complete code snippet:
// "use client";
// import React, { useState, useEffect, useRef } from "react";
// import { Chess } from "chess.js";
// import { Chessboard } from "react-chessboard";
// import { motion, AnimatePresence } from "framer-motion";
// import { FaLightbulb, FaArrowRight, FaArrowLeft } from "react-icons/fa";

// /**
//  * @typedef {Object} Puzzle
//  * @property {string} fen - FEN string for position
//  * @property {string} move - Advice move (e.g., "Qh7+")
//  * @property {number=} confidence - Confidence percentage (0‑100)
//  * @property {string=} explanation - Explanation text
//  * @property {"only"|"confidence"|"explanation"} adviceMode - determines what gets shown
//  */
// export default function PlayerPuzzleScreen({
//   playerName = "Player",
//   puzzleIndex = 1,
//   totalPuzzles = 10,
//   puzzle,
//   onNext,
//   onBack,
// }) {
//   const [feedback, setFeedback] = useState(null);
//   const [timeLeft, setTimeLeft] = useState(60);
//   const [game] = useState(new Chess(puzzle.fen));
//   const timerRef = useRef(null);

//   /* ----------------------------- timer logic ---------------------------- */
//   useEffect(() => {
//     setTimeLeft(60);
//     game.load(puzzle.fen);
//     timerRef.current = setInterval(() => {
//       setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
//     }, 1000);
//     return () => clearInterval(timerRef.current);
//   }, [puzzle, game]);

//   /* --------------------------- move submission -------------------------- */
//   const handleMoveSubmit = () => {
//     // TODO: validate move correctness vs puzzle.correctMove
//     const isCorrect = Math.random() > 0.5;
//     setFeedback(isCorrect ? "✅ Great move!" : "⚠️ Not the best move – keep going!");
//     clearInterval(timerRef.current);
//     setTimeout(() => {
//       setFeedback(null);
//       onNext();
//     }, 2000);
//   };

//   /* ------------------------- advice panel render ------------------------ */
//   const renderAdviceDetails = () => {
//     const { adviceMode, move, confidence, explanation } = puzzle;
//     return (
//       <section className="bg-white shadow rounded-lg p-6 border border-gray-200 w-[260px]">
//         <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
//           <FaLightbulb className="text-yellow-500" /> Advice
//         </h2>
//         <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg text-sm">
//           <div className="mb-1">
//             <span className="font-medium">Move:</span> {move}
//           </div>
//           {(adviceMode === "confidence" || adviceMode === "explanation") && (
//             <div className="text-green-600 mb-2">Confidence: {confidence}%</div>
//           )}
//           {adviceMode === "explanation" && (
//             <p className="mt-2 text-gray-700 text-xs">{explanation}</p>
//           )}
//         </div>
//       </section>
//     );
//   };

//   return (
//     <div className="min-h-screen bg-[#F8FAFC] text-gray-900 p-6 font-sans flex flex-col items-center">
//       {/* Header & progress */}
//       <h1 className="text-2xl font-bold text-center">Welcome, {playerName}! 👋</h1>
//       <div className="mt-6 mb-4 text-center bg-blue-50 px-4 py-2 rounded-full shadow inline-block font-medium text-blue-600">
//         Puzzle {puzzleIndex} of {totalPuzzles}
//       </div>

//       {/* Layout */}
//       <div className="grid lg:grid-cols-[280px_420px] gap-8 items-start">
//         {renderAdviceDetails()}

//         {/* Board column */}
//         <div className="flex flex-col items-center">
//           <div className="relative">
//             <Chessboard
//               id="PlayerBoard"
//               position={puzzle.fen}
//               arePiecesDraggable={true}
//               onPieceDrop={(source, target) => {
//                 const moveResult = game.move({ from: source, to: target, promotion: "q" });
//                 return !!moveResult;
//               }}
//               boardWidth={420}
//               customBoardStyle={{ borderRadius: "8px", boxShadow: "0 5px 15px rgba(0,0,0,0.1)" }}
//             />
//             <div className="absolute -top-4 -right-4 bg-red-500 text-white rounded-full px-4 py-1 text-sm font-semibold shadow-lg">
//               ⏱ {timeLeft}s
//             </div>
//           </div>

//           <button
//             onClick={handleMoveSubmit}
//             className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 rounded mt-4 w-52 shadow"
//           >
//             ✅ Submit Move
//           </button>

//           <AnimatePresence>
//             {feedback && (
//               <motion.div
//                 key="fb"
//                 initial={{ opacity: 0, y: 12 }}
//                 animate={{ opacity: 1, y: 0 }}
//                 exit={{ opacity: 0, y: 12 }}
//                 className="mt-3 text-base font-medium"
//               >
//                 {feedback}
//               </motion.div>
//             )}
//           </AnimatePresence>
//         </div>
//       </div>

//       {/* Navigation buttons */}
//       <div className="mt-8 flex gap-6">
//         <button
//           onClick={onBack}
//           className="flex items-center gap-2 bg-gray-200 hover:bg-gray-300 text-gray-700 px-5 py-2 rounded-full shadow"
//         >
//           <FaArrowLeft /> Back
//         </button>
//         <button
//           onClick={onNext}
//           className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-5 py-2 rounded-full shadow"
//         >
//           Next <FaArrowRight />
//         </button>
//       </div>
//     </div>
//   );
// }
