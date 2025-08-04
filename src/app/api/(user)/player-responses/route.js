// app/api/player-responses/route.js
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// POST - Save player response to a puzzle
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
      moves // Array of move records
    } = await request.json();

    // Validate required fields
    if (!sessionId || !puzzleId) {
      return NextResponse.json({
        message: 'Session ID and Puzzle ID are required'
      }, { status: 400 });
    }

    // Verify session exists
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

    // Check if experiment is still active
    if (!session.experiment.isActive) {
      return NextResponse.json({
        message: 'Experiment is no longer active'
      }, { status: 403 });
    }

    // Verify puzzle exists
    const puzzle = await prisma.puzzle.findUnique({
      where: { id: parseInt(puzzleId) },
      select: { id: true, correct_move: true }
    });

    if (!puzzle) {
      return NextResponse.json({
        message: 'Puzzle not found'
      }, { status: 404 });
    }

    // Check if response already exists (prevent duplicates)
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

    // Determine if move matches advice (compare with correct move)
    const actualMoveMatchesAdvice = moveAfterAdvice === puzzle.correct_move;

    // Create player response
    const playerResponse = await prisma.playerResponse.create({
      data: {
        sessionId: parseInt(sessionId),
        puzzleId: parseInt(puzzleId),
        move_before_advice: moveBeforeAdvice,
        time_before_advice: timeBeforeAdvice,
        move_after_advice: moveAfterAdvice,
        time_after_advice: timeAfterAdvice,
        advice_shown: adviceShown || false,
        advice_requested: adviceRequested || false,
        move_matches_advice: actualMoveMatchesAdvice,
        undo_used: undoUsed || false,
        time_exceeded: timeExceeded || false,
        skipped: skipped || false
      }
    });

    // Create move records if provided
    if (moves && Array.isArray(moves) && moves.length > 0) {
      const moveRecords = moves.map((move, index) => ({
        responseId: playerResponse.id,
        move: move.move,
        move_number: index + 1,
        time_taken: move.time_taken,
        was_undone: move.was_undone || false
      }));

      await prisma.moveRecord.createMany({
        data: moveRecords
      });
    }

    // Return success response
    return NextResponse.json({
      message: 'Response saved successfully',
      responseId: playerResponse.id,
      moveMatchesCorrect: actualMoveMatchesAdvice
    }, { status: 201 });

  } catch (error) {
    console.error('Player response save error:', error);
    return NextResponse.json({
      message: 'Server error while saving response'
    }, { status: 500 });
  }
}

// GET - Get player responses for a session (optional, for debugging)
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json({
        message: 'Session ID required'
      }, { status: 400 });
    }

    const responses = await prisma.playerResponse.findMany({
      where: {
        sessionId: parseInt(sessionId)
      },
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
      orderBy: {
        completed_at: 'asc'
      }
    });

    return NextResponse.json({
      sessionId: parseInt(sessionId),
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
        adviceShown: response.advice_shown,
        adviceRequested: response.advice_requested,
        moveMatchesAdvice: response.move_matches_advice,
        undoUsed: response.undo_used,
        timeExceeded: response.time_exceeded,
        skipped: response.skipped,
        completedAt: response.completed_at,
        moves: response.moves
      }))
    });

  } catch (error) {
    console.error('Player responses fetch error:', error);
    return NextResponse.json({
      message: 'Server error while fetching responses'
    }, { status: 500 });
  }
}