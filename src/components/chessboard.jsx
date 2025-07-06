'use client';

import { useState } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';

export default function ChessboardComponent({ boardWidth = 420 }) {
  const [game, setGame] = useState(new Chess());

  const onDrop = (sourceSquare, targetSquare) => {
    const move = game.move({
      from: sourceSquare,
      to: targetSquare,
      promotion: 'q',
    });

    if (move === null) return false;

    setGame(new Chess(game.fen()));
    return true;
  };

  return (
    <div
      style={{
        
        width: boardWidth,
        height: boardWidth,
        
      }}
    >
      <Chessboard
        position={game.fen()}
        onPieceDrop={onDrop}
        boardWidth={boardWidth}
        boardStyle={{
          borderRadius: '8px',
        }}
      />
    </div>
  );
}
