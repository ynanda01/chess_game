import React from "react";
import { render, screen } from "@testing-library/react";
import Newboard from "./Newboard";


const startingFEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

describe("Newboard component", () => {
  it("renders chess board with correct squares", () => {
    render(<Newboard fen={startingFEN} />);
  
    expect(screen.getByText("a")).toBeInTheDocument();
    expect(screen.getByText("h")).toBeInTheDocument();
   
    expect(screen.getByText("8")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("shows error for invalid FEN", () => {
    render(<Newboard fen="invalid-fen" />);
    expect(screen.getByText(/Invalid FEN/i)).toBeInTheDocument();
  });
});
