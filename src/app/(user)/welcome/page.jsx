import Manualchessboard from '../../../components/manualchessboard.jsx';

export default function WelcomePage() {
  return (
    <div className="flex flex-col placed-center">
      <h1 className="text-3xl font-bold mb-4 text-center">Welcome to the Chess Puzzle Game!</h1>
      <p className="mb-4 text-center">Your chess journey starts here! Peek at the sidebar for tips or choose a level to start your chess adventure!.</p>
      <div className="flex justify-center">
        <Manualchessboard fen="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1" />
      </div>
    </div>
  );
}