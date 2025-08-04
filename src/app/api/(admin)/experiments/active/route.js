// app/api/experiments/active/route.js
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET - Get the currently active experiment for participants
export async function GET(request) {
  try {
    // Get active experiment (no user authentication needed for participants)
    const activeExperiment = await prisma.experiment.findFirst({
      where: { 
        isActive: true 
      },
      include: {
        conditions: {
          include: {
            puzzles: {
              include: {
                advice: true
              },
              orderBy: { order: 'asc' }
            }
          },
          orderBy: { order: 'asc' }
        },
        experimenter: {
          select: {
            name: true,
            email: false // Don't expose email to participants
          }
        }
      }
    });

    if (!activeExperiment) {
      return NextResponse.json({ 
        message: 'No active experiment available',
        active: false 
      }, { status: 404 });
    }

    // Transform for frontend
    const transformedExperiment = {
      id: activeExperiment.id,
      name: activeExperiment.name,
      description: activeExperiment.description,
      adviceformat: activeExperiment.adviceformat,
      timerEnabled: activeExperiment.timerEnabled,
      timeLimit: activeExperiment.timeLimit,
      experimenterName: activeExperiment.experimenter.name,
      active: true,
      conditions: activeExperiment.conditions.map(condition => ({
        id: condition.id,
        name: condition.name,
        description: condition.description,
        adviceformat: condition.adviceformat || activeExperiment.adviceformat,
        timerEnabled: condition.timerEnabled !== null ? condition.timerEnabled : activeExperiment.timerEnabled,
        timeLimit: condition.timeLimit !== null ? condition.timeLimit : activeExperiment.timeLimit,
        puzzles: condition.puzzles.map(puzzle => ({
          id: puzzle.id,
          fen: puzzle.fen,
          correct_move: puzzle.correct_move,
          order: puzzle.order,
          advice: puzzle.advice ? {
            text: puzzle.advice.text,
            confidence: puzzle.advice.confidence,
            explanation: puzzle.advice.explanation,
            reliability: puzzle.advice.reliability
          } : null
        }))
      }))
    };

    return NextResponse.json(transformedExperiment);

  } catch (error) {
    console.error('Active experiment fetch error:', error);
    return NextResponse.json({ 
      message: 'Server error',
      active: false 
    }, { status: 500 });
  }
}

// POST - Check if experiment is still active (for ongoing sessions)
export async function POST(request) {
  try {
    const { experimentId } = await request.json();
    
    if (!experimentId) {
      return NextResponse.json({ 
        message: 'Experiment ID required',
        active: false 
      }, { status: 400 });
    }

    const experiment = await prisma.experiment.findUnique({
      where: { id: parseInt(experimentId) },
      select: { 
        id: true, 
        name: true, 
        isActive: true 
      }
    });

    if (!experiment) {
      return NextResponse.json({ 
        message: 'Experiment not found',
        active: false 
      }, { status: 404 });
    }

    return NextResponse.json({
      id: experiment.id,
      name: experiment.name,
      active: experiment.isActive,
      message: experiment.isActive ? 'Experiment is active' : 'Experiment has been deactivated'
    });

  } catch (error) {
    console.error('Experiment status check error:', error);
    return NextResponse.json({ 
      message: 'Server error',
      active: false 
    }, { status: 500 });
  }
}