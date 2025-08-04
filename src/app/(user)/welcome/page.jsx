"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Manualchessboard from '../../../components/manualchessboard.jsx';

export default function WelcomePage() {
  const router = useRouter();
  const [playerName, setPlayerName] = useState('');
  const [experiment, setExperiment] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeWelcome = async () => {
      // Get player info from storage
      const storedPlayerName = sessionStorage.getItem('playerName');
      const storedSessionId = sessionStorage.getItem('sessionId');
      
      if (!storedPlayerName) {
        router.push('/');
        return;
      }
      
      setPlayerName(storedPlayerName);
      
      try {
        // Fetch session info to get experiment details
        if (storedSessionId) {
          const sessionResponse = await fetch(`/api/player-sessions?sessionId=${storedSessionId}`);
          if (sessionResponse.ok) {
            const sessionData = await sessionResponse.json();
            
            // Set experiment info from session data
            setExperiment({
              name: sessionData.experimentName || "Chess Puzzle Game",
              experimenterName: sessionData.experimenterName || "Game Master",
              // We'll get conditions count from the session or default to 3
              conditionsCount: 3 // You can adjust this based on your actual experiment setup
            });
          }
        }
      } catch (err) {
        console.error('Error loading session:', err);
        // Set default experiment
        setExperiment({
          name: "Chess Puzzle Game",
          experimenterName: "Game Master",
          conditionsCount: 3
        });
      } finally {
        setLoading(false);
      }
    };

    initializeWelcome();
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-white p-8">
      <div className="max-w-4xl mx-auto text-center">
        <h1 className="text-4xl font-bold mb-6">
          Welcome to the Chess Puzzle Game!
        </h1>
        
        <p className="text-xl mb-8 text-gray-200">
          Your chess journey starts here! Check the sidebar for tips or choose a puzzle set to begin your adventure!
        </p>
        
        <div className="flex justify-center mb-8">
          <Manualchessboard 
            fen="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1" 
            boardWidth={400}
          />
        </div>
        
        <div className="bg-[#2a3d2f] rounded-lg p-6 max-w-2xl mx-auto">
          <h2 className="text-2xl font-semibold mb-4 text-yellow-300">
            🎯 Ready to Challenge Your Mind?
          </h2>
          <div className="text-gray-200 space-y-3">
            <p>
              🧩 <strong>Solve engaging chess puzzles</strong> designed to improve your tactical skills
            </p>
            <p>
              🎮 <strong>Multiple difficulty levels</strong> to match your chess expertise
            </p>
            <p>
              ⚡ <strong>Track your progress</strong> as you advance through different puzzle sets
            </p>
            <p>
              💡 <strong>Get helpful hints</strong> when you need a little guidance
            </p>
          </div>
          
          <div className="mt-6 p-4 bg-[#1f2a1f] rounded border-l-4 border-green-400">
            <p className="text-green-300 font-semibold">
              🚀 Pro Tip: Start with Set 1 if you're new to chess puzzles, or jump to any set that matches your skill level!
            </p>
          </div>
        </div>
        
        <div className="mt-8 text-gray-300">
          <p>
            👈 Look to the sidebar to get started • Click "How to Play?" for instructions • Select any puzzle set to begin!
          </p>
        </div>
      </div>
    </div>
  );
}