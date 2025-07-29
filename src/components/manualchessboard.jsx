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
            width: 60,
            height: 60,
            backgroundColor: bg,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          {pieceImage && (
            <img src={pieceImage} alt={piece?.type} style={{ width: 40, height: 40 }} />
          )}
        </div>
      );
    }
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(8, 50px)",
        gridTemplateRows: "repeat(8, 50px)",
        marginTop: "1rem",
        border: "1px solid #000",
        borderRadius: "8px",
        width: "400px",
        height: "400px",
        overflow: "hidden",
      }}
    >
      {squares}
    </div>
  );
}
