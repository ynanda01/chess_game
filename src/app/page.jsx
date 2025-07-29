'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Image from 'next/image';
import Manualchessboard from '../components/manualchessboard.jsx'; // 

export default function HomePage() {
  const router = useRouter();
  const [playerName, setPlayerName] = useState('');
  const [loading, setLoading] = useState(false);

  
  const handleEnter = async () => {
    if (!playerName.trim()) {
      alert('Please enter your name');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          player_name: playerName,
          experiment_Id: 1, // change dynamically if needed
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Session creation failed');
        return;
      }

      const { session } = await res.json();

      // Save session info locally
      localStorage.setItem('sessionId', session.id);
      localStorage.setItem('playerName', session.player_name);

      // Redirect user to welcome or game page
      router.push('/welcome');
    } catch (err) {
      console.error(err);
      alert('Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
  <main className="relative min-h-screen bg-[#374e3b] text-white flex flex-col">

    {/* Header */}
    <header className="bg-[#1f2a1f] w-full py-6 shadow-md flex flex-col items-center justify-center text-center px-6">
      <div className="flex items-center justify-center gap-4">
        <Image
          src="/chesslogo.svg"
          alt="Chess Logo"
          width={70}
          height={40}
          className="object-contain align-middle -mb-9 -ml-20"
        />
        <h1 className="text-3xl md:text-4xl font-bold text-white drop-shadow-sm">
          Welcome to the CHESS Puzzles Game!!
        </h1>
      </div>
      <p className="text-sm md:text-base text-yellow-300 italic mt-2 max-w-xl">
        “When you see a good move, look for a better one.” – Emanuel Lasker
      </p>
    </header>

    {/* Main Content */}
    <div className="relative z-10 flex flex-col items-center justify-center p-8 gap-6 flex-grow">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.3 }}
        className="flex flex-col md:flex-row gap-10 items-center bg-gradient-to-b from-[#374e3b]/100 to-white/10 p-6 rounded-lg shadow-xl"
      >
        {/* Chessboard */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.6 }}
        >
          <Manualchessboard
            fen="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
            boardWidth={420}
          />
        </motion.div>

        {/* Player Name Input */}
        <motion.div
          initial={{ x: 60, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.8 }}
          className="flex flex-col gap-4 bg-[#2E2E3E] p-6 rounded-lg shadow-lg w-80"
        >
          <label htmlFor="playerName" className="text-lg font-semibold text-[#FFD700]">
            Enter Player’s Name
          </label>
          <input
            id="playerName"
            type="text"
            placeholder="Your name"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            className="p-2 rounded-md bg-[#F5F5F5] text-[#1E1E2F] outline-none focus:ring-2 focus:ring-[#FFD700] transition duration-200"
          />
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleEnter}
            disabled={loading}
            className="bg-[#4CAF50] hover:bg-[#43a047] text-white font-semibold py-2 rounded transition duration-200 disabled:opacity-50"
          >
            {loading ? 'Starting...' : 'Enter'}
          </motion.button>
        </motion.div>
      </motion.div>
    </div>
  </main>
);
}