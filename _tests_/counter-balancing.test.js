import { describe, it, jest, beforeAll, beforeEach } from '@jest/globals';

// Mock Request/Response for Next.js
global.Request = class {
  constructor(body = {}) { this._body = body; }
  async json() { return this._body; }
};
global.Response = class {
  constructor(body, init = {}) {
    this.status = init.status ?? 200;
    this.headers = new Map(Object.entries(init.headers || { 'content-type': 'application/json' }));
    this._body = typeof body === 'string' ? body : JSON.stringify(body);
  }
  async json() { return JSON.parse(this._body); }
  async text() { return this._body; }
};

// Mock NextResponse
jest.mock('next/server', () => ({
  NextResponse: {
    json: (data, init) => new Response(JSON.stringify(data), { status: init?.status || 200 }),
  },
}));

// --- Mock Prisma ---
const mockPrismaClient = {
  experiment: { findFirst: jest.fn() },
  playerSession: { findUnique: jest.fn(), count: jest.fn(), create: jest.fn() },
  sessionExperimentOrder: { deleteMany: jest.fn(), create: jest.fn() },
  sessionPuzzleOrder: { deleteMany: jest.fn(), create: jest.fn() },
};

jest.mock('@prisma/client', () => ({ PrismaClient: jest.fn(() => mockPrismaClient) }));


let POST;
beforeAll(async () => {
  ({ POST } = await import('@/app/api/(user)/player-sessions/route.js'));
});

// --- Test data (mocked experiment, conditions, puzzles) ---
const mockActiveExperiment = {
  id: 1,
  name: 'Test Experiment',
  conditions: [
    { id: 1, name: 'Condition A', puzzles: [{ id: 1, name: 'Puzzle 1A' }, { id: 2, name: 'Puzzle 2A' }, { id: 3, name: 'Puzzle 3A' }] },
    { id: 2, name: 'Condition B', puzzles: [{ id: 4, name: 'Puzzle 1B' }, { id: 5, name: 'Puzzle 2B' }] },
    { id: 3, name: 'Condition C', puzzles: [{ id: 6, name: 'Puzzle 1C' }, { id: 7, name: 'Puzzle 2C' }, { id: 8, name: 'Puzzle 3C' }, { id: 9, name: 'Puzzle 4C' }] },
  ],
};

// --- Helper functions ---
function rotateArrayRight(arr, offset) {
  const n = arr.length;
  if (n === 0) return [];
  const shift = offset % n;
  return [...arr.slice(shift), ...arr.slice(0, shift)];
}

function createMockRequest(body) {
  return { json: jest.fn().mockResolvedValue(body) };
}

function formatColumns(playerDataArray) {
  const colWidth = 25;
  const maxRows = Math.max(...playerDataArray.map(p => p.formattedOutput.length));

  let output = [];
  const headerRow = playerDataArray.map(p =>
    `PLAYER ${p.playerIndex}: ${p.playerName}`.padEnd(colWidth)
  ).join(' | ');
  output.push(headerRow);

  const separator = playerDataArray.map(() => '='.repeat(colWidth)).join(' | ');
  output.push(separator);

  for (let row = 0; row < maxRows; row++) {
    const dataRow = playerDataArray.map(p =>
      (p.formattedOutput[row] || '').padEnd(colWidth)
    ).join(' | ');
    output.push(dataRow);
  }

  return output;
}

describe('Player Session Cyclic Sequential Assignment', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrismaClient.experiment.findFirst.mockResolvedValue(mockActiveExperiment);
    mockPrismaClient.playerSession.findUnique.mockResolvedValue(null);
    mockPrismaClient.sessionExperimentOrder.deleteMany.mockResolvedValue({});
    mockPrismaClient.sessionPuzzleOrder.deleteMany.mockResolvedValue({});
    mockPrismaClient.sessionExperimentOrder.create.mockResolvedValue({});
    mockPrismaClient.sessionPuzzleOrder.create.mockResolvedValue({});
  });

  it('shows session assignments for exactly 4 players', async () => {
    const totalPlayers = 4; 
    let output = [];

    output.push(`Experiment: ${mockActiveExperiment.name}`);
    output.push(`Total Conditions: ${mockActiveExperiment.conditions.length}`);
    output.push(`Testing with ${totalPlayers} players\n`);


    // Process only 4 players
    const allPlayerData = [];
    for (let playerIndex = 0; playerIndex < totalPlayers; playerIndex++) {
      mockPrismaClient.playerSession.count.mockResolvedValue(playerIndex);

      const conditionIndex = playerIndex % mockActiveExperiment.conditions.length;
      const assignedCondition = mockActiveExperiment.conditions[conditionIndex];

      mockPrismaClient.playerSession.create.mockResolvedValue({
        id: playerIndex + 1,
        player_name: `Player${playerIndex + 1}`,
        experimentId: 1,
        conditionId: assignedCondition.id,
        display_level: 1,
      });

      const request = createMockRequest({ playerName: `Player${playerIndex + 1}` });
      const response = await POST(request);
      const data = await response.json();

      const rotatedConditions = rotateArrayRight(mockActiveExperiment.conditions, playerIndex);

      const formattedOutput = [
        `Count: ${playerIndex}`,
        `Assigned: ${assignedCondition.name}`,
        `Cond Index: ${conditionIndex}`,
        '',
        'EXPERIMENT ORDER:',
      ];

      rotatedConditions.forEach((condition, idx) => {
        const rotatedPuzzles = rotateArrayRight(condition.puzzles, playerIndex);
        const isAssigned = condition.id === assignedCondition.id;
        formattedOutput.push(`${idx + 1}. ${condition.name}${isAssigned ? ' ←' : ''}`);
        rotatedPuzzles.forEach((puzzle, puzzleIdx) => {
          formattedOutput.push(`   ${puzzleIdx + 1}. ${puzzle.name}`);
        });
        if (idx < rotatedConditions.length - 1) {
          formattedOutput.push('');
        }
      });

      allPlayerData.push({
        playerIndex: playerIndex + 1,
        playerName: data.playerName || `Player${playerIndex + 1}`,
        assignedCondition,
        formattedOutput
      });
    }

    // Display all 4 players side by side
    output.push('PLAYERS 1-4:\n');
    const formattedColumns = formatColumns(allPlayerData);
    output.push(...formattedColumns);

    // Simple summary (just 4 players)
    output.push('\n' + '='.repeat(120));
    const summaryLine = allPlayerData.map(player =>
      `P${player.playerIndex}→${player.assignedCondition.name.charAt(player.assignedCondition.name.length - 1)}`
    ).join('  ');
    output.push(`  ${summaryLine}`);

    console.log(output.join('\n'));
  });
});
