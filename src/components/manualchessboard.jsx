"use client";
import React from "react";
import { Chess } from "chess.js";

export default function Manualchessboard({ fen }) {
  const game = new Chess();
  
  try {
    game.load(fen);
  } catch (err) {
    return <div style={{ color: "red", marginTop: "1rem" }}>Invalid FEN!</div>;
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
  const ranks = [8, 7, 6, 5, 4, 3, 2, 1];
  const squares = [];

  for (let rank = 8; rank >= 1; rank--) {
    for (let fileIndex = 0; fileIndex < 8; fileIndex++) {
      const square = files[fileIndex] + rank;
      const piece = game.get(square);
      const isLight = (fileIndex + rank) % 2 === 0;
      const bg = isLight ? "#f0d9b5" : "#b58863";

      let pieceImage = null;
      if (piece) {
        const pieceCode = piece.color === "w" ? piece.type.toUpperCase() : piece.type.toLowerCase();
        const filename = pieceToFile[pieceCode];
        pieceImage = `/${filename}.svg`;
      }

      squares.push(
        <div
          key={square}
          style={{
            width: 50,
            height: 50,
            backgroundColor: bg,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            position: "relative",
          }}
        >
          {pieceImage && (
            <img src={pieceImage} alt={piece?.type} style={{ width: 35, height: 35 }} />
          )}
        </div>
      );
    }
  }

  return (
    <div style={{ display: "flex", alignItems: "flex-start", marginTop: "1rem" }}>
      {/* Left side rank numbers */}
      <div style={{ display: "flex", flexDirection: "column", marginRight: "4px" }}>
        {ranks.map(rank => (
          <div
            key={`rank-${rank}`}
            style={{
              height: "50px",
              width: "20px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "14px",
              fontWeight: "bold",
              color: "#333",
            }}
          >
            {rank}
          </div>
        ))}
      </div>

      {/* Main board container */}
      <div>
        {/* Chess board */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(8, 50px)",
            gridTemplateRows: "repeat(8, 50px)",
            border: "2px solid #333",
            borderRadius: "8px",
          }}
        >
          {squares}
        </div>

        {/* Bottom letters */}
        <div style={{ display: "flex", marginTop: "4px" }}>
          {files.map(file => (
            <div
              key={`bottom-${file}`}
              style={{
                width: "50px",
                height: "20px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "14px",
                fontWeight: "bold",
                color: "#333",
              }}
            >
              {file}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}