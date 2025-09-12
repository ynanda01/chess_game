// Mock the entire @prisma/client module first
jest.mock('@prisma/client', () => {
  const mockPrisma = {
    playerSession: {
      findUnique: jest.fn(),
    },
    puzzle: {
      findUnique: jest.fn(),
    },
    playerResponse: {
      findUnique: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
    },
    moveRecord: {
      createMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  return {
    PrismaClient: jest.fn().mockImplementation(() => mockPrisma),
  };
});

// Mock Next.js NextResponse to avoid import issues
jest.mock('next/server', () => ({
  NextResponse: {
    json: (data, init) => {
      const response = new Response(JSON.stringify(data), {
        status: init?.status || 200,
        headers: {
          'Content-Type': 'application/json',
          ...init?.headers
        }
      });
      return response;
    }
  }
}));

// Now import the API functions and get the mock instance
import { POST, GET } from '@/app/api/(user)/player-responses/route.js';
import { PrismaClient } from '@prisma/client';

// Get the mock instance
const mockPrisma = new PrismaClient();

describe('Player Response API - Automation Bias Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default successful mocks
    mockPrisma.playerSession.findUnique.mockResolvedValue({
      id: 1,
      experiment: { isActive: true }
    });
    
    mockPrisma.playerResponse.findUnique.mockResolvedValue(null);
    
    const mockResponse = { id: 1001 };
    mockPrisma.playerResponse.create.mockResolvedValue(mockResponse);
    mockPrisma.$transaction.mockImplementation(async (callback) => {
      return await callback(mockPrisma);
    });
  });

  // Simple request creator using the global Request class
  const createRequest = (data, method = 'POST') => {
    return new Request('http://localhost:3000/api/player-responses', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  };

  test('should correctly track when player follows wrong advice (automation bias)', async () => {
  
    mockPrisma.puzzle.findUnique.mockResolvedValue({
      id: 101,
      correct_move: 'e2e4', // Correct move
      advice: { text: 'e2e3' } // Wrong advice
    });

    const requestData = {
      sessionId: 1,
      puzzleId: 101,
      moveBeforeAdvice: 'e2e4', // Player's initial correct instinct
      moveAfterAdvice: 'e2e3',  // Changed to follow wrong advice
      adviceShown: true,
      undoUsed: true,
      adviceMove: 'e2e3'
    };

    const request = createRequest(requestData);
    
    const response = await POST(request);
    const result = await response.json();

    console.log('Response status:', response.status);
    console.log('Response result:', result);

    // Check if the response was successful first
    expect(response.status).toBe(201);

    // Verify automation bias is captured
    expect(mockPrisma.playerResponse.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        session: { connect: { id: 1 } },
        puzzle: { connect: { id: 101 } },
        move_matches_advice: true,  // Player followed advice
        move_before_advice: 'e2e4', // Original correct choice
        move_after_advice: 'e2e3',  // Changed to wrong advice
        undo_used: true
      })
    });

    // Response should show both metrics
    expect(result.moveMatchesAdvice).toBe(true);  // Followed advice
    expect(result.moveMatchesCorrect).toBe(false); // But was wrong
  });

  test('should track when player resists wrong advice', async () => {
    mockPrisma.puzzle.findUnique.mockResolvedValue({
      id: 102,
      correct_move: 'e2e4',
      advice: { text: 'e2e3' } // Wrong advice
    });

    const requestData = {
      sessionId: 1,
      puzzleId: 102,
      moveAfterAdvice: 'e2e4', 
      adviceShown: true,
      adviceMove: 'e2e3'
    };

    const request = createRequest(requestData);
    
    const response = await POST(request);
    const result = await response.json();

    console.log('Response status:', response.status);
    console.log('Response result:', result);

    expect(response.status).toBe(201);

    expect(mockPrisma.playerResponse.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        move_matches_advice: false, // Didn't follow advice
      })
    });

    expect(result.moveMatchesAdvice).toBe(false);
    expect(result.moveMatchesCorrect).toBe(true);
  });

  test('should extract advice move from text when not provided', async () => {
    mockPrisma.puzzle.findUnique.mockResolvedValue({
      id: 103,
      correct_move: 'e2e4',
      advice: { text: 'Nf3' }
    });

    const requestData = {
      sessionId: 1,
      puzzleId: 103,
      moveAfterAdvice: 'Nf3',
      adviceShown: true
     
    };

    const request = createRequest(requestData);
    
    const response = await POST(request);
    const result = await response.json();

    console.log('Response status:', response.status);
    console.log('Response result:', result);

    expect(response.status).toBe(201);

    expect(mockPrisma.playerResponse.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        move_matches_advice: true, 
      })
    });
  });

  test('should handle time tracking correctly', async () => {
    mockPrisma.puzzle.findUnique.mockResolvedValue({
      id: 104,
      correct_move: 'e2e4',
      advice: { text: 'e2e4' }
    });

    // Mock the response to include time tracking data
    mockPrisma.playerResponse.create.mockResolvedValue({
      id: 1001,
      time_before_advice: 15,
      time_after_advice: 8
    });

    const requestData = {
      sessionId: 1,
      puzzleId: 104,
      timeBeforeAdvice: 15,
      timeAfterAdvice: 8,
      moveAfterAdvice: 'e2e4',
      adviceShown: true
    };

    const request = createRequest(requestData);
    
    const response = await POST(request);
    const result = await response.json();

    console.log('Response status:', response.status);
    console.log('Response result:', result);

    expect(response.status).toBe(201);

    // Check time tracking in response
    expect(result.timeRecorded).toBeDefined();
    expect(result.timeRecorded.beforeAdvice).toBe(15);
    expect(result.timeRecorded.afterAdvice).toBe(8);
    expect(result.timeRecorded.total).toBe(23);
  });

  test('should handle skip with time tracking', async () => {
    mockPrisma.puzzle.findUnique.mockResolvedValue({
      id: 105,
      correct_move: 'e2e4'
    });

    const requestData = {
      sessionId: 1,
      puzzleId: 105,
      timeBeforeAdvice: 30,
      skipped: true,
      adviceShown: false
    };

    const request = createRequest(requestData);
    
    const response = await POST(request);
    const result = await response.json();

    console.log('Response status:', response.status);
    console.log('Response result:', result);

    expect(response.status).toBe(201);

    expect(mockPrisma.playerResponse.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        skipped: true,
        time_before_advice: 30,
        move_matches_advice: false
      })
    });

    expect(result.message).toBe('Skip recorded successfully');
  });

  test('should return 400 for missing required fields', async () => {
    const request = createRequest({ puzzleId: 101 }); // Missing sessionId

    const response = await POST(request);
    const result = await response.json();

    expect(response.status).toBe(400);
    expect(result.message).toBe('Session ID and Puzzle ID are required');
  });

  test('should return 404 for non-existent session', async () => {
    mockPrisma.playerSession.findUnique.mockResolvedValue(null);

    const request = createRequest({
      sessionId: 999,
      puzzleId: 101
    });

    const response = await POST(request);
    expect(response.status).toBe(404);
  });

  test('should return 409 for duplicate response', async () => {
    // Mock existing response
    mockPrisma.playerResponse.findUnique.mockResolvedValue({
      id: 123,
      sessionId: 1,
      puzzleId: 101
    });

    mockPrisma.puzzle.findUnique.mockResolvedValue({
      id: 101,
      correct_move: 'e2e4',
      advice: { text: 'e2e3' }
    });

    const request = createRequest({
      sessionId: 1,
      puzzleId: 101,
      moveAfterAdvice: 'e2e4',
      adviceShown: true
    });

    const response = await POST(request);
    const result = await response.json();

    expect(response.status).toBe(409);
    expect(result.message).toBe('Response already exists for this puzzle');
    expect(result.responseId).toBe(123);
  });
});

describe('GET player responses', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should return summary with automation bias metrics', async () => {
    const mockResponses = [
      {
        id: 1,
        puzzleId: 101,
        skipped: false,
        advice_shown: true,
        advice_requested: false,
        move_matches_advice: true, // Followed advice
        undo_used: true,
        time_exceeded: false,
        time_before_advice: 10,
        time_after_advice: 5,
        move_before_advice: 'e2e4',
        move_after_advice: 'e2e3',
        completed_at: new Date('2024-01-01T10:00:00Z'),
        puzzle: { 
          id: 101,
          fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
          correct_move: 'e2e4',
          order: 1,
          condition: { name: 'control', order: 1 },
          advice: { text: 'e2e3', confidence: 0.8, explanation: 'Good move' }
        },
        moves: []
      },
      {
        id: 2,
        puzzleId: 102,
        skipped: false,
        advice_shown: true,
        advice_requested: true,
        move_matches_advice: false, // Didn't follow advice
        undo_used: false,
        time_exceeded: false,
        time_before_advice: 15,
        time_after_advice: 8,
        move_before_advice: null,
        move_after_advice: 'd2d4',
        completed_at: new Date('2024-01-01T10:05:00Z'),
        puzzle: { 
          id: 102,
          fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2',
          correct_move: 'd2d4',
          order: 2,
          condition: { name: 'control', order: 1 },
          advice: { text: 'd2d3', confidence: 0.7, explanation: 'Solid move' }
        },
        moves: []
      }
    ];

    mockPrisma.playerResponse.findMany.mockResolvedValue(mockResponses);

    // Simple GET request with query parameters
    const request = new Request('http://localhost:3000/api/player-responses?sessionId=1', {
      method: 'GET'
    });

    const response = await GET(request);
    const result = await response.json();

    console.log('GET Response status:', response.status);
    console.log('GET Response result:', JSON.stringify(result, null, 2));

    expect(response.status).toBe(200);

    // Check summary exists and has correct values
    expect(result.summary).toBeDefined();
    expect(result.summary.total).toBe(2);
    expect(result.summary.followedAdvice).toBe(1); // Key automation bias metric
    expect(result.summary.withAdvice).toBe(2);
    expect(result.summary.totalTimeSpent).toBe(38);
    
    // Check responses array
    expect(result.responses).toHaveLength(2);
    expect(result.responses[0].moveMatchesAdvice).toBe(true);
    expect(result.responses[1].moveMatchesAdvice).toBe(false);
  });

  test('should handle empty responses', async () => {
    mockPrisma.playerResponse.findMany.mockResolvedValue([]);

    const request = new Request('http://localhost:3000/api/player-responses?sessionId=1', {
      method: 'GET'
    });

    const response = await GET(request);
    const result = await response.json();

    expect(response.status).toBe(200);
    expect(result.summary.total).toBe(0);
    expect(result.responses).toEqual([]);
  });

  test('should return 400 for missing sessionId', async () => {
    const request = new Request('http://localhost:3000/api/player-responses', {
      method: 'GET'
    });

    const response = await GET(request);
    const result = await response.json();

    expect(response.status).toBe(400);
    expect(result.message).toBe('Session ID required');
  });
});