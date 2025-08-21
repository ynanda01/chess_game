import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Randomised helper
// below code rotates conditions across sessions so that each one gets a equal share to remove bias.
// Useful when running multiple participants to avoid bias in order of presentation.

function getRandomisedConditionOrder(conditions, sessionCount) {
  const numConditions = conditions.length;
  if (numConditions === 0) return [];
  
  //Figure out where to start rotating the conditions for this session
  const offset = sessionCount % numConditions;
  
  // Create rotated array shift conditions by offset positions
  const rotation = [
    ...conditions.slice(offset),
    ...conditions.slice(0, offset)
  ];
  
  return rotation;
}

// POST - Create a new player session

export async function POST(request) {
  try {
    const { playerName } = await request.json();

    if (!playerName || playerName.trim().length === 0) {
      return NextResponse.json({
        message: 'The Player name is required'
      }, { status: 400 });
    }

    // Get the active experiment
    const activeExperiment = await prisma.experiment.findFirst({
      where: { isActive: true },
      include: {
        conditions: {
          orderBy: { id: 'asc' }
        }
      }
    });

    if (!activeExperiment) {
      return NextResponse.json({
        message: 'Oh, No active experiment available'
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

    // Get session count for randomised condition order
    const sessionCount = await prisma.playerSession.count({
      where: { experimentId: activeExperiment.id }
    });
    
    // Apply randomised to get rotation condition order
    const randomisedConditions = getRandomisedConditionOrder(
      activeExperiment.conditions, 
      sessionCount
    );
    
    // For the first level (Set 1), assign the first condition from randomised order
    const assignedCondition = randomisedConditions[0];

    // Create new session
    const session = await prisma.playerSession.create({
      data: {
        player_name: playerName.trim(),
        experimentId: activeExperiment.id,
        conditionId: assignedCondition.id,
        display_level: 1
      }
    });

    // Delete any existing session order for this player in the current experiment
    await prisma.sessionExperimentOrder.deleteMany({
      where: {
        player_Name: playerName.trim(),
        experimentId: activeExperiment.id
      }
    });

    // Below part is to create session orders
    for (let index = 0; index < randomisedConditions.length; index++) {
      const condition = randomisedConditions[index];
      
      await prisma.sessionExperimentOrder.create({
        data: {
          player_Name: playerName.trim(),
          experimentId: activeExperiment.id,
          conditionId: condition.id,
          order: index + 1
        }
      });
    }

    return NextResponse.json({
      message: 'Session created successfully',
      sessionId: session.id,
      playerName: session.player_name,
      experimentId: session.experimentId,
      experimentName: activeExperiment.name,
      conditionId: session.conditionId,
      conditionName: assignedCondition.name,
      displayLevel: session.display_level,
      existing: false,
      counterbalancing: {
        sessionNumber: sessionCount + 1,
        conditionOrder: randomisedConditions.map((c, idx) => ({ 
          set: idx + 1, 
          conditionId: c.id, 
          conditionName: c.name 
        }))
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Session creation error:', error);
    
    // Handle unique constraint violation 
    // If a session for this player already exists, return a 409 Conflict instead of creating a duplicate
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

      // Fetch the player's latest session with experiment and response details.
      // If no session exists, return a 404 error.
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

    // Fetch the player's condition order for this experiment
    // Ensures tasks/puzzles are presented in the correct counterbalanced sequence to prevent order effects
    // This is used to maintain the randomised order of conditions across sessions

    const sessionOrders = await prisma.sessionExperimentOrder.findMany({
      where: {
        player_Name: session.player_name,
        experimentId: session.experimentId
      },
      orderBy: { order: 'asc' }
    });


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
      })),
      counterbalancing: {
        conditionOrder: sessionOrders.map(order => ({
          set: order.order,
          conditionId: order.conditionId
        }))
      }
    });

  } catch (error) {
    console.error('Session fetch error:', error);
    return NextResponse.json({
      message: 'Server error while fetching session'
    }, { status: 500 });
  }
}

// PUT - Update a player's session
// Update a player's session  mark it completed, reset completion, or change display level
// Returns the updated session info so the frontend can reflect changes immediately
export async function PUT(request) {
  try {
    const { sessionId, completed, displayLevel } = await request.json();

    // check if session id is provided
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

    // Update the session with new data
    // Include experiment details to return in response
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