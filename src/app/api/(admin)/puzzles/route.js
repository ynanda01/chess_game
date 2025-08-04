// app/api/puzzles/route.js - Clean Version
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
      // Fetch puzzles for specific condition
      const cId = parseInt(conditionId);
      if (isNaN(cId)) {
        return NextResponse.json(
          { message: 'Invalid condition ID format' },
          { status: 400 }
        );
      }
      whereClause.conditionId = cId;
    } else if (experimentId) {
      // Fetch puzzles for entire experiment (all conditions)
      const expId = parseInt(experimentId);
      if (isNaN(expId)) {
        return NextResponse.json(
          { message: 'Invalid experiment ID format' },
          { status: 400 }
        );
      }
      whereClause.condition = { experimentId: expId };
    }

    // Fetch puzzles with their advice and condition info
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

    console.log(`✅ Found ${puzzles.length} puzzles${conditionId ? ` for condition ${conditionId}` : ` for experiment ${experimentId}`}`);

    return NextResponse.json({ puzzles }, { status: 200 });

  } catch (error) {
    console.error('❌ Error fetching puzzles:', error);
    return NextResponse.json(
      { message: 'Failed to fetch puzzles', error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const { experimentId, conditionId, puzzles } = await request.json();

    console.log('=== PUZZLES API DEBUG ===');
    console.log('Received experimentId:', experimentId);
    console.log('Received conditionId:', conditionId);
    console.log('Received puzzles count:', puzzles?.length);

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

    // Check if condition exists
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

    console.log('✅ Condition found:', condition.name, 'in experiment:', condition.experiment.name);

    // Delete existing puzzles and advice for this condition
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

    console.log('🗑️ Deleted:', deletedPuzzles.count, 'puzzles and', deletedAdvice.count, 'advice records');

    // Create new puzzles with advice
    const createdPuzzles = [];

    for (let i = 0; i < puzzles.length; i++) {
      const puzzleData = puzzles[i];

      // Validate puzzle data
      if (!puzzleData.fen || !puzzleData.correctMove) {
        return NextResponse.json(
          { message: `Puzzle ${i + 1}: FEN and correct move are required` },
          { status: 400 }
        );
      }

      // Create puzzle linked to condition
      const puzzle = await prisma.puzzle.create({
        data: {
          fen: puzzleData.fen,
          correct_move: puzzleData.correctMove,
          order: i + 1,
          conditionId: cId
        }
      });

      // Create advice if provided (based on condition's advice format)
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

    console.log(`✅ Created ${createdPuzzles.length} puzzles with advice for condition "${condition.name}"`);

    return NextResponse.json({ 
      message: 'Puzzles saved successfully',
      puzzles: createdPuzzles,
      condition: condition
    }, { status: 201 });

  } catch (error) {
    console.error('❌ Error saving puzzles:', error);
    
    // Handle unique constraint violations
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