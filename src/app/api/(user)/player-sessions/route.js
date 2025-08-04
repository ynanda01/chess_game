// app/api/player-sessions/route.js
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// POST - Create or get existing player session
export async function POST(request) {
  try {
    const { playerName } = await request.json();

    if (!playerName || playerName.trim().length === 0) {
      return NextResponse.json({
        message: 'Player name is required'
      }, { status: 400 });
    }

    // Get the active experiment
    const activeExperiment = await prisma.experiment.findFirst({
      where: { isActive: true },
      include: {
        conditions: {
          orderBy: { order: 'asc' }
        }
      }
    });

    if (!activeExperiment) {
      return NextResponse.json({
        message: 'No active experiment available'
      }, { status: 404 });
    }

    // Check if player already has a session for this experiment
    const existingSession = await prisma.playerSession.findUnique({
      where: {
        player_name_experimentId: {
          player_name: playerName.trim(),
          experimentId: activeExperiment.id
        }
      }
    });

    if (existingSession) {
      return NextResponse.json({
        message: 'Session already exists',
        sessionId: existingSession.id,
        playerName: existingSession.player_name,
        experimentId: existingSession.experimentId,
        experimentName: activeExperiment.name,
        displayLevel: existingSession.display_level,
        existing: true
      });
    }

    // Assign player to a condition (simple round-robin or random assignment)
    // For now, we'll use round-robin based on existing sessions count
    const sessionCount = await prisma.playerSession.count({
      where: { experimentId: activeExperiment.id }
    });
    
    const conditionIndex = sessionCount % activeExperiment.conditions.length;
    const assignedCondition = activeExperiment.conditions[conditionIndex];

    // Create new session
    const session = await prisma.playerSession.create({
      data: {
        player_name: playerName.trim(),
        experimentId: activeExperiment.id,
        conditionId: assignedCondition.id,
        display_level: 1 // Start at level 1
      }
    });

    // Create session experiment order for randomized puzzle presentation (optional)
    // For now, we'll keep puzzles in their defined order within conditions
    const sessionOrder = await prisma.sessionExperimentOrder.create({
      data: {
        player_Name: playerName.trim(),
        experimentId: activeExperiment.id,
        conditionId: assignedCondition.id,
        order: 1
      }
    });

    return NextResponse.json({
      message: 'Session created successfully',
      sessionId: session.id,
      playerName: session.player_name,
      experimentId: session.experimentId,
      experimentName: activeExperiment.name,
      conditionId: session.conditionId,
      conditionName: assignedCondition.name,
      displayLevel: session.display_level,
      existing: false
    }, { status: 201 });

  } catch (error) {
    console.error('Session creation error:', error);
    
    // Handle unique constraint violation (race condition)
    if (error.code === 'P2002') {
      return NextResponse.json({
        message: 'Session already exists for this player'
      }, { status: 409 });
    }

    return NextResponse.json({
      message: 'Server error while creating session'
    }, { status: 500 });
  }
}

// GET - Get session information
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const playerName = searchParams.get('playerName');

    if (!sessionId && !playerName) {
      return NextResponse.json({
        message: 'Session ID or player name required'
      }, { status: 400 });
    }

    let session;

    if (sessionId) {
      session = await prisma.playerSession.findUnique({
        where: { id: parseInt(sessionId) },
        include: {
          experiment: {
            select: {
              id: true,
              name: true,
              isActive: true,
              experimenter: {
                select: { name: true }
              }
            }
          },
          responses: {
            include: {
              puzzle: {
                select: {
                  id: true,
                  order: true,
                  condition: {
                    select: { name: true, order: true }
                  }
                }
              }
            }
          }
        }
      });
    } else if (playerName) {
      // Get the most recent session for this player
      session = await prisma.playerSession.findFirst({
        where: { player_name: playerName },
        include: {
          experiment: {
            select: {
              id: true,
              name: true,
              isActive: true,
              experimenter: {
                select: { name: true }
              }
            }
          },
          responses: {
            include: {
              puzzle: {
                select: {
                  id: true,
                  order: true,
                  condition: {
                    select: { name: true, order: true }
                  }
                }
              }
            }
          }
        },
        orderBy: { started_at: 'desc' }
      });
    }

    if (!session) {
      return NextResponse.json({
        message: 'Session not found'
      }, { status: 404 });
    }

    // Calculate progress
    const totalResponses = session.responses.length;
    const completedResponses = session.responses.filter(r => !r.skipped).length;
    const skippedResponses = session.responses.filter(r => r.skipped).length;

    return NextResponse.json({
      sessionId: session.id,
      playerName: session.player_name,
      experimentId: session.experimentId,
      experimentName: session.experiment.name,
      experimenterName: session.experiment.experimenter.name,
      conditionId: session.conditionId,
      displayLevel: session.display_level,
      startedAt: session.started_at,
      completedAt: session.completed_at,
      isActive: session.experiment.isActive,
      progress: {
        totalResponses,
        completedResponses,
        skippedResponses,
        completionRate: totalResponses > 0 ? (completedResponses / totalResponses * 100).toFixed(1) : 0
      },
      responses: session.responses.map(response => ({
        id: response.id,
        puzzleId: response.puzzleId,
        puzzleOrder: response.puzzle.order,
        conditionName: response.puzzle.condition.name,
        conditionOrder: response.puzzle.condition.order,
        skipped: response.skipped,
        completedAt: response.completed_at
      }))
    });

  } catch (error) {
    console.error('Session fetch error:', error);
    return NextResponse.json({
      message: 'Server error while fetching session'
    }, { status: 500 });
  }
}

// PUT - Update session (e.g., mark as completed)
export async function PUT(request) {
  try {
    const { sessionId, completed, displayLevel } = await request.json();

    if (!sessionId) {
      return NextResponse.json({
        message: 'Session ID is required'
      }, { status: 400 });
    }

    const updateData = {};
    
    if (completed !== undefined) {
      updateData.completed_at = completed ? new Date() : null;
    }
    
    if (displayLevel !== undefined) {
      updateData.display_level = parseInt(displayLevel);
    }

    const session = await prisma.playerSession.update({
      where: { id: parseInt(sessionId) },
      data: updateData,
      include: {
        experiment: {
          select: {
            name: true,
            isActive: true
          }
        }
      }
    });

    return NextResponse.json({
      message: 'Session updated successfully',
      sessionId: session.id,
      playerName: session.player_name,
      experimentName: session.experiment.name,
      displayLevel: session.display_level,
      completedAt: session.completed_at
    });

  } catch (error) {
    console.error('Session update error:', error);
    return NextResponse.json({
      message: 'Server error while updating session'
    }, { status: 500 });
  }
}