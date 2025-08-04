"use client";
import React, { useState, useCallback, useEffect, useRef } from "react";
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
  const [draggedFrom, setDraggedFrom] = useState(null);
  const [hoveredSquare, setHoveredSquare] = useState(null);
  const [tempMove, setTempMove] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const draggedPieceRef = useRef(null);

  // Reset states when FEN changes (new puzzle)
  useEffect(() => {
    setSelectedSquare(null);
    setPossibleMoves([]);
    setTempMove(null);
    setDraggedFrom(null);
    setHoveredSquare(null);
    setIsDragging(false);
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

  // Parse advice move from different formats
  const parseAdviceMove = useCallback(() => {
    if (!showAdvice || !highlightSquares.length) return null;
    
    if (highlightSquares.length === 2) {
      return {
        from: highlightSquares[0],
        to: highlightSquares[1]
      };
    }
    
    if (highlightSquares.length === 1) {
      const move = highlightSquares[0];
      if (move.length === 4 && /^[a-h][1-8][a-h][1-8]$/.test(move)) {
        return {
          from: move.slice(0, 2),
          to: move.slice(2, 4)
        };
      }
    }
    
    return null;
  }, [showAdvice, highlightSquares]);

  // Handle piece selection for showing possible moves
  const handleSquareClick = useCallback((square) => {
    if (isLocked || isDragging) return;

    const piece = game.get(square);
    
    if (selectedSquare === square) {
      setSelectedSquare(null);
      setPossibleMoves([]);
      return;
    }

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

    if (selectedSquare) {
      makeMove(selectedSquare, square);
    }
  }, [selectedSquare, isLocked, isDragging, game]);

  // Make move function
  const makeMove = useCallback((from, to) => {
    const testGame = new Chess();
    try {
      testGame.load(fen);
    } catch (error) {
      console.log("Error loading FEN:", error);
      return false;
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
        
        setSelectedSquare(null);
        setPossibleMoves([]);
        
        if (onMoveSubmit) {
          onMoveSubmit(move.san, { from: from, to: to });
        }
        return true;
      }
    } catch (error) {
      console.log("Invalid move:", error.message);
      setSelectedSquare(null);
      setPossibleMoves([]);
    }
    return false;
  }, [fen, onMoveSubmit]);

  // Drag handlers - COMPLETELY REWRITTEN
  const handleMouseDown = useCallback((e, square) => {
    if (isLocked) return;
    
    const piece = game.get(square);
    if (!piece || piece.color !== game.turn()) return;

    e.preventDefault();
    setIsDragging(true);
    setDraggedFrom(square);
    draggedPieceRef.current = piece;

    console.log('Mouse down on:', square, 'piece:', piece);

    const handleMouseMove = (moveEvent) => {
      // Visual feedback during drag could be added here
    };

    const handleMouseUp = (upEvent) => {
      console.log('Mouse up');
      
      // Find the element under the mouse
      const elementBelow = document.elementFromPoint(upEvent.clientX, upEvent.clientY);
      let targetSquare = null;

      // Look for the square div or its parent
      let current = elementBelow;
      while (current && !targetSquare) {
        if (current.dataset && current.dataset.square) {
          targetSquare = current.dataset.square;
          break;
        }
        current = current.parentElement;
      }

      console.log('Target square:', targetSquare);

      if (targetSquare && targetSquare !== square) {
        console.log('Attempting move:', square, '->', targetSquare);
        makeMove(square, targetSquare);
      }

      // Cleanup
      setIsDragging(false);
      setDraggedFrom(null);
      setHoveredSquare(null);
      draggedPieceRef.current = null;
      
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [isLocked, game, makeMove]);

  // Also keep the HTML5 drag API as backup
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

    console.log('HTML5 Drag start from:', square);
    setIsDragging(true);
    setDraggedFrom(square);
    e.dataTransfer.setData('text/plain', square);
  }, [isLocked, game]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
  }, []);

  const handleDragEnter = useCallback((e, square) => {
    e.preventDefault();
    if (draggedFrom && draggedFrom !== square) {
      setHoveredSquare(square);
    }
  }, [draggedFrom]);

  const handleDrop = useCallback((e, square) => {
    e.preventDefault();
    const fromSquare = e.dataTransfer.getData('text/plain');
    
    console.log('HTML5 Drop:', fromSquare, '->', square);
    
    if (fromSquare && fromSquare !== square) {
      makeMove(fromSquare, square);
    }

    setIsDragging(false);
    setDraggedFrom(null);
    setHoveredSquare(null);
  }, [makeMove]);

  const handleUndo = useCallback(() => {
    setTempMove(null);
    setSelectedSquare(null);
    setPossibleMoves([]);
    setDraggedFrom(null);
    setHoveredSquare(null);
    setIsDragging(false);
    if (onUndo) {
      onUndo();
    }
  }, [onUndo]);

  const getSquareStyle = useCallback((square) => {
    const fileIndex = files.indexOf(square[0]);
    const rank = parseInt(square[1]);
    const isLight = (fileIndex + rank) % 2 === 0;
    let backgroundColor = isLight ? "#f0d9b5" : "#b58863";

    const adviceMove = parseAdviceMove();
    const isAdviceSquare = adviceMove && (adviceMove.from === square || adviceMove.to === square);
    const isMadeMove = tempMove && (tempMove.from === square || tempMove.to === square);
    const moveMatchesAdvice = tempMove && adviceMove && 
      tempMove.from === adviceMove.from && tempMove.to === adviceMove.to;
    
    if (selectedSquare === square) {
      backgroundColor = "#4169E1";
    }
    else if (possibleMoves.includes(square)) {
      backgroundColor = "#FFD700";
    }
    else if (hoveredSquare === square && isDragging) {
      backgroundColor = "#90EE90";
    }
    else if (isMadeMove && moveMatchesAdvice) {
      backgroundColor = "#228B22";
    }
    else if (isMadeMove && !moveMatchesAdvice) {
      backgroundColor = tempMove.from === square ? "#DC143C" : "#FF6B6B";
    }
    else if (isAdviceSquare && !isMadeMove) {
      backgroundColor = isLight ? "#f0d9b5" : "#b58863";
    }

    const style = {
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

    if (isAdviceSquare && !isMadeMove) {
      style.border = "3px solid #00FF00";
      style.boxShadow = "inset 0 0 0 2px #00FF00";
    }

    return style;
  }, [selectedSquare, possibleMoves, tempMove, showAdvice, hoveredSquare, isDragging, squareSize, parseAdviceMove]);

  // Use temp move FEN if available
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
          data-square={square}
          style={getSquareStyle(square)}
          onClick={() => handleSquareClick(square)}
          onDragOver={handleDragOver}
          onDragEnter={(e) => handleDragEnter(e, square)}
          onDrop={(e) => handleDrop(e, square)}
        >
          {pieceImage && (
            <img 
              src={pieceImage} 
              alt={piece?.type} 
              draggable={!isLocked && piece?.color === game.turn()}
              onDragStart={(e) => handleDragStart(e, square)}
              onMouseDown={(e) => handleMouseDown(e, square)}
              style={{ 
                width: squareSize * 0.8, 
                height: squareSize * 0.8,
                cursor: (!isLocked && piece?.color === game.turn()) ? "grab" : "default",
                userSelect: "none",
                pointerEvents: "auto",
                opacity: (draggedFrom === square && isDragging) ? 0.5 : 1,
              }} 
            />
          )}
          
          {possibleMoves.includes(square) && !piece && (
            <div
              style={{
                width: squareSize * 0.3,
                height: squareSize * 0.3,
                backgroundColor: "rgba(0, 0, 0, 0.4)",
                borderRadius: "50%",
                pointerEvents: "none",
              }}
            />
          )}

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

  const adviceMove = parseAdviceMove();

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
              {showAdvice && adviceMove && (
                (tempMove.from === adviceMove.from && tempMove.to === adviceMove.to) ? (
                  <p style={{ color: "#00FF00", margin: 0, fontSize: "14px" }}>
                    ✅ Perfect! Your move matches the advice
                  </p>
                ) : (
                  <p style={{ color: "#FF6666", margin: 0, fontSize: "14px" }}>
                    💡 Different from advice - see highlighted squares
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
          {showAdvice && adviceMove && (
            <p style={{ color: "#00FF00", margin: 0, fontSize: "14px" }}>
              💡 Advice: {adviceMove.from} → {adviceMove.to}
            </p>
          )}
          {isDragging && draggedFrom && (
            <p style={{ color: "#87CEEB", margin: 0, fontSize: "14px" }}>
              Dragging piece from {draggedFrom}...
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
          <div style={{ width: "12px", height: "12px", backgroundColor: "#90EE90", borderRadius: "2px" }}></div>
          <span style={{ color: "#fff" }}>Drag hover</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
          <div style={{ width: "12px", height: "12px", backgroundColor: "#DC143C", borderRadius: "2px" }}></div>
          <span style={{ color: "#fff" }}>Your move</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
          <div style={{ width: "12px", height: "12px", backgroundColor: "#228B22", borderRadius: "2px" }}></div>
          <span style={{ color: "#fff" }}>Perfect match</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
          <div style={{ width: "12px", height: "12px", backgroundColor: "#f0d9b5", border: "2px solid #00FF00", borderRadius: "2px" }}></div>
          <span style={{ color: "#fff" }}>Advice</span>
        </div>
      </div>
    </div>
  );
}