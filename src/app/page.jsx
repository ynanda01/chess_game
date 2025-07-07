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
    <main
      className="relative min-h-screen bg-cover bg-center text-white flex items-center justify-center"
      style={{
        backgroundImage: `url('/chess1.webp')`,
      }}
    >
     
      <div className="absolute inset-0  bg-opacity-10 backdrop-blur-sm z-0" />

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center justify-center p-8 gap-6">

        {/* Heading */}
        <motion.h1
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-4xl font-bold text-white drop-shadow-lg text-center"
        >
          Welcome to the CHESS Puzzles game!!
        </motion.h1>

        {/* Quote */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.8 }}
          className="text-lg italic text-yellow-300 text-center"
        >
          “When you see a good move, look for a better one.” - Emanuel Lasker
        </motion.p>

        {/* Layout = Board + Input */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="flex flex-col md:flex-row gap-10 items-center bg-black/40 p-6 rounded-lg shadow-xl"
        >
          {/* Chessboard */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.6 }}
          >
            <ChessboardComponent boardWidth={420} />
          </motion.div>

          {/* Player Input */}
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
              Enter
            </motion.button>
          </motion.div>
        </motion.div>
      </div>
    </main>
  );
}
