import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// POST - this will save player response for a puzzle in a session
export async function POST(request) {
  try {
    const {
      sessionId,
      puzzleId,
      moveBeforeAdvice,
      timeBeforeAdvice,
      moveAfterAdvice,
      timeAfterAdvice,
      adviceShown,
      adviceRequested,
      moveMatchesAdvice,
      undoUsed,
      timeExceeded,
      skipped,
      // Array of move records
      moves 
    } = await request.json();

    // This will validate sessionId and puzzleId are provided
    if (!sessionId || !puzzleId) {
      return NextResponse.json({
        message: 'Session ID and Puzzle ID are required'
      }, { status: 400 });
    }

    // this will verify the session exists and is active or not
    const session = await prisma.playerSession.findUnique({
      where: { id: parseInt(sessionId) },
      include: {
        experiment: {
          select: { isActive: true }
        }
      }
    });

    if (!session) {
      return NextResponse.json({
        message: 'Session not found'
      }, { status: 404 });
    }

    // Check if experiment is still active or not
    if (!session.experiment.isActive) {
      return NextResponse.json({
        message: 'Experiment is no longer active'
      }, { status: 403 });
    }


    // this will fetch the puzzle by ID from the database via prisma
    const puzzle = await prisma.puzzle.findUnique({
      where: { id: parseInt(puzzleId) },
      select: { id: true, correct_move: true }
    });

    if (!puzzle) {
      return NextResponse.json({
        message: 'Puzzle not found'
      }, { status: 404 });
    }

    // Check if a response already exists for this session and puzzle
    // to prevent duplicate entries

    const existingResponse = await prisma.playerResponse.findUnique({
      where: {
        sessionId_puzzleId: {
          sessionId: parseInt(sessionId),
          puzzleId: parseInt(puzzleId)
        }
      }
    });

    if (existingResponse) {
      return NextResponse.json({
        message: 'Response already exists for this puzzle',
        responseId: existingResponse.id
      }, { status: 409 });
    }

    // Check if the player's move matches the correct answer (only if they didn't skip)
    let actualMoveMatchesAdvice = false;
    if (!skipped && moveAfterAdvice && puzzle.correct_move) {
      actualMoveMatchesAdvice = moveAfterAdvice === puzzle.correct_move;
    }

    // Clean up empty moves - convert empty strings to null for cleaner data
    const processedMoveBeforeAdvice = moveBeforeAdvice && moveBeforeAdvice.trim() !== '' ? moveBeforeAdvice : null;
    const processedMoveAfterAdvice = moveAfterAdvice && moveAfterAdvice.trim() !== '' ? moveAfterAdvice : null;

   
    // Save everything in one respose to keep data consistently
    const result = await prisma.$transaction(async (tx) => {
      // Create player response with proper relationship connection
      const playerResponse = await tx.playerResponse.create({
        data: {
          session: {
            connect: { id: parseInt(sessionId) }
          },
          puzzle: {
            connect: { id: parseInt(puzzleId) }
          },
          move_before_advice: processedMoveBeforeAdvice,
          time_before_advice: parseInt(timeBeforeAdvice) || 0,
          move_after_advice: processedMoveAfterAdvice,
          time_after_advice: parseInt(timeAfterAdvice) || 0,
          advice_shown: Boolean(adviceShown),
          advice_requested: Boolean(adviceRequested),
          move_matches_advice: actualMoveMatchesAdvice,
          undo_used: Boolean(undoUsed),
          time_exceeded: Boolean(timeExceeded),
          skipped: Boolean(skipped)
        }
      });

      
      // If there are move records, create them linked to this response
      if (moves && Array.isArray(moves) && moves.length > 0) {
        const moveRecords = moves.map((move, index) => ({
          responseId: playerResponse.id,
          move: move.move,
          move_number: index + 1,
          time_taken: parseInt(move.time_taken) || 0,
          was_undone: Boolean(move.was_undone)
        }));

        await tx.moveRecord.createMany({
          data: moveRecords
        });
      }

      return playerResponse;
    });

    // Return success with details
    return NextResponse.json({
      message: skipped ? 'Skip recorded successfully' : 'Response saved successfully',
      responseId: result.id,
      moveMatchesCorrect: actualMoveMatchesAdvice,
      skipped: Boolean(skipped),
      timeRecorded: {
        beforeAdvice: parseInt(timeBeforeAdvice) || 0,
        afterAdvice: parseInt(timeAfterAdvice) || 0,
        total: (parseInt(timeBeforeAdvice) || 0) + (parseInt(timeAfterAdvice) || 0)
      },
      movesRecorded: moves ? moves.length : 0
    }, { status: 201 });

  } catch (error) {
    console.error('Player response save error:', error);
    
    // Log the request data to help with debugging
    console.error('Request data:', {
      sessionId,
      puzzleId,
      moveBeforeAdvice,
      timeBeforeAdvice,
      moveAfterAdvice,
      timeAfterAdvice,
      skipped
    });
    
    return NextResponse.json({
      message: 'Server error while saving response',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
}

// GET - this will fetch all player responses for a session
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const includeSkipped = searchParams.get('includeSkipped') !== 'false';

    if (!sessionId) {
      return NextResponse.json({
        message: 'Session ID required'
      }, { status: 400 });
    }

    // Fetch player responses for the session, optionally excluding skipped puzzles
    const whereClause = {
      sessionId: parseInt(sessionId)
    };

    if (!includeSkipped) {
      whereClause.skipped = false;
    }

    const responses = await prisma.playerResponse.findMany({
      where: whereClause,
      include: {
        puzzle: {
          select: {
            id: true,
            fen: true,
            correct_move: true,
            order: true,
            condition: {
              select: {
                name: true,
                order: true
              }
            }
          }
        },
        moves: {
          orderBy: { move_number: 'asc' }
        }
      },
      orderBy: [
        { puzzle: { condition: { order: 'asc' } } },
        { puzzle: { order: 'asc' } },
        { completed_at: 'asc' }
      ]
    });

    // calculate summary statistics
    const summary = {
      total: responses.length,
      completed: responses.filter(r => !r.skipped).length,
      skipped: responses.filter(r => r.skipped).length,
      withAdvice: responses.filter(r => r.advice_shown).length,
      adviceRequested: responses.filter(r => r.advice_requested).length,
      undoUsed: responses.filter(r => r.undo_used).length,
      timeExceeded: responses.filter(r => r.time_exceeded).length,
      correctMoves: responses.filter(r => r.move_matches_advice).length,
      totalTimeSpent: responses.reduce((sum, r) => sum + (r.time_before_advice || 0) + (r.time_after_advice || 0), 0)
    };

    return NextResponse.json({
      sessionId: parseInt(sessionId),
      summary: summary,
      responses: responses.map(response => ({
        id: response.id,
        puzzleId: response.puzzleId,
        puzzleOrder: response.puzzle.order,
        conditionName: response.puzzle.condition.name,
        conditionOrder: response.puzzle.condition.order,
        moveBeforeAdvice: response.move_before_advice,
        timeBeforeAdvice: response.time_before_advice,
        moveAfterAdvice: response.move_after_advice,
        timeAfterAdvice: response.time_after_advice,
        totalTime: (response.time_before_advice || 0) + (response.time_after_advice || 0),
        adviceShown: response.advice_shown,
        adviceRequested: response.advice_requested,
        moveMatchesAdvice: response.move_matches_advice,
        undoUsed: response.undo_used,
        timeExceeded: response.time_exceeded,
        skipped: response.skipped,
        completedAt: response.completed_at,
        moves: response.moves,
        correctMove: response.puzzle.correct_move
      }))
    });

  } catch (error) {
    console.error('Player responses fetch error:', error);
    return NextResponse.json({
      message: 'Server error while fetching responses'
    }, { status: 500 });
  }
}