import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// This GEt will Fetch all experiments for the logged-in experimenter, including conditions and puzzles
export async function GET(request) {
  try {
    const userEmail = request.headers.get('user-email');
    
    if (!userEmail) {
      return NextResponse.json({ message: 'User email required' }, { status: 400 });
    }

    // lookup experimnenter in DB that matches the email
    const experimenter = await prisma.experimenters.findUnique({
      where: { email: userEmail }
    });

    if (!experimenter) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    // this will fetch all experiments for this experimenter, including conditions and puzzles
    const experiments = await prisma.experiment.findMany({
      where: { experimenterId: experimenter.id },
      include: {
        sessions: {
          include: {
            responses: {
              include: {
                puzzle: {
                  include: {
                    condition: true,
                    advice: true
                  }
                },
                moves: true
              }
            }
          }
        },
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
        }
      },
      orderBy: { created_at: 'desc' }
    });

    // Simplify the experiments data keep only essential fields and format sessions/responses for easier use

    const transformedExperiments = experiments.map(exp => ({
      id: exp.id,
      name: exp.name,
      description: exp.description,
      isActive: exp.isActive,
      created_at: exp.created_at,
      sessions: exp.sessions.map(session => ({
        playerName: session.player_name,
        attempts: session.responses.map(response => ({
          puzzleName: `Puzzle ${response.puzzle.order}`,
          conditionName: response.puzzle.condition?.name || 'Unknown',
          correct: response.move_after_advice === response.puzzle.correct_move,
          adviceShown: response.advice_shown,
          adviceTaken: response.advice_requested,
          timeTaken: response.time_after_advice || 0
        }))
      }))
    }));

    return NextResponse.json(transformedExperiments);

  } catch (error) {
    console.error('Experiments fetch error:', error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

// POST - Create a new experiment
export async function POST(request) {
  try {
    const body = await request.json();
    const userEmail = request.headers.get('user-email');
    
    if (!userEmail) {
      return NextResponse.json({ message: 'User email required' }, { status: 400 });
    }

   // Find the experimenter linked to this email
    const experimenter = await prisma.experimenters.findUnique({
      where: { email: userEmail }
    });

    if (!experimenter) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    const { name, description, adviceformat, timerEnabled, timeLimit } = body;

    // Create the experiment record 
    // puzzles will be added later through conditions
    const experiment = await prisma.experiment.create({
      data: {
        name,
        description: description || '',
        adviceformat: adviceformat || 'text',
        timerEnabled: timerEnabled || false,
        timeLimit: timeLimit || null,
        // New experiments always start as inactive
        isActive: false, 
        experimenterId: experimenter.id
      }
    });

    return NextResponse.json({
      id: experiment.id,
      name: experiment.name,
      description: experiment.description,
      isActive: experiment.isActive,
      created_at: experiment.created_at,
      sessions: []
    });

  } catch (error) {
    console.error('Experiment creation error:', error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}