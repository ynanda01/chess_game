/* component Newboard.jsx - Complete path visualization with dark theme */
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
  onUndo,
  currentPuzzle = null
}) {
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [possibleMoves, setPossibleMoves] = useState([]);
  const [draggedFrom, setDraggedFrom] = useState(null);
  const [hoveredSquare, setHoveredSquare] = useState(null);
  const [tempMove, setTempMove] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedPiece, setDraggedPiece] = useState(null);
  const gameRef = useRef(null);

  // Reset states when FEN changes (new puzzle)
  useEffect(() => {
    setSelectedSquare(null);
    setPossibleMoves([]);
    setTempMove(null);
    setDraggedFrom(null);
    setHoveredSquare(null);
    setIsDragging(false);
    setDraggedPiece(null);
  }, [fen]);

  // Initialize game instance
  useEffect(() => {
    const game = new Chess();
    try {
      game.load(fen);
      gameRef.current = game;
    } catch (err) {
      console.error("Invalid FEN:", fen, err);
      gameRef.current = null;
    }
  }, [fen]);

  const pieceToFile = {
    p: "pd", P: "pl",
    r: "rd", R: "rl",
    n: "nd", N: "nl",
    b: "bd", B: "bl",
    q: "qd", Q: "ql",
    k: "kd", K: "kl",
  };

  const files = ["a", "b", "c", "d", "e", "f", "g", "h"];
  const ranks = ["8", "7", "6", "5", "4", "3", "2", "1"];
  const squareSize = boardWidth / 8;
  const coordinateSize = 20;

  // Convert square notation to coordinates
  const squareToCoords = useCallback((square) => {
    const file = files.indexOf(square[0]);
    const rank = ranks.indexOf(square[1]);
    return { file, rank };
  }, []);

  // Calculate movement path for different pieces
  const calculateMovementPath = useCallback((from, to, pieceType) => {
    const fromCoords = squareToCoords(from);
    const toCoords = squareToCoords(to);
    const path = [];

    switch (pieceType?.toLowerCase()) {
      case 'n': // Knight - L-shaped path
        const fileDiff = toCoords.file - fromCoords.file;
        const rankDiff = toCoords.rank - fromCoords.rank;
        
        path.push(from);
        
        if (Math.abs(fileDiff) === 2 && Math.abs(rankDiff) === 1) {
          const intermediateFile = fromCoords.file + (fileDiff > 0 ? 2 : -2);
          if (intermediateFile >= 0 && intermediateFile < 8) {
            const intermediate1 = files[fromCoords.file + (fileDiff > 0 ? 1 : -1)] + ranks[fromCoords.rank];
            const intermediate2 = files[intermediateFile] + ranks[fromCoords.rank];
            path.push(intermediate1);
            path.push(intermediate2);
          }
        } else if (Math.abs(fileDiff) === 1 && Math.abs(rankDiff) === 2) {
          const intermediateRank = fromCoords.rank + (rankDiff > 0 ? 2 : -2);
          if (intermediateRank >= 0 && intermediateRank < 8) {
            const intermediate1 = files[fromCoords.file] + ranks[fromCoords.rank + (rankDiff > 0 ? 1 : -1)];
            const intermediate2 = files[fromCoords.file] + ranks[intermediateRank];
            path.push(intermediate1);
            path.push(intermediate2);
          }
        }
        
        path.push(to);
        break;

      case 'r': // Rook - straight line
        path.push(from);
        if (fromCoords.file === toCoords.file) {
          const startRank = Math.min(fromCoords.rank, toCoords.rank);
          const endRank = Math.max(fromCoords.rank, toCoords.rank);
          for (let r = startRank + 1; r < endRank; r++) {
            path.push(files[fromCoords.file] + ranks[r]);
          }
        } else if (fromCoords.rank === toCoords.rank) {
          const startFile = Math.min(fromCoords.file, toCoords.file);
          const endFile = Math.max(fromCoords.file, toCoords.file);
          for (let f = startFile + 1; f < endFile; f++) {
            path.push(files[f] + ranks[fromCoords.rank]);
          }
        }
        path.push(to);
        break;

      case 'b': // Bishop - diagonal line
        path.push(from);
        const fileStep = toCoords.file > fromCoords.file ? 1 : -1;
        const rankStep = toCoords.rank > fromCoords.rank ? 1 : -1;
        let currentFile = fromCoords.file + fileStep;
        let currentRank = fromCoords.rank + rankStep;
        
        while (currentFile !== toCoords.file && currentRank !== toCoords.rank) {
          path.push(files[currentFile] + ranks[currentRank]);
          currentFile += fileStep;
          currentRank += rankStep;
        }
        path.push(to);
        break;

      case 'q': // Queen - can move like rook or bishop
        if (fromCoords.file === toCoords.file || fromCoords.rank === toCoords.rank) {
          return calculateMovementPath(from, to, 'r');
        } else if (Math.abs(fromCoords.file - toCoords.file) === Math.abs(fromCoords.rank - toCoords.rank)) {
          return calculateMovementPath(from, to, 'b');
        } else {
          path.push(from, to);
        }
        break;

      case 'k': // King - one square
      case 'p': // Pawn - forward or diagonal
        path.push(from);
        if (pieceType?.toLowerCase() === 'p' && fromCoords.file === toCoords.file) {
          const startRank = Math.min(fromCoords.rank, toCoords.rank);
          const endRank = Math.max(fromCoords.rank, toCoords.rank);
          for (let r = startRank + 1; r < endRank; r++) {
            path.push(files[fromCoords.file] + ranks[r]);
          }
        }
        path.push(to);
        break;

      default:
        path.push(from, to);
    }

    return [...new Set(path)];
  }, [squareToCoords]);

  // Parse advice move from different formats
  const parseAdviceMove = useCallback(() => {
    if (!showAdvice) return null;
    
    if (highlightSquares && highlightSquares.length > 0) {
      if (highlightSquares.length === 2) {
        return { from: highlightSquares[0], to: highlightSquares[1] };
      }
      
      if (highlightSquares.length === 1) {
        const move = highlightSquares[0];
        if (move && move.length === 4 && /^[a-h][1-8][a-h][1-8]$/.test(move)) {
          return { from: move.slice(0, 2), to: move.slice(2, 4) };
        }
        
        if (move && move.length === 2 && /^[a-h][1-8]$/.test(move)) {
          return { from: null, to: move };
        }
      }
    }
    
    if (!currentPuzzle?.advice?.text) return null;
    
    const adviceText = currentPuzzle.advice.text;
    
    // Handle different formats
    if (/^[KQRBN]?[a-h]?[1-8]?x?[a-h][1-8](\+|#)?$/.test(adviceText)) {
      const match = adviceText.match(/[a-h][1-8]/);
      if (match) return { from: null, to: match[0] };
    }
    
    if (adviceText.length === 4 && /^[a-h][1-8][a-h][1-8]$/.test(adviceText)) {
      return { from: adviceText.slice(0, 2), to: adviceText.slice(2, 4) };
    }
    
    const arrowMatch = adviceText.match(/([a-h][1-8])\s*(?:→|->|\s+to\s+)\s*([a-h][1-8])/i);
    if (arrowMatch) {
      return { from: arrowMatch[1], to: arrowMatch[2] };
    }
    
    const squares = adviceText.match(/[a-h][1-8]/g);
    if (squares) {
      if (squares.length >= 2) {
        return { from: squares[0], to: squares[1] };
      } else if (squares.length === 1) {
        return { from: null, to: squares[0] };
      }
    }
    
    return null;
  }, [showAdvice, highlightSquares, currentPuzzle]);

  // Get movement paths for visualization
  const getMovementPaths = useCallback(() => {
    const paths = { 
      userMove: [], 
      adviceMove: [], 
      possibleMovePaths: []
    };
    
    // User's move path
    if (tempMove && tempMove.from && tempMove.to) {
      const game = new Chess();
      try {
        game.load(fen);
        const piece = game.get(tempMove.from);
        paths.userMove = calculateMovementPath(tempMove.from, tempMove.to, piece?.type);
      } catch (error) {
        paths.userMove = [tempMove.from, tempMove.to];
      }
    }
    
    // Advice move path
    const adviceMove = parseAdviceMove();
    if (showAdvice && adviceMove && adviceMove.from && adviceMove.to) {
      const game = new Chess();
      try {
        game.load(fen);
        const piece = game.get(adviceMove.from);
        paths.adviceMove = calculateMovementPath(adviceMove.from, adviceMove.to, piece?.type);
      } catch (error) {
        paths.adviceMove = [adviceMove.from, adviceMove.to];
      }
    }
    
    // Possible move paths when a piece is selected
    if (selectedSquare && possibleMoves.length > 0) {
      const game = new Chess();
      try {
        game.load(fen);
        const piece = game.get(selectedSquare);
        
        paths.possibleMovePaths = possibleMoves.map(targetSquare => {
          const path = calculateMovementPath(selectedSquare, targetSquare, piece?.type);
          return { target: targetSquare, path: path };
        });
      } catch (error) {
        console.log('Error calculating possible move paths:', error);
      }
    }
    
    return paths;
  }, [tempMove, showAdvice, parseAdviceMove, fen, calculateMovementPath, selectedSquare, possibleMoves]);

  // Handle piece selection for showing possible moves
  const handleSquareClick = useCallback((square) => {
    if (isLocked || isDragging) return;
    
    const game = gameRef.current;
    if (!game) return;

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
        setPossibleMoves([]);
      }
      return;
    }

    if (selectedSquare && possibleMoves.includes(square)) {
      makeMove(selectedSquare, square);
    } else {
      setSelectedSquare(null);
      setPossibleMoves([]);
    }
  }, [selectedSquare, possibleMoves, isLocked, isDragging]);

  // Make move function
  const makeMove = useCallback((from, to) => {
    if (!gameRef.current) return false;
    
    const testGame = new Chess();
    try {
      testGame.load(fen);
    } catch (error) {
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
          onMoveSubmit(`${from}${to}`, { from, to });
        }
        return true;
      }
    } catch (error) {
      setSelectedSquare(null);
      setPossibleMoves([]);
    }
    return false;
  }, [fen, onMoveSubmit]);

  // DRAG HANDLERS
  const handleMouseDown = useCallback((e, square) => {
    if (isLocked || e.button !== 0) return;
    
    const game = gameRef.current;
    if (!game) return;

    const piece = game.get(square);
    if (!piece || piece.color !== game.turn()) return;

    e.preventDefault();
    
    setIsDragging(true);
    setDraggedFrom(square);
    setDraggedPiece(piece);
    setSelectedSquare(null);
    setPossibleMoves([]);

    const handleMouseMove = (moveEvent) => {
      const boardRect = e.target.closest('[data-chess-board]').getBoundingClientRect();
      const x = moveEvent.clientX - boardRect.left - coordinateSize;
      const y = moveEvent.clientY - boardRect.top - coordinateSize;
      
      if (x >= 0 && x <= boardWidth && y >= 0 && y <= boardWidth) {
        const fileIndex = Math.floor(x / squareSize);
        const rankIndex = Math.floor(y / squareSize);
        
        if (fileIndex >= 0 && fileIndex < 8 && rankIndex >= 0 && rankIndex < 8) {
          const hoveredSquare = files[fileIndex] + ranks[rankIndex];
          setHoveredSquare(hoveredSquare);
        }
      } else {
        setHoveredSquare(null);
      }
    };

    const handleMouseUp = (upEvent) => {
      const boardRect = e.target.closest('[data-chess-board]').getBoundingClientRect();
      const x = upEvent.clientX - boardRect.left - coordinateSize;
      const y = upEvent.clientY - boardRect.top - coordinateSize;
      
      let dropSquare = null;
      if (x >= 0 && x <= boardWidth && y >= 0 && y <= boardWidth) {
        const fileIndex = Math.floor(x / squareSize);
        const rankIndex = Math.floor(y / squareSize);
        
        if (fileIndex >= 0 && fileIndex < 8 && rankIndex >= 0 && rankIndex < 8) {
          dropSquare = files[fileIndex] + ranks[rankIndex];
        }
      }
      
      setIsDragging(false);
      setDraggedFrom(null);
      setDraggedPiece(null);
      setHoveredSquare(null);
      
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      
      if (dropSquare && dropSquare !== square) {
        makeMove(square, dropSquare);
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [isLocked, makeMove, squareSize, boardWidth, coordinateSize]);

  const handleUndo = useCallback(() => {
    setTempMove(null);
    setSelectedSquare(null);
    setPossibleMoves([]);
    setDraggedFrom(null);
    setHoveredSquare(null);
    setIsDragging(false);
    setDraggedPiece(null);
    if (onUndo) {
      onUndo();
    }
  }, [onUndo]);

  // Square styling with path visualization
  const getSquareStyle = useCallback((square) => {
    const fileIndex = files.indexOf(square[0]);
    const rank = parseInt(square[1]);
    const isLight = (fileIndex + rank) % 2 === 0;
    let backgroundColor = isLight ? "#f0d9b5" : "#b58863"; // Original board colors
    let border = "1px solid #333"; // Default border

    const paths = getMovementPaths();
    const adviceMove = parseAdviceMove();
    
    const isUserPathSquare = paths.userMove.includes(square);
    const isAdvicePathSquare = paths.adviceMove.includes(square);
    
    // Check if square is part of any possible move path
    const possibleMovePathInfo = paths.possibleMovePaths.find(pathInfo => 
      pathInfo.path.includes(square)
    );
    const isPossibleMovePathSquare = !!possibleMovePathInfo;
    const isPossibleMoveTarget = possibleMoves.includes(square);
    
    const isUserFromSquare = tempMove && tempMove.from === square;
    const isUserToSquare = tempMove && tempMove.to === square;
    const isAdviceFromSquare = adviceMove && adviceMove.from === square;
    const isAdviceToSquare = adviceMove && adviceMove.to === square;
    
    const moveMatchesAdvice = tempMove && adviceMove && 
      tempMove.from === adviceMove.from && tempMove.to === adviceMove.to;
    
    // Priority order for square coloring - final version with green advice
    if (selectedSquare === square) {
      backgroundColor = "#4169E1"; // Blue for selected piece
    }
    else if (isPossibleMoveTarget) {
      backgroundColor = "#FFD700"; // Gold for possible move targets
    }
    else if (isPossibleMovePathSquare && selectedSquare) {
      backgroundColor = "#FFD700"; // Yellow for all possible move paths
    }
    else if (hoveredSquare === square && isDragging) {
      backgroundColor = "#90EE90"; // Light green for drag hover
    }
    else if (showAdvice) {
      if (isUserPathSquare && isAdvicePathSquare && moveMatchesAdvice) {
        if (isUserFromSquare || isAdviceFromSquare) {
          backgroundColor = "#228B22"; // Dark green for matching from squares (highlighted)
          border = "3px solid white"; // White border for from squares
        } else {
          backgroundColor = "#32CD32"; // Green for matching path
        }
      }
      else if (isUserPathSquare) {
        if (isUserFromSquare) {
          backgroundColor = "#B22222"; // Dark red for user's from square (highlighted)
          border = "3px solid white"; // White border for from squares
        } else {
          backgroundColor = "#FF6347"; // Red for user's path
        }
      }
      else if (isAdvicePathSquare) {
        if (isAdviceFromSquare) {
          backgroundColor = "#228B22"; // Dark green for advice from square (highlighted)
          border = "3px solid white"; // White border for from squares
        } else {
          backgroundColor = "#32CD32"; // Green for advice path
        }
      }
    }
    else if (isUserPathSquare) {
      if (isUserFromSquare) {
        backgroundColor = "#B22222"; // Dark red for user's from square (highlighted)
        border = "3px solid white"; // White border for from squares
      } else {
        backgroundColor = "#FF6347"; // Red for user's path
      }
    }

    const style = {
      width: squareSize,
      height: squareSize,
      backgroundColor,
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      border: border,
      boxSizing: "border-box",
      position: "relative",
      cursor: isLocked ? "default" : "pointer",
    };

    return style;
  }, [selectedSquare, possibleMoves, tempMove, showAdvice, hoveredSquare, isDragging, squareSize, getMovementPaths, parseAdviceMove]);

  // Error display for invalid FEN
  if (!gameRef.current) {
    return <div style={{ color: "red", marginTop: "1rem" }}>Invalid FEN: {fen}</div>;
  }

  // Use temp move FEN if available, otherwise use original
  const displayGame = new Chess();
  try {
    displayGame.load(tempMove ? tempMove.newFen : fen);
  } catch (err) {
    displayGame.load(fen);
  }

  const squares = [];
  for (let rankIndex = 0; rankIndex < 8; rankIndex++) {
    for (let fileIndex = 0; fileIndex < 8; fileIndex++) {
      const square = files[fileIndex] + ranks[rankIndex];
      const piece = displayGame.get(square);

      let pieceImage = null;
      if (piece) {
        const pieceCode = piece.color === "w" ? piece.type.toUpperCase() : piece.type.toLowerCase();
        const filename = pieceToFile[pieceCode];
        pieceImage = `/${filename}.svg`;
      }

      const isDraggedPiece = draggedFrom === square && isDragging;
      const isPieceMoveable = piece && piece.color === gameRef.current?.turn() && !isLocked;

      squares.push(
        <div
          key={square}
          data-square={square}
          style={getSquareStyle(square)}
          onClick={() => handleSquareClick(square)}
        >
          {pieceImage && (
            <img 
              src={pieceImage} 
              alt={piece?.type} 
              onMouseDown={isPieceMoveable ? (e) => handleMouseDown(e, square) : undefined}
              style={{ 
                width: squareSize * 0.8, 
                height: squareSize * 0.8,
                cursor: isPieceMoveable ? "grab" : "default",
                userSelect: "none",
                pointerEvents: isPieceMoveable ? "auto" : "none",
                opacity: isDraggedPiece ? 0.3 : 1,
                transition: "opacity 0.2s ease"
              }} 
            />
          )}
          
          {/* Dots for empty squares that are possible moves */}
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

          {/* Circles for pieces that can be captured */}
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
  const paths = getMovementPaths();

  return (
    <div>
      <div
        data-chess-board
        style={{
          position: "relative",
          width: boardWidth + coordinateSize * 1,
          height: boardWidth + coordinateSize * 1,
          backgroundColor: "transparent",
          color: "#fff", // White text for coordinates
          borderRadius: "8px",
          padding: coordinateSize,
          paddingBottom: coordinateSize,
        }}
      >
        {/* File labels (a-h) at bottom */}
        <div style={{
          position: "absolute",
          bottom: -coordinateSize,
          left: coordinateSize,
          right: coordinateSize,
          height: coordinateSize,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-around",
        }}>
          {files.map(file => (
            <div key={file} style={{
              color: "#E0E0E0",
              fontSize: "14px",
              fontWeight: "bold",
              width: squareSize,
              textAlign: "center",
            }}>
              {file}
            </div>
          ))}
        </div>

        {/* Rank labels (8-1) on left side */}
        <div style={{
          position: "absolute",
          left: 0,
          top: coordinateSize,
          bottom: coordinateSize,
          width: coordinateSize,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "space-around",
        }}>
          {ranks.map(rank => (
            <div key={rank} style={{
              color: "#E0E0E0",
              fontSize: "14px",
              fontWeight: "bold",
              height: squareSize,
              display: "flex",
              alignItems: "center",
            }}>
              {rank}
            </div>
          ))}
        </div>

        {/* Chess board */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(8, ${squareSize}px)`,
            gridTemplateRows: `repeat(8, ${squareSize}px)`,
            border: "2px solid #333",
            borderRadius: "4px",
            width: boardWidth,
            height: boardWidth,
            overflow: "hidden",
            position: "relative",
          }}
        >
          {squares}
        </div>

        {/* Dragged piece overlay */}
        {isDragging && draggedPiece && (
          <div
            style={{
              position: "fixed",
              pointerEvents: "none",
              zIndex: 1000,
              width: squareSize * 0.8,
              height: squareSize * 0.8,
              transform: "translate(-50%, -50%)",
              left: "var(--mouse-x, 0)",
              top: "var(--mouse-y, 0)",
            }}
            ref={(el) => {
              if (el) {
                const updatePosition = (e) => {
                  el.style.setProperty('--mouse-x', e.clientX + 'px');
                  el.style.setProperty('--mouse-y', e.clientY + 'px');
                };
                document.addEventListener('mousemove', updatePosition);
                return () => document.removeEventListener('mousemove', updatePosition);
              }
            }}
          >
            <img 
              src={`/${pieceToFile[draggedPiece.color === "w" ? draggedPiece.type.toUpperCase() : draggedPiece.type.toLowerCase()]}.svg`}
              alt={draggedPiece.type}
              style={{ width: "100%", height: "100%", opacity: 0.8 }} 
            />
          </div>
        )}
      </div>
      
      <div style={{ marginTop: "15px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          {tempMove && (
            <div>
              <p style={{ color: "#E6C567", margin: 0, paddingTop: "19px" }}>
                Move: <strong>{tempMove.move.san}</strong>
              </p>
              {showAdvice && adviceMove && (
                (tempMove.from === adviceMove.from && tempMove.to === adviceMove.to) ? (
                  <p style={{ color: "#4CAF50", margin: 0, fontSize: "14px" }}>
                    Perfect match!
                  </p>
                ) : (
                  <p style={{ color: "#F44336", margin: 0, fontSize: "14px" }}>
                    Check the advice path
                  </p>
                )
              )}
            </div>
          )}
          {showAdvice && adviceMove && (
            <p style={{ color: "#4CAF50", margin: 0, fontSize: "14px" }}>
              Advice: {adviceMove.from ? `${adviceMove.from} → ${adviceMove.to}` : `Target: ${adviceMove.to}`}
            </p>
          )}
        </div>
        
        {tempMove && (
          <button
            onClick={handleUndo}
            style={{
              backgroundColor: "#D32F2F",
              color: "white",
              border: "none",
              padding: "8px 16px",
              borderRadius: "6px",
              cursor: "pointer",
              fontWeight: "bold",
              fontSize: "14px"
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = "#C62828"}
            onMouseOut={(e) => e.target.style.backgroundColor = "#D32F2F"}
          >
            ↶ Undo
          </button>
        )}
      </div>

      {/* Final legend with green advice */}
      <div style={{ 
        marginTop: "10px", 
        display: "flex", 
        gap: "15px", 
        fontSize: "12px", 
        flexWrap: "wrap" 
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
          <div style={{ width: "12px", height: "12px", backgroundColor: "#4169E1", borderRadius: "2px" }}></div>
          <span style={{ color: "#fff" }}>Selected piece</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
          <div style={{ width: "12px", height: "12px", backgroundColor: "#FFD700", borderRadius: "2px" }}></div>
          <span style={{ color: "#fff" }}>Possible paths</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
          <div style={{ width: "12px", height: "12px", backgroundColor: "#32CD32", borderRadius: "2px" }}></div>
          <span style={{ color: "#fff" }}>Advice path</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
          <div style={{ width: "12px", height: "12px", backgroundColor: "#FF6347", borderRadius: "2px" }}></div>
          <span style={{ color: "#fff" }}>Your move path</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
          <div style={{ width: "12px", height: "12px", backgroundColor: "#B22222", border: "2px solid white", borderRadius: "2px" }}></div>
          <span style={{ color: "#fff" }}>From squares (with white border)</span>
        </div>
      </div>
    </div>
  );
}