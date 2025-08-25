"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Puzzle, Layers, BarChart3, Lightbulb } from "lucide-react";
import Manualchessboard from '../../../components/manualchessboard.jsx';
import './page.css';

export default function WelcomePage() {
  const router = useRouter();
  const [playerName, setPlayerName] = useState('');
  const [experiment, setExperiment] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const welcome = async () => {
      // First, let's check if the player is actually logged in by looking the player name
      // If they're not logged in, we will redirect back to the login page
      const storedPlayerName = sessionStorage.getItem('playerName');
      const storedSessionId = sessionStorage.getItem('sessionId');
      
      if (!storedPlayerName) {
        router.push('/');
        return;
      }
      
      setPlayerName(storedPlayerName);
      
      try {
        // Now lets fetch the session info to get experiment details
        if (storedSessionId) {
          const sessionResponse = await fetch(`/api/player-sessions?sessionId=${storedSessionId}`);
          if (sessionResponse.ok) {
            const sessionData = await sessionResponse.json();
            
            // Set experiment info from api player session
            
            setExperiment({
              name: sessionData.experimentName || "Human Decision Making Experiment",
              experimenterName: sessionData.experimenterName || "Researcher",
              conditionsCount: 3 // We can adjust this based on our actual conditions in the experiment
            });
          }
        }
      } catch (err) {
        console.error('Error loading session:', err);
        // In case if api fails, set deault experiment info
        setExperiment({
          name: "Human Decision Making Experiment",
          experimenterName: "Researcher",
          conditionsCount: 3
        });
      } finally {
        setLoading(false);
      }
    };

    welcome();
  }, [router]);

  if (loading) {
    return (
      <div className="loading_container">
        <div className="loading_text">Loading...</div>
      </div>
    );
  }

  return (
    <div className="welcome_page">
      <div className="welcome_container">
        {/* Header Section */}
        <div className="header">
          <h1 className="title">
            Welcome to the ChessPuzzle Game!
          </h1>
          <p className="subtitle">
            Your chess journey starts here! Look to the sidebar to get started • Click "How to Play?" for instructions • Select any puzzle set to begin the adventure!
          </p>
        </div>

        {/* Main Content Layout */}
        <div className="main">
          {/* Left Side - chess board */}
          <div className="chessboard">
            <Manualchessboard 
              fen="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1" 
              boardWidth={400}
            />
          </div>

          {/* Right Side - content */}
          <div className="content">
            <div className="info_card"> 
              <h2 className="card_title">
                Ready to Challenge Your Mind?
              </h2>
              <div className="features_list">
                <p className="feature_item">
                  <Puzzle className="icon yellow" />
                  <span><strong>Solve engaging chess puzzles</strong> designed to improve your tactical skills</span>
                </p>
                <p className="feature_item">
                  <Layers className="icon blue" />
                  <span><strong>Multiple difficulty Sets</strong> to match your chess expertise</span>
                </p>
                <p className="feature_item">
                  <BarChart3 className="icon green" />
                  <span><strong>Track your progress</strong> as you advance through different puzzle sets</span>
                </p>
                <p className="feature_item">
                  <Lightbulb className="icon purple" />
                  <span><strong>Get helpful advices</strong> when you need a little guidance</span>
                </p>
              </div>
              
              <div className="pro_tip">
                <p className="tip_text">
                  Pro Tip: Start with Set 1 if you're new to chess puzzles, or jump to any set that matches your skill level!
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}