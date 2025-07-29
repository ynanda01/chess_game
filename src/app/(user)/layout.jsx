"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { TopNavBar, Sidebar } from './components/navbar.jsx';
import Helppopup from './components/helppopup.jsx';
import { Trophy, Lightbulb } from 'lucide-react';

export default function UserLayout({ children }) {
  const router = useRouter();
  const [playerName, setPlayerName] = useState('');
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    const name = localStorage.getItem('playerName');
    if (!name) {
      router.push('/');
    } else {
      setPlayerName(name);
    }
  }, [router]);

  const openHelp = () => setShowHelp(true);
  const closeHelp = () => setShowHelp(false);

  const selectLevel = (level) => router.push(`/game/${level}`);

  return (
    <div className="flex min-h-screen bg-[#374e3b] text-white">
      <Sidebar onShowInstructions={openHelp} onSelectLevel={selectLevel} />
      
      <div className="flex flex-col flex-grow">
        <TopNavBar playerName={playerName} />
        <main className="p-6 flex-grow overflow-auto">{children}</main>
      </div>

     {showHelp && (
        <Helppopup onClose={closeHelp}>
          <div className="space-y-3">
            <p className="text-green-200 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-400" />
              <strong>How to Play Chess Puzzles:</strong>
            </p>
            <div className="space-y-2 text-gray-300">
              <p>• Check which side to move (White or Black) before starting the move. </p>
              <p>• Solve each chess puzzles by finding the best move</p>
              <p>• Select different levels from the sidebar </p>
              <p>• Each level has a set of  4 puzzles to solve</p>
              <p>• Each puzzle has a specific solution to discover</p>
              <p>• Use the "logout " button to logout when finished</p>
            </div>
            <p className="text-yellow-300 text-s mt-4 flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-yellow-400" />
              Tip: Take your time to analyze each position carefully!
            </p>
          </div>
        </Helppopup>
      )}
    </div>
  );
}
