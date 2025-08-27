import { NextResponse } from 'next/server';
import prisma from '../../../../../lib/prisma';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const experimentId = searchParams.get('experimentId');
    const conditionId = searchParams.get('conditionId');

    if (!experimentId && !conditionId) {
      return NextResponse.json(
        { message: 'Experiment ID or Condition ID is required' },
        { status: 400 }
      );
    }

    let whereClause = {};

    if (conditionId) {
      // Get the puzzles for a specific condition
      const cId = parseInt(conditionId);
      if (isNaN(cId)) {
        return NextResponse.json(
          { message: 'Invalid condition ID format' },
          { status: 400 }
        );
      }
      whereClause.conditionId = cId;
    } else if (experimentId) {
      // Get all puzzles across conditions for an experiment
      const expId = parseInt(experimentId);
      if (isNaN(expId)) {
        return NextResponse.json(
          { message: 'Invalid experiment ID format' },
          { status: 400 }
        );
      }
      whereClause.condition = { experimentId: expId };
    }

    // try to fetch puzzles with their advice and condition details via prisma 
    const puzzles = await prisma.puzzle.findMany({
      where: whereClause,
      include: {
        advice: true,
        condition: {
          select: { 
            id: true, 
            name: true, 
            adviceformat: true,
            description: true,
            timerEnabled: true,
            timeLimit: true
          }
        }
      },
      orderBy: [
        { condition: { order: 'asc' } },
        { order: 'asc' }
      ]
    });

    return NextResponse.json({ puzzles }, { status: 200 });

  } catch (error) {
    console.error('Error fetching puzzles:', error);
    return NextResponse.json(
      { message: 'Failed to fetch puzzles', error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const { experimentId, conditionId, puzzles } = await request.json();

    if (!conditionId) {
      return NextResponse.json(
        { message: 'Condition ID is required' },
        { status: 400 }
      );
    }

    if (!Array.isArray(puzzles) || puzzles.length === 0) {
      return NextResponse.json(
        { message: 'At least one puzzle is required' },
        { status: 400 }
      );
    }

    const cId = parseInt(conditionId);
    if (isNaN(cId)) {
      return NextResponse.json(
        { message: 'Invalid condition ID format' },
        { status: 400 }
      );
    }

    // Make sure the condition should be actually exists before proceeding
    const condition = await prisma.condition.findUnique({
      where: { id: cId },
      include: { 
        experiment: {
          select: { id: true, name: true }
        }
      }
    });

    if (!condition) {
      return NextResponse.json(
        { message: 'Condition not found' },
        { status: 404 }
      );
    }

    // Clear out any existing puzzles and advice for this condition
    const deletedAdvice = await prisma.advice.deleteMany({
      where: {
        puzzle: {
          conditionId: cId
        }
      }
    });

    const deletedPuzzles = await prisma.puzzle.deleteMany({
      where: { conditionId: cId }
    });

    // Now create the new puzzles with their advice
    const createdPuzzles = [];

    for (let i = 0; i < puzzles.length; i++) {
      const puzzleData = puzzles[i];

      // Basic validation - need FEN and the correct move
      if (!puzzleData.fen || !puzzleData.correctMove) {
        return NextResponse.json(
          { message: `Puzzle ${i + 1}: FEN and correct move are required` },
          { status: 400 }
        );
      }

      // Create the puzzle record
      const puzzle = await prisma.puzzle.create({
        data: {
          fen: puzzleData.fen,
          correct_move: puzzleData.correctMove,
          order: i + 1,
          conditionId: cId
        }
      });

      // Add advice if the condition is set up to use it
      const needsAdvice = condition.adviceformat && condition.adviceformat !== 'none';
      
      if (needsAdvice && (puzzleData.advice || puzzleData.confidence || puzzleData.explanation || puzzleData.reliability !== 'none')) {
        await prisma.advice.create({
          data: {
            puzzleId: puzzle.id,
            text: puzzleData.advice || '',
            confidence: puzzleData.confidence ? parseFloat(puzzleData.confidence) : null,
            explanation: puzzleData.explanation || null,
            reliability: puzzleData.reliability === 'none' ? 'Poor' : 
                        puzzleData.reliability === 'very' ? 'High' :
                        puzzleData.reliability === 'moderate' ? 'Moderate' : 'Poor'
          }
        });
      }

      createdPuzzles.push(puzzle);
    }

    return NextResponse.json({ 
      message: 'Puzzles saved successfully',
      puzzles: createdPuzzles,
      condition: condition
    }, { status: 201 });

  } catch (error) {
    console.error('Error saving puzzles:', error);
    
    // Handle the case where puzzle order conflicts occur
    if (error.code === 'P2002' && error.meta?.target?.includes('order')) {
      return NextResponse.json(
        { message: 'Duplicate puzzle order detected. Please try again.' },
        { status: 400 }
      );
    }
    
    return NextResponse.json({ 
      message: 'Failed to save puzzles',
      error: error.message 
    }, { status: 500 });
  }
}