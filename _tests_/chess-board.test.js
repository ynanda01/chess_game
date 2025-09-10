import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react";
import Newboard from "../src/components/Newboard.jsx";

describe("Simple Chess Board Tests", () => {
  let mockOnMoveSubmit;

  beforeEach(() => {
    // Create a fresh mock for each test
    mockOnMoveSubmit = jest.fn();
  });

  const defaultProps = {
    fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
  };

  it("rendeers the chessboard without any errors", () => {
    render(<Newboard {...defaultProps} onMoveSubmit={mockOnMoveSubmit} />);
    expect(document.querySelector('[data-chess-board]')).toBeInTheDocument();
  });

  it("shows chess squares", () => {
    render(<Newboard {...defaultProps} onMoveSubmit={mockOnMoveSubmit} />);
    
    // Check if all 64 squares exist
    const squares = document.querySelectorAll('[data-square]');
    expect(squares).toHaveLength(64);
    
    // Check specific squares
    expect(document.querySelector('[data-square="a1"]')).toBeInTheDocument();
    expect(document.querySelector('[data-square="h8"]')).toBeInTheDocument();
    expect(document.querySelector('[data-square="e2"]')).toBeInTheDocument();
    expect(document.querySelector('[data-square="e4"]')).toBeInTheDocument();
  });

  it("accepts valid pawn move e2-e4", async () => {
    render(<Newboard {...defaultProps} onMoveSubmit={mockOnMoveSubmit} />);
    
    const e2 = document.querySelector('[data-square="e2"]');
    const e4 = document.querySelector('[data-square="e4"]');
    
    // Ensure elements exist before clicking
    expect(e2).toBeInTheDocument();
    expect(e4).toBeInTheDocument();
    
    fireEvent.click(e2);
    fireEvent.click(e4);
    
    await waitFor(() => {
      expect(mockOnMoveSubmit).toHaveBeenCalledWith(
        "e4", 
        { from: "e2", to: "e4" }
      );
    }, { timeout: 2000 });
  });


  it("rejects invalid pawn move e2-h8", async () => {
    render(<Newboard {...defaultProps} onMoveSubmit={mockOnMoveSubmit} />);
    
    const e2 = document.querySelector('[data-square="e2"]');
    const h8 = document.querySelector('[data-square="h8"]');
    
    expect(e2).toBeInTheDocument();
    expect(h8).toBeInTheDocument();
    
    fireEvent.click(e2);
    fireEvent.click(h8);
    
    // Use waitFor with timeout for more reliable testing
    await waitFor(() => {
      expect(mockOnMoveSubmit).not.toHaveBeenCalled();
    }, { timeout: 1000 });
  });

  it("rejects moving to square with own piece", async () => {
    render(<Newboard {...defaultProps} onMoveSubmit={mockOnMoveSubmit} />);
    
    const e2 = document.querySelector('[data-square="e2"]');
    const d2 = document.querySelector('[data-square="d2"]'); // Both have white pawns
    
    fireEvent.click(e2);
    fireEvent.click(d2);
    
    await waitFor(() => {
      expect(mockOnMoveSubmit).not.toHaveBeenCalled();
    }, { timeout: 1000 });
  });

  it("rejects moving opponent's pieces", async () => {
    render(<Newboard {...defaultProps} onMoveSubmit={mockOnMoveSubmit} />);
    
    // Try to move black pawn when it's white's turn
    const e7 = document.querySelector('[data-square="e7"]');
    const e5 = document.querySelector('[data-square="e5"]');
    
    fireEvent.click(e7);
    fireEvent.click(e5);
    
    await waitFor(() => {
      expect(mockOnMoveSubmit).not.toHaveBeenCalled();
    }, { timeout: 1000 });
  });

  it("handles invalid FEN", () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    const { container } = render(
      <Newboard 
        fen="invalid-fen" 
        onMoveSubmit={mockOnMoveSubmit} 
      />
    );
    
    expect(container.textContent).toContain('Invalid FEN');
    consoleError.mockRestore();
  });

  it("handles empty FEN", () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    const { container } = render(
      <Newboard 
        fen="" 
        onMoveSubmit={mockOnMoveSubmit} 
      />
    );
    
    expect(container.textContent).toContain('Invalid FEN');
    consoleError.mockRestore();
  });

 
  it("shows possible moves when piece selected", async () => {
    render(<Newboard {...defaultProps} onMoveSubmit={mockOnMoveSubmit} />);
    
    const e2 = document.querySelector('[data-square="e2"]');
    fireEvent.click(e2);
    
    // Check if possible move squares have different styling
    await waitFor(() => {
      const e3 = document.querySelector('[data-square="e3"]');
      const e4 = document.querySelector('[data-square="e4"]');
      
      const e3Style = window.getComputedStyle(e3);
      const e4Style = window.getComputedStyle(e4);
      
      // These squares should be highlighted (not default colors)
      expect(e3Style.backgroundColor).not.toBe('rgb(240, 217, 181)');
      expect(e4Style.backgroundColor).not.toBe('rgb(181, 136, 99)');
    }, { timeout: 2000 });
  });

  it("clears selection when clicking same square", async () => {
    render(<Newboard {...defaultProps} onMoveSubmit={mockOnMoveSubmit} />);
    
    const e2 = document.querySelector('[data-square="e2"]');
    
    // Select piece
    fireEvent.click(e2);
    
    // Click same square to deselect
    fireEvent.click(e2);
    
    // Should clear possible moves highlighting
    await waitFor(() => {
      const e3 = document.querySelector('[data-square="e3"]');
      const e4 = document.querySelector('[data-square="e4"]');
      
      const e3Style = window.getComputedStyle(e3);
      const e4Style = window.getComputedStyle(e4);
      
      // Should return to normal square colors
      expect(e3Style.backgroundColor).toMatch(/rgb\(240, 217, 181\)|rgb\(181, 136, 99\)/);
      expect(e4Style.backgroundColor).toMatch(/rgb\(240, 217, 181\)|rgb\(181, 136, 99\)/);
    }, { timeout: 1000 });
  });

  it("handles missing onMoveSubmit gracefully", async () => {
    // Test that component doesn't crash without callback
    render(<Newboard {...defaultProps} />);
    
    const e2 = document.querySelector('[data-square="e2"]');
    const e4 = document.querySelector('[data-square="e4"]');
    
    // Should not throw error
    expect(() => {
      fireEvent.click(e2);
      fireEvent.click(e4);
    }).not.toThrow();
  });

  // Test different positions
  it("works with custom position", async () => {
    const customFen = "r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R w KQkq - 0 1";
    
    render(<Newboard fen={customFen} onMoveSubmit={mockOnMoveSubmit} />);
    
    // Test knight move in this position
    const f3 = document.querySelector('[data-square="f3"]');
    const g5 = document.querySelector('[data-square="g5"]');
    
    fireEvent.click(f3);
    fireEvent.click(g5);
    
    await waitFor(() => {
      expect(mockOnMoveSubmit).toHaveBeenCalledWith(
        expect.any(String), 
        { from: "f3", to: "g5" }
      );
    }, { timeout: 2000 });
  });

  // Test castling
  it("accepts castling special move", async () => {
    const castlingFen = "r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1";
    
    render(<Newboard fen={castlingFen} onMoveSubmit={mockOnMoveSubmit} />);
    
    const king = document.querySelector('[data-square="e1"]');
    const castlingSquare = document.querySelector('[data-square="g1"]');
    
    fireEvent.click(king);
    fireEvent.click(castlingSquare);
    
    await waitFor(() => {
      expect(mockOnMoveSubmit).toHaveBeenCalledWith(
        "O-O", 
        { from: "e1", to: "g1" }
      );
    }, { timeout: 2000 });
  });
});