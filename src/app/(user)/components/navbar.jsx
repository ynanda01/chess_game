'use client';

import { useRouter } from 'next/navigation';

export function TopNavBar({ playerName }) {
  const router = useRouter();

  const handleEndSession = () => {
    localStorage.removeItem('sessionId');
    localStorage.removeItem('playerName');
    router.push('/');
  };

  return (
    <header className="bg-[#1f2a1f] text-white shadow-md flex items-center justify-between px-6 py-4 sticky top-0 z-50">
      <div>
        <h2 className="text-xl font-bold">Welcome{playerName ? `, ${playerName}` : ''}</h2>
      </div>

      <nav>
        <button
          onClick={handleEndSession}
          className="bg-[#b6042a] hover:bg-[#f50538] text-white font-semibold py-1 px-4 rounded transition duration-200"
          title="End Session"
        >
          Logout
        </button>
      </nav>
    </header>
  );
}

export function Sidebar({ onShowInstructions, onSelectLevel, levels = [1, 2, 3, 4, 5] }) {
  return (
    <aside className="bg-[#051906] text-white w-50 min-h-screen p-6 flex flex-col gap-6 shadow-lg sticky top-[64px]">
      <div className="mb-6">
        <img
          src="/chesslogo.svg"
          alt="Chess Logo"
          className="w-30 h-30 object-contain"
        />
      </div>
      <button
        onClick={onShowInstructions}
        className="bg-[#374e3b] hover:bg-[#476250] transition-colors rounded py-2 font-semibold"
      >
        How to Play ?
      </button>

      <div>
        <h3 className="text-lg font-semibold mb-3 text-yellow-300">Play Puzzles</h3>
        <ul className="flex flex-col gap-2">
          {levels.map((level) => (
            <li key={level}>
              <button
                onClick={() => onSelectLevel(level)}
                className="w-full text-left px-3 py-2 rounded hover:bg-[#3a4a37] transition"
              >
                Level {level}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
