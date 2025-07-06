'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import ChessboardComponent from '../components/chessboard';

export default function HomePage() {
  const router = useRouter();
  const [playerName, setPlayerName] = useState('');

  const handleEnter = () => {
    if (!playerName.trim()) {
      alert('Please enter your name');
      return;
    }
    router.push('/welcome');
  };

  return (
    <main className="min-h-screen bg-[#1E1E2F] text-white flex flex-col items-center justify-center p-8 overflow-hidden">
      <motion.h1
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="text-3xl font-bold mb-8 text-white"
      >
        Welcome to the CHESS Puzzles game!!
      </motion.h1>

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.3 }}
        className="flex gap-12 items-start"
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.6 }}
        >
          <ChessboardComponent boardWidth={420} />
        </motion.div>

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
            className="bg-[#4CAF50] hover:bg-[#43a047] text-white font-semibold py-2 rounded transition duration-200"
          >
            Start Session
          </motion.button>
        </motion.div>
      </motion.div>
    </main>
  );
}
