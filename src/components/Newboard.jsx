"use client";
import React, { useState, useCallback, useEffect } from "react";
import { Chess } from "chess.js";

export default function Newboard({ 
  fen, 
  boardWidth = 400, 
  onMoveSubmit, 
  isLocked = false, 
  highlightSquares = [],
  showAdvice = false,
  onUndo
}) {
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [possibleMoves, setPossibleMoves] = useState([]);
  const [draggedPiece, setDraggedPiece] = useState(null);
  const [draggedFrom, setDraggedFrom] = useState(null);
  const [hoveredSquare, setHoveredSquare] = useState(null);
  const [tempMove, setTempMove] = useState(null);

  // Reset states when FEN changes (new puzzle)
  useEffect(() => {
    setSelectedSquare(null);
    setPossibleMoves([]);
    setTempMove(null);
    setDraggedPiece(null);
    setDraggedFrom(null);
    setHoveredSquare(null);
  }, [fen]);

  const game = new Chess();
  
  try {
    game.load(fen);
  } catch (err) {
    return <div style={{ color: "red", marginTop: "1rem" }}>Invalid FEN: {fen}</div>;
  }

  const pieceToFile = {
    p: "pd", P: "pl",
    r: "rd", R: "rl",
    n: "nd", N: "nl",
    b: "bd", B: "bl",
    q: "qd", Q: "ql",
    k: "kd", K: "kl",
  };

  const files = ["a", "b", "c", "d", "e", "f", "g", "h"];
  const squareSize = boardWidth / 8;

  // Handle piece selection for showing possible moves
  const handleSquareClick = useCallback((square) => {
    if (isLocked) return;

    const piece = game.get(square);
    
    // If clicking same square, deselect
    if (selectedSquare === square) {
      setSelectedSquare(null);
      setPossibleMoves([]);
      return;
    }

    // If clicking on a piece of current player, show possible moves
    if (piece && piece.color === game.turn()) {
      setSelectedSquare(square);
      try {
        const moves = game.moves({ square, verbose: true });
        setPossibleMoves(moves.map(move => move.to));
      } catch (error) {
        console.log("Error getting moves:", error);
        setPossibleMoves([]);
      }
      return;
    }

    // If a square is selected, try to make a move
    if (selectedSquare) {
      makeMove(selectedSquare, square);
    }
  }, [selectedSquare, isLocked, game, fen]);

  // Make move function (used by both click and drag)
  const makeMove = useCallback((from, to) => {
    const testGame = new Chess();
    try {
      testGame.load(fen);
    } catch (error) {
      console.log("Error loading FEN:", error);
      return;
    }
    
    try {
      const move = testGame.move({
        from: from,
        to: to,
        promotion: 'q'
      });

      if (move) {
        setTempMove({
          from: from,
          to: to,
          move: move,
          newFen: testGame.fen()
        });
        
        // Clear selection
        setSelectedSquare(null);
        setPossibleMoves([]);
        
        if (onMoveSubmit) {
          onMoveSubmit(move.san, { from: from, to: to });
        }
      }
    } catch (error) {
      console.log("Invalid move:", error.message);
      // Clear selection on invalid move
      setSelectedSquare(null);
      setPossibleMoves([]);
    }
  }, [fen, onMoveSubmit]);

  // Drag and drop handlers
  const handleDragStart = useCallback((e, square) => {
    if (isLocked) {
      e.preventDefault();
      return;
    }

    const piece = game.get(square);
    if (!piece || piece.color !== game.turn()) {
      e.preventDefault();
      return;
    }

    setDraggedPiece(piece);
    setDraggedFrom(square);

    const pieceCode = piece.color === "w" ? piece.type.toUpperCase() : piece.type.toLowerCase();
    const filename = pieceToFile[pieceCode];
    
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', square);
    
    // Try to set custom drag image
    try {
      const img = new Image();
      img.src = `/${filename}.svg`;
      e.dataTransfer.setDragImage(img, squareSize * 0.4, squareSize * 0.4);
    } catch (error) {
      // Fallback if setDragImage fails
    }
  }, [isLocked, game, squareSize, pieceToFile]);

  const handleDragOver = useCallback((e, square) => {
    e.preventDefault();
    if (!isLocked && draggedFrom) {
      setHoveredSquare(square);
      e.dataTransfer.dropEffect = 'move';
    }
  }, [isLocked, draggedFrom]);

  const handleDragLeave = useCallback(() => {
    setHoveredSquare(null);
  }, []);

  const handleDrop = useCallback((e, square) => {
    e.preventDefault();
    
    if (isLocked || !draggedFrom || draggedFrom === square) {
      setDraggedPiece(null);
      setDraggedFrom(null);
      setHoveredSquare(null);
      return;
    }

    makeMove(draggedFrom, square);

    setDraggedPiece(null);
    setDraggedFrom(null);
    setHoveredSquare(null);
  }, [isLocked, draggedFrom, makeMove]);

  const handleUndo = useCallback(() => {
    setTempMove(null);
    setSelectedSquare(null);
    setPossibleMoves([]);
    if (onUndo) {
      onUndo();
    }
  }, [onUndo]);

  const getSquareStyle = useCallback((square) => {
    const fileIndex = files.indexOf(square[0]);
    const rank = parseInt(square[1]);
    const isLight = (fileIndex + rank) % 2 === 0;
    let backgroundColor = isLight ? "#f0d9b5" : "#b58863";

    // Check if this square is part of advice move
    const isAdviceSquare = showAdvice && highlightSquares.includes(square);
    // Check if this square is part of made move
    const isMadeMove = tempMove && (tempMove.from === square || tempMove.to === square);
    
    // Check if made move matches advice move exactly
    const moveMatchesAdvice = tempMove && showAdvice && highlightSquares.length >= 2 && 
      ((tempMove.from === highlightSquares[0] && tempMove.to === highlightSquares[1]) ||
       (tempMove.from === highlightSquares[1] && tempMove.to === highlightSquares[0]));
    
    // Priority order: Selected > Possible moves > Move matches advice (green) > Made move (red) > Advice move (green) > Hover
    
    // 1. Selected square (blue)
    if (selectedSquare === square) {
      backgroundColor = "#4169E1"; // Royal blue
    }
    // 2. Possible moves (yellow)
    else if (possibleMoves.includes(square)) {
      backgroundColor = "#FFD700"; // Gold
    }
    // 3. Made move that matches advice (green) - highest priority for move squares
    else if (isMadeMove && moveMatchesAdvice) {
      backgroundColor = "#00AA00"; // Green when move matches advice exactly
    }
    // 4. Made move that doesn't match advice (red)
    else if (isMadeMove && !moveMatchesAdvice) {
      backgroundColor = tempMove.from === square ? "#FF4444" : "#FF6666"; // Red for non-matching moves
    }
    // 5. Advice move only (green)
    else if (isAdviceSquare) {
      backgroundColor = "#00AA00"; // Green for advice
    }
    // 6. Hover during drag (light green)
    else if (hoveredSquare === square && draggedFrom) {
      backgroundColor = "#90EE90";
    }

    return {
      width: squareSize,
      height: squareSize,
      backgroundColor,
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      border: "1px solid #333",
      boxSizing: "border-box",
      position: "relative",
      cursor: isLocked ? "default" : "pointer",
    };
  }, [selectedSquare, possibleMoves, tempMove, showAdvice, highlightSquares, hoveredSquare, draggedFrom, squareSize]);

  // Use temp move FEN if available, otherwise use original FEN
  const displayGame = new Chess();
  try {
    displayGame.load(tempMove ? tempMove.newFen : fen);
  } catch (err) {
    displayGame.load(fen);
  }

  const squares = [];
  for (let rank = 8; rank >= 1; rank--) {
    for (let fileIndex = 0; fileIndex < 8; fileIndex++) {
      const square = files[fileIndex] + rank;
      const piece = displayGame.get(square);

      let pieceImage = null;
      if (piece) {
        const pieceCode = piece.color === "w" ? piece.type.toUpperCase() : piece.type.toLowerCase();
        const filename = pieceToFile[pieceCode];
        pieceImage = `/${filename}.svg`;
      }

      squares.push(
        <div
          key={square}
          style={getSquareStyle(square)}
          onClick={() => handleSquareClick(square)}
          onDragOver={(e) => handleDragOver(e, square)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, square)}
        >
          {pieceImage && (
            <img 
              src={pieceImage} 
              alt={piece?.type} 
              draggable={!isLocked && piece?.color === game.turn()}
              onDragStart={(e) => handleDragStart(e, square)}
              style={{ 
                width: squareSize * 0.8, 
                height: squareSize * 0.8,
                cursor: (!isLocked && piece?.color === game.turn()) ? "grab" : "default",
                pointerEvents: piece?.color === game.turn() ? "auto" : "none",
              }} 
            />
          )}
          
          {/* Show dots for possible moves on empty squares */}
          {possibleMoves.includes(square) && !piece && (
            <div
              style={{
                width: squareSize * 0.3,
                height: squareSize * 0.3,
                backgroundColor: "rgba(0, 0, 0, 0.4)",
                borderRadius: "50%",
              }}
            />
          )}

          {/* Show rings for possible captures */}
          {possibleMoves.includes(square) && piece && (
            <div
              style={{
                position: "absolute",
                width: squareSize * 0.9,
                height: squareSize * 0.9,
                border: "3px solid rgba(0, 0, 0, 0.4)",
                borderRadius: "50%",
                pointerEvents: "none",
              }}
            />
          )}
        </div>
      );
    }
  }

  return (
    <div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(8, ${squareSize}px)`,
          gridTemplateRows: `repeat(8, ${squareSize}px)`,
          border: "2px solid #333",
          borderRadius: "8px",
          width: boardWidth,
          height: boardWidth,
          overflow: "hidden",
        }}
      >
        {squares}
      </div>
      
      <div style={{ marginTop: "15px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          {tempMove && (
            <div>
              <p style={{ color: "#ffeb3b", margin: 0 }}>
                Move made: <strong>{tempMove.move.san}</strong> ({tempMove.from} → {tempMove.to})
              </p>
              {/* Show if move matches advice */}
              {showAdvice && highlightSquares.length >= 2 && (
                ((tempMove.from === highlightSquares[0] && tempMove.to === highlightSquares[1]) ||
                 (tempMove.from === highlightSquares[1] && tempMove.to === highlightSquares[0])) ? (
                  <p style={{ color: "#00AA00", margin: 0, fontSize: "14px" }}>
                    ✅ Perfect! Your move matches the advice
                  </p>
                ) : (
                  <p style={{ color: "#FF6666", margin: 0, fontSize: "14px" }}>
                    💡 Different from advice - see green squares
                  </p>
                )
              )}
            </div>
          )}
          {selectedSquare && possibleMoves.length > 0 && (
            <p style={{ color: "#FFD700", margin: 0, fontSize: "14px" }}>
              Selected: {selectedSquare} ({possibleMoves.length} possible moves)
            </p>
          )}
        </div>
        
        {tempMove && (
          <button
            onClick={handleUndo}
            style={{
              backgroundColor: "#ff6b6b",
              color: "white",
              border: "none",
              padding: "8px 16px",
              borderRadius: "6px",
              cursor: "pointer",
              fontWeight: "bold",
              fontSize: "14px"
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = "#ff5252"}
            onMouseOut={(e) => e.target.style.backgroundColor = "#ff6b6b"}
          >
            ↶ Undo
          </button>
        )}
      </div>

      {/* Color legend */}
      <div style={{ 
        marginTop: "10px", 
        display: "flex", 
        gap: "15px", 
        fontSize: "12px", 
        flexWrap: "wrap" 
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
          <div style={{ width: "12px", height: "12px", backgroundColor: "#4169E1", borderRadius: "2px" }}></div>
          <span style={{ color: "#fff" }}>Selected</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
          <div style={{ width: "12px", height: "12px", backgroundColor: "#FFD700", borderRadius: "2px" }}></div>
          <span style={{ color: "#fff" }}>Possible moves</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
          <div style={{ width: "12px", height: "12px", backgroundColor: "#FF4444", borderRadius: "2px" }}></div>
          <span style={{ color: "#fff" }}>Your move</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
          <div style={{ width: "12px", height: "12px", backgroundColor: "#00AA00", borderRadius: "2px" }}></div>
          <span style={{ color: "#fff" }}>Advice/Perfect match</span>
        </div>
      </div>
    </div>
  );
}