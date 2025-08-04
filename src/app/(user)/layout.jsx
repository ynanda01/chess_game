"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { TopNavBar, Sidebar } from './components/navbar.jsx';
import Helppopup from './components/helppopup.jsx';
import { Trophy, Lightbulb } from 'lucide-react';

export default function UserLayout({ children }) {
  const router = useRouter();
  const [playerName, setPlayerName] = useState('');
  const [experiment, setExperiment] = useState(null);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    const initializeLayout = async () => {
      const name = sessionStorage.getItem('playerName');
      const sessionId = sessionStorage.getItem('sessionId');
      
      if (!name) {
        router.push('/');
        return;
      }
      
      setPlayerName(name);
      
      // Fetch actual experiment data with conditions and puzzles
      try {
        if (sessionId) {
          const sessionResponse = await fetch(`/api/player-sessions?sessionId=${sessionId}`);
          if (sessionResponse.ok) {
            const sessionData = await sessionResponse.json();
            
            // Now fetch the actual experiment with conditions and puzzles
            try {
              const experimentResponse = await fetch(`/api/experiments/${sessionData.experimentId}`);
              if (experimentResponse.ok) {
                const experimentData = await experimentResponse.json();
                setExperiment(experimentData);
              } else {
                // If experiment API fails, create structure based on session data
                setExperiment({
                  name: sessionData.experimentName || "Chess Puzzle Game",
                  experimenterName: sessionData.experimenterName || "Game Master",
                  conditions: [] // Will be empty if we can't fetch real data
                });
              }
            } catch (expErr) {
              console.error('Error loading experiment details:', expErr);
              // Fallback to session data only
              setExperiment({
                name: sessionData.experimentName || "Chess Puzzle Game",
                experimenterName: sessionData.experimenterName || "Game Master",
                conditions: [] // Empty conditions if API unavailable
              });
            }
          }
        }
      } catch (err) {
        console.error('Error loading session:', err);
        // Default empty experiment
        setExperiment({
          name: "Chess Puzzle Game",
          experimenterName: "Game Master",
          conditions: []
        });
      }
    };

    initializeLayout();
  }, [router]);

  const openHelp = () => setShowHelp(true);
  const closeHelp = () => setShowHelp(false);

  const selectLevel = (level) => router.push(`/game/${level}`);

  return (
    <div className="flex h-screen bg-[#374e3b] text-white overflow-hidden">
      <Sidebar 
        onShowInstructions={openHelp} 
        onSelectLevel={selectLevel} 
        experiment={experiment}
      />
      
      <div className="flex flex-col flex-grow overflow-hidden">
        <TopNavBar 
          playerName={playerName} 
          experimentName={experiment?.name}
        />
        <main className="flex-grow overflow-y-auto p-6">{children}</main>
      </div>
      
      {showHelp && (
        <Helppopup onClose={closeHelp}>
          <div className="space-y-3">
            <p className="text-green-200 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-400" />
              <strong>How to Play Chess Puzzles:</strong>
            </p>
            <div className="space-y-2 text-gray-300">
              <p>• Check which side to move (White or Black) before starting the move.</p>
              <p>• Solve each chess puzzles by finding the best move</p>
              <p>• Select different Sets from the sidebar</p>
              <p>• Each set has puzzles to solve</p>
              <p>• Each puzzle has a specific solution to discover</p>
              <p>• Use the "logout" button to logout when finished</p>
            </div>
            <p className="text-yellow-300 text-sm mt-4 flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-yellow-400" />
              Tip: Take your time to analyze each position carefully!
            </p>
          </div>
        </Helppopup>
      )}
    </div>
  );
}