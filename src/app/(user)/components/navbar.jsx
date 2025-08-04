'use client';

import { useRouter } from 'next/navigation';

export function TopNavBar({ playerName, experimentName }) {
  const router = useRouter();

  const handleEndSession = () => {
    sessionStorage.removeItem('sessionId');
    sessionStorage.removeItem('playerName');
    sessionStorage.removeItem('experimentId');
    sessionStorage.removeItem('conditionId');
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

export function Sidebar({ onShowInstructions, onSelectLevel, experiment }) {
  // Get conditions as sets - only show if experiment has conditions
  const sets = experiment?.conditions || [];

  return (
    <aside className="bg-[#051906] text-white w-64 h-screen p-6 flex flex-col gap-6 shadow-lg flex-shrink-0 overflow-y-auto">
      <div className="mb-6 flex-shrink-0">
        <img
          src="/chesslogo.svg"
          alt="Chess Logo"
          className="w-20 h-20 object-contain mx-auto"
        />
      </div>
      
      <button
        onClick={onShowInstructions}
        className="bg-[#374e3b] hover:bg-[#476250] transition-colors rounded py-2 px-4 font-semibold flex-shrink-0"
      >
        How to Play ?
      </button>

      <div className="flex-grow overflow-y-auto">
        <h3 className="text-lg font-semibold mb-3 text-yellow-300">Play Puzzles</h3>
        {sets.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {sets.map((condition, index) => (
              <li key={condition.id}>
                <button
                  onClick={() => onSelectLevel(index + 1)}
                  className="w-full text-left px-3 py-2 rounded hover:bg-[#3a4a37] transition group"
                >
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Set {index + 1}</span>
                    <span className="text-xs text-gray-400 group-hover:text-gray-300">
                      {condition.puzzleCount || condition._count?.puzzles || condition.puzzles?.length || 'N/A'} puzzles
                    </span>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-400 text-sm">No puzzle sets available</p>
        )}
      </div>

      {experiment && (
        <div className="pt-4 border-t border-gray-700 flex-shrink-0">
          <div className="text-xs text-gray-400">
            <p className="text-white-500">By: {experiment.experimenterName}</p>
            {sets.length > 0 && (
              <p className="text-white-500 mt-1">{sets.length} puzzle set{sets.length > 1 ? 's' : ''}</p>
            )}
          </div>
        </div>
      )}
    </aside>
  );
}